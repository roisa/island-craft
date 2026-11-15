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

import { TRACKS, rollPower } from '../../src/game/track';
describe('the three tracks (big circuit, Snow, Desert)', () => {
  for (const tk of Object.values(TRACKS)) {
    it(`${tk.kind}: the centre line and lanes are on the track, and progress matches`, () => {
      for (let s = 0.5; s < tk.LAP - 0.5; s += 1.1) {
        const p = tk.pointAt(s); expect(tk.cellKind(p.x, p.z), `${tk.kind} s ${s.toFixed(1)}`).toBe('track');
        expect(tk.progressOf(p.x, p.z)).toBeCloseTo(s, 4);
        for (const lane of [-2.8, 2.8]) { const q = tk.pointAt(s, lane); expect(tk.cellKind(q.x, q.z)).toBe('track'); }
      }
    });
    it(`${tk.kind}: boxes, ramp and boosts lie on the lap, the ramp on a straight, hazards leave a way round`, () => {
      for (const s of tk.boxRows) { expect(s).toBeGreaterThan(0); expect(s).toBeLessThan(tk.LAP); }
      for (const r of tk.ramps) { const a = tk.pointAt(r.s), b = tk.pointAt(r.s + r.len); expect(Math.abs(a.yaw - b.yaw)).toBeLessThan(1e-9); expect(tk.onRamp(r.s + 0.5, 0)).toBe(true); }
      for (const b of tk.boosts) expect(tk.onBoost(b.s + 1, 0)).toBe(true);
      // a mystery box is never on a hazard, a ramp or a boost pad
      for (const s of tk.boxRows) for (const lane of [-2.8, 0, 2.8]) { expect(tk.patchAt(s, lane)).toBeNull(); expect(tk.onRamp(s, lane)).toBe(false); }
      // the ramp is not on a boost pad or a hazard
      for (const r of tk.ramps) for (let d = 0; d <= r.len; d += 0.5) { expect(tk.onBoost(r.s + d, 0)).toBe(false); expect(tk.patchAt(r.s + d, 0)).toBeNull(); }
      // wherever there is a patch, part of the track's width is clear of it
      for (const p of tk.patches) expect(p.lane1 - p.lane0).toBeLessThan(tk.W);
      expect(tk.patches.length > 0).toBe(tk.kind !== 'main');
    });
  }
  it('the big circuit keeps its old shape (saved worlds)', () => {
    expect([TRACKS.main.half, TRACKS.main.R, TRACKS.main.W]).toEqual([26, 14, 9]);
  });
});

describe('mystery boxes', () => {
  const count = (place: number) => { const c: Record<string, number> = {}; for (let i = 0; i < 1000; i++) { const p = rollPower(place, 6, (i + 0.5) / 1000); c[p] = (c[p] || 0) + 1; } return c; };
  it('every power-up can come out', () => {
    expect(Object.keys(count(6)).sort()).toEqual(['banana', 'magnet', 'rocket', 'shield', 'star']);
  });
  it('the one at the back gets more rockets and stars, the leader more bananas', () => {
    const first = count(1), last = count(6);
    expect((last.rocket || 0) + (last.star || 0)).toBeGreaterThan((first.rocket || 0) + (first.star || 0) + 200);
    expect(first.banana || 0).toBeGreaterThan(last.banana || 0);
  });
});
