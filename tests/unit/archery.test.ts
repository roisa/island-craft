import { describe, it, expect } from 'vitest';
import { LEVELS, RINGS, ringPoints, landing, sumLine, aimAt, ARROWS, ARROWS_PER_ROUND } from '../../src/game/archery';
import { DZIKIR, MOMENTS, canSay } from '../../src/game/phrases';

describe('archery', () => {
  it('the rings score 100, 50, 20 and 10 from the middle out, and outside is a miss', () => {
    expect(ringPoints(0)).toBe(100);
    expect(ringPoints(0.3)).toBe(50);
    expect(ringPoints(0.6)).toBe(20);
    expect(ringPoints(0.9)).toBe(10);
    expect(ringPoints(1.2)).toBe(0);
    expect(RINGS.map(r => r[1])).toEqual([100, 50, 20, 10]);
  });
  it('the levels get harder: further, smaller, faster; then a moving target, then wind', () => {
    for (let i = 1; i < LEVELS.length; i++) { expect(LEVELS[i].d).toBeGreaterThan(LEVELS[i - 1].d); expect(LEVELS[i].r).toBeLessThanOrEqual(LEVELS[i - 1].r); }
    expect(LEVELS[3].move).toBeGreaterThan(0);
    expect(LEVELS[4].wind).toBeGreaterThan(0);
    for (const l of LEVELS) expect(l.need).toBeLessThanOrEqual(ARROWS_PER_ROUND * 100);
  });
  it('your aim stays on the target on the first level', () => {
    for (let t = 0; t < 30; t += 0.1) { const [x, y] = aimAt(t, LEVELS[0]); expect(Math.hypot(x, y)).toBeLessThan(1); }
  });
  it('the wind pushes the arrow, a better arrow pulls it to the middle', () => {
    expect(landing([0, 0], LEVELS[4], 0)[0]).toBeCloseTo(0.3);
    expect(landing([0.4, 0.4], LEVELS[0], ARROWS[1].help)[0]).toBeLessThan(0.4);
    for (let i = 1; i < ARROWS.length; i++) expect(ARROWS[i].help).toBeGreaterThan(ARROWS[i - 1].help);
    expect(ARROWS[1].scale).toBeGreaterThan(1.5); // the prize after level 1: a bigger arrow
  });
  it('adds up the points out loud', () => {
    expect(sumLine(0, 50).show).toBe('🎯 50');
    expect(sumLine(50, 20).show).toBe('🎯 50 + 20 = 70');
    expect(sumLine(50, 20).say[1]).toBe('50 plus 20 makes 70');
  });
});

describe('good words for the moment', () => {
  it('fit what happened', () => {
    expect(DZIKIR[MOMENTS.ate].say).toBe('Alhamdulillah');
    expect(DZIKIR[MOMENTS.landmark].say).toBe('Subhanallah');
    expect(DZIKIR[MOMENTS.bullseye].say).toBe('Masya Allah');
    expect(DZIKIR[MOMENTS.bumped].say).toBe('Astaghfirullah');
    expect(DZIKIR[MOMENTS.start].say).toBe('Bismillah');
    expect(DZIKIR[MOMENTS.missed].say).toBe('Insya Allah');
    for (const d of Object.values(DZIKIR)) expect(d.ar && d.mean[0] && d.mean[1]).toBeTruthy();
  });
  it('are not said too often', () => {
    expect(canSay(10000, 5000, undefined)).toBe(false);   // only 5 s after the last one
    expect(canSay(20000, 5000, undefined)).toBe(true);
    expect(canSay(20000, 5000, 1000)).toBe(false);        // the same word 19 s ago
    expect(canSay(40000, 5000, 1000)).toBe(true);
  });
});
