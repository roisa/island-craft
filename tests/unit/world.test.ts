import { describe, it, expect } from 'vitest';
import { Generator, CS, H, SEA, VILLAGE_Y, idx, Biome } from '../../src/world/gen';
import { Simplex, mulberry32 } from '../../src/world/noise';
import { B, LETTERS, BLOCKS, isBlockId } from '../../src/world/blocks';

const chunk = (g: Generator, cx: number, cz: number) => { const d = new Uint8Array(CS * CS * H); const biome = g.generate(cx, cz, d); return { d, biome }; };

describe('noise', () => {
  it('is deterministic for a seed', () => {
    const a = new Simplex(42), b = new Simplex(42), c = new Simplex(43);
    expect(a.noise2(1.3, 2.7)).toBe(b.noise2(1.3, 2.7));
    expect(a.noise2(1.3, 2.7)).not.toBe(c.noise2(1.3, 2.7));
    const r1 = mulberry32(7), r2 = mulberry32(7);
    for (let i = 0; i < 5; i++) expect(r1()).toBe(r2());
  });
});

describe('world generation', () => {
  it('produces identical chunks from the same seed', () => {
    const g1 = new Generator(1234), g2 = new Generator(1234);
    for (const [cx, cz] of [[0, 0], [3, -2], [-9, 14]]) expect(chunk(g1, cx, cz).d).toEqual(chunk(g2, cx, cz).d);
  });
  it('produces different worlds from different seeds (away from the village)', () => {
    expect(chunk(new Generator(1), 20, 20).d).not.toEqual(chunk(new Generator(2), 20, 20).d);
  });
  it('has bedrock at the bottom and only known block ids', () => {
    const { d } = chunk(new Generator(99), 5, 5);
    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) expect(d[idx(x, 0, z)]).toBe(B.BEDROCK);
    for (const id of new Set(d)) if (id) expect(isBlockId(id), `unknown block ${id}`).toBe(true);
  });
  it('builds a flat village with a masjid around the spawn for any seed', () => {
    for (const seed of [1, 777, 123456789]) {
      const g = new Generator(seed);
      expect(g.column(0, 0).biome).toBe(Biome.VILLAGE);
      expect(Math.abs(g.column(0, 0).h - VILLAGE_Y)).toBeLessThanOrEqual(1);
      expect(g.stamps.size).toBeGreaterThan(0);
    }
  });
  it('places all 28 letter shrines, the first four inside the village', () => {
    const g = new Generator(555);
    expect(g.shrines.length).toBe(LETTERS.length);
    expect(new Set(g.shrines.map(s => s.letter)).size).toBe(28);
    for (const s of g.shrines.slice(0, 4)) expect(Math.hypot(s.x, s.z)).toBeLessThan(34);
    for (const s of g.shrines) { expect(s.y).toBeGreaterThan(0); expect(s.y).toBeLessThan(H); }
  });
  it('keeps sea level and height constants sane', () => {
    expect(SEA).toBeLessThan(VILLAGE_Y);
    expect(VILLAGE_Y).toBeLessThan(H);
    expect(BLOCKS[B.WATER]).toBeTruthy();
  });
});
