// Bring Baby Mo's recorded voice (the same clips as the Baby Mo app: one Google voice in Arabic,
// English and Indonesian) into the game.
//   node --experimental-strip-types tools/voice/import.mjs <path to a babymo-ios checkout> [--dry]
// Every Arabic clip comes along (letters, harakat, syllables, words, du'a, dhikr and the Latin
// names like "Bismillah"); an English or Indonesian clip only when the game says that exact line.
// Writes public/voice/<file>.mp3 and src/game/voice-manifest.json ({ "lang|text": "file.mp3" }, built into
// the game so it's always current; the clips' names come from their content, so caching them is safe),
// with keys made the same way as the app's bm-voice.js (src/game/voicekey.ts does it at runtime).
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { voiceKey, normText, trKey } from '../../src/game/voicekey.ts';

const SRC = path.resolve(process.argv[2] || '../babymo-ios');
const DRY = process.argv.includes('--dry');
const PUB = path.join(SRC, 'public');
const OUT = path.resolve('public/voice');

// the app's three manifests (plain scripts that set window.*)
const win = {};
for (const f of ['voice/manifest.js', 'hijaiyah-voice/voice.js', 'doa-voice/voice.js']) vm.runInNewContext(fs.readFileSync(path.join(PUB, f), 'utf8'), { window: win });
const index = new Map(); // key -> source file (absolute)
const add = (k, dir, file) => { const f = path.join(PUB, dir, file.split('?')[0]); if (fs.existsSync(f)) index.set(k, f); };
for (const [t, f] of Object.entries(win.HIJ_VOICE || {})) add('ar|' + normText(t, 'ar'), 'hijaiyah-voice', f);
for (const [t, f] of Object.entries(win.DOA_VOICE || {})) add('ar|' + normText(t, 'ar'), 'doa-voice', f);
for (const [k, f] of Object.entries(win.BM_VOICE || {})) {
  const bar = k.indexOf('|'), l = k.slice(0, bar), rest = k.slice(bar + 1);
  add(l === 'tr' ? trKey(rest) : l + '|' + normText(rest, l), 'voice', f);
}

// every line the game might say: the string literals in src (both languages)
const lines = new Set();
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.ts$/.test(e.name)) {
  const s = fs.readFileSync(p, 'utf8');
  for (const m of s.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\$]|\\.)*)`/g)) lines.add((m[1] ?? m[2] ?? m[3]).replace(/\\'/g, "'"));
} } };
walk(path.resolve('src'));
const wanted = new Set();
for (const t of lines) for (const l of ['en', 'id']) wanted.add(voiceKey(t, l));

const keep = new Map();
for (const [k, f] of index) if (k.startsWith('ar|') || k.startsWith('tr|') || wanted.has(k)) keep.set(k, f);
const files = new Set(keep.values());
const bytes = [...files].reduce((a, f) => a + fs.statSync(f).size, 0);
const by = l => [...keep.keys()].filter(k => k.startsWith(l + '|')).length;
console.log(`clips: ${files.size} files, ${(bytes / 1e6).toFixed(1)} MB · keys ar ${by('ar')} · tr ${by('tr')} · en ${by('en')} · id ${by('id')}`);
if (DRY) { console.log([...keep.keys()].filter(k => /^(en|id)\|/.test(k)).slice(0, 40).join('\n')); process.exit(0); }

fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const name = new Map(); // source -> file name in public/voice (folder prefix keeps names unique)
for (const f of files) { const n = path.basename(path.dirname(f)).replace('-voice', '').replace('voice', 'app') + '-' + path.basename(f).replace(/^app-/, ''); name.set(f, n); fs.copyFileSync(f, path.join(OUT, n)); }
const manifest = Object.fromEntries([...keep].sort(([a], [b]) => a.localeCompare(b)).map(([k, f]) => [k, name.get(f)]));
fs.writeFileSync(path.resolve('src/game/voice-manifest.json'), JSON.stringify(manifest, null, 0));
console.log('wrote', OUT);
