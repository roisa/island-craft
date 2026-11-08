import { describe, it, expect } from 'vitest';
import { Generator, H } from '../../src/world/gen';
import { landmarkIds } from '../../src/world/landmarks';
import { B } from '../../src/world/blocks';

const SEEDS = [1, 42, 777, 123456789, 99999];

describe('landmarks', () => {
  it('every world gets all its landmarks, the same ones for the same seed', () => {
    for (const seed of SEEDS) {
      const a = new Generator(seed).landmarks, b = new Generator(seed).landmarks;
      expect(a.map(l => l.id).sort(), `seed ${seed}`).toEqual(landmarkIds().slice().sort());
      expect(a).toEqual(b);
    }
  });
  it('they stay out of the village and away from letter shrines and each other', () => {
    for (const seed of SEEDS) {
      const g = new Generator(seed);
      for (const l of g.landmarks) {
        // (the fishing pond is meant to be close, just past the village’s edge behind the masjid)
        expect(Math.hypot(l.x, l.z), `${seed} ${l.id}`).toBeGreaterThan(l.id === 'fish_pond' ? 40 : 55);
        for (const s of g.shrines) expect(Math.hypot(s.x - l.x, s.z - l.z), `${seed} ${l.id} vs letter ${s.letter}`).toBeGreaterThan(14);
        for (const o of g.landmarks) if (o !== l) expect(Math.hypot(o.x - l.x, o.z - l.z)).toBeGreaterThan(20);
        expect(l.y).toBeGreaterThan(1); expect(l.y).toBeLessThan(H);
      }
    }
  });
  it('each landmark hides a treasure chest nearby', () => {
    const g = new Generator(42);
    const chests: [number, number, number][] = [];
    for (const list of g.stamps.values()) for (const [x, y, z, id] of list) if (id === B.CHEST) chests.push([x, y, z]);
    for (const l of g.landmarks) expect(chests.some(([x, , z]) => Math.hypot(x - l.x, z - l.z) < 14), l.id).toBe(true);
  });
  it('has a hint and a fun fact in both languages', () => {
    for (const l of new Generator(5).landmarks) { expect(l.hint[0] && l.hint[1] && l.fact[0] && l.fact[1] && l.name[0] && l.name[1]).toBeTruthy(); }
  });
});

import positions from './fixtures/landmark-positions.json';
describe('old worlds keep their places', () => {
  it('adding new landmarks never moves the ones a saved world already has', () => {
    for (const [seed, list] of Object.entries(positions as Record<string, [string, number, number, number][]>)) {
      const now = new Generator(+seed).landmarks;
      for (const [id, x, y, z] of list) {
        const l = now.find(l => l.id === id);
        expect(l && [l.x + 0, l.y + 0, l.z + 0], `seed ${seed} ${id}`).toEqual([x, y, z]);
      }
    }
  });
});

describe('the fishing pond', () => {
  it('is close to the village, mostly on the masjid side, clear of the village’s buildings', () => {
    let north = 0;
    for (const seed of SEEDS) {
      const l = new Generator(seed).landmarks.find(l => l.id === 'fish_pond')!;
      expect(l, `seed ${seed}`).toBeTruthy();
      const d = Math.hypot(l.x, l.z);
      expect(d, `seed ${seed}`).toBeGreaterThan(40);
      expect(d, `seed ${seed}`).toBeLessThan(110);
      if (l.z < 0) north++;
      for (const k of ['spot', 'f1', 'f2', 'f3', 'pond']) expect(l.at?.[k], k).toBeTruthy();
    }
    expect(north).toBeGreaterThanOrEqual(3);
  });
  it('you stand on the pier with water right in front of you', () => {
    const g = new Generator(42), l = g.landmarks.find(l => l.id === 'fish_pond')!;
    const m = new Map<string, number>(); for (const list of g.stamps.values()) for (const [x, y, z, id] of list) m.set(`${x},${y},${z}`, id);
    const [sx, sy, sz] = l.at!.spot.map(Math.floor);
    expect(m.get(`${sx},${sy - 1},${sz}`)).toBe(B.PLANKS);
    for (let k = 1; k <= 3; k++) expect(m.get(`${sx},${sy - 1},${sz - k}`), `water ${k} ahead`).toBe(B.WATER);
  });
});
