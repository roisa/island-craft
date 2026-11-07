// Inventory (9 hotbar + 27 backpack slots) and kid-friendly recipe crafting:
// no grid puzzles — pick a recipe, and if you have the ingredients it's made.
import { B, I, BLOCKS, ITEMS, maxStack, isBlockId, LETTERS } from '../world/blocks';
import type { T2 } from '../i18n';

export interface Slot { id: number; n: number }
export const SLOTS = 36;

export class Inventory {
  slots: (Slot | null)[] = new Array(SLOTS).fill(null);
  sel = 0;
  creative = false;
  onChange: (() => void) | null = null;

  held(): Slot | null { return this.slots[this.sel]; }
  count(id: number) { return this.creative ? 999 : this.slots.reduce((a, s) => a + (s && s.id === id ? s.n : 0), 0); }

  add(id: number, n = 1): number {
    const max = maxStack(id);
    for (const s of this.slots) if (s && s.id === id && s.n < max) { const k = Math.min(n, max - s.n); s.n += k; n -= k; if (!n) break; }
    for (let i = 0; i < SLOTS && n > 0; i++) if (!this.slots[i]) { const k = Math.min(n, max); this.slots[i] = { id, n: k }; n -= k; }
    this.onChange?.();
    return n; // leftover
  }
  remove(id: number, n = 1): boolean {
    if (this.creative) return true;
    if (this.count(id) < n) return false;
    for (let i = SLOTS - 1; i >= 0 && n > 0; i--) {
      const s = this.slots[i];
      if (s && s.id === id) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (!s.n) this.slots[i] = null; }
    }
    this.onChange?.();
    return true;
  }
  /** consume one of the held item */
  useHeld() {
    if (this.creative) return;
    const s = this.slots[this.sel]; if (!s) return;
    s.n--; if (s.n <= 0) this.slots[this.sel] = null;
    this.onChange?.();
  }
  swap(a: number, b: number) {
    const t = this.slots[a]; this.slots[a] = this.slots[b]; this.slots[b] = t;
    // merge equal stacks
    const A = this.slots[a], Bs = this.slots[b];
    if (A && Bs && A.id === Bs.id && a !== b) { const max = maxStack(A.id); const k = Math.min(A.n, max - Bs.n); Bs.n += k; A.n -= k; if (!A.n) this.slots[a] = null; }
    this.onChange?.();
  }
  toolSpeed(kind: string | undefined, tier = 0): { speed: number; tier: number } {
    const s = this.held();
    const it = s ? ITEMS.get(s.id) : undefined;
    if (it?.tool && it.tool.kind === kind) return { speed: it.tool.speed, tier: it.tool.tier };
    return { speed: 1, tier };
  }
  bestPickTier() {
    let t = 0;
    for (const s of this.slots) { const it = s ? ITEMS.get(s.id) : undefined; if (it?.tool?.kind === 'pick') t = Math.max(t, it.tool.tier); }
    return t;
  }
  toJSON() { return { slots: this.slots, sel: this.sel }; }
  load(d: { slots?: (Slot | null)[]; sel?: number }) {
    if (d.slots) this.slots = d.slots.map(s => (s && (isBlockId(s.id) || ITEMS.has(s.id)) ? s : null)).concat(new Array(SLOTS).fill(null)).slice(0, SLOTS);
    if (typeof d.sel === 'number') this.sel = d.sel;
    this.onChange?.();
  }
}

export type Station = 'workbench' | 'furnace' | null;
export interface Recipe { out: number; n: number; ins: [number, number][]; at: Station; tag?: string }

