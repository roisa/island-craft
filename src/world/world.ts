// Chunk store: generation queue, block get/set with edit tracking, meshing
// queue with a per-frame time budget, unloading, and voxel ray casting.
import * as THREE from 'three';
import { B, BLOCKS } from './blocks';
import { CS, H, Generator, idx, Biome } from './gen';
import { meshChunk, PS, pidx, isOpaque, emission, WorldUniforms, makeMaterials } from './mesher';

export class Chunk {
  data = new Uint8Array(CS * CS * H);
  hm = new Int16Array(CS * CS);
  lights: number[] = [];
  group: THREE.Group | null = null;
  dirty = true;
  meshed = false;
  biome: Biome = Biome.MEADOW;
  constructor(public cx: number, public cz: number) { }
  key() { return this.cx + ',' + this.cz; }

  computeColumn(x: number, z: number) {
    let y = H - 1;
    while (y > 0 && !isOpaque(this.data[idx(x, y, z)])) y--;
    this.hm[z * CS + x] = y;
  }
  computeAll() {
    for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) this.computeColumn(x, z);
    this.computeLights();
  }
  computeLights() {
    const L: number[] = [];
    const d = this.data;
    for (let i = 0; i < d.length; i++) {
      const id = d[i];
      if (id && emission(id) > 0) {
        const x = i % CS, z = Math.floor(i / CS) % CS, y = Math.floor(i / (CS * CS));
        L.push(x, y, z, emission(id));
      }
    }
    this.lights = L;
  }
}

export interface RayHit { x: number; y: number; z: number; id: number; nx: number; ny: number; nz: number; dist: number }

export class World {
  chunks = new Map<string, Chunk>();
  edits = new Map<string, Map<number, number>>();
  /** which way turned blocks face: chunk key → cell index → 1..3 (0 = the default, south) */
  facing = new Map<string, Map<number, number>>();
  group = new THREE.Group();
  mats: ReturnType<typeof makeMaterials>;
  radius = 5;
  onChunkGenerated: ((c: Chunk) => void) | null = null;
  onChunkUnloaded: ((c: Chunk) => void) | null = null;
  private genQueue: [number, number][] = [];
  private lastCenter = '';

  constructor(public gen: Generator, uniforms: WorldUniforms) {
    this.mats = makeMaterials(uniforms);
  }

  chunkAt(x: number, z: number) { return this.chunks.get(Math.floor(x / CS) + ',' + Math.floor(z / CS)); }

  get(x: number, y: number, z: number): number {
    if (y < 0) return B.BEDROCK;
    if (y >= H) return B.AIR;
    const c = this.chunkAt(x, z);
    if (!c) return B.AIR;
    return c.data[idx(x - c.cx * CS, y, z - c.cz * CS)];
  }
  isLoaded(x: number, z: number) { return !!this.chunkAt(x, z); }
  /** Solid for collisions; unloaded chunks count as solid so you never fall out of the world. */
  solidAt(x: number, y: number, z: number) {
    if (y < 0) return true;
    if (y >= H) return false;
    const c = this.chunkAt(x, z);
    if (!c) return true;
    const b = BLOCKS[c.data[idx(x - c.cx * CS, y, z - c.cz * CS)]];
    return !!b && b.solid;
  }
  heightAt(x: number, z: number) {
    const c = this.chunkAt(x, z);
    if (!c) return this.gen.column(x, z).h;
    return c.hm[(z - c.cz * CS) * CS + (x - c.cx * CS)];
  }

