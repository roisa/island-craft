// How a spoken line finds its recorded clip: the same rules as the Baby Mo app's bm-voice.js
// (tools/voice/gen.py there), so the clips made for the app are found by the game too.
// Key = language + "|" + normalised text. The language is "ar" when the text has Arabic letters.
// Normalising: Unicode NFC, emoji / pictographs / arrows removed, curly quotes straightened, dashes
// unified, whitespace collapsed, no space before punctuation, repeated end marks folded, leading and
// trailing punctuation trimmed, tatweel removed, Latin lower-cased. Harakat are kept (different sounds).
// "tr|" keys are Latin transliterations ("Bismillah") that play the Arabic clip.

export const AR = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const EMO = /\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDEFF]|\uDB40[\uDC20-\uDC7F]|[\u2190-\u21FF\u2300-\u23FF\u25A0-\u25FF\u2600-\u27BF\u2B00-\u2BFF\uFE00-\uFE0F\u200D\u20E3\u00A9\u00AE\u2122\u2139\u3030\u303D\u3297\u3299]/g;
const EDGE = "\\s.,!?;:\u2026\u060C\u061B\u061F\u06D4\u3002'\"()\\[\\]\\-\u2014\u2022\u00B7*~_";
const LEAD = new RegExp('^[' + EDGE + ']+'), TRAIL = new RegExp('[' + EDGE + ']+$');

export function normText(t: string, lang: string): string {
  let s = String(t ?? '');
  try { s = s.normalize('NFC'); } catch { /* old engines */ }
  s = s.replace(EMO, '').replace(/[\u2018\u2019\u02BC`\u00B4]/g, "'").replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"').replace(/[\u2012\u2013\u2015]/g, '\u2014')
    .replace(/\s+/g, ' ').replace(/ ([,.!?;:\u2026])/g, '$1').replace(/\s*\u2014\s*/g, ' \u2014 ')
    .replace(/([.!?\u2026\u061F])[.!?\u2026\u061F]+/g, '$1').trim()
    .replace(/\u0640/g, '').replace(LEAD, '').replace(TRAIL, '');
  if (lang !== 'ar') s = s.toLowerCase();
  return s;
}
export function trKey(t: string): string {
  let s = String(t ?? '');
  try { s = s.normalize('NFD'); } catch { /* old engines */ }
  return 'tr|' + s.replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}
/** the key for a line said in `lang` (Arabic text is always "ar") */
export function voiceKey(text: string, lang: 'en' | 'id' | string): string {
  const l = AR.test(String(text || '')) ? 'ar' : lang;
  return l + '|' + normText(text, l);
}

/**
 * Other spellings of the same sound, tried when a line has no clip of its own: fathatan written with
 * the alif after it (بًا, as recordings usually spell it; the game writes بً), and an alif written
 * with its hamza above or below (أٍ / إٍ "in": only for that one syllable; in words they can differ, أَنَّ / إِنَّ).
 */
export function spellings(text: string): string[] {
  const out = [text];
  if (/\u064B$/.test(text)) out.push(text + '\u0627');
  if (/^[\u0623\u0625][\u064B-\u0650]$/.test(text)) for (const a of ['\u0623', '\u0625', '\u0627']) { const t = a + text.slice(1); if (!out.includes(t)) out.push(t); }
  return out;
}

/**
 * What the game plays for each key: a recording (rec) wins; else the app's clip, cleaned up (fix: its silence
 * cut; "" = the app's clip is a broken near-silent blip, so it is dropped); else a clip made for the game.
 */
export function mergeClips(game: Record<string, string>, app: Record<string, string>, fix: Record<string, string>, rec: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...game, ...app };
  for (const [k, v] of Object.entries(fix)) {
    if (v) out[k] = v;
    else if (game[k]) out[k] = game[k];
    else delete out[k];
  }
  return Object.assign(out, rec);
}
