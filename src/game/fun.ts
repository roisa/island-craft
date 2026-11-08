// Extra fun for young players: a pet that follows you, outfits unlocked by
// levels, ready-made blueprints that build themselves, treasure chests,
// and rides on a boat or a camel.
import * as THREE from 'three';
import type { Game } from '../main';
import { tr, t2, type T2 } from '../i18n';
import { B, I, BLOCKS, nameOf } from '../world/blocks';
import { H, SEA, VILLAGE_Y } from '../world/gen';
import { Animal, groundY, waterSurface } from './entities';
import { nameTag, mat } from './models';
import { SFX, haptic } from './audio';
import { levelOf } from './kid';
import type { AnimalKind } from './models';
import type { Stats } from '../content';

// ======================= outfits =======================
export type OutfitSlot = 'hat' | 'hijab' | 'cape' | 'shirt';
export interface OutfitItem {
  id: string; slot: OutfitSlot; name: T2; icon: string; level: number; color?: number; perk?: T2;
  /** another way to open it before that level, and how to say it */
  unlock?: { test: (s: Stats) => boolean; how: T2 };
}
/** hats with a power: anyone can wear them, even over a hijab */
export const PERK_HATS = new Set(['hat_straw', 'hat_fisher', 'hat_miner', 'hat_chef', 'hat_diver', 'crown', 'explorer']);
/** the matching item you get the first time you put one on */
export const HAT_GIFTS: Record<string, [number, number][]> = { hat_straw: [[B.SAPLING, 3]], hat_fisher: [[I.FISHING_ROD, 1]], hat_miner: [[B.TORCH, 8]], hat_chef: [[I.EGG, 2], [I.MEAT, 1]], hat_diver: [[B.LANTERN, 2]], explorer: [[I.CRYSTAL, 1]] };
export const OUTFITS: OutfitItem[] = [
  { id: 'peci', slot: 'hat', name: ['Peci Putih', 'White Peci'], icon: '🧢', level: 1, color: 0xf2f2f2 },
  { id: 'none', slot: 'hat', name: ['Tanpa Topi', 'No Hat'], icon: '🙂', level: 1 },
  { id: 'explorer', slot: 'hat', name: ['Topi Penjelajah', 'Explorer Hat'], icon: '🤠', level: 2 },
  { id: 'peci_gold', slot: 'hat', name: ['Peci Emas', 'Golden Peci'], icon: '👑', level: 3, color: 0xf1c232 },
  { id: 'turban', slot: 'hat', name: ['Sorban Hijau', 'Green Turban'], icon: '🟢', level: 6 },
  // hats with powers (worn by both Adam and Ais; they sit on top of a hijab)
  { id: 'hat_straw', slot: 'hat', name: ['Topi Jerami Petani', 'Farmer’s Straw Hat'], icon: '👒', level: 1, perk: ['Bibit tumbuh 2× lebih cepat', 'Saplings grow 2× faster'] },
  { id: 'hat_fisher', slot: 'hat', name: ['Topi Pemancing', 'Fishing Hat'], icon: '🎣', level: 2, perk: ['Ikan lebih cepat menggigit, ikan emas lebih sering', 'Fish bite sooner, golden fish more often'] },
  { id: 'hat_miner', slot: 'hat', name: ['Helm Penambang', 'Miner’s Helmet'], icon: '⛑️', level: 3, perk: ['Lampu di kepala & menggali lebih cepat', 'A head lamp & faster digging'] },
  { id: 'hat_chef', slot: 'hat', name: ['Topi Koki', 'Chef’s Hat'], icon: '👨‍🍳', level: 3, perk: ['Zona hijau memasak lebih lebar', 'A wider green zone when cooking'] },
  { id: 'hat_diver', slot: 'hat', name: ['Masker Selam', 'Diving Mask'], icon: '🤿', level: 4, perk: ['Berenang cepat & melihat jelas di dalam air', 'Swim fast & see clearly underwater'], unlock: { test: s => !!s.discovered?.includes('reef'), how: ['Temukan Taman Karang', 'Find the Coral Reef'] } },
  { id: 'crown', slot: 'hat', name: ['Mahkota Pemburu Harta', 'Treasure Hunter’s Crown'], icon: '👑', level: 99, perk: ['Berkilau di mana pun kamu pergi', 'Sparkles wherever you go'], unlock: { test: s => !!s.greatTreasure, how: ['Temukan harta karun besar', 'Find the great treasure'] } },
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
  // from the Eid bazaar's clothes stall
  { id: 's_eid_green', slot: 'shirt', name: ['Baju Lebaran Hijau', 'Green Eid Outfit'], icon: '🌙', level: 99, color: 0x1f8a4c, unlock: { test: s => !!s.eidShirts?.includes('s_eid_green'), how: ['Bazar Lebaran', 'Eid bazaar'] } },
  { id: 's_eid_gold', slot: 'shirt', name: ['Baju Lebaran Emas', 'Golden Eid Outfit'], icon: '✨', level: 99, color: 0xe9cf7a, unlock: { test: s => !!s.eidShirts?.includes('s_eid_gold'), how: ['Bazar Lebaran', 'Eid bazaar'] } },
  { id: 'c_none', slot: 'cape', name: ['Tanpa Jubah', 'No Cape'], icon: '➖', level: 1 },
  { id: 'c_hero', slot: 'cape', name: ['Jubah Pahlawan', 'Hero Cape'], icon: '🦸', level: 4, color: 0xe4423a },
  { id: 'c_star', slot: 'cape', name: ['Jubah Bintang', 'Star Cape'], icon: '🌟', level: 7, color: 0x6b4fc8 },
];
export interface Outfit { hat: string; hijab: string; cape: string; shirt: string }
export const defaultOutfit = (girl: boolean): Outfit => ({ hat: 'none', hijab: 'h_pink', cape: 'c_none', shirt: girl ? 's_pink' : 's_blue' });
export const outfitItem = (id: string) => OUTFITS.find(o => o.id === id);

