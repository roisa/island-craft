// Terrain generation: continents & oceans, biomes (meadow, forest, desert with
// oases, snowy hills, mountains, beaches), caves, ores, trees, a starting
// village with a masjid, and 28 hijaiyah letter shrines scattered over the world.
import { B, LETTERS } from './blocks';
import { Simplex, mulberry32, hash3, clamp, lerp, smoothstep } from './noise';

export const CS = 16;          // chunk size (x/z)
export const H = 112;          // world height
export const SEA = 40;         // sea level
export const VILLAGE_Y = SEA + 5;
export const idx = (x: number, y: number, z: number) => (y * CS + z) * CS + x;

export enum Biome { OCEAN, BEACH, MEADOW, FOREST, DESERT, SNOWY, MOUNTAIN, VILLAGE }
export const BIOME_INFO: Record<Biome, { id: string; en: string; icon: string }> = {
  [Biome.OCEAN]: { id: 'Lautan', en: 'Ocean', icon: '🌊' },
  [Biome.BEACH]: { id: 'Pantai', en: 'Beach', icon: '🏖️' },
  [Biome.MEADOW]: { id: 'Padang Bunga', en: 'Flower Meadow', icon: '🌼' },
  [Biome.FOREST]: { id: 'Hutan', en: 'Forest', icon: '🌳' },
  [Biome.DESERT]: { id: 'Gurun Kurma', en: 'Date Desert', icon: '🐪' },
  [Biome.SNOWY]: { id: 'Bukit Salju', en: 'Snowy Hills', icon: '❄️' },
  [Biome.MOUNTAIN]: { id: 'Pegunungan', en: 'Mountains', icon: '⛰️' },
  [Biome.VILLAGE]: { id: 'Desa Baby Mo', en: "Baby Mo's Village", icon: '🕌' },
};

export interface Column { h: number; biome: Biome; desert: number; snow: number; oasis: number; mt: number }

export type Stamp = [number, number, number, number]; // world x,y,z,id

export interface Shrine { letter: number; x: number; y: number; z: number }

export class Generator {
  private nCont: Simplex; private nTemp: Simplex; private nMoist: Simplex; private nHill: Simplex;
  private nMt: Simplex; private nOasis: Simplex; private nCaveA: Simplex; private nCaveB: Simplex; private nCheese: Simplex;
  stamps = new Map<string, Stamp[]>();
  shrines: Shrine[] = [];

  constructor(public seed: number) {
    this.nCont = new Simplex(seed + 1); this.nTemp = new Simplex(seed + 2); this.nMoist = new Simplex(seed + 3);
    this.nHill = new Simplex(seed + 4); this.nMt = new Simplex(seed + 5); this.nOasis = new Simplex(seed + 6);
    this.nCaveA = new Simplex(seed + 7); this.nCaveB = new Simplex(seed + 8); this.nCheese = new Simplex(seed + 9);
    this.buildVillage();
    this.placeShrines();
  }

