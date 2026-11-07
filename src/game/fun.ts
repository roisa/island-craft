// Extra fun for young players: a pet that follows you, outfits unlocked by
// levels, ready-made blueprints that build themselves, treasure chests,
// and rides on a boat or a camel.
import * as THREE from 'three';
import type { Game } from '../main';
import { tr, t2, type T2 } from '../i18n';
import { B, I, BLOCKS, nameOf } from '../world/blocks';
import { H, VILLAGE_Y } from '../world/gen';
import { Animal, groundY, waterSurface } from './entities';
import { nameTag, mat } from './models';
import { SFX, haptic } from './audio';
import { levelOf } from './kid';
import type { AnimalKind } from './models';

// ======================= outfits =======================
export type OutfitSlot = 'hat' | 'hijab' | 'cape' | 'shirt';
export interface OutfitItem { id: string; slot: OutfitSlot; name: T2; icon: string; level: number; color?: number }
export const OUTFITS: OutfitItem[] = [
  { id: 'peci', slot: 'hat', name: ['Peci Putih', 'White Peci'], icon: '🧢', level: 1, color: 0xf2f2f2 },
  { id: 'none', slot: 'hat', name: ['Tanpa Topi', 'No Hat'], icon: '🙂', level: 1 },
  { id: 'explorer', slot: 'hat', name: ['Topi Penjelajah', 'Explorer Hat'], icon: '🤠', level: 2 },
  { id: 'peci_gold', slot: 'hat', name: ['Peci Emas', 'Golden Peci'], icon: '👑', level: 3, color: 0xf1c232 },
  { id: 'turban', slot: 'hat', name: ['Sorban Hijau', 'Green Turban'], icon: '🟢', level: 6 },
  { id: 'h_teal', slot: 'hijab', name: ['Hijab Toska', 'Teal Hijab'], icon: '🟦', level: 1, color: 0x2aa198 },
  { id: 'h_pink', slot: 'hijab', name: ['Hijab Merah Muda', 'Pink Hijab'], icon: '🩷', level: 1, color: 0xf48aa3 },
  { id: 'h_purple', slot: 'hijab', name: ['Hijab Ungu', 'Purple Hijab'], icon: '🟪', level: 2, color: 0x9b59b6 },
  { id: 'h_gold', slot: 'hijab', name: ['Hijab Emas', 'Golden Hijab'], icon: '🟨', level: 3, color: 0xf1c232 },
  { id: 'h_green', slot: 'hijab', name: ['Hijab Hijau', 'Green Hijab'], icon: '🟩', level: 6, color: 0x3fa34d },
  { id: 's_pink', slot: 'shirt', name: ['Baju Merah Muda', 'Pink Shirt'], icon: '🩷', level: 1, color: 0xf28fa6 },
  { id: 's_blue', slot: 'shirt', name: ['Baju Biru', 'Blue Shirt'], icon: '💙', level: 1, color: 0x4a90e2 },
  { id: 's_teal', slot: 'shirt', name: ['Baju Toska', 'Teal Shirt'], icon: '👕', level: 1, color: 0x2e8e86 },
  { id: 's_red', slot: 'shirt', name: ['Baju Merah', 'Red Shirt'], icon: '❤️', level: 1, color: 0xe4423a },
  { id: 's_yellow', slot: 'shirt', name: ['Baju Kuning', 'Yellow Shirt'], icon: '💛', level: 2, color: 0xf4c430 },
  { id: 's_white', slot: 'shirt', name: ['Baju Koko Putih', 'White Koko Shirt'], icon: '🤍', level: 3, color: 0xf4f4f0 },
  { id: 's_green', slot: 'shirt', name: ['Baju Hijau Baby Mo', 'Baby Mo Green'], icon: '💚', level: 5, color: 0x55c94a },
  { id: 'c_none', slot: 'cape', name: ['Tanpa Jubah', 'No Cape'], icon: '➖', level: 1 },
  { id: 'c_hero', slot: 'cape', name: ['Jubah Pahlawan', 'Hero Cape'], icon: '🦸', level: 4, color: 0xe4423a },
  { id: 'c_star', slot: 'cape', name: ['Jubah Bintang', 'Star Cape'], icon: '🌟', level: 7, color: 0x6b4fc8 },
];
export interface Outfit { hat: string; hijab: string; cape: string; shirt: string }
export const defaultOutfit = (girl: boolean): Outfit => ({ hat: 'none', hijab: 'h_pink', cape: 'c_none', shirt: girl ? 's_pink' : 's_blue' });
export const outfitItem = (id: string) => OUTFITS.find(o => o.id === id);

