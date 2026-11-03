#!/usr/bin/env python3
"""
Handover → PDF.

Renders the documentation in docs/ to printable A4 PDFs: one file per document,
plus a single combined file with a cover and a table of contents.

    python3 scripts/handover-pdf.py                 # all handover docs → ~/handover-pdf/
    python3 scripts/handover-pdf.py --out /tmp/pdf
    python3 scripts/handover-pdf.py --only 00-MASTER-HANDOVER

Why this exists rather than a one-off command: the PDFs are generated artefacts, so
they must be reproducible from the repository. The script is committed; the output
is not, because a binary that is regenerated on demand has no business bloating a
git history.

Requirements (installed with pip, no paid tools):
    pip install markdown xhtml2pdf pypdf
    DejaVu fonts (already present on any Debian/Ubuntu image)

The palette is the site's own: Mosaic Plum for text, Warm White for code panels,
no black anywhere — the same rule `npm run audit:design` enforces for the app.
"""
from __future__ import annotations

import argparse
import datetime as dt
import pathlib
import html as html_lib
import re
import sys

import markdown
from xhtml2pdf import pisa

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ROOT / 'docs'

PLUM = '#452B5E'
PLUM_MUTED = '#6B5280'
SURFACE = '#FFF9F0'
TINT = '#FDF1E7'
HAIRLINE = '#EBDDEA'
COBALT = '#2F49C9'

# The handover set: everything a person needs to pick this project up, in reading
# order. Other docs in docs/ are historical build reports and are not included by
# default (--all includes them).
CORE = [
    ('00-MASTER-HANDOVER.md', 'Master handover'),
    ('brand-identity.md', 'Brand identity'),
    ('04-design-system.md', 'Design system'),
    ('15-project-handover.md', 'Technical handover'),
    ('14-seo-launch-checklist.md', 'SEO launch checklist'),
    ('27-five-agent-consolidation.md', 'Five-agent consolidation'),
    ('28-backup-and-recovery.md', 'Backup and recovery dossier'),
    ('29-site-tour-fixes.md', 'Site tour: 36 defects fixed'),
    ('00-executive-summary.md', 'Executive summary (Phase 0 charter)'),
]

CSS = f"""
@page {{
  size: A4;
  margin: 17mm 15mm 16mm 15mm;
}}
body {{
  font-family: 'DejaVu';
  font-size: 9.2pt;
  line-height: 1.45;
  color: {PLUM};
}}
h1, h2, h3, h4 {{
  font-family: 'DejaVu';
  font-weight: bold;
  color: {PLUM};
  margin: 12pt 0 3pt 0;
  line-height: 1.2;
}}
h1 {{ font-size: 17pt; border-bottom: 2pt solid {COBALT}; padding-bottom: 4pt; margin-top: 2pt; }}
h2 {{ font-size: 12.5pt; margin-top: 14pt; border-bottom: 0.6pt solid {HAIRLINE}; padding-bottom: 2pt; }}
h3 {{ font-size: 10.5pt; margin-top: 11pt; }}
h4 {{ font-size: 9.4pt; margin-top: 9pt; }}
p {{ margin: 3pt 0; }}
ul, ol {{ margin: 3pt 0 3pt 14pt; padding: 0; }}
li {{ margin: 1.5pt 0; }}
strong {{ font-family: 'DejaVu'; font-weight: bold; }}
em {{ font-family: 'DejaVu'; font-style: italic; }}
code {{
  font-family: 'DejaVuMono';
  font-size: 8pt;
  color: {PLUM};
  background: none;
}}
pre {{
  font-family: 'DejaVuMono';
  font-size: 7.4pt;
  background: {SURFACE};
  border: 0.6pt solid {HAIRLINE};
  border-left: 2.5pt solid {COBALT};
  padding: 5pt 6pt;
  margin: 5pt 0;
  line-height: 1.28;
  white-space: pre-wrap;
}}
pre code {{ font-size: 7.4pt; }}
table {{
  width: 100%;
  border-collapse: collapse;
  margin: 5pt 0 7pt 0;
  font-size: 7.9pt;
}}
th {{
  background: {TINT};
  font-family: 'DejaVu';
  font-weight: bold;
  text-align: left;
  padding: 3pt 4pt;
  border: 0.5pt solid {HAIRLINE};
  font-size: 7.9pt;
}}
td {{
  padding: 3pt 4pt;
  border: 0.5pt solid {HAIRLINE};
  vertical-align: top;
}}
blockquote {{
  margin: 6pt 0;
  padding: 5pt 8pt;
  background: {TINT};
  border-left: 2.5pt solid {PLUM_MUTED};
}}
blockquote p {{ margin: 1pt 0; font-style: italic; }}
hr {{ border: 0; border-top: 0.7pt solid {HAIRLINE}; margin: 9pt 0; }}
a {{ color: {COBALT}; text-decoration: none; }}
.small {{ font-size: 8pt; color: {PLUM_MUTED}; }}
.doc-title {{ font-size: 20pt; font-family: 'DejaVu'; font-weight: bold; margin: 0 0 2pt 0; }}
.contents {{ margin: 4pt 0 10pt 0; }}
.contents div {{ font-size: 8.4pt; margin: 0.8pt 0; }}
.toc-l2 {{ padding-left: 8pt; }}
.toc-l3 {{ padding-left: 18pt; color: {PLUM_MUTED}; }}
"""


