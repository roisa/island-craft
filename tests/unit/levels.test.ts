import { describe, it, expect } from 'vitest';
import { starsFor, levelOf, titleOf, TITLES } from '../../src/game/levels';

describe('stars and levels', () => {
  it('level 1 needs no stars and levels only go up', () => {
    expect(levelOf(0)).toBe(1);
    let prev = 1;
    for (let s = 0; s < 2000; s += 7) { const l = levelOf(s); expect(l).toBeGreaterThanOrEqual(prev); prev = l; }
  });
  it('reaching starsFor(n) gives exactly level n', () => {
    for (let n = 2; n < 15; n++) { expect(levelOf(starsFor(n))).toBe(n); expect(levelOf(starsFor(n) - 1)).toBe(n - 1); }
  });
  it('always has a title, even past the last one', () => {
    expect(titleOf(1)).toBe(TITLES[0]);
    expect(titleOf(999)).toBe(TITLES[TITLES.length - 1]);
  });
});
