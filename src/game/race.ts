// Go-kart races at the race track: you, Baby Mo and two racers, two laps.
// Kept easy for a child: after GO your kart drives by itself, you only steer
// (the joystick pulled back brakes), and a gentle helper keeps you pointing
// along the track. The others follow the racing line; the ones far ahead ease
// off a little and the ones far behind push harder, so it stays a close race.
import * as THREE from 'three';
import type { Game } from '../main';
import { tr } from '../i18n';
import type { Landmark } from '../world/landmarks';
import { buildBlocky, type BlockyOpts } from './blocky';
import { applyPrayerPose, type Rig } from './models';
import { SFX, Speech } from './audio';
import { getLang } from '../i18n';
import { LAP, TRACK, cellKind, coinPlan, laneOf, onBoost, pointAt, progressOf, ranking } from './track';

export const LAPS = 2;
export const PRIZE = [100, 60, 40, 30];
const MAX = 13.5, OFF = 6;

interface Kart {
  obj: THREE.Group; name: string; color: number;
  // AI: distance driven along the lap line and the lane; player: position, heading and speed
  s: number; lane: number; top: number;
  x: number; z: number; yaw: number; v: number;
  rig?: Rig; done?: number;
}

const DRIVERS: { name: string; color: number; look?: BlockyOpts }[] = [
  { name: 'Kak Dina', color: 0x2f6fde, look: { skin: '#E8B48A', shirt: 0x2f6fde, pants: 0x2a3550, hijab: 0x1f2a44, tunic: true, adult: true, lashes: true, backpack: null, emblem: null, hair: 0x2b2018, shoes: 0xf4f4f4 } },
  { name: 'Bang Rizal', color: 0xf2b134, look: { skin: '#D9A27A', shirt: 0xf2b134, pants: 0x3b3a3d, peci: 0xe4423a, adult: true, backpack: null, emblem: null, hair: 0x1f1a1a, shoes: 0x3b3a3d } },
];

/** the sum for the coins you just picked up: what to show and what to say */
export function addLine(before: number, add: number): { show: string; say: [string, string] } {
  const after = before + add;
  if (before === 0) return { show: `🪙 ${after}`, say: [`${after} koin!`, after === 1 ? 'One coin!' : `${after} coins!`] };
  return {
    show: `🪙 ${before} + ${add} = ${after}`,
    say: [`${before} tambah ${add} sama dengan ${after}. Sekarang koinmu ${after}!`, `${before} plus ${add} makes ${after}. Now you have ${after} coins!`],
  };
}

interface TrackCoin { s: number; lane: number; group: number; mesh: THREE.Object3D; taken: boolean }

