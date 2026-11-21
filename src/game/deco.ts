// Furniture & decorations: small 3D objects placed on top of blocks (a prayer
// mat, a table, a lamp...). They are not voxels: each sits in one cell, can face
// four ways, can be selected (aim at it), turned (tap / Use) and picked back up
// (hold / Mine). Each object is one or two meshes with vertex colours.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { I } from '../world/blocks';

// ---------- models ----------
interface Part { w: number; h: number; d: number; x: number; y: number; z: number; c: number; glow?: boolean; ry?: number; rx?: number; rz?: number }
const P = (w: number, h: number, d: number, x: number, y: number, z: number, c: number, more: Partial<Part> = {}): Part => ({ w, h, d, x, y, z, c, ...more });

/** parts in cell units: x/z from the cell centre, y from the floor; the front faces +z */
const MODELS: Record<number, () => Part[]> = {
  [I.PRAYER_MAT]: () => [
    P(0.74, 0.03, 0.96, 0, 0.015, 0, 0xd9b44a),
    P(0.66, 0.04, 0.88, 0, 0.02, 0, 0x1f7a4d),
    // the arch (mihrab) pattern at the head end, which points away from the front
    P(0.36, 0.045, 0.06, 0, 0.022, -0.32, 0xd9b44a), P(0.06, 0.045, 0.2, -0.17, 0.022, -0.22, 0xd9b44a), P(0.06, 0.045, 0.2, 0.17, 0.022, -0.22, 0xd9b44a),
    P(0.3, 0.045, 0.24, 0, 0.022, 0.18, 0x2e9c64),
  ],
  [I.TABLE]: () => [
    P(0.92, 0.08, 0.92, 0, 0.52, 0, 0xb07a43), P(0.94, 0.02, 0.94, 0, 0.565, 0, 0xc99158),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => P(0.08, 0.5, 0.08, a * 0.38, 0.25, b * 0.38, 0x8c5e33)),
  ],
  [I.CHAIR]: () => [
    P(0.56, 0.07, 0.56, 0, 0.42, 0.04, 0xc99158),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => P(0.07, 0.42, 0.07, a * 0.23, 0.21, 0.04 + b * 0.23, 0x8c5e33)),
    P(0.56, 0.5, 0.07, 0, 0.7, -0.22, 0xb07a43), P(0.4, 0.12, 0.075, 0, 0.78, -0.22, 0xd9b44a),
  ],
  [I.CUSHION]: () => [
    P(0.66, 0.16, 0.66, 0, 0.08, 0, 0xe4573a), P(0.6, 0.02, 0.6, 0, 0.165, 0, 0xf07c5c), P(0.08, 0.025, 0.08, 0, 0.18, 0, 0xffd874),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => P(0.06, 0.06, 0.06, a * 0.33, 0.12, b * 0.33, 0xffd874)),
  ],
  [I.PLANT_POT]: () => [
    P(0.4, 0.34, 0.4, 0, 0.17, 0, 0xc1663a), P(0.46, 0.06, 0.46, 0, 0.33, 0, 0xd97d4f), P(0.34, 0.02, 0.34, 0, 0.35, 0, 0x5c3b22),
    P(0.06, 0.4, 0.06, 0, 0.55, 0, 0x3f8030),
    P(0.26, 0.18, 0.26, -0.1, 0.62, 0.04, 0x6cbf4f, { ry: 0.5 }), P(0.24, 0.2, 0.24, 0.1, 0.72, -0.05, 0x4f9d3a, { ry: 0.2 }), P(0.22, 0.18, 0.22, 0, 0.86, 0.05, 0x6cbf4f, { ry: 0.8 }),
  ],
  [I.LAMP]: () => [
    P(0.36, 0.06, 0.36, 0, 0.03, 0, 0x5c4632), P(0.06, 1.0, 0.06, 0, 0.55, 0, 0x5c4632),
    P(0.42, 0.32, 0.42, 0, 1.12, 0, 0xffd874, { glow: true }), P(0.46, 0.04, 0.46, 0, 0.96, 0, 0xe0a11a), P(0.46, 0.04, 0.46, 0, 1.28, 0, 0xe0a11a),
  ],
  [I.DATES_BOWL]: () => [
    P(0.5, 0.12, 0.5, 0, 0.08, 0, 0xb07a43), P(0.36, 0.04, 0.36, 0, 0.02, 0, 0x8c5e33),
    ...[[-0.12, -0.08], [0.1, -0.1], [0, 0.08], [-0.1, 0.12], [0.13, 0.1], [0.02, -0.01]].map(([a, b], i) => P(0.09, 0.07, 0.13, a, 0.17 + (i % 2) * 0.02, b, 0x8b4a1f, { ry: i })),
  ],
  [I.KETUPAT]: () => [
    P(0.06, 1.1, 0.06, 0, 0.55, 0, 0x8c5e33), P(0.5, 0.05, 0.05, 0, 1.06, 0, 0x8c5e33),
    ...[-0.2, 0.2].flatMap(x => [P(0.02, 0.18, 0.02, x, 0.95, 0, 0x3f8030), P(0.2, 0.2, 0.2, x, 0.78, 0, 0xd9c24a, { rz: Math.PI / 4 }), P(0.14, 0.14, 0.205, x, 0.78, 0, 0x6cbf4f, { rz: Math.PI / 4 })]),
  ],
  [I.RUG]: () => [
    P(0.98, 0.025, 0.98, 0, 0.0125, 0, 0xb23a48), P(0.84, 0.03, 0.84, 0, 0.015, 0, 0xd45563),
    P(0.5, 0.035, 0.5, 0, 0.0175, 0, 0xf2c14e, { ry: Math.PI / 4 }), P(0.24, 0.04, 0.24, 0, 0.02, 0, 0xb23a48, { ry: Math.PI / 4 }),
  ],
  [I.BOOK_STAND]: () => [
    // the X-shaped wooden rehal with an open book resting on it
    P(0.5, 0.05, 0.4, 0, 0.22, -0.08, 0x8c5e33, { rx: 0.75 }), P(0.5, 0.05, 0.4, 0, 0.22, 0.08, 0x8c5e33, { rx: -0.75 }),
    P(0.22, 0.03, 0.3, -0.12, 0.38, -0.05, 0xf2ebd9, { rx: 0.45, rz: 0.1 }), P(0.22, 0.03, 0.3, 0.12, 0.38, -0.05, 0xf2ebd9, { rx: 0.45, rz: -0.1 }),
    P(0.48, 0.02, 0.32, 0, 0.36, -0.06, 0x1f7a4d, { rx: 0.45 }),
  ],
  [I.CRESCENT]: () => {
    const parts: Part[] = [P(0.36, 0.06, 0.36, 0, 0.03, 0, 0x5c4632), P(0.06, 0.8, 0.06, 0, 0.43, 0, 0x5c4632)];
    // a crescent made of small gold blocks on an arc, and a star
    for (let k = 0; k <= 10; k++) {
      const a = -1.1 + k * 0.22, r = 0.3;
      parts.push(P(0.09, 0.09, 0.06, Math.cos(a + Math.PI) * r * 0.9 + 0.05, 1.08 + Math.sin(a + Math.PI) * -r, 0, 0xffd874, { glow: true, rz: a }));
    }
    parts.push(P(0.11, 0.11, 0.06, 0.12, 1.12, 0, 0xffe9a0, { glow: true, rz: Math.PI / 4 }), P(0.11, 0.11, 0.06, 0.12, 1.12, 0, 0xffe9a0, { glow: true }));
    return parts;
  },
};
export const DECO_IDS = Object.keys(MODELS).map(Number);

