import { describe, it, expect } from 'vitest';
import { Generator, SEA } from '../../src/world/gen';
import { B, BLOCKS } from '../../src/world/blocks';
import { moonAge, moonPhase, phaseIndex, moonLit, SYNODIC, CONSTELLATIONS } from '../../src/game/moon';
import { eidOpen } from '../../src/game/eid';

/** the stamped blocks of a world, last one wins (as in the generator) */
function stamped(g: Generator) {
  const m = new Map<string, number>();
  for (const list of g.stamps.values()) for (const [x, y, z, id] of list) m.set(`${x},${y},${z}`, id);
  return (x: number, y: number, z: number) => m.get(`${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`);
}

describe('new places', () => {
  for (const seed of [1, 42, 777]) {
    const g = new Generator(seed), at = stamped(g);
    const lm = (id: string) => g.landmarks.find(l => l.id === id)!;

    it(`waterfall (seed ${seed}): water falls from the cliff into a pool, with a cave behind it`, () => {
      const l = lm('waterfall'); expect(l).toBeTruthy();
      const [fx, fy, fz] = l.at!.foot;
      // a column of water above the pool, in front of the cliff
      let fall = 0; for (let y = fy; y < fy + 12; y++) if (at(fx - 1, y, fz - 1) === B.WATER) fall++;
      expect(fall).toBeGreaterThanOrEqual(10);
      // the cave: an air room with a chest, reached through the water
      const cave = l.spots!.find(s => s.id === 'waterfall_cave')!;
      expect(at(cave.x, cave.y, cave.z)).toBe(B.AIR);
      expect(at(cave.x, cave.y - 1, cave.z)).toBe(B.STONE);
      expect(at(l.x, cave.y, l.z - 4)).toBe(B.AIR); // the doorway behind the falling water
      expect(at(l.x, cave.y, l.z - 9)).toBe(B.CHEST);
      expect(l.loot?.length).toBeGreaterThan(0);
    });

    it(`reef (seed ${seed}): coral, sea plants and clams under the sea, and an air pocket in the pearl cave`, () => {
      const l = lm('reef');
      const [cx, cy, cz] = l.at!.reef;
      const counts: Record<number, number> = {};
      for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) for (let y = SEA - 8; y <= SEA; y++) { const id = at(cx + dx, y, cz + dz); if (id !== undefined) counts[id] = (counts[id] || 0) + 1; }
      expect((counts[B.CORAL_PINK] || 0) + (counts[B.CORAL_ORANGE] || 0) + (counts[B.CORAL_PURPLE] || 0)).toBeGreaterThan(8);
      expect((counts[B.SEA_GRASS] || 0) + (counts[B.CORAL_FAN] || 0)).toBeGreaterThan(10);
      expect(counts[B.CLAM] || 0).toBeGreaterThan(1);
      expect(counts[B.WATER] || 0).toBeGreaterThan(200);
      expect(cy).toBeLessThan(SEA);
      // sea plants sit on the floor with water above them
      const cave = l.spots!.find(s => s.id === 'pearl_cave')!;
      expect(at(cave.x, cave.y, cave.z)).toBe(B.AIR);       // you can breathe here
      expect(at(cave.x, cave.y - 1, cave.z)).toBe(B.WATER); // you come up out of the water
      expect(at(cave.x, cave.y + 2, cave.z)).not.toBe(B.WATER); // and it has a roof
      expect(at(cave.x, cave.y + 2, cave.z)).not.toBe(B.AIR);
    });

    it(`stargazing hill (seed ${seed}): a telescope on top`, () => {
      const l = lm('stargaze');
      const [x, y, z] = l.at!.scope;
      expect(at(x, y, z)).toBe(B.TELESCOPE);
      expect(at(x, y - 1, z)).toBe(B.MOSAIC);
      expect(at(x, y + 1, z)).toBe(B.AIR);
    });
  }

  it('sea plants keep the water whole and cannot be walked on', () => {
    for (const id of [B.SEA_GRASS, B.CORAL_FAN]) { expect(BLOCKS[id]!.aquatic).toBe(true); expect(BLOCKS[id]!.solid).toBe(false); }
    expect(BLOCKS[B.TELESCOPE]!.hardness).toBe(Infinity);
    // clams give a pearl about half the time
    const drops = Array.from({ length: 100 }, (_, i) => BLOCKS[B.CLAM]!.drops!(i / 100)[0][0]);
    expect(drops.filter(d => d !== B.SAND).length).toBeGreaterThan(30);
  });
});