export class Race {
  active = false;
  phase: 'count' | 'go' | 'done' = 'count';
  karts: Kart[] = [];
  private t = 0; private count = 0; private prevS = 0;
  /** metres driven since the start line (laps × LAP + this lap) */
  total = 0;
  readonly cx: number; readonly cz: number; readonly y: number;
  constructor(private g: Game, l: Landmark) {
    const c = l.at!.centre; this.cx = c[0]; this.cz = c[2]; this.y = c[1];
  }
  /** the karts waiting on the grid when nobody is racing, so you can find them */
  private parked: THREE.Group[] = []; private armed = true;
  /** the grid spots: you and Baby Mo in front, the racers behind */
  static readonly GRID: [number, number][] = [[-2.5, 1.8], [-2.5, -1.8], [-7, 1.8], [-7, -1.8]];
  /** your kart's place on the grid */
  myKart() { const p = pointAt(Race.GRID[0][0], Race.GRID[0][1]); return new THREE.Vector3(this.cx + p.x, this.y, this.cz + p.z); }
  /**
   * Every half second when not racing: the karts wait on the grid while you're near, Baby Mo
   * tells you where they are the first time, and walking up to your red kart starts a race.
   */
  idle(p: THREE.Vector3) {
    const g = this.g, close = !this.active && Math.abs(p.x - this.cx) < TRACK.half + TRACK.R + 30 && Math.abs(p.z - this.cz) < TRACK.R + 30 && Math.abs(p.y - this.y) < 20;
    if (close && !this.parked.length) {
      this.parked = Race.GRID.map(([s, lane], i) => {
        const obj = kartModel([0xe4423a, 0x8dc63f, DRIVERS[0].color, DRIVERS[1].color][i]);
        const q = pointAt(s, lane); obj.position.set(this.cx + q.x, this.y, this.cz + q.z); obj.rotation.y = q.yaw;
        g.scene.add(obj); return obj;
      });
    } else if (!close && this.parked.length) this.clearParked();
    if (!close) return;
    const k = this.myKart(), d = Math.hypot(p.x - k.x, p.z - k.z);
    if (!g.stats.raceHint && this.near(p) && !g.ui.isOpen()) {
      g.stats.raceHint = 1;
      g.ui.say(tr('Gokartnya ada di garis start, di bawah lampu start! Naik ke gokart merah, atau ketuk 🏁 Balapan! 🏎️', 'The go-karts are on the start line, under the start lights! Walk to the red kart, or tap 🏁 Race! 🏎️'), 'idea', 7000);
    }
    if (d > 4) this.armed = true;
    else if (d < 1.4 && this.armed && !g.fun.riding && !g.ui.isOpen() && !g.tennis?.active) { this.armed = false; this.start(); }
  }
  private clearParked() { for (const o of this.parked) this.g.scene.remove(o); this.parked = []; }

