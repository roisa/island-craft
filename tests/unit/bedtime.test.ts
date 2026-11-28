import { describe, it, expect } from 'vitest';
import { bedPhase, duskAmount, EVENING, READY } from '../../src/game/bedtime';

describe('bedtime', () => {
  it('goes from play to evening, get ready, then sleep', () => {
    expect(bedPhase(EVENING + 1)).toBe(0);
    expect(bedPhase(EVENING)).toBe(1);
    expect(bedPhase(READY + 1)).toBe(1);
    expect(bedPhase(READY)).toBe(2);
    expect(bedPhase(1)).toBe(2);
    expect(bedPhase(0)).toBe(3);
    expect(bedPhase(-30)).toBe(3);
  });
  it('the evening light grows from nothing to full', () => {
    expect(duskAmount(EVENING * 2)).toBe(0);
    expect(duskAmount(EVENING)).toBe(0);
    expect(duskAmount(EVENING / 2)).toBeCloseTo(0.5);
    expect(duskAmount(0)).toBe(1);
    expect(duskAmount(-10)).toBe(1);
  });
  it('warns ten minutes ahead, asks to get ready at five', () => {
    expect(EVENING).toBe(600); expect(READY).toBe(300);
  });
});
