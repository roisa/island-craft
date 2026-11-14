// Naughty beetles: a gentle "enemy" for young players. They come out at dusk
// and in forests, buzz around you and nudge you a little, but can't hurt you
// and you can't lose. Tap them (a toy sword helps) and they pop in a puff of
// sparkles and fly home, leaving a small gift. We shoo them, we don't hurt them.
import * as THREE from 'three';
import { Entity, groundY } from './entities';
import type { World } from '../world/world';
import { mergeRig } from './merge';
import type { Rig } from './models';

export type BugKind = 'beetle' | 'big' | 'king';
export const BUG_HP: Record<BugKind, number> = { beetle: 2, big: 4, king: 9 };
const COLORS: Record<BugKind, { shell: number; spot: number; belly: number }> = {
  beetle: { shell: 0x2f9e6a, spot: 0x1d6b47, belly: 0x223322 },
  big: { shell: 0xd63c3c, spot: 0x2a1a1a, belly: 0x331a1a },
  king: { shell: 0xf2c43a, spot: 0xc98a12, belly: 0x5a4210 },
};
const matCache = new Map<number, THREE.Material>();
const mat = (c: number) => { let m = matCache.get(c); if (!m) matCache.set(c, m = new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.18 })); return m; };
const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };

/** a chunky cartoon beetle (≈0.5 blocks long; the king is bigger) */
export function buildBug(kind: BugKind): Rig & { wings: THREE.Object3D[] } {
  const s = kind === 'king' ? 1.7 : kind === 'big' ? 1.3 : 1;
  const c = COLORS[kind];
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(s);
  body.add(box(0.36, 0.2, 0.46, mat(c.shell), 0, 0.2, 0));
  body.add(box(0.3, 0.06, 0.4, mat(c.belly), 0, 0.09, 0));
  for (const [x, z] of [[-0.09, 0.08], [0.1, -0.08], [-0.06, -0.14], [0.08, 0.14]]) body.add(box(0.08, 0.02, 0.08, mat(c.spot), x, 0.305, z));
  body.add(box(0.02, 0.21, 0.46, mat(c.spot), 0, 0.2, 0)); // the line between the wing cases
  const head = new THREE.Group(); head.position.set(0, 0.2, 0.27); body.add(head);
  head.add(box(0.22, 0.16, 0.12, mat(c.belly), 0, 0, 0));
  head.add(box(0.06, 0.06, 0.02, mat(0xffffff), -0.06, 0.03, 0.065), box(0.06, 0.06, 0.02, mat(0xffffff), 0.06, 0.03, 0.065));
  head.add(box(0.03, 0.03, 0.02, mat(0x111111), -0.06, 0.03, 0.075), box(0.03, 0.03, 0.02, mat(0x111111), 0.06, 0.03, 0.075));
  for (const sx of [-1, 1]) { const a = box(0.02, 0.02, 0.18, mat(c.belly), sx * 0.06, 0.12, 0.1); a.rotation.x = -0.7; head.add(a); }
  if (kind === 'king') for (const x of [-0.07, 0, 0.07]) head.add(box(0.05, 0.08, 0.05, mat(0xffe27a), x, 0.12, 0)); // a little crown
  const legs: THREE.Object3D[] = [];
  for (const z of [-0.14, 0.02, 0.16]) for (const sx of [-1, 1]) {
    const g = new THREE.Group(); g.position.set(sx * 0.17, 0.12, z); body.add(g);
    const l = box(0.14, 0.03, 0.03, mat(c.belly), sx * 0.06, -0.04, 0); l.rotation.z = sx * -0.6; g.add(l);
    legs.push(g);
  }
  const wings: THREE.Object3D[] = [];
  for (const sx of [-1, 1]) {
    const w = new THREE.Group(); w.position.set(sx * 0.08, 0.31, -0.05); body.add(w);
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.01, 0.36), new THREE.MeshBasicMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.55 })); p.position.set(sx * 0.1, 0, -0.05); w.add(p);
    w.visible = false; wings.push(w);
  }
  mergeRig(root, [body, head, ...legs], wings);
  return { root, body, head, legs, height: 0.4 * s, wings };
}

