// The horse farm. Three horses graze in the paddock; walk up to one and tap
// 🐴 Ride. Your horse canters round the riding track (two laps) by itself,
// following Baby Mo on his pony. Six jumps on the track: tap ✋ just before
// each one to leap over. Clear it and the crowd of chickens is impressed;
// too early or too late and the pole falls.
import * as THREE from 'three';
import type { Game } from '../main';
import { tr } from '../i18n';
import type { Landmark } from '../world/landmarks';
import type { Activity } from './activity';
import type { Rig } from './models';
import { SFX } from './audio';

/** the riding track: a rounded rectangle round the paddock (half lengths and corner radius, blocks) */
export const COURSE = { hx: 12, hz: 9, r: 3, laps: 2 };
const SX = COURSE.hx - COURSE.r, SZ = COURSE.hz - COURSE.r, ARC = (Math.PI / 2) * COURSE.r;
/** one lap, in blocks */
export const LAP_LEN = 4 * SX + 4 * SZ + 4 * ARC;
/** the point s blocks round the track from the gate (middle of the south side, heading east), and the heading (yaw: 0 faces −z) */
export function courseAt(s: number): { x: number; z: number; yaw: number } {
  s = ((s % LAP_LEN) + LAP_LEN) % LAP_LEN;
  const { r } = COURSE;
  const seg: [number, (u: number) => [number, number, number]][] = [
    [SX, u => [u, COURSE.hz, -Math.PI / 2]],                                                           // south side, east
    [ARC, u => { const a = u / r; return [SX + Math.sin(a) * r, SZ + Math.cos(a) * r, -Math.PI / 2 + a]; }],
    [2 * SZ, u => [COURSE.hx, SZ - u, 0]],                                                            // east side, north
    [ARC, u => { const a = u / r; return [SX + Math.cos(a) * r, -SZ - Math.sin(a) * r, a]; }],
    [2 * SX, u => [SX - u, -COURSE.hz, Math.PI / 2]],                                                // north side, west
    [ARC, u => { const a = u / r; return [-SX - Math.sin(a) * r, -SZ - Math.cos(a) * r, Math.PI / 2 + a]; }],
    [2 * SZ, u => [-COURSE.hx, -SZ + u, Math.PI]],                                                    // west side, south
    [ARC, u => { const a = u / r; return [-SX - Math.cos(a) * r, SZ + Math.sin(a) * r, Math.PI + a]; }],
    [SX, u => [-SX + u, COURSE.hz, -Math.PI / 2]],                                                    // back to the gate
  ];
  for (const [len, f] of seg) { if (s <= len) { const [x, z, yaw] = f(s); return { x, z, yaw }; } s -= len; }
  return { x: 0, z: COURSE.hz, yaw: -Math.PI / 2 };
}
/** where the six jumps are, round the lap (on the straights) */
export const JUMPS = [SX * 0.6, SX + ARC + SZ, SX + 2 * ARC + 2 * SZ + SX * 0.5, SX + 2 * ARC + 2 * SZ + SX * 1.5, 3 * SX + 3 * ARC + 2 * SZ + SZ, 3 * SX + 4 * ARC + 4 * SZ + SX * 0.45];
export const SPEED = 6.5, JUMP_T = 0.75, JUMP_H = 1.3;
/** how high the horse is this far into a jump (0 … JUMP_T s) */
export const jumpHeight = (t: number) => (t > 0 && t < JUMP_T ? Math.sin((t / JUMP_T) * Math.PI) * JUMP_H : 0);
/** a jump is cleared if the horse is this high when it reaches it */
export const clears = (h: number) => h >= 0.55;

