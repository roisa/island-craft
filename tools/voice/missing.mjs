// The Arabic lines the game says that don't have a recorded clip yet (they're read by the device
// for now): Iqro syllables with tanwin and long vowels, the Iqro words, the ayat and the du'a.
//   npx vite-node tools/voice/missing.mjs > tools/voice/missing.tsv
// tools/voice/cloudshell.sh makes the clips (same voice as the Baby Mo app) into public/voice/game-*.mp3
// and src/game/voice-manifest.game.json (the ayat too, until a reciter's recording replaces them).
import { voiceKey, spellings } from '../../src/game/voicekey';
import { lessons, WORDS, SURAHS } from '../../src/game/iqro';
import { DUAS } from '../../src/content';
import fs from 'fs';
const M = JSON.parse(fs.readFileSync(new URL('../../src/game/voice-manifest.json', import.meta.url), 'utf8'));
const rows = new Map();
const G = (() => { try { return JSON.parse(fs.readFileSync(new URL('../../src/game/voice-manifest.game.json', import.meta.url), 'utf8')); } catch { return {}; } })();
const want = (kind, ar, lat) => { if (!spellings(ar).some(t => M[voiceKey(t, 'ar')] || G[voiceKey(t, 'ar')]) && !rows.has(ar)) rows.set(ar, [kind, ar, lat, voiceKey(ar, 'ar')]); };
for (const l of lessons()) if (l.kind === 'syll') for (const s of l.items) want('syllable', s.ar, s.lat);
for (const w of WORDS) want('word', w.ar, w.lat.replace(/-/g, ''));
for (const s of SURAHS) s.ayat.forEach((a, i) => want(`ayah ${s.name} ${i + 1}`, a.ar, a.lat));
for (const [id, d] of Object.entries(DUAS)) want(`dua ${id}`, d.ar, d.lat ?? '');
console.log('kind\tarabic\tlatin\tkey');
for (const r of rows.values()) console.log(r.join('\t'));
console.error(`${rows.size} lines without a clip`);
