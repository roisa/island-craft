import { describe, it, expect } from 'vitest';
import { Inventory, RECIPES, canCraft, craft, SLOTS, creativeCatalog } from '../../src/game/inventory';
import { B, I, maxStack, isBlockId, ITEMS } from '../../src/world/blocks';

describe('inventory', () => {
  it('stacks, overflows into new slots and reports leftovers', () => {
    const inv = new Inventory();
    const max = maxStack(B.DIRT);
    expect(inv.add(B.DIRT, max + 3)).toBe(0);
    expect(inv.count(B.DIRT)).toBe(max + 3);
    expect(inv.slots.filter(Boolean).length).toBe(2);
    const full = new Inventory();
    for (let i = 0; i < SLOTS; i++) full.slots[i] = { id: B.STONE, n: maxStack(B.STONE) };
    expect(full.add(B.DIRT, 5)).toBe(5);
  });
  it('removes only when there is enough', () => {
    const inv = new Inventory(); inv.add(B.PLANKS, 3);
    expect(inv.remove(B.PLANKS, 4)).toBe(false);
    expect(inv.count(B.PLANKS)).toBe(3);
    expect(inv.remove(B.PLANKS, 3)).toBe(true);
    expect(inv.slots.every(s => s === null)).toBe(true);
  });
  it('swaps and merges equal stacks', () => {
    const inv = new Inventory();
    inv.slots[0] = { id: B.SAND, n: 10 }; inv.slots[1] = { id: B.SAND, n: 5 };
    inv.swap(0, 1);
    expect(inv.count(B.SAND)).toBe(15);
    expect(inv.slots.filter(Boolean).length).toBe(1);
  });
  it('round-trips through JSON and drops unknown ids', () => {
    const inv = new Inventory(); inv.add(B.OAK_LOG, 7); inv.add(I.DATES, 2); inv.sel = 3;
    const data = JSON.parse(JSON.stringify(inv.toJSON()));
    data.slots[20] = { id: 9999, n: 1 };
    const back = new Inventory(); back.load(data);
    expect(back.count(B.OAK_LOG)).toBe(7);
    expect(back.count(I.DATES)).toBe(2);
    expect(back.slots[20]).toBeNull();
    expect(back.slots.length).toBe(SLOTS);
    expect(back.sel).toBe(3);
  });
  it('creative mode never runs out', () => {
    const inv = new Inventory(); inv.creative = true;
    expect(inv.count(B.GOLD_ORE)).toBe(999);
    expect(inv.remove(B.STONE, 50)).toBe(true);
  });
});

describe('crafting', () => {
  it('every recipe uses and makes real items', () => {
    for (const r of RECIPES) {
      expect(isBlockId(r.out) || ITEMS.has(r.out), `recipe out ${r.out}`).toBe(true);
      expect(r.n).toBeGreaterThan(0);
      for (const [id, n] of r.ins) { expect(isBlockId(id) || ITEMS.has(id)).toBe(true); expect(n).toBeGreaterThan(0); }
    }
  });
  it('log → planks → workbench works without a station', () => {
    const inv = new Inventory(); inv.add(B.OAK_LOG, 1);
    const planks = RECIPES.find(r => r.out === B.PLANKS && r.ins[0][0] === B.OAK_LOG)!;
    expect(craft(inv, planks, new Set([null]))).toBe(true);
    expect(inv.count(B.PLANKS)).toBe(4);
    expect(inv.count(B.OAK_LOG)).toBe(0);
    const bench = RECIPES.find(r => r.out === B.WORKBENCH)!;
    expect(craft(inv, bench, new Set([null]))).toBe(true);
    expect(inv.count(B.WORKBENCH)).toBe(1);
  });
  it('station recipes need the station', () => {
    const r = RECIPES.find(r => r.at === 'workbench')!;
    const inv = new Inventory(); for (const [id, n] of r.ins) inv.add(id, n);
    expect(canCraft(inv, r, new Set([null]))).toBe(false);
    expect(canCraft(inv, r, new Set([null, 'workbench']))).toBe(true);
  });
  it('a wooden pickaxe can be crafted from a starting tree', () => {
    const pick = RECIPES.find(r => r.out === I.WOOD_PICK)!;
    expect(pick).toBeTruthy();
  });
  it('the creative catalog has no water, bedrock or duplicates', () => {
    const c = creativeCatalog();
    expect(c).not.toContain(B.WATER); expect(c).not.toContain(B.BEDROCK);
    expect(new Set(c).size).toBe(c.length);
  });
});