FONT_DIR: pathlib.Path | None = None

# DejaVu covers every typographic character these documents use, but not colour
# emoji. They are swapped for the closest geometric glyph rather than left to
# render as empty boxes — a table cell reading "✓" is the same fact as "✅".
GLYPHS = {
    '\u2705': '✓',   # white heavy check mark
    '\u274c': '✗',   # cross mark
    '\U0001F7E1': '●',  # yellow circle
    '\U0001F7E2': '●',  # green circle
    '\U0001F534': '●',  # red circle
    '\U0001F7E0': '●',  # orange circle
    '\U0001F535': '●',  # blue circle
    '\U0001F4CA': '▦',
    '\u26a0': '!',
}


def register_fonts() -> str:
    """
    Embed the DejaVu faces so ✓ → ₹ — × render, and return the @font-face CSS.

    xhtml2pdf does not resolve family names registered straight with reportlab —
    it only knows a family that its own CSS has been told about through @font-face.
    Registering without that produced 57 pages of Helvetica fallback, which is why
    the rules are generated from the resolved directory rather than hand-written.
    """
    global FONT_DIR
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    # DejaVu covers ✓ → ₹ — × and the Indian rupee sign, unlike the built-in
    # Type-1 faces. The system package ships no oblique cut, so the full family is
    # taken from matplotlib's bundled copy where all four styles exist.
    candidates = [
        pathlib.Path('/usr/local/lib/python3.13/site-packages/matplotlib/mpl-data/fonts/ttf'),
        pathlib.Path('/usr/lib/python3/dist-packages/matplotlib/mpl-data/fonts/ttf'),
        pathlib.Path('/usr/share/fonts/truetype/dejavu'),
    ]
    faces = {
        'DejaVu': 'DejaVuSans.ttf',
        'DejaVu-Bold': 'DejaVuSans-Bold.ttf',
        'DejaVu-Oblique': 'DejaVuSans-Oblique.ttf',
        'DejaVu-BoldOblique': 'DejaVuSans-BoldOblique.ttf',
        'DejaVuMono': 'DejaVuSansMono.ttf',
        'DejaVuMono-Bold': 'DejaVuSansMono-Bold.ttf',
    }
    found: dict[str, pathlib.Path] = {}
    for name, filename in faces.items():
        src = next((c / filename for c in candidates if (c / filename).exists()), None)
        if src is None:
            sys.exit(f'missing font {filename} — install matplotlib or the dejavu package')
        pdfmetrics.registerFont(TTFont(name, str(src)))
        found[name] = src
    FONT_DIR = found['DejaVu'].parent
    from reportlab.lib.fonts import addMapping

    addMapping('DejaVu', 0, 0, 'DejaVu')
    addMapping('DejaVu', 1, 0, 'DejaVu-Bold')
    addMapping('DejaVu', 0, 1, 'DejaVu-Oblique')
    addMapping('DejaVu', 1, 1, 'DejaVu-BoldOblique')
    addMapping('DejaVuMono', 0, 0, 'DejaVuMono')
    addMapping('DejaVuMono', 1, 0, 'DejaVuMono-Bold')

    def face(family: str, font_name: str, weight: str = 'normal', style: str = 'normal') -> str:
        return (f"@font-face {{ font-family: '{family}'; "
                f"src: url('{found[font_name].as_uri()}'); "
                f"font-weight: {weight}; font-style: {style}; }}")

    return '\n'.join([
        face('DejaVu', 'DejaVu'),
        face('DejaVu', 'DejaVu-Bold', 'bold'),
        face('DejaVu', 'DejaVu-Oblique', 'normal', 'italic'),
        face('DejaVu', 'DejaVu-BoldOblique', 'bold', 'italic'),
        face('DejaVuMono', 'DejaVuMono'),
        face('DejaVuMono', 'DejaVuMono-Bold', 'bold'),
    ])


