import { describe, it, expect } from 'vitest';
import { TRACK, LAP, cellKind, pointAt, progressOf, ranking } from '../../src/game/track';

describe('race track', () => {
  it('every point on the centre line is on the track, and the lap length adds up', () => {
    for (let s = 0; s < LAP; s += 0.7) { const p = pointAt(s); expect(cellKind(p.x, p.z), `s ${s.toFixed(1)}`).toBe('track'); }
    expect(LAP).toBeCloseTo(4 * TRACK.half + 2 * Math.PI * TRACK.R, 5);
  });
  it('progress along the lap matches the point it came from', () => {
    for (let s = 0.5; s < LAP - 0.5; s += 1.3) { const p = pointAt(s); expect(progressOf(p.x, p.z), `s ${s.toFixed(1)}`).toBeCloseTo(s, 4); }
  });
  it('the heading points to the next point', () => {
    for (let s = 0; s < LAP; s += 3.1) {
      const a = pointAt(s), b = pointAt(s + 0.05);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      expect(Math.cos(yaw - a.yaw), `s ${s.toFixed(1)}`).toBeGreaterThan(0.99);
    }
  });
  it('lanes are on the track too, inside and outside', () => {
    for (const lane of [-2.5, 2.5]) for (let s = 0; s < LAP; s += 2) { const p = pointAt(s, lane); expect(cellKind(p.x, p.z)).toBe('track'); }
  });
  it('the middle is grass and the tyre wall is outside', () => {
    expect(cellKind(0, 0)).toBe('in');
    expect(cellKind(0, TRACK.R + TRACK.W / 2 + 1.5)).toBe('wall');
    expect(cellKind(0, 40)).toBe('out');
  });
  it('ranks the one furthest along first', () => {
    expect(ranking([10, 150, 80, 151])).toEqual([3, 1, 2, 0]);
  });
});
