// Small life around the player: butterflies over flowers and grass by day,
// birds gliding overhead, fireflies at night, and little fish in the water. Each kind is ONE draw call
// (instanced quads / points), so it costs almost nothing.
import * as THREE from 'three';
import type { World } from '../world/world';
import { B } from '../world/blocks';
import { sparkTexture } from './models';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const FLOWERS = new Set<number>([B.FLOWER_RED, B.FLOWER_YELLOW, B.FLOWER_BLUE, B.FLOWER_PURPLE, B.TALL_GRASS]);
const BUTTERFLY_COLORS = [0xffd23a, 0xff8fb1, 0x8fd3ec, 0xffffff, 0xb388ff, 0xff9f43];

const FISH_COLORS = [0xff8a3d, 0xffd23a, 0xff6f91, 0xff5a3c, 0xb388ff, 0x7be07b];
/** a school of fish: they circle their spot under the water, and dart away from you */
interface School { c: THREE.Vector3; y: number; r: number; n: number; ph: number; dir: number; color: number; flee: number; fx: number; fz: number; jumpIn: number; jump: number; jf: number }

interface Bug { home: THREE.Vector3; pos: THREE.Vector3; ph: number; speed: number; alive: number }

export class Ambient {
  /** butterflies: two flapping wings each, as instanced planes */
  private wings: THREE.InstancedMesh;
  private butterflies: Bug[] = [];
  /** birds: little "v" shapes gliding in loose flocks high up */
  private birds: THREE.InstancedMesh;
  private flock: { c: THREE.Vector3; dir: number; t: number; n: number } | null = null;
  /** fireflies: additive glowing points */
  private flies: THREE.Points;
  private flyPos: Float32Array;
  private flyData: Bug[] = [];
  private v = new THREE.Vector3(); private m = new THREE.Matrix4(); private q = new THREE.Quaternion(); private s = new THREE.Vector3(); private e = new THREE.Euler();
  /** fish: a little body and a tail, instanced */
  private fish: THREE.InstancedMesh;
  private schools: School[] = [];
  /** a fish jumped out of the water here, or dived back in (the game makes a splash and a sparkle) */
  onSplash: ((x: number, y: number, z: number, near: boolean) => void) | null = null;
  private scanT = 0;
  private col = new THREE.Color();
  enabled = true;
  /** fish stay on even with low graphics (one small draw call) */
  fishOn = true;

  static readonly MAX_BUTTERFLIES = 10;
  static readonly MAX_FLIES = 40;
  static readonly MAX_BIRDS = 7;
  static readonly MAX_SCHOOLS = 4;
  static readonly SCHOOL_FISH = 6;

