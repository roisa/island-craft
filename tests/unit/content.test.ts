import { describe, it, expect } from 'vitest';
import { QUESTS, CALENDAR, DUAS, WORDS, newStats } from '../../src/content';
import { LETTERS, isBlockId, ITEMS } from '../../src/world/blocks';

describe('learning content', () => {
  it('has 28 hijaiyah letters, each with name and latin', () => {
    expect(LETTERS.length).toBe(28);
    for (const l of LETTERS) { expect(l.g).toMatch(/[؀-ۿ]/); expect(l.name).toBeTruthy(); expect(l.lat).toBeTruthy(); }
  });
  it('every word game word is spelled with the letters it lists', () => {
    for (const w of WORDS) {
      const glyphs = [...w.plain];
      expect(glyphs.length, w.lat).toBe(w.letters.length);
      glyphs.forEach((g, i) => expect(LETTERS[w.letters[i]].g, `${w.lat} letter ${i}`).toBe(g));
      expect(w.voweled.replace(/[ً-ْ]/g, '')).toBe(w.plain);
      expect(w.mean[0] && w.mean[1]).toBeTruthy();
    }
  });
  it('has a 30-day Ramadhan calendar in both languages', () => {
    expect(CALENDAR.length).toBe(30);
    for (const d of CALENDAR) { expect(d.title[0] && d.title[1] && d.tip[0] && d.tip[1]).toBeTruthy(); expect(isBlockId(d.reward[0]) || ITEMS.has(d.reward[0])).toBe(true); }
  });
  it("du'a cards have Arabic, transliteration and meaning", () => {
    for (const d of Object.values(DUAS)) { expect(d.ar).toMatch(/[؀-ۿ]/); expect(d.lat && d.mean[0] && d.mean[1]).toBeTruthy(); }
  });
});

describe('quests', () => {
  it('have unique ids, both languages and real rewards', () => {
    expect(new Set(QUESTS.map(q => q.id)).size).toBe(QUESTS.length);
    for (const q of QUESTS) {
      expect(q.title[0] && q.title[1] && q.desc[0] && q.desc[1]).toBeTruthy();
      for (const [id, n] of q.reward) { expect(isBlockId(id) || ITEMS.has(id), `${q.id} reward`).toBe(true); expect(n).toBeGreaterThan(0); }
    }
  });
  it('start unfinished on new stats and never report progress above the goal', () => {
    const s = newStats();
    for (const q of QUESTS) { const [have, need] = q.goal(s); expect(need).toBeGreaterThan(0); expect(have, q.id).toBeLessThan(need); }
  });
  it('the first quest completes after saying hi to Baby Mo', () => {
    const s = newStats(); s.talked.mo = true;
    const [have, need] = QUESTS.find(q => q.id === 'hello')!.goal(s);
    expect(have).toBe(need);
  });
});

describe('letter rewards', async () => {
  const { letterReward, LETTER_TREASURES } = await import('../../src/content');
  it('every letter from 1 to 28 gives a real gift', () => {
    for (let n = 1; n <= 28; n++) { const r = letterReward(n); expect(isBlockId(r.gift[0]) || ITEMS.has(r.gift[0]), `${n}`).toBe(true); expect(r.gift[1]).toBeGreaterThan(0); }
  });
  it('opens a treasure chest every 4 letters, ending with the 28th', () => {
    const at = [] as number[];
    for (let n = 1; n <= 28; n++) if (letterReward(n).treasure) at.push(n);
    expect(at).toEqual([4, 8, 12, 16, 20, 24, 28]);
    for (const t of LETTER_TREASURES) for (const [id, k] of t.gifts) { expect(isBlockId(id) || ITEMS.has(id)).toBe(true); expect(k).toBeGreaterThan(0); }
  });
  it('always says how many letters until the next chest', () => {
    expect(letterReward(1).toNext).toBe(3); expect(letterReward(4).toNext).toBe(4); expect(letterReward(27).toNext).toBe(1); expect(letterReward(28).next).toBeNull();
  });
});