/** hats & capes added on top of the avatar model */
export function dressUp(rig: { head: THREE.Object3D; body: THREE.Group; neck?: number }, o: Outfit, girl: boolean, hs: number) {
  const hat = !girl || PERK_HATS.has(o.hat) ? o.hat : 'none';
  const head = rig.head;
  if (girl && PERK_HATS.has(hat)) hs += 0.07; // sit on top of the hijab
  if (hat === 'explorer') {
    const brown = mat(0x9a6a3a), band = mat(0x5e3e25);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(hs + 0.36, 0.05, hs + 0.36), brown); brim.position.y = hs + 0.03; head.add(brim);
    const top = new THREE.Mesh(new THREE.BoxGeometry(hs + 0.04, 0.22, hs + 0.04), brown); top.position.y = hs + 0.16; head.add(top);
    const b = new THREE.Mesh(new THREE.BoxGeometry(hs + 0.06, 0.06, hs + 0.06), band); b.position.y = hs + 0.08; head.add(b);
  } else if (hat === 'hat_straw') {
    const straw = mat(0xe8c766), band = mat(0xd9483b);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(hs + 0.5, 0.04, hs + 0.5), straw); brim.position.y = hs + 0.02; head.add(brim);
    const top = new THREE.Mesh(new THREE.BoxGeometry(hs - 0.02, 0.18, hs - 0.02), straw); top.position.y = hs + 0.12; head.add(top);
    const b = new THREE.Mesh(new THREE.BoxGeometry(hs, 0.05, hs), band); b.position.y = hs + 0.06; head.add(b);
  } else if (hat === 'hat_fisher') {
    const green = mat(0x5f8f4e), dark = mat(0x3e6b33);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(hs + 0.24, 0.05, hs + 0.24), green); brim.position.y = hs - 0.0; brim.rotation.x = 0.06; head.add(brim);
    const top = new THREE.Mesh(new THREE.BoxGeometry(hs + 0.04, 0.16, hs + 0.04), green); top.position.y = hs + 0.09; head.add(top);
    const lure = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), mat(0xf2c43a)); lure.position.set(hs / 2 + 0.03, hs + 0.1, 0.05); head.add(lure);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.02), dark); hook.position.set(hs / 2 + 0.03, hs + 0.04, 0.05); head.add(hook);
  } else if (hat === 'hat_miner') {
    const yellow = mat(0xf2c43a), dark = mat(0x5e4a1a);
    const dome = new THREE.Mesh(new THREE.BoxGeometry(hs + 0.06, 0.2, hs + 0.06), yellow); dome.position.y = hs + 0.1; head.add(dome);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(hs + 0.12, 0.04, hs + 0.2), yellow); brim.position.set(0, hs + 0.01, 0.03); head.add(brim);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, hs + 0.08), dark); ridge.position.y = hs + 0.22; head.add(ridge);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.05), new THREE.MeshBasicMaterial({ color: 0xfff3b0 })); lamp.position.set(0, hs + 0.12, hs / 2 + 0.05); head.add(lamp);
  } else if (hat === 'hat_chef') {
    const white = mat(0xfafafa);
    const band = new THREE.Mesh(new THREE.BoxGeometry(hs + 0.04, 0.12, hs + 0.04), white); band.position.y = hs + 0.06; head.add(band);
    const puff = new THREE.Mesh(new THREE.BoxGeometry(hs + 0.14, 0.26, hs + 0.14), white); puff.position.y = hs + 0.26; head.add(puff);
    for (const [x, z] of [[-0.1, 0], [0.1, 0.05], [0, -0.1]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), white); b.position.set(x, hs + 0.42, z); head.add(b); }
  } else if (hat === 'crown') {
    const gold = mat(0xf1c232), dark = mat(0xc99a12), gems = [0xe4423a, 0x2e6fe0, 0x3fa34d];
    const band = new THREE.Mesh(new THREE.BoxGeometry(hs + 0.06, 0.14, hs + 0.06), gold); band.position.y = hs + 0.06; head.add(band);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [0, -1], [1, 0], [-1, 0]]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.08), x && z ? dark : gold); s.position.set(x * (hs / 2), hs + 0.18, z * (hs / 2)); head.add(s); }
    gems.forEach((c, i) => { const gm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.03), new THREE.MeshBasicMaterial({ color: c })); gm.position.set((i - 1) * 0.12, hs + 0.07, hs / 2 + 0.04); head.add(gm); });
  } else if (hat === 'hat_diver') {
    const frame = mat(0x2b3a4a), glass = new THREE.MeshBasicMaterial({ color: 0x9fe3ff, transparent: true, opacity: 0.75 }), strap = mat(0x1f8a8a), tube = mat(0xf4c430);
    const f = new THREE.Mesh(new THREE.BoxGeometry(hs * 0.86, 0.2, 0.06), frame); f.position.set(0, hs * 0.62, hs / 2 + 0.03); head.add(f);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(hs * 0.74, 0.14, 0.03), glass); gl.position.set(0, hs * 0.62, hs / 2 + 0.065); head.add(gl);
    const st = new THREE.Mesh(new THREE.BoxGeometry(hs + 0.04, 0.07, hs + 0.04), strap); st.position.y = hs * 0.64; head.add(st);
    const sn = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 0.06), tube); sn.position.set(hs / 2 + 0.05, hs * 0.75, 0.05); head.add(sn);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.06), mat(0xe4423a)); tip.position.set(hs / 2 + 0.05, hs * 0.98 + 0.03, 0.05); head.add(tip);
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
  riding: { kind: 'boat' | 'camel' | 'raft'; obj: THREE.Object3D; animal?: Animal; vx: number; vz: number; path?: [number, number][]; cum?: number[]; s?: number; seg?: number; fxT?: number } | null = null;
  // blueprint placement
  plan: { bp: Blueprint; rot: number; manual: number; origin: THREE.Vector3; ok: boolean } | null = null;
  private ghost: THREE.Group = new THREE.Group();
  /** one see-through material; each cell is tinted green (free) or red (in the way) */
  private ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false });
  private cOk = new THREE.Color(0x6bf08a); private cBad = new THREE.Color(0xff4d4d);
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
    if (g.treasure?.isGreatChest(x, y, z)) { g.treasure.openGreat(); return; }
    const loot: [number, number][][] = [
      [[I.GOLD_INGOT, 2], [B.LANTERN, 3]], [[I.CRYSTAL, 2], [B.MOSAIC, 4]], [[B.GOLD_TILE, 6], [I.DATES, 4]],
      [[I.IRON_INGOT, 4], [I.KOLAK, 1]], [[B.WOOL_PURPLE, 4], [B.WOOL_YELLOW, 4], [I.APPLE, 3]], [[B.MARBLE, 12], [B.LANTERN, 2]],
    ];
    const pick = g.places?.lootAt(x, y, z) ?? loot[Math.floor(Math.random() * loot.length)];
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
    const m = new THREE.InstancedMesh(geo, this.ghostMat, cs.length);
    const M = new THREE.Matrix4();
    cs.forEach(([x, y, z], i) => { m.setMatrixAt(i, M.makeTranslation(x + 0.5, y + 0.5, z + 0.5)); m.setColorAt(i, this.cOk); });
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
    // check every cell; only the ones in the way turn red, and we say why
    let blocked = 0, why: 'village' | 'you' | 'things' | null = null;
    const m = this.ghost.children[0] as THREE.InstancedMesh;
    this.cells().forEach(([x, y, z], i) => {
      const wx = ox + x, wy = oy + y, wz = oz + z;
      const id = g.world.get(wx, wy, wz);
      let bad: typeof why = null;
      if (g.kid.isProtected(wx, wy, wz)) bad = 'village';
      else if (g.player.occupies(wx, wy, wz)) bad = 'you';
      else if (!(id === B.AIR || id === B.WATER || BLOCKS[id]?.render === 'cross') || g.deco.at(wx, wy, wz)) bad = 'things';
      if (bad) { blocked++; why ??= bad; if (bad === 'village' || bad === 'you') why = bad; }
      m.setColorAt(i, bad ? this.cBad : this.cOk);
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    p.ok = blocked === 0;
    g.ui.planState(p.ok, { blocked, why, missing: this.missing(p.bp), cost: blueprintCost(p.bp) });
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
      g.ui.buildProgress(i / cs.length, bp);
      if (i < cs.length) setTimeout(tick, 45);
      else {
        this.building = false;
        g.ui.buildProgress(null, bp);
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
        const boat = this.boatModel(); boat.position.set(Math.floor(x) + 0.5, sy - 0.25, Math.floor(z) + 0.5); boat.rotation.y = p.yaw + Math.PI;
        g.scene.add(boat);
        g.inv.useHeld();
        this.mount('boat', boat);
        return true;
      }
    }
    g.ui.toast(tr('🛶 Arahkan perahu ke air ya', '🛶 Point the boat at some water'));
    return false;
  }
  /** a little wooden boat: a hull with a pointed bow, two benches, oars that row, and a striped sail */
  private boatModel() {
    const grp = new THREE.Group(), wood = mat(0xb07a43), dark = mat(0x7a5129), light = mat(0xd9a96b), white = mat(0xf4f4f0), green = mat(0x2f8a55);
    const add = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = grp) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); parent.add(b); return b; };
    add(1.2, 0.16, 2.0, dark, 0, 0, -0.1);                       // bottom
    add(0.12, 0.42, 2.0, wood, -0.62, 0.17, -0.1); add(0.12, 0.42, 2.0, wood, 0.62, 0.17, -0.1); // sides
    add(1.36, 0.06, 0.1, light, 0, 0.4, -0.1 - 1.0); add(1.36, 0.06, 2.0, light, -0.64, 0.4, -0.1).scale.set(0.12 / 1.36, 1, 1);
    add(1.24, 0.42, 0.12, wood, 0, 0.17, -1.1);                  // stern
    // the bow narrows to a point in three steps
    add(0.96, 0.42, 0.24, wood, 0, 0.17, 1.0); add(0.66, 0.42, 0.22, wood, 0, 0.19, 1.2); add(0.34, 0.42, 0.2, wood, 0, 0.22, 1.38);
    add(0.12, 0.12, 0.14, dark, 0, 0.46, 1.46);
    add(1.12, 0.08, 0.3, light, 0, 0.26, 0.35); add(1.12, 0.08, 0.3, light, 0, 0.26, -0.6); // benches
    // mast and sail
    add(0.08, 2.0, 0.08, dark, 0, 1.15, 0.7);
    const sail = new THREE.Group(); sail.position.set(0, 1.25, 0.66); grp.add(sail);
    for (let i = 0; i < 4; i++) add(0.04, 0.3, 0.9 - i * 0.12, i % 2 ? green : white, 0, 0.45 - i * 0.3, -0.45 + i * 0.06, sail);
    add(0.3, 0.16, 0.02, mat(0xf1c232), 0, 1.15, 0.72);         // a little flag
    // oars, pivoting at the sides
    const oars: THREE.Group[] = [];
    for (const sd of [-1, 1]) {
      const o = new THREE.Group(); o.position.set(sd * 0.68, 0.42, -0.15); grp.add(o);
      add(0.05, 0.05, 1.5, light, sd * 0.45, -0.1, 0, o).rotation.y = sd * 0.35;
      add(0.04, 0.22, 0.36, light, sd * 0.85, -0.22, 0.25 * sd * 0, o);
      oars.push(o);
    }
    grp.userData.oars = oars; grp.userData.sail = sail;
    return grp;
  }
  /** launch your boat on the nearest water (the ⛵ button by the shore) */
  launchBoat(): boolean {
    const g = this.g, p = g.player.pos;
    if (this.riding || g.inv.count(I.BOAT) < 1) return false;
    let best: THREE.Vector3 | null = null, bd = Infinity;
    for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) {
      const x = Math.floor(p.x) + dx + 0.5, z = Math.floor(p.z) + dz + 0.5;
      const sy = waterSurface(g.world, x, p.y + 1, z);
      if (sy === null || g.world.solidAt(Math.floor(x), Math.floor(sy), Math.floor(z))) continue;
      // open water around it, so the boat isn't stuck at once
      let open = 0; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (waterSurface(g.world, x + a, p.y + 1, z + b) !== null) open++;
      const d = Math.hypot(dx, dz) - open * 0.4;
      if (open >= 2 && d < bd) { bd = d; best = new THREE.Vector3(x, sy, z); }
    }
    if (!best) { g.ui.toast(tr('⛵ Tidak ada air yang cukup di dekat sini', '⛵ There isn’t enough water near here')); return false; }
    const boat = this.boatModel(); boat.position.set(best.x, best.y - 0.25, best.z); boat.rotation.y = Math.atan2(best.x - p.x, best.z - p.z);
    g.scene.add(boat);
    g.inv.remove(I.BOAT, 1);
    this.mount('boat', boat);
    return true;
  }
    /** float down the river on the raft from the dock, all by itself; Baby Mo sits behind you */
  raftRide(path: [number, number][]) {
    const g = this.g;
    if (this.riding || path.length < 2) return;
    const raft = new THREE.Group(), logC = [0xb08a55, 0xa47e4b, 0xbc9660];
    for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 2.3), mat(logC[i % 3])); l.position.x = (i - 2) * 0.34; raft.add(l); }
    for (const z of [-0.8, 0.8]) { const r = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.28, 0.08), mat(0xe8d9a8)); r.position.z = z; raft.add(r); }
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 0.06), mat(0x7a5129)); pole.position.set(0.6, 0.75, -0.9); raft.add(pole);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.45), mat(0x2aa198)); flag.position.set(0.6, 1.25, -0.68); raft.add(flag);
    g.scene.add(raft);
    const cum = [0];
    for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    this.riding = { kind: 'raft', obj: raft, vx: 0, vz: 0, path, cum, s: 0, seg: 0, fxT: 0 };
    g.player.flying = false;
    g.ents.mo.seat = { pos: new THREE.Vector3(), yaw: 0 };
    SFX.splash();
    g.ui.toast(tr('🛶 Rakit mengalir ke laut! Ketuk ✋ kapan saja untuk turun', '🛶 Floating down to the sea! Tap ✋ any time to hop off'), 4000);
    g.stats.rides = (g.stats.rides || 0) + 1;
    g.checkQuests();
  }
  private raftEnd() {
    const g = this.g;
    g.stats.raftRides = (g.stats.raftRides || 0) + 1;
    if (g.stats.raftRides === 1) { g.kid.reward('quest', 0.5); g.ui.confetti(40); }
    SFX.fanfare();
    g.ui.say(tr('Yeay, kita sampai di ujung sungai! Seru sekali! 🌊', 'Yay, we reached the end of the river! That was fun! 🌊'), 'alright');
    this.dismount();
    g.checkQuests(); g.saveSoon();
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
    this.g.ui.toast(kind === 'boat' ? tr('⛵ Berlayar! Gerakkan untuk mendayung, ketuk ✋ di dekat daratan untuk turun', '⛵ Sailing! Move to row, tap ✋ near land to get off') : tr('🐪 Naik unta! Ketuk ✋ untuk turun', '🐪 Camel ride! Tap ✋ to get off'), 3500);
    if (kind === 'boat') { this.g.ents.mo.seat = { pos: new THREE.Vector3(), yaw: 0 }; this.g.stats.sailed = (this.g.stats.sailed || 0) + 1; }
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
    if (r.kind === 'raft') { g.scene.remove(r.obj); g.ents.mo.seat = null; }
    if (r.kind === 'boat') { g.scene.remove(r.obj); g.inv.add(I.BOAT, 1); g.ents.mo.seat = null; }
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
    if (r.kind === 'raft') return this.raftStep(dt);
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
      const spd = Math.hypot(r.vx, r.vz);
      if (spd > 0.3) { const want = Math.atan2(r.vx, r.vz); let d = want - r.obj.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; r.obj.rotation.y += d * Math.min(1, dt * 4); }
      const yaw = r.obj.rotation.y, now = performance.now() / 1000;
      // gentle rocking, the oars row while moving, the sail leans with the speed
      r.obj.rotation.z = Math.sin(now * 1.3) * 0.03; r.obj.rotation.x = Math.sin(now * 0.9) * 0.02 - Math.min(0.05, spd * 0.008);
      const oars = r.obj.userData.oars as THREE.Group[], row = spd > 0.4 ? now * 5 : 0;
      oars?.forEach((oa, k) => { oa.rotation.y = Math.sin(row) * 0.5 * (k ? -1 : 1); oa.rotation.z = (Math.cos(row) * 0.2 + 0.1) * (k ? -1 : 1); });
      const sail = r.obj.userData.sail as THREE.Group; if (sail) sail.rotation.y = Math.sin(now * 0.8) * 0.08 + Math.min(0.3, spd * 0.04);
      if (spd > 2 && !g.settings.lowGfx && Math.random() < dt * 8) g.fx.sparkle(o.x - Math.sin(yaw) * 1.2 + (Math.random() - 0.5) * 0.6, o.y + 0.3, o.z - Math.cos(yaw) * 1.2, 2, 0xe8f7ff, 0.8);
      pl.pos.set(o.x - Math.sin(yaw) * 0.55, o.y + 0.32, o.z - Math.cos(yaw) * 0.55);
      const seat = g.ents.mo.seat; if (seat) { seat.pos.set(o.x + Math.sin(yaw) * 0.45, o.y + 0.32, o.z + Math.cos(yaw) * 0.45); seat.yaw = yaw + Math.PI; }
    } else {
      const a = r.animal!;
      const gy = groundY(g.world, nx, o.y, nz);
      if (gy !== null && Math.abs(gy - o.y) <= 1.1) { o.x = nx; o.z = nz; o.y += (gy - o.y) * Math.min(1, dt * 10); }
      else { r.vx = 0; r.vz = 0; }
      const moving = Math.hypot(r.vx, r.vz) > 0.4;
      if (moving) a.yaw = Math.atan2(r.vx, r.vz);
      a.moving = moving; a.walk += dt * 8 * Math.min(1, Math.hypot(r.vx, r.vz) / 4);
      a.sync(performance.now() / 1000);
      pl.pos.set(o.x + Math.sin(a.yaw) * 0.36, o.y + 1.68, o.z + Math.cos(a.yaw) * 0.36); // on the blanket, in front of the hump
    }
    pl.vel.set(0, 0, 0); pl.visY = pl.pos.y; pl.onGround = true;
    pl.speed = 0;
    return true;
  }

  private raftStep(dt: number): boolean {
    const r = this.riding!, g = this.g, pl = g.player, path = r.path!, cum = r.cum!;
    r.s! += dt * 2.6;
    const total = cum[cum.length - 1];
    if (r.s! >= total - 0.3) { this.raftEnd(); return true; }
    let i = r.seg!; while (i < cum.length - 2 && cum[i + 1] < r.s!) i++; r.seg = i;
    const t = (r.s! - cum[i]) / Math.max(0.001, cum[i + 1] - cum[i]);
    const [ax, az] = path[i], [bx, bz] = path[i + 1];
    const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    const want = Math.atan2(bx - ax, bz - az);
    let d = want - r.obj.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    r.obj.rotation.y += d * Math.min(1, dt * 2);
    const y = SEA + 0.75 + Math.sin(performance.now() / 600) * 0.04;
    r.obj.position.set(x, y, z);
    pl.pos.set(x + Math.sin(r.obj.rotation.y) * 0.45, y + 0.13, z + Math.cos(r.obj.rotation.y) * 0.45);
    pl.vel.set(0, 0, 0); pl.visY = pl.pos.y; pl.onGround = true; pl.speed = 0;
    const seat = g.ents.mo.seat; if (seat) { seat.pos.set(x - Math.sin(r.obj.rotation.y) * 0.6, y + 0.13, z - Math.cos(r.obj.rotation.y) * 0.6); seat.yaw = r.obj.rotation.y; }
    if (!g.settings.lowGfx && (r.fxT = (r.fxT ?? 0) - dt) <= 0) { r.fxT = 0.35; const sd = Math.random() < 0.5 ? 1 : -1; g.fx.sparkle(x + Math.cos(r.obj.rotation.y) * 0.95 * sd, SEA + 0.95, z - Math.sin(r.obj.rotation.y) * 0.95 * sd, 2, 0xdff4ff, 0.8); }
    return true;
  }

  update(dt: number) {
    if (this.plan) this.updatePlan();
    if (this.pet && !this.pet.rig.root.parent) this.g.scene.add(this.pet.rig.root);
  }

  /** current level unlocks */
  unlocked(item: OutfitItem) { return levelOf(this.g.stats.stars) >= item.level || !!item.unlock?.test(this.g.stats); }
}

export { VILLAGE_Y };
