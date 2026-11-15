// Go-kart races on the three race tracks (the big circuit, the Snow track and the Desert track):
// you, Baby Mo and the racers, three laps, with mystery boxes, boost pads and a jump ramp.
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
import { TRACKS, ranking, rollPower, POWER_ICON, POWER_NAME, type Track, type TrackKind, type PowerUp } from './track';

export const LAPS = 3;
export const PRIZE = [100, 60, 40, 30, 25, 20];
/** the big races of the day, by the game clock: a notice comes a little before, and villagers come to watch */
export const RACE_TIMES = [10, 16];
/** is it time to tell you about the big race? (the hour just went past a quarter of an hour before one) */
export function raceSoon(before: number, now: number): number | null {
  for (const h of RACE_TIMES) { const at = h - 0.25; if (before < at && now >= at) return h; }
  return null;
}
/** are the villagers at the grandstand? (from half an hour before a big race until an hour and a half after) */
export const crowdTime = (hour: number) => RACE_TIMES.some(h => hour >= h - 0.5 && hour < h + 1.5);
const MAX = 13.5, OFF = 6;

interface Kart {
  obj: THREE.Group; name: string; color: number;
  // AI: distance driven along the lap line and the lane; player: position, heading and speed
  s: number; lane: number; top: number;
  x: number; z: number; yaw: number; v: number;
  rig?: Rig; done?: number;
  /** spinning round after a banana or a ⭐ bump (seconds left), and a turbo from a mystery box */
  spin?: number; boost?: number;
}

