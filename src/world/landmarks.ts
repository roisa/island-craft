// Handcrafted places hidden in the generated world. Each world seed puts every
// landmark in a fitting biome (a lighthouse on a beach, an igloo in the snow…),
// away from the village and the letter shrines. Each one has a treasure chest
// and a "discovery" with a short fun fact when you first get close.
import { B, I } from './blocks';
import { Biome, H, SEA, type Column } from './gen';
import { mulberry32, hash3 } from './noise';
import type { T2 } from '../i18n';

export interface Landmark {
  id: string; icon: string; name: T2;
  /** a gentle clue for the explorer's journal before it's found */
  hint: T2;
  /** what you learn when you find it */
  fact: T2;
  x: number; y: number; z: number;
  /** discovered when you come this close (blocks) */
  r: number;
  /** secret spots inside the landmark: a second, smaller discovery */
  spots?: Spot[];
  /** named points the game uses for effects (the waterfall's foot, the reef's middle…) */
  at?: Record<string, [number, number, number]>;
  /** what its treasure chest holds (instead of a random gift) */
  loot?: [number, number][];
  /** a route through it (the river, from its source to the sea) */
  path?: [number, number][];
}
export interface Spot { id: string; icon: string; name: T2; fact: T2; x: number; y: number; z: number; r: number }
type Built = number | { y: number; spots?: Spot[]; at?: Record<string, [number, number, number]>; path?: [number, number][]; pos?: [number, number] };
type Taken = { x: number; z: number; r: number }[];

/** what a landmark builder can do with the generator */
export interface Builder {
  column(x: number, z: number): Column;
  stamp(x: number, y: number, z: number, id: number): void;
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number | ((x: number, y: number, z: number) => number | null)): void;
}

type Spec = Omit<Landmark, 'x' | 'y' | 'z'> & {
  biomes: Biome[];
  /** extra check on a candidate column */
  ok?: (c: Column) => boolean;
  /** min / max distance from the village */
  dist: [number, number];
  /** returns the y used for the discovery point (and any secret spots) */
  build(b: Builder, x: number, y: number, z: number, plan?: any): Built;
  /** look ahead before choosing a spot (e.g. trace a river); null means try somewhere else */
  plan?: (b: Builder, x: number, z: number, taken: Taken) => unknown | null;
  loot?: [number, number][];
  /** when no fitting spot exists in this world, build it on any dry land rather than leave it out */
  loose?: boolean;
  /** biomes to try in a second search when the first finds nothing (only then: old worlds don't change) */
  relaxed?: Biome[];
};

/** fill from the ground up to y (so buildings never float over a dip) */
function foundation(b: Builder, x0: number, z0: number, x1: number, z1: number, y: number, id: number) {
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
    const h = b.column(x, z).h;
    for (let yy = Math.min(h, y) - 2; yy <= y; yy++) b.stamp(x, yy, z, id);
  }
}
const palm = (b: Builder, x: number, y: number, z: number, th: number) => {
  for (let i = 1; i <= th; i++) b.stamp(x, y + i, z, B.PALM_LOG);
  const t = y + th + 1;
  b.stamp(x, t, z, B.PALM_LEAVES);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { b.stamp(x + dx, t, z + dz, B.PALM_LEAVES); b.stamp(x + dx * 2, t, z + dz * 2, B.PALM_LEAVES); b.stamp(x + dx * 3, t - 1, z + dz * 3, B.PALM_LEAVES); }
};