  column(x: number, z: number): Column {
    const dist = Math.hypot(x, z);
    const spawnF = smoothstep(150, 50, dist);
    let cont = this.nCont.fbm2(x / 700, z / 700, 3) + 0.22;
    cont = lerp(cont, Math.max(cont, 0.45), spawnF);
    const temp = lerp(this.nTemp.fbm2(x / 520, z / 520, 2) * 1.3, 0.0, spawnF * 0.85);
    const moist = lerp(this.nMoist.fbm2(x / 420, z / 420, 2) * 1.3, 0.1, spawnF * 0.85);
    const hills = this.nHill.fbm2(x / 70, z / 70, 4);
    let mt = smoothstep(0.12, 0.55, this.nMt.fbm2(x / 300, z / 300, 3));
    mt *= (1 - spawnF) * smoothstep(0.0, 0.2, cont);
    const desert = smoothstep(0.12, 0.35, temp) * smoothstep(0.12, -0.08, moist) * (1 - spawnF * 0.9);
    const snow = smoothstep(-0.18, -0.38, temp);

    const base = SEA + 2 + cont * (cont < 0 ? 36 : 12);
    const amp = lerp(lerp(7, 3, desert), 9, snow) * smoothstep(-0.12, 0.08, cont);
    let h = base + hills * amp + Math.pow(mt, 1.5) * 52;

    let oasis = 0;
    if (desert > 0.5) {
      oasis = smoothstep(0.5, 0.72, this.nOasis.noise2(x / 55, z / 55)) * desert;
      h = lerp(h, SEA - 2, smoothstep(0.55, 0.95, oasis));
    }
    // flat, friendly starting valley
    h = lerp(h, VILLAGE_Y, smoothstep(52, 30, dist));
    h = clamp(Math.round(h), 3, H - 6);

    let biome: Biome;
    if (dist < 34) biome = Biome.VILLAGE;
    else if (h < SEA - 1) biome = Biome.OCEAN;
    else if (mt > 0.45 && h > SEA + 22) biome = Biome.MOUNTAIN;
    else if (snow > 0.5) biome = Biome.SNOWY;
    else if (desert > 0.5) biome = Biome.DESERT;
    else if (h <= SEA) biome = Biome.BEACH;
    else if (moist > 0.12) biome = Biome.FOREST;
    else biome = Biome.MEADOW;
    return { h, biome, desert, snow, oasis, mt };
  }

  /** Fill a chunk. Returns the dominant biome at the chunk centre. */
  generate(cx: number, cz: number, d: Uint8Array): Biome {
    const ox = cx * CS, oz = cz * CS;
    const cols: Column[] = new Array(CS * CS);
    const seed = this.seed;
    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      const wx = ox + x, wz = oz + z;
      const c = this.column(wx, wz);
      cols[z * CS + x] = c;
      const { h, biome } = c;
      d[idx(x, 0, z)] = B.BEDROCK;
      const r = hash3(wx, 0, wz, seed);
      let top: number = B.GRASS, fill: number = B.DIRT, depth = 3, under: number = B.STONE;
      switch (biome) {
        case Biome.OCEAN: top = r < 0.25 ? B.GRAVEL : r < 0.35 ? B.CLAY : B.SAND; fill = B.SAND; break;
        case Biome.BEACH: top = B.SAND; fill = B.SAND; under = B.SANDSTONE; break;
        case Biome.DESERT:
          if (c.oasis > 0.35 && h >= SEA) { top = B.GRASS; fill = B.DIRT; }
          else if (h < SEA) { top = B.SAND; fill = B.SAND; }
          else { top = B.SAND; fill = B.SAND; depth = 4; under = B.SANDSTONE; }
          break;
        case Biome.SNOWY: top = B.SNOW_GRASS; break;
        case Biome.MOUNTAIN: top = h > SEA + 40 ? B.SNOW : h > SEA + 28 ? B.STONE : B.GRASS; fill = h > SEA + 28 ? B.STONE : B.DIRT; break;
        default: if (h <= SEA) { top = B.SAND; fill = B.SAND; }
      }
      for (let y = 1; y <= h; y++) {
        let id: number;
        if (y === h) id = top;
        else if (y > h - depth) id = fill;
        else if (y > h - depth - 3 && under === B.SANDSTONE) id = B.SANDSTONE;
        else id = B.STONE;
        d[idx(x, y, z)] = id;
      }
      for (let y = h + 1; y <= SEA; y++) d[idx(x, y, z)] = (y === SEA && c.snow > 0.55 && biome !== Biome.DESERT) ? B.ICE : B.WATER;
    }

    this.carveCaves(ox, oz, cols, d);
    this.ores(cx, cz, cols, d);
    this.decorate(cx, cz, cols, d);

    const st = this.stamps.get(cx + ',' + cz);
    if (st) for (const [x, y, z, id] of st) if (y > 0 && y < H) d[idx(x - ox, y, z - oz)] = id;