const DRIVERS: { name: string; color: number; look?: BlockyOpts }[] = [
  { name: 'Kak Dina', color: 0x2f6fde, look: { skin: '#E8B48A', shirt: 0x2f6fde, pants: 0x2a3550, hijab: 0x1f2a44, tunic: true, adult: true, lashes: true, backpack: null, emblem: null, hair: 0x2b2018, shoes: 0xf4f4f4 } },
  { name: 'Bang Rizal', color: 0xf2b134, look: { skin: '#D9A27A', shirt: 0xf2b134, pants: 0x3b3a3d, peci: 0xe4423a, adult: true, backpack: null, emblem: null, hair: 0x1f1a1a, shoes: 0x3b3a3d } },
  { name: 'Pak Budi', color: 0x9b59b6, look: { skin: '#C98E66', shirt: 0x9b59b6, pants: 0x2a3550, peci: 0x1f1f1f, adult: true, backpack: null, emblem: null, hair: 0x1f1a1a, shoes: 0x3b3a3d } },
  { name: 'Kak Sari', color: 0x1abc9c, look: { skin: '#F1C7A3', shirt: 0x1abc9c, pants: 0x3b3a3d, hijab: 0xf2a7c3, tunic: true, adult: true, lashes: true, backpack: null, emblem: null, hair: 0x2b2018, shoes: 0xf4f4f4 } },
];
const KART_COLORS = [0xe4423a, 0x8dc63f, ...DRIVERS.map(d => d.color)];
/** the people watching from the grandstand */
const CROWD: BlockyOpts[] = [
  { skin: '#E8B48A', shirt: 0xe4423a, pants: 0x2a3550, peci: 0x1f1f1f, adult: true, backpack: null, emblem: null, hair: 0x1f1a1a },
  { skin: '#D9A27A', shirt: 0x2e78d6, pants: 0x3b3a3d, hijab: 0xf2b134, tunic: true, adult: true, backpack: null, emblem: null, hair: 0x2b2018 },
  { skin: '#F1C7A3', shirt: 0x8dc63f, pants: 0x2a3550, backpack: null, emblem: null, hair: 0x3b2a1a },
  { skin: '#C98E66', shirt: 0xf2a7c3, pants: 0x3b3a3d, hijab: 0x9b59b6, tunic: true, adult: true, backpack: null, emblem: null, hair: 0x1f1a1a },
  { skin: '#E8B48A', shirt: 0xf2b134, pants: 0x3b3a3d, backpack: null, emblem: null, hair: 0x1f1a1a },
  { skin: '#D9A27A', shirt: 0xffffff, pants: 0x2a3550, peci: 0xe4423a, adult: true, backpack: null, emblem: null, hair: 0x1f1a1a },
  { skin: '#F1C7A3', shirt: 0x1abc9c, pants: 0x3b3a3d, hijab: 0xffffff, tunic: true, backpack: null, emblem: null, hair: 0x2b2018 },
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
interface MysteryBox { s: number; lane: number; mesh: THREE.Object3D; back: number }
interface Peel { x: number; z: number; mesh: THREE.Object3D }
interface Tumbleweed { s: number; lane: number; dir: number; mesh: THREE.Object3D; ph: number }

/** each track: its name, and what its karts' driving feels like */
const TRACK_NAME: Record<TrackKind, [string, string]> = {
  main: ['Sirkuit Balap', 'the Race Track'], snow: ['Sirkuit Salju', 'the Snow Track'], desert: ['Sirkuit Gurun', 'the Desert Track'],
};
/** the landmark that builds each track */
export const TRACK_ID: Record<TrackKind, string> = { main: 'race_track', snow: 'snow_track', desert: 'desert_track' };

export class Race {
  active = false;
  phase: 'count' | 'go' | 'done' = 'count';
  karts: Kart[] = [];
  private t = 0; private count = 0; private prevS = 0;
  /** metres driven since the start line (laps × LAP + this lap) */
  total = 0;
  readonly cx: number; readonly cz: number; readonly y: number;
  readonly tk: Track;
  readonly id: string;
  constructor(private g: Game, l: Landmark, readonly kind: TrackKind = 'main') {
    const c = l.at!.centre; this.cx = c[0]; this.cz = c[2]; this.y = c[1];
    this.stand = kind === 'main' ? l.at!.stand ?? null : null; // (the villagers come to the big circuit's grandstand)
    this.tk = TRACKS[kind]; this.id = l.id;
  }
  get name() { const n = TRACK_NAME[this.kind]; return tr(n[0], n[1]); }
  /** the karts waiting on the grid when nobody is racing, so you can find them */
  private parked: THREE.Group[] = []; private armed = true;
  /** the grid spots: you and Baby Mo in front, the racers behind */
  static readonly GRID: [number, number][] = [[-2.5, 1.8], [-2.5, -1.8], [-7, 2.6], [-7, -1.0], [-11.5, 1.0], [-11.5, -2.6]];
  /** a big race (at a set time, with the villagers watching): double prizes */
  grand = false;
  private crowd: { rig: ReturnType<typeof buildBlocky>; ph: number }[] = []; private stand: [number, number, number] | null = null;
  private lastHour = -1;
  /** your kart's place on the grid */
  myKart() { const p = this.tk.pointAt(Race.GRID[0][0], Race.GRID[0][1]); return new THREE.Vector3(this.cx + p.x, this.y, this.cz + p.z); }
  /** is this point close to the track (to show the karts and the 🏁 button)? */
  private around(p: THREE.Vector3, pad: number, dy: number) { return Math.abs(p.x - this.cx) < this.tk.half + this.tk.R + pad && Math.abs(p.z - this.cz) < this.tk.R + pad && Math.abs(p.y - this.y) < dy; }
  /**
   * Every half second when not racing: the karts wait on the grid while you're near, Baby Mo
   * tells you where they are the first time, and walking up to your red kart starts a race.
   */
  idle(p: THREE.Vector3) {
    const g = this.g, close = !this.active && this.around(p, 30, 20);
    if (close && !this.parked.length) {
      this.parked = Race.GRID.map(([s, lane], i) => {
        const obj = kartModel(KART_COLORS[i]);
        const q = this.tk.pointAt(s, lane); obj.position.set(this.cx + q.x, this.y, this.cz + q.z); obj.rotation.y = q.yaw;
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

  /**
   * Every frame: the notice before a big race, and the villagers on the grandstand
   * (there from a little before until a while after, cheering while you race). Only the big circuit has these.
   */
  tick(dt: number, hour: number) {
    const g = this.g;
    if (this.kind !== 'main') return;
    if (this.lastHour >= 0) {
      const h = raceSoon(this.lastHour, hour);
      if (h !== null) this.notice(h);
    }
    this.lastHour = hour;
    // the 🏁 button goes once the race has started or the time has passed
    if (this.soonUntil > 0 && (hour > this.soonUntil || hour < this.soonUntil - 2 || this.active)) { this.soonUntil = -1; g.ui.raceSoon(null); }
    const want = crowdTime(hour) || (this.active && this.grand);
    if (want && !this.crowd.length && this.stand) this.seatCrowd();
    else if (!want && this.crowd.length) this.clearCrowd();
    if (this.crowd.length) {
      const t = performance.now() / 1000, cheer = this.active && this.phase !== 'count';
      for (const c of this.crowd) {
        const r = c.rig, w = Math.sin(t * (cheer ? 7 : 2) + c.ph);
        r.armL?.rotation.set(cheer ? -2.7 + w * 0.35 : -0.2 + w * 0.1, 0, 0);
        r.armR?.rotation.set(cheer ? -2.7 - w * 0.35 : -0.2 - w * 0.1, 0, 0);
        r.root.position.y = (r.root.userData.y as number) + (cheer ? Math.max(0, w) * 0.12 : 0);
      }
    }
    void dt;
  }
  /** “the big race starts soon”: Baby Mo says so and a 🏁 button lets you go and join (nothing stops the game) */
  private soonUntil = -1;
  private notice(h: number) {
    const g = this.g, at = `${String(h).padStart(2, '0')}:00`;
    if (this.active) return;
    SFX.quest();
    g.ui.say(tr(`Balapan besar jam ${at}! Ada 6 pembalap dan warga desa datang menonton. Hadiahnya dua kali lipat. Ketuk 🏁 untuk ikut!`, `The big race is at ${at}! Six racers, and the villagers are coming to watch. Double prizes. Tap 🏁 to join!`), 'idea', 8000);
    g.ui.raceSoon(tr(`Balapan ${at} — ikut!`, `Race at ${at} — join!`), () => { if (g.goPlace('race_track')) setTimeout(() => { if (!this.active) this.start(true); }, 1500); });
    this.soonUntil = h + 0.75;
  }
  private seatCrowd() {
    const g = this.g, [sx, sy, sz] = this.stand!;
    let n = 0;
    for (let k = 0; k < 4; k++) for (let i = -4; i <= 4; i++) {
      if ((i + k) % 2 !== 0 && n > 6) continue;
      const rig = buildBlocky(CROWD[n % CROWD.length]);
      // sitting on the step: each row a block higher and further back
      rig.root.position.set(sx + i * 4 + (k % 2) * 2, sy + 1 + k, sz - k);
      rig.root.userData.y = rig.root.position.y;
      g.scene.add(rig.root); this.crowd.push({ rig, ph: Math.random() * 6 });
      if (++n >= 16) return;
    }
  }
  private clearCrowd() { for (const c of this.crowd) this.g.scene.remove(c.rig.root); this.crowd = []; }
  /** how many villagers are watching */
  get watching() { return this.crowd.length; }

  /** close enough to the track to start a race */
  near(p: THREE.Vector3) { return Math.abs(p.x - this.cx) < this.tk.half + this.tk.R + 12 && Math.abs(p.z - this.cz) < this.tk.R + 14 && Math.abs(p.y - this.y) < 6; }
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
    for (const c of this.tk.coinPlan(lap)) {
      // a gold disc standing up, spinning round so you see its face
      const p = this.tk.pointAt(c.s, c.lane), mesh = new THREE.Group(), disc = new THREE.Mesh(this.coinGeo, this.coinMat);
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
  get lap() { return Math.min(LAPS, Math.floor(Math.max(0, this.total) / this.tk.LAP) + 1); }

  // ---------- mystery boxes, power-ups, the ramp and the track's own surprises ----------
  /** the power-up you're holding (tap 🚀 / Space to use it), and the one being rolled in the box */
  item: PowerUp | null = null;
  private rolling = 0; private rolled: PowerUp | null = null;
  private rocketT = 0; private starT = 0; private shieldT = 0; private magnetT = 0;
  /** in the air off the jump ramp (seconds left), and how high */
  private hopT = 0; hop = 0;
  /** the way the kart is actually moving (it lags behind where it points on ice) */
  private dir = 0;
  private boxes: MysteryBox[] = []; private peels: Peel[] = []; private weeds: Tumbleweed[] = []; private extras: THREE.Object3D[] = [];
  private bubble: THREE.Mesh | null = null;
  private bannerT = 0; private lastPlace = 0; private placeAt = 0; private calloutAt = -9; private surfaceAt = -9;
  /** a mystery box: a glowing cube with a “?” on each side, turning and bobbing */
  private static boxMat: THREE.MeshLambertMaterial | null = null;
  private boxMesh() {
    if (!Race.boxMat) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d')!;
      const gr = x.createLinearGradient(0, 0, 64, 64); gr.addColorStop(0, '#ff5f6d'); gr.addColorStop(0.35, '#ffc371'); gr.addColorStop(0.7, '#5ee7df'); gr.addColorStop(1, '#b490ca');
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 6; x.strokeRect(3, 3, 58, 58);
      x.fillStyle = '#fff'; x.font = '900 46px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 4; x.fillText('?', 32, 35);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      Race.boxMat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.45, transparent: true, opacity: 0.92 });
    }
    return new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), Race.boxMat);
  }
  private layTrack() {
    const g = this.g, tk = this.tk;
    // a row of three mystery boxes across the track at each box spot
    for (const s of tk.boxRows) for (const lane of [-2.8, 0, 2.8]) {
      const mesh = this.boxMesh(), p = tk.pointAt(s, lane);
      mesh.position.set(this.cx + p.x, this.y + 1.1, this.cz + p.z);
      g.scene.add(mesh); this.boxes.push({ s, lane, mesh, back: 0 });
    }
    // the jump ramp: a yellow and black wedge across the track (you drive up it and fly)
    for (const r of tk.ramps) {
      const p = tk.pointAt(r.s + r.len / 2, 0), ramp = new THREE.Group();
      const c = document.createElement('canvas'); c.width = 64; c.height = 16;
      const x = c.getContext('2d')!; for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#1d1d20' : '#ffd23f'; x.fillRect(i * 8, 0, 8, 16); }
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const wedge = new THREE.Mesh(new THREE.BoxGeometry(tk.W - 0.4, 0.14, r.len + 1.2), new THREE.MeshLambertMaterial({ map: tex }));
      wedge.rotation.x = -0.22; wedge.position.set(0, 0.32, 0); ramp.add(wedge);
      ramp.position.set(this.cx + p.x, this.y, this.cz + p.z); ramp.rotation.y = p.yaw;
      g.scene.add(ramp); this.extras.push(ramp);
    }
    // the desert's tumbleweeds rolling across the long straights
    if (this.kind === 'desert') {
      const mat = new THREE.MeshLambertMaterial({ color: 0xb08a52, flatShading: true }), wire = new THREE.MeshBasicMaterial({ color: 0x7a5a30, wireframe: true });
      for (const [s, ph] of [[tk.half * 0.55, 0], [tk.half + tk.ARC + tk.half * 0.6, 2], [tk.half + tk.ARC + tk.half * 1.75, 4]] as const) {
        const m = new THREE.Group(); m.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), mat), new THREE.Mesh(new THREE.IcosahedronGeometry(0.66, 1), wire));
        g.scene.add(m); this.weeds.push({ s, lane: -tk.W / 2 - 1.5 + ph, dir: 1, mesh: m, ph });
      }
    }
  }
  private clearTrack() {
    const sc = this.g.scene;
    for (const b of this.boxes) sc.remove(b.mesh); for (const b of this.peels) sc.remove(b.mesh); for (const w of this.weeds) sc.remove(w.mesh); for (const e of this.extras) sc.remove(e);
    this.boxes = []; this.peels = []; this.weeds = []; this.extras = [];
    if (this.bubble) { this.bubble.parent?.remove(this.bubble); this.bubble = null; }
    this.item = null; this.rolled = null; this.rolling = 0; this.g.ui.raceItem(null);
  }
  /** use the power-up you're holding (the 🚀 button, Space or F) */
  useItem() {
    const g = this.g, it = this.item, me = this.karts[0];
    if (!this.active || this.phase !== 'go' || !it || !me) return;
    this.item = null; g.ui.raceItem(null);
    const name = POWER_NAME[it];
    g.ui.raceMath(`${POWER_ICON[it]} ${tr(name[0], name[1])}!`);
    if (it === 'rocket') { this.rocketT = 2.2; me.v = Math.max(me.v, 15); SFX.boom(); }
    else if (it === 'star') { this.starT = 5.5; SFX.fanfare(); }
    else if (it === 'shield') {
      this.shieldT = 9; SFX.twinkle();
      if (!this.bubble) { this.bubble = new THREE.Mesh(new THREE.SphereGeometry(1.45, 20, 14), new THREE.MeshLambertMaterial({ color: 0x9fe3ff, emissive: 0x2f8fd0, emissiveIntensity: 0.35, transparent: true, opacity: 0.32, depthWrite: false })); this.bubble.position.y = 0.6; }
      me.obj.add(this.bubble);
    }
    else if (it === 'magnet') { this.magnetT = 8; SFX.chime(); }
    else if (it === 'banana') {
      // drop it just behind you: a racer who drives over it spins round (a harmless cartoon spin)
      const x = me.x - Math.sin(me.yaw) * 2.4, z = me.z - Math.cos(me.yaw) * 2.4, mesh = bananaModel();
      mesh.position.set(x, this.y + 0.05, z); g.scene.add(mesh); this.peels.push({ x, z, mesh }); SFX.pop(3);
    }
  }
  /** a racer drove into a banana (or got bumped by your star): a quick spin */
  private spin(k: Kart, why: 'banana' | 'star') {
    if ((k.spin ?? 0) > 0) return;
    k.spin = 1.2; SFX.pop(1);
    this.g.fx.sparkle(k.x, this.y + 0.8, k.z, 10, why === 'banana' ? 0xffe14d : 0xfff3a0, 1.8);
    if (this.t - this.calloutAt > 1.5) { this.calloutAt = this.t; this.g.ui.raceMath(why === 'banana' ? `🍌 ${tr('Wuuush!', 'Whoops!')} ${k.name}` : `⭐ ${tr('Duk!', 'Bonk!')}`); }
  }

  start(grand = false) {
    const g = this.g;
    if (this.active) return;
    if (this.kind !== 'main' && !g.can(this.id)) return; // the Snow and Desert tracks: Full BabyMo Craft
    this.grand = this.kind === 'main' && (grand || crowdTime(g.hour));
    if (g.fun.riding) g.fun.dismount();
    this.active = true; this.phase = 'count'; this.t = 0; this.count = 3; this.armed = false;
    this.clearParked();
    // the grid, just behind the start line: you and Baby Mo in front, the racers behind
    const grid = Race.GRID;
    this.got = 0; this.sum = null; this.boostT = 0; this.layCoins(1);
    this.rocketT = this.starT = this.shieldT = this.magnetT = this.hopT = this.hop = 0; this.bannerT = 0; this.lastPlace = 0; this.calloutAt = -9;
    this.layTrack();
    this.karts = grid.map(([s, lane], i) => {
      const d = i >= 2 ? DRIVERS[i - 2] : null;
      const color = KART_COLORS[i];
      const obj = kartModel(color);
      g.scene.add(obj);
      const k: Kart = { obj, name: d?.name ?? (i === 0 ? tr('Kamu', 'You') : 'Baby Mo'), color, s, lane, top: [13.0, 13.1, 13.6, 13.0, 13.3, 12.8][i] ?? 13, x: 0, z: 0, yaw: 0, v: 0 };
      if (d?.look) { k.rig = buildBlocky(d.look); obj.add(k.rig.root); k.rig.root.position.set(0, 0.05, -0.1); applyPrayerPose(k.rig, 'julus'); }
      const p = this.tk.pointAt(s, lane); k.x = this.cx + p.x; k.z = this.cz + p.z; k.yaw = p.yaw;
      return k;
    });
    this.dir = this.karts[0].yaw;
    this.prevS = this.tk.progressOf(this.karts[0].x - this.cx, this.karts[0].z - this.cz); this.total = this.prevS - this.tk.LAP; // just behind the line
    g.ents.mo.seat = { pos: new THREE.Vector3(), yaw: 0 };
    this.place();
    SFX.click();
    const first = !g.stats.raceBoxes;
    const where = this.kind === 'snow' ? tr(' Hati-hati, es di tikungan licin! ❄️', ' Careful, the ice on the bends is slippery! ❄️') : this.kind === 'desert' ? tr(' Hindari pasir di tikungan dan bola rumput yang menggelinding! 🌵', ' Keep off the sand on the bends, and watch the rolling tumbleweeds! 🌵') : '';
    g.ui.say(first ? tr('Setelah GO, gokartmu jalan sendiri — kamu tinggal belok. Lewati kotak ❓ untuk dapat kejutan, lalu ketuk tombolnya untuk memakainya! 3 putaran. Bismillah!', 'After GO your kart drives by itself — you just steer. Drive through the ❓ boxes for a surprise, then tap its button to use it! 3 laps. Bismillah!') + where
      : this.grand ? tr('Balapan besar! Warga desa menonton dari tribun. Hadiahnya dua kali lipat! Bismillah!', 'The big race! The villagers are watching from the grandstand. Double prizes! Bismillah!')
        : tr(`Balapan di ${this.name}! 3 putaran, ambil kotak ❓ dan koin. Bismillah!`, `Racing on ${this.name}! 3 laps — grab the ❓ boxes and the coins. Bismillah!`) + where, 'idea', 7000);
    g.stats.races = (g.stats.races || 0) + 1;
  }

  /** leave the race (✋ or the button) */
  quit() { if (this.active) this.finish(true); }

  /** moves everything; true while it replaces normal walking */
  step(dt: number): boolean {
    if (!this.active) return false;
    const g = this.g, tk = this.tk;
    this.t += dt;
    for (const b of this.boxes) { b.mesh.rotation.y += dt * 1.6; b.mesh.rotation.x = Math.sin(this.t * 1.3 + b.lane) * 0.25; b.mesh.position.y = this.y + 1.1 + Math.sin(this.t * 2.4 + b.s) * 0.15; }
    if (this.phase === 'count') {
      const c = 3 - Math.floor(this.t);
      if (c !== this.count) { this.count = c; if (c > 0) SFX.pop(2); else { SFX.chime(); this.phase = 'go'; this.t = 0; this.bannerT = 0.8; g.goodWord('start', true); } }
      g.ui.raceCount(c > 0 ? String(c) : 'GO!');
      this.place(); return true;
    }
    if (this.bannerT > 0 && (this.bannerT -= dt) <= 0) g.ui.raceCount(null);
    if (this.phase === 'done') { this.place(); return true; }
    // timers
    this.rocketT = Math.max(0, this.rocketT - dt); this.starT = Math.max(0, this.starT - dt); this.magnetT = Math.max(0, this.magnetT - dt);
    if (this.shieldT > 0 && (this.shieldT -= dt) <= 0 && this.bubble) { this.bubble.parent?.remove(this.bubble); SFX.pop(0); }
    if (this.rolling > 0 && (this.rolling -= dt) <= 0 && this.rolled) {
      this.item = this.rolled; this.rolled = null; SFX.chime(); g.ui.raceItem(POWER_ICON[this.item]);
      if (!g.stats.raceBoxes) { g.stats.raceBoxes = 1; g.ui.raceMath(tr('Ketuk untuk memakai! 👉', 'Tap it to use it! 👉')); }
    }
    const safe = this.starT > 0 || this.shieldT > 0;
    // you: drive on by yourself, steer with the joystick, pull back to brake
    const me = this.karts[0], ax = g.input.axis();
    const lx = me.x - this.cx, lz = me.z - this.cz, kind = tk.cellKind(lx, lz), sNow = tk.progressOf(lx, lz), laneNow = tk.laneOf(lx, lz);
    // the yellow arrows: a burst of speed
    if (tk.onBoost(sNow, laneNow) && this.boostT < 0.9) { if (this.boostT <= 0) { SFX.pop(6); g.fx.sparkle(me.x, this.y + 0.6, me.z, 8, 0xffd84a, 1.5); } this.boostT = 1.3; }
    this.boostT = Math.max(0, this.boostT - dt);
    // the jump ramp: up you go!
    if (this.hopT <= 0 && tk.onRamp(sNow, laneNow) && me.v > 5) { this.hopT = 0.95; SFX.jump(); g.fx.sparkle(me.x, this.y + 0.4, me.z, 10, 0xffd23f, 2); }
    if (this.hopT > 0) { this.hopT = Math.max(0, this.hopT - dt); this.hop = Math.sin(Math.PI * (1 - this.hopT / 0.95)) * 1.7; if (this.hopT === 0) { this.hop = 0; SFX.pop(2); } }
    // the track's own surprises: ice on the Snow track, soft sand on the Desert track (not while flying or with ⭐ / 🫧)
    const patch = this.hop > 0.2 ? null : tk.patchAt(sNow, laneNow);
    const onIce = !!patch && this.kind === 'snow' && !safe, onSand = !!patch && this.kind === 'desert' && !safe;
    if ((onIce || onSand) && this.t - this.surfaceAt > 0.25) { this.surfaceAt = this.t; g.fx.sparkle(me.x, this.y + 0.3, me.z, 4, onIce ? 0xdff6ff : 0xe6d3a2, 1); }
    const speedy = (this.boostT > 0 || this.rocketT > 0 ? 1.5 : 1) * (this.starT > 0 ? 1.3 : 1) * (onSand ? 0.6 : 1);
    const top = (kind === 'track' || kind === 'kerb' ? MAX : OFF) * speedy;
    const want = ax.fz > 0.4 ? 0 : top;
    me.v += (want - me.v) * Math.min(1, dt * (want < me.v ? 3 : this.rocketT > 0 ? 4 : 1.4));
    me.yaw -= ax.fx * 2.3 * dt * Math.min(1, me.v / 5 + 0.3);
    // the helper: turn gently towards the track's direction just ahead (it can't grip on ice)
    const ahead = tk.pointAt(sNow + 4);
    let dy = Math.atan2(this.cx + ahead.x - me.x, this.cz + ahead.z - me.z) - me.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    me.yaw += dy * Math.min(1, dt * (Math.abs(ax.fx) > 0.2 ? 0.6 : 2.2) * (onIce ? 0.35 : 1));
    // where the kart actually goes: right where it points, except on ice, where it slides on a while
    let dd = me.yaw - this.dir; while (dd > Math.PI) dd -= Math.PI * 2; while (dd < -Math.PI) dd += Math.PI * 2;
    this.dir += dd * Math.min(1, dt * (onIce ? 1.4 : 14));
    const nx = me.x + Math.sin(this.dir) * me.v * dt, nz = me.z + Math.cos(this.dir) * me.v * dt;
    const nk = tk.cellKind(nx - this.cx, nz - this.cz);
    if (this.hop < 0.6 && (nk === 'wall' || g.world.solidAt(Math.floor(nx), Math.floor(this.y + 0.2), Math.floor(nz)))) {
      if (safe) { me.v *= 0.8; me.yaw += dy * 0.5; this.dir = me.yaw; SFX.pop(4); }
      else { if (me.v > 6) g.goodWord('bumped'); me.v *= -0.25; SFX.pop(1); }
    }
    else { me.x = nx; me.z = nz; }
    // laps: follow your progress round the line
    const s = tk.progressOf(me.x - this.cx, me.z - this.cz);
    let d = s - this.prevS; if (d < -tk.LAP / 2) d += tk.LAP; if (d > tk.LAP / 2) d -= tk.LAP;
    const lapBefore = this.lap;
    this.total += d; this.prevS = s;
    if (this.lap > lapBefore && this.total >= 0) {
      this.bannerT = 1.6; SFX.quest();
      g.ui.raceCount(this.lap === LAPS ? tr('PUTARAN TERAKHIR!', 'FINAL LAP!') : `${tr('PUTARAN', 'LAP')} ${this.lap}`);
    }
    // the coins: pick them up (the 🧲 pulls them in), and add them up group by group
    if (this.lap !== this.coinLap && this.total >= 0) { this.flushSum(); this.layCoins(this.lap); }
    for (const c of this.coins) {
      if (c.taken) continue;
      c.mesh.rotation.y += dt * 3;
      const cd = Math.hypot(c.mesh.position.x - me.x, c.mesh.position.z - me.z);
      if (this.magnetT > 0 && cd < 8) { const k = Math.min(1, dt * 6); c.mesh.position.x += (me.x - c.mesh.position.x) * k; c.mesh.position.z += (me.z - c.mesh.position.z) * k; }
      if (cd < 1.6) {
        c.taken = true; c.mesh.visible = false; this.got++;
        SFX.pop(Math.min(8, this.got % 9)); g.fx.sparkle(c.mesh.position.x, c.mesh.position.y, c.mesh.position.z, 6, 0xffc83d, 1.2);
        if (this.sum && this.sum.group !== c.group) this.flushSum();
        if (this.sum) this.sum.add++; else this.sum = { group: c.group, before: this.got - 1, add: 1, at: 0 };
        this.sum.at = this.t;
      }
    }
    if (this.sum && this.t - this.sum.at > 0.9) this.flushSum();
    // the mystery boxes: drive through one for a surprise (one power-up at a time); they come back after a while
    const order0 = this.order(), myPlace = order0.indexOf(0) + 1;
    for (const b of this.boxes) {
      if (b.back > 0) { if ((b.back -= dt) <= 0) { b.mesh.visible = true; b.mesh.scale.setScalar(0.2); } continue; }
      if (b.mesh.scale.x < 1) b.mesh.scale.setScalar(Math.min(1, b.mesh.scale.x + dt * 3));
      if (Math.hypot(b.mesh.position.x - me.x, b.mesh.position.z - me.z) < 1.5 && this.hop < 1) {
        b.mesh.visible = false; b.back = 3.5;
        g.fx.sparkle(b.mesh.position.x, b.mesh.position.y, b.mesh.position.z, 14, [0xff5f6d, 0xffc371, 0x5ee7df, 0xb490ca][Math.floor(Math.random() * 4)], 2.2);
        if (!this.item && this.rolling <= 0) { this.rolled = rollPower(myPlace, this.karts.length, Math.random()); this.rolling = 0.9; SFX.pop(5); g.ui.raceItem('roll'); }
        else SFX.pop(3);
      }
    }
    // power-up effects you can see: rocket flames, star sparkles, the bubble's shimmer
    if (this.rocketT > 0) g.fx.sparkle(me.x - Math.sin(me.yaw) * 1.1, this.y + 0.4 + this.hop, me.z - Math.cos(me.yaw) * 1.1, 3, Math.random() < 0.5 ? 0xff7a1a : 0xffd23f, 1.2);
    if (this.starT > 0 && Math.random() < 0.5) g.fx.sparkle(me.x, this.y + 1 + this.hop, me.z, 2, [0xff5f6d, 0xffd23f, 0x5ee7df, 0xb490ca][Math.floor(this.t * 8) % 4], 1.6);
    if (this.bubble) { const sc = 1 + Math.sin(this.t * 6) * 0.04; this.bubble.scale.setScalar(this.shieldT < 2 && Math.floor(this.t * 6) % 2 ? 0.001 : sc); }
    // the desert's tumbleweeds roll back and forth across the track
    for (const w of this.weeds) {
      w.lane += w.dir * dt * 2.6;
      if (Math.abs(w.lane) > tk.W / 2 + 1.5) { w.dir *= -1; w.lane = Math.sign(w.lane) * (tk.W / 2 + 1.5); }
      const p = tk.pointAt(w.s, w.lane); w.mesh.position.set(this.cx + p.x, this.y + 0.6 + Math.abs(Math.sin(this.t * 4 + w.ph)) * 0.4, this.cz + p.z);
      w.mesh.rotation.x += dt * 5 * w.dir; w.mesh.rotation.z += dt * 2;
      if (this.hop < 0.8 && Math.hypot(w.mesh.position.x - me.x, w.mesh.position.z - me.z) < 1.3) {
        g.fx.sparkle(w.mesh.position.x, w.mesh.position.y, w.mesh.position.z, 10, 0xc9a46a, 2);
        w.lane = -Math.sign(w.lane || 1) * (tk.W / 2 + 1.5); // (it bounces off to the side)
        if (!safe) { me.v *= 0.55; SFX.pop(1); if (this.t - this.calloutAt > 1.5) { this.calloutAt = this.t; g.ui.raceMath(tr('🌾 Ups, bola rumput!', '🌾 Oops, a tumbleweed!')); } } else SFX.pop(4);
      }
    }
    // the others: along the racing line, keeping it close
    for (const k of this.karts.slice(1)) {
      if (k.done !== undefined) { k.s += 4 * dt; continue; }
      const gap = k.s - this.total;
      let pace = k.top + (gap > 12 ? -2.2 : gap < -12 ? 1.6 : 0) + Math.sin(this.t * 0.7 + k.top) * 0.4;
      const sk = ((k.s % tk.LAP) + tk.LAP) % tk.LAP;
      if (this.kind === 'desert' && tk.patchAt(sk, k.lane)) pace *= 0.85;
      // they find boxes too: sometimes a little turbo
      for (const b of this.boxes) if (b.back <= 0 && Math.abs(sk - b.s) < 0.6 && Math.abs(k.lane - b.lane) < 1.6 && Math.random() < 0.5) { k.boost = 1.6; g.fx.sparkle(k.x, this.y + 1, k.z, 6, 0xffc371, 1.5); }
      if ((k.boost ?? 0) > 0) { k.boost! -= dt; pace += 3.5; }
      if ((k.spin ?? 0) > 0) { k.spin! -= dt; pace = 3; }
      k.v += (pace - k.v) * Math.min(1, dt * 1.2);
      k.s += k.v * dt;
      if (k.s >= LAPS * tk.LAP) k.done = this.t;
    }
    for (const k of this.karts.slice(1)) { const p = tk.pointAt(k.s, k.lane); k.x = this.cx + p.x; k.z = this.cz + p.z; k.yaw = p.yaw; }
    // bananas you dropped, and bumping racers with ⭐
    for (const b of this.peels) for (const k of this.karts.slice(1)) if (b.mesh.visible && Math.hypot(b.x - k.x, b.z - k.z) < 1.3) { b.mesh.visible = false; this.spin(k, 'banana'); }
    this.peels = this.peels.filter(b => b.mesh.visible || (this.g.scene.remove(b.mesh), false));
    if (this.starT > 0) for (const k of this.karts.slice(1)) if (Math.hypot(k.x - me.x, k.z - me.z) < 1.8) this.spin(k, 'star');
    this.place();
    const order = this.order(), place = order.indexOf(0) + 1;
    // moving up a place: a cheer (not while a sum is being shown)
    if (place !== this.lastPlace) { if (this.lastPlace && place < this.lastPlace && !this.sum && this.t - this.calloutAt > 2.5 && this.t > 3) { this.calloutAt = this.t; SFX.pop(6); g.ui.raceMath(`⬆️ ${nthPlace(place)}!`); } this.lastPlace = place; this.placeAt = this.t; }
    g.ui.raceHud({ lap: this.lap, laps: LAPS, place, of: this.karts.length, time: this.t, coins: this.got });
    if (this.total >= LAPS * tk.LAP) this.finish(false);
    return true;
  }

  /** everyone's place: laps and metres driven */
  private order() { return ranking(this.karts.map((k, i) => (i === 0 ? this.total : k.s))); }

  private place() {
    const g = this.g, wob = Math.sin(performance.now() / 90) * 0.02;
    for (const [i, k] of this.karts.entries()) {
      const up = i === 0 ? this.hop : 0;
      k.obj.position.set(k.x, this.y + 0.02 + up + (k.v > 1 ? wob : 0), k.z); k.obj.rotation.y = k.yaw + (k.spin ? k.spin * 10 : 0);
      k.obj.rotation.x = i === 0 && this.hopT > 0 ? -0.18 * Math.cos(Math.PI * (1 - this.hopT / 0.95)) : 0;
      const wheels = k.obj.userData.wheels as THREE.Mesh[] | undefined; wheels?.forEach(w => (w.rotation.x += k.v * 0.05));
      if (i === 1) { const seat = g.ents.mo.seat; if (seat) { seat.pos.set(k.x, this.y - 0.15, k.z); seat.yaw = k.yaw; } }
    }
    // ⭐: your kart flashes through the colours of the rainbow
    const me = this.karts[0], body = me?.obj.userData.body as THREE.MeshLambertMaterial | undefined;
    if (body) { if (this.starT > 0) { body.emissive.setHSL((this.t * 1.5) % 1, 1, 0.45); } else body.emissive.setRGB(0, 0, 0); }
    const p = g.player;
    p.pos.set(me.x, this.y + 0.05 + this.hop, me.z); p.vel.set(0, 0, 0); p.visY = p.pos.y; p.onGround = true; p.speed = 0;
    p.yaw = me.yaw + Math.PI; // the camera looks the way you drive
  }

  private finish(quit: boolean) {
    const g = this.g, order = this.order(), place = order.indexOf(0) + 1, time = this.t, st0 = g.stats;
    this.phase = 'done';
    g.ui.raceHud(null); g.ui.raceCount(null); g.ui.raceItem(null);
    this.flushSum();
    let ended = false;
    const end = () => {
      if (ended) return; ended = true;
      this.clearCoins(); this.clearTrack();
      for (const k of this.karts) g.scene.remove(k.obj);
      this.karts = []; this.active = false;
      g.ents.mo.seat = null;
      // step out beside the start line
      g.player.pos.set(this.cx + 2, this.y, this.cz + 4); g.player.vel.set(0, 0, 0); g.player.visY = this.y;
      g.ents.mo.pos.set(this.cx + 3, this.y, this.cz + 4);
    };
    if (quit) { end(); g.ui.toast(tr('🏁 Keluar dari balapan', '🏁 Left the race'), 2500); return; }
    const got = this.got, coins = (PRIZE[place - 1] ?? 20) * (this.grand ? 2 : 1) + got;
    if (this.grand) st0.grandRaces = (st0.grandRaces || 0) + 1;
    const st = g.stats; st.raceBest = Math.min(st.raceBest ?? Infinity, time); if (place === 1) st.raceWins = (st.raceWins || 0) + 1;
    const cups = (st.raceCups ??= {}) as Record<string, number>; if (place === 1) cups[this.kind] = (cups[this.kind] || 0) + 1;
    g.addCoins(coins, from => g.ui.coinPop(coins, from));
    SFX.fanfare(); g.ui.confetti(place === 1 ? 80 : 40); g.ents.mo.celebrate = 2.5;
    g.goodWord(place === 1 ? 'won' : 'other_won', true);
    const nth = nthPlace(place);
    const secs = time.toFixed(1), cup = this.kind === 'snow' ? '❄️🏆' : this.kind === 'desert' ? '🌵🏆' : '🏆';
    g.ui.dialog({
      face: place === 1 ? cup : '🏁', who: `${tr('Garis finis', 'Finish line')} · ${this.name}`,
      text: (place === 1 ? tr(`<b>Kamu ${nth}!</b> Alhamdulillah! 🎉`, `<b>You came ${nth}!</b> Alhamdulillah! 🎉`) : tr(`<b>Kamu ${nth}!</b> Hebat, tetap semangat! Ayo beri selamat ke pemenangnya 🤝`, `<b>You came ${nth}!</b> Well driven! Let’s congratulate the winner 🤝`))
        + `<br>🪙 ${tr(`Kamu mengumpulkan <b>${got}</b> koin di lintasan!`, `You collected <b>${got}</b> coins on the track!`)}`
        + `<br>⏱️ ${secs} ${tr('detik', 'seconds')} · ${tr('rekor', 'best')} ${st.raceBest!.toFixed(1)} · 🪙 +${coins}`,
      buttons: [{ label: '🏁 ' + tr('Balapan lagi', 'Race again'), cls: 'gold', fn: () => { end(); setTimeout(() => this.start(), 300); } }, { label: tr('Selesai', 'Done'), fn: end }],
      onClose: end, // (closed any other way, e.g. Escape: the race still ends properly)
    });
    g.checkQuests(); g.saveSoon();
  }
}

