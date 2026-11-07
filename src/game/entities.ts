// Friendly creatures, villagers and Baby Mo, the companion who follows you.
import * as THREE from 'three';
import type { World, Chunk } from '../world/world';
import { CS, Biome, VILLAGE_Y } from '../world/gen';
import { B, BLOCKS } from '../world/blocks';
import { mulberry32 } from '../world/noise';
import { buildAnimal, nameTag, speechBubble, AnimalKind, Rig, applyPrayerPose, clearPose, poseAt } from './models';
import { routineAt, placeY, GREETINGS, type Activity, type Place } from './routines';
import { tr } from '../i18n';
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
  protected animIn: AnimInput = { speed: 0, grounded: true, vy: 0 };
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
  /** seconds until petting counts again (stops tap-spamming for stars) */
  petCd = 0;
  /** running away after a fright; while > 0 it moves faster */
  flee = 0;
  private startleCd = 0;
  private happy = 0;
  private lookYaw = 0;
  constructor(public kind: AnimalKind, public world: World) {
    super(buildAnimal(kind));
    this.radius = kind === 'chicken' || kind === 'cat' ? 0.45 : kind === 'camel' ? 0.9 : 0.7;
  }
  /** asleep: settled low with the head down, breathing slowly */
  private sleepUpdate(dt: number, t: number) {
    this.moving = false; this.target = null;
    this.sync(t, dt);
    const r = this.rig;
    r.root.position.y -= r.height * 0.12;
    r.root.scale.set(1, 0.9 + Math.sin(t * 1.4 + this.pos.x) * 0.012, 1);
    if (r.head) { r.head.rotation.x = 0.55; r.head.rotation.y = 0.3; }
    r.legs.forEach(l => (l.rotation.x = 0));
  }
  /** a fright: scurry a few blocks away from `from`, unless it's someone's pet or being ridden */
  startle(from: THREE.Vector3) {
    if (this.follow || this.ridden || this.startleCd > 0 || this.kind === 'camel') return false;
    const dx = this.pos.x - from.x, dz = this.pos.z - from.z, d = Math.hypot(dx, dz) || 1;
    const run = this.kind === 'chicken' ? 4.5 : 3.5;
    this.target = new THREE.Vector3(this.pos.x + dx / d * run + (Math.random() - 0.5) * 1.5, this.pos.y, this.pos.z + dz / d * run + (Math.random() - 0.5) * 1.5);
    this.flee = 1.4; this.startleCd = 4; this.hop = Math.max(this.hop, 0.3); this.wait = 0;
    return true;
  }
  /** petted: a happy hop and a nod */
  cheer() { this.hop = 0.5; this.happy = 1.2; this.target = null; this.wait = 2; this.flee = 0; }
  /** called by the manager with the player's position: notice them, or get startled by a sprint */
  sense(p: THREE.Vector3, playerSpeed: number) {
    const d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
    this.near = d < 5 && Math.abs(p.y - this.pos.y) < 3 ? p : null;
    if (playerSpeed > 5.5 && d < 2.6 && Math.abs(p.y - this.pos.y) < 2) return this.startle(p);
    return false;
  }
  private near: THREE.Vector3 | null = null;
  /** night: lie down and sleep (pets still follow their friend) */
  sleeping = false;
  private grazeT = 2 + Math.random() * 6; private grazing = 0;
  /** a happy spin, for your pet */
  spin = 0;
  update(dt: number, t: number) {
    if (this.sleeping && !this.follow && !this.ridden && this.flee <= 0) return this.sleepUpdate(dt, t);
    if (this.rig.root.scale.y !== 1) this.rig.root.scale.set(1, 1, 1);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.hop = Math.max(0, this.hop - dt);
    this.petCd = Math.max(0, this.petCd - dt);
    this.flee = Math.max(0, this.flee - dt);
    this.startleCd = Math.max(0, this.startleCd - dt);
    this.happy = Math.max(0, this.happy - dt);
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
        const sp = (this.follow ? 4.2 : this.kind === 'chicken' || this.kind === 'cat' ? 1.4 : this.kind === 'camel' ? 1.1 : 1.0) * (this.flee > 0 ? 3 : 1) * dt;
        const nx = this.pos.x + dx / d * sp, nz = this.pos.z + dz / d * sp;
        const gy = groundY(this.world, nx, this.pos.y, nz);
        if (gy === null || Math.abs(gy - this.pos.y) > 1.1) { if (this.follow) { this.pos.x = nx; this.pos.z = nz; const sy = waterSurface(this.world, nx, this.pos.y, nz); if (sy !== null) this.pos.y = sy - 0.5; } else { this.target = null; this.wait = 1 + Math.random() * 2; } }
        else { this.pos.x = nx; this.pos.z = nz; this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 10); }
        const want = Math.atan2(dx, dz);
        let diff = want - this.yaw; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
        this.yaw += diff * Math.min(1, dt * 5);
        this.moving = true; this.walk += dt * (this.flee > 0 ? 20 : 9);
      }
    }
    this.sync(t);
    if (this.hop > 0) this.rig.root.position.y += Math.sin((0.5 - this.hop) / 0.5 * Math.PI) * 0.4;
    // when standing: look at a nearby player (head turns, within reach of the neck), nod when happy
    if (this.spin > 0) { this.spin = Math.max(0, this.spin - dt); this.rig.root.rotation.y = this.yaw + (1 - this.spin / 0.7) * Math.PI * 2; }
    // grazing (heads down to the grass) or pecking (chickens), when nobody is close
    this.grazeT -= dt;
    if (!this.moving && !this.near && this.grazeT <= 0 && this.grazing <= 0) { this.grazing = 2 + Math.random() * 2.5; this.grazeT = 5 + Math.random() * 8; }
    if (this.moving || this.near) this.grazing = 0;
    let wantLook = 0;
    if (this.near && !this.moving && !this.ridden) {
      let a = Math.atan2(this.near.x - this.pos.x, this.near.z - this.pos.z) - this.yaw;
      while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2;
      wantLook = Math.max(-0.9, Math.min(0.9, a));
    }
    this.lookYaw += (wantLook - this.lookYaw) * Math.min(1, dt * 4);
    if (this.rig.head) {
      this.rig.head.rotation.y = this.lookYaw;
      if (this.happy > 0) this.rig.head.rotation.x = Math.sin(t * 14) * 0.25;
      else if (this.grazing > 0) { this.grazing -= dt; this.rig.head.rotation.x = this.kind === 'chicken' ? 0.5 + Math.max(0, Math.sin(t * 16)) * 0.5 : 0.75 + Math.sin(t * 5) * 0.06; }
      else if (!this.moving) this.rig.head.rotation.x = this.near ? -0.1 : Math.sin(t * 0.8 + this.pos.x) * 0.15;
      else this.rig.head.rotation.x = 0;
    }
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
  /** where the day plan says to be and what to do there (null: wander near home) */
  routine: { place: Place; at: string; act: Activity } | null = null;
  /** another villager to chat with, when both are at the same place */
  chatWith: Entity | null = null;
  greetCd = 3 + Math.random() * 4;
  private placeKey = '';
  private facePt = new THREE.Vector3(); private faceT = 0;
  private bubble: THREE.Sprite | null = null; private bubbleT = 0;
  private actT = Math.random() * 5;
  private seated = false;
  constructor(public id: NpcId, public name: string, opts: BlockyOpts, public home: THREE.Vector3, public world: World) {
    super(buildBlocky(opts));
    this.anim = new Animator();
    this.pos.copy(home);
    this.tag = nameTag(name, '#FFD874');
    this.tag.position.y = this.rig.height + 0.32;
    this.rig.root.add(this.tag);
    this.radius = 0.6;
  }
  get act(): Activity | null { return !this.goingToMasjid && !this.target && this.routine ? this.routine.act : null; }
  get asleep() { return this.act === 'sleep'; }
  /** follow the day plan (called about once a second); prayer time comes first */
  setRoutine(r: { place: Place; at: string; act: Activity }) {
    this.routine = r;
    if (this.goingToMasjid) return;
    const key = r.at + ':' + r.act;
    if (key === this.placeKey) return;
    this.placeKey = key;
    this.target = new THREE.Vector3(r.place.x, placeY, r.place.z);
  }
  /** a bubble over the head for a few seconds */
  say(text: string, secs = 3) {
    if (this.bubble) { this.bubble.removeFromParent(); this.bubble.material.map?.dispose(); this.bubble.material.dispose(); }
    this.bubble = speechBubble(text);
    this.bubble.position.y = this.rig.height + 0.95;
    this.rig.root.add(this.bubble);
    this.bubbleT = secs;
  }
  /** you walked up: turn to you, wave and say hello (once in a while) */
  greet(p: THREE.Vector3) {
    if (this.greetCd > 0 || this.target || this.goingToMasjid || this.asleep) return false;
    this.greetCd = 40;
    this.lookAt(p, 4);
    this.anim!.play('wave', 1.6);
    const lines = GREETINGS[this.routine?.act ?? 'stand'];
    const [id, en] = lines[Math.floor(Math.random() * lines.length)];
    this.say(tr(id, en), 3.2);
    return true;
  }
  update(dt: number, t: number) {
    this.greetCd -= dt; this.faceT -= dt; this.actT -= dt;
    if (this.bubble && (this.bubbleT -= dt) <= 0) { this.bubble.removeFromParent(); this.bubble.material.map?.dispose(); this.bubble.material.dispose(); this.bubble = null; }
    if (!this.target) {
      this.moving = false; this.wait -= dt;
      if (!this.routine && this.wait <= 0 && !this.goingToMasjid) {
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
    // at their place: face the right way (you, a friend, or the work) and do the activity
    const act = this.act;
    if (act) {
      let want = this.routine!.place.yaw;
      if (this.faceT > 0) want = Math.atan2(this.facePt.x - this.pos.x, this.facePt.z - this.pos.z);
      else if (act === 'chat' && this.chatWith) want = Math.atan2(this.chatWith.pos.x - this.pos.x, this.chatWith.pos.z - this.pos.z);
      let dy = want - this.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      this.yaw += dy * Math.min(1, dt * 4);
      if (act === 'read' && this.faceT <= 0) this.anim!.play('read'); else this.anim!.stop('read');
      if ((act === 'water' || act === 'garden') && this.actT <= 0) { this.actT = 5 + Math.random() * 4; this.anim!.play('collect'); }
      if (act === 'chat' && this.chatWith && this.actT <= 0) { this.actT = 4 + Math.random() * 4; if (!this.bubble) this.say(['💬', '😊', '🌴?', '👍', '😄'][Math.floor(Math.random() * 5)], 1.8); }
      if (act === 'sleep' && this.actT <= 0) { this.actT = 6; if (!this.bubble) this.say('💤', 2.5); }
    } else this.anim!.stop('read');
    if (this.waving) this.anim!.play('wave'); else if (this.faceT <= 0) this.anim!.stop('wave');
    this.sync(t, dt);
    // at the masjid during prayer time: pray together, facing the qibla wall (north)
    if (this.goingToMasjid && !this.target) {
      if (this.activity === 'picnic' && this.faceTo) this.yaw = Math.atan2(this.faceTo.x - this.pos.x, this.faceTo.z - this.pos.z); else this.yaw = Math.PI;
      this.rig.root.rotation.y = this.yaw; applyPrayerPose(this.rig, this.activity === 'picnic' ? 'julus' : poseAt(t)); this.praying = true; return;
    }
    if (this.praying) { clearPose(this.rig); this.praying = false; this.sync(t, 0); }
    // sitting on the plaza, or asleep (sitting back, eyes closed)
    if (act === 'sit' || act === 'sleep') {
      applyPrayerPose(this.rig, 'julus'); this.seated = true;
      if (act === 'sleep') { this.rig.blink?.(true); this.rig.head.rotation.x = 0.35; }
    } else if (this.seated) { clearPose(this.rig); this.seated = false; this.sync(t, 0); }
  }
  /** walk to the masjid for jama'ah prayer, or home again */
  goPray(on: boolean, spot: THREE.Vector3, activity: 'pray' | 'picnic' = 'pray', faceTo: THREE.Vector3 | null = null) {
    this.goingToMasjid = on; this.activity = activity; this.faceTo = faceTo;
    if (this.praying) { clearPose(this.rig); this.praying = false; }
    this.placeKey = ''; // after prayer, pick the day plan up again
    this.target = on ? spot.clone() : this.routine ? new THREE.Vector3(this.routine.place.x, placeY, this.routine.place.z) : this.home.clone();
  }
  /** turn towards p now and keep facing it for a few seconds */
  lookAt(p: THREE.Vector3, secs = 5) { this.yaw = Math.atan2(p.x - this.pos.x, p.z - this.pos.z); this.facePt.copy(p); this.faceT = secs; }
}

// ---- Baby Mo ---------------------------------------------------------------------
export class Companion extends Entity {
  celebrate = 0;
  /** jama'ah: a place in the prayer row; Baby Mo walks there and prays with the villagers */
  prayAt: THREE.Vector3 | null = null;
  praying = false;
  tag: THREE.Sprite;
  constructor(public world: World, public follow: () => { pos: THREE.Vector3; yaw: number; fp?: boolean }) {
    super(buildBlocky(BABY_MO));
    this.anim = new Animator();
    this.tag = nameTag('Baby Mo', '#9BF29A');
    this.tag.position.y = this.rig.height + 0.2;
    this.rig.root.add(this.tag);
  }
  /** sitting on something that moves (the raft): Baby Mo rides along */
  seat: { pos: THREE.Vector3; yaw: number } | null = null;
  update(dt: number, t: number) {
    const f = this.follow();
    if (this.seat) { this.pos.copy(this.seat.pos); this.yaw = this.seat.yaw; this.animIn.riding = true; this.swimming = false; this.sync(t, dt); return; }
    this.animIn.riding = false;
    if (this.prayAt) return this.prayUpdate(dt, t);
    if (this.praying) { clearPose(this.rig); this.praying = false; }
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
    // drinking water comes first; a celebration waits until the glass is empty
    if (this.celebrate > 0 && this.glassT <= 0) { this.celebrate -= dt; this.anim!.play('celebrate'); } else this.anim!.stop('celebrate');
    this.glassTick(dt);
    this.sync(t, dt);
  }
  private glass: THREE.Object3D | null = null;
  private glassT = 0;
  /** a glass of water in Baby Mo's hand for a few seconds (water break) */
  holdGlass(secs: number) {
    if (!this.glass) {
      const g = new THREE.Group();
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.2, 12, 1, true), new THREE.MeshLambertMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
      const water = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.058, 0.15, 12), new THREE.MeshLambertMaterial({ color: 0x5bb8e8, transparent: true, opacity: 0.85 }));
      water.position.y = -0.02; water.name = 'water';
      g.add(cup, water); g.position.set(0, -0.06, 0.06); g.rotation.x = Math.PI / 2;
      this.glass = g;
    }
    (this.rig.hand ?? this.rig.armR ?? this.rig.root).add(this.glass);
    const w = this.glass.getObjectByName('water')!; w.scale.y = 1; w.position.y = -0.02;
    this.glassT = secs;
  }
  private glassTick(dt: number) {
    if (!this.glass || this.glassT <= 0) return;
    this.glassT -= dt;
    const w = this.glass.getObjectByName('water')!;
    const k = Math.max(0.05, Math.min(1, (this.glassT - 0.4) / 2.4)); // empties while sipping
    w.scale.y = k; w.position.y = -0.02 - (1 - k) * 0.075;
    if (this.glassT <= 0) this.glass.removeFromParent();
  }
  /** walk to the prayer spot, then follow the same prayer movements as the villagers */
  private prayUpdate(dt: number, t: number) {
    const sp = this.prayAt!;
    const dx = sp.x - this.pos.x, dz = sp.z - this.pos.z, d = Math.hypot(dx, dz);
    this.celebrate = 0; this.anim!.stop('celebrate');
    if (d > 12) { this.pos.copy(sp); }
    if (d > 0.15 && d <= 12) {
      if (this.praying) { clearPose(this.rig); this.praying = false; }
      const step = Math.min(d, 3.2 * dt);
      this.pos.x += dx / d * step; this.pos.z += dz / d * step;
      const gy = groundY(this.world, this.pos.x, this.pos.y, this.pos.z);
      if (gy !== null) this.pos.y += (gy - this.pos.y) * Math.min(1, dt * 10);
      this.yaw = Math.atan2(dx, dz);
      this.moving = true;
      this.sync(t, dt);
      return;
    }
    this.moving = false;
    this.yaw = Math.PI; // facing the qibla wall, like the villagers
    this.sync(t, dt);
    this.rig.root.rotation.y = this.yaw;
    applyPrayerPose(this.rig, poseAt(t));
    this.praying = true;
  }
}