  set(x: number, y: number, z: number, id: number, record = true) {
    if (y <= 0 || y >= H) return false;
    const c = this.chunkAt(x, z);
    if (!c) return false;
    const lx = x - c.cx * CS, lz = z - c.cz * CS, i = idx(lx, y, lz);
    const old = c.data[i];
    if (old === id) return false;
    c.data[i] = id;
    this.facing.get(c.key())?.delete(i); // a new block starts facing the default way
    c.computeColumn(lx, lz);
    const lightChange = emission(old) > 0 || emission(id) > 0;
    if (lightChange) c.computeLights();
    if (record) {
      let m = this.edits.get(c.key()); if (!m) this.edits.set(c.key(), m = new Map());
      m.set(i, id);
    }
    c.dirty = true;
    const touch = (dx: number, dz: number) => { const n = this.chunks.get((c.cx + dx) + ',' + (c.cz + dz)); if (n) n.dirty = true; };
    if (lightChange) { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) touch(dx, dz); }
    else {
      if (lx === 0) touch(-1, 0); if (lx === CS - 1) touch(1, 0);
      if (lz === 0) touch(0, -1); if (lz === CS - 1) touch(0, 1);
      if (lx === 0 && lz === 0) touch(-1, -1); if (lx === CS - 1 && lz === 0) touch(1, -1);
      if (lx === 0 && lz === CS - 1) touch(-1, 1); if (lx === CS - 1 && lz === CS - 1) touch(1, 1);
    }
    return true;
  }

  getFacing(x: number, y: number, z: number) {
    const c = this.chunkAt(x, z); if (!c) return 0;
    return this.facing.get(c.key())?.get(idx(x - c.cx * CS, y, z - c.cz * CS)) ?? 0;
  }
  /** turn the block at (x,y,z) to face 0 (+z), 1 (+x), 2 (−z) or 3 (−x) */
  setFacing(x: number, y: number, z: number, rot: number) {
    const c = this.chunkAt(x, z); if (!c) return;
    const i = idx(x - c.cx * CS, y, z - c.cz * CS);
    let m = this.facing.get(c.key());
    if (!rot) m?.delete(i);
    else { if (!m) this.facing.set(c.key(), m = new Map()); m.set(i, rot); }
    c.dirty = true;
  }
  private generateChunk(cx: number, cz: number) {
    const c = new Chunk(cx, cz);
    c.biome = this.gen.generate(cx, cz, c.data);
    const e = this.edits.get(c.key());
    if (e) for (const [i, id] of e) c.data[i] = id;
    c.computeAll();
    this.chunks.set(c.key(), c);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const n = this.chunks.get((cx + dx) + ',' + (cz + dz)); if (n) n.dirty = true; }
    this.onChunkGenerated?.(c);
    return c;
  }

  private neighboursReady(c: Chunk) {
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (!this.chunks.has((c.cx + dx) + ',' + (c.cz + dz))) return false;
    return true;
  }

  private meshOne(c: Chunk) {
    const pad = new Uint8Array(PS * PS * H);
    const hm = new Int16Array(PS * PS);
    const lights: number[] = [];
    const nb: Chunk[] = [];
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) nb.push(this.chunks.get((c.cx + dx) + ',' + (c.cz + dz))!);
    for (let pz = -1; pz <= CS; pz++) for (let px = -1; px <= CS; px++) {
      const dx = px < 0 ? -1 : px >= CS ? 1 : 0, dz = pz < 0 ? -1 : pz >= CS ? 1 : 0;
      const n = nb[(dz + 1) * 3 + (dx + 1)];
      const lx = px - dx * CS, lz = pz - dz * CS;
      hm[(pz + 1) * PS + (px + 1)] = n.hm[lz * CS + lx];
      for (let y = 0; y < H; y++) pad[pidx(px, y, pz)] = n.data[idx(lx, y, lz)];
    }
    for (let k = 0; k < 9; k++) {
      const n = nb[k], dx = (k % 3) - 1, dz = Math.floor(k / 3) - 1;
      const L = n.lights;
      for (let i = 0; i < L.length; i += 4) {
        const x = L[i] + dx * CS + 0.5, z = L[i + 2] + dz * CS + 0.5;
        if (x < -12 || x > CS + 12 || z < -12 || z > CS + 12) continue;
        lights.push(x, L[i + 1] + 0.5, z, L[i + 3]);
      }
    }
    const g = meshChunk({ pad, hm, lights, ox: c.cx * CS, oz: c.cz * CS, facing: this.facing.get(c.key()) });
    this.disposeGroup(c);
    const grp = new THREE.Group();
    grp.position.set(c.cx * CS, 0, c.cz * CS);
    if (g.solid) grp.add(new THREE.Mesh(g.solid, this.mats.solid));
    if (g.cross) grp.add(new THREE.Mesh(g.cross, this.mats.cross));
    if (g.water) { const w = new THREE.Mesh(g.water, this.mats.water); w.renderOrder = 1; grp.add(w); }
    grp.matrixAutoUpdate = false; grp.updateMatrix();
    for (const m of grp.children) { m.matrixAutoUpdate = false; m.updateMatrix(); }
    this.group.add(grp);
    c.group = grp; c.dirty = false; c.meshed = true;
  }

  private disposeGroup(c: Chunk) {
    if (!c.group) return;
    for (const m of c.group.children) (m as THREE.Mesh).geometry.dispose();
    this.group.remove(c.group);
    c.group = null;
  }

  /** Stream chunks around (px,pz) within a time budget (ms). Returns number of chunks still pending near the player. */
  update(px: number, pz: number, budgetMs = 7): number {
    const ccx = Math.floor(px / CS), ccz = Math.floor(pz / CS);
    const R = this.radius;
    const center = ccx + ',' + ccz + ',' + R;
    if (center !== this.lastCenter) {
      this.lastCenter = center;
      const q: [number, number, number][] = [];
      for (let dz = -R - 1; dz <= R + 1; dz++) for (let dx = -R - 1; dx <= R + 1; dx++) {
        if (dx * dx + dz * dz > (R + 1.5) * (R + 1.5)) continue;
        if (!this.chunks.has((ccx + dx) + ',' + (ccz + dz))) q.push([ccx + dx, ccz + dz, dx * dx + dz * dz]);
      }
      q.sort((a, b) => a[2] - b[2]);
      this.genQueue = q.map(v => [v[0], v[1]]);
      // unload far chunks
      for (const [k, c] of this.chunks) {
        const dx = c.cx - ccx, dz = c.cz - ccz;
        if (dx * dx + dz * dz > (R + 3) * (R + 3)) {
          this.disposeGroup(c);
          this.chunks.delete(k);
          this.onChunkUnloaded?.(c);
        }
      }
    }
    const t0 = performance.now();
    while (this.genQueue.length && performance.now() - t0 < budgetMs * 0.6) {
      const [cx, cz] = this.genQueue.shift()!;
      if (!this.chunks.has(cx + ',' + cz)) this.generateChunk(cx, cz);
    }
    // mesh dirty chunks, nearest first
    const dirty: [Chunk, number][] = [];
    for (const c of this.chunks.values()) {
      if (!c.dirty) continue;
      const dx = c.cx - ccx, dz = c.cz - ccz, d = dx * dx + dz * dz;
      if (d > (R + 0.5) * (R + 0.5)) continue;
      dirty.push([c, d - (c.meshed ? 0 : 0.5)]);
    }
    dirty.sort((a, b) => a[1] - b[1]);
    let pending = 0;
    for (const [c, d] of dirty) {
      if (!this.neighboursReady(c)) { if (d <= 4) pending++; continue; }
      if (performance.now() - t0 > budgetMs && c.meshed) continue;
      if (performance.now() - t0 > budgetMs * 2) { if (d <= 4) pending++; continue; }
      this.meshOne(c);
    }
    return pending + this.genQueue.filter(([cx, cz]) => (cx - ccx) ** 2 + (cz - ccz) ** 2 <= 4).length;
  }

  /** Amanatides & Woo voxel traversal. Skips air and water. */
  raycast(o: THREE.Vector3, dir: THREE.Vector3, maxDist: number): RayHit | null {
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const sx = Math.sign(dir.x), sy = Math.sign(dir.y), sz = Math.sign(dir.z);
    const tdx = sx ? Math.abs(1 / dir.x) : Infinity, tdy = sy ? Math.abs(1 / dir.y) : Infinity, tdz = sz ? Math.abs(1 / dir.z) : Infinity;
    let tmx = sx ? ((sx > 0 ? x + 1 - o.x : o.x - x) * tdx) : Infinity;
    let tmy = sy ? ((sy > 0 ? y + 1 - o.y : o.y - y) * tdy) : Infinity;
    let tmz = sz ? ((sz > 0 ? z + 1 - o.z : o.z - z) * tdz) : Infinity;
    let nx = 0, ny = 0, nz = 0, t = 0;
    for (let i = 0; i < 256 && t <= maxDist; i++) {
      const id = this.get(x, y, z);
      if (id !== B.AIR && id !== B.WATER) return { x, y, z, id, nx, ny, nz, dist: t };
      if (tmx < tmy && tmx < tmz) { x += sx; t = tmx; tmx += tdx; nx = -sx; ny = 0; nz = 0; }
      else if (tmy < tmz) { y += sy; t = tmy; tmy += tdy; nx = 0; ny = -sy; nz = 0; }
      else { z += sz; t = tmz; tmz += tdz; nx = 0; ny = 0; nz = -sz; }
    }
    return null;
  }
}