// built on first use: gen.ts and this file import each other
let specs: Spec[] | null = null;
const SPECS = (): Spec[] => specs ??= [
  {
    id: 'lighthouse', icon: '🗼', name: ['Mercusuar', 'The Lighthouse'], biomes: [Biome.BEACH], dist: [70, 260], r: 9,
    ok: c => c.h >= SEA && c.h <= SEA + 3,
    hint: ['Di tempat pasir bertemu laut, ada menara tinggi bergaris.', 'Where the sand meets the sea stands a tall striped tower.'],
    fact: ['Mercusuar menolong kapal menemukan jalan di malam hari. Dalam Al-Qur’an, bintang-bintang juga menjadi petunjuk jalan bagi para musafir (QS An-Nahl: 16).', 'Lighthouses help ships find their way at night. In the Qur’an, the stars are also a guide for travellers (An-Nahl 16:16).'],
    build(b, x, y, z) {
      foundation(b, x - 3, z - 3, x + 3, z + 3, y, B.SANDSTONE);
      b.box(x - 3, y + 1, z - 3, x + 3, y + 22, z + 3, B.AIR);
      // a striped round-ish tower with a spiral stair around the outside
      for (let yy = 1; yy <= 14; yy++) b.box(x - 1, y + yy, z - 1, x + 1, y + yy, z + 1, (xx, _y, zz) => (xx === x && zz === z ? B.AIR : Math.floor((yy - 1) / 3) % 2 ? B.WOOL_RED : B.WOOL_WHITE));
      const ring = [[2, -1], [2, 0], [2, 1], [1, 2], [0, 2], [-1, 2], [-2, 1], [-2, 0], [-2, -1], [-1, -2], [0, -2], [1, -2]];
      for (let yy = 0; yy < 14; yy++) { const [dx, dz] = ring[yy % ring.length]; b.stamp(x + dx, y + yy + 1, z + dz, B.PLANKS); }
      b.box(x - 2, y + 15, z - 2, x + 2, y + 15, z + 2, B.PLANKS);
      b.box(x - 1, y + 16, z - 1, x + 1, y + 17, z + 1, (xx, _y, zz) => (xx === x && zz === z ? B.LANTERN : B.GLASS));
      b.box(x - 1, y + 18, z - 1, x + 1, y + 18, z + 1, B.WOOL_RED);
      b.stamp(x + 2, y + 16, z, B.CHEST);
      for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) b.stamp(x + dx, y + 16, z + dz, B.TORCH);
      return y + 1;
    },
  },
  {
    id: 'oasis', icon: '🏕️', name: ['Perkemahan Oasis', 'Oasis Camp'], biomes: [Biome.DESERT], dist: [70, 300], r: 9,
    ok: c => c.h >= SEA && c.h < SEA + 14,
    hint: ['Di tengah gurun yang panas, ada tenda di dekat air dan pohon kurma.', 'In the hot desert, a tent waits by the water and the date palms.'],
    fact: ['Oasis adalah tempat di gurun yang punya air. Pohon kurma tumbuh di sana — dan memberi kita kurma yang manis!', 'An oasis is a place in the desert with water. Date palms grow there — and give us sweet dates!'],
    build(b, x, y, z) {
      foundation(b, x - 6, z - 6, x + 6, z + 6, y, B.SAND);
      b.box(x - 6, y + 1, z - 6, x + 6, y + 9, z + 6, B.AIR);
      // a small pool
      b.box(x - 5, y, z + 2, x - 2, y, z + 5, B.WATER); b.box(x - 5, y - 1, z + 2, x - 2, y - 1, z + 5, B.SAND);
      // striped tent
      for (let yy = 1; yy <= 4; yy++) { const w = 4 - yy; b.box(x - w, y + yy, z - 3, x + w, y + yy, z - 3 + 5, (xx, _y, zz) => (Math.abs(xx - x) === w || yy === 4 ? ((xx + zz) % 2 ? B.WOOL_RED : B.WOOL_WHITE) : null)); }
      b.box(x - 1, y + 1, z + 2, x + 1, y + 2, z + 2, B.AIR); // door
      b.stamp(x, y + 1, z - 2, B.CHEST); b.stamp(x - 2, y + 1, z - 1, B.BED);
      b.stamp(x + 4, y + 1, z + 4, B.FURNACE); // the camp stove
      palm(b, x - 6, y, z + 1, 5); palm(b, x - 1, y, z + 6, 6); palm(b, x + 5, y, z - 5, 5);
      for (const [dx, dz] of [[3, 3], [-3, 3]]) b.stamp(x + dx, y + 1, z + dz, B.TORCH);
      return y + 1;
    },
  },
  {
    id: 'lookout', icon: '⛰️', name: ['Puncak Pengintai', 'Mountain Lookout'], biomes: [Biome.MOUNTAIN], dist: [80, 320], r: 8,
    ok: c => c.h > SEA + 30 && c.h < H - 14,
    hint: ['Paling tinggi dari semuanya — naiklah gunung sampai ke puncak!', 'Higher than everything else — climb a mountain to the very top!'],
    fact: ['Dari tempat tinggi kita bisa melihat jauh. Nabi ﷺ mengajarkan: ucapkan “Allahu Akbar” saat naik, dan “Subhanallah” saat turun.', 'From up high you can see so far. The Prophet ﷺ taught us to say “Allahu Akbar” when climbing up and “Subhanallah” when going down.'],
    build(b, x, y, z) {
      foundation(b, x - 2, z - 2, x + 2, z + 2, y, B.STONE);
      b.box(x - 3, y + 1, z - 3, x + 3, y + 8, z + 3, B.AIR);
      b.box(x - 2, y + 1, z - 2, x + 2, y + 1, z + 2, B.PLANKS);
      for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { b.stamp(x + dx, y + 2, z + dz, B.OAK_LOG); b.stamp(x + dx, y + 3, z + dz, B.LANTERN); }
      for (let i = 2; i <= 7; i++) b.stamp(x, y + i, z, B.OAK_LOG); // flag pole
      b.box(x + 1, y + 6, z, x + 3, y + 7, z, B.WOOL_GREEN); b.stamp(x + 2, y + 6, z, B.WOOL_WHITE); // flag
      b.stamp(x - 1, y + 2, z + 1, B.CHEST);
      return y + 1;
    },
  },
  {
    id: 'ruins', icon: '🏛️', name: ['Reruntuhan Perpustakaan', 'Library Ruins'], biomes: [Biome.FOREST, Biome.MEADOW], dist: [70, 280], r: 9,
    ok: c => c.h > SEA + 1 && c.h < SEA + 24,
    hint: ['Di dalam hutan, ada tiang-tiang tua dan buku-buku yang terlupa.', 'Deep in the forest are old pillars and forgotten books.'],
    fact: ['Dulu ada perpustakaan besar bernama Baitul Hikmah di Baghdad. Para ilmuwan Muslim sangat cinta buku dan ilmu!', 'Long ago there was a great library called the House of Wisdom in Baghdad. Muslim scholars loved books and learning!'],
    build(b, x, y, z) {
      foundation(b, x - 5, z - 5, x + 5, z + 5, y, B.COBBLE);
      b.box(x - 5, y + 1, z - 5, x + 5, y + 7, z + 5, B.AIR);
      b.box(x - 4, y, z - 4, x + 4, y, z + 4, (xx, _y, zz) => ((xx + zz) % 3 === 0 ? B.MOSAIC : B.MARBLE));
      // broken walls of different heights
      const hgt = [3, 1, 4, 2, 0, 3, 1, 2, 4];
      for (let i = -4; i <= 4; i++) {
        for (let yy = 1; yy <= hgt[(i + 4) % 9]; yy++) { b.stamp(x + i, y + yy, z - 4, B.COBBLE); if (i % 2) b.stamp(x - 4, y + yy, z + i, B.MARBLE); }
      }
      for (const [dx, dz] of [[-2, 2], [2, 2]]) for (let yy = 1; yy <= 4; yy++) b.stamp(x + dx, y + yy, z + dz, B.MARBLE); // pillars
      b.box(x + 1, y + 1, z - 3, x + 3, y + 2, z - 3, B.BOOKSHELF);
      b.stamp(x, y + 1, z, B.CHEST);
      b.stamp(x - 1, y + 1, z - 1, B.LANTERN);
      return y + 1;
    },
  },
  {
    id: 'igloo', icon: '⛄', name: ['Rumah Salju', 'The Igloo'], biomes: [Biome.SNOWY], dist: [80, 320], r: 8,
    ok: c => c.h > SEA && c.h < SEA + 20,
    hint: ['Di negeri salju yang dingin, ada rumah bulat dari salju.', 'In the cold snowy land is a round house made of snow.'],
    fact: ['Igloo terbuat dari salju, tapi di dalamnya hangat! Salju yang padat menahan angin dingin di luar.', 'Igloos are made of snow, but it’s warm inside! Packed snow keeps the cold wind outside.'],
    build(b, x, y, z) {
      foundation(b, x - 4, z - 4, x + 4, z + 4, y, B.SNOW);
      b.box(x - 4, y + 1, z - 4, x + 4, y + 6, z + 4, B.AIR);
      for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) for (let dy = 1; dy <= 4; dy++) {
        const r = Math.hypot(dx, (dy - 0.5) * 1.15, dz);
        if (r <= 3.6 && r > 2.6) b.stamp(x + dx, y + dy, z + dz, B.SNOW);
      }
      b.box(x, y + 1, z + 3, x, y + 2, z + 4, B.AIR); b.box(x - 1, y + 1, z + 4, x + 1, y + 3, z + 5, (xx, yy) => (Math.abs(xx - x) === 1 || yy === y + 3 ? B.SNOW : B.AIR));
      b.stamp(x, y + 1, z - 2, B.CHEST); b.stamp(x - 2, y + 1, z, B.BED); b.stamp(x + 1, y + 3, z - 1, B.LANTERN);
      return y + 1;
    },
  },
  {
    id: 'secret_garden', icon: '🌷', name: ['Taman Rahasia', 'The Secret Garden'], biomes: [Biome.MEADOW, Biome.FOREST], dist: [60, 220], r: 6,
    ok: c => c.h > SEA + 4 && c.h < SEA + 20,
    hint: ['Cari lingkaran bunga di padang rumput. Ada tangga rahasia ke bawah tanah!', 'Look for a ring of flowers in a meadow. A secret stair leads underground!'],
    fact: ['Taman tersembunyi di bawah tanah! Kristal bisa berkilau dalam gelap. Allah menciptakan banyak harta tersembunyi di dalam bumi.', 'A garden hidden under the ground! Crystals can sparkle in the dark. Allah made many hidden treasures inside the earth.'],
    build(b, x, y, z) {
      // the ring of flowers around the stair hole on the surface
      const fl = [B.FLOWER_RED, B.FLOWER_YELLOW, B.FLOWER_BLUE, B.FLOWER_PURPLE];
      for (let a = 0; a < 12; a++) { const fx = x + Math.round(Math.cos(a / 12 * Math.PI * 2) * 3), fz = z + Math.round(Math.sin(a / 12 * Math.PI * 2) * 3); b.stamp(fx, b.column(fx, fz).h + 1, fz, fl[a % 4]); }
      // a stair going down 8 blocks to a glowing cave garden
      const depth = 8, gy = y - depth;
      // step i: you stand at y - i (one block lower each step), with headroom cut up to the surface
      for (let i = 0; i < depth; i++) { b.box(x, y - i, z + i - 3, x + 1, y + 3, z + i - 3, B.AIR); b.box(x, y - i - 1, z + i - 3, x + 1, y - i - 1, z + i - 3, B.COBBLE); }
      b.box(x - 4, gy - 1, z + 3, x + 5, gy + 4, z + 11, (xx, yy, zz) => {
        const edge = xx === x - 4 || xx === x + 5 || zz === z + 11 || yy === gy + 4 || yy === gy - 1;
        if (edge) return (xx + yy + zz) % 7 === 0 ? B.CRYSTAL_ORE : B.STONE;
        if (yy === gy) return B.GRASS;
        if (yy === gy + 1 && (xx + zz) % 2 === 0 && Math.abs(xx - x) > 1) return fl[(xx * 3 + zz) & 3];
        return B.AIR;
      });
      for (const [dx, dz] of [[-3, 4], [4, 4], [-3, 10], [4, 10]]) b.stamp(x + dx, gy + 3, z + dz, B.LANTERN);
      b.stamp(x + 1, gy + 1, z + 8, B.SAPLING);
      b.stamp(x, gy + 1, z + 10, B.CHEST);
      return y;
    },
  },
  {
    id: 'date_farm', icon: '🌴', name: ['Kebun Kurma', 'The Date Farm'], biomes: [Biome.MEADOW, Biome.DESERT, Biome.BEACH], dist: [60, 240], r: 9,
    ok: c => c.h > SEA && c.h < SEA + 12,
    hint: ['Barisan pohon kurma yang rapi, dengan pagar dan pondok kecil.', 'Neat rows of date palms with a fence and a little hut.'],
    fact: ['Pohon kurma bisa hidup sampai 100 tahun! Nabi ﷺ suka berbuka puasa dengan kurma.', 'Date palms can live for 100 years! The Prophet ﷺ liked to break his fast with dates.'],
    build(b, x, y, z) {
      foundation(b, x - 7, z - 7, x + 7, z + 7, y, B.DIRT);
      b.box(x - 7, y + 1, z - 7, x + 7, y + 10, z + 7, B.AIR);
      b.box(x - 7, y, z - 7, x + 7, y, z + 7, B.GRASS);
      for (let i = -7; i <= 7; i += 2) for (const [a, c] of [[i, -7], [i, 7], [-7, i], [7, i]]) b.stamp(x + a, y + 1, z + c, B.OAK_LOG); // fence posts
      for (const dx of [-4, 0, 4]) for (const dz of [-4, 1]) palm(b, x + dx, y, z + dz, 4 + ((dx + dz) & 1));
      // the farmer's hut
      b.box(x + 3, y + 1, z + 4, x + 6, y + 3, z + 6, (xx, yy, zz) => (xx === x + 3 || xx === x + 6 || zz === z + 4 || zz === z + 6 ? (yy === y + 3 ? B.PLANKS : B.PLANKS) : B.AIR));
      b.box(x + 3, y + 4, z + 4, x + 6, y + 4, z + 6, B.PALM_LOG);
      b.box(x + 3, y + 1, z + 5, x + 3, y + 2, z + 5, B.AIR); // door
      b.stamp(x + 5, y + 1, z + 5, B.CHEST);
      return y + 1;
    },
  },
  {
    id: 'sky_island', icon: '☁️', name: ['Pulau Awan', 'The Sky Island'], biomes: [Biome.MEADOW, Biome.FOREST], dist: [70, 260], r: 7,
    ok: c => c.h > SEA + 2 && c.h < SEA + 16,
    hint: ['Lihat ke atas! Ada pulau yang melayang. Naiki batu-batu loncatan untuk sampai ke sana.', 'Look up! An island floats in the sky. Hop up the stepping stones to get there.'],
    fact: ['Kamu sampai di atas awan! Dari atas, semuanya terlihat kecil. Subhanallah, betapa luas ciptaan Allah!', 'You made it above the clouds! From up here everything looks tiny. Subhanallah, how big Allah’s creation is!'],
    build(b, x, y, z) {
      const top = y + 20;
      // the floating island: grass on top, dirt then stone hanging below
      for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) {
        const r = Math.hypot(dx, dz); if (r > 5.2) continue;
        const depth = Math.max(1, Math.round(4 - r * 0.7));
        b.stamp(x + dx, top, z + dz, B.GRASS);
        for (let k = 1; k <= depth; k++) b.stamp(x + dx, top - k, z + dz, k < 2 ? B.DIRT : B.STONE);
      }
      for (let i = 1; i <= 4; i++) b.stamp(x - 2, top + i, z - 2, B.OAK_LOG);
      b.box(x - 4, top + 4, z - 4, x, top + 6, z, (xx, yy, zz) => (Math.abs(xx - x + 2) + Math.abs(zz - z + 2) + (yy - top - 4) <= 3 && !(xx === x - 2 && zz === z - 2 && yy < top + 5) ? B.OAK_LEAVES : null));
      b.stamp(x + 2, top + 1, z + 1, B.CHEST);
      for (const [dx, dz] of [[3, -2], [-3, 3], [3, 3]]) b.stamp(x + dx, top + 1, z + dz, [B.FLOWER_RED, B.FLOWER_YELLOW, B.FLOWER_BLUE][(dx + dz + 6) % 3]);
      b.stamp(x + 4, top + 1, z - 3, B.LANTERN);
      // a spiral of floating stepping stones, one block up each step
      const steps = top - y;
      for (let i = 1; i < steps; i++) {
        const a = i * 0.55, r = 7.5;
        const sx = x + Math.round(Math.cos(a) * r), sz = z + Math.round(Math.sin(a) * r);
        b.box(sx, y + i, sz, sx, y + i + 2, sz, B.AIR);
        b.stamp(sx, y + i, sz, i % 4 === 0 ? B.GOLD_TILE : B.PLANKS);
        if (i % 5 === 0) b.stamp(sx, y + i + 1, sz, B.TORCH);
      }
      return top + 1;
    },
  },
  {
    id: 'waterfall', icon: '🏞️', name: ['Lembah Air Terjun', 'Waterfall Valley'], biomes: [Biome.MOUNTAIN, Biome.FOREST, Biome.MEADOW], dist: [70, 300], r: 11,
    ok: c => c.h > SEA + 3 && c.h < H - 34,
    hint: ['Dengarkan suara air yang jatuh dari tebing tinggi. Di sore yang cerah ada pelangi!', 'Listen for water falling from a tall cliff. On sunny afternoons there’s a rainbow!'],
    fact: ['Air terjun adalah sungai yang jatuh dari tebing. Allah menurunkan hujan dari langit, lalu mengalirkannya menjadi mata air di bumi (QS Az-Zumar: 21). Pelangi muncul saat cahaya matahari menembus butiran air.', 'A waterfall is a river dropping over a cliff. Allah sends rain down from the sky and makes it flow as springs in the earth (Az-Zumar 39:21). A rainbow appears when sunlight shines through tiny drops of water.'],
    loot: [[I.CRYSTAL, 3], [I.GOLD_INGOT, 2], [B.LANTERN, 2]],
    build(b, x, y, z) {
      const top = y + 12;
      // the valley floor in front of the cliff
      b.box(x - 8, y + 1, z - 3, x + 8, y + 16, z + 7, B.AIR);
      foundation(b, x - 8, z - 3, x + 8, z + 7, y, B.DIRT);
      b.box(x - 8, y, z - 3, x + 8, y, z + 7, B.GRASS);
      // the cliff, lower towards its sides, with a grassy top
      for (let dx = -8; dx <= 8; dx++) {
        const ht = top - Math.max(0, Math.abs(dx) - 3) * 2;
        for (let dz = -14; dz <= -4; dz++) {
          const X = x + dx, Z = z + dz, g0 = Math.min(b.column(X, Z).h, y) - 2;
          for (let yy = g0; yy <= ht; yy++) b.stamp(X, yy, Z, yy === ht ? B.GRASS : yy > ht - 2 ? B.DIRT : hash3(X, yy, Z, 7) < 0.2 ? B.COBBLE : B.STONE);
          b.box(X, ht + 1, Z, X, ht + 6, Z, B.AIR);
        }
      }
      // a little river on top runs to the edge and falls into a pool
      b.box(x, top, z - 13, x + 1, top, z - 4, B.WATER);
      b.box(x, y + 1, z - 3, x + 1, top, z - 3, B.WATER);
      b.box(x - 3, y - 1, z - 3, x + 4, y, z + 3, B.WATER);
      b.box(x - 3, y - 2, z - 3, x + 4, y - 2, z + 3, B.SAND);
      // the secret cave behind the falling water, its walls sparkling with crystals
      b.box(x - 3, y, z - 10, x + 4, y + 5, z - 4, (X, Y, Z) => (hash3(X, Y, Z, 11) < 0.16 ? B.CRYSTAL_ORE : B.STONE));
      b.box(x - 2, y + 1, z - 9, x + 3, y + 4, z - 5, B.AIR);
      b.box(x, y + 1, z - 4, x + 1, y + 2, z - 4, B.AIR);
      b.stamp(x, y + 1, z - 9, B.CHEST);
      b.stamp(x - 2, y + 1, z - 9, B.LANTERN); b.stamp(x + 3, y + 1, z - 9, B.LANTERN);
      b.stamp(x - 2, y + 1, z - 5, B.WOOL_BLUE); b.stamp(x + 3, y + 1, z - 5, B.WOOL_GREEN);
      // flowers and saplings around the pool
      const fl = [B.FLOWER_RED, B.FLOWER_YELLOW, B.FLOWER_BLUE, B.FLOWER_PURPLE];
      for (let i = 0; i < 14; i++) {
        const fx = x - 7 + Math.floor(hash3(i, 1, x, 3) * 15), fz = z + 4 + Math.floor(hash3(i, 2, z, 3) * 4);
        b.stamp(fx, y + 1, fz, i % 5 === 0 ? B.TALL_GRASS : fl[i % 4]);
      }
      b.stamp(x - 6, y + 1, z - 2, B.TORCH); b.stamp(x + 7, y + 1, z - 2, B.TORCH);
      return {
        y: y + 1,
        spots: [{ id: 'waterfall_cave', icon: '💎', name: ['Gua Rahasia di Balik Air Terjun', 'The Secret Cave Behind the Waterfall'], fact: ['Kamu menembus air terjun dan menemukan gua kristal! Ada peti harta di sini.', 'You went through the waterfall and found a crystal cave! There’s a treasure chest in here.'], x: x + 0.5, y: y + 1, z: z - 7, r: 3.2 }],
        at: { foot: [x + 1, y + 1, z - 2], rainbow: [x + 1, y + 9, z + 5] },
      };
    },
  },
  {
    id: 'reef', icon: '🪸', name: ['Taman Karang', 'The Coral Reef'], biomes: [Biome.OCEAN, Biome.BEACH], dist: [60, 300], r: 12,
    ok: c => c.h >= SEA - 12 && c.h <= SEA + 1,
    hint: ['Di laut dangkal yang jernih ada taman karang warna-warni. Menyelamlah ke bawah!', 'In the clear shallow sea is a colourful coral garden. Dive down!'],
    fact: ['Karang adalah hewan kecil yang hidup bersama dan membangun rumah dari batu kapur. Allah berfirman tentang lautan: “Dari keduanya keluar mutiara dan marjan” (QS Ar-Rahman: 22).', 'Corals are tiny animals that live together and build homes of limestone. Allah says of the seas: “From both of them come pearls and coral” (Ar-Rahman 55:22).'],
    loot: [[I.PEARL, 4], [I.GOLDEN_FISH, 1], [B.LANTERN, 2]],
    build(b, x, _y, z) {
      const f = SEA - 6, R = 9;
      const corals = [B.CORAL_PINK, B.CORAL_ORANGE, B.CORAL_PURPLE];
      const shaft = (X: number, Z: number) => X >= x + 3 && X <= x + 4 && Z >= z - 1 && Z <= z;
      for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) {
        const d = Math.hypot(dx, dz); if (d > R + 0.5) continue;
        const X = x + dx, Z = z + dz, h = b.column(X, Z).h;
        const fl = d > R - 1.5 ? Math.max(f, Math.min(h, SEA - 2)) : f;
        for (let yy = Math.min(h, fl) - 3; yy < fl; yy++) b.stamp(X, yy, Z, B.SAND);
        b.stamp(X, fl, Z, B.SAND);
        for (let yy = fl + 1; yy <= SEA; yy++) b.stamp(X, yy, Z, B.WATER);
        if (h > SEA) b.box(X, SEA + 1, Z, X, Math.min(h + 2, SEA + 10), Z, B.AIR);
        if (d > R - 1.5 || shaft(X, Z) || Math.hypot(dx - 3.5, dz + 0.5) < 2.2) continue;
        const r = hash3(X, 7, Z, 99);
        if (r < 0.16) { const n = 1 + Math.floor(r * 19) % 3, c = corals[Math.floor(hash3(X, 8, Z, 5) * 3)]; for (let k = 1; k <= n; k++) b.stamp(X, fl + k, Z, c); }
        else if (r < 0.3) b.stamp(X, fl + 1, Z, B.CORAL_FAN);
        else if (r < 0.5) b.stamp(X, fl + 1, Z, B.SEA_GRASS);
        else if (r < 0.55) b.stamp(X, fl, Z, B.CLAM);
      }
      // the pearl cave: swim down the hole, through a low tunnel, and come up into an air bubble
      const t0 = f - 6;
      b.box(x + 2, t0 - 1, z - 2, x + 5, f - 1, z + 1, B.STONE);
      b.box(x + 3, t0, z - 1, x + 4, f, z, B.WATER);
      b.box(x + 5, t0 - 1, z - 4, x + 12, t0 + 4, z + 3, (X, Y, Z) => (Y === t0 + 4 && hash3(X, Y, Z, 13) < 0.3 ? B.CRYSTAL_ORE : B.STONE));
      b.box(x + 6, t0, z - 3, x + 11, t0 + 1, z + 2, B.WATER);
      b.box(x + 6, t0 + 2, z - 3, x + 11, t0 + 3, z + 2, B.AIR);
      b.box(x + 5, t0, z - 1, x + 5, t0 + 1, z, B.WATER);
      b.box(x + 10, t0, z - 3, x + 11, t0 + 1, z + 2, B.STONE); // a dry ledge to stand on
      for (const [X, Z] of [[x + 7, z - 2], [x + 8, z + 1], [x + 6, z + 2]]) b.stamp(X, t0 - 1, Z, B.CLAM);
      b.stamp(x + 11, t0 + 2, z - 1, B.CHEST);
      b.stamp(x + 11, t0 + 2, z + 2, B.LANTERN); b.stamp(x + 10, t0 + 2, z - 3, B.LANTERN);
      return {
        y: SEA - 3,
        spots: [{ id: 'pearl_cave', icon: '🫧', name: ['Gua Mutiara', 'The Pearl Cave'], fact: ['Ada udara di dalam gua di bawah laut! Mutiara tumbuh di dalam kerang, sedikit demi sedikit, selama bertahun-tahun.', 'There’s air in this cave under the sea! Pearls grow inside clams, little by little, over many years.'], x: x + 9, y: t0 + 2, z: z - 0.5, r: 3.2 }],
        at: { reef: [x + 0.5, f + 2, z + 0.5] },
      };
    },
  },
  {
    id: 'stargaze', icon: '🔭', name: ['Bukit Bintang', 'Stargazing Hill'], biomes: [Biome.DESERT, Biome.MEADOW], dist: [70, 300], r: 9,
    ok: c => c.h > SEA + 2 && c.h < SEA + 18,
    hint: ['Sebuah bukit dengan teropong besar. Ketuk teropongnya untuk melihat bulan dan bintang!', 'A hill with a big telescope. Tap it to look at the moon and the stars!'],
    fact: ['Banyak bintang punya nama dari bahasa Arab, seperti Altair, Vega dan Aldebaran! Ilmuwan Muslim seperti Al-Battani dan As-Sufi mempelajari langit. Bulan sabit baru (hilal) menandai awal bulan Hijriah, seperti Ramadhan dan Syawal.', 'Many stars have Arabic names, like Altair, Vega and Aldebaran! Muslim scientists like Al-Battani and Al-Sufi studied the sky. The new crescent moon (hilal) marks the start of each Hijri month, like Ramadan and Shawwal.'],
    loot: [[I.CRYSTAL, 2], [B.GOLD_TILE, 6], [B.LANTERN, 3]],
    build(b, x, y, z) {
      const top = y + 5, desert = b.column(x, z).biome === Biome.DESERT;
      for (let dx = -8; dx <= 8; dx++) for (let dz = -8; dz <= 8; dz++) {
        const d = Math.hypot(dx, dz); if (d > 8.5) continue;
        const X = x + dx, Z = z + dz, h = b.column(X, Z).h;
        const ht = d <= 2.6 ? top : Math.round(top - (d - 2.6) * 0.9);
        if (ht < h) continue;
        for (let yy = h - 1; yy <= ht; yy++) b.stamp(X, yy, Z, yy === ht ? (dx === 0 && dz > 2 ? B.COBBLE : desert ? B.SAND : B.GRASS) : B.DIRT);
        b.box(X, ht + 1, Z, X, ht + 8, Z, B.AIR);
      }
      b.box(x - 2, top, z - 2, x + 2, top, z + 2, (X, _y, Z) => (Math.abs(X - x) + Math.abs(Z - z) <= 1 ? B.MOSAIC : B.MARBLE));
      b.stamp(x, top + 1, z, B.TELESCOPE);
      b.stamp(x - 2, top + 1, z + 1, B.WOOL_BLUE); b.stamp(x - 2, top + 1, z - 1, B.WOOL_BLUE);
      b.stamp(x + 2, top + 1, z - 2, B.CHEST);
      for (const [dx, dz] of [[-3, 3], [3, 3], [-3, -3], [3, -3]]) { const X = x + dx, Z = z + dz; b.stamp(X, top, Z, B.TORCH); }
      return { y: top + 1, at: { scope: [x, top + 1, z] } };
    },
  },
  {
    id: 'volcano', icon: '🌋', name: ['Pulau Gunung Api', 'Volcano Island'], biomes: [Biome.OCEAN], dist: [110, 330], r: 18, loose: true,
    ok: c => c.h < SEA - 4,
    hint: ['Jauh di laut ada pulau dengan gunung berasap. Buat perahu untuk berlayar ke sana!', 'Far out at sea is an island with a smoking mountain. Make a boat to sail there!'],
    fact: ['Gunung api ini sedang tidur, jadi aman! Indonesia punya lebih dari 120 gunung api. Abu gunung api membuat tanah sangat subur untuk sawah dan kebun. Al-Qur’an menyebut gunung sebagai “pasak” bumi (QS An-Naba’: 7).', 'This volcano is asleep, so it’s safe! Indonesia has more than 120 volcanoes. Volcanic ash makes the soil very rich for rice fields and gardens. The Qur’an calls the mountains “pegs” of the earth (An-Naba’ 78:7).'],
    loot: [[B.OBSIDIAN, 4], [I.CRYSTAL, 3], [I.GOLD_INGOT, 2]],
    build(b, x, _y, z) {
      const R = 17, cone = (d: number) => SEA + 2 + Math.round((12 - d) * 1.15);
      const CR = 3.6, floor = cone(CR) - 3;
      const springs: [number, number][] = [[x + 9, z + 5], [x - 8, z - 7]];
      for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) {
        const d = Math.hypot(dx, dz); if (d > R + 0.5) continue;
        const X = x + dx, Z = z + dz, h = b.column(X, Z).h;
        let top = d > 14.5 ? SEA : d > 12 ? SEA + 1 : cone(Math.max(d, CR));
        if (d < CR) top = floor;
        const path = dx === 0 && dz >= CR && d <= 12; // a stepped path up the south side
        if (path) top = SEA + 2 + Math.round(12 - d);
        for (let yy = Math.min(h, top) - 3; yy <= top; yy++) {
          let id: number;
          if (yy < top) id = d > 12 ? B.SAND : d > 8 ? B.DIRT : hash3(X, yy, Z, 21) < 0.25 ? B.STONE : B.BASALT;
          else if (path) id = B.COBBLE;
          else if (d < CR) id = d < 1.6 ? B.MAGMA : B.BASALT;
          else id = d > 12 ? B.SAND : d > 8 ? B.GRASS : hash3(X, yy, Z, 23) < 0.06 ? B.OBSIDIAN : B.BASALT;
          b.stamp(X, yy, Z, id);
        }
        b.box(X, top + 1, Z, X, Math.max(top + 4, SEA + 18), Z, B.AIR);
        if (d > 8 && d <= 12 && !path && hash3(X, 1, Z, 31) < 0.12) b.stamp(X, top + 1, Z, hash3(X, 2, Z, 31) < 0.5 ? B.TALL_GRASS : B.FLOWER_YELLOW);
        if (d > 12.5 && d < 14 && hash3(X, 3, Z, 41) < 0.03) palm(b, X, top, Z, 4);
      }
      // a step inside the crater so you can climb back out
      b.stamp(x, floor + 1, z + 3, B.BASALT);
      // two warm springs on the lower slopes
      for (const [sx, sz] of springs) {
        const t = cone(Math.hypot(sx - x, sz - z));
        b.box(sx - 1, t - 1, sz - 1, sx + 1, t, sz + 1, B.STONE);
        b.box(sx, t, sz, sx + 1, t, sz + 1, B.WATER);
      }
      // crystals and a chest on the rim
      for (const [cx, cz] of [[x - 2, z - 3], [x + 3, z - 1], [x - 3, z + 1]]) b.stamp(cx, cone(Math.hypot(cx - x, cz - z)) - 1, cz, B.CRYSTAL_ORE);
      b.stamp(x + 1, cone(4) + 1, z - 4, B.CHEST);
      return {
        y: SEA + 2,
        spots: [{ id: 'crater', icon: '🔥', name: ['Di Dalam Kawah', 'Inside the Crater'], fact: ['Kamu ada di kawah gunung api yang sedang tidur! Jauh di bawah sana, batu begitu panas sampai meleleh menjadi magma. Batu yang menyala ini hanya hangat.', 'You’re in the crater of a sleeping volcano! Deep below, rock is so hot that it melts into magma. This glowing rock is only warm.'], x: x + 0.5, y: floor + 1, z: z + 0.5, r: 3 }],
        at: { smoke: [x + 0.5, floor + 2, z + 0.5], spring1: [springs[0][0] + 1, cone(Math.hypot(springs[0][0] - x, springs[0][1] - z)) + 1, springs[0][1] + 1], spring2: [springs[1][0] + 1, cone(Math.hypot(springs[1][0] - x, springs[1][1] - z)) + 1, springs[1][1] + 1] },
      };
    },
  },
  {
    id: 'river', icon: '🛶', name: ['Sungai Rakit', 'Raft River'], biomes: [Biome.BEACH], relaxed: [Biome.MEADOW, Biome.FOREST, Biome.BEACH, Biome.SNOWY, Biome.DESERT, Biome.MOUNTAIN], dist: [60, 260], r: 10,
    ok: c => c.h >= SEA - 1 && c.h <= SEA,
    hint: ['Ada sungai yang mengalir dari padang rumput ke laut. Di hulunya ada dermaga dengan rakit!', 'A river flows from the meadows to the sea. At its start is a little dock with a raft!'],
    fact: ['Sungai membawa air hujan dari bukit ke laut. Allah berfirman: “Dia menurunkan air dari langit, lalu mengalirlah air di lembah-lembah menurut ukurannya” (QS Ar-Ra’d: 17). Ketuk rakit untuk berlayar sampai ke laut!', 'Rivers carry rainwater from the hills down to the sea. Allah says: “He sends down water from the sky, and valleys flow, each according to its measure” (Ar-Ra‘d 13:17). Tap the raft to float all the way to the sea!'],
    loot: [[I.BIG_FISH, 2], [I.FISHING_ROD, 1], [B.LANTERN, 3]],
    plan(b, x, z, taken) {
      // from the mouth on the beach, walk inland over low, gentle ground
      let ang = 0, best = -1;
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * Math.PI * 2, c = b.column(Math.round(x + Math.cos(a) * 8), Math.round(z + Math.sin(a) * 8));
        if (c.biome !== Biome.OCEAN && c.h >= SEA + 1 && c.h <= SEA + 12 && c.h > best) { best = c.h; ang = a; }
      }
      if (best < 0) return null;
      const sea = ang + Math.PI;
      const pts: [number, number][] = [];
      let px = x, pz = z;
      for (let i = 0; i < 80; i++) {
        let pick: [number, number, number] | null = null, ps = Infinity;
        for (const da of [0, 0.3, -0.3, 0.6, -0.6]) {
          const a = ang + da + Math.sin(i * 0.33) * 0.12, nx = px + Math.cos(a) * 1.5, nz = pz + Math.sin(a) * 1.5;
          const c = b.column(Math.round(nx), Math.round(nz));
          if (c.biome === Biome.OCEAN || c.biome === Biome.VILLAGE || c.h < SEA - 1 || c.h > SEA + 12) continue;
          if (Math.hypot(nx, nz) < 50 || taken.some(t => Math.hypot(t.x - nx, t.z - nz) < t.r + 10)) continue;
          const score = c.h + Math.abs(da) * 2.5;
          if (score < ps) { ps = score; pick = [nx, nz, a]; }
        }
        if (!pick) break;
        [px, pz, ang] = pick; pts.push([px, pz]);
      }
      if (pts.length < 40) return null;
      pts.reverse(); // the source first, flowing down to the mouth
      // the dock sits just upstream of the source: it must keep clear of other places too
      const [s0x, s0z] = pts[0], [s3x, s3z] = pts[3], l0 = Math.hypot(s0x - s3x, s0z - s3z) || 1;
      const dkx = s0x + (s0x - s3x) / l0 * 4.2, dkz = s0z + (s0z - s3z) / l0 * 4.2;
      if (Math.hypot(dkx, dkz) < 55 || taken.some(t => Math.hypot(t.x - dkx, t.z - dkz) < t.r + 14)) return null;
      pts.push([x, z]);
      for (let k = 1; k <= 6; k++) pts.push([x + Math.cos(sea) * k * 1.5, z + Math.sin(sea) * k * 1.5]); // out into the sea
      return pts.map(([a, c]) => [Math.round(a * 10) / 10, Math.round(c * 10) / 10]);
    },
    build(b, _x, _y, _z, path: [number, number][]) {
      // distance from every nearby column to the river's centre line
      const near = new Map<string, number>();
      const mark = (px: number, pz: number, rr: number) => {
        for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) {
          const X = Math.round(px) + dx, Z = Math.round(pz) + dz, d = Math.hypot(X + 0.5 - px, Z + 0.5 - pz), k = X + ',' + Z;
          if (d <= rr && d < (near.get(k) ?? 99)) near.set(k, d);
        }
      };
      for (let i = 0; i + 1 < path.length; i++) {
        const [ax, az] = path[i], [bx, bz] = path[i + 1];
        for (let t = 0; t < 1; t += 0.34) mark(ax + (bx - ax) * t, az + (bz - az) * t, 4);
      }
      const [sx, sz] = path[0];
      // a round pond at the source, and one where it ends (in the sea it just joins the water; inland it's a lake)
      for (const [cx, cz] of [path[0], path[path.length - 1]]) for (let dx = -6; dx <= 6; dx++) for (let dz = -6; dz <= 6; dz++) { const X = Math.round(cx) + dx, Z = Math.round(cz) + dz, d = Math.hypot(X + 0.5 - cx, Z + 0.5 - cz) - 1.8; if (d < 4 && d < (near.get(X + ',' + Z) ?? 99)) near.set(X + ',' + Z, Math.max(0, d)); }
      for (const [k, d] of near) {
        const [X, Z] = k.split(',').map(Number), h = b.column(X, Z).h;
        if (d <= 1.7) {
          for (let yy = Math.min(h, SEA - 2) - 2; yy < SEA - 2; yy++) b.stamp(X, yy, Z, B.DIRT);
          b.stamp(X, SEA - 2, Z, hash3(X, 0, Z, 51) < 0.2 ? B.GRAVEL : B.SAND);
          b.box(X, SEA - 1, Z, X, SEA, Z, B.WATER);
          b.box(X, SEA + 1, Z, X, Math.max(h, SEA) + 8, Z, B.AIR);
        } else {
          const top = SEA + Math.min(3, Math.floor(d - 0.7));
          for (let yy = Math.min(h, top) - 2; yy <= top; yy++) b.stamp(X, yy, Z, yy === top ? B.GRASS : B.DIRT);
          b.box(X, top + 1, Z, X, Math.max(h, top) + 8, Z, B.AIR);
          if (d > 2.5 && hash3(X, 5, Z, 53) < 0.08) b.stamp(X, top + 1, Z, hash3(X, 6, Z, 53) < 0.5 ? B.TALL_GRASS : B.FLOWER_BLUE);
        }
      }
      // lanterns along the banks
      for (let i = 6; i < path.length - 8; i += 12) {
        const [ax, az] = path[i], [bx, bz] = path[i + 1], len = Math.hypot(bx - ax, bz - az) || 1, side = i % 24 ? 1 : -1;
        const lx = Math.round(ax - (bz - az) / len * 3.2 * side), lz = Math.round(az + (bx - ax) / len * 3.2 * side);
        const top = SEA + 2; b.stamp(lx, top + 1, lz, B.OAK_LOG); b.stamp(lx, top + 2, lz, B.LANTERN);
      }
      // the dock behind the pond, with the raft and a chest
      const [nx, nz] = path[3], dl = Math.hypot(nx - sx, nz - sz) || 1, ux = (sx - nx) / dl, uz = (sz - nz) / dl;
      const dx0 = Math.round(sx + ux * 4.2), dz0 = Math.round(sz + uz * 4.2);
      b.box(dx0 - 1, SEA + 1, dz0 - 1, dx0 + 1, SEA + 1, dz0 + 1, B.PLANKS);
      b.box(dx0 - 1, SEA + 2, dz0 - 1, dx0 + 1, SEA + 9, dz0 + 1, B.AIR);
      const rx = Math.round(sx + ux * 2.6), rz = Math.round(sz + uz * 2.6);
      b.stamp(rx, SEA + 1, rz, B.PLANKS);
      b.stamp(rx, SEA + 2, rz, B.RAFT_DOCK);
      b.stamp(dx0 + 1, SEA + 2, dz0 + 1, B.CHEST);
      b.stamp(dx0 - 1, SEA + 2, dz0 + 1, B.LANTERN);
      return { y: SEA + 2, pos: [dx0, dz0], at: { dock: [rx, SEA + 2, rz] }, path };
    },
  },
  {
    id: 'sanctuary', icon: '🏡', name: ['Rumah Hewan', 'Animal Sanctuary'], biomes: [Biome.MEADOW, Biome.FOREST], dist: [55, 170], r: 11,
    ok: c => c.h > SEA + 2 && c.h < SEA + 16,
    hint: ['Kandang besar berpagar dengan jerami dan tempat minum. Hewan yang tersesat bisa tinggal di sini.', 'A big fenced home with hay and a water trough. Lost animals can live here.'],
    fact: ['Rasulullah ﷺ bersabda bahwa berbuat baik kepada setiap makhluk hidup ada pahalanya (HR. Bukhari & Muslim). Ada hewan kecil yang tersesat di dunia ini: ketuk mereka, lalu antar ke sini!', 'The Prophet ﷺ said there is a reward for kindness to every living thing (Bukhari & Muslim). Some little animals are lost in this world: tap them, then bring them here!'],
    loot: [[I.APPLE, 6], [I.DATES, 6], [B.WOOL_YELLOW, 6]],
    build(b, x, y, z) {
      foundation(b, x - 9, z - 9, x + 9, z + 9, y, B.DIRT);
      b.box(x - 9, y, z - 9, x + 9, y, z + 9, B.GRASS);
      b.box(x - 9, y + 1, z - 9, x + 9, y + 10, z + 9, B.AIR);
      // a fence two blocks high, with a gate on the south side
      for (let i = -6; i <= 6; i++) for (const [fx, fz] of [[x + i, z - 6], [x + i, z + 6], [x - 6, z + i], [x + 6, z + i]]) {
        if (fz === z + 6 && Math.abs(fx - x) <= 1) continue;
        const post = (fx - x) % 3 === 0 && (fz - z) % 3 === 0;
        b.box(fx, y + 1, fz, fx, y + 2, fz, post ? B.OAK_LOG : B.PLANKS);
      }
      for (const dx of [-2, 2]) b.box(x + dx, y + 1, z + 6, x + dx, y + 3, z + 6, B.OAK_LOG);
      b.box(x - 2, y + 4, z + 6, x + 2, y + 4, z + 6, B.PLANKS);
      // a shelter with hay at the back
      for (const [px, pz] of [[x - 5, z - 5], [x - 1, z - 5], [x - 5, z - 3], [x - 1, z - 3]]) b.box(px, y + 1, pz, px, y + 2, pz, B.OAK_LOG);
      b.box(x - 5, y + 3, z - 5, x - 1, y + 3, z - 3, B.PLANKS);
      b.stamp(x - 4, y + 1, z - 5, B.WOOL_YELLOW); b.stamp(x - 3, y + 1, z - 5, B.WOOL_YELLOW); b.stamp(x - 4, y + 2, z - 5, B.WOOL_YELLOW);
      // water trough and food trough
      b.box(x + 2, y, z - 5, x + 4, y, z - 5, B.WATER);
      b.box(x + 3, y + 1, z + 2, x + 5, y + 1, z + 2, B.PLANKS);
      b.stamp(x + 6, y + 3, z - 6, B.LANTERN); b.stamp(x - 6, y + 3, z - 6, B.LANTERN);
      b.stamp(x + 3, y + 1, z + 8, B.CHEST);
      const fl = [B.FLOWER_RED, B.FLOWER_YELLOW, B.FLOWER_BLUE, B.FLOWER_PURPLE];
      for (let i = 0; i < 10; i++) { const fx = x - 8 + Math.floor(hash3(i, 3, x, 9) * 17), fz = z + 7 + Math.floor(hash3(i, 4, z, 9) * 3); if (Math.abs(fx - x) > 2) b.stamp(fx, y + 1, fz, fl[i % 4]); }
      return { y: y + 1, at: { pen: [x + 0.5, y + 1, z + 0.5] } };
    },
  },
];

