#!/usr/bin/env python3
"""Validate every handover contents entry and text bounds, including the combined PDF."""
import argparse
import datetime
import importlib.util
import json
import pathlib
import re
import pymupdf

root = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('handover_renderer', root / 'scripts/handover-pdf.py')
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)
parser = argparse.ArgumentParser()
parser.add_argument('--dir', default='/home/user/handover-pdf')
parser.add_argument('--output', default='/tmp/dm-handover-validation.json')
args = parser.parse_args()
out = pathlib.Path(args.dir)
files = []
count = 0

def bounds(path):
    doc = pymupdf.open(path)
    for number, page in enumerate(doc, 1):
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                for span in line['spans']:
                    x0, y0, x1, y1 = span['bbox']
                    assert x0 >= -1 and y0 >= -1 and x1 <= page.rect.width + 1 and y1 <= page.rect.height + 1, (path.name, number, span['text'])
    result = {'file':path.name, 'pages':len(doc), 'bytes':path.stat().st_size, 'outOfPageSpans':0}
    doc.close()
    return result

for name, _ in renderer.CORE:
    text = (renderer.DOCS / name).read_text()
    for bad, good in renderer.GLYPHS.items():
        text = text.replace(bad, good)
    _, heads = renderer.convert(text)
    path = out / (pathlib.Path(name).stem + '.pdf')
    found, _ = renderer.heading_pages(path, heads)
    missing = [title for _, _, title in heads if title not in found]
    assert not missing, (name, missing)
    doc = pymupdf.open(path)
    flat = re.sub(r'\s+', ' ', ' '.join(p.get_text() for p in doc))
    for _, _, title in heads:
        needle = re.sub(r'\s+', ' ', f'{title} · p. {found[title]}')
        assert needle in flat, (name, needle)
    doc.close()
    count += len(heads)
    files.append({**bounds(path), 'headings':len(heads)})
files.append(bounds(out / 'DEALMOSAIC-handover-set.pdf'))
report = {'date':str(datetime.date.today()), 'release':json.loads((root / 'package.json').read_text())['version'], 'validatedHeadings':count, 'files':files}
pathlib.Path(args.output).write_text(json.dumps(report, indent=2) + '\n')
print(f'Validated {count} contents entries across {len(files)} PDFs; zero off-page text spans.')
