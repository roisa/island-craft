// Builds rekam/rekam-data.js — the line list for the recording page (rekam/index.html) and the listening
// page (rekam/dengar.html): every clip the game can play, plus the Arabic lines that have no clip yet.
//   npx vite-node tools/voice/build-rekam-data.mjs
// One row per clip file (a file can serve several keys: the Arabic and its Latin name). A recording made
// on the page replaces that clip: tools/voice/import-recordings.sh makes public/voice/rec-<id>-<n>.mp3 and
// points every key of the row at it in src/game/voice-manifest.rec.json (recordings win over all clips).
// Row: {id, s: section, g: group, t: text, h: hint, l: lang (ar / id / en), f: file shown and zipped
//       (voice/<id>.mp3), ks: the manifest keys}
import fs from 'fs';
import crypto from 'crypto';
import { voiceKey } from '../../src/game/voicekey';
import { LETTERS } from '../../src/world/blocks';
import { SURAHS, WORDS } from '../../src/game/iqro';
import { DUAS } from '../../src/content';

const J = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };
const APP = J('src/game/voice-manifest.json'), GAME = J('src/game/voice-manifest.game.json'), REC = J('src/game/voice-manifest.rec.json');
const ALL = { ...GAME, ...APP, ...REC }; // (what the game plays: a recording, else the app's clip, else one made for the game)

const SECTIONS = [
  { s: 'huruf', id: 'Huruf & harakat', en: 'Letters & vowel marks', ic: '🔤' },
  { s: 'kata', id: 'Iqro: suku kata & kata', en: 'Iqro: syllables & words', ic: '📖' },
  { s: 'doa', id: 'Doa & dzikir', en: 'Du’a & dhikr', ic: '🤲' },
  { s: 'quran', id: 'Ayat Al-Qur’an', en: 'Qur’an ayat', ic: '📗' },
  { s: 'id', id: 'Kalimat Mo · ID', en: "Mo's lines · ID", ic: '🇮🇩' },
  { s: 'en', id: 'Kalimat Mo · EN', en: "Mo's lines · EN", ic: '🇬🇧' },
];

// what each Arabic line is, from the game's own content
const what = new Map(); // key -> {s, g, h}
const put = (ar, s, g, h = '') => { const k = voiceKey(ar, 'ar'); if (!what.has(k)) what.set(k, { s, g, h }); };
for (const L of LETTERS) put(L.ar, 'huruf', 'Nama huruf · Letter names', L.name);
for (const s of SURAHS) s.ayat.forEach((a, i) => put(a.ar, 'quran', `${s.name} ${i + 1}`, a.lat));
for (const [id, d] of Object.entries(DUAS)) put(d.ar, 'doa', 'Doa · Du’a', d.lat ?? id);
for (const w of WORDS) put(w.ar, 'kata', 'Kata · Words', w.lat.replace(/-/g, ''));
// the lines still without a clip (tools/voice/missing.tsv): their target file is decided here
const missing = [];
try {
  const [head, ...lines] = fs.readFileSync('tools/voice/missing.tsv', 'utf8').trim().split('\n');
  const cols = head.split('\t');
  for (const line of lines) { const r = Object.fromEntries(line.split('\t').map((v, i) => [cols[i], v])); if (r.key && !ALL[r.key]) missing.push(r); }
} catch { /* no list */ }

const byFile = new Map();
for (const [k, file] of Object.entries(ALL)) { const f = file.split('?')[0]; if (!byFile.has(f)) byFile.set(f, []); byFile.get(f).push(k); }
const rows = [];
const groupOf = (k, file) => {
  const w = what.get(k); if (w) return w;
  const t = k.slice(3), bare = t.replace(/[ً-ْٰ\s]/g, '');
  if (file.startsWith('hijaiyah-') && bare.length <= 2) return { s: 'huruf', g: 'Harakat · Vowel marks', h: '' };
  if (file.startsWith('doa-') || bare.length > 12) return { s: 'doa', g: 'Doa & dzikir · Du’a & dhikr', h: '' };
  return { s: 'kata', g: bare.length <= 2 ? 'Suku kata · Syllables' : 'Kata · Words', h: '' };
};
for (const [file, keys] of byFile) {
  const ks = keys.sort((a, b) => (a.startsWith('tr|') ? 1 : 0) - (b.startsWith('tr|') ? 1 : 0)), k = ks[0];
  const l = k.slice(0, 2), id = file.replace(/\.mp3$/, '').replace(/^rec-(.*)-\d+$/, '$1');
  if (l === 'tr') continue; // (only a Latin name: always with its Arabic)
  const g = l === 'ar' ? groupOf(k, file) : { s: l, g: file.startsWith('app-') ? 'Baby Mo app' : 'Pulau Hijaiyah', h: '' };
  rows.push({ id, s: g.s, g: g.g, t: k.slice(3), h: g.h, l, f: 'voice/' + id + '.mp3', ks });
}
for (const r of missing) {
  const id = 'mc-' + crypto.createHash('sha1').update(r.key).digest('hex').slice(0, 8);
  const w = what.get(r.key) ?? { s: r.kind.startsWith('ayah') ? 'quran' : r.kind.startsWith('dua') ? 'doa' : 'kata', g: r.kind, h: r.latin };
  rows.push({ id, s: w.s, g: w.g + ' · belum ada suara / no clip yet', t: r.arabic, h: r.latin || w.h, l: 'ar', f: 'voice/' + id + '.mp3', ks: [r.key] });
}
const order = Object.fromEntries(SECTIONS.map((s, i) => [s.s, i]));
rows.sort((a, b) => order[a.s] - order[b.s] || a.g.localeCompare(b.g) || a.t.localeCompare(b.t));
// the page reads the current clip of a row from MC_CLIPS (its ?v= says whether it's a recording)
const clips = {};
for (const [k, f] of Object.entries(ALL)) clips[k] = f + (f.includes('?') ? '' : f.startsWith('rec-') ? '?v=rec' : '?v=algenib');
const count = s => rows.filter(r => r.s === s).length;
const out = `/* Line list for rekam/index.html and dengar.html (made by tools/voice/build-rekam-data.mjs; do not edit).
   ${rows.length} lines: ${SECTIONS.map(s => s.s + ' ' + count(s.s)).join(', ')} */
window.REKAM_SECTIONS=${JSON.stringify(SECTIONS)};
window.MC_CLIPS=${JSON.stringify(clips)};
window.REKAM=[
${rows.map(r => JSON.stringify(r)).join(',\n')}
];
`;
fs.mkdirSync('rekam', { recursive: true });
fs.writeFileSync('rekam/rekam-data.js', out);
console.log(`rekam/rekam-data.js: ${rows.length} lines (${SECTIONS.map(s => s.s + ' ' + count(s.s)).join(', ')})`);