def convert(text: str) -> tuple[str, list[tuple[int, str, str]]]:
    """Markdown → (html, [(level, id, title)]) for the contents block."""
    md = markdown.Markdown(
        extensions=['tables', 'fenced_code', 'sane_lists', 'attr_list', 'md_in_html', 'toc'],
        extension_configs={'toc': {'toc_depth': '2-3', 'anchorlink': False}},
    )
    html = md.convert(text)
    # `&amp;` inside a heading arrives escaped in the token name; left escaped it
    # printed as "&amp;" in the contents block *and* never matched the rendered
    # page, so those entries lost their page number.
    def title_of(name: str) -> str:
        return html_lib.unescape(re.sub('<[^>]+>', '', name))

    heads = [(int(h['level']), h['id'], title_of(h['name']))
             for h in md.toc_tokens]
    flat: list[tuple[int, str, str]] = []
    # Walk the tokens themselves rather than looking a decoded title back up in a
    # list of encoded ones — that lookup is what broke on "Logo &amp; wordmark".
    for token, (level, hid, name) in zip(md.toc_tokens, heads):
        flat.append((level, hid, name))
        for sub in token['children']:
            flat.append((3, sub['id'], title_of(sub['name'])))
    return html, flat


def _is_toc_page(lines: list[str]) -> bool:
    """A contents page is mostly lines that end in a page reference."""
    body = [l for l in lines if l.strip()]
    if not body:
        return False
    marked = sum(1 for l in body if re.search(r'·\s+p\.\s*\d+', l))
    return marked / len(body) >= 0.5


def heading_pages(pdf_path: pathlib.Path, heads) -> tuple[dict[str, int], int]:
    """
    (page each heading starts on, number of contents pages) — measured in a render
    that already contains the contents block.

    The old version skipped every page that looked like a contents page. That is
    wrong for a document whose contents block ends mid-page and whose first heading
    starts on the same page — which is exactly what 00-MASTER-HANDOVER does. Those
    headings silently lost their page number in the PDF's contents.

    Contents entries are now excluded *by line* instead: a line ending in `· p. N`
    is a table of contents entry, never a heading, so no page has to be skipped and
    a mixed page is measured correctly. A heading occupies its own line, so matching
    whole lines avoids crediting a cross-reference inside a sentence.
    """
    import pymupdf

    def clean(text: str) -> str:
        # \xa0 arrives from the &nbsp; in the contents block and \s+ does not fold it.
        return re.sub(r'\s+', ' ', text.replace('\u00a0', ' ')).strip()

    doc = pymupdf.open(str(pdf_path))
    raw = [[clean(line) for line in p.get_text().splitlines()] for p in doc]
    toc_pages = sum(1 for lines in raw if _is_toc_page(lines))

    body = [[line for line in lines if not re.search(r'·\s*p\.\s*\d+$', line)] for lines in raw]
    # Long headings wrap in the PDF, so neither the line-exact nor the substring
    # search can see them. For those, match against the page's normalised text —
    # safe only because a heading this long is never quoted mid-sentence.
    joined = [' '.join(lines) for lines in body]

    found: dict[str, int] = {}
    for _level, _hid, title in heads:
        needle = clean(title)
        if not needle:
            continue
        idx = next((i for i, lines in enumerate(body) if needle in lines), None)
        if idx is None:
            idx = next((i for i, lines in enumerate(body)
                        if any(needle in line for line in lines)), None)
        if idx is None and len(needle) > 40:
            idx = next((i for i, text in enumerate(joined) if needle in text), None)
        if idx is not None:
            found[title] = idx + 1
    doc.close()
    return found, toc_pages


