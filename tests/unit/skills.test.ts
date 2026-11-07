import { describe, it, expect } from 'vitest';
import { skillLevel, toNext, LEVEL_XP, MAX_LEVEL, hitPower, biteDelay, biteWindow, catchFor, cookZone, cookQuality, markerAt } from '../../src/game/skills';

describe('skills', () => {
  it('levels go 1..5 with practice', () => {
    expect(skillLevel(0)).toBe(1);
    for (let l = 2; l <= MAX_LEVEL; l++) { expect(skillLevel(LEVEL_XP[l - 1])).toBe(l); expect(skillLevel(LEVEL_XP[l - 1] - 1)).toBe(l - 1); }
    expect(skillLevel(99999)).toBe(MAX_LEVEL); expect(toNext(99999)).toBe(0); expect(toNext(0)).toBe(LEVEL_XP[1]);
  });
  it('a better sword and a higher level hit harder', () => {
    expect(hitPower(1, 1)).toBeGreaterThan(hitPower(0, 1));
    expect(hitPower(3, 1)).toBeGreaterThan(hitPower(2, 1));
    expect(hitPower(1, 5)).toBeGreaterThan(hitPower(1, 1));
  });
  it('fishing: skill and the hat make bites come sooner and golden fish likelier', () => {
    expect(biteDelay(5, false, 0.5)).toBeLessThan(biteDelay(1, false, 0.5));
    expect(biteDelay(1, true, 0.5)).toBeLessThan(biteDelay(1, false, 0.5));
    expect(biteWindow(5)).toBeGreaterThan(biteWindow(1));
    const golden = (lvl: number, hat: boolean) => { let n = 0; for (let i = 0; i < 1000; i++) if (catchFor(lvl, hat, i / 1000) === 'golden') n++; return n; };
    expect(golden(5, true)).toBeGreaterThan(golden(1, false));
    expect(catchFor(1, false, 0.999)).toBe('small');
  });
  it('cooking: always makes food, better with practice', () => {
    expect(cookQuality(3, 3)).toBe('perfect'); expect(cookQuality(2, 3)).toBe('good'); expect(cookQuality(0, 3)).toBe('crispy');
    expect(cookZone(5, true)).toBeGreaterThan(cookZone(1, false)); expect(cookZone(5, true)).toBeLessThanOrEqual(0.5);
    for (let t = 0; t < 10; t += 0.37) { const m = markerAt(t, 1); expect(m).toBeGreaterThanOrEqual(0); expect(m).toBeLessThanOrEqual(1); }
  });
});
