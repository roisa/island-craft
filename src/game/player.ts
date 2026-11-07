// Player body: AABB collisions, gentle auto step-up, swimming, flying.
import * as THREE from 'three';
import type { World } from '../world/world';
import { B, BLOCKS } from '../world/blocks';

const wet = (id: number) => id === B.WATER || !!BLOCKS[id]?.aquatic;

export const PW = 0.3;   // half width
export const PH = 1.6;   // height
export const EYE = 1.45;

export interface MoveInput { fx: number; fz: number; jump: boolean; down: boolean; sprint: boolean }

const LEAVES = new Set<number>([B.OAK_LEAVES, B.PINE_LEAVES, B.PALM_LEAVES]);
const CLIMBABLE = new Set<number>([B.OAK_LOG, B.PINE_LOG, B.PALM_LOG, B.OAK_LEAVES, B.PINE_LEAVES, B.PALM_LEAVES]);

export class Player {
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  yaw = 0; pitch = -0.15;
  onGround = false; inWater = false; headInWater = false;
  /** wearing the diving mask: swim faster */
  diver = false;
  flying = false;
  visY = 0;           // smoothed y for camera after step-ups
  speed = 0;
  fallStart = 0;
  onStep: (() => void) | null = null;
  onLand: ((v: number) => void) | null = null;
  onSplash: (() => void) | null = null;
  private stepDist = 0;

  constructor(private world: World) { }

  collides(x: number, y: number, z: number) {
    const x0 = Math.floor(x - PW), x1 = Math.floor(x + PW - 1e-4);
    const y0 = Math.floor(y), y1 = Math.floor(y + PH - 1e-4);
    const z0 = Math.floor(z - PW), z1 = Math.floor(z + PW - 1e-4);
    for (let a = x0; a <= x1; a++) for (let b = y0; b <= y1; b++) for (let c = z0; c <= z1; c++) {
      if (!this.world.solidAt(a, b, c)) continue;
      // while climbing a tree you push up through its leaves (and come out on top of the canopy)
      if (this.climbing && LEAVES.has(this.world.get(a, b, c))) continue;
      return true;
    }
    return false;
  }
  occupies(x: number, y: number, z: number) {
    return x >= Math.floor(this.pos.x - PW) && x <= Math.floor(this.pos.x + PW - 1e-4) &&
      y >= Math.floor(this.pos.y) && y <= Math.floor(this.pos.y + PH - 1e-4) &&
      z >= Math.floor(this.pos.z - PW) && z <= Math.floor(this.pos.z + PW - 1e-4);
  }

