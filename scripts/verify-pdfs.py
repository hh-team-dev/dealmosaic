#!/usr/bin/env python3
"""
CHECK EVERY HANDOVER PDF'S CONTENTS PAGE AGAINST THE PAGES IT POINTS AT.

Written after three separate defects were found in the generated PDF set on
3 November 2026, all of them invisible unless you measure:

  1. A heading in the last section had no page number at all.
  2. `&amp;` in a heading printed literally in the contents block, and because the
     escaped string never matched the rendered page, every such entry lost its
     number too.
  3. Headings that begin on the same page where the contents block ends were not
     found at all — the matcher skipped any page that looked like a contents page.

So this asserts, for every document in ~/handover-pdf:

  * every heading in the markdown appears in the PDF's contents block;
  * the number next to it is the page the heading is actually printed on.

Run it after `python3 scripts/handover-pdf.py`. Exit code 1 on any mismatch, so it
can be wired into a release check.
"""
import importlib.util
import pathlib
import re
import sys

import pymupdf

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ROOT / 'docs'
PDFS = pathlib.Path.home() / 'handover-pdf'


def load_renderer():
    spec = importlib.util.spec_from_file_location('hp', ROOT / 'scripts' / 'handover-pdf.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def norm(text: str) -> str:
    return re.sub(r'\s+', ' ', text.replace('\u00a0', ' '))


def main() -> int:
    hp = load_renderer()
    checked = 0
    problems: list[str] = []

    for md in sorted(DOCS.glob('*.md')):
        pdf = PDFS / f'{md.stem}.pdf'
        if not pdf.exists():
            continue
        _html, heads = hp.convert(md.read_text())
        if not heads:
            continue
        found, _toc_pages = hp.heading_pages(pdf, heads)
        doc = pymupdf.open(str(pdf))
        pages = [norm(p.get_text()) for p in doc]

        for _level, _hid, title in heads:
            checked += 1
            page = found.get(title)
            if page is None:
                problems.append(f'{pdf.name}: "{title}" has no page number in the contents')
            elif norm(title) not in pages[page - 1]:
                problems.append(f'{pdf.name}: "{title}" is listed as p. {page}, but is not on that page')

    if problems:
        print(f'{len(problems)} contents defect(s) across {checked} headings:')
        for p in problems:
            print(' -', p)
        return 1

    print(f'OK — {checked} headings across {len(list(PDFS.glob("*.pdf")))} PDFs, '
          'every contents entry points at the page it is printed on.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