  /** close enough to the track to start a race */
  near(p: THREE.Vector3) { return Math.abs(p.x - this.cx) < TRACK.half + TRACK.R + 12 && Math.abs(p.z - this.cz) < TRACK.R + 14 && Math.abs(p.y - this.y) < 6; }
  // the coins on the track, and adding them up
  private coins: TrackCoin[] = []; private coinLap = 0;
  /** coins picked up this race */
  got = 0;
  private sum: { group: number; before: number; add: number; at: number } | null = null;
  private boostT = 0;
  private coinMat = new THREE.MeshLambertMaterial({ color: 0xffc83d, emissive: 0x8a5a00, emissiveIntensity: 0.45 });
  private coinGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.14, 20);
  private layCoins(lap: number) {
    this.clearCoins(); this.coinLap = lap;
    for (const c of coinPlan(lap)) {
      // a gold disc standing up, spinning round so you see its face
      const p = pointAt(c.s, c.lane), mesh = new THREE.Group(), disc = new THREE.Mesh(this.coinGeo, this.coinMat);
      disc.rotation.x = Math.PI / 2; mesh.add(disc); mesh.rotation.y = c.s;
      mesh.position.set(this.cx + p.x, this.y + 1.0, this.cz + p.z);
      this.g.scene.add(mesh); this.coins.push({ ...c, mesh, taken: false });
    }
  }
  private clearCoins() { for (const c of this.coins) this.g.scene.remove(c.mesh); this.coins = []; }
  /** say the sum for the coins just picked up */
  private flushSum() {
    const s = this.sum; if (!s) return; this.sum = null;
    const line = addLine(s.before, s.add);
    this.g.ui.raceMath(line.show);
    Speech.talk(getLang() === 'en' ? line.say[1] : line.say[0], getLang(), true, 1);
  }
  /** where you are on the track: laps done and metres into this one */
  get lap() { return Math.min(LAPS, Math.floor(Math.max(0, this.total) / LAP) + 1); }

  start() {
    const g = this.g;
    if (this.active) return;
    if (g.fun.riding) g.fun.dismount();
    this.active = true; this.phase = 'count'; this.t = 0; this.count = 3; this.armed = false;
    this.clearParked();
    // the grid, just behind the start line: you and Baby Mo in front, the racers behind
    const grid = Race.GRID;
    this.got = 0; this.sum = null; this.boostT = 0; this.layCoins(1);
    const colors = [0xe4423a, 0x8dc63f];
    this.karts = grid.map(([s, lane], i) => {
      const d = i >= 2 ? DRIVERS[i - 2] : null;
      const color = d ? d.color : colors[i];
      const obj = kartModel(color);
      g.scene.add(obj);
      const k: Kart = { obj, name: d?.name ?? (i === 0 ? tr('Kamu', 'You') : 'Baby Mo'), color, s, lane, top: i === 1 ? 13.1 : i === 2 ? 13.6 : 13.0, x: 0, z: 0, yaw: 0, v: 0 };
      if (d?.look) { k.rig = buildBlocky(d.look); obj.add(k.rig.root); k.rig.root.position.set(0, 0.05, -0.1); applyPrayerPose(k.rig, 'julus'); }
      const p = pointAt(s, lane); k.x = this.cx + p.x; k.z = this.cz + p.z; k.yaw = p.yaw;
      return k;
    });
    this.prevS = progressOf(this.karts[0].x - this.cx, this.karts[0].z - this.cz); this.total = this.prevS - LAP; // just behind the line
    g.ents.mo.seat = { pos: new THREE.Vector3(), yaw: 0 };
    this.place();
    SFX.click();
    g.ui.say(tr('Siap? Setelah GO, gokartmu jalan sendiri — kamu tinggal belok dengan joystick. Tarik ke bawah untuk mengerem. Bismillah!', 'Ready? After GO your kart drives by itself — you just steer with the joystick. Pull back to brake. Bismillah!'), 'idea', 6000);
    g.stats.races = (g.stats.races || 0) + 1;
  }

  /** leave the race (✋ or the button) */
  quit() { if (this.active) this.finish(true); }

  /** moves everything; true while it replaces normal walking */
  step(dt: number): boolean {
    if (!this.active) return false;
    const g = this.g;
    this.t += dt;
    if (this.phase === 'count') {
      const c = 3 - Math.floor(this.t);
      if (c !== this.count) { this.count = c; if (c > 0) SFX.pop(2); else { SFX.chime(); this.phase = 'go'; this.t = 0; } }
      g.ui.raceCount(c > 0 ? String(c) : 'GO!');
      this.place(); return true;
    }
    if (this.phase === 'go' && this.t > 0.8) g.ui.raceCount(null);
    if (this.phase === 'done') { this.place(); return true; }
    // you: drive on by yourself, steer with the joystick, pull back to brake
    const me = this.karts[0], ax = g.input.axis();
    const local = (x: number, z: number) => [x - this.cx, z - this.cz] as const;
    const [lx, lz] = local(me.x, me.z), kind = cellKind(lx, lz);
    // the yellow arrows: a burst of speed
    if (onBoost(progressOf(lx, lz), laneOf(lx, lz)) && this.boostT < 0.9) { if (this.boostT <= 0) { SFX.pop(6); g.fx.sparkle(me.x, this.y + 0.6, me.z, 8, 0xffd84a, 1.5); } this.boostT = 1.3; }
    this.boostT = Math.max(0, this.boostT - dt);
    const top = (kind === 'track' || kind === 'kerb' ? MAX : OFF) * (this.boostT > 0 ? 1.5 : 1);
    const want = ax.fz > 0.4 ? 0 : top;
    me.v += (want - me.v) * Math.min(1, dt * (want < me.v ? 3 : 1.4));
    me.yaw -= ax.fx * 2.3 * dt * Math.min(1, me.v / 5 + 0.3);
    // the helper: turn gently towards the track's direction just ahead
    const ahead = pointAt(progressOf(lx, lz) + 4);
    let dy = Math.atan2(this.cx + ahead.x - me.x, this.cz + ahead.z - me.z) - me.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    me.yaw += dy * Math.min(1, dt * (Math.abs(ax.fx) > 0.2 ? 0.6 : 2.2));
    const nx = me.x + Math.sin(me.yaw) * me.v * dt, nz = me.z + Math.cos(me.yaw) * me.v * dt;
    const nk = cellKind(nx - this.cx, nz - this.cz);
    if (nk === 'wall' || g.world.solidAt(Math.floor(nx), Math.floor(this.y + 0.2), Math.floor(nz))) { me.v *= -0.25; SFX.pop(1); }
    else { me.x = nx; me.z = nz; }
    // laps: follow your progress round the line
    const s = progressOf(me.x - this.cx, me.z - this.cz);
    let d = s - this.prevS; if (d < -LAP / 2) d += LAP; if (d > LAP / 2) d -= LAP;
    this.total += d; this.prevS = s;
    // the coins: pick them up, and add them up group by group
    if (this.lap !== this.coinLap && this.total >= 0) { this.flushSum(); this.layCoins(this.lap); }
    for (const c of this.coins) {
      if (c.taken) continue;
      c.mesh.rotation.y += dt * 3;
      if (Math.hypot(c.mesh.position.x - me.x, c.mesh.position.z - me.z) < 1.6) {
        c.taken = true; c.mesh.visible = false; this.got++;
        SFX.pop(Math.min(8, this.got % 9)); g.fx.sparkle(c.mesh.position.x, c.mesh.position.y, c.mesh.position.z, 6, 0xffc83d, 1.2);
        if (this.sum && this.sum.group !== c.group) this.flushSum();
        if (this.sum) this.sum.add++; else this.sum = { group: c.group, before: this.got - 1, add: 1, at: 0 };
        this.sum.at = this.t;
      }
    }
    if (this.sum && this.t - this.sum.at > 0.9) this.flushSum();
    // the others: along the racing line, keeping it close
    for (const k of this.karts.slice(1)) {
      if (k.done !== undefined) { k.s += 4 * dt; continue; }
      const gap = k.s - this.total;
      const pace = k.top + (gap > 12 ? -2.2 : gap < -12 ? 1.6 : 0) + Math.sin(this.t * 0.7 + k.top) * 0.4;
      k.v += (pace - k.v) * Math.min(1, dt * 1.2);
      k.s += k.v * dt;
      if (k.s >= LAPS * LAP) k.done = this.t;
    }
    for (const k of this.karts.slice(1)) { const p = pointAt(k.s, k.lane); k.x = this.cx + p.x; k.z = this.cz + p.z; k.yaw = p.yaw; }
    this.place();
    const order = this.order();
    g.ui.raceHud({ lap: this.lap, laps: LAPS, place: order.indexOf(0) + 1, of: this.karts.length, time: this.t, coins: this.got });
    if (this.total >= LAPS * LAP) this.finish(false);
    return true;
  }

  /** everyone's place: laps and metres driven */
  private order() { return ranking(this.karts.map((k, i) => (i === 0 ? this.total : k.s))); }

  private place() {
    const g = this.g, wob = Math.sin(performance.now() / 90) * 0.02;
    for (const [i, k] of this.karts.entries()) {
      k.obj.position.set(k.x, this.y + 0.02 + (k.v > 1 ? wob : 0), k.z); k.obj.rotation.y = k.yaw;
      const wheels = k.obj.userData.wheels as THREE.Mesh[] | undefined; wheels?.forEach(w => (w.rotation.x += k.v * 0.05));
      if (i === 1) { const seat = g.ents.mo.seat; if (seat) { seat.pos.set(k.x, this.y - 0.15, k.z); seat.yaw = k.yaw; } }
    }
    const me = this.karts[0], p = g.player;
    p.pos.set(me.x, this.y + 0.05, me.z); p.vel.set(0, 0, 0); p.visY = p.pos.y; p.onGround = true; p.speed = 0;
    p.yaw = me.yaw + Math.PI; // the camera looks the way you drive
  }

  private finish(quit: boolean) {
    const g = this.g, order = this.order(), place = order.indexOf(0) + 1, time = this.t;
    this.phase = 'done';
    g.ui.raceHud(null); g.ui.raceCount(null);
    this.flushSum();
    const end = () => {
      this.clearCoins();
      for (const k of this.karts) g.scene.remove(k.obj);
      this.karts = []; this.active = false;
      g.ents.mo.seat = null;
      // step out beside the start line
      g.player.pos.set(this.cx + 2, this.y, this.cz + 4); g.player.vel.set(0, 0, 0); g.player.visY = this.y;
      g.ents.mo.pos.set(this.cx + 3, this.y, this.cz + 4);
    };
    if (quit) { end(); g.ui.toast(tr('🏁 Keluar dari balapan', '🏁 Left the race'), 2500); return; }
    const got = this.got, coins = (PRIZE[place - 1] ?? 20) + got;
    const st = g.stats; st.raceBest = Math.min(st.raceBest ?? Infinity, time); if (place === 1) st.raceWins = (st.raceWins || 0) + 1;
    g.addCoins(coins, from => g.ui.coinPop(coins, from));
    SFX.fanfare(); g.ui.confetti(place === 1 ? 80 : 40); g.ents.mo.celebrate = 2.5;
    const nth = [tr('juara 1', '1st'), tr('juara 2', '2nd'), tr('juara 3', '3rd'), tr('ke-4', '4th')][place - 1];
    const secs = time.toFixed(1);
    g.ui.dialog({
      face: place === 1 ? '🏆' : '🏁', who: tr('Garis finis!', 'Finish line!'),
      text: (place === 1 ? tr(`<b>Kamu ${nth}!</b> Alhamdulillah! 🎉`, `<b>You came ${nth}!</b> Alhamdulillah! 🎉`) : tr(`<b>Kamu ${nth}!</b> Hebat, tetap semangat! Ayo beri selamat ke pemenangnya 🤝`, `<b>You came ${nth}!</b> Well driven! Let’s congratulate the winner 🤝`))
        + `<br>🪙 ${tr(`Kamu mengumpulkan <b>${got}</b> koin di lintasan!`, `You collected <b>${got}</b> coins on the track!`)}`
        + `<br>⏱️ ${secs} ${tr('detik', 'seconds')} · ${tr('rekor', 'best')} ${st.raceBest!.toFixed(1)} · 🪙 +${coins}`,
      buttons: [{ label: '🏁 ' + tr('Balapan lagi', 'Race again'), cls: 'gold', fn: () => { end(); setTimeout(() => this.start(), 300); } }, { label: tr('Selesai', 'Done'), fn: end }],
    });
    g.checkQuests(); g.saveSoon();
  }
}

