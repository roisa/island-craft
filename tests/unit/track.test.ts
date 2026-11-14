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

import { coinPlan, onBoost, BOOSTS, laneOf } from '../../src/game/track';
import { addLine } from '../../src/game/race';
describe('the big circuit: coins to add up and boost pads', () => {
  it('is wider and longer than the first track', () => {
    expect(TRACK.W).toBeGreaterThanOrEqual(9);
    expect(LAP).toBeGreaterThan(180);
  });
  it('lays small groups of coins on the track, away from the start line', () => {
    for (const lap of [1, 2]) {
      const c = coinPlan(lap);
      const groups = new Set(c.map(x => x.group));
      expect(groups.size).toBe(6);
      for (const g of groups) { const n = c.filter(x => x.group === g).length; expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(3); }
      for (const x of c) { const p = pointAt(x.s, x.lane); expect(cellKind(p.x, p.z)).toBe('track'); expect(x.s).toBeGreaterThan(10); expect(x.s).toBeLessThan(LAP - 10); }
      expect(c.length).toBeLessThanOrEqual(12);
    }
  });
  it('the coins are added up out loud: “3 plus 2 makes 5”', () => {
    expect(addLine(0, 1).show).toBe('🪙 1');
    expect(addLine(0, 1).say[1]).toBe('One coin!');
    expect(addLine(3, 2).show).toBe('🪙 3 + 2 = 5');
    expect(addLine(3, 2).say[1]).toBe('3 plus 2 makes 5. Now you have 5 coins!');
    expect(addLine(1, 1).say[0]).toBe('1 tambah 1 sama dengan 2. Sekarang koinmu 2!');
  });
  it('has boost pads in the middle of the straights', () => {
    for (const b of BOOSTS) {
      const p = pointAt(b.s + b.len / 2);
      expect(onBoost(b.s + b.len / 2, laneOf(p.x, p.z))).toBe(true);
      expect(onBoost(b.s + b.len / 2, 4)).toBe(false);
      expect(cellKind(p.x, p.z)).toBe('track');
    }
    expect(onBoost(LAP * 0.25, 0)).toBe(false);
  });
});

import { raceSoon, crowdTime, RACE_TIMES, PRIZE } from '../../src/game/race';
describe('the big races at set times', () => {
  it('tells you a quarter of an hour before each big race, once', () => {
    expect(RACE_TIMES.length).toBeGreaterThanOrEqual(2);
    expect(raceSoon(9.7, 9.76)).toBe(10);
    expect(raceSoon(9.76, 9.8)).toBeNull();
    expect(raceSoon(15.7, 15.8)).toBe(16);
    expect(raceSoon(12, 12.1)).toBeNull();
  });
  it('the villagers come to watch around race time', () => {
    expect(crowdTime(9.6)).toBe(true);
    expect(crowdTime(11)).toBe(true);
    expect(crowdTime(13)).toBe(false);
  });
  it('has prizes for six racers', () => { expect(PRIZE.length).toBeGreaterThanOrEqual(6); });
});
