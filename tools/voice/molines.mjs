// Baby Mo's guidance: every line he says with fixed wording (the tutorial steps, prayer times, game instructions…),
// sentence by sentence, in Indonesian and English. Used by the recording page (build-rekam-data.mjs: lines to
// record) and by the Cloud Shell generator (missing.mjs -> gen.py: lines to make in Baby Mo's app voice).
// A line plays from clips once all its sentences have one (src/game/audio.ts talk).
import fs from 'fs';
import { voiceKey, sentences } from '../../src/game/voicekey';

const STR = "'((?:[^'\\\\]|\\\\.)*)'";
const PAIR = new RegExp('tr\\(\\s*' + STR + '\\s*,\\s*' + STR + '\\s*\\)', 'g');
const STEP = new RegExp('\\[\\s*' + STR + '\\s*,\\s*' + STR + '\\s*\\]', 'g'); // (each tutorial step's [id, en] text)
const unesc = x => x.replace(/\\(.)/g, '$1');

/** [{ lang: 'id' | 'en', t: sentence, k: voice key, g: group }], tutorial first; `skip(k)` leaves out lines that have a clip */
export function moLines(skip = () => false) {
  const files = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = d + '/' + f.name; if (f.isDirectory()) walk(p); else if (/\.ts$/.test(f.name)) files.push(p); } };
  walk('src');
  files.sort((a, b) => (b.endsWith('game/kid.ts') ? 1 : 0) - (a.endsWith('game/kid.ts') ? 1 : 0) || a.localeCompare(b));
  const seen = new Set(), out = [];
  const add = (idT, enT, g) => {
    for (const [lang, txt] of [['id', idT], ['en', enT]]) for (const t of sentences(unesc(txt), lang)) {
      const k = voiceKey(t, lang);
      if (k.startsWith('ar|') || seen.has(k) || skip(k)) continue;
      seen.add(k); out.push({ lang, t, k, g });
    }
  };
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    if (f.endsWith('game/kid.ts')) { const a = src.indexOf('const STEPS'), b = src.indexOf('];', a); for (const m of src.slice(a, b).matchAll(STEP)) add(m[1], m[2], 'Tutorial · rekam dulu / record first'); }
    // a line Baby Mo says: ui.say(tr('…', '…')) (not Speech.say, which reads Arabic)
    for (const line of src.split('\n')) if (/\bui\.say\(/.test(line)) for (const m of line.matchAll(PAIR)) add(m[1], m[2], 'Panduan Mo · Mo’s guidance');
  }
  return out;
}