/** free what belongs to one animal: its merged geometry and any name tag (materials are shared, kept) */
export function disposeRig(root: THREE.Object3D) {
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.geometry.dispose();
    if ((o as THREE.Sprite).isSprite) { const sm = (o as THREE.Sprite).material; sm.map?.dispose(); sm.dispose(); }
  });
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
    this.animals = this.animals.filter(a => {
      if (a.chunk !== k) return true;
      // a camel you're riding (or a friend following you) comes along instead of vanishing
      if (a.ridden || a.follow) { a.chunk = 'wild'; return true; }
      this.scene.remove(a.rig.root);
      disposeRig(a.rig.root);
      return false;
    });
  }
  addNpc(n: Npc) { this.npcs.push(n); this.scene.add(n.rig.root); }

  /** called with the player's position and speed, so animals can notice and react */
  onStartle: ((a: Animal) => void) | null = null;
  onGreet: ((n: Npc) => void) | null = null;
  /** game clock, set by the game each frame: drives villagers' days and the animals' bedtime */
  clock = { hour: 8, isha: 19.3, fajr: 4.6, night: false };
  private routineT = 0;
  update(dt: number, t: number, center: THREE.Vector3, playerSpeed = 0) {
    for (const a of this.animals) {
      const d2 = a.pos.distanceToSquared(center);
      if (d2 > 90 * 90) continue;
      a.sleeping = this.clock.night;
      if (d2 < 36 && a.sense(center, playerSpeed)) this.onStartle?.(a);
      a.update(dt, t);
    }
    // once a second: everyone follows their day plan; friends at the same place chat
    this.routineT -= dt;
    if (this.routineT <= 0) {
      this.routineT = 1;
      for (const n of this.npcs) n.setRoutine(routineAt(n.id, this.clock.hour, this.clock.isha, this.clock.fajr));
      for (const n of this.npcs) {
        n.chatWith = null;
        if (n.routine?.act !== 'chat') continue;
        let best: Entity | null = null, bd = 4.5;
        for (const o of this.npcs) if (o !== n && !o.target && !o.goingToMasjid && o.routine?.act !== 'sleep') { const d = o.pos.distanceTo(n.pos); if (d < bd) { bd = d; best = o; } }
        n.chatWith = best;
      }
      // you walked up to a villager: they turn, wave and say hello
      for (const n of this.npcs) if (Math.hypot(n.pos.x - center.x, n.pos.z - center.z) < 4 && Math.abs(n.pos.y - center.y) < 2.5 && n.greet(center)) this.onGreet?.(n);
    }
    for (const n of this.npcs) n.update(dt, t);
    this.mo?.update(dt, t);
  }

  /** something loud happened at p (a block broke): animals close by scurry off */
  startleNear(p: THREE.Vector3, r = 2.6) {
    for (const a of this.animals) if (a.pos.distanceToSquared(p) < r * r && a.startle(p)) this.onStartle?.(a);
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
