// Baby Mo's recorded voice: the clips from the Baby Mo app are found by their text, the same way as
// in the app, and they cover the letters, the vowel marks and the Iqro journey.
import { describe, it, expect } from 'vitest';
import { voiceKey, normText, trKey, spellings, mergeClips } from '../../src/game/voicekey';
import CLIPS from '../../src/game/voice-manifest.json';
import GAME_CLIPS from '../../src/game/voice-manifest.game.json';
import REC_CLIPS from '../../src/game/voice-manifest.rec.json';
import FIX_CLIPS from '../../src/game/voice-manifest.fix.json';
import { LETTERS } from '../../src/world/blocks';
import { lessons, WORDS, SURAHS } from '../../src/game/iqro';
import { DUAS } from '../../src/content';
import fs from 'fs';

const M = mergeClips(GAME_CLIPS as Record<string, string>, CLIPS as Record<string, string>, FIX_CLIPS as Record<string, string>, REC_CLIPS as Record<string, string>);
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
  it('every letter with fathah, kasrah and dhammah (ba, bi, bu) has a working clip, or is listed to be made', () => {
    // (a few of the app's syllable clips are near-silent and are dropped (voice-manifest.fix.json): those are
    // read by the device until tools/voice/cloudshell.sh makes them, so they must be in tools/voice/missing.tsv)
    const listed = new Set(fs.readFileSync('tools/voice/missing.tsv', 'utf8').trim().split('\n').slice(1).map(l => l.split('\t')[1]));
    const missing = lessons().filter(l => l.kind === 'syll' && l.stage === 2).flatMap(l => (l as any).items).filter((s: any) => !has(s.ar)).map((s: any) => s.ar);
    expect(missing.filter((a: string) => !listed.has(a))).toEqual([]);
    expect(missing.length).toBeLessThanOrEqual(20);
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

describe('cleaned-up letter clips (voice-manifest.fix.json)', () => {
  const FIX = FIX_CLIPS as Record<string, string>;
  it('every trimmed clip exists, and replaces the app clip', () => {
    for (const [k, f] of Object.entries(FIX)) if (f) { expect(fs.existsSync('public/voice/' + f), f).toBe(true); expect(M[k]).toBe((REC_CLIPS as Record<string, string>)[k] ?? f); }
  });
  it('a broken (near-silent) app clip is never played: the key falls back to a game clip or to the device', () => {
    for (const [k, f] of Object.entries(FIX)) if (!f) expect(M[k]).toBe((REC_CLIPS as Record<string, string>)[k] ?? (GAME_CLIPS as Record<string, string>)[k]);
  });
  it('mergeClips: recording > fixed app clip > app clip > game clip; "" drops the app clip', () => {
    const m = mergeClips({ a: 'g-a', b: 'g-b', d: 'g-d' }, { a: 'app-a', b: 'app-b', c: 'app-c', e: 'app-e' }, { b: '', c: 'fix-c', e: '' }, { d: 'rec-d' });
    expect(m).toEqual({ a: 'app-a', b: 'g-b', c: 'fix-c', d: 'rec-d' });
  });
});

describe("Baby Mo's guidance on the recording page, played sentence by sentence", async () => {
  const { sentences } = await import('../../src/game/voicekey');
  const vm = await import('vm');
  const win: any = {}; vm.runInNewContext(fs.readFileSync('rekam/rekam-data.js', 'utf8'), { window: win });
  const mo = (win.REKAM as any[]).filter(r => r.id.startsWith('mo-'));
  it('splits a line into its sentences (tags out, emoji-only bits dropped)', () => {
    expect(sentences('Kolam Pancing! 🎣 Ketuk ✋ untuk melempar, lalu tunggu.', 'id')).toEqual(['Kolam Pancing!', '🎣 Ketuk ✋ untuk melempar, lalu tunggu.']);
    expect(sentences('5 menit lagi tidur 😴 Ketuk <b>Tidur sekarang</b> ⭐', 'id')).toEqual(['5 menit lagi tidur 😴 Ketuk  Tidur sekarang  ⭐']);
    expect(sentences('🎉', 'en')).toEqual([]);
  });
  it('lists the tutorial first, in both languages, each sentence keyed as the game looks it up', () => {
    // (the tutorial's sentences, with a clip or still to record, keep their group so they come first)
    const tut = (win.REKAM as any[]).filter(r => r.l !== 'ar' && r.g.startsWith('Tutorial'));
    expect(tut.length).toBeGreaterThanOrEqual(16);
    expect(tut.some(r => r.l === 'id') && tut.some(r => r.l === 'en')).toBe(true);
    for (const r of tut) expect(sentences(r.t, r.l)).toEqual([r.t]);
    for (const r of mo) { expect(r.ks).toEqual([voiceKey(r.t, r.l)]); expect(sentences(r.t, r.l)).toEqual([r.t]); }
  });
  it('only lines without a clip yet are listed', () => {
    for (const r of mo) expect(M[r.ks[0]]).toBeUndefined();
  });
});
