// The Arabic lines the game says that don't have a recorded clip yet (they're read by the device
// for now): Iqro syllables with tanwin and long vowels, the Iqro words, the ayat and the du'a.
//   npx vite-node tools/voice/missing.mjs > tools/voice/missing.tsv
// Make the clips with the same voice as the Baby Mo app (ar-XA-Chirp3-HD-Algenib), add them to the
// app's manifests, then run import.mjs again.
import { voiceKey } from '../../src/game/voicekey';
import { lessons, WORDS, SURAHS } from '../../src/game/iqro';
import { DUAS } from '../../src/content';
import fs from 'fs';
const M = JSON.parse(fs.readFileSync(new URL('../../src/game/voice-manifest.json', import.meta.url), 'utf8'));
const rows = new Map();
const want = (kind, ar, lat) => { if (!M[voiceKey(ar, 'ar')] && !rows.has(ar)) rows.set(ar, [kind, ar, lat]); };
for (const l of lessons()) if (l.kind === 'syll') for (const s of l.items) want('syllable', s.ar, s.lat);
for (const w of WORDS) want('word', w.ar, w.lat.replace(/-/g, ''));
for (const s of SURAHS) s.ayat.forEach((a, i) => want(`ayah ${s.name} ${i + 1}`, a.ar, a.lat));
for (const [id, d] of Object.entries(DUAS)) want(`dua ${id}`, d.ar, d.lat ?? '');
console.log('kind\tarabic\tlatin');
for (const r of rows.values()) console.log(r.join('\t'));
console.error(`${rows.size} lines without a clip`);
