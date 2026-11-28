// The ice rink. At the ticket booth you rent skates (10 coins, for today) or
// buy your own (60 coins) — the booth shows the sum: 150 − 10 = 140. Then
// glide! Ice is slippery: push with the joystick and you keep sliding; you
// bounce gently off the boards. Jump makes a spin. Collect the snowflakes ❄️
// dotted over the ice; Baby Mo skates circles round the rink.
import * as THREE from 'three';
import type { Game } from '../main';
import { tr } from '../i18n';
import type { Landmark } from '../world/landmarks';
import type { Activity } from './activity';
import type { Rig } from './models';
import { SFX } from './audio';

export const RENT = 10, BUY = 60, FLAKES = 8;
export const PUSH = 6, GLIDE = 0.35, MAX = 7.5;
/** one step of skating: push the way you're pressing, keep gliding, slow down only a little */
export function skateStep(v: { x: number; z: number }, push: { x: number; z: number }, dt: number) {
  const n = Math.hypot(push.x, push.z);
  if (n > 0.1) { v.x += (push.x / Math.max(1, n)) * PUSH * dt; v.z += (push.z / Math.max(1, n)) * PUSH * dt; }
  const f = Math.max(0, 1 - GLIDE * dt); v.x *= f; v.z *= f;
  const sp = Math.hypot(v.x, v.z); if (sp > MAX) { v.x *= MAX / sp; v.z *= MAX / sp; }
  return v;
}
/** keep inside the boards: a gentle bounce back off them */
export function bounce(pos: { x: number; z: number }, v: { x: number; z: number }, b: { x0: number; x1: number; z0: number; z1: number }) {
  let hit = false;
  if (pos.x < b.x0) { pos.x = b.x0; v.x = Math.abs(v.x) * 0.5; hit = true; }
  if (pos.x > b.x1) { pos.x = b.x1; v.x = -Math.abs(v.x) * 0.5; hit = true; }
  if (pos.z < b.z0) { pos.z = b.z0; v.z = Math.abs(v.z) * 0.5; hit = true; }
  if (pos.z > b.z1) { pos.z = b.z1; v.z = -Math.abs(v.z) * 0.5; hit = true; }
  return hit;
}

function flakeMesh() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d')!; x.font = '52px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('❄️', 32, 36);
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true })); s.scale.setScalar(0.8);
  return s;
}

