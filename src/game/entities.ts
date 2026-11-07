// Friendly creatures, villagers and Baby Mo, the companion who follows you.
import * as THREE from 'three';
import type { World, Chunk } from '../world/world';
import { CS, Biome, VILLAGE_Y } from '../world/gen';
import { B, BLOCKS } from '../world/blocks';
import { mulberry32 } from '../world/noise';
import { buildAnimal, nameTag, AnimalKind, Rig, applyPrayerPose, clearPose, poseAt } from './models';
import { buildBlocky, BlockyOpts, BABY_MO } from './blocky';
import { Animator, applyPose, type AnimInput } from './animator';
import type { T2 } from '../i18n';

export abstract class Entity {
  pos = new THREE.Vector3();
  yaw = 0;
  walk = 0;           // walk animation phase
  moving = false;
  radius = 0.5;
  /** humanoids get the full animator; animals keep the simple leg swing */
  anim: Animator | null = null;
  swimming = false;
  private last = new THREE.Vector3(NaN, 0, 0);
  private animIn: AnimInput = { speed: 0, grounded: true, vy: 0 };
  constructor(public rig: Rig) { }
  abstract update(dt: number, t: number): void;
  private blinkSeed = Math.random() * 10;
  sync(t: number, dt = 1 / 60) {
    const r = this.rig;
    if (r.blink) { const ph = (t + this.blinkSeed) % 4.2; r.blink(ph < 0.13 || (ph > 0.3 && ph < 0.42 && this.blinkSeed > 6)); }
    r.root.position.copy(this.pos);
    r.root.rotation.y = this.yaw;
    if (this.anim) {
      // speed from the actual movement this frame, so the stride matches the ground
      const d = Number.isNaN(this.last.x) || dt <= 0 ? 0 : Math.hypot(this.pos.x - this.last.x, this.pos.z - this.last.z) / dt;
      const inp = this.animIn;
      inp.speed = d > 20 ? 0 : d; // teleports don't count
      inp.grounded = true; inp.vy = 0; inp.swimming = this.swimming;
      this.last.copy(this.pos);
      applyPose(r, this.anim.update(dt, t, inp));
      return;
    }
    const sw = this.moving ? Math.sin(this.walk) * 0.6 : 0;
    r.legs.forEach((l, i) => (l.rotation.x = (i % 2 === (i < 2 ? 0 : 1) ? sw : -sw)));
    if (r.armL) r.armL.rotation.x = -sw * 0.8;
    if (r.armR && !(this as any).waving) r.armR.rotation.x = sw * 0.8;
    r.body.position.y = this.moving ? Math.abs(Math.sin(this.walk)) * 0.04 : 0;
    if (!this.moving) r.body.scale.y = 1 + Math.sin(t * 2.2 + this.blinkSeed) * 0.012; else r.body.scale.y = 1;
  }
}

/** y of the water surface near (x, y, z), or null if there's no water there. */
export function waterSurface(world: World, x: number, y: number, z: number): number | null {
  const fx = Math.floor(x), fz = Math.floor(z);
  for (let yy = Math.floor(y) + 2; yy >= Math.floor(y) - 4; yy--) {
    if (world.get(fx, yy, fz) === B.WATER && world.get(fx, yy + 1, fz) !== B.WATER) return yy + 1;
  }
  return null;
}

/** Stand on the nearest walkable surface around y. */
export function groundY(world: World, x: number, y: number, z: number): number | null {
  const fx = Math.floor(x), fz = Math.floor(z);
  if (!world.isLoaded(fx, fz)) return null;
  for (let yy = Math.floor(y) + 1; yy >= Math.floor(y) - 4; yy--) {
    const id = world.get(fx, yy - 1, fz);
    if (id === B.WATER) return null;
    if (BLOCKS[id]?.solid && !world.solidAt(fx, yy, fz) && !world.solidAt(fx, yy + 1, fz)) return yy;
  }
  return null;
}

// ---- animals ------------------------------------------------------------------
export const ANIMAL_NAME: Record<AnimalKind, T2> = {
  chicken: ['Ayam', 'Chicken'], sheep: ['Domba', 'Sheep'], cow: ['Sapi', 'Cow'], camel: ['Unta', 'Camel'], goat: ['Kambing', 'Goat'], cat: ['Kucing', 'Cat'],
};

