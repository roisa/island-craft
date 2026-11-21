import { describe, it, expect } from 'vitest';
import { bedugPattern } from '../../src/game/audio';

describe('the bedug at prayer time', () => {
  it('starts with slow heavy beats, speeds up in a roll, and ends with strong beats', () => {
    const b = bedugPattern(), gaps = b.slice(1).map((x, i) => x[0] - b[i][0]);
    expect(b.slice(0, 3).every(([, v]) => v === 1)).toBe(true);
    expect(gaps[0]).toBeGreaterThan(1);
    // the roll gets faster
    const roll = gaps.slice(3, 24);
    for (let i = 1; i < roll.length; i++) expect(roll[i]).toBeLessThanOrEqual(roll[i - 1] + 1e-9);
    expect(Math.min(...roll)).toBeGreaterThanOrEqual(0.129);
    expect(b.slice(-3).every(([, v]) => v === 1)).toBe(true);
    const len = b[b.length - 1][0];
    expect(len).toBeGreaterThan(8); expect(len).toBeLessThan(16);
  });
});