/** hats & capes added on top of the avatar model */
export function dressUp(rig: { head: THREE.Object3D; body: THREE.Group; neck?: number }, o: Outfit, girl: boolean, hs: number) {
  const hat = !girl ? o.hat : 'none';
  const head = rig.head;
  if (hat === 'explorer') {
    const brown = mat(0x9a6a3a), band = mat(0x5e3e25);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(hs + 0.36, 0.05, hs + 0.36), brown); brim.position.y = hs + 0.03; head.add(brim);
    const top = new THREE.Mesh(new THREE.BoxGeometry(hs + 0.04, 0.22, hs + 0.04), brown); top.position.y = hs + 0.16; head.add(top);
    const b = new THREE.Mesh(new THREE.BoxGeometry(hs + 0.06, 0.06, hs + 0.06), band); b.position.y = hs + 0.08; head.add(b);
  } else if (hat === 'turban') {
    const g = mat(0x3fa34d), w = mat(0xf4f4f0);
    for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(hs + 0.1 - i * 0.12, 0.1, hs + 0.1 - i * 0.12), i % 2 ? w : g); r.position.y = hs + 0.03 + i * 0.09; head.add(r); }
  }
  const cape = outfitItem(o.cape);
  if (cape?.color !== undefined) {
    const c = new THREE.Group(); c.position.set(0, (rig.neck ?? 1.18) - 0.02, -0.3);
    const geo = new THREE.BoxGeometry(0.5, 0.78, 0.04); geo.translate(0, -0.39, 0);
    c.add(new THREE.Mesh(geo, mat(cape.color)));
    if (cape.id === 'c_star') for (const [x, y] of [[-0.12, -0.25], [0.1, -0.5], [-0.05, -0.65]]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), mat(0xffd874)); s.position.set(x, y, -0.03); c.add(s); }
    c.name = 'cape';
    rig.body.add(c);
  }
}