  constructor(private scene: THREE.Scene, private world: World) {
    const wingGeo = new THREE.PlaneGeometry(0.16, 0.12); wingGeo.translate(0.08, 0, 0);
    this.wings = new THREE.InstancedMesh(wingGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.95 }), Ambient.MAX_BUTTERFLIES * 2);
    this.wings.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Ambient.MAX_BUTTERFLIES * 2 * 3), 3);
    this.wings.count = 0; this.wings.frustumCulled = false;
    scene.add(this.wings);

    const birdGeo = new THREE.BufferGeometry();
    birdGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.5, 0.12, -0.15, -0.5, 0.0, -0.05, 0, 0, 0, 0.5, 0.12, -0.15, 0.5, 0.0, -0.05], 3));
    birdGeo.computeVertexNormals();
    this.birds = new THREE.InstancedMesh(birdGeo, new THREE.MeshBasicMaterial({ color: 0x3a3a48, side: THREE.DoubleSide }), Ambient.MAX_BIRDS);
    this.birds.count = 0; this.birds.frustumCulled = false;
    scene.add(this.birds);

    this.flyPos = new Float32Array(Ambient.MAX_FLIES * 3);
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(this.flyPos, 3));
    fg.setDrawRange(0, 0);
    this.flies = new THREE.Points(fg, new THREE.PointsMaterial({ map: sparkTexture(), color: 0xd8ff7a, size: 0.32, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.flies.frustumCulled = false;
    scene.add(this.flies);

    const body = new THREE.BoxGeometry(0.1, 0.13, 0.26), tail = new THREE.BoxGeometry(0.03, 0.14, 0.1), fin = new THREE.BoxGeometry(0.02, 0.05, 0.08);
    tail.translate(0, 0, -0.17); fin.translate(0, 0.09, 0.0);
    const fishGeo = mergeGeometries([body, tail, fin]); body.dispose(); tail.dispose(); fin.dispose();
    this.fish = new THREE.InstancedMesh(fishGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), Ambient.MAX_SCHOOLS * Ambient.SCHOOL_FISH);
    this.fish.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Ambient.MAX_SCHOOLS * Ambient.SCHOOL_FISH * 3), 3);
    // drawn after the water (which is see-through and doesn't hide what's behind it), so the colours stay bright
    this.fish.count = 0; this.fish.frustumCulled = false; this.fish.renderOrder = 5;
    scene.add(this.fish);
  }

  /** a spot in water at least 2 deep near p: the water's top and the floor */
  private findWater(p: THREE.Vector3): { x: number; z: number; top: number; floor: number } | null {
    const W = this.world;
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(p.x + (Math.random() - 0.5) * 36), z = Math.floor(p.z + (Math.random() - 0.5) * 36);
      if (!W.isLoaded(x, z)) continue;
      for (let y = Math.floor(p.y) + 6; y > Math.floor(p.y) - 14; y--) {
        const id = W.get(x, y, z);
        if (id === B.AIR) continue;
        if (id !== B.WATER) break;
        let fl = y; while (fl > y - 8 && W.get(x, fl - 1, z) === B.WATER) fl--;
        if (y - fl >= 1 && !W.roofed(x, y + 1, z)) return { x: x + 0.5, z: z + 0.5, top: y + 1, floor: fl };
        break;
      }
    }
    return null;
  }
  /** is this a water cell? */
  private wet(x: number, y: number, z: number) { return this.world.get(Math.floor(x), Math.floor(y), Math.floor(z)) === B.WATER; }

  get counts() { return { butterflies: this.butterflies.length, birds: this.flock ? this.flock.n : 0, fireflies: this.flyData.length, fish: this.schools.reduce((a, s) => a + s.n, 0) }; }

  /** a flower or tall grass near p, or null (checked a few spots at random) */
  private findFlower(p: THREE.Vector3): THREE.Vector3 | null {
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(p.x + (Math.random() - 0.5) * 24), z = Math.floor(p.z + (Math.random() - 0.5) * 24);
      for (let y = Math.floor(p.y) + 4; y > Math.floor(p.y) - 6; y--) {
        const id = this.world.get(x, y, z);
        if (FLOWERS.has(id)) return new THREE.Vector3(x + 0.5, y + 0.6, z + 0.5);
        if (id && id !== B.AIR) break;
      }
    }
    return null;
  }

  update(dt: number, t: number, player: THREE.Vector3, night: boolean, raining: boolean, underground: boolean) {
    const on = this.enabled && !raining && !underground;
    // ---- butterflies (day): spawn over flowers near the player, drift away when far
    this.scanT -= dt;
    if (this.scanT <= 0) {
      this.scanT = 0.7;
      if (on && !night && this.butterflies.length < Ambient.MAX_BUTTERFLIES) {
        const f = this.findFlower(player);
        if (f) this.butterflies.push({ home: f, pos: f.clone(), ph: Math.random() * 10, speed: 0.6 + Math.random() * 0.5, alive: 0 });
      }
      if (on && night && this.flyData.length < Ambient.MAX_FLIES) {
        for (let k = 0; k < 4 && this.flyData.length < Ambient.MAX_FLIES; k++) {
          const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 12;
          const h = new THREE.Vector3(player.x + Math.cos(a) * r, player.y + 0.4 + Math.random() * 2.2, player.z + Math.sin(a) * r);
          if (this.world.solidAt(Math.floor(h.x), Math.floor(h.y), Math.floor(h.z))) continue;
          this.flyData.push({ home: h, pos: h.clone(), ph: Math.random() * 10, speed: 0.4 + Math.random() * 0.4, alive: 0 });
        }
      }
      // fish in the water nearby (rain or shine, day or night)
      if (this.fishOn && this.schools.length < Ambient.MAX_SCHOOLS) {
        const w = this.findWater(player);
        if (w && !this.schools.some(s => Math.hypot(s.c.x - w.x, s.c.z - w.z) < 5)) {
          const depth = w.top - w.floor;
          this.schools.push({ c: new THREE.Vector3(w.x, 0, w.z), y: w.top - 0.32, r: 0.8 + Math.random() * 1.2, n: 3 + Math.floor(Math.random() * (Ambient.SCHOOL_FISH - 2)), ph: Math.random() * 10, dir: Math.random() < 0.5 ? 1 : -1, color: FISH_COLORS[Math.floor(Math.random() * FISH_COLORS.length)], flee: 0, fx: 0, fz: 0, jumpIn: 2 + Math.random() * 6, jump: -1, jf: 0 });
        }
      }
      // start a flock now and then on clear days
      if (on && !night && !this.flock && Math.random() < 0.08) {
        const dir = Math.random() * Math.PI * 2;
        this.flock = { c: new THREE.Vector3(player.x - Math.sin(dir) * 60, player.y + 22 + Math.random() * 10, player.z - Math.cos(dir) * 60), dir, t: 0, n: 3 + Math.floor(Math.random() * (Ambient.MAX_BIRDS - 2)) };
      }
    }
    const keep = (b: Bug, max: number) => b.home.distanceToSquared(player) < max * max;
    this.butterflies = this.butterflies.filter(b => (on && !night || (b.alive -= dt * 2) > -1) && keep(b, 30));
    this.flyData = this.flyData.filter(b => (on && night || (b.alive -= dt * 2) > -1) && keep(b, 22));
    this.schools = this.schools.filter(s => this.fishOn && Math.hypot(s.c.x - player.x, s.c.z - player.z) < 34 && this.wet(s.c.x, s.y, s.c.z));

    // ---- butterflies: fluttering loops around their flower
    let n = 0;
    for (const b of this.butterflies) {
      b.alive = Math.min(1, b.alive + dt); b.ph += dt * b.speed;
      b.pos.set(b.home.x + Math.sin(b.ph * 1.3) * 1.4 + Math.sin(b.ph * 3.1) * 0.3, b.home.y + 0.5 + Math.sin(b.ph * 2.2) * 0.5 + Math.max(0, 1 - b.alive) * -0.5, b.home.z + Math.cos(b.ph * 1.1) * 1.4);
      const yaw = Math.atan2(Math.cos(b.ph * 1.3) * 1.3, -Math.sin(b.ph * 1.1) * 1.1);
      const flap = Math.sin(t * 22 + b.ph * 5) * 1.1;
      const col = this.col.setHex(BUTTERFLY_COLORS[Math.abs(Math.floor(b.home.x * 7 + b.home.z * 13)) % BUTTERFLY_COLORS.length]);
      for (const side of [1, -1]) {
        this.e.set(-Math.PI / 2 + 0.3, yaw, side * flap, 'YXZ');
        this.q.setFromEuler(this.e);
        this.s.set(side, 1, 1);
        this.m.compose(b.pos, this.q, this.s);
        this.wings.setMatrixAt(n, this.m); this.wings.setColorAt(n, col); n++;
      }
    }
    this.wings.count = n; this.wings.instanceMatrix.needsUpdate = true; if (this.wings.instanceColor) this.wings.instanceColor.needsUpdate = true;

    // ---- fireflies: slow wandering, gently blinking
    let k = 0;
    for (const b of this.flyData) {
      b.alive = Math.min(1, b.alive + dt * 0.5); b.ph += dt * b.speed;
      const blink = 0.5 + 0.5 * Math.sin(t * 2.4 + b.ph * 9);
      this.flyPos[k * 3] = b.home.x + Math.sin(b.ph * 0.9) * 1.6;
      this.flyPos[k * 3 + 1] = b.home.y + Math.sin(b.ph * 1.7) * 0.4 - (blink < 0.15 ? 1000 : 0); // "off" blinks go out of sight
      this.flyPos[k * 3 + 2] = b.home.z + Math.cos(b.ph * 0.7) * 1.6;
      k++;
    }
    this.flies.geometry.setDrawRange(0, k);
    (this.flies.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    // ---- birds: a loose "v" crossing the sky, wings beating then gliding
    let nb = 0;
    if (night && this.flock && this.flock.t < 2) this.flock = null; // birds roost at night
    const fl = this.flock;
    if (fl) {
      fl.t += dt;
      const sp = 7;
      fl.c.x += Math.sin(fl.dir) * sp * dt; fl.c.z += Math.cos(fl.dir) * sp * dt;
      for (let i = 0; i < fl.n; i++) {
        const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
        const off = new THREE.Vector3(side * row * 1.6, Math.sin(fl.t + i) * 0.3, -row * 1.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), fl.dir);
        const beat = Math.sin(t * 9 + i) > -0.2 ? Math.sin(t * 14 + i * 1.7) * 0.6 : 0.1;
        this.e.set(0, fl.dir, 0); this.q.setFromEuler(this.e);
        this.s.set(1, 1 + beat, 1);
        this.m.compose(fl.c.clone().add(off), this.q, this.s);
        this.birds.setMatrixAt(nb++, this.m);
      }
      if (fl.t > 18) this.flock = null;
    }
    this.birds.count = nb; this.birds.instanceMatrix.needsUpdate = true;

    // ---- fish: circling their spot, tails wagging; too close and the school darts off through the water
    let nf = 0;
    for (const sc of this.schools) {
      const dx = sc.c.x - player.x, dz = sc.c.z - player.z, d = Math.hypot(dx, dz);
      if (d < 2.6 && Math.abs(player.y - sc.y) < 3 && sc.flee <= 0) { sc.flee = 1.2; sc.fx = dx / (d || 1); sc.fz = dz / (d || 1); }
      if (sc.flee > 0) {
        sc.flee -= dt;
        const nx = sc.c.x + sc.fx * 4 * dt, nz = sc.c.z + sc.fz * 4 * dt;
        if (this.wet(nx, sc.y, nz)) { sc.c.x = nx; sc.c.z = nz; } else { sc.fx = -sc.fx; sc.fz = -sc.fz; }
      }
      sc.ph += dt * (sc.flee > 0 ? 3.2 : 0.9) * sc.dir;
      // now and then one fish leaps out of the water in an arc and splashes back in
      if (sc.jump < 0 && (sc.jumpIn -= dt) <= 0 && sc.flee <= 0) { sc.jump = 0; sc.jf = Math.floor(Math.random() * sc.n); }
      let jumpFrac = -1;
      if (sc.jump >= 0) {
        const was = sc.jump; sc.jump += dt / 0.9; jumpFrac = sc.jump;
        if (was === 0 || (was < 1 && sc.jump >= 1)) { const a = sc.ph + sc.jf * 0.55; this.onSplash?.(sc.c.x + Math.cos(a) * sc.r, sc.y + 0.32, sc.c.z + Math.sin(a) * sc.r, d < 16); }
        if (sc.jump >= 1) { sc.jump = -1; sc.jumpIn = 3 + Math.random() * 7; jumpFrac = -1; }
      }
      this.col.setHex(sc.color);
      for (let i = 0; i < sc.n; i++) {
        const a = sc.ph + i * 0.55, rr = sc.r + (i % 3) * 0.25;
        let x = sc.c.x + Math.cos(a) * rr, z = sc.c.z + Math.sin(a) * rr;
        const leap = i === sc.jf && jumpFrac >= 0 ? jumpFrac : -1;
        const y = sc.y + Math.sin(t * 1.3 + i) * 0.05 - (i % 2) * 0.12 + (leap >= 0 ? Math.sin(leap * Math.PI) * 1.1 : 0);
        if (!this.wet(x, y, z)) { x = sc.c.x; z = sc.c.z; } // (never out of the water)
        const yaw = Math.atan2(-Math.sin(a) * sc.dir, Math.cos(a) * sc.dir) + Math.sin(t * (sc.flee > 0 ? 30 : 9) + i) * 0.18;
        this.e.set(leap >= 0 ? -Math.cos(leap * Math.PI) * 0.9 : 0, yaw, 0, 'YXZ'); this.q.setFromEuler(this.e);
        const sz = 1.25 + (i % 3) * 0.2; this.s.set(sz, sz, sz);
        this.m.compose(this.v.set(x, y, z), this.q, this.s);
        this.fish.setMatrixAt(nf, this.m); this.fish.setColorAt(nf, this.col); nf++;
      }
    }
    this.fish.count = nf; this.fish.instanceMatrix.needsUpdate = true; if (this.fish.instanceColor) this.fish.instanceColor.needsUpdate = true;
  }
}