export class Animal extends Entity {
  target: THREE.Vector3 | null = null;
  wait = Math.random() * 3;
  cooldown = 0;          // produce cooldown (seconds)
  sheared = false;
  hop = 0;
  chunk = '';
  follow: (() => THREE.Vector3) | null = null;   // pets follow their friend
  tagObj?: THREE.Object3D;
  ridden = false;
  constructor(public kind: AnimalKind, public world: World) {
    super(buildAnimal(kind));
    this.radius = kind === 'chicken' || kind === 'cat' ? 0.45 : kind === 'camel' ? 0.9 : 0.7;
  }
  update(dt: number, t: number) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.hop = Math.max(0, this.hop - dt);
    if (this.ridden) return; // moved by the rider
    if (this.follow) {
      const f = this.follow(), d = Math.hypot(f.x - this.pos.x, f.z - this.pos.z);
      if (d > 18 || Math.abs(f.y - this.pos.y) > 6) { this.pos.set(f.x - 1.5, f.y, f.z + 1.5); this.target = null; }
      else if (d > 3) { this.target = new THREE.Vector3(f.x + (this.pos.x - f.x) / d * 2, f.y, f.z + (this.pos.z - f.z) / d * 2); this.wait = 0; }
    }
    if (!this.target) {
      this.moving = false;
      this.wait -= dt;
      if (this.wait <= 0) {
        const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 5;
        this.target = new THREE.Vector3(this.pos.x + Math.cos(a) * r, this.pos.y, this.pos.z + Math.sin(a) * r);
      }
    } else {
      const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.3) { this.target = null; this.wait = 2 + Math.random() * 5; }
      else {
        const sp = (this.follow ? 4.2 : this.kind === 'chicken' || this.kind === 'cat' ? 1.4 : this.kind === 'camel' ? 1.1 : 1.0) * dt;
        const nx = this.pos.x + dx / d * sp, nz = this.pos.z + dz / d * sp;
        const gy = groundY(this.world, nx, this.pos.y, nz);
        if (gy === null || Math.abs(gy - this.pos.y) > 1.1) { if (this.follow) { this.pos.x = nx; this.pos.z = nz; const sy = waterSurface(this.world, nx, this.pos.y, nz); if (sy !== null) this.pos.y = sy - 0.5; } else { this.target = null; this.wait = 1 + Math.random() * 2; } }
        else { this.pos.x = nx; this.pos.z = nz; this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 10); }
        const want = Math.atan2(dx, dz);
        let diff = want - this.yaw; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
        this.yaw += diff * Math.min(1, dt * 5);
        this.moving = true; this.walk += dt * 9;
      }
    }
    this.sync(t);
    if (this.hop > 0) this.rig.root.position.y += Math.sin((0.5 - this.hop) / 0.5 * Math.PI) * 0.4;
    if (this.rig.head && !this.moving) this.rig.head.rotation.x = Math.sin(t * 0.8 + this.pos.x) * 0.15;
    const wool = (this.rig as any).wool as THREE.Object3D | undefined;
    if (wool) wool.scale.set(this.sheared ? 0.82 : 1, this.sheared ? 0.8 : 1, this.sheared ? 0.92 : 1);
  }
}