describe('the moon', () => {
  const near = (a: number, b: number, tol: number) => Math.min(Math.abs(a - b), SYNODIC - Math.abs(a - b)) <= tol;
  it('is new and full on the right days (within a day)', () => {
    for (const d of ['2023-08-16T09:38:00Z', '2024-01-11T11:57:00Z', '2025-03-29T10:58:00Z']) expect(near(moonAge(new Date(d)), 0, 1), d).toBe(true);
    for (const d of ['2023-08-31T01:35:00Z', '2024-01-25T17:54:00Z']) expect(near(moonAge(new Date(d)), SYNODIC / 2, 1), d).toBe(true);
    expect(phaseIndex(moonPhase(new Date('2024-01-25T17:54:00Z')))).toBe(4);
    expect(moonLit(new Date('2024-01-25T17:54:00Z'))).toBeGreaterThan(0.97);
    expect(moonLit(new Date('2024-01-11T11:57:00Z'))).toBeLessThan(0.03);
  });
  it('star pictures: every path uses real stars and starts at the first one', () => {
    for (const c of CONSTELLATIONS) {
      expect(c.path.length).toBeGreaterThanOrEqual(3);
      for (const i of c.path) expect(c.stars[i], c.id).toBeTruthy();
      expect(c.fact[0] && c.fact[1]).toBeTruthy();
    }
  });
});

describe('Eid bazaar opening', () => {
  it('opens on the real days of Eid and the last days of Ramadhan', () => {
    expect(eidOpen('auto', new Date('2025-03-30T12:00:00Z'), 1)).toBe(true);  // 1 Syawal 1446
    expect(eidOpen('auto', new Date('2025-03-28T12:00:00Z'), 1)).toBe(true);  // 28 Ramadhan
    expect(eidOpen('auto', new Date('2025-03-10T12:00:00Z'), 30)).toBe(false); // mid-Ramadhan waits for the end
  });
  it('outside Ramadhan, opens when the game calendar reaches day 28', () => {
    const d = new Date('2025-06-01T12:00:00Z');
    expect(eidOpen('auto', d, 5)).toBe(false);
    expect(eidOpen('auto', d, 28)).toBe(true);
    expect(eidOpen(undefined, d, 28)).toBe(true);
  });
  it('a parent can open it now or close it', () => {
    const d = new Date('2025-06-01T12:00:00Z');
    expect(eidOpen('on', d, 1)).toBe(true);
    expect(eidOpen('off', new Date('2025-03-30T12:00:00Z'), 30)).toBe(false);
  });
});

describe('volcano island', () => {
  for (const seed of [1, 42, 777]) it(`seed ${seed}: a cone with a warm crater, a path up, springs and a chest`, () => {
    const g = new Generator(seed), at = stamped(g), l = g.landmarks.find(l => l.id === 'volcano')!;
    const c = l.spots![0];
    expect(at(c.x, c.y - 1, c.z)).toBe(B.MAGMA);
    expect(at(c.x, c.y, c.z)).toBe(B.AIR);
    // the stone path climbs one block at a time
    let last = -1;
    for (let dz = 12; dz >= 4; dz--) {
      let y = 120; while (y > 0 && at(l.x, y, l.z + dz) !== B.COBBLE) y--;
      expect(y, `path at ${dz}`).toBeGreaterThan(0);
      if (last >= 0) expect(y - last).toBeLessThanOrEqual(1);
      last = y;
    }
    for (const k of ['spring1', 'spring2']) { const [x, y, z] = l.at![k]; expect(at(x - 1, y - 1, z - 1)).toBe(B.WATER); }
    let chests = 0; for (const list of g.stamps.values()) for (const [x, , z, id] of list) if (id === B.CHEST && Math.hypot(x - l.x, z - l.z) < 8) chests++;
    expect(chests).toBe(1);
  });
});
