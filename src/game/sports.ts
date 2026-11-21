// The sports park: basketball and penalty kicks.
//
// Basketball: 5 shots from 5 spots, from right under the hoop out to the
// three-point line. A marker runs along a bar; tap ✋ when it's in the green
// to shoot (the green gets smaller as you go further out). In: 2 points (3
// from outside the arc), added up out loud. Nearly: it rolls round the rim
// and out. Baby Mo catches it under the hoop and passes it back.
//
// Penalties: 5 kicks at the goal, Baby Mo in goal. Your aim slides across
// the goal; tap to kick. Baby Mo dives one way — score where he isn't!
import * as THREE from 'three';
import type { Game } from '../main';
import { tr } from '../i18n';
import type { Landmark } from '../world/landmarks';
import type { Activity } from './activity';
import type { Rig } from './models';
import { SFX, Speech } from './audio';

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
/** the yaw that faces from a to b (yaw 0 faces −z) */
const yawTo = (ax: number, az: number, bx: number, bz: number) => Math.atan2(-(bx - ax), -(bz - az));

// ---------------------------------------------------------------- basketball
/** the shooting spots: [sideways, distance from the hoop (blocks)], from easy to hard */
export const SPOTS: [number, number][] = [[0, 2], [-2.5, 3.2], [0, 4.4], [2.5, 5.2], [0, 7]];
export const THREE_PT = 6.5;
/** the green part of the bar for a shot from this far (narrower further out), centred at 0.5 */
export function greenZone(dist: number): [number, number] {
  const w = Math.max(0.12, 0.42 - dist * 0.045);
  return [0.5 - w / 2, 0.5 + w / 2];
}
/** what a shot does, by where the marker was: in, off the rim, or short/long */
export function shotResult(pos: number, zone: [number, number]): 'in' | 'rim' | 'short' | 'long' {
  if (pos >= zone[0] && pos <= zone[1]) return 'in';
  if (pos >= zone[0] - 0.07 && pos <= zone[1] + 0.07) return 'rim';
  return pos < zone[0] ? 'short' : 'long';
}
/** the marker sweeps 0 → 1 → 0… at this speed */
export const sweep = (t: number, speed = 0.8) => { const k = (t * speed) % 2; return k < 1 ? k : 2 - k; };