    return cols[8 * CS + 8].biome;
  }

  private carveCaves(ox: number, oz: number, cols: Column[], d: Uint8Array) {
    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      const wx = ox + x, wz = oz + z;
      if (Math.abs(wx) < 46 && Math.abs(wz) < 46) continue; // keep the village solid
      const c = cols[z * CS + x];
      const top = c.h < SEA + 1 ? c.h - 6 : c.h - 1;
      for (let y = 2; y < top; y++) {
        const a = this.nCaveA.noise3(wx / 42, y / 26, wz / 42);
        const b = this.nCaveB.noise3(wx / 42, y / 26, wz / 42);
        let air = a * a + b * b < 0.011;
        if (!air && y < c.h - 10 && y < SEA + 6) air = this.nCheese.noise3(wx / 64, y / 36, wz / 64) > 0.6;
        if (air) {
          const i = idx(x, y, z);
          if (d[i] !== B.WATER && d[i] !== B.BEDROCK) d[i] = B.AIR;
        }
      }
    }
    // glowing crystals on deep cave floors
    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) for (let y = 3; y < SEA - 12; y++) {
      if (d[idx(x, y, z)] === B.STONE && d[idx(x, y + 1, z)] === B.AIR && hash3(ox + x, y, oz + z, this.seed + 77) < 0.018) d[idx(x, y, z)] = B.CRYSTAL_ORE;
    }
  }

  private ores(cx: number, cz: number, cols: Column[], d: Uint8Array) {
    const rnd = mulberry32((cx * 73856093) ^ (cz * 19349663) ^ this.seed);
    const vein = (id: number, n: number, ymin: number, ymax: number, len: number) => {
      for (let v = 0; v < n; v++) {
        let x = Math.floor(rnd() * CS), z = Math.floor(rnd() * CS);
        let y = ymin + Math.floor(rnd() * (ymax - ymin));
        const L = 2 + Math.floor(rnd() * len);
        for (let k = 0; k < L; k++) {
          if (x >= 0 && x < CS && z >= 0 && z < CS && y > 0 && y < H && d[idx(x, y, z)] === B.STONE) d[idx(x, y, z)] = id;
          const dir = Math.floor(rnd() * 6);
          if (dir === 0) x++; else if (dir === 1) x--; else if (dir === 2) z++; else if (dir === 3) z--; else if (dir === 4) y++; else y--;
        }
      }
    };
    vein(B.COAL_ORE, 12, 6, SEA + 30, 7);
    vein(B.IRON_ORE, 8, 4, SEA + 4, 5);
    vein(B.GOLD_ORE, 3, 3, SEA - 14, 4);
    vein(B.GRAVEL, 3, 4, SEA, 8);
    vein(B.CLAY, 2, SEA - 10, SEA, 6);
  }

  private decorate(cx: number, cz: number, cols: Column[], d: Uint8Array) {
    const ox = cx * CS, oz = cz * CS;
    const rnd = mulberry32((cx * 83492791) ^ (cz * 2971215073) ^ (this.seed * 7));
    const center = cols[8 * CS + 8];
    const at = (x: number, y: number, z: number) => d[idx(x, y, z)];
    const set = (x: number, y: number, z: number, id: number, force = false) => {
      if (x < 0 || x >= CS || z < 0 || z >= CS || y <= 0 || y >= H) return;
      const i = idx(x, y, z);
      if (force || d[i] === B.AIR || d[i] === B.TALL_GRASS) d[i] = id;
    };
    const trees: [number, number][] = [];
    const farFromTrees = (x: number, z: number, r: number) => trees.every(([a, b]) => Math.abs(a - x) + Math.abs(b - z) > r);

    let attempts = 0, kind: 'oak' | 'pine' | 'palm' | 'cactus' | null = null;
    switch (center.biome) {
      case Biome.FOREST: attempts = 14; kind = 'oak'; break;
      case Biome.MEADOW: attempts = 2; kind = 'oak'; break;
      case Biome.SNOWY: attempts = 6; kind = 'pine'; break;
      case Biome.MOUNTAIN: attempts = 3; kind = 'pine'; break;
      case Biome.DESERT: attempts = 6; kind = 'palm'; break;
      case Biome.BEACH: attempts = 1; kind = 'palm'; break;
    }
    for (let a = 0; a < attempts; a++) {
      const x = 3 + Math.floor(rnd() * 10), z = 3 + Math.floor(rnd() * 10);
      const c = cols[z * CS + x];
      if (c.h <= SEA || c.biome === Biome.VILLAGE) continue;
      const ground = at(x, c.h, z);
      if (ground !== B.GRASS && ground !== B.SNOW_GRASS && ground !== B.SAND && ground !== B.DIRT) continue;
      if (!farFromTrees(x, z, 4)) continue;
      let k: 'oak' | 'pine' | 'palm' | 'cactus' = kind!;
      if (center.biome === Biome.DESERT) {
        // date palms grow around oases; elsewhere the desert has cacti
        if (c.oasis < 0.2) { if (rnd() < 0.5) k = 'cactus'; else continue; }
      }
      if (center.biome === Biome.FOREST && rnd() < 0.15) k = 'pine';
      if (center.biome === Biome.MOUNTAIN && ground !== B.GRASS) continue;
      trees.push([x, z]);
      const y0 = c.h + 1;
      if (k === 'oak') {
        const th = 4 + Math.floor(rnd() * 3);
        for (let dy = -2; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
          const r = dy >= 0 ? 1 : 2;
          if (Math.abs(dx) > r || Math.abs(dz) > r) continue;
          if (Math.abs(dx) === r && Math.abs(dz) === r && rnd() < 0.5) continue;
          set(x + dx, y0 + th + dy, z + dz, B.OAK_LEAVES);
        }
        for (let y = 0; y < th; y++) set(x, y0 + y, z, B.OAK_LOG, true);
        set(x, y0 + th + 1, z, B.OAK_LEAVES);
      } else if (k === 'pine') {
        const th = 6 + Math.floor(rnd() * 4);
        for (let y = 0; y < th; y++) set(x, y0 + y, z, B.PINE_LOG, true);
        let r = 2;
        for (let y = th - 5; y <= th + 1; y++) {
          const rr = y >= th ? (y === th + 1 ? 0 : 1) : r;
          for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) if (Math.abs(dx) + Math.abs(dz) <= rr + 0.5) set(x + dx, y0 + y, z + dz, B.PINE_LEAVES);
          if (y < th) r = r === 2 ? 1 : 2;
          if (center.biome === Biome.SNOWY && rr > 0) { /* snow-dusted */ }
        }
      } else if (k === 'palm') {
        if (x < 3 || x > 12 || z < 3 || z > 12) continue;
        const th = 5 + Math.floor(rnd() * 3);
        for (let y = 0; y < th; y++) set(x, y0 + y, z, B.PALM_LOG, true);
        const top = y0 + th;
        set(x, top, z, B.PALM_LEAVES);
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          set(x + dx, top, z + dz, B.PALM_LEAVES);
          set(x + dx * 2, top, z + dz * 2, B.PALM_LEAVES);
          set(x + dx * 3, top - 1, z + dz * 3, B.PALM_LEAVES);
        }
        for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { set(x + dx, top, z + dz, B.PALM_LEAVES); set(x + dx * 2, top - 1, z + dz * 2, B.PALM_LEAVES); }
      } else {
        const th = 1 + Math.floor(rnd() * 3);
        for (let y = 0; y < th; y++) set(x, y0 + y, z, B.CACTUS, true);
      }
    }

    // ground plants
    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
      const c = cols[z * CS + x];
      if (c.h <= SEA || c.h + 1 >= H) continue;
      if (at(x, c.h + 1, z) !== B.AIR) continue;
      const g = at(x, c.h, z);
      const r = hash3(ox + x, 7, oz + z, this.seed);
      if (g === B.GRASS) {
        const flowery = c.biome === Biome.MEADOW || c.biome === Biome.VILLAGE ? 0.06 : 0.02;
        if (r < flowery) set(x, c.h + 1, z, [B.FLOWER_RED, B.FLOWER_YELLOW, B.FLOWER_BLUE, B.FLOWER_PURPLE][Math.floor(r / flowery * 4)]);
        else if (r < flowery + (c.biome === Biome.VILLAGE ? 0.04 : 0.16)) set(x, c.h + 1, z, B.TALL_GRASS);
      } else if (g === B.SAND && c.biome === Biome.DESERT && r < 0.012) set(x, c.h + 1, z, B.DEAD_BUSH);
    }
  }

  // ---- structures -------------------------------------------------------
  private stamp(x: number, y: number, z: number, id: number) {
    const k = Math.floor(x / CS) + ',' + Math.floor(z / CS);
    let a = this.stamps.get(k); if (!a) this.stamps.set(k, a = []);
    a.push([x, y, z, id]);
  }
  private box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number | ((x: number, y: number, z: number) => number | null)) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      const v = typeof id === 'number' ? id : id(x, y, z);
      if (v !== null) this.stamp(x, y, z, v);
    }
  }

  /** The starting village: masjid with dome & minaret, two houses, a market stall, a well, lantern posts. */
  private buildVillage() {
    const G = VILLAGE_Y;
    // clear the sky over the village and lay paths
    const inVillage = (x: number, z: number) => x * x + z * z <= 30 * 30;
    this.box(-30, G + 1, -30, 30, G + 24, 30, (x, _y, z) => (inVillage(x, z) ? B.AIR : null));
    this.box(-30, G, -30, 30, G, 30, (x, _y, z) => (inVillage(x, z) ? B.GRASS : null));
    this.box(-1, G, -12, 1, G, 20, B.SANDSTONE);
    this.box(-20, G, 4, 20, G, 6, B.SANDSTONE);
    this.box(-4, G, -4, 4, G, 4, (x, _y, z) => (Math.abs(x) + Math.abs(z) <= 5 ? B.SANDSTONE : null));

    // --- masjid (x -6..6, z -26..-14)
    const mz0 = -26, mz1 = -14, mx0 = -6, mx1 = 6;
    this.box(mx0 - 1, G, mz0 - 1, mx1 + 1, G, mz1 + 2, B.MARBLE);
    this.box(mx0, G + 1, mz0, mx1, G + 6, mz1, (x, y, z) => {
      const edge = x === mx0 || x === mx1 || z === mz0 || z === mz1;
      if (!edge) return B.AIR;
      if (z === mz1 && Math.abs(x) <= 1 && y <= G + 4) return B.AIR;                 // door
      if (z === mz1 && Math.abs(x) <= 2 && y === G + 5) return B.MOSAIC;             // arch
      if (y === G + 6) return B.MOSAIC;                                              // frieze
      if ((y === G + 3 || y === G + 4) && ((x === mx0 || x === mx1) ? (z - mz0) % 3 === 2 : Math.abs(x) % 3 === 2) && !(z === mz1)) return B.GLASS;
      if (z === mz0 && x === 0 && y <= G + 4) return B.MOSAIC;                       // mihrab
      return B.MARBLE;
    });
    // prayer rows (green & red carpets)
    this.box(mx0 + 1, G, mz0 + 1, mx1 - 1, G, mz1 - 1, (_x, _y, z) => ((z - mz0) % 3 === 1 ? B.WOOL_GREEN : B.WOOL_RED));
    this.box(mx0, G + 7, mz0, mx1, G + 7, mz1, B.MARBLE);
    // dome
    const dcx = 0, dcz = -20, dcy = G + 7;
    for (let x = -6; x <= 6; x++) for (let z = -6; z <= 6; z++) for (let y = 1; y <= 6; y++) {
      const r = Math.hypot(x, y - 0.5, z);
      if (r <= 5.5 && r > 4.3) this.stamp(dcx + x, dcy + y, dcz + z, (y + x + z) % 4 === 0 ? B.MOSAIC : B.GOLD_TILE);
    }
    this.stamp(dcx, dcy + 7, dcz, B.GOLD_TILE);
    this.stamp(dcx, dcy + 8, dcz, B.LANTERN);
    // inside lanterns & bookshelf
    for (const [x, z] of [[-3, -23], [3, -23], [-3, -17], [3, -17]]) this.stamp(x, G + 5, z, B.LANTERN);
    this.stamp(-5, G + 1, -25, B.BOOKSHELF); this.stamp(5, G + 1, -25, B.BOOKSHELF);
    // minaret
    const tx = 9, tz = -24;
    this.box(tx - 1, G + 1, tz - 1, tx + 1, G + 17, tz + 1, (_x, y) => ((y - G) % 5 === 0 ? B.MOSAIC : B.MARBLE));
    this.box(tx - 2, G + 18, tz - 2, tx + 2, G + 18, tz + 2, B.MARBLE);
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) this.stamp(tx + dx, G + 19, tz + dz, B.LANTERN);
    this.box(tx - 1, G + 19, tz - 1, tx + 1, G + 20, tz + 1, B.GOLD_TILE);
    this.stamp(tx, G + 21, tz, B.GOLD_TILE); this.stamp(tx, G + 22, tz, B.LANTERN);

    // --- houses
    const house = (hx: number, hz: number, owner: 'ustadz' | 'aminah') => {
      this.box(hx - 3, G, hz - 3, hx + 3, G, hz + 3, B.COBBLE);
      this.box(hx - 3, G + 1, hz - 3, hx + 3, G + 4, hz + 3, (x, y, z) => {
        const edge = x === hx - 3 || x === hx + 3 || z === hz - 3 || z === hz + 3;
        if (!edge) return B.AIR;
        const corner = (x === hx - 3 || x === hx + 3) && (z === hz - 3 || z === hz + 3);
        if (corner) return B.OAK_LOG;
        if (z === hz + 3 && x === hx && y <= G + 2) return B.AIR;
        if (y === G + 2 || y === G + 3) { if ((x === hx - 3 || x === hx + 3) && z === hz) return B.GLASS; if (z === hz - 3 && Math.abs(x - hx) === 1) return B.GLASS; }
        return B.PLANKS;
      });
      for (let l = 0; l < 4; l++) this.box(hx - 4 + l, G + 5 + l, hz - 4 + l, hx + 4 - l, G + 5 + l, hz + 4 - l, (x, _y, z) => (l < 3 && x > hx - 4 + l && x < hx + 4 - l && z > hz - 4 + l && z < hz + 4 - l ? null : B.BRICK));
      this.stamp(hx - 2, G + 1, hz - 2, B.BED);
      this.stamp(hx + 2, G + 3, hz - 2, B.LANTERN);
      if (owner === 'ustadz') { this.stamp(hx + 2, G + 1, hz - 2, B.BOOKSHELF); this.stamp(hx - 2, G + 1, hz + 1, B.BOOKSHELF); }
      else { this.stamp(hx + 2, G + 1, hz - 2, B.FURNACE); this.stamp(hx - 2, G + 1, hz + 1, B.WORKBENCH); }
    };
    house(-15, 12, 'ustadz');
    house(15, 12, 'aminah');

    // --- market stall (dates & milk)
    const sx = -8, sz = 8;
    for (const [dx, dz] of [[-2, -1], [2, -1], [-2, 1], [2, 1]]) this.box(sx + dx, G + 1, sz + dz, sx + dx, G + 3, sz + dz, B.OAK_LOG);
    this.box(sx - 2, G + 4, sz - 1, sx + 2, G + 4, sz + 1, (x) => ((x - sx) % 2 === 0 ? B.WOOL_RED : B.WOOL_WHITE));
    this.box(sx - 1, G + 1, sz - 1, sx + 1, G + 1, sz - 1, B.PLANKS);

    // --- well
    const wx = 8, wz = 8;
    this.box(wx - 1, G, wz - 1, wx + 1, G + 1, wz + 1, (x, y, z) => (x === wx && z === wz ? (y === G ? B.WATER : B.AIR) : B.COBBLE));
    this.stamp(wx, G - 1, wz, B.WATER);
    for (const [dx, dz] of [[-1, -1], [1, 1]]) this.box(wx + dx, G + 2, wz + dz, wx + dx, G + 3, wz + dz, B.OAK_LOG);
    this.box(wx - 1, G + 4, wz - 1, wx + 1, G + 4, wz + 1, B.PLANKS);

    // --- a workbench & furnace on the plaza so crafting can start right away
    this.stamp(3, G + 1, -3, B.WORKBENCH);
    this.stamp(-3, G + 1, -3, B.FURNACE);

    // --- lantern posts
    for (const [x, z] of [[-6, -6], [6, -6], [-6, 6], [6, 6], [-3, -10], [3, -10], [-3, 16], [3, 16], [-12, 3], [12, 3], [-20, 3], [20, 3]]) {
      this.box(x, G + 1, z, x, G + 2, z, B.OAK_LOG);
      this.stamp(x, G + 3, z, B.LANTERN);
    }
    // --- date palms & gardens
    const palm = (x: number, z: number, th: number) => {
      for (let y = 1; y <= th; y++) this.stamp(x, G + y, z, B.PALM_LOG);
      const top = G + th + 1;
      this.stamp(x, top, z, B.PALM_LEAVES);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { this.stamp(x + dx, top, z + dz, B.PALM_LEAVES); this.stamp(x + dx * 2, top, z + dz * 2, B.PALM_LEAVES); this.stamp(x + dx * 3, top - 1, z + dz * 3, B.PALM_LEAVES); }
      for (const [dx, dz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) this.stamp(x + dx, top, z + dz, B.PALM_LEAVES);
    };
    palm(-11, -12, 5); palm(11, -10, 6); palm(-22, 20, 5); palm(22, 22, 6); palm(-4, 24, 5);
    const flowers = [B.FLOWER_RED, B.FLOWER_YELLOW, B.FLOWER_BLUE, B.FLOWER_PURPLE];
    for (let x = -9; x <= 9; x++) for (const z of [-11, 26]) if (x % 2 === 0 && Math.abs(x) > 1) this.stamp(x, G + 1, z, flowers[(x + 20) % 4]);
  }

  private placeShrines() {
    const rnd = mulberry32(this.seed ^ 0x5eed);
    for (let i = 0; i < LETTERS.length; i++) {
      const ang = i * 2.39996 + rnd() * 0.3;
      let rad = 44 + i * 7.6;
      let x = 0, z = 0, c: Column | null = null;
      for (let k = 0; k < 40; k++) {
        const r = Math.max(42, rad + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 5);
        const a = ang + (k > 20 ? (k - 20) * 0.15 : 0);
        x = Math.round(Math.cos(a) * r); z = Math.round(Math.sin(a) * r);
        c = this.column(x, z);
        if (c.h > SEA + 1 && c.h < H - 12) break;
      }
      const h = c!.h;
      const base = c!.biome === Biome.DESERT ? B.SANDSTONE : c!.biome === Biome.SNOWY ? B.MARBLE : B.COBBLE;
      this.box(x - 2, h + 1, z - 2, x + 2, h + 7, z + 2, B.AIR);
      this.box(x - 1, h, z - 1, x + 1, h, z + 1, base);
      this.stamp(x, h + 1, z, B.MOSAIC);
      this.stamp(x, h + 2, z, B.LETTER_0 + i);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.stamp(x + dx, h + 1, z + dz, B.TORCH);
      this.shrines.push({ letter: i, x, y: h + 2, z });
    }
  }
}
