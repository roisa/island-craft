import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ballAt, canHit, moReturns, HIT, WIN } from '../../src/game/tennis';

describe('tennis with Baby Mo', () => {
  const a = new THREE.Vector3(0, 51, 11), b = new THREE.Vector3(2, 51, -11), floor = 50.1;
  it('the ball starts at the hitter, ends at the other racket, and bounces once on the far side of the net', () => {
    expect(ballAt(0, a, b, floor).distanceTo(a)).toBeLessThan(1e-6);
    expect(ballAt(1, a, b, floor).distanceTo(b)).toBeLessThan(1e-6);
    const bounce = ballAt(0.68, a, b, floor);
    expect(bounce.y).toBeCloseTo(floor, 5);
    expect(bounce.z).toBeLessThan(0); // past the net (z = 0)
  });
  it('it clears the net', () => {
    // where it crosses z = 0, it is well above the net (one block high)
    let y = 0; for (let u = 0; u < 1; u += 0.001) { const p = ballAt(u, a, b, floor); if (Math.abs(p.z) < 0.05) { y = p.y; break; } }
    expect(y).toBeGreaterThan(floor + 1.5);
  });
  it('a tap hits in a kind window: from just over half a second before until a moment after', () => {
    expect(canHit(0.3)).toBe(true);
    expect(canHit(HIT.before)).toBe(true);
    expect(canHit(0.9)).toBe(false);
    expect(canHit(-0.05)).toBe(true);
    expect(canHit(-0.5)).toBe(false);
  });
  it('Baby Mo returns most balls, a few less in long rallies, and the match is short', () => {
    expect(moReturns(0, 0.5)).toBe(true);
    expect(moReturns(0, 0.95)).toBe(false);
    expect(moReturns(10, 0.7)).toBe(false);
    expect(WIN).toBe(3);
  });
});