const geoCache = new Map<number, { lit: THREE.BufferGeometry | null; glow: THREE.BufferGeometry | null }>();
function geometryFor(id: number) {
  let g = geoCache.get(id);
  if (g) return g;
  const lit: THREE.BufferGeometry[] = [], glow: THREE.BufferGeometry[] = [];
  const col = new THREE.Color();
  for (const p of MODELS[id]()) {
    const b = new THREE.BoxGeometry(p.w, p.h, p.d);
    b.rotateX(p.rx ?? 0); b.rotateY(p.ry ?? 0); b.rotateZ(p.rz ?? 0);
    b.translate(p.x, p.y, p.z);
    col.setHex(p.c);
    const n = b.attributes.position.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
    b.setAttribute('color', new THREE.BufferAttribute(c, 3));
    (p.glow ? glow : lit).push(b);
  }
  g = { lit: lit.length ? mergeGeometries(lit) : null, glow: glow.length ? mergeGeometries(glow) : null };
  geoCache.set(id, g);
  return g;
}
const LIT = new THREE.MeshLambertMaterial({ vertexColors: true });
const GLOW = new THREE.MeshBasicMaterial({ vertexColors: true });
export function decoModel(id: number): THREE.Group {
  const g = geometryFor(id), grp = new THREE.Group();
  if (g.lit) grp.add(new THREE.Mesh(g.lit, LIT));
  if (g.glow) grp.add(new THREE.Mesh(g.glow, GLOW));
  return grp;
}

// ---------- placed objects ----------
export interface DecoItem { id: number; x: number; y: number; z: number; rot: number; obj?: THREE.Object3D; box?: THREE.Box3 }
export type DecoSave = [number, number, number, number, number][]; // id, x, y, z, rot

/** keep only well-formed saved objects (unknown ids and duplicates dropped) */
export function cleanDeco(raw: unknown): DecoSave {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>(), out: DecoSave = [];
  for (const r of raw) {
    if (!Array.isArray(r) || r.length < 5 || !r.every(v => Number.isInteger(v))) continue;
    const [id, x, y, z, rot] = r as number[];
    if (!MODELS[id] || y <= 0 || y > 200 || Math.abs(x) > 1e6 || Math.abs(z) > 1e6) continue;
    const k = x + ',' + y + ',' + z; if (seen.has(k)) continue; seen.add(k);
    out.push([id, x, y, z, ((rot % 4) + 4) % 4]);
  }
  return out;
}