  /** true while climbing a tree */
  climbing = false;
  private wasClimbing = false;
  /** the trunk / canopy top just below in front: we can pull ourselves up onto it */
  private ledgeAhead(wx: number, wz: number) {
    const d = Math.hypot(wx, wz); if (d < 0.01) return false;
    const p = this.pos, ax = p.x + wx / d * 0.55, az = p.z + wz / d * 0.55;
    return CLIMBABLE.has(this.world.get(Math.floor(ax), Math.floor(p.y - 0.3), Math.floor(az)));
  }
  /** is there a trunk or leaves right in front, in the direction we're pushing? */
  private canClimb(wx: number, wz: number, len: number) {
    if (len < 0.3) return false;
    const d = Math.hypot(wx, wz); if (d < 0.01) return false;
    const p = this.pos, ax = p.x + wx / d * 0.55, az = p.z + wz / d * 0.55;
    for (const dy of [0.3, 1.2]) if (CLIMBABLE.has(this.world.get(Math.floor(ax), Math.floor(p.y + dy), Math.floor(az)))) return true;
    return false;
  }
  step(dt: number, inp: MoveInput) {
    const w = this.world, p = this.pos, v = this.vel;
    const wasInWater = this.inWater;
    this.inWater = wet(w.get(Math.floor(p.x), Math.floor(p.y + 0.4), Math.floor(p.z)));
    this.headInWater = wet(w.get(Math.floor(p.x), Math.floor(p.y + EYE), Math.floor(p.z)));
    if (this.inWater && !wasInWater && v.y < -4) this.onSplash?.();

    let sp = this.flying ? (inp.sprint ? 11 : 7) : inp.sprint ? 6.2 : 4.4;
    if (this.inWater && !this.flying) sp *= this.diver ? 1.05 : 0.6;
    let fx = inp.fx, fz = inp.fz;
    const len = Math.hypot(fx, fz); if (len > 1) { fx /= len; fz /= len; }
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    const wx = (fx * c + fz * s) * sp, wz = (-fx * s + fz * c) * sp;
    const accel = this.onGround || this.flying ? 18 : 6;
    v.x += (wx - v.x) * Math.min(1, dt * accel);
    v.z += (wz - v.z) * Math.min(1, dt * accel);

    if (this.flying) {
      const target = inp.jump ? 6 : inp.down ? -6 : 0;
      v.y += (target - v.y) * Math.min(1, dt * 8);
    } else if (this.inWater) {
      v.y -= 9 * dt;
      if (inp.jump) v.y = Math.min(v.y + 22 * dt, 3.2);
      v.y = Math.max(v.y, -3.5);
      v.x *= 1 - Math.min(1, dt * 2); v.z *= 1 - Math.min(1, dt * 2);
    } else if ((this.climbing = this.canClimb(wx, wz, len)) || (this.wasClimbing && len > 0.3 && !inp.down && this.ledgeAhead(wx, wz))) {
      // walking into a tree trunk (or its leaves) climbs it; "down" climbs back down
      v.y = inp.down ? -2.5 : 3.2;
      // reached the top: a little hop up and over onto it
      if (!this.climbing) { v.y = 6.5; this.climbing = false; }
      this.onGround = false;
    } else {
      v.y -= 26 * dt;
      if (v.y < -40) v.y = -40;
      if (inp.jump && this.onGround) { v.y = 8.6; this.onGround = false; }
    }

    // X
    const ox = p.x; p.x += v.x * dt;
    if (this.collides(p.x, p.y, p.z)) {
      if ((this.onGround || this.inWater) && !this.flying && !this.collides(p.x, p.y + 1.01, p.z) && !this.collides(ox, p.y + 1.01, p.z)) p.y = Math.floor(p.y) + 1.001;
      else { p.x = ox; v.x = 0; }
    }
    // Z
    const oz = p.z; p.z += v.z * dt;
    if (this.collides(p.x, p.y, p.z)) {
      if ((this.onGround || this.inWater) && !this.flying && !this.collides(p.x, p.y + 1.01, p.z) && !this.collides(p.x, p.y + 1.01, oz)) p.y = Math.floor(p.y) + 1.001;
      else { p.z = oz; v.z = 0; }
    }
    // Y
    const wasGround = this.onGround;
    const preVy = v.y;
    p.y += v.y * dt;
    this.onGround = false;
    if (this.collides(p.x, p.y, p.z)) {
      if (v.y < 0) { p.y = Math.floor(p.y) + 1; this.onGround = true; if (this.flying) this.flying = false; }
      else p.y = Math.floor(p.y + PH) - PH - 0.001;
      v.y = 0;
    }
    if (this.onGround && !wasGround && preVy < -6) this.onLand?.(-preVy);
    if (p.y < -20) { p.y = w.heightAt(Math.floor(p.x), Math.floor(p.z)) + 2; v.set(0, 0, 0); }

    this.wasClimbing = this.climbing;
    this.speed = Math.hypot(v.x, v.z);
    if (this.onGround && this.speed > 1) {
      this.stepDist += this.speed * dt;
      if (this.stepDist > 1.9) { this.stepDist = 0; this.onStep?.(); }
    }
    // smooth camera on step-ups
    if (p.y - this.visY > 1.5 || p.y < this.visY) this.visY = p.y;
    else this.visY += (p.y - this.visY) * Math.min(1, dt * 14);
  }

  eye(out = new THREE.Vector3()) { return out.set(this.pos.x, this.visY + EYE, this.pos.z); }
  look(out = new THREE.Vector3()) {
    return out.set(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
  }
}