// ---- villagers ------------------------------------------------------------------
export type NpcId = 'ustadz' | 'aminah' | 'yusuf' | 'adam';
export class Npc extends Entity {
  target: THREE.Vector3 | null = null;
  wait = 2;
  goingToMasjid = false;
  praying = false;
  activity: 'pray' | 'picnic' = 'pray';
  faceTo: THREE.Vector3 | null = null;
  tag: THREE.Sprite;
  waving = false;
  constructor(public id: NpcId, public name: string, opts: BlockyOpts, public home: THREE.Vector3, public world: World) {
    super(buildBlocky(opts));
    this.anim = new Animator();
    this.pos.copy(home);
    this.tag = nameTag(name, '#FFD874');
    this.tag.position.y = this.rig.height + 0.32;
    this.rig.root.add(this.tag);
    this.radius = 0.6;
  }
  update(dt: number, t: number) {
    if (!this.target) {
      this.moving = false; this.wait -= dt;
      if (this.wait <= 0 && !this.goingToMasjid) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * 4;
        this.target = new THREE.Vector3(this.home.x + Math.cos(a) * r, this.home.y, this.home.z + Math.sin(a) * r);
      }
    } else {
      const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.25) { this.target = null; this.wait = 3 + Math.random() * 6; }
      else {
        const sp = Math.min(d, 1.6 * dt);
        const nx = this.pos.x + dx / d * sp, nz = this.pos.z + dz / d * sp;
        const gy = groundY(this.world, nx, this.pos.y, nz);
        if (gy === null || Math.abs(gy - this.pos.y) > 1.1) { this.pos.x = nx; this.pos.z = nz; } // villagers know the way
        else { this.pos.x = nx; this.pos.z = nz; this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 10); }
        this.yaw = Math.atan2(dx, dz);
        this.moving = true; this.walk += dt * 8;
      }
    }
    if (this.waving) this.anim!.play('wave'); else this.anim!.stop('wave');
    this.sync(t, dt);
    // at the masjid during prayer time: pray together, facing the qibla wall (north)
    if (this.goingToMasjid && !this.target) {
      if (this.activity === 'picnic' && this.faceTo) this.yaw = Math.atan2(this.faceTo.x - this.pos.x, this.faceTo.z - this.pos.z); else this.yaw = Math.PI;
      this.rig.root.rotation.y = this.yaw; applyPrayerPose(this.rig, this.activity === 'picnic' ? 'julus' : poseAt(t)); this.praying = true; return;
    }
    if (this.praying) { clearPose(this.rig); this.praying = false; this.sync(t, 0); }
  }
  /** walk to the masjid for jama'ah prayer, or home again */
  goPray(on: boolean, spot: THREE.Vector3, activity: 'pray' | 'picnic' = 'pray', faceTo: THREE.Vector3 | null = null) {
    this.goingToMasjid = on; this.activity = activity; this.faceTo = faceTo;
    if (this.praying) { clearPose(this.rig); this.praying = false; }
    this.target = on ? spot.clone() : this.home.clone();
  }
  lookAt(p: THREE.Vector3) { this.yaw = Math.atan2(p.x - this.pos.x, p.z - this.pos.z); }
}

// ---- Baby Mo ---------------------------------------------------------------------
export class Companion extends Entity {
  celebrate = 0;
  tag: THREE.Sprite;
  constructor(public world: World, public follow: () => { pos: THREE.Vector3; yaw: number; fp?: boolean }) {
    super(buildBlocky(BABY_MO));
    this.anim = new Animator();
    this.tag = nameTag('Baby Mo', '#9BF29A');
    this.tag.position.y = this.rig.height + 0.2;
    this.rig.root.add(this.tag);
  }
  update(dt: number, t: number) {
    const f = this.follow();
    const ang = f.yaw + (f.fp ? -2.65 : 2.3), dist = f.fp ? 3.6 : 1.8; // in first person stay ahead-left where you can see him
    const tx = f.pos.x + Math.sin(ang) * dist, tz = f.pos.z + Math.cos(ang) * dist;
    const dx = tx - this.pos.x, dz = tz - this.pos.z, d = Math.hypot(dx, dz);
    if (d > 14 || Math.abs(f.pos.y - this.pos.y) > 6) { this.pos.set(tx, f.pos.y, tz); }
    else if (d > 0.4) {
      const sp = Math.min(d, (d > 4 ? 6.5 : 4.2) * dt);
      const nx = this.pos.x + dx / d * sp, nz = this.pos.z + dz / d * sp;
      const gy = groundY(this.world, nx, this.pos.y, nz);
      this.pos.x = nx; this.pos.z = nz;
      if (gy !== null) { this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 10); this.swimming = false; }
      else {
        // swim across water (head above the surface), or hop over gaps after you
        const sy = waterSurface(this.world, nx, this.pos.y, nz);
        this.swimming = sy !== null;
        const ty = sy !== null ? sy - 0.75 + Math.sin(t * 3) * 0.05 : f.pos.y;
        this.pos.y += (ty - this.pos.y) * Math.min(1, dt * 4);
      }
      this.moving = true; this.walk += dt * 10;
      this.yaw = Math.atan2(dx, dz);
    } else {
      this.moving = false;
      const want = Math.atan2(f.pos.x - this.pos.x, f.pos.z - this.pos.z);
      this.yaw += (want - this.yaw) * Math.min(1, dt * 3);
    }
    if (this.celebrate > 0) { this.celebrate -= dt; this.anim!.play('celebrate'); } else this.anim!.stop('celebrate');
    this.sync(t, dt);
  }
}