function ballTex(kind: 'basket' | 'soccer') {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const x = c.getContext('2d')!;
  if (kind === 'basket') {
    x.fillStyle = '#e8772e'; x.fillRect(0, 0, 128, 64);
    x.strokeStyle = '#3a1d0a'; x.lineWidth = 3;
    for (const lx of [32, 64, 96]) { x.beginPath(); x.moveTo(lx, 0); x.lineTo(lx, 64); x.stroke(); }
    x.beginPath(); x.moveTo(0, 32); x.lineTo(128, 32); x.stroke();
  } else {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 64);
    x.fillStyle = '#1f1f1f';
    for (const [px, py] of [[16, 16], [48, 40], [80, 16], [112, 40], [16, 52], [80, 52], [48, 8], [112, 8]]) { x.beginPath(); x.arc(px, py, 7, 0, Math.PI * 2); x.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Basketball implements Activity {
  readonly id = 'basketball';
  active = false;
  shot = 0; points = 0; made = 0; private t = 0;
  private state: 'aim' | 'fly' | 'pass' | 'done' = 'aim';
  private hoop: THREE.Vector3; private court: THREE.Vector3;
  private ball: THREE.Mesh; private ring: THREE.Mesh;
  private fly: { from: THREE.Vector3; t: number; T: number; res: string; rimT?: number } | null = null;
  private passT = 0; private spot = new THREE.Vector3(); private throwT = 0; private zone: [number, number] = [0.4, 0.6];
  constructor(private g: Game, l: Landmark) {
    this.hoop = new THREE.Vector3(...l.at!.hoop); this.court = new THREE.Vector3(...l.at!.court);
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), new THREE.MeshLambertMaterial({ map: ballTex('basket') }));
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 24), new THREE.MeshLambertMaterial({ color: 0xff5a1f }));
    this.ring.rotation.x = Math.PI / 2; this.ring.position.copy(this.hoop);
    // a little white net under the ring
    const net = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.4, 12, 1, true), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    net.position.y = -0.2; net.rotation.x = -Math.PI / 2; this.ring.add(net);
    g.scene.add(this.ring);
    this.ball.visible = false; g.scene.add(this.ball);
  }
  near(p: THREE.Vector3) { return Math.abs(p.x - this.hoop.x) < 6.5 && p.z > this.hoop.z - 3 && p.z < this.court.z + 7 && Math.abs(p.y - this.court.y) < 4; }
  button(): [string, string] { return ['🏀', tr('Main basket', 'Basketball')]; }
  open() { this.start(); }
  start() {
    const g = this.g;
    if (g.fun.riding) g.fun.dismount();
    this.active = true; this.shot = 0; this.points = 0; this.made = 0;
    g.ents.mo.stand = { pos: new THREE.Vector3(this.hoop.x + 2.4, this.court.y, this.hoop.z + 1.2), yaw: 0 };
    this.toSpot();
    g.goodWord('start', true);
    g.ui.say(tr('Ayo main basket! Ketuk ✋ saat penanda merah ada di bagian hijau untuk menembak. 5 tembakan, makin jauh makin sulit. Masuk = 2 poin, dari luar garis lengkung = 3 poin!', 'Let’s play basketball! Tap ✋ when the red marker is in the green to shoot. 5 shots, each one further out. In = 2 points, from outside the arc = 3 points!'), 'alright', 7000);
    g.stats.basketGames = (g.stats.basketGames || 0) + 1;
  }
  quit() { if (this.active) this.end(); }
  private toSpot() {
    const [sx, d] = SPOTS[this.shot];
    this.spot.set(this.hoop.x + sx, this.court.y, this.hoop.z + Math.sqrt(Math.max(0, d * d - sx * sx)));
    this.zone = greenZone(d); this.t = Math.random(); this.state = 'aim'; this.fly = null;
  }
  private get dist() { return Math.hypot(this.spot.x - this.hoop.x, this.spot.z - this.hoop.z); }
  tap() {
    if (this.state !== 'aim') return;
    const res = shotResult(sweep(this.t), this.zone);
    const from = this.spot.clone().setY(this.court.y + 2.0);
    this.fly = { from, t: 0, T: 0.9 + this.dist * 0.04, res };
    this.state = 'fly'; this.throwT = 0.45; this.shot++;
    SFX.click();
  }
  step(dt: number): boolean {
    if (!this.active) return false;
    const g = this.g, p = g.player;
    this.t += dt; this.throwT = Math.max(0, this.throwT - dt);
    const hands = this.spot.clone().setY(this.court.y + 1.25);
    if (this.state === 'aim') {
      this.ball.position.copy(hands).add(new THREE.Vector3(0, 0, -0.35)); this.ball.visible = true;
      g.ui.meter({ pos: sweep(this.t), zone: this.zone, label: tr('Ketuk saat di hijau!', 'Tap in the green!') });
    } else g.ui.meter(null);
    if (this.fly) {
      const f = this.fly; f.t += dt / f.T;
      const k = Math.min(1, f.t), to = this.hoop.clone();
      if (f.res === 'short') to.add(new THREE.Vector3(0, -1.2, 1.2)); if (f.res === 'long') to.add(new THREE.Vector3(0, 0.3, -0.7));
      if (f.res === 'rim') to.add(new THREE.Vector3(0.3, 0.1, 0));
      // an arc that peaks above the hoop
      const pk = Math.max(f.from.y, to.y) + 1.2 + this.dist * 0.15;
      this.ball.position.set(f.from.x + (to.x - f.from.x) * k, 0, f.from.z + (to.z - f.from.z) * k);
      this.ball.position.y = (1 - k) * (1 - k) * f.from.y + 2 * (1 - k) * k * (2 * pk - (f.from.y + to.y) / 2) + k * k * to.y;
      this.ball.rotation.x -= dt * 8;
      if (k >= 1) this.land(f.res);
    }
    if (this.state === 'pass') {
      // Baby Mo bounce-passes it back to you
      this.passT += dt / 0.9;
      const k = Math.min(1, this.passT), from = this.hoop.clone().setY(this.court.y + 1.0).add(new THREE.Vector3(2.4, 0, 1.2));
      this.ball.position.lerpVectors(from, hands, k); this.ball.position.y = this.court.y + 1.0 - Math.sin(k * Math.PI) * 0.8 + 0.25 * k;
      if (k >= 1) { if (this.shot >= SPOTS.length) this.result(); else this.toSpot(); }
    }
    p.pos.copy(this.spot); p.vel.set(0, 0, 0); p.visY = p.pos.y + (this.throwT > 0 ? Math.sin((this.throwT / 0.45) * Math.PI) * 0.35 : 0);
    p.onGround = true; p.speed = 0; p.yaw = yawTo(this.spot.x, this.spot.z, this.hoop.x, this.hoop.z);
    g.ui.actHud(`🏀 ${tr('Tembakan', 'Shot')} ${Math.min(this.shot + (this.state === 'aim' ? 1 : 0), SPOTS.length)}/${SPOTS.length} · ${tr('poin', 'points')} ${this.points}`, () => this.quit());
    return true;
  }
  private land(res: string) {
    const g = this.g;
    this.fly = null;
    if (res === 'in') {
      const add = this.dist >= THREE_PT ? 3 : 2, before = this.points;
      this.points += add; this.made++;
      g.ui.raceMath(before ? `🏀 ${before} + ${add} = ${this.points}` : `🏀 ${add}`);
      Speech.talk(before ? tr(`${before} tambah ${add} sama dengan ${this.points}`, `${before} plus ${add} makes ${this.points}`) : tr(`Masuk! ${add} poin`, `Basket! ${add} points`), tr('id', 'en') as 'id' | 'en', true, 1);
      SFX.chime(); g.fx.sparkle(this.hoop.x, this.hoop.y, this.hoop.z, 10, 0xff8a2a, 1.6); g.ents.mo.celebrate = 1;
      g.goodWord('basket');
    } else {
      g.ui.raceMath(res === 'rim' ? tr('Kena ring… hampir!', 'Off the rim… so close!') : res === 'short' ? tr('Kurang jauh!', 'Too short!') : tr('Terlalu jauh!', 'Too long!'));
      SFX.pop(1); g.goodWord('missed');
    }
    this.state = 'pass'; this.passT = 0;
  }
  private result() {
    const g = this.g, coins = this.points * 2;
    this.state = 'done'; g.ui.meter(null);
    if (coins) g.addCoins(coins, from => g.ui.coinPop(coins, from));
    SFX.fanfare(); g.ui.confetti(20 + this.made * 10); g.goodWord('finished', true);
    const best = Math.max(g.stats.basketBest ?? 0, this.points); g.stats.basketBest = best;
    g.ui.dialog({
      face: '🏀', who: tr('Selesai!', 'All done!'),
      text: tr(`<b>${this.made} dari ${SPOTS.length}</b> tembakan masuk — <b>${this.points} poin</b>! (terbaik ${best})`, `<b>${this.made} of ${SPOTS.length}</b> shots went in — <b>${this.points} points</b>! (best ${best})`) + `<br>🪙 ${tr(`Setiap poin = 2 koin: ${this.points} + ${this.points} = ${coins}`, `Each point = 2 coins: ${this.points} + ${this.points} = ${coins}`)}`,
      buttons: [{ label: '🏀 ' + tr('Lagi', 'Again'), cls: 'gold', fn: () => { this.end(); setTimeout(() => this.start(), 300); } }, { label: tr('Selesai', 'Done'), cls: 'ghost', fn: () => this.end() }],
    });
    g.checkQuests(); g.saveSoon();
  }
  private end() {
    const g = this.g;
    this.active = false; this.state = 'done'; this.ball.visible = false; this.fly = null;
    g.ents.mo.stand = null; g.ui.actHud(null); g.ui.meter(null);
    g.player.pos.copy(this.court).add(new THREE.Vector3(3, 0, 2));
  }
  /** you: the ball at your chest, then both arms up to shoot */
  pose(r: Rig) {
    const k = this.throwT > 0 ? ease(1 - this.throwT / 0.45) : 0;
    const x = this.state === 'aim' ? -1.25 : -1.25 - k * 1.6;
    r.armL?.rotation.set(x, 0, -0.25); r.armR?.rotation.set(x, 0, 0.25);
  }
  moPose(r: Rig) {
    // Baby Mo waits under the hoop, hands ready
    r.armL?.rotation.set(-1.0, 0, -0.3); r.armR?.rotation.set(-1.0, 0, 0.3);
  }
  camera(cam: THREE.PerspectiveCamera) {
    const s = this.spot, h = this.hoop, dx = s.x - h.x, dz = s.z - h.z, d = Math.hypot(dx, dz) || 1;
    cam.position.set(s.x + (dx / d) * 4.2 + 0.7, this.court.y + 3.3, s.z + (dz / d) * 4.2);
    cam.lookAt(h.x, h.y - 0.6, h.z);
    if (Math.abs(cam.fov - 60) > 0.01) { cam.fov = 60; cam.updateProjectionMatrix(); }
    return true;
  }
}