/** a little go-kart: a low body with a nose, a seat, a steering wheel and four fat wheels (faces +z) */
function kartModel(color: number) {
  const g = new THREE.Group(), m = (c: number) => new THREE.MeshLambertMaterial({ color: c });
  const box = (w: number, h: number, d: number, c: number, x: number, y: number, z: number) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(c)); b.position.set(x, y, z); g.add(b); return b; };
  box(1.0, 0.18, 1.8, color, 0, 0.28, 0);
  box(0.7, 0.16, 0.5, color, 0, 0.36, 0.85);
  box(1.1, 0.08, 0.3, 0xffffff, 0, 0.32, 1.02);
  box(0.6, 0.45, 0.12, 0x2b2b30, 0, 0.55, -0.45);
  box(0.6, 0.1, 0.5, 0x2b2b30, 0, 0.4, -0.25);
  const sw = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 12), m(0x222222)); sw.position.set(0, 0.62, 0.35); sw.rotation.x = -0.9; g.add(sw);
  const wheels: THREE.Mesh[] = [];
  for (const [x, z] of [[-0.55, 0.6], [0.55, 0.6], [-0.55, -0.6], [0.55, -0.6]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 12), m(0x1d1d20)); w.rotation.z = Math.PI / 2; w.position.set(x, 0.22, z); g.add(w); wheels.push(w);
  }
  g.userData.wheels = wheels;
  return g;
}