/** 1st, 2nd… / ke-1, ke-2… */
function nthPlace(place: number) {
  return [tr('juara 1', '1st'), tr('juara 2', '2nd'), tr('juara 3', '3rd'), tr('ke-4', '4th'), tr('ke-5', '5th'), tr('ke-6', '6th')][place - 1] ?? String(place);
}

/** a yellow banana peel lying on the track */
function bananaModel() {
  const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: 0xffd84a, emissive: 0x6a5200, emissiveIntensity: 0.3 });
  for (let i = 0; i < 3; i++) { const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.62), m); leaf.rotation.y = (i / 3) * Math.PI * 2; leaf.position.set(Math.sin(leaf.rotation.y) * 0.25, 0.05, Math.cos(leaf.rotation.y) * 0.25); g.add(leaf); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.2), m); top.position.y = 0.14; g.add(top);
  return g;
}

/** a little go-kart: a low body with a nose, a seat, a steering wheel and four fat wheels (faces +z) */
function kartModel(color: number) {
  const g = new THREE.Group(), m = (c: number) => new THREE.MeshLambertMaterial({ color: c });
  const box = (w: number, h: number, d: number, c: number, x: number, y: number, z: number) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(c)); b.position.set(x, y, z); g.add(b); return b; };
  const body = box(1.0, 0.18, 1.8, color, 0, 0.28, 0);
  g.userData.body = body.material; // (⭐ star power makes it glow in rainbow colours)
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
