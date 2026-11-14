#!/usr/bin/env python3
"""Fetch Microsoft Fluent Emoji 3D (MIT) pictures for every emoji the game uses.

Run from the repo root:  python3 scripts/emoji3d.py <path to emojibase-data/en/data.json>
- scans src/ for emoji, matches each to its CLDR name (emojibase-data), downloads the 3D
  picture from github.com/microsoft/fluentui-emoji, saves it 96x96 webp in public/emoji/,
  and writes src/emoji-list.ts (the emoji that have a picture).
Typographic symbols (✓ ✕ ▶ …) are left as text.
"""
import io, json, re, sys, glob, urllib.parse, urllib.request
from PIL import Image

SKIP = set('✓✔✕✗▶◀▲⏸≈∞☆⛶➖〰⃣↩➡⬅⬆⬇▲🔺')
pat = re.compile(r'(?:[\U0001F1E6-\U0001F1FF]{2})|(?:[©®‼-㊙\U0001F000-\U0001FAFF](?:️)?(?:‍[♀-♂⚕⚖✈❤\U0001F000-\U0001FAFF](?:️)?)*)')
key = lambda e: '-'.join(f'{ord(c):x}' for c in e if c != '️')
data = json.load(open(sys.argv[1], encoding='utf8'))
label = {}
for d in data:
    label[d['emoji'].replace('️', '')] = d['label']
used = set()
for f in glob.glob('src/**/*.ts', recursive=True):
    for m in pat.findall(open(f, encoding='utf8').read()):
        e = m.replace('️', '')
        if e and e[0] not in SKIP and e in label:
            used.add(e)
BASE = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/'
def names(lb):
    n = lb[0].upper() + lb[1:]
    for v in (n, n[0] + n[1:].lower()):
        yield v
        yield v.replace(':', '').replace(',', '')
        yield v.replace(':', '')
        yield v.replace('’', '')
        yield v.replace('’', "'")
def fetch(lb):
    for n in names(lb):
        slugs = {re.sub(r'[^a-z0-9]+', '_', n.lower()).strip('_'), re.sub(r"[^a-z0-9\\-]+", '_', n.lower().replace('’', '').replace("'", '')).strip('_')}
        for path in [p for slug in slugs for p in (f'{n}/3D/{slug}_3d.png', f'{n}/Default/3D/{slug}_3d_default.png')]:
            try:
                return urllib.request.urlopen(BASE + urllib.parse.quote(path), timeout=30).read()
            except Exception:
                pass
    return None
got, miss = [], []
for e in sorted(used):
    out = f'public/emoji/{key(e)}.webp'
    try:
        open(out, 'rb').close(); got.append(e); continue
    except OSError:
        pass
    png = fetch(label[e])
    if not png:
        miss.append(f'{e} {label[e]}'); continue
    im = Image.open(io.BytesIO(png)).convert('RGBA'); im.thumbnail((96, 96), Image.LANCZOS)
    im.save(out, 'WEBP', quality=86, method=6); got.append(e)
open('src/emoji-list.ts', 'w', encoding='utf8').write(
    '// Emoji that have a Fluent Emoji 3D picture in public/emoji/ (made by scripts/emoji3d.py).\n'
    f"export const EMOJI_3D = new Set<string>({json.dumps(sorted(key(e) for e in got))});\n")
print(len(got), 'pictures,', len(miss), 'without a match:')
for m in miss: print('  ', m)