const anyLog: [number, number][] = [[B.OAK_LOG, 1]];
export const RECIPES: Recipe[] = [
  // toy swords, the fishing rod and cooking (cooking at the furnace plays a little timing game)
  { out: I.WOOD_SWORD, n: 1, ins: [[B.PLANKS, 2], [I.STICK, 1]], at: 'workbench', tag: 'tool' },
  { out: I.STONE_SWORD, n: 1, ins: [[B.COBBLE, 2], [I.STICK, 1]], at: 'workbench', tag: 'tool' },
  { out: I.IRON_SWORD, n: 1, ins: [[I.IRON_INGOT, 2], [I.STICK, 1]], at: 'workbench', tag: 'tool' },
  { out: I.FISHING_ROD, n: 1, ins: [[I.STICK, 3], [B.WOOL_WHITE, 1]], at: 'workbench', tag: 'tool' },
  { out: I.GRILLED_FISH, n: 1, ins: [[I.SMALL_FISH, 1]], at: 'furnace', tag: 'cook' },
  { out: I.GRILLED_FISH, n: 2, ins: [[I.BIG_FISH, 1]], at: 'furnace', tag: 'cook' },
  { out: I.FRIED_EGG, n: 1, ins: [[I.EGG, 1]], at: 'furnace', tag: 'cook' },
  { out: I.STEAK, n: 1, ins: [[I.MEAT, 1]], at: 'furnace', tag: 'cook' },
  // furniture & decorations, made at the workbench
  { out: I.TABLE, n: 1, ins: [[B.PLANKS, 4]], at: 'workbench', tag: 'deco' },
  { out: I.CHAIR, n: 1, ins: [[B.PLANKS, 2], [I.STICK, 2]], at: 'workbench', tag: 'deco' },
  { out: I.PRAYER_MAT, n: 1, ins: [[B.WOOL_GREEN, 2], [B.WOOL_YELLOW, 1]], at: 'workbench', tag: 'deco' },
  { out: I.RUG, n: 1, ins: [[B.WOOL_RED, 3]], at: 'workbench', tag: 'deco' },
  { out: I.CUSHION, n: 2, ins: [[B.WOOL_RED, 1], [B.WOOL_WHITE, 1]], at: 'workbench', tag: 'deco' },
  { out: I.PLANT_POT, n: 1, ins: [[B.BRICK, 1], [B.FLOWER_RED, 1]], at: 'workbench', tag: 'deco' },
  { out: I.LAMP, n: 1, ins: [[B.LANTERN, 1], [I.STICK, 2]], at: 'workbench', tag: 'deco' },
  { out: I.DATES_BOWL, n: 1, ins: [[B.PLANKS, 1], [I.DATES, 3]], at: 'workbench', tag: 'deco' },
  { out: I.KETUPAT, n: 2, ins: [[B.PALM_SAPLING, 1]], at: 'workbench', tag: 'deco' },
  { out: I.BOOK_STAND, n: 1, ins: [[B.PLANKS, 2]], at: 'workbench', tag: 'deco' },
  { out: I.CRESCENT, n: 1, ins: [[B.GOLD_TILE, 1], [I.STICK, 1]], at: 'workbench', tag: 'deco' },
  { out: B.PLANKS, n: 4, ins: anyLog, at: null },
  { out: B.PLANKS, n: 4, ins: [[B.PINE_LOG, 1]], at: null },
  { out: B.PLANKS, n: 4, ins: [[B.PALM_LOG, 1]], at: null },
  { out: I.STICK, n: 4, ins: [[B.PLANKS, 2]], at: null },
  { out: B.WORKBENCH, n: 1, ins: [[B.PLANKS, 4]], at: null },
  { out: B.TORCH, n: 4, ins: [[I.COAL, 1], [I.STICK, 1]], at: null },
  { out: I.TAKJIL, n: 1, ins: [[I.DATES, 3], [I.MILK, 1]], at: null, tag: 'food' },
  { out: I.KOLAK, n: 1, ins: [[I.EGG, 1], [I.MILK, 1], [I.DATES, 1]], at: 'furnace', tag: 'food' },
  { out: I.WOOD_PICK, n: 1, ins: [[B.PLANKS, 3], [I.STICK, 2]], at: 'workbench' },
  { out: I.WOOD_AXE, n: 1, ins: [[B.PLANKS, 3], [I.STICK, 2]], at: 'workbench' },
  { out: I.WOOD_SHOVEL, n: 1, ins: [[B.PLANKS, 1], [I.STICK, 2]], at: 'workbench' },
  { out: I.STONE_PICK, n: 1, ins: [[B.COBBLE, 3], [I.STICK, 2]], at: 'workbench' },
  { out: I.STONE_AXE, n: 1, ins: [[B.COBBLE, 3], [I.STICK, 2]], at: 'workbench' },
  { out: I.STONE_SHOVEL, n: 1, ins: [[B.COBBLE, 1], [I.STICK, 2]], at: 'workbench' },
  { out: I.IRON_PICK, n: 1, ins: [[I.IRON_INGOT, 3], [I.STICK, 2]], at: 'workbench' },
  { out: I.IRON_AXE, n: 1, ins: [[I.IRON_INGOT, 3], [I.STICK, 2]], at: 'workbench' },
  { out: I.IRON_SHOVEL, n: 1, ins: [[I.IRON_INGOT, 1], [I.STICK, 2]], at: 'workbench' },
  { out: B.FURNACE, n: 1, ins: [[B.COBBLE, 8]], at: 'workbench' },
  { out: B.LANTERN, n: 2, ins: [[B.GLASS, 1], [B.TORCH, 1], [I.STICK, 2]], at: 'workbench', tag: 'deco' },
  { out: I.BOAT, n: 1, ins: [[B.PLANKS, 5]], at: 'workbench', tag: 'deco' },
  { out: B.BED, n: 1, ins: [[B.WOOL_WHITE, 3], [B.PLANKS, 3]], at: 'workbench', tag: 'deco' },
  { out: B.BOOKSHELF, n: 1, ins: [[B.PLANKS, 6]], at: 'workbench', tag: 'deco' },
  { out: B.SANDSTONE, n: 4, ins: [[B.SAND, 4]], at: 'workbench' },
  { out: B.MARBLE, n: 4, ins: [[B.STONE, 4]], at: 'workbench' },
  { out: B.MOSAIC, n: 4, ins: [[B.MARBLE, 2], [I.CRYSTAL, 1]], at: 'workbench', tag: 'deco' },
  { out: B.GOLD_TILE, n: 4, ins: [[I.GOLD_INGOT, 1], [B.MARBLE, 2]], at: 'workbench', tag: 'deco' },
  { out: B.GLASS, n: 1, ins: [[B.SAND, 1], [I.COAL, 1]], at: 'furnace' },
  { out: B.STONE, n: 2, ins: [[B.COBBLE, 2], [I.COAL, 1]], at: 'furnace' },
  { out: B.BRICK, n: 2, ins: [[B.CLAY, 2], [I.COAL, 1]], at: 'furnace' },
  { out: I.IRON_INGOT, n: 1, ins: [[B.IRON_ORE, 1], [I.COAL, 1]], at: 'furnace' },
  { out: I.GOLD_INGOT, n: 1, ins: [[B.GOLD_ORE, 1], [I.COAL, 1]], at: 'furnace' },
  { out: B.WOOL_RED, n: 1, ins: [[B.WOOL_WHITE, 1], [B.FLOWER_RED, 1]], at: null, tag: 'deco' },
  { out: B.WOOL_YELLOW, n: 1, ins: [[B.WOOL_WHITE, 1], [B.FLOWER_YELLOW, 1]], at: null, tag: 'deco' },
  { out: B.WOOL_BLUE, n: 1, ins: [[B.WOOL_WHITE, 1], [B.FLOWER_BLUE, 1]], at: null, tag: 'deco' },
  { out: B.WOOL_PURPLE, n: 1, ins: [[B.WOOL_WHITE, 1], [B.FLOWER_PURPLE, 1]], at: null, tag: 'deco' },
  { out: B.WOOL_GREEN, n: 1, ins: [[B.WOOL_WHITE, 1], [B.OAK_LEAVES, 1]], at: null, tag: 'deco' },
];

export const STATION_NAME: Record<'workbench' | 'furnace', T2> = { workbench: ['Meja Kerja', 'Workbench'], furnace: ['Tungku', 'Furnace'] };

export function canCraft(inv: Inventory, r: Recipe, stations: Set<Station>) {
  if (r.at && !stations.has(r.at) && !inv.creative) return false;
  return r.ins.every(([id, n]) => inv.count(id) >= n);
}
export function craft(inv: Inventory, r: Recipe, stations: Set<Station>) {
  if (!canCraft(inv, r, stations)) return false;
  for (const [id, n] of r.ins) inv.remove(id, n);
  inv.add(r.out, r.n);
  return true;
}

/** Everything a creative-mode builder can pick from. */
export function creativeCatalog(): number[] {
  const ids: number[] = [];
  for (const b of BLOCKS) if (b && b.id !== B.WATER && b.id !== B.BEDROCK && b.id !== B.CHEST && b.id !== B.BEDUG && b.letter === undefined) ids.push(b.id);
  for (let i = 0; i < LETTERS.length; i++) ids.push(B.LETTER_0 + i);
  for (const id of ITEMS.keys()) ids.push(id);
  return ids;
}
