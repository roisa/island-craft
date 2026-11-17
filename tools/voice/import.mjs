// Bring Baby Mo's recorded voice (the same clips as the Baby Mo app: one Google voice in Arabic,
// English and Indonesian) into the game.
//   node --experimental-strip-types tools/voice/import.mjs <babymo-ios checkout> <hijaiyah checkout> [--dry]
// Every Arabic clip comes along (letters, harakat, syllables, words, du'a, dhikr and the Latin
// names like "Bismillah"); an English or Indonesian clip only when the game says that exact line.
// Writes public/voice/<file>.mp3 and src/game/voice-manifest.json ({ "lang|text": "file.mp3" }, built into
// the game so it's always current; the clips' names come from their content, so caching them is safe),
// with keys made the same way as the app's bm-voice.js (src/game/voicekey.ts does it at runtime).
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { voiceKey, normText, trKey } from '../../src/game/voicekey.ts';

const SRCS = process.argv.slice(2).filter(a => !a.startsWith('--')).map(a => path.resolve(a));
const DRY = process.argv.includes('--dry');
const OUT = path.resolve('public/voice');

// the manifests of each checkout (plain scripts that set window.*): which file, which variable, and
// whether its keys are plain Arabic text or "lang|text"
const LAYOUTS = [
  // the Baby Mo app (babymo-ios)
  { file: 'public/hijaiyah-voice/voice.js', v: 'HIJ_VOICE', arabic: true },
  { file: 'public/doa-voice/voice.js', v: 'DOA_VOICE', arabic: true },
  { file: 'public/voice/manifest.js', v: 'BM_VOICE' },
  // Pulau Hijaiyah (hijaiyah)
  { file: 'audio/huruf/voice.js', v: 'HIJ_VOICE', arabic: true },
  { file: 'audio/extra/voice.js', v: 'HJ_VOICE_EXTRA', arabic: true },
  { file: 'audio/lines/voice.js', v: 'HJ_LINES' },
];
const index = new Map(); // key -> source file (absolute); the first checkout given wins a clash
for (const SRC of SRCS) for (const L of LAYOUTS) {
  const mf = path.join(SRC, L.file);
  if (!fs.existsSync(mf)) continue;
  const win = {};
  vm.runInNewContext(fs.readFileSync(mf, 'utf8'), { window: win });
  const dir = path.dirname(mf);
  for (const [k, f] of Object.entries(win[L.v] || {})) {
    let key;
    if (L.arabic) key = 'ar|' + normText(k, 'ar');
    else { const bar = k.indexOf('|'), l = k.slice(0, bar), rest = k.slice(bar + 1); key = l === 'tr' ? trKey(rest) : l + '|' + normText(rest, l); }
    const file = path.join(dir, String(f).split('?')[0]);
    if (!index.has(key) && fs.existsSync(file)) index.set(key, file);
  }
}

// the same words written a little differently in the game and in the app: play the app's clip
const SAME = [
  // the du'a on waking up ("ba'da ma" written apart in the game, together in the app)
  ['الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَمَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ'],
];
for (const [game, app] of SAME) { const f = index.get('ar|' + normText(app, 'ar')); if (f) index.set('ar|' + normText(game, 'ar'), f); }

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

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (!f.startsWith('game-')) fs.rmSync(path.join(OUT, f)); // (clips made for the game itself, game-*.mp3, stay)
const name = new Map(); // source -> file name in public/voice (folder prefix keeps names unique)
for (const f of files) {
  const folder = path.basename(path.dirname(f)).replace('-voice', '').replace(/^voice$/, 'app');
  let n = folder + '-' + path.basename(f).replace(new RegExp('^' + folder + '-'), '').replace(/^app-/, '');
  if ([...name.values()].includes(n)) n = path.basename(path.dirname(path.dirname(f))) + '-' + n; // (same name from the other checkout)
  name.set(f, n); fs.copyFileSync(f, path.join(OUT, n));
}
const manifest = Object.fromEntries([...keep].sort(([a], [b]) => a.localeCompare(b)).map(([k, f]) => [k, name.get(f)]));
fs.writeFileSync(path.resolve('src/game/voice-manifest.json'), JSON.stringify(manifest, null, 0));
console.log('wrote', OUT);