export class Bug extends Entity {
  hp: number;
  /** where the player is (set by the manager every frame) */
  player = new THREE.Vector3();
  private hop = 0; private target: THREE.Vector3 | null = null; private wait = 0;
  private flash = 0; private knock = new THREE.Vector3();
  /** > 0 while flying home after being caught (then it's removed) */
  leaving = 0;
  private wings: THREE.Object3D[];
  private bumpCd = 1;
  onBump: ((b: Bug) => void) | null = null;
  constructor(public kind: BugKind, public world: World) {
    const r = buildBug(kind);
    super(r);
    this.wings = r.wings;
    this.hp = BUG_HP[kind];
    this.radius = kind === 'king' ? 0.55 : 0.4;
  }
  get caught() { return this.leaving > 0; }
  /** a tap: lose some "energy"; at zero it gives up and flies home */
  hit(power: number, from: THREE.Vector3) {
    if (this.caught) return false;
    this.hp -= power;
    this.flash = 0.18;
    const dx = this.pos.x - from.x, dz = this.pos.z - from.z, d = Math.hypot(dx, dz) || 1;
    this.knock.set(dx / d * 4, 3.5, dz / d * 4);
    this.target = null; this.wait = 0.6;
    if (this.hp <= 0) { this.leaving = 1.4; return true; }
    return false;
  }
  update(dt: number, t: number) {
    this.flash = Math.max(0, this.flash - dt); this.bumpCd -= dt;
    const r = this.rig;
    // caught: wings out, spin up and away
    if (this.leaving > 0) {
      this.leaving -= dt;
      this.pos.y += dt * 4; this.yaw += dt * 9;
      for (const w of this.wings) { w.visible = true; w.rotation.z = Math.sin(t * 60) * 0.6; }
      this.sync(t);
      r.root.scale.setScalar(Math.max(0.05, this.leaving / 1.4));
      return;
    }
    // knocked back with a little hop
    if (this.knock.lengthSq() > 0.01) {
      this.pos.x += this.knock.x * dt; this.pos.z += this.knock.z * dt;
      this.hop = Math.max(this.hop, 0.35);
      this.knock.multiplyScalar(Math.max(0, 1 - dt * 6));
    }
    const p = this.player, dxp = p.x - this.pos.x, dzp = p.z - this.pos.z, dp = Math.hypot(dxp, dzp);
    if (!this.target) {
      this.wait -= dt;
      if (this.wait <= 0) {
        if (dp < 8) {
          // curious: circle in close to the player
          const a = Math.atan2(-dzp, -dxp) + (Math.random() - 0.5) * 1.6, rr = 0.9 + Math.random() * 1.2;
          this.target = new THREE.Vector3(p.x + Math.cos(a) * rr, this.pos.y, p.z + Math.sin(a) * rr);
        } else {
          const a = Math.random() * Math.PI * 2;
          this.target = new THREE.Vector3(this.pos.x + Math.cos(a) * 4, this.pos.y, this.pos.z + Math.sin(a) * 4);
        }
      }
      this.moving = false;
    } else {
      const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.25) { this.target = null; this.wait = 0.3 + Math.random() * 1.2; }
      else {
        const sp = (this.kind === 'king' ? 1.6 : 2.2) * dt;
        const nx = this.pos.x + dx / d * Math.min(d, sp), nz = this.pos.z + dz / d * Math.min(d, sp);
        const gy = groundY(this.world, nx, this.pos.y, nz);
        if (gy === null) { this.target = null; this.wait = 0.5; }
        else { this.pos.x = nx; this.pos.z = nz; this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 12); }
        this.yaw = Math.atan2(dx, dz); this.moving = true; this.walk += dt * 22;
        if (Math.random() < dt * 0.8) this.hop = 0.4; // little hops now and then
      }
    }
    // a cheeky bump when it reaches you (pushes a little; never hurts)
    if (dp < 0.7 && Math.abs(p.y - this.pos.y) < 1.5 && this.bumpCd <= 0) { this.bumpCd = 2.5; this.hop = 0.45; this.onBump?.(this); }
    this.hop = Math.max(0, this.hop - dt);
    this.sync(t);
    r.root.position.y += Math.sin((0.45 - this.hop) / 0.45 * Math.PI) * (this.hop > 0 ? 0.35 : 0);
    for (const w of this.wings) { w.visible = this.hop > 0; w.rotation.z = Math.sin(t * 60) * 0.5; }
    r.legs.forEach((l, i) => (l.rotation.y = this.moving ? Math.sin(this.walk + i) * 0.5 : 0));
    r.root.scale.setScalar(this.flash > 0 ? 1.15 : 1);
  }
}

