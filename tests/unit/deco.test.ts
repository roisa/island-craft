import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { cleanDeco, faceToward, DECO_IDS, decoModel, Decor } from '../../src/game/deco';
import { ITEMS, isDeco } from '../../src/world/blocks';
import { RECIPES } from '../../src/game/inventory';

describe('furniture & decorations', () => {
  it('every decoration is an item, has a model and a workbench recipe', () => {
    expect(DECO_IDS.length).toBeGreaterThanOrEqual(10);
    for (const id of DECO_IDS) {
      expect(isDeco(id), `${id}`).toBe(true);
      expect(ITEMS.get(id)?.icon).toBeTruthy();
      expect(RECIPES.some(r => r.out === id && r.at === 'workbench'), `recipe ${id}`).toBe(true);
      const m = decoModel(id); expect(m.children.length).toBeGreaterThan(0);
      const box = new THREE.Box3().setFromObject(m);
      // fits in its cell
      expect(box.max.x - box.min.x).toBeLessThanOrEqual(1.01); expect(box.max.z - box.min.z).toBeLessThanOrEqual(1.01); expect(box.min.y).toBeGreaterThanOrEqual(-0.01);
    }
  });
  it('faces the front towards the player', () => {
    expect(faceToward(0, 0, 0.5, 5)).toBe(0);   // player south (+z)
    expect(faceToward(0, 0, 5, 0.5)).toBe(1);   // east (+x)
    expect(faceToward(0, 0, 0.5, -5)).toBe(2);  // north
    expect(faceToward(0, 0, -5, 0.5)).toBe(3);  // west
  });
  it('places, turns, finds by ray and removes', () => {
    const d = new Decor(new THREE.Scene());
    const a = d.place(DECO_IDS[0], 3, 46, 4, 0)!;
    expect(d.place(DECO_IDS[1], 3, 46, 4, 0)).toBeNull(); // one per cell
    d.turn(a); expect(a.rot).toBe(1);
    const hit = d.raycast(new THREE.Vector3(3.5, 47.5, 8), new THREE.Vector3(0, -0.45, -1).normalize(), 8);
    expect(hit?.d).toBe(a);
    expect(d.toJSON()).toEqual([[DECO_IDS[0], 3, 46, 4, 1]]);
    d.remove(a); expect(d.items.length).toBe(0);
  });
  it('cleans saved decorations', () => {
    expect(cleanDeco(undefined)).toEqual([]);
    expect(cleanDeco([[DECO_IDS[0], 1, 46, 2, 5], [9999, 1, 46, 3, 0], [DECO_IDS[1], 1, 46, 2, 0], 'x', [DECO_IDS[2], 1.5, 46, 2, 0]])).toEqual([[DECO_IDS[0], 1, 46, 2, 1]]);
  });
});