export class IceRink implements Activity {
  readonly id = 'skating';
  active = false;
  got = 0; spins = 0;
  private rink: THREE.Vector3; private booth: THREE.Vector3;
  private b: { x0: number; x1: number; z0: number; z1: number };
  private v = { x: 0, z: 0 }; private pos = new THREE.Vector3(); private stride = 0; private spinT = 0; private heading = 0;
  private flakes: THREE.Sprite[] = []; private moA = 0; private wasJump = false; private bumpAt = 0;
  constructor(private g: Game, l: Landmark) {
    this.rink = new THREE.Vector3(...l.at!.rink); this.booth = new THREE.Vector3(...l.at!.booth);
    this.b = { x0: this.rink.x - 9.1, x1: this.rink.x + 9.1, z0: this.rink.z - 6.1, z1: this.rink.z + 7.1 };
  }
  private get skates() { return this.g.stats.skates; }
  /** you have skates for today (rented) or your own */
  get canSkate() { const s = this.skates; return s === 'own' || (typeof s === 'number' && s === this.g.day); }
  near(p: THREE.Vector3) { return Math.abs(p.y - this.rink.y) < 4 && ((Math.abs(p.x - this.booth.x) < 3.5 && Math.abs(p.z - this.booth.z) < 3) || (p.x > this.b.x0 - 0.5 && p.x < this.b.x1 + 0.5 && p.z > this.b.z0 - 0.5 && p.z < this.b.z1 + 0.5)); }
  button(): [string, string] { return this.canSkate ? ['⛸️', tr('Meluncur', 'Skate')] : ['🎟️', tr('Loket sepatu es', 'Skate booth')]; }
  open() {
    const g = this.g;
    if (this.canSkate) { this.start(); return; }
    const c = g.stats.coins || 0;
    g.ui.dialog({
      face: '🎟️', who: tr('Loket Sepatu Es', 'The Skate Booth'),
      text: tr(`Sewa sepatu es untuk hari ini: <b>${RENT} koin</b>, atau beli sepasang untukmu sendiri: <b>${BUY} koin</b>.<br>Koinmu: ${c}. Kalau sewa: ${c} − ${RENT} = <b>${c - RENT}</b>. Kalau beli: ${c} − ${BUY} = <b>${c - BUY}</b>.`,
        `Rent skates for today: <b>${RENT} coins</b>, or buy your own pair: <b>${BUY} coins</b>.<br>You have ${c} coins. Rent: ${c} − ${RENT} = <b>${c - RENT}</b>. Buy: ${c} − ${BUY} = <b>${c - BUY}</b>.`),
      buttons: [
        { label: `⛸️ ${tr('Sewa', 'Rent')} (${RENT} 🪙)`, cls: 'gold', fn: () => this.pay(RENT) },
        { label: `🛍️ ${tr('Beli', 'Buy')} (${BUY} 🪙)`, fn: () => this.pay(BUY) },
        { label: tr('Nanti saja', 'Not now'), cls: 'ghost' },
      ],
    });
  }
  private pay(n: number) {
    const g = this.g;
    if (!g.spendCoins(n)) { SFX.error(); g.ui.toast(tr('Koinnya belum cukup. Main dan selesaikan misi untuk dapat koin!', 'Not enough coins yet. Play and finish quests to earn coins!'), 3500); return; }
    g.stats.skates = n === BUY ? 'own' : g.day;
    g.goodWord('gift', true);
    g.ui.toast(n === BUY ? tr('⛸️ Sepatu es milikmu sendiri! Alhamdulillah', '⛸️ Your very own skates! Alhamdulillah') : tr('⛸️ Sepatu es disewa untuk hari ini', '⛸️ Skates rented for today'), 3000);
    g.saveSoon();
    setTimeout(() => this.start(), 400);
  }
  start() {
    const g = this.g;
    if (g.fun.riding) g.fun.dismount();
    this.active = true; this.got = 0; this.spins = 0; this.v = { x: 0, z: 0 };
    this.pos.set(this.rink.x, this.rink.y, this.b.z1 - 1); this.heading = 0;
    this.layFlakes();
    g.ents.mo.stand = { pos: new THREE.Vector3(this.rink.x, this.rink.y, this.rink.z), yaw: 0 };
    g.goodWord('start', true);
    g.ui.say(tr('Es itu licin! Dorong dengan joystick, lalu meluncur. Tekan lompat untuk berputar ✨. Kumpulkan kepingan salju ❄️!', 'Ice is slippery! Push with the joystick, then glide. Press jump to spin ✨. Collect the snowflakes ❄️!'), 'alright', 7000);
    g.stats.skateDays = (g.stats.skateDays || 0) + 1;
  }
  quit() { if (this.active) this.end(); }
  tap() { this.spin(); }
  private spin() { if (this.spinT > 0) return; this.spinT = 0.8; this.spins++; SFX.pop(6); this.g.fx.sparkle(this.pos.x, this.pos.y + 1, this.pos.z, 8, 0xbfe8ff, 1.4); }
  private layFlakes() {
    for (const f of this.flakes) this.g.scene.remove(f);
    this.flakes = [];
    for (let i = 0; i < FLAKES; i++) {
      const s = flakeMesh();
      const a = (i / FLAKES) * Math.PI * 2;
      s.position.set(this.rink.x + Math.cos(a) * 6.5, this.rink.y + 0.9, this.rink.z + 0.5 + Math.sin(a) * 4.2);
      this.g.scene.add(s); this.flakes.push(s);
    }
  }
  step(dt: number, t: number): boolean {
    if (!this.active) return false;
    const g = this.g, p = g.player, ax = g.input.axis();
    // the joystick, turned to the way the camera looks
    const fwd = { x: -Math.sin(p.yaw), z: -Math.cos(p.yaw) }, right = { x: Math.cos(p.yaw), z: -Math.sin(p.yaw) };
    const push = { x: right.x * ax.fx - fwd.x * ax.fz, z: right.z * ax.fx - fwd.z * ax.fz };
    skateStep(this.v, push, dt);
    this.pos.x += this.v.x * dt; this.pos.z += this.v.z * dt;
    if (bounce(this.pos, this.v, this.b) && performance.now() - this.bumpAt > 1500) { this.bumpAt = performance.now(); SFX.pop(1); }
    const sp = Math.hypot(this.v.x, this.v.z);
    if (sp > 0.3) this.heading = Math.atan2(-this.v.x, -this.v.z);
    this.stride += dt * (2 + sp * 0.9);
    // jump spins (the button, or ✋)
    const j = g.input.jump(); if (j && !this.wasJump) this.spin(); this.wasJump = j;
    this.spinT = Math.max(0, this.spinT - dt);
    // snowflakes
    for (const f of this.flakes) {
      if (!f.visible) continue;
      f.position.y = this.rink.y + 0.9 + Math.sin(t * 2 + f.position.x) * 0.12;
      if (Math.hypot(f.position.x - this.pos.x, f.position.z - this.pos.z) < 1.0) {
        f.visible = false; this.got++; SFX.pop(Math.min(8, this.got)); g.fx.sparkle(f.position.x, f.position.y, f.position.z, 6, 0xffffff, 1.2);
        g.ui.raceMath(`❄️ ${this.got} / ${FLAKES}`);
        if (this.flakes.every(x => !x.visible)) this.allFlakes();
      }
    }
    // Baby Mo skates circles round the middle
    this.moA += dt * 0.5;
    const mo = g.ents.mo; if (mo.stand) { mo.stand.pos.set(this.rink.x + Math.cos(this.moA) * 4, this.rink.y, this.rink.z + 0.5 + Math.sin(this.moA) * 2.6); mo.stand.yaw = Math.atan2(-Math.sin(this.moA) * 4, Math.cos(this.moA) * 2.6); }
    p.pos.copy(this.pos); p.vel.set(0, 0, 0); p.visY = this.pos.y + (this.spinT > 0 ? Math.sin((this.spinT / 0.8) * Math.PI) * 0.3 : 0); p.onGround = true; p.speed = 0;
    g.ui.actHud(`⛸️ ❄️ ${this.got}/${FLAKES} · ✨ ${tr('putaran', 'spins')} ${this.spins}`, () => this.quit());
    return true;
  }
  private allFlakes() {
    const g = this.g, coins = 20;
    g.addCoins(coins, from => g.ui.coinPop(coins, from));
    SFX.fanfare(); g.ui.confetti(40); g.goodWord('beautiful', true);
    g.ui.toast(tr(`❄️ Semua kepingan salju terkumpul! +${coins} koin. Kepingan baru muncul!`, `❄️ All the snowflakes! +${coins} coins. New ones are coming!`), 3500);
    g.stats.flakeSets = (g.stats.flakeSets || 0) + 1;
    setTimeout(() => { if (this.active) { this.got = 0; this.layFlakes(); } }, 2000);
  }
  private end() {
    const g = this.g;
    this.active = false;
    for (const f of this.flakes) g.scene.remove(f);
    this.flakes = [];
    g.ents.mo.stand = null; g.ui.actHud(null);
    g.player.pos.set(this.booth.x + 2.5, this.booth.y, this.booth.z + 1.5);
  }
  /** you: leaning forward, pushing out with one skate then the other, arms swinging; spinning when you jump */
  pose(r: Rig) {
    const ph = Math.sin(this.stride * 2.2), sp = Math.min(1, Math.hypot(this.v.x, this.v.z) / 4);
    const [l, rr] = r.legs;
    l?.rotation.set(-0.15 * sp, 0, -0.08 - Math.max(0, ph) * 0.45 * sp);
    rr?.rotation.set(-0.15 * sp, 0, 0.08 + Math.max(0, -ph) * 0.45 * sp);
    r.armL?.rotation.set(ph * 0.6 * sp, 0, -0.35); r.armR?.rotation.set(-ph * 0.6 * sp, 0, 0.35);
    r.body.rotation.x += 0.25 * sp;
    r.root.rotation.y = this.heading + Math.PI + (this.spinT > 0 ? (1 - this.spinT / 0.8) * Math.PI * 2 : 0);
  }
  /** Baby Mo skates too */
  moPose(r: Rig) {
    const ph = Math.sin(this.moA * 7);
    const [l, rr] = r.legs;
    l?.rotation.set(-0.1, 0, -0.08 - Math.max(0, ph) * 0.35); rr?.rotation.set(-0.1, 0, 0.08 + Math.max(0, -ph) * 0.35);
    r.armL?.rotation.set(ph * 0.5, 0, -0.35); r.armR?.rotation.set(-ph * 0.5, 0, 0.35);
    r.body.rotation.x += 0.2;
  }
}
