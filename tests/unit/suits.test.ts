import { describe, it, expect } from 'vitest';
import { SUITS, EMBLEMS, SPIDER_SUIT } from '../../src/game/suits';

describe('hero suits', () => {
  it('there are ten, each with its own name in both languages and a chest symbol', () => {
    expect(SUITS.length).toBe(10);
    expect(new Set(SUITS.map(s => s.id)).size).toBe(10);
    expect(new Set(SUITS.map(s => s.name[1])).size).toBe(10);
    for (const s of SUITS) { expect(s.slot).toBe('suit'); expect(s.suit?.emblem).toBeTruthy(); expect(s.name[0] && s.name[1]).toBeTruthy(); }
    // every chest symbol is a 5×5 picture
    for (const rows of Object.values(EMBLEMS)) { expect(rows.length).toBe(5); for (const r of rows) expect(r).toMatch(/^[01]{5}$/); }
  });
  it('they open when all 28 hijaiyah letters are found, not before, and not by level', () => {
    for (const s of SUITS) {
      expect(s.level).toBe(99);
      expect(s.unlock!.test({ letters: Array.from({ length: 27 }, (_, i) => i) } as never)).toBe(false);
      expect(s.unlock!.test({ letters: Array.from({ length: 28 }, (_, i) => i) } as never)).toBe(true);
    }
  });
  it('the names are our own: none of the well-known hero brand words', () => {
    const brands = /super|spider|bat|iron|captain|wonder|hulk|flash|thor|marvel|lantern|panther|aqua|avenger|justice|ranger|bravestarr|power ?puff|incredible|venom|widow|hawk|cyborg|shazam|robin|joker|storm|wolverine|x-men/i;
    for (const s of SUITS) for (const n of s.name) expect(brands.test(n), n).toBe(false);
  });
});

describe('the Spider Warrior suit', () => {
  it('is our own hero, open from the start, apart from the 10 suits for the 28 letters', () => {
    expect(SPIDER_SUIT.slot).toBe('suit'); expect(SPIDER_SUIT.level).toBe(1); expect(SPIDER_SUIT.unlock).toBeUndefined();
    expect(SUITS.some(s => s.id === SPIDER_SUIT.id)).toBe(false);
    expect(EMBLEMS[SPIDER_SUIT.suit!.emblem]).toHaveLength(5);
    // (not anyone's name or look: no "Spider-Man", and not red and blue)
    for (const n of SPIDER_SUIT.name) expect(/spider-?man|marvel/i.test(n)).toBe(false);
    expect([SPIDER_SUIT.color, SPIDER_SUIT.suit!.pants]).not.toContain(0xd62f2f);
  });
});