// ======================= blueprints =======================
type Cell = [number, number, number, number]; // dx, dy, dz, id (front of the building faces the player, +z)
export interface Blueprint { id: string; icon: string; name: T2; desc: T2; cells: () => Cell[] }
function boxCells(out: Cell[], x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, f: (x: number, y: number, z: number) => number | null) {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) { const id = f(x, y, z); if (id !== null) out.push([x, y, z, id]); }
}
export const BLUEPRINTS: Blueprint[] = [
  {
    id: 'house', icon: '🏠', name: ['Rumah Kecil', 'Little House'], desc: ['Rumah kayu dengan jendela dan lentera.', 'A wooden house with windows and a lantern.'],
    cells: () => {
      const c: Cell[] = [];
      boxCells(c, -2, 0, -4, 2, 2, 0, (x, y, z) => {
        const edge = Math.abs(x) === 2 || z === -4 || z === 0; if (!edge) return null;
        if ((Math.abs(x) === 2) && (z === -4 || z === 0)) return B.OAK_LOG;
        if (z === 0 && x === 0 && y <= 1) return null;           // door
        if (y === 1 && ((Math.abs(x) === 2 && z === -2) || (z === -4 && x === 0))) return B.GLASS;
        return B.PLANKS;
      });
      boxCells(c, -2, 3, -4, 2, 3, 0, () => B.PLANKS);
      boxCells(c, -1, 4, -3, 1, 4, -1, () => B.PLANKS);
      c.push([0, 5, -2, B.PLANKS]);
      c.push([1, 2, -3, B.LANTERN]);
      return c;
    },
  },
  {
    id: 'tower', icon: '🗼', name: ['Menara Tangga', 'Stair Tower'], desc: ['Naik tangga melingkar sampai ke puncak!', 'Climb the spiral stairs to the top!'],
    cells: () => {
      const c: Cell[] = [];
      for (let y = 0; y < 9; y++) c.push([0, y, -2, B.OAK_LOG]);
      const ring = [[1, -2], [1, -1], [0, -1], [-1, -1], [-1, -2], [-1, -3], [0, -3], [1, -3]];
      for (let y = 0; y < 8; y++) { const [x, z] = ring[y % 8]; c.push([x, y, z, B.PLANKS]); }
      boxCells(c, -2, 9, -4, 2, 9, 0, () => B.PLANKS);
      for (const [x, z] of [[-2, -4], [2, -4], [-2, 0], [2, 0]]) c.push([x, 10, z, B.LANTERN]);
      return c;
    },
  },
  {
    id: 'bridge', icon: '🌉', name: ['Jembatan', 'Bridge'], desc: ['Jembatan kayu panjang untuk menyeberang air.', 'A long wooden bridge to cross water.'],
    cells: () => {
      const c: Cell[] = [];
      for (let z = 0; z >= -10; z--) for (let x = -1; x <= 1; x++) c.push([x, 0, z, B.PLANKS]);
      for (let z = 0; z >= -10; z -= 2) { c.push([-1, 1, z, B.OAK_LOG], [1, 1, z, B.OAK_LOG]); }
      c.push([-1, 2, 0, B.LANTERN], [1, 2, 0, B.LANTERN], [-1, 2, -10, B.LANTERN], [1, 2, -10, B.LANTERN]);
      return c;
    },
  },
  {
    id: 'garden', icon: '🌷', name: ['Taman Lentera', 'Lantern Garden'], desc: ['Taman bunga kecil dengan lentera di setiap sudut.', 'A little flower garden with lanterns in each corner.'],
    cells: () => {
      const c: Cell[] = [];
      const fl = [B.FLOWER_RED, B.FLOWER_YELLOW, B.FLOWER_BLUE, B.FLOWER_PURPLE];
      boxCells(c, -2, 0, -4, 2, 0, 0, (x, _y, z) => (Math.abs(x) === 2 && (z === -4 || z === 0)) ? B.OAK_LOG : (x === 0 && z === -2) ? B.SAPLING : ((x + z) % 2 === 0 ? fl[(x + 2 + (z + 4) * 5) % 4] : null));
      for (const [x, z] of [[-2, -4], [2, -4], [-2, 0], [2, 0]]) c.push([x, 1, z, B.LANTERN]);
      return c;
    },
  },
  {
    id: 'masjid', icon: '🕌', name: ['Masjid Mini', 'Mini Masjid'], desc: ['Masjid pualam dengan kubah emas. Butuh banyak bahan!', 'A marble masjid with a golden dome. Needs lots of materials!'],
    cells: () => {
      const c: Cell[] = [];
      boxCells(c, -3, 0, -6, 3, 3, 0, (x, y, z) => {
        const edge = Math.abs(x) === 3 || z === -6 || z === 0; if (!edge) return null;
        if (z === 0 && Math.abs(x) <= 1 && y <= 1) return null;
        if (y === 3) return B.MOSAIC;
        if (y === 1 && Math.abs(x) === 3 && z === -3) return B.GLASS;
        return B.MARBLE;
      });
      boxCells(c, -2, 0, -5, 2, 0, -1, (_x, _y, z) => (z % 2 ? B.WOOL_GREEN : B.WOOL_RED));
      c.splice(c.findIndex(e => e[1] === 0 && e[0] === 0 && e[2] === -1), 1);
      boxCells(c, -3, 4, -6, 3, 4, 0, () => B.MARBLE);
      boxCells(c, -1, 5, -4, 1, 6, -2, (x, y, z) => (y === 6 && (Math.abs(x) + Math.abs(z + 3) > 1) ? null : B.GOLD_TILE));
      c.push([0, 7, -3, B.LANTERN], [0, 3, -5, B.LANTERN]);
      return c;
    },
  },
];
export function blueprintCost(bp: Blueprint) {
  const m = new Map<number, number>();
  for (const [, , , id] of bp.cells()) m.set(id, (m.get(id) || 0) + 1);
  return [...m.entries()];
}

// ======================= the Fun system =======================
const PET_NAMES = ['Kiko', 'Mimi', 'Bobo', 'Lulu', 'Pipo', 'Coco', 'Momo', 'Nana', 'Ciko', 'Dodo', 'Puput', 'Bintang'];

