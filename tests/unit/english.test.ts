import { describe, it, expect } from 'vitest';
import { PRAISE, ANIMAL_WORDS, FRUIT_WORDS, nextPraise } from '../../src/game/english';

describe('English words while playing', () => {
  it('every word has its English, its Indonesian meaning and a picture', () => {
    for (const w of [...PRAISE, ...Object.values(ANIMAL_WORDS), ...Object.values(FRUIT_WORDS)]) expect(w.en && w.id && w.icon, w.en).toBeTruthy();
    expect(PRAISE.length).toBeGreaterThanOrEqual(12);
    expect(new Set(PRAISE.map(w => w.en)).size).toBe(PRAISE.length);
  });
  it('the praise word changes each time', () => {
    for (let r = 0; r < 1; r += 0.05) expect(nextPraise('Awesome!', r).en).not.toBe('Awesome!');
  });
  it('each animal tells what it says', () => {
    expect(ANIMAL_WORDS.cow.say).toContain('moo');
    expect(ANIMAL_WORDS.cat.id).toBe('Kucing');
  });
});
