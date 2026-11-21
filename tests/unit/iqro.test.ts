import { describe, it, expect } from 'vitest';
import { lessons, lessonAt, syll, WORDS, SURAHS, STAGES, choices, MARK_INFO } from '../../src/game/iqro';
import { lessonCoins, stageEnds } from '../../src/game/iqroquest';
import { LETTERS } from '../../src/world/blocks';

describe('the Iqro journey', () => {
  it('goes stage by stage: harakat, tanwin & long vowels, words, then surahs', () => {
    const all = lessons();
    const stages = all.map(l => l.stage);
    expect(stages).toEqual([...stages].sort((a, b) => a - b));
    expect(new Set(stages)).toEqual(new Set([2, 3, 4, 5]));
    expect(STAGES.map(s => s.n)).toEqual([1, 2, 3, 4, 5]);
  });
  it('stage 2 teaches every letter with fathah, kasrah and dhammah', () => {
    const s2 = lessons().filter(l => l.kind === 'syll' && l.stage === 2);
    for (const m of ['a', 'i', 'u']) {
      const seen = new Set(s2.flatMap(l => (l.kind === 'syll' && l.mark === m ? l.items.map(x => x.letter) : [])));
      expect(seen.size, m).toBe(28);
    }
  });
  it('writes and reads syllables right', () => {
    expect(syll(1, 'a')).toEqual({ ar: 'بَ', lat: 'ba', letter: 1 });
    expect(syll(1, 'i').lat).toBe('bi');
    expect(syll(1, 'un').ar).toBe('بٌ');
    expect(syll(1, 'aa').ar).toBe('بَا');
    expect(syll(0, 'i').ar).toBe('إِ');
    expect(syll(17, 'a').lat).toBe("'a");
    for (const m of Object.keys(MARK_INFO)) expect(MARK_INFO[m as keyof typeof MARK_INFO].how[0]).toBeTruthy();
  });
  it('each word is made of the syllables you read', () => {
    for (const w of WORDS) {
      const strip = (s: string) => s.replace(/[ً-ْ]/g, '');
      expect(strip(w.parts.map(p => p.ar).join('')), w.lat).toBe(strip(w.ar));
      expect(w.mean[0] && w.mean[1] && w.icon).toBeTruthy();
    }
  });
  it('has the short surahs with every ayah in Arabic, read aloud and explained, ending with Al-Fatihah', () => {
    expect(SURAHS.map(s => s.name)).toContain('Al-Ikhlas');
    expect(SURAHS[SURAHS.length - 1].name).toBe('Al-Fatihah');
    const count: Record<string, number> = { kautsar: 3, ikhlas: 4, asr: 3, falaq: 5, nas: 6, fatihah: 7 };
    for (const s of SURAHS) { expect(s.ayat.length, s.id).toBe(count[s.id]); for (const a of s.ayat) expect(a.ar && a.lat && a.mean[0] && a.mean[1]).toBeTruthy(); }
  });
  it('after the last lesson, review lessons go round and round', () => {
    const all = lessons();
    expect(lessonAt(0).review).toBe(false);
    const r = lessonAt(all.length + 3);
    expect(r.review).toBe(true);
    expect(r.index).toBeGreaterThanOrEqual(0); expect(r.index).toBeLessThan(all.length);
  });
  it('knows where each stage ends, and gives more coins for more stars', () => {
    const all = lessons();
    const ends = all.map((_, i) => i).filter(stageEnds);
    expect(ends.length).toBe(4);
    expect(lessonCoins(3)).toBeGreaterThan(lessonCoins(1));
  });
  it('a listening question has the right answer and two others', () => {
    let r = 0.3; const roll = () => (r = (r * 9301 + 49297) % 233280 / 233280);
    const c = choices(LETTERS, LETTERS[5], roll);
    expect(c).toHaveLength(3); expect(c).toContain(LETTERS[5]); expect(new Set(c).size).toBe(3);
  });
});

import { learnedSurahs, stagesDone, examPool, EXAM_PASS, EXAM_QS } from '../../src/game/iqroquest';
describe('the Iqro journey in the rest of the game', () => {
  it('knows which surahs you have learned (a lesson with stars), in order', () => {
    const all = lessons(), at = (id: string) => all.findIndex(l => l.kind === 'surah' && l.surah.id === id);
    expect(learnedSurahs(undefined)).toEqual([]);
    expect(learnedSurahs({ [at('nas')]: 2, [at('ikhlas')]: 3 }).map(s => s.id)).toEqual(['ikhlas', 'nas']);
  });
  it('a stage is done once all its lessons are, then Dad’s exam can be taken', () => {
    const all = lessons(), end2 = all.map(l => l.stage).lastIndexOf(2);
    expect(stagesDone(end2)).toEqual([]);
    expect(stagesDone(end2 + 1)).toEqual([2]);
    expect(stagesDone(all.length)).toEqual([2, 3, 4, 5]);
  });
  it('each exam has enough to ask, and passing needs most of them right', () => {
    for (const st of [2, 3, 4, 5]) expect(examPool(st).length, `stage ${st}`).toBeGreaterThanOrEqual(EXAM_QS);
    expect(EXAM_PASS).toBeGreaterThan(EXAM_QS / 2); expect(EXAM_PASS).toBeLessThanOrEqual(EXAM_QS);
  });
});