export class Fun {
  pet: Animal | null = null;
  riding: { kind: 'boat' | 'camel'; obj: THREE.Object3D; animal?: Animal; vx: number; vz: number } | null = null;
  // blueprint placement
  plan: { bp: Blueprint; rot: number; manual: number; origin: THREE.Vector3; ok: boolean } | null = null;
  private ghost: THREE.Group = new THREE.Group();
  private ghostOk = new THREE.MeshBasicMaterial({ color: 0x6bf08a, transparent: true, opacity: 0.35, depthWrite: false });
  private ghostBad = new THREE.MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.35, depthWrite: false });
  building = false;

  constructor(public g: Game) { g.scene.add(this.ghost); }

  // ---------- pets ----------
  restorePet() {
    const p = this.g.stats.pet;
    if (!p) return;
    const a = new Animal(p.kind as AnimalKind, this.g.world);
    a.pos.copy(this.g.player.pos).add(new THREE.Vector3(-1.5, 0, 1.5));
    this.adopt(a, p.name, false);
    this.g.scene.add(a.rig.root);
    this.g.ents.animals.push(a);
  }
  private adopt(a: Animal, name: string, celebrate: boolean) {
    if (this.pet && this.pet !== a) { this.pet.follow = null; this.pet.rig.root.remove(this.pet.tagObj!); this.pet.chunk = 'wild'; }
    a.chunk = ''; a.follow = () => this.g.player.pos;
    const tag = nameTag('💕 ' + name, '#FFB3C8'); tag.position.y = a.rig.height + 0.35; a.rig.root.add(tag); a.tagObj = tag;
    this.pet = a;
    this.g.stats.pet = { kind: a.kind, name };
    if (celebrate) {
      SFX.fanfare(); haptic([10, 30, 10]); this.g.ui.confetti(50);
      this.g.fx.hearts(a.pos.x, a.pos.y + a.rig.height, a.pos.z, 8);
      this.g.kid.reward('quest');
      this.g.ui.say(tr(`${name} sekarang sahabatmu! Ia akan mengikutimu ke mana-mana 💕`, `${name} is your friend now! It will follow you everywhere 💕`), 'alright', 6000);
      this.g.saveSoon();
    }
  }
  offerAdopt(a: Animal) {
    const g = this.g;
    const names = [...PET_NAMES].sort(() => Math.random() - 0.5).slice(0, 4);
    const animal = t2(({ chicken: ['Ayam', 'Chicken'], sheep: ['Domba', 'Sheep'], cow: ['Sapi', 'Cow'], camel: ['Unta', 'Camel'], goat: ['Kambing', 'Goat'], cat: ['Kucing', 'Cat'] } as Record<string, T2>)[a.kind]);
    g.ui.dialog({
      face: '💕', who: tr('Sahabat baru', 'A new friend'),
      text: tr(`${animal} ini suka kamu! Mau jadikan sahabat? Pilih namanya:`, `This ${animal.toLowerCase()} likes you! Make it your friend? Pick a name:`) + (this.pet ? '<br><small>' + tr(`(${g.stats.pet!.name} akan kembali bermain di alam)`, `(${g.stats.pet!.name} will go back to play in the wild)`) + '</small>' : ''),
      buttons: [...names.map(n => ({ label: '💕 ' + n, cls: 'gold', fn: () => { g.inv.useHeld(); this.adopt(a, n, true); } })), { label: tr('Nanti saja', 'Maybe later'), cls: 'ghost' }],
    });
  }

  // ---------- treasure chests ----------
  openChest(x: number, y: number, z: number) {
    const g = this.g;
    const loot: [number, number][][] = [
      [[I.GOLD_INGOT, 2], [B.LANTERN, 3]], [[I.CRYSTAL, 2], [B.MOSAIC, 4]], [[B.GOLD_TILE, 6], [I.DATES, 4]],
      [[I.IRON_INGOT, 4], [I.KOLAK, 1]], [[B.WOOL_PURPLE, 4], [B.WOOL_YELLOW, 4], [I.APPLE, 3]], [[B.MARBLE, 12], [B.LANTERN, 2]],
    ];
    const pick = loot[Math.floor(Math.random() * loot.length)];
    g.world.set(x, y, z, B.AIR);
    for (const [id, n] of pick) { g.inv.add(id, n); g.ui.pickup(id, n); }
    g.stats.chests = (g.stats.chests || 0) + 1;
    SFX.fanfare(); haptic([15, 40, 15]);
    g.fx.sparkle(x + 0.5, y + 0.8, z + 0.5, 40, 0xffd874, 4);
    g.ui.confetti(50);
    g.kid.reward('quest');
    g.ui.say(tr('Wah, harta karun! Alhamdulillah 🎁', 'Wow, treasure! Alhamdulillah 🎁'), 'alright');
    g.checkQuests();
  }

  // ---------- blueprints ----------
  startPlan(bp: Blueprint) { this.plan = { bp, rot: -1, manual: 0, origin: new THREE.Vector3(), ok: false }; this.g.ui.planBar(bp); this.rebuildGhost(); }
  cancelPlan() { this.plan = null; this.ghost.clear(); this.g.ui.planBar(null); }
  rotatePlan() { if (this.plan) { this.plan.manual = (this.plan.manual + 1) % 4; SFX.click(); } }
  private cells(): Cell[] {
    const p = this.plan!; const r = p.rot;
    return p.bp.cells().map(([x, y, z, id]) => { let a = x, b = z; for (let i = 0; i < r; i++) [a, b] = [-b, a]; return [a, y, b, id] as Cell; });
  }
  private rebuildGhost() {
    this.ghost.clear();
    if (!this.plan) return;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const cs = this.cells();
    const m = new THREE.InstancedMesh(geo, this.ghostOk, cs.length);
    const M = new THREE.Matrix4();
    cs.forEach(([x, y, z], i) => m.setMatrixAt(i, M.makeTranslation(x + 0.5, y + 0.5, z + 0.5)));
    m.instanceMatrix.needsUpdate = true;
    this.ghost.add(m);
  }
  private updatePlan() {
    const p = this.plan!, g = this.g, pl = g.player;
    const fwd = new THREE.Vector3(-Math.sin(pl.yaw), 0, -Math.cos(pl.yaw));
    const ox = Math.floor(pl.pos.x + fwd.x * 3.5), oz = Math.floor(pl.pos.z + fwd.z * 3.5);
    let oy = Math.floor(pl.pos.y);
    // sit on the ground in front of the player
    while (oy > 1 && !g.world.solidAt(ox, oy - 1, oz)) oy--;
    while (oy < H - 2 && g.world.solidAt(ox, oy, oz)) oy++;
    if (p.bp.id === 'bridge') oy = Math.floor(pl.pos.y);
    // face the player: rotate so the front (+z) points back toward them
    const quarter = (((Math.round(-pl.yaw / (Math.PI / 2)) + p.manual) % 4) + 4) % 4;
    if (quarter !== p.rot) { p.rot = quarter; this.rebuildGhost(); }
    p.origin.set(ox, oy, oz);
    this.ghost.position.copy(p.origin);
    let ok = true;
    for (const [x, y, z] of this.cells()) {
      const id = g.world.get(ox + x, oy + y, oz + z);
      if (!(id === B.AIR || id === B.WATER || BLOCKS[id]?.render === 'cross') || g.kid.isProtected(ox + x, oy + y, oz + z) || g.player.occupies(ox + x, oy + y, oz + z)) { ok = false; break; }
    }
    p.ok = ok;
    (this.ghost.children[0] as THREE.InstancedMesh).material = ok ? this.ghostOk : this.ghostBad;
    g.ui.planState(ok);
  }
  missing(bp: Blueprint): [number, number][] {
    if (this.g.inv.creative) return [];
    return blueprintCost(bp).filter(([id, n]) => this.g.inv.count(id) < n).map(([id, n]) => [id, n - this.g.inv.count(id)]);
  }
  build() {
    const g = this.g, p = this.plan;
    if (!p || this.building) return;
    if (!p.ok) { SFX.error(); g.ui.toast(tr('Tempatnya terhalang. Cari tempat yang lapang ya!', 'Something is in the way. Find an open space!')); return; }
    const miss = this.missing(p.bp);
    if (miss.length) { SFX.error(); g.ui.toast(tr('Bahannya belum cukup: ', 'Not enough materials: ') + miss.map(([id, n]) => `${t2(nameOf(id))} ×${n}`).join(', '), 4500); return; }
    if (!g.inv.creative) for (const [id, n] of blueprintCost(p.bp)) g.inv.remove(id, n);
    const o = p.origin.clone();
    const refund = g.inv.creative ? [] : blueprintCost(p.bp);
    const cs = this.cells().sort((a, b) => a[1] - b[1] || (a[0] * a[0] + a[2] * a[2]) - (b[0] * b[0] + b[2] * b[2]));
    const bp = p.bp;
    this.cancelPlan();
    this.building = true;
    let i = 0;
    const tick = () => {
      for (let k = 0; k < 3 && i < cs.length; k++, i++) {
        const [x, y, z, id] = cs[i];
        g.world.set(o.x + x, o.y + y, o.z + z, id);
        if (i % 4 === 0) g.fx.debris(o.x + x + 0.5, o.y + y + 0.5, o.z + z + 0.5, BLOCKS[id]?.color ?? 0xffffff, 2);
      }
      if (i % 9 === 0) SFX.place();
      if (i < cs.length) setTimeout(tick, 45);
      else {
        this.building = false;
        g.stats.placed += cs.length;
        g.stats.built = (g.stats.built || 0) + 1;
        g.setUndo(cs.map(([x, y, z, id]) => [o.x + x, o.y + y, o.z + z, id] as [number, number, number, number]), refund);
        SFX.fanfare(); g.ui.confetti(60); g.ents.mo.celebrate = 3; g.anim.play('celebrate', 2);
        g.fx.sparkle(o.x + 0.5, o.y + 3, o.z - 1.5, 40, 0xffd874, 4);
        g.kid.reward('quest', 2);
        g.ui.say(tr(`Masya Allah, ${t2(bp.name)} jadi! Keren sekali 🏗️`, `Masha Allah, your ${t2(bp.name)} is finished! So cool 🏗️`), 'alright', 6000);
        g.checkQuests(); g.saveSoon();
      }
    };
    tick();
  }

  // ---------- riding ----------
  tryBoat(): boolean {
    const g = this.g, p = g.player;
    const look = p.look();
    for (let d = 1; d <= 6; d += 0.5) {
      const x = p.pos.x + look.x * d, z = p.pos.z + look.z * d;
      const sy = waterSurface(g.world, x, p.pos.y + look.y * d, z);
      if (sy !== null) {
        const boat = this.boatModel(); boat.position.set(Math.floor(x) + 0.5, sy - 0.25, Math.floor(z) + 0.5);
        g.scene.add(boat);
        g.inv.useHeld();
        this.mount('boat', boat);
        return true;
      }
    }
    g.ui.toast(tr('🛶 Arahkan perahu ke air ya', '🛶 Point the boat at some water'));
    return false;
  }
  private boatModel() {
    const grp = new THREE.Group(), wood = mat(0xa9743f), dark = mat(0x7a5129), white = mat(0xf4f4f0);
    const add = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); grp.add(b); };
    add(1.3, 0.18, 2.4, wood, 0, 0, 0);
    add(0.14, 0.35, 2.4, dark, -0.65, 0.18, 0); add(0.14, 0.35, 2.4, dark, 0.65, 0.18, 0);
    add(1.3, 0.35, 0.14, dark, 0, 0.18, 1.2); add(1.0, 0.35, 0.14, dark, 0, 0.18, -1.2);
    add(0.08, 1.6, 0.08, dark, 0, 0.9, -0.5); add(0.05, 0.9, 0.7, white, 0, 1.1, -0.15);
    return grp;
  }
  rideCamel(a: Animal) {
    if (this.riding) return;
    a.target = null; a.ridden = true;
    this.mount('camel', a.rig.root, a);
  }
  private mount(kind: 'boat' | 'camel', obj: THREE.Object3D, animal?: Animal) {
    this.riding = { kind, obj, animal, vx: 0, vz: 0 };
    this.g.player.flying = false;
    SFX.jump();
    this.g.ui.toast(kind === 'boat' ? tr('🛶 Berlayar! Ketuk ✋ untuk turun', '🛶 Sailing! Tap ✋ to get off') : tr('🐪 Naik unta! Ketuk ✋ untuk turun', '🐪 Camel ride! Tap ✋ to get off'), 3500);
    this.g.stats.rides = (this.g.stats.rides || 0) + 1;
    this.g.checkQuests();
  }
  dismount() {
    const r = this.riding, g = this.g;
    if (!r) return;
    const p = g.player.pos;
    // find dry land next to us
    let spot: THREE.Vector3 | null = null;
    outer: for (let rad = 1; rad <= 3; rad++) for (let dx = -rad; dx <= rad; dx++) for (let dz = -rad; dz <= rad; dz++) {
      const x = Math.floor(p.x) + dx, z = Math.floor(p.z) + dz;
      const gy = groundY(g.world, x + 0.5, p.y + 1, z + 0.5);
      if (gy !== null) { spot = new THREE.Vector3(x + 0.5, gy, z + 0.5); break outer; }
    }
    if (r.kind === 'boat' && !spot) { g.ui.toast(tr('Dekati daratan dulu untuk turun 🏝️', 'Get closer to land to step off 🏝️')); return; }
    if (r.kind === 'boat') { g.scene.remove(r.obj); g.inv.add(I.BOAT, 1); }
    if (r.animal) { r.animal.ridden = false; }
    if (spot) { p.copy(spot); g.player.visY = spot.y; }
    else p.y += 1.2;
    this.riding = null;
    SFX.jump();
  }
  /** riding movement; returns true when it replaced normal walking this frame */
  rideStep(dt: number): boolean {
    const r = this.riding; if (!r) return false;
    const g = this.g, pl = g.player, ax = g.input.axis();
    const sp = r.kind === 'boat' ? 6.5 : 7.5;
    let fx = ax.fx, fz = ax.fz; const len = Math.hypot(fx, fz); if (len > 1) { fx /= len; fz /= len; }
    const s = Math.sin(pl.yaw), c = Math.cos(pl.yaw);
    const wx = (fx * c + fz * s) * sp, wz = (-fx * s + fz * c) * sp;
    r.vx += (wx - r.vx) * Math.min(1, dt * (r.kind === 'boat' ? 2 : 6));
    r.vz += (wz - r.vz) * Math.min(1, dt * (r.kind === 'boat' ? 2 : 6));
    const o = r.animal ? r.animal.pos : r.obj.position;
    const nx = o.x + r.vx * dt, nz = o.z + r.vz * dt;
    if (r.kind === 'boat') {
      const sy = waterSurface(g.world, nx, o.y + 0.5, nz);
      if (sy !== null && !g.world.solidAt(Math.floor(nx), Math.floor(sy), Math.floor(nz))) { o.x = nx; o.z = nz; o.y = sy - 0.25 + Math.sin(performance.now() / 500) * 0.04; }
      else { r.vx *= -0.3; r.vz *= -0.3; }
      if (Math.hypot(r.vx, r.vz) > 0.3) r.obj.rotation.y = Math.atan2(r.vx, r.vz);
      pl.pos.set(o.x, o.y + 0.25, o.z);
    } else {
      const a = r.animal!;
      const gy = groundY(g.world, nx, o.y, nz);
      if (gy !== null && Math.abs(gy - o.y) <= 1.1) { o.x = nx; o.z = nz; o.y += (gy - o.y) * Math.min(1, dt * 10); }
      else { r.vx = 0; r.vz = 0; }
      const moving = Math.hypot(r.vx, r.vz) > 0.4;
      if (moving) a.yaw = Math.atan2(r.vx, r.vz);
      a.moving = moving; a.walk += dt * 8 * Math.min(1, Math.hypot(r.vx, r.vz) / 4);
      a.sync(performance.now() / 1000);
      pl.pos.set(o.x, o.y + 1.55, o.z);
    }
    pl.vel.set(0, 0, 0); pl.visY = pl.pos.y; pl.onGround = true;
    pl.speed = 0;
    return true;
  }

  update(dt: number) {
    if (this.plan) this.updatePlan();
    if (this.pet && !this.pet.rig.root.parent) this.g.scene.add(this.pet.rig.root);
  }

  /** current level unlocks */
  unlocked(item: OutfitItem) { return levelOf(this.g.stats.stars) >= item.level; }
}

export { VILLAGE_Y };