// ---------------------------------------------------------------- penalties
export const KICKS = 5;
/** the goal mouth: half its width and its height (blocks) */
export const GOAL = { half: 2.5, h: 3 };
/** your aim across the goal (−1 … 1 of the half width; past ±0.92 is wide of the post) */
export const aimSweep = (t: number, speed = 0.9) => Math.sin(t * speed * Math.PI) * 1.05;
/** a kick: wide, saved (Baby Mo got there), or a goal */
export function kickResult(aim: number, keeper: number): 'wide' | 'saved' | 'goal' {
  if (Math.abs(aim) > 0.92) return 'wide';
  return Math.abs(aim - keeper) < 0.42 ? 'saved' : 'goal';
}

export class Soccer implements Activity {
  readonly id = 'soccer';
  active = false;
  kick = 0; goals = 0; private t = 0;
  private state: 'aim' | 'fly' | 'pause' | 'done' = 'aim';
  private goal: THREE.Vector3; private spot: THREE.Vector3;
  private ball: THREE.Mesh; private marker: THREE.Mesh;
  private fly: { to: THREE.Vector3; t: number; res: string } | null = null;
  private keeper = 0; private keeperTo = 0; private kickT = 0; private diveT = 0; private pauseT = 0;
  constructor(private g: Game, l: Landmark) {
    this.goal = new THREE.Vector3(...l.at!.goal); this.spot = new THREE.Vector3(...l.at!.spot);
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshLambertMaterial({ map: ballTex('soccer') }));
    this.marker = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.32, 24), new THREE.MeshBasicMaterial({ color: 0xffd23f, depthTest: false, transparent: true }));
    this.marker.renderOrder = 10;
    for (const m of [this.ball, this.marker]) { m.visible = false; g.scene.add(m); }
  }
  near(p: THREE.Vector3) { return Math.abs(p.x - this.goal.x) < 6.5 && p.z > this.goal.z - 2 && p.z < this.goal.z + 23 && Math.abs(p.y - this.goal.y) < 4; }
  button(): [string, string] { return ['⚽', tr('Adu penalti', 'Penalties')]; }
  open() { this.start(); }
  start() {
    const g = this.g;
    if (g.fun.riding) g.fun.dismount();
    this.active = true; this.kick = 0; this.goals = 0; this.ready();
    g.ents.mo.stand = { pos: new THREE.Vector3(this.goal.x, this.goal.y, this.goal.z + 0.6), yaw: 0 };
    g.goodWord('start', true);
    g.ui.say(tr('Adu penalti! Baby Mo jadi kiper. Bidikan kuning bergeser di gawang — ketuk ✋ untuk menendang. Tendang ke tempat yang tidak dijaga Baby Mo!', 'Penalties! Baby Mo is in goal. The yellow aim slides across the goal — tap ✋ to kick. Kick where Baby Mo isn’t!'), 'alright', 7000);
    g.stats.soccerGames = (g.stats.soccerGames || 0) + 1;
  }
  quit() { if (this.active) this.end(); }
  private ready() { this.state = 'aim'; this.t = Math.random() * 2; this.keeper = 0; this.keeperTo = 0; this.diveT = 0; this.fly = null; }
  private aimPoint(a: number, hgt = 0.45) { return new THREE.Vector3(this.goal.x + a * GOAL.half, this.goal.y + hgt * GOAL.h, this.goal.z); }
  tap() {
    if (this.state !== 'aim') return;
    const a = aimSweep(this.t);
    // Baby Mo guesses: he dives to one side (a little more often the way you're aiming, later in the game)
    const lean = this.kick >= 2 ? 0.35 : 0.15;
    this.keeperTo = (Math.random() < 0.5 + lean * Math.sign(a) ? 1 : -1) * (0.35 + Math.random() * 0.5);
    if (Math.random() < 0.18) this.keeperTo = 0;
    const res = kickResult(a, this.keeperTo);
    this.fly = { to: this.aimPoint(res === 'wide' ? a * 1.15 : a, 0.3 + Math.random() * 0.35), t: 0, res };
    this.state = 'fly'; this.kickT = 0.45; this.kick++;
    SFX.pop(4);
  }
  step(dt: number): boolean {
    if (!this.active) return false;
    const g = this.g, p = g.player, mo = g.ents.mo;
    this.t += dt; this.kickT = Math.max(0, this.kickT - dt);
    const ballSpot = this.spot.clone().setY(this.spot.y + 0.22);
    if (this.state === 'aim') {
      this.ball.position.copy(ballSpot); this.ball.visible = true;
      this.marker.visible = true; this.marker.position.copy(this.aimPoint(aimSweep(this.t))).setZ(this.goal.z + 0.3);
      // Baby Mo shuffles side to side in his goal
      this.keeper = Math.sin(this.t * 1.7) * 0.15;
    } else this.marker.visible = false;
    if (this.fly) {
      const f = this.fly; f.t += dt / 0.6;
      const k = Math.min(1, f.t);
      this.diveT = Math.min(1, this.diveT + dt / 0.45);
      this.keeper += (this.keeperTo - this.keeper) * Math.min(1, dt * 7);
      const to = f.res === 'saved' ? new THREE.Vector3(this.goal.x + this.keeper * GOAL.half, f.to.y, this.goal.z + 0.6) : f.to;
      this.ball.position.lerpVectors(ballSpot, to, k); this.ball.position.y += Math.sin(k * Math.PI) * 0.4;
      this.ball.rotation.x -= dt * 14;
      if (k >= 1) this.land(f.res);
    }
    if (this.state === 'pause' && (this.pauseT -= dt) <= 0) { if (this.kick >= KICKS) this.result(); else this.ready(); }
    if (mo.stand) { mo.stand.pos.x = this.goal.x + this.keeper * GOAL.half; mo.stand.pos.z = this.goal.z + 0.6; }
    // you stand just behind the ball, facing the goal
    p.pos.set(this.spot.x - 0.3, this.spot.y, this.spot.z + 1.1); p.vel.set(0, 0, 0); p.visY = p.pos.y; p.onGround = true; p.speed = 0;
    p.yaw = yawTo(p.pos.x, p.pos.z, this.goal.x, this.goal.z);
    g.ui.actHud(`⚽ ${tr('Tendangan', 'Kick')} ${Math.min(this.kick + (this.state === 'aim' ? 1 : 0), KICKS)}/${KICKS} · ${tr('gol', 'goals')} ${this.goals}`, () => this.quit());
    return true;
  }
  private land(res: string) {
    const g = this.g;
    this.fly = null;
    if (res === 'goal') {
      this.goals++; SFX.chime(); g.ui.confetti(25); g.fx.sparkle(this.ball.position.x, this.ball.position.y, this.ball.position.z, 10, 0xffffff, 1.6);
      g.ui.raceMath(tr(`GOL! ⚽ ${this.goals}`, `GOAL! ⚽ ${this.goals}`)); Speech.talk(tr('Gol!', 'Goal!'), tr('id', 'en') as 'id' | 'en', true, 1);
      g.goodWord('goal');
    } else if (res === 'saved') {
      g.ui.raceMath(tr('Ditangkap Baby Mo! 🧤', 'Saved by Baby Mo! 🧤')); SFX.pop(2); g.ents.mo.celebrate = 1; g.goodWord('missed');
    } else { g.ui.raceMath(tr('Melebar!', 'Wide!')); SFX.pop(1); g.goodWord('missed'); }
    this.state = 'pause'; this.pauseT = 1.4;
  }
  private result() {
    const g = this.g, coins = this.goals * 10;
    this.state = 'done';
    if (coins) g.addCoins(coins, from => g.ui.coinPop(coins, from));
    SFX.fanfare(); g.ui.confetti(20 + this.goals * 10); g.goodWord(this.goals >= 3 ? 'won' : 'finished', true);
    g.stats.soccerGoals = (g.stats.soccerGoals || 0) + this.goals;
    const sum = this.goals ? Array(this.goals).fill(10).join(' + ') + ` = ${coins}` : '0';
    g.ui.dialog({
      face: '⚽', who: tr('Selesai!', 'All done!'),
      text: tr(`<b>${this.goals} gol</b> dari ${KICKS} tendangan!`, `<b>${this.goals} goals</b> from ${KICKS} kicks!`) + `<br>🪙 ${tr('Setiap gol 10 koin', 'Each goal is 10 coins')}: ${sum}`,
      buttons: [{ label: '⚽ ' + tr('Lagi', 'Again'), cls: 'gold', fn: () => { this.end(); setTimeout(() => this.start(), 300); } }, { label: tr('Selesai', 'Done'), cls: 'ghost', fn: () => this.end() }],
    });
    g.checkQuests(); g.saveSoon();
  }
  private end() {
    const g = this.g;
    this.active = false; this.state = 'done'; this.ball.visible = false; this.marker.visible = false; this.fly = null;
    g.ents.mo.stand = null; g.ui.actHud(null);
    g.player.pos.copy(this.spot).add(new THREE.Vector3(4, 0, 2));
  }
  /** you: the kicking leg swings back and through, arms out for balance */
  pose(r: Rig) {
    const k = this.kickT > 0 ? 1 - this.kickT / 0.45 : 0;
    const leg = this.kickT > 0 ? (k < 0.35 ? (k / 0.35) * 0.9 : 0.9 - ((k - 0.35) / 0.65) * 2.3) : 0;
    const [, right] = r.legs; right?.rotation.set(leg, 0, 0);
    r.armL?.rotation.set(-0.3, 0, -0.7 * (this.kickT > 0 ? 1 : 0.3)); r.armR?.rotation.set(-0.3, 0, 0.7 * (this.kickT > 0 ? 1 : 0.3));
  }
  /** Baby Mo: ready, then diving with his arms out */
  moPose(r: Rig) {
    const side = Math.sign(this.keeper - 0.0001), dive = this.state === 'fly' || this.state === 'pause' ? Math.min(1, Math.abs(this.keeper) * 1.4) : 0;
    r.body.rotation.z = -side * dive * 0.9;
    r.armL?.rotation.set(-2.6 * (0.4 + dive * 0.6), 0, -0.3); r.armR?.rotation.set(-2.6 * (0.4 + dive * 0.6), 0, 0.3);
  }
  camera(cam: THREE.PerspectiveCamera) {
    const s = this.spot;
    cam.position.set(s.x + 0.3, s.y + 2.4, s.z + 4.6);
    cam.lookAt(this.goal.x, this.goal.y + 1.2, this.goal.z);
    if (Math.abs(cam.fov - 55) > 0.01) { cam.fov = 55; cam.updateProjectionMatrix(); }
    return true;
  }
}
