// Small life around the player: butterflies over flowers and grass by day,
// birds gliding overhead, and fireflies at night. Each kind is ONE draw call
// (instanced quads / points), so it costs almost nothing.
import * as THREE from 'three';
import type { World } from '../world/world';
import { B } from '../world/blocks';
import { sparkTexture } from './models';

const FLOWERS = new Set<number>([B.FLOWER_RED, B.FLOWER_YELLOW, B.FLOWER_BLUE, B.FLOWER_PURPLE, B.TALL_GRASS]);
const BUTTERFLY_COLORS = [0xffd23a, 0xff8fb1, 0x8fd3ec, 0xffffff, 0xb388ff, 0xff9f43];

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
  private m = new THREE.Matrix4(); private q = new THREE.Quaternion(); private s = new THREE.Vector3(); private e = new THREE.Euler();
  private scanT = 0;
  private col = new THREE.Color();
  enabled = true;

  static readonly MAX_BUTTERFLIES = 10;
  static readonly MAX_FLIES = 40;
  static readonly MAX_BIRDS = 7;

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
  }

  get counts() { return { butterflies: this.butterflies.length, birds: this.flock ? this.flock.n : 0, fireflies: this.flyData.length }; }

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
      // start a flock now and then on clear days
      if (on && !night && !this.flock && Math.random() < 0.08) {
        const dir = Math.random() * Math.PI * 2;
        this.flock = { c: new THREE.Vector3(player.x - Math.sin(dir) * 60, player.y + 22 + Math.random() * 10, player.z - Math.cos(dir) * 60), dir, t: 0, n: 3 + Math.floor(Math.random() * (Ambient.MAX_BIRDS - 2)) };
      }
    }
    const keep = (b: Bug, max: number) => b.home.distanceToSquared(player) < max * max;
    this.butterflies = this.butterflies.filter(b => (on && !night || (b.alive -= dt * 2) > -1) && keep(b, 30));
    this.flyData = this.flyData.filter(b => (on && night || (b.alive -= dt * 2) > -1) && keep(b, 22));

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
  }
}
