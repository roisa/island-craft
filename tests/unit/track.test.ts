import { describe, it, expect } from 'vitest';
import { TRACK, LAP, cellKind, pointAt, progressOf, ranking } from '../../src/game/track';

describe('race track', () => {
  it('every point on the centre line is on the track, and the lap length adds up', () => {
    for (let s = 0; s < LAP; s += 0.7) { const p = pointAt(s); expect(cellKind(p.x, p.z), `s ${s.toFixed(1)}`).toBe('track'); }
    // the lap closes up: the end of the lap is the start line again, facing the same way
    const a = pointAt(0), b = pointAt(LAP - 1e-9);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(1e-6);
    expect(Math.cos(a.yaw - b.yaw)).toBeGreaterThan(0.9999);
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
  it('lays two small groups of coins on the track, away from the start line', () => {
    for (const lap of [1, 2]) {
      const c = coinPlan(lap);
      const groups = new Set(c.map(x => x.group));
      expect(groups.size).toBe(2);
      for (const g of groups) { const n = c.filter(x => x.group === g).length; expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(3); }
      for (const x of c) { const p = pointAt(x.s, x.lane); expect(cellKind(p.x, p.z)).toBe('track'); expect(x.s).toBeGreaterThan(10); expect(x.s).toBeLessThan(LAP - 10); }
      expect(c.length).toBeLessThanOrEqual(6);
    }
  });
  it('the coins are added up out loud: “3 plus 2 makes 5”', () => {
    expect(addLine(0, 1).show).toBe('🪙 1');
    expect(addLine(0, 1).say[1]).toBe('One coin!');
    expect(addLine(3, 2).show).toBe('🪙 3 + 2 = 5');
    // short, so it's finished before the next thing on the track
    expect(addLine(3, 2).say[1]).toBe('3 plus 2 makes 5!');
    expect(addLine(1, 1).say[0]).toBe('1 tambah 1 sama dengan 2!');
  });
  it('has boost pads on straights', () => {
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
  it('each track keeps the ground it was built on (so nothing else in a saved world moves)', () => {
    expect([TRACKS.main.half, TRACKS.main.R, TRACKS.main.W]).toEqual([26, 14, 9]);
    expect([TRACKS.snow.half, TRACKS.snow.R, TRACKS.desert.half, TRACKS.desert.R]).toEqual([16, 15, 32, 11]);
  });
  for (const tk of Object.values(TRACKS)) {
    it(`${tk.kind}: a real circuit — it closes up, stays on its ground and off the grandstand, and its parts never touch`, () => {
      const OUT = Math.ceil(tk.R + tk.W / 2 + 2), X = tk.half + OUT + 3, Z1 = OUT + 3, stand = -OUT - 2;
      const a = tk.pointAt(0), b = tk.pointAt(tk.LAP - 1e-9);
      expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(1e-6);
      expect([a.x, a.z]).toEqual([0, tk.R]); // (the start line, under the gantry)
      let closest = Infinity, turned = 0, prev = a.yaw;
      for (let s = 0; s < tk.LAP; s += 0.5) {
        const p = tk.pointAt(s);
        // the tyre wall (6.5 m out) stays on the track's ground and in front of the grandstand
        expect(Math.abs(p.x) + 7, `${tk.kind} s ${s}`).toBeLessThanOrEqual(X);
        expect(p.z + 7).toBeLessThanOrEqual(Z1);
        if (Math.abs(p.x) <= 22) expect(p.z - tk.W / 2 - 2).toBeGreaterThan(stand);
        // other parts of the lap are far enough away that their kerbs and walls never meet
        for (let u = s + 35; u < s + tk.LAP - 35; u += 1) { const q = tk.pointAt(u); closest = Math.min(closest, Math.hypot(p.x - q.x, p.z - q.z)); }
        let d = p.yaw - prev; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; turned += d; prev = p.yaw;
      }
      expect(closest, tk.kind).toBeGreaterThan(tk.W + 6);
      expect(Math.abs(turned)).toBeCloseTo(2 * Math.PI, 1); // (once round)
      expect(tk.cellKind(0, 0)).toBe('in');
    });
    it(`${tk.kind}: not an oval — bends of different sizes, and some turn the other way`, () => {
      const curv: number[] = [];
      for (let s = 0; s < tk.LAP; s += 1) { let d = tk.pointAt(s + 1).yaw - tk.pointAt(s).yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; curv.push(d); }
      expect(curv.some(c => c > 0.02)).toBe(true);   // a left-hander (a kink, a flick or a chicane)
      const radii = new Set(curv.filter(c => c < -0.02).map(c => Math.round(1 / -c)));
      expect(radii.size, tk.kind).toBeGreaterThanOrEqual(3);
      expect(Math.min(...[...radii]), tk.kind).toBeGreaterThanOrEqual(8); // (no bend too tight to steer round)
    });
  }
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

import { letterSet, letterSpots, LAPS_FOR } from '../../src/game/track';
describe('hijaiyah letters on the track', () => {
  it('goes through the alphabet four letters a race, then starts again from alif', () => {
    expect(letterSet(0)).toEqual([0, 1, 2, 3]);   // ا ب ت ث
    expect(letterSet(1)).toEqual([4, 5, 6, 7]);   // ج ح خ د
    expect(letterSet(6)).toEqual([24, 25, 26, 27]); // … ي
    expect(letterSet(7)).toEqual([0, 1, 2, 3]);   // round again
    // every letter comes once in the seven races of a round
    expect(new Set([0, 1, 2, 3, 4, 5, 6].flatMap(k => letterSet(k))).size).toBe(28);
  });
  it('in the free part it loops through the first seven letters', () => {
    const seen = [0, 1, 2, 3, 4, 5, 6].flatMap(k => letterSet(k, 7));
    expect(Math.max(...seen)).toBe(6);
    expect(letterSet(1, 7)).toEqual([4, 5, 6, 0]);
  });
  it('each of the four letters once a lap, well apart, near the middle of the track and off the boxes, ramp, ice, sand and start line', () => {
    for (const tk of Object.values(TRACKS)) for (let lap = 1; lap <= LAPS_FOR[tk.kind]; lap++) {
      const spots = letterSpots(tk, lap);
      expect(spots.map(p => p.slot)).toEqual([0, 1, 2, 3]);
      for (const [i, p] of spots.entries()) {
        const q = tk.pointAt(p.s, p.lane); expect(tk.cellKind(q.x, q.z)).toBe('track');
        expect(Math.abs(p.lane)).toBeLessThanOrEqual(2);
        expect(tk.boxRows.every(b => Math.abs(b - p.s) >= 5)).toBe(true);
        expect(tk.onRamp(p.s, 0)).toBe(false);
        expect(tk.patchAt(p.s, p.lane)).toBeNull();
        expect(p.s).toBeGreaterThan(9);
        if (i) expect(p.s - spots[i - 1].s, tk.kind).toBeGreaterThan(tk.LAP / 8);
      }
    }
  });
  it('one thing at a time: letters, coin groups and box rows are spread round the lap', () => {
    for (const tk of Object.values(TRACKS)) {
      const at = [...tk.boxRows, ...letterSpots(tk, 1).map(p => p.s), ...[...new Set(tk.coinPlan(1).map(c => c.group))].map(g => tk.coinPlan(1).find(c => c.group === g)!.s)].sort((a, b) => a - b);
      expect(at.length).toBe(8);
      for (let i = 1; i < at.length; i++) expect(at[i] - at[i - 1], tk.kind).toBeGreaterThanOrEqual(8);
    }
  });
  it('races are short and sweet: a few laps, under a minute', () => {
    for (const tk of Object.values(TRACKS)) {
      const metres = LAPS_FOR[tk.kind] * tk.LAP;
      expect(LAPS_FOR[tk.kind]).toBeLessThanOrEqual(4);
      expect(metres, tk.kind).toBeGreaterThan(550); expect(metres, tk.kind).toBeLessThan(750);
    }
  });
});
