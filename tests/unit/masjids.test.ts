import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Generator } from '../../src/world/gen';
import { B } from '../../src/world/blocks';
import { VILLAGE_SITE, grandSite, nearestSite, congregationLayout } from '../../src/game/masjids';

const SEEDS = [1, 42, 777];
const stampAt = (g: Generator) => { const m = new Map<string, number>(); for (const list of g.stamps.values()) for (const [x, y, z, id] of list) m.set(`${x},${y},${z}`, id); return m; };

describe('the Grand Masjid', () => {
  it('every world has one, near the village', () => {
    for (const seed of SEEDS) {
      const l = new Generator(seed).landmarks.find(l => l.id === 'grand_masjid')!;
      expect(l, `seed ${seed}`).toBeTruthy();
      expect(Math.hypot(l.x, l.z)).toBeLessThan(200);
      expect(grandSite(l)).toBeTruthy();
    }
  });
  it('the women’s hall is behind the men’s, with a partition all across between them', () => {
    const g = new Generator(42), l = g.landmarks.find(l => l.id === 'grand_masjid')!, m = stampAt(g);
    const men = l.at!.men, women = l.at!.women;
    expect(women[2]).toBeGreaterThan(men[2]);
    const fy = Math.round(men[1]), pz = l.z - 1;
    for (let x = l.x - 10; x <= l.x + 10; x++) {
      expect(m.get(`${x},${fy},${pz}`), `screen at x ${x}`).toBe(B.PLANKS);
      expect(m.get(`${x},${fy + 2},${pz}`), `curtain at x ${x}`).toBe(B.WOOL_WHITE);
    }
  });
  it('boys and girls each have their own door and place in the row', () => {
    const l = new Generator(42).landmarks.find(l => l.id === 'grand_masjid')!, s = grandSite(l)!;
    expect(s.door(false).distanceTo(s.door(true))).toBeGreaterThan(8);
    expect(s.row(false).player.z).toBeLessThan(s.row(true).player.z);
    expect(s.inside(s.row(false).player)).toBe(true);
    expect(s.inside(s.row(true).player)).toBe(true);
    expect(s.inside(s.door(false))).toBe(false);
  });
  it('fills with men in front and women behind, leaving your place and Baby Mo’s free', () => {
    const l = new Generator(42).landmarks.find(l => l.id === 'grand_masjid')!, s = grandSite(l)!, imam = new THREE.Vector3(...l.at!.imam);
    for (const girl of [false, true]) {
      const people = congregationLayout(s, imam, girl, false), you = s.row(girl);
      expect(people.length).toBeGreaterThan(30);
      expect(people.filter(p => p.imam).length).toBe(1);
      for (const p of people) {
        expect(p.pos.distanceTo(you.player)).toBeGreaterThan(0.5);
        expect(p.pos.distanceTo(you.mo)).toBeGreaterThan(0.5);
        if (!p.imam) expect(p.woman ? p.pos.z > l.z : p.pos.z < l.z - 1).toBe(true);
      }
    }
    expect(congregationLayout(s, imam, false, true).length).toBeLessThan(25); // fewer on low graphics
  });
  it('the arrow picks the nearest masjid', () => {
    const l = new Generator(42).landmarks.find(l => l.id === 'grand_masjid')!, s = grandSite(l)!;
    expect(nearestSite([VILLAGE_SITE, s], new THREE.Vector3(0, 50, 0)).id).toBe('village');
    expect(nearestSite([VILLAGE_SITE, s], new THREE.Vector3(l.x, 50, l.z)).id).toBe('grand');
  });
});