export class Decor {
  items: DecoItem[] = [];
  group = new THREE.Group();
  private ghost = new THREE.Group();
  private ghostId = -1;
  private ghostMatOk = new THREE.MeshBasicMaterial({ color: 0x9cf5b0, transparent: true, opacity: 0.5, depthWrite: false });
  private ghostMatBad = new THREE.MeshBasicMaterial({ color: 0xff7a7a, transparent: true, opacity: 0.5, depthWrite: false });
  /** outline around the object you're aiming at */
  private sel: THREE.LineSegments;
  constructor(scene: THREE.Scene) {
    scene.add(this.group, this.ghost);
    this.ghost.visible = false;
    this.sel = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xffd874, transparent: true, opacity: 0.95, depthTest: false }));
    this.sel.renderOrder = 6; this.sel.visible = false;
    scene.add(this.sel);
  }
  at(x: number, y: number, z: number) { return this.items.find(d => d.x === x && d.y === y && d.z === z) ?? null; }
  place(id: number, x: number, y: number, z: number, rot: number) {
    if (!MODELS[id] || this.at(x, y, z)) return null;
    const d: DecoItem = { id, x, y, z, rot: ((rot % 4) + 4) % 4 };
    this.build(d);
    this.items.push(d);
    return d;
  }
  private build(d: DecoItem) {
    d.obj?.removeFromParent();
    const o = decoModel(d.id);
    o.position.set(d.x + 0.5, d.y, d.z + 0.5);
    o.rotation.y = d.rot * Math.PI / 2;
    this.group.add(o);
    o.updateMatrixWorld(true);
    d.obj = o; d.box = new THREE.Box3().setFromObject(o).expandByScalar(0.04);
    // flat things (mats, rugs) still need something to aim at
    if (d.box.max.y - d.box.min.y < 0.2) d.box.max.y = d.box.min.y + 0.2;
  }
  turn(d: DecoItem) { d.rot = (d.rot + 1) % 4; this.build(d); }
  remove(d: DecoItem) { d.obj?.removeFromParent(); this.items = this.items.filter(e => e !== d); }
  /** nearest object hit by a ray, with its distance */
  raycast(o: THREE.Vector3, dir: THREE.Vector3, max: number): { d: DecoItem; dist: number } | null {
    const ray = new THREE.Ray(o, dir), p = new THREE.Vector3();
    let best: { d: DecoItem; dist: number } | null = null;
    for (const d of this.items) {
      if (Math.abs(d.x - o.x) > max + 2 || Math.abs(d.z - o.z) > max + 2) continue;
      if (!d.box || !ray.intersectBox(d.box, p)) continue;
      const dist = p.distanceTo(o);
      if (dist <= max && (!best || dist < best.dist)) best = { d, dist };
    }
    return best;
  }
  /** show the yellow outline around `d` (or hide it) */
  select(d: DecoItem | null) {
    if (!d?.box) { this.sel.visible = false; return; }
    const b = d.box, s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    this.sel.position.copy(c); this.sel.scale.copy(s); this.sel.visible = true;
  }
  /** the see-through preview of what you're about to place */
  preview(id: number | null, x = 0, y = 0, z = 0, rot = 0, ok = true) {
    if (id === null || !MODELS[id]) { this.ghost.visible = false; return; }
    if (id !== this.ghostId) {
      this.ghost.clear();
      const g = geometryFor(id);
      for (const geo of [g.lit, g.glow]) if (geo) this.ghost.add(new THREE.Mesh(geo, this.ghostMatOk));
      this.ghostId = id;
    }
    for (const m of this.ghost.children as THREE.Mesh[]) m.material = ok ? this.ghostMatOk : this.ghostMatBad;
    this.ghost.position.set(x + 0.5, y + 0.002, z + 0.5);
    this.ghost.rotation.y = rot * Math.PI / 2;
    this.ghost.visible = true;
  }
  /** drop objects whose floor is gone (returned so the game can give them back) */
  unsupported(isSolid: (x: number, y: number, z: number) => boolean) { return this.items.filter(d => !isSolid(d.x, d.y - 1, d.z)); }
  toJSON(): DecoSave { return this.items.map(d => [d.id, d.x, d.y, d.z, d.rot]); }
  load(s: DecoSave) { for (const d of this.items) d.obj?.removeFromParent(); this.items = []; for (const [id, x, y, z, rot] of s) this.place(id, x, y, z, rot); }
}

/** which way (0..3) a thing placed at (x, z) should face so its front points at the player */
export function faceToward(x: number, z: number, px: number, pz: number): number {
  const dx = px - (x + 0.5), dz = pz - (z + 0.5);
  // 0: front +z, 1: +x, 2: −z, 3: −x  (rotation.y = rot·90°)
  if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? 1 : 3;
  return dz > 0 ? 0 : 2;
}