export const landmarkIds = () => SPECS().map(s => s.id);

/**
 * Find a fitting spot for every landmark and stamp it. Uses its own random
 * stream, so the letter shrines and the rest of the world don't move.
 */
export function placeLandmarks(b: Builder, seed: number, avoid: { x: number; z: number }[]): Landmark[] {
  const rnd = mulberry32(seed ^ 0x1a2d3c);
  const out: Landmark[] = [];
  const taken = avoid.map(a => ({ ...a, r: 14 }));
  for (const s of SPECS()) {
    let spot: { x: number; z: number; h: number } | null = null;
    let fallback: { x: number; z: number; h: number } | null = null;
    let plan: unknown = undefined;
    const a0 = rnd() * Math.PI * 2;
    for (let k = 0; k < 220 && !spot; k++) {
      const a = a0 + k * 2.39996, d = s.dist[0] + (s.dist[1] - s.dist[0]) * ((k * 0.618 + rnd() * 0.3) % 1);
      const x = Math.round(Math.cos(a) * d), z = Math.round(Math.sin(a) * d);
      if (taken.some(t => Math.hypot(t.x - x, t.z - z) < t.r + 18)) continue;
      const c = b.column(x, z);
      const fits = s.ok ? s.ok(c) : true;
      if (fits && s.biomes.includes(c.biome)) {
        if (s.plan) { const pl = s.plan(b, x, z, taken); if (!pl) continue; plan = pl; }
        spot = { x, z, h: c.h };
      }
      else if ((fits || (s.loose && c.h < SEA + 20)) && !fallback && c.biome !== Biome.OCEAN && c.biome !== Biome.VILLAGE) fallback = { x, z, h: c.h };
    }
    if (!spot && s.relaxed) {
      for (let k = 0; k < 220 && !spot; k++) {
        const a = a0 + k * 2.39996, d = s.dist[0] + (s.dist[1] - s.dist[0]) * ((k * 0.618 + rnd() * 0.3) % 1);
        const x = Math.round(Math.cos(a) * d), z = Math.round(Math.sin(a) * d);
        if (taken.some(t => Math.hypot(t.x - x, t.z - z) < t.r + 18)) continue;
        const c = b.column(x, z);
        if (!s.relaxed.includes(c.biome) || c.h > SEA + 8) continue;
        if (s.plan) { const pl = s.plan(b, x, z, taken); if (!pl) continue; plan = pl; }
        spot = { x, z, h: c.h };
      }
    }
    // no fitting biome nearby in this world: still build it on any dry spot so every world has all of them
    spot ??= fallback;
    if (!spot) continue;
    if (s.plan && plan === undefined) continue; // a river with nowhere to flow is left out rather than squeezed in
    const built = s.build(b, spot.x, spot.h, spot.z, plan);
    const y = typeof built === 'number' ? built : built.y;
    const l: Landmark = { id: s.id, icon: s.icon, name: s.name, hint: s.hint, fact: s.fact, x: spot.x, y, z: spot.z, r: s.r };
    if (typeof built !== 'number') {
      if (built.spots) l.spots = built.spots; if (built.at) l.at = built.at;
      if (built.pos) { l.x = built.pos[0]; l.z = built.pos[1]; }
      if (built.path) { l.path = built.path; for (let i = 0; i < built.path.length; i += 5) taken.push({ x: built.path[i][0], z: built.path[i][1], r: 4 }); }
    }
    if (s.loot) l.loot = s.loot;
    out.push(l);
    taken.push({ x: l.x, z: l.z, r: 12 });
  }
  return out;
}
