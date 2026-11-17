// Baby Mo's recorded voice: the clips from the Baby Mo app are found by their text, the same way as
// in the app, and they cover the letters, the vowel marks and the Iqro journey.
import { describe, it, expect } from 'vitest';
import { voiceKey, normText, trKey, spellings } from '../../src/game/voicekey';
import CLIPS from '../../src/game/voice-manifest.json';
import GAME_CLIPS from '../../src/game/voice-manifest.game.json';
import { LETTERS } from '../../src/world/blocks';
import { lessons, WORDS, SURAHS } from '../../src/game/iqro';
import { DUAS } from '../../src/content';
import fs from 'fs';

const M = { ...(GAME_CLIPS as Record<string, string>), ...(CLIPS as Record<string, string>) };
const has = (ar: string, latin?: string) => !!(spellings(ar).map(t => M[voiceKey(t, 'ar')]).find(Boolean) ?? (latin ? M[trKey(latin)] : undefined));

describe('finding a clip by its text (the same keys as the Baby Mo app)', () => {
  it('ignores emoji, curly quotes, spacing and case; keeps the harakat', () => {
    expect(normText('☀️ Selamat pagi!  Ayo siram! 💧', 'id')).toBe('selamat pagi! ayo siram');
    expect(voiceKey('Masha Allah!', 'en')).toBe('en|masha allah');
    expect(voiceKey('بَ', 'en')).toBe('ar|بَ');
    expect(voiceKey('بَ', 'en')).not.toBe(voiceKey('بِ', 'en'));
    expect(trKey('Bismillah!')).toBe('tr|bismillah');
    expect(spellings('بً')).toContain('بًا'); // (fathatan, as the recordings spell it)
    expect(spellings('إٍ')).toContain('أٍ');
  });
  it('every clip in the table is in public/voice', () => {
    for (const f of new Set(Object.values(M))) expect(fs.existsSync('public/voice/' + f), f).toBe(true);
  });
});

describe('what Baby Mo says with his recorded voice', () => {
  it('all 28 letter names', () => {
    const missing = LETTERS.filter(L => !has(L.ar, L.name)).map(L => L.name);
    expect(missing).toEqual([]);
  });
  it('every letter with fathah, kasrah and dhammah (ba, bi, bu)', () => {
    const missing = lessons().filter(l => l.kind === 'syll' && l.stage === 2).flatMap(l => (l as any).items).filter((s: any) => !has(s.ar)).map((s: any) => s.ar);
    expect(missing).toEqual([]);
  });
  it('reports how much of the Iqro journey and the du\'a have clips', () => {
    const sylls = lessons().filter(l => l.kind === 'syll').flatMap(l => (l as any).items as { ar: string }[]);
    const n = (xs: string[]) => `${xs.filter(x => has(x)).length}/${xs.length}`;
    const report = {
      syllables: n([...new Set(sylls.map(s => s.ar))]),
      words: n(WORDS.map(w => w.ar)),
      ayat: n(SURAHS.flatMap(s => s.ayat.map(a => a.ar))),
      duas: n(Object.values(DUAS).map((d: any) => d.ar)),
    };
    console.log('recorded clips:', JSON.stringify(report));
    expect(report.syllables.split('/')[0]).not.toBe('0');
  });
});