/**
 * Spawns a few beetles around the player at dusk/night and in forests, never
 * in the village, and keeps at most a handful nearby. The game calls
 * update() every frame and handles what happens when one is caught.
 */
export class BugSwarm {
  bugs: Bug[] = [];
  private spawnT = 3;
  static readonly MAX = 4;
  onBump: ((b: Bug) => void) | null = null;
  constructor(private scene: THREE.Scene, private world: World) { }
  /** called every frame; `active` is false in light graphics or when the parents turned beetles off */
  update(dt: number, t: number, player: THREE.Vector3, opts: { night: boolean; forest: boolean; active: boolean; underground: boolean }) {
    this.spawnT -= dt;
    const want = !opts.active ? 0 : opts.night ? BugSwarm.MAX : opts.forest ? 2 : 0;
    const inVillage = Math.hypot(player.x, player.z) < 40;
    if (this.spawnT <= 0) {
      this.spawnT = 4 + Math.random() * 4;
      const near = this.bugs.filter(b => !b.caught).length;
      if (near < want && !inVillage && !opts.underground) this.spawn(player);
    }
    for (const b of this.bugs) { b.player.copy(player); b.update(dt, t); }
    // gone home (caught), too far away, or it's daytime and they wander off
    this.bugs = this.bugs.filter(b => {
      const far = b.pos.distanceToSquared(player) > 45 * 45;
      const done = b.caught && b.leaving <= 0;
      const shy = want === 0 && b.pos.distanceToSquared(player) > 18 * 18;
      if (far || done || shy) { this.scene.remove(b.rig.root); b.rig.root.traverse(o => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose(); }); return false; }
      return true;
    });
  }
  private spawn(player: THREE.Vector3) {
    for (let k = 0; k < 6; k++) {
      const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 8;
      const x = player.x + Math.cos(a) * r, z = player.z + Math.sin(a) * r;
      if (Math.hypot(x, z) < 40) continue; // the village stays a safe place
      const gy = groundY(this.world, x, player.y + 4, z) ?? groundY(this.world, x, player.y, z);
      if (gy === null) continue;
      const roll = Math.random();
      const kind: BugKind = roll < 0.05 ? 'king' : roll < 0.3 ? 'big' : 'beetle';
      const b = new Bug(kind, this.world);
      b.pos.set(x, gy, z); b.yaw = Math.random() * 6.28;
      b.onBump = bb => this.onBump?.(bb);
      this.scene.add(b.rig.root);
      this.bugs.push(b);
      return b;
    }
    return null;
  }
  /** nearest beetle on a ray (for tapping / aiming) */
  raycast(o: THREE.Vector3, dir: THREE.Vector3, max: number, pad = 0.15): { bug: Bug; dist: number } | null {
    let best: { bug: Bug; dist: number } | null = null;
    const c = new THREE.Vector3();
    for (const b of this.bugs) {
      if (b.caught) continue;
      c.copy(b.pos); c.y += b.rig.height * 0.5;
      const oc = c.clone().sub(o), tca = oc.dot(dir);
      if (tca < 0 || tca > max) continue;
      const d2 = oc.lengthSq() - tca * tca, r = b.radius + pad;
      if (d2 > r * r) continue;
      const th = tca - Math.sqrt(r * r - d2);
      if (!best || th < best.dist) best = { bug: b, dist: th };
    }
    return best;
  }
  /** what a caught beetle leaves behind */
  static drops(kind: BugKind, r: number): [string, number][] {
    if (kind === 'king') return [['crystal', 3], ['gold', 2]];
    if (kind === 'big') return r < 0.5 ? [['crystal', 1]] : [['coal', 2]];
    return r < 0.3 ? [['dates', 1]] : r < 0.6 ? [['stick', 2]] : [['coal', 1]];
  }
}