/** a blocky horse; its legs swing as it walks or canters */
export function horseModel(coat: number, mane: number, small = false) {
  const g = new THREE.Group(), m = (c: number) => new THREE.MeshLambertMaterial({ color: c });
  const box = (w: number, h: number, d: number, c: number, x: number, y: number, z: number, parent: THREE.Object3D = g) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(c)); b.position.set(x, y, z); parent.add(b); return b; };
  box(0.62, 0.6, 1.5, coat, 0, 1.05, 0);                          // body
  const neck = new THREE.Group(); neck.position.set(0, 1.3, 0.62); neck.rotation.x = -0.6; g.add(neck);
  box(0.34, 0.75, 0.4, coat, 0, 0.32, 0, neck);
  box(0.1, 0.7, 0.22, mane, 0, 0.35, -0.2, neck);                 // mane
  const head = box(0.34, 0.34, 0.7, coat, 0, 1.92, 0.98); head.rotation.x = 0.25;
  box(0.36, 0.2, 0.2, 0x3b2a1a, 0, 1.86, 1.3);                    // muzzle
  for (const sx of [-0.12, 0.12]) box(0.08, 0.16, 0.06, coat, sx, 2.16, 0.78); // ears
  for (const sx of [-0.18, 0.18]) box(0.05, 0.07, 0.05, 0x111111, sx, 1.98, 1.08); // eyes
  const tail = box(0.12, 0.6, 0.12, mane, 0, 0.95, -0.82); tail.rotation.x = 0.4;
  box(0.66, 0.08, 0.6, 0x8a2a2a, 0, 1.37, -0.05);                // saddle blanket
  const legs: THREE.Object3D[] = [];
  for (const [lx, lz] of [[-0.2, 0.55], [0.2, 0.55], [-0.2, -0.55], [0.2, -0.55]]) {
    const pivot = new THREE.Group(); pivot.position.set(lx, 0.8, lz); g.add(pivot);
    box(0.17, 0.8, 0.17, coat, 0, -0.4, 0, pivot); box(0.19, 0.12, 0.19, 0x2b2018, 0, -0.76, 0, pivot); // leg and hoof
    legs.push(pivot);
  }
  if (small) g.scale.setScalar(0.85);
  g.userData.legs = legs;
  return g;
}
function hurdle() {
  const g = new THREE.Group(), m = (c: number) => new THREE.MeshLambertMaterial({ color: c });
  for (const sx of [-1.4, 1.4]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 0.15), m(0xffffff)); post.position.set(sx, 0.55, 0); g.add(post); }
  const pole = new THREE.Group(); pole.position.y = 0.7; g.add(pole);
  for (let i = 0; i < 6; i++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.48, 8), m(i % 2 ? 0xffffff : 0xe4423a)); seg.rotation.z = Math.PI / 2; seg.position.x = -1.2 + i * 0.48; pole.add(seg); }
  g.userData.pole = pole;
  return g;
}

const COATS: [number, number][] = [[0x8a5a2b, 0x2b1d12], [0xf2efe8, 0xc9c2b4], [0x2b2b2b, 0x111111]];