// ---- manager ---------------------------------------------------------------------
const BIOME_ANIMALS: Partial<Record<Biome, AnimalKind[]>> = {
  [Biome.MEADOW]: ['sheep', 'cow', 'chicken', 'sheep'],
  [Biome.FOREST]: ['chicken', 'cow', 'sheep'],
  [Biome.DESERT]: ['camel', 'camel', 'goat'],
  [Biome.SNOWY]: ['goat', 'sheep'],
  [Biome.MOUNTAIN]: ['goat'],
  [Biome.BEACH]: ['chicken'],
};

export class Entities {
  animals: Animal[] = [];
  npcs: Npc[] = [];
  mo!: Companion;
  constructor(public scene: THREE.Scene, public world: World, public seed: number) { }

  spawnForChunk(c: Chunk) {
    const rnd = mulberry32((c.cx * 92837111) ^ (c.cz * 689287499) ^ this.seed ^ 0xa11);
    const isVillage = c.biome === Biome.VILLAGE;
    if (isVillage && c.cx === 0 && c.cz === 0) {
      this.spawn('cat', 4.5, VILLAGE_Y + 1, 2.5, c);
      for (let i = 0; i < 3; i++) this.spawn('chicken', -10 + i, VILLAGE_Y + 1, 14 + i, c);
      this.spawn('sheep', 18, VILLAGE_Y + 1, -6, c); this.spawn('sheep', 20, VILLAGE_Y + 1, -3, c);
      this.spawn('cow', -18, VILLAGE_Y + 1, -5, c);
      this.spawn('camel', -20, VILLAGE_Y + 1, 0, c);
      return;
    }
    const kinds = BIOME_ANIMALS[c.biome];
    if (!kinds || rnd() > 0.3) return;
    const kind = kinds[Math.floor(rnd() * kinds.length)];
    const n = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const lx = 2 + Math.floor(rnd() * 12), lz = 2 + Math.floor(rnd() * 12);
      const x = c.cx * CS + lx + 0.5, z = c.cz * CS + lz + 0.5;
      const y = c.hm[lz * CS + lx] + 1;
      const below = c.data[((y - 1) * CS + lz) * CS + lx];
      if (below === B.WATER || below === B.OAK_LEAVES || below === B.PINE_LEAVES || below === B.PALM_LEAVES) continue;
      this.spawn(kind, x, y, z, c);
    }
  }
  private spawn(kind: AnimalKind, x: number, y: number, z: number, c: Chunk) {
    const a = new Animal(kind, this.world);
    a.pos.set(x, y, z); a.yaw = Math.random() * 6.28; a.chunk = c.key();
    this.animals.push(a); this.scene.add(a.rig.root);
  }
  despawnChunk(c: Chunk) {
    const k = c.key();
    this.animals = this.animals.filter(a => { if (a.chunk === k) { this.scene.remove(a.rig.root); return false; } return true; });
  }
  addNpc(n: Npc) { this.npcs.push(n); this.scene.add(n.rig.root); }

  update(dt: number, t: number, center: THREE.Vector3) {
    for (const a of this.animals) if (a.pos.distanceToSquared(center) < 90 * 90) a.update(dt, t);
    for (const n of this.npcs) n.update(dt, t);
    this.mo?.update(dt, t);
  }

  /** nearest entity hit by a ray */
  raycast(o: THREE.Vector3, dir: THREE.Vector3, maxDist: number, pad = 0): Entity | null {
    let best: Entity | null = null, bd = maxDist;
    const all: Entity[] = [...this.animals, ...this.npcs, ...(this.mo ? [this.mo] : [])];
    const c = new THREE.Vector3();
    for (const e of all) {
      c.copy(e.pos); c.y += e.rig.height * 0.5;
      const oc = c.clone().sub(o);
      const tca = oc.dot(dir);
      if (tca < 0 || tca > bd + e.radius) continue;
      const d2 = oc.lengthSq() - tca * tca;
      const r = Math.max(e.radius, e.rig.height * 0.45) + pad;
      if (d2 > r * r) continue;
      const th = tca - Math.sqrt(r * r - d2);
      if (th < bd) { bd = th; best = e; }
    }
    return best;
  }
}
