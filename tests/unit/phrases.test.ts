import { describe, it, expect } from 'vitest';
describe('good words from Nur Connect (the Baby Mo puzzle)', async () => {
  const { DZIKIR, MOMENTS, streakWord } = await import('../../src/game/phrases');
  it('praise grows with a streak: 3 Masya Allah, 5 Subhanallah, 7 Barakallahu fik, 9 Allahu Akbar, then every 3', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15].map(streakWord)).toEqual([null, null, 'welldone', null, 'beautiful', null, 'bless', null, 'great', null, null, 'great', 'great']);
  });
  it('the new words have their Arabic with harakat, a reading and a meaning in both languages', () => {
    for (const k of ['bless', 'accept', 'trust'] as const) { const d = DZIKIR[k]; expect(/[ً-ْ]/.test(d.ar)).toBe(true); expect(d.say.length).toBeGreaterThan(5); expect(d.mean[0] && d.mean[1]).toBeTruthy(); }
    expect(MOMENTS.helped).toBe('bless'); expect(MOMENTS.prayed).toBe('accept'); expect(MOMENTS.exam).toBe('trust');
  });
  it('every word is written with its harakat (as in the Baby Mo apps)', () => {
    for (const d of Object.values(DZIKIR)) expect(/[ً-ْ]/.test(d.ar), d.say).toBe(true);
  });
});