export class HorseFarm implements Activity {
  readonly id = 'horses';
  active = false;
  clear = 0; knocked = 0;
  private c: THREE.Vector3;
  private horses: { obj: THREE.Group; x: number; z: number; tx: number; tz: number; yaw: number; wait: number; phase: number }[] = [];
  private hurdles: { obj: THREE.Group; s: number; fallen: number }[] = [];
  private ride: { horse: number; mo: number; s: number; jumpT: number; next: number; lap: number } | null = null;
  private pony: THREE.Group; private done = false;
  constructor(private g: Game, l: Landmark) {
    this.c = new THREE.Vector3(...l.at!.track);
    COATS.forEach(([coat, mane], i) => {
      const obj = horseModel(coat, mane); g.scene.add(obj);
      const x = this.c.x + (i - 1) * 4, z = this.c.z + (i % 2 ? 2 : -1);
      this.horses.push({ obj, x, z, tx: x, tz: z, yaw: Math.random() * 6, wait: Math.random() * 3, phase: Math.random() * 6 });
    });
    this.pony = horseModel(0xd9a066, 0xf4f4f4, true); this.pony.visible = false; g.scene.add(this.pony);
  }
  /** the horse you're next to (not while riding) */
  private nearest(p: THREE.Vector3) {
    let best = -1, bd = 3.2;
    this.horses.forEach((h, i) => { const d = Math.hypot(h.x - p.x, h.z - p.z); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  near(p: THREE.Vector3) { return Math.abs(p.y - this.c.y) < 4 && this.nearest(p) >= 0; }
  button(): [string, string] { return ['🐴', tr('Tunggang kuda', 'Ride')]; }
  open() { const i = this.nearest(this.g.player.pos); if (i >= 0) this.start(i); }
  start(horse = 0) {
    const g = this.g;
    if (g.fun.riding) g.fun.dismount();
    this.active = true; this.clear = 0; this.knocked = 0; this.done = false;
    this.ride = { horse, mo: 6, s: 0, jumpT: 0, next: 0, lap: 1 }; // Baby Mo leads the way, just ahead
    // the jumps go up on the track
    this.clearHurdles();
    for (const s of JUMPS) { const o = hurdle(), p = courseAt(s); o.position.set(this.c.x + p.x, this.c.y, this.c.z + p.z); o.rotation.y = p.yaw; g.scene.add(o); this.hurdles.push({ obj: o, s, fallen: 0 }); }
    this.pony.visible = true;
    g.ents.mo.seat = { pos: new THREE.Vector3(), yaw: 0 };
    g.goodWord('mount', true);
    g.ui.say(tr('Bismillah, naik kuda! Kudamu berlari sendiri, mengikuti Baby Mo. Ketuk ✋ tepat sebelum rintangan untuk melompat. 2 putaran, 6 rintangan!', 'Bismillah, up you get! Your horse canters by itself, following Baby Mo. Tap ✋ just before each jump to leap over it. 2 laps, 6 jumps!'), 'alright', 7000);
    g.stats.horseRides = (g.stats.horseRides || 0) + 1;
  }
  quit() { if (this.active) this.end(); }
  tap() {
    const r = this.ride; if (!r || r.jumpT > 0) return;
    r.jumpT = 0.0001; SFX.pop(3);
  }
  /** horses graze and wander in the paddock (every frame, ridden or not) */
  idle(dt: number, t: number) {
    this.horses.forEach((h, i) => {
      if (this.ride && this.ride.horse === i) return;
      const dx = h.tx - h.x, dz = h.tz - h.z, d = Math.hypot(dx, dz);
      let moving = false;
      if (d > 0.2) { const v = Math.min(d, dt * 1.1); h.x += (dx / d) * v; h.z += (dz / d) * v; h.yaw = Math.atan2(dx, dz); moving = true; }
      else if ((h.wait -= dt) <= 0) { h.tx = this.c.x + (Math.random() - 0.5) * 15; h.tz = this.c.z + (Math.random() - 0.5) * 9; h.wait = 2 + Math.random() * 5; }
      h.obj.position.set(h.x, this.c.y, h.z); h.obj.rotation.y = h.yaw;
      this.legs(h.obj, moving ? t * 6 + h.phase : 0, moving ? 0.35 : 0);
    });
  }
  private legs(obj: THREE.Group, ph: number, amp: number) {
    const legs = obj.userData.legs as THREE.Object3D[];
    legs.forEach((l, k) => (l.rotation.x = Math.sin(ph + (k === 0 || k === 3 ? 0 : Math.PI)) * amp));
  }
  step(dt: number, t: number): boolean {
    if (!this.active || !this.ride) return false;
    const g = this.g, r = this.ride, p = g.player, h = this.horses[r.horse];
    if (!this.done) {
      const before = r.s;
      r.s += SPEED * dt; r.mo += SPEED * dt;
      if (r.jumpT > 0) { r.jumpT += dt; if (r.jumpT > JUMP_T) r.jumpT = 0; }
      // the jumps you reach this frame
      for (const hd of this.hurdles) {
        const lapS = (s: number) => ((s % LAP_LEN) + LAP_LEN) % LAP_LEN;
        const a = lapS(before), b = lapS(r.s), crossed = a <= b ? hd.s > a && hd.s <= b : hd.s > a || hd.s <= b;
        if (!crossed) continue;
        if (clears(jumpHeight(r.jumpT))) { this.clear++; SFX.chime(); g.ui.raceMath(tr('Bersih! ✓', 'Clear! ✓')); g.goodWord('clear_jump'); g.fx.sparkle(hd.obj.position.x, this.c.y + 1.5, hd.obj.position.z, 8, 0xffd23f, 1.4); }
        else { this.knocked++; hd.fallen = 0.001; SFX.pop(1); g.ui.raceMath(tr('Tiangnya jatuh!', 'Knocked the pole!')); g.goodWord('knocked'); }
      }
      if (r.s >= LAP_LEN * COURSE.laps) { this.done = true; setTimeout(() => this.result(), 600); }
      r.lap = Math.min(COURSE.laps, Math.floor(r.s / LAP_LEN) + 1);
      // after the first lap the poles go back up
      if (Math.floor(before / LAP_LEN) !== Math.floor(r.s / LAP_LEN)) for (const hd of this.hurdles) { hd.fallen = 0; (hd.obj.userData.pole as THREE.Object3D).rotation.set(0, 0, 0); (hd.obj.userData.pole as THREE.Object3D).position.y = 0.7; }
    }
    for (const hd of this.hurdles) if (hd.fallen > 0 && hd.fallen < 1) { hd.fallen = Math.min(1, hd.fallen + dt * 3); const pole = hd.obj.userData.pole as THREE.Object3D; pole.rotation.x = hd.fallen * 1.2; pole.position.y = 0.7 - hd.fallen * 0.6; }
    // your horse and Baby Mo's pony along the track
    const at = courseAt(r.s), lift = jumpHeight(r.jumpT);
    h.x = this.c.x + at.x; h.z = this.c.z + at.z; h.yaw = at.yaw + Math.PI;
    h.obj.position.set(h.x, this.c.y + lift, h.z); h.obj.rotation.y = at.yaw + Math.PI; h.obj.rotation.x = r.jumpT > 0 ? -Math.cos((r.jumpT / JUMP_T) * Math.PI) * 0.25 : 0;
    this.legs(h.obj, this.done ? 0 : t * 11, this.done ? 0 : r.jumpT > 0 ? 0.15 : 0.6);
    // Baby Mo's pony hops each jump by itself
    const pm = courseAt(r.mo), near = (s: number) => { const d = (((r.mo - s) % LAP_LEN) + LAP_LEN) % LAP_LEN; return Math.min(d, LAP_LEN - d); };
    const moLift = Math.max(0, ...this.hurdles.map(hd => (near(hd.s) < 2.4 ? Math.cos((near(hd.s) / 2.4) * Math.PI / 2) * 1.1 : 0)));
    this.pony.position.set(this.c.x + pm.x, this.c.y + moLift, this.c.z + pm.z); this.pony.rotation.y = pm.yaw + Math.PI;
    this.legs(this.pony, this.done ? 0 : t * 12, this.done ? 0 : 0.6);
    const seat = g.ents.mo.seat; if (seat) { seat.pos.set(this.pony.position.x, this.pony.position.y + 0.85, this.pony.position.z); seat.yaw = pm.yaw + Math.PI; }
    // you sit in the saddle
    p.pos.set(h.x, this.c.y, h.z); p.vel.set(0, 0, 0); p.visY = this.c.y + 1.0 + lift + (this.done ? 0 : Math.abs(Math.sin(t * 11)) * 0.06); p.onGround = true; p.speed = 0; p.yaw = at.yaw;
    g.ui.actHud(`🐴 ${tr('Putaran', 'Lap')} ${r.lap}/${COURSE.laps} · ${tr('bersih', 'clear')} ${this.clear} · ${tr('jatuh', 'knocked')} ${this.knocked}`, () => this.quit());
    return true;
  }
  private result() {
    const g = this.g, total = JUMPS.length * COURSE.laps, coins = this.clear * 5 + (this.knocked === 0 ? 30 : 0);
    g.addCoins(coins, from => g.ui.coinPop(coins, from));
    SFX.fanfare(); g.ui.confetti(20 + this.clear * 4); g.ents.mo.celebrate = 2;
    g.goodWord(this.knocked === 0 ? 'big_win' : 'finished', true);
    g.stats.clearRounds = (g.stats.clearRounds || 0) + (this.knocked === 0 ? 1 : 0);
    g.ui.dialog({
      face: '🐴', who: tr('Selesai berkuda!', 'Ride finished!'),
      text: (this.knocked === 0 ? tr(`<b>Putaran bersih!</b> Semua ${total} rintangan terlewati. Masya Allah!`, `<b>A clear round!</b> All ${total} jumps. Masha Allah!`) : tr(`<b>${this.clear} dari ${total}</b> rintangan bersih. Insya Allah lain kali semuanya!`, `<b>${this.clear} of ${total}</b> jumps clear. Insha Allah all of them next time!`))
        + `<br>🪙 ${tr(`${this.clear} × 5 koin`, `${this.clear} × 5 coins`)}${this.knocked === 0 ? tr(' + 30 bonus', ' + 30 bonus') : ''} = ${coins}`,
      buttons: [{ label: '🐴 ' + tr('Lagi', 'Again'), cls: 'gold', fn: () => { const i = this.ride?.horse ?? 0; this.end(); setTimeout(() => this.start(i), 300); } }, { label: tr('Selesai', 'Done'), cls: 'ghost', fn: () => this.end() }],
    });
    g.checkQuests(); g.saveSoon();
  }
  private clearHurdles() { for (const h of this.hurdles) this.g.scene.remove(h.obj); this.hurdles = []; }
  private end() {
    const g = this.g, r = this.ride;
    this.active = false; this.done = true;
    if (r) { const h = this.horses[r.horse]; h.x = this.c.x; h.z = this.c.z + 2; h.tx = h.x; h.tz = h.z; h.obj.rotation.x = 0; }
    this.ride = null; this.clearHurdles(); this.pony.visible = false;
    g.ents.mo.seat = null; g.ui.actHud(null);
    g.player.pos.set(this.c.x + 1.5, this.c.y, this.c.z + 9.5);
  }
  /** you: sitting astride, legs down either side, hands forward on the reins */
  pose(r: Rig) {
    const [l, rr] = r.legs;
    l?.rotation.set(-1.25, 0, -0.45); rr?.rotation.set(-1.25, 0, 0.45);
    r.armL?.rotation.set(-0.9, 0, 0.15); r.armR?.rotation.set(-0.9, 0, -0.15);
    if (this.ride?.jumpT) r.body.rotation.x += 0.35;
  }
  /** the camera follows behind the horse */
  camera(cam: THREE.PerspectiveCamera) {
    const r = this.ride; if (!r) return false;
    const at = courseAt(r.s - 5), ahead = courseAt(r.s + 5);
    cam.position.set(this.c.x + at.x, this.c.y + 3.6, this.c.z + at.z);
    cam.lookAt(this.c.x + ahead.x, this.c.y + 1.2, this.c.z + ahead.z);
    if (Math.abs(cam.fov - 62) > 0.01) { cam.fov = 62; cam.updateProjectionMatrix(); }
    return true;
  }
}