def contents_block(heads, pages: dict[str, int] | None = None) -> str:
    if not heads:
        return ''
    rows = []
    for level, _hid, title in heads:
        page = pages.get(title) if pages else None
        tail = f' &nbsp;·&nbsp; p. {page}' if page else ''
        rows.append(f'<div class="toc-l{min(level, 3)}">{title}{tail}</div>')
    return '<div class="contents"><b>In this document</b>' + ''.join(rows) + '</div>'


FONT_CSS = ''


# A document about an identity is worth less without the identity in it. Documents
# listed here get their artwork printed under the title.
HERO = {
    'brand-identity': ('apps/web/public/brand/dm-logo-horizontal.png',
                       'The mark and wordmark, exactly as shipped'),
    '04-design-system': ('apps/web/public/brand/dm-logo-horizontal.png',
                         'Current lockup'),
}


def hero_html(stem: str) -> str:
    if stem not in HERO:
        return ''
    rel, caption = HERO[stem]
    src = (ROOT / rel)
    if not src.exists():
        return ''
    return (f'<table style="width:100%;margin:6pt 0 10pt 0"><tr>'
            f'<td style="border:0.6pt solid {HAIRLINE};background:{SURFACE};padding:10pt">'
            f'<img src="{src.as_uri()}" style="height:46pt"/>'
            f'<div class="small" style="margin-top:4pt">{caption} · {rel}</div>'
            f'</td></tr></table>')


def build_html(title: str, body: str, subtitle: str = '') -> str:
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{title}</title>
<style>{FONT_CSS}</style><style>{CSS}</style></head><body>
<div class="doc-title">{title}</div>
<div class="small">{subtitle}</div>
<hr/>{body}</body></html>"""


def render(html: str, out: pathlib.Path) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, 'wb') as fh:
        # path='/' lifts xhtml2pdf's resource policy: by default it only reads files
        # beneath the document's base directory, which silently refuses the system
        # fonts and leaves the whole PDF in Helvetica.
        result = pisa.CreatePDF(html, dest=fh, encoding='utf-8', path='/')
    if result.err:
        sys.exit(f'PDF render failed for {out.name} ({result.err} errors)')


def one(md_path: pathlib.Path, out_dir: pathlib.Path, display: str) -> pathlib.Path:
    """
    Render one document, then correct its contents page numbers until they match
    where the headings actually landed.

    A single offset does not work: inserting the contents block reflows the body,
    and a table that cannot split across a page break can push one section over a
    page while leaving its neighbour alone. So the numbers are measured, written,
    and measured again until the render stops moving — two passes in practice.
    """
    text = md_path.read_text(encoding='utf-8')
    for bad, good in GLYPHS.items():
        text = text.replace(bad, good)
    body, heads = convert(text)
    stamp = dt.date.today().strftime('%d %B %Y')
    subtitle = f'DEALMOSAIC · {md_path.relative_to(ROOT)} · rendered {stamp}'
    out = out_dir / (md_path.stem + '.pdf')

    pages: dict[str, int] = {}
    for attempt in range(4):
        prefix = hero_html(md_path.stem)
        render(build_html(display, prefix + contents_block(heads, pages) + body, subtitle), out)
        measured, _toc_pages = heading_pages(out, heads)
        if measured == pages:
            break
        pages = measured
    else:
        print(f'  ! {md_path.stem}: contents page numbers did not settle after 4 passes')

    stamp_page_numbers(out, f'DEALMOSAIC · {md_path.stem}')
    return out


def combined(files: list[tuple[pathlib.Path, str]], out_dir: pathlib.Path) -> pathlib.Path:
    """Cover + contents + every document, with a page break between them."""
    from pypdf import PdfWriter

    parts: list[pathlib.Path] = []
    for md_path, display in files:
        parts.append(one(md_path, out_dir / '.parts', display))

    writer = PdfWriter()
    cover = out_dir / '.parts' / 'cover.pdf'
    stamp = dt.date.today().strftime('%d %B %Y')
    # Each document starts where the previous one ended; the cover itself is
    # assumed to be one page and the assumption is checked after rendering.
    cover_pages = 1
    rows = []
    page = cover_pages + 1
    for i, (md_path, display) in enumerate(files, start=1):
        rows.append(f'<tr><td style="width:6%">{i}</td><td>{display}</td>'
                    f'<td class="small">{md_path.relative_to(ROOT)}</td>'
                    f'<td class="small">p. {page}</td></tr>')
        page += pdf_pages(parts[i - 1])
    rows = ''.join(rows)
    cover_html = f"""<!doctype html><html><head><meta charset="utf-8">
