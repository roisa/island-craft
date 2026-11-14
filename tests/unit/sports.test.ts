import { describe, it, expect } from 'vitest';
import { greenZone, shotResult, sweep, SPOTS, THREE_PT, kickResult, aimSweep } from '../../src/game/sports';
import { courseAt, LAP_LEN, JUMPS, COURSE, jumpHeight, clears, JUMP_T } from '../../src/game/horses';
import { skateStep, bounce, MAX } from '../../src/game/skating';
import { Generator } from '../../src/world/gen';
import { B } from '../../src/world/blocks';

describe('basketball', () => {
  it('the green part of the bar gets smaller further from the hoop', () => {
    const near = greenZone(SPOTS[0][1]), far = greenZone(SPOTS[SPOTS.length - 1][1]);
    expect(near[1] - near[0]).toBeGreaterThan(far[1] - far[0]);
    expect(far[1] - far[0]).toBeGreaterThanOrEqual(0.12);
  });
  it('in the green it goes in; just outside it rolls off the rim; further out it is short or long', () => {
    const z: [number, number] = [0.4, 0.6];
    expect(shotResult(0.5, z)).toBe('in');
    expect(shotResult(0.37, z)).toBe('rim');
    expect(shotResult(0.1, z)).toBe('short');
    expect(shotResult(0.95, z)).toBe('long');
  });
  it('the marker sweeps back and forth between 0 and 1', () => {
    for (let t = 0; t < 10; t += 0.07) { const s = sweep(t); expect(s).toBeGreaterThanOrEqual(0); expect(s).toBeLessThanOrEqual(1); }
  });
  it('the last spot is a three-pointer', () => { expect(SPOTS[SPOTS.length - 1][1]).toBeGreaterThanOrEqual(THREE_PT); });
});

describe('penalties', () => {
  it('a goal where Baby Mo isn’t, saved where he is, wide past the post', () => {
    expect(kickResult(0.8, -0.6)).toBe('goal');
    expect(kickResult(0.5, 0.6)).toBe('saved');
    expect(kickResult(1.0, 0)).toBe('wide');
  });
  it('your aim slides across the whole goal and a little past the posts', () => {
    let lo = 1, hi = -1; for (let t = 0; t < 4; t += 0.01) { const a = aimSweep(t); lo = Math.min(lo, a); hi = Math.max(hi, a); }
    expect(lo).toBeLessThan(-0.95); expect(hi).toBeGreaterThan(0.95);
  });
});

describe('the horse course', () => {
  it('goes smoothly round a closed lap', () => {
    let prev = courseAt(0);
    for (let s = 0.25; s <= LAP_LEN; s += 0.25) { const p = courseAt(s); expect(Math.hypot(p.x - prev.x, p.z - prev.z)).toBeLessThan(0.3); prev = p; }
    const a = courseAt(0), b = courseAt(LAP_LEN - 0.001); expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(0.05);
  });
  it('has six jumps, all on the straights', () => {
    expect(JUMPS.length).toBe(6);
    for (const s of JUMPS) { const p = courseAt(s); const onStraight = Math.abs(Math.abs(p.x) - COURSE.hx) < 0.01 || Math.abs(Math.abs(p.z) - COURSE.hz) < 0.01; expect(onStraight, `jump at ${s.toFixed(1)}`).toBe(true); }
  });
  it('a jump is high enough in the middle, not at the start or end', () => {
    expect(clears(jumpHeight(JUMP_T / 2))).toBe(true);
    expect(clears(jumpHeight(0.02))).toBe(false);
    expect(clears(jumpHeight(0))).toBe(false);
  });
});

describe('ice skating', () => {
  it('pushing speeds you up; letting go you keep gliding and slow down only a little', () => {
    const v = { x: 0, z: 0 };
    for (let i = 0; i < 30; i++) skateStep(v, { x: 0, z: -1 }, 0.05);
    const s1 = Math.hypot(v.x, v.z); expect(s1).toBeGreaterThan(5);
    for (let i = 0; i < 20; i++) skateStep(v, { x: 0, z: 0 }, 0.05);
    expect(Math.hypot(v.x, v.z)).toBeGreaterThan(s1 * 0.6);
    for (let i = 0; i < 200; i++) skateStep(v, { x: 0, z: -1 }, 0.05);
    expect(Math.hypot(v.x, v.z)).toBeLessThanOrEqual(MAX + 1e-9);
  });
  it('bounces gently back off the boards', () => {
    const pos = { x: 11, z: 0 }, v = { x: 4, z: 0 };
    expect(bounce(pos, v, { x0: -9, x1: 9, z0: -6, z1: 6 })).toBe(true);
    expect(pos.x).toBe(9); expect(v.x).toBe(-2);
  });
});

describe('the new places', () => {
  it('every world has the archery range, the sports park, the horse farm and the ice rink, built', () => {
    for (const seed of [1, 42, 777]) {
      const g = new Generator(seed), m = new Map<string, number>();
      for (const list of g.stamps.values()) for (const [x, y, z, id] of list) m.set(`${x},${y},${z}`, id);
      for (const id of ['archery', 'sports', 'horse_farm', 'ice_rink']) expect(g.landmarks.find(l => l.id === id), `${id} seed ${seed}`).toBeTruthy();
      const ir = g.landmarks.find(l => l.id === 'ice_rink')!, [rx, ry, rz] = ir.at!.rink.map(Math.floor);
      expect(m.get(`${rx},${ry - 1},${rz}`), `ice seed ${seed}`).toBe(B.ICE);
      const sp = g.landmarks.find(l => l.id === 'sports')!, [hx, , hz] = sp.at!.hoop.map(Math.floor);
      expect([...m.entries()].some(([k, id]) => id === B.GLASS && k.startsWith(`${hx},`) && k.endsWith(`,${hz - 1}`)), `backboard seed ${seed}`).toBe(true);
    }
  });
});