<style>{FONT_CSS}</style><style>{CSS}</style></head>
<body>
<div style="margin-top:110pt">
<div style="font-family:'DejaVu';font-weight:bold;font-size:13pt;color:{PLUM_MUTED}">DEALMOSAIC</div>
<div style="font-family:'DejaVu';font-weight:bold;font-size:30pt;line-height:1.15;margin-top:8pt">
Handover set</div>
<div style="font-size:11pt;color:{PLUM_MUTED};margin-top:6pt">
The intelligence behind every smart purchase</div>
<hr/>
<p class="small">Everything needed to pick this project up: what is live, what the
identity is, what the design system enforces, what the gates prove, and what is
still genuinely blocked. Rendered {stamp} from the repository's own markdown, so
this PDF cannot drift from the source it was made from.</p>
<p class="small">Documents in this file:</p>
<table><tr><th>#</th><th>Document</th><th>Source</th><th>Starts at</th></tr>{rows}</table>
<p class="small">The live state of the site and API is in the master handover,
Part 2. Where this document set says a thing is unverified, it is unverified.</p>
</div></body></html>"""
    render(cover_html, cover)

    for part in [cover, *parts]:
        writer.append(str(part))
    # Page numbers, stamped after merging so they count the whole document
    from pypdf import PdfReader
    out = out_dir / 'DEALMOSAIC-handover-set.pdf'
    with open(out, 'wb') as fh:
        writer.write(fh)

    import shutil

    for part in [*parts, cover]:
        part.unlink(missing_ok=True)
    shutil.rmtree(out_dir / '.parts', ignore_errors=True)
    return out


def stamp_page_numbers(path: pathlib.Path, label: str) -> None:
    """
    Draw "label · page N of M" on every page.

    Done as an overlay after the fact because xhtml2pdf's @page margin boxes are
    not implemented; the alternative is no page numbers in a 59-page document.
    """
    import io

    from pypdf import PdfReader, PdfWriter
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    reader = PdfReader(str(path))
    total = len(reader.pages)
    writer = PdfWriter()
    for i, page in enumerate(reader.pages, start=1):
        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        c.setFont('DejaVu', 7)
        c.setFillColor(PLUM_MUTED)
        c.drawString(42, 24, label)
        c.drawRightString(A4[0] - 42, 24, f'page {i} of {total}')
        c.setStrokeColor(HAIRLINE)
        c.setLineWidth(0.4)
        c.line(42, 32, A4[0] - 42, 32)
        c.save()
        buf.seek(0)
        page.merge_page(PdfReader(buf).pages[0])
        writer.add_page(page)
    with open(path, 'wb') as fh:
        writer.write(fh)


def pdf_pages(path: pathlib.Path) -> int:
    from pypdf import PdfReader

    return len(PdfReader(str(path)).pages)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(pathlib.Path.home() / 'handover-pdf'))
    ap.add_argument('--only', help='single document stem, e.g. 00-MASTER-HANDOVER')
    ap.add_argument('--all', action='store_true', help='every .md in docs/, historical included')
    args = ap.parse_args()
    out_dir = pathlib.Path(args.out)

    global FONT_CSS
    FONT_CSS = register_fonts()

    if args.all:
        files = [(p, p.stem.replace('-', ' ').title())
                 for p in sorted(DOCS.glob('*.md'))]
    else:
        files = [(DOCS / name, display) for name, display in CORE if (DOCS / name).exists()]

    if args.only:
        files = [(p, d) for p, d in files if p.stem == args.only]
        if not files:
            sys.exit(f'no document with stem {args.only!r}')

    made = []
    for md_path, display in files:
        made.append(one(md_path, out_dir, display))
    combined_path = combined(files, out_dir)

    print(f'{len(made)} document PDFs + 1 combined file in {out_dir}')
    for p in [*made, combined_path]:
        print(f'  {p.name:<40} {p.stat().st_size / 1024:>7.1f} KB  {pdf_pages(p):>3} pages')


if __name__ == '__main__':
    main()
