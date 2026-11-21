// The archery range. Stand at the shooting line, a target down the lane: a
// little red circle (your aim) wanders over it; tap ✋ when it's over the
// middle to shoot. The rings score 10, 20, 50 and 100 (the yellow middle), and
// each arrow's points are added up out loud: “50 + 20 = 70”.
//
// Five levels, from a big close target to a small far one; level 4's target
// moves, level 5 has wind. Score enough with 5 arrows to pass a level and win
// a new arrow: bigger, golden, rainbow, star (each lands a little nearer the
// middle), and at the end the champion's trophy. Every 10 points is 1 coin.
import * as THREE from 'three';
import type { Game } from '../main';
import { tr, t2, type T2 } from '../i18n';
import type { Landmark } from '../world/landmarks';
import type { Activity } from './activity';
import type { Rig } from './models';
import { SFX, Speech } from './audio';

export interface Level { d: number; r: number; sway: number; speed: number; move: number; wind: number; need: number }
/** distance (blocks), target radius, how far and fast your aim wanders, a moving target, wind, points to pass */
export const LEVELS: Level[] = [
  { d: 8, r: 1.1, sway: 0.5, speed: 1.0, move: 0, wind: 0, need: 150 },
  { d: 12, r: 1.0, sway: 0.65, speed: 1.35, move: 0, wind: 0, need: 200 },
  { d: 16, r: 0.85, sway: 0.75, speed: 1.7, move: 0, wind: 0, need: 200 },
  { d: 20, r: 0.85, sway: 0.75, speed: 1.7, move: 2.2, wind: 0, need: 200 },
  { d: 26, r: 0.75, sway: 0.85, speed: 2.1, move: 0, wind: 0.3, need: 250 },
];
export const ARROWS_PER_ROUND = 5;
/** the rings, from the middle out: [how far out (in target radii), points] */
export const RINGS: [number, number][] = [[0.2, 100], [0.45, 50], [0.7, 20], [1, 10]];
/** points for an arrow this far from the middle (in target radii); 0 is a miss */
export function ringPoints(dist: number) { for (const [r, p] of RINGS) if (dist <= r) return p; return 0; }

export interface Arrow { id: string; name: T2; scale: number; help: number; color: number }
/** your arrows: each level you pass wins the next one (it lands a little nearer the middle) */
export const ARROWS: Arrow[] = [
  { id: 'wood', name: ['Panah kayu', 'Wooden arrow'], scale: 1, help: 0, color: 0xc49a62 },
  { id: 'big', name: ['Panah besar', 'Big arrow'], scale: 1.7, help: 0.15, color: 0x8a5c38 },
  { id: 'gold', name: ['Panah emas', 'Golden arrow'], scale: 1.4, help: 0.2, color: 0xf1c232 },
  { id: 'rainbow', name: ['Panah pelangi', 'Rainbow arrow'], scale: 1.4, help: 0.25, color: 0xd94fd9 },
  { id: 'star', name: ['Panah bintang', 'Star arrow'], scale: 1.5, help: 0.3, color: 0xffe14a },
];
/** where your aim is at time t (in target radii from the middle) */
export function aimAt(t: number, lv: Level): [number, number] {
  return [lv.sway * Math.sin(t * lv.speed * 1.7), lv.sway * 0.75 * Math.sin(t * lv.speed * 2.3 + 0.6)];
}
/** where the arrow lands: your aim, pushed by the wind, pulled a little to the middle by a better arrow */
export function landing(aim: [number, number], lv: Level, help: number): [number, number] {
  const k = 1 - help;
  return [(aim[0] + lv.wind) * k, aim[1] * k];
}
/** the sum for the arrow just shot: what to show and what to say */
export function sumLine(before: number, add: number): { show: string; say: [string, string] } {
  const after = before + add;
  if (before === 0) return { show: `🎯 ${after}`, say: [`${after}!`, `${after}!`] };
  return { show: `🎯 ${before} + ${add} = ${after}`, say: [`${before} tambah ${add} sama dengan ${after}`, `${before} plus ${add} makes ${after}`] };
}

/** a target: a straw boss on two legs with the coloured rings and their points */
function targetMesh(r: number) {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!;
  const ring = (f: number, col: string) => { x.fillStyle = col; x.beginPath(); x.arc(128, 128, 124 * f, 0, Math.PI * 2); x.fill(); };
  ring(1, '#f4f4f4'); ring(0.85, '#2b2b2b'); ring(0.7, '#2e78d6'); ring(0.45, '#e4423a'); ring(0.2, '#ffd21f');
  x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const [f, p, col] of [[0.86, '10', '#ffffff'], [0.58, '20', '#ffffff'], [0.33, '50', '#ffffff'], [0, '100', '#7a4b00']] as [number, string, string][]) { x.fillStyle = col; x.fillText(p, 128, 128 - f * 124); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshLambertMaterial({ map: tex }));
  face.position.z = 0.16; g.add(face);
  const boss = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.05, 0.3, 32), new THREE.MeshLambertMaterial({ color: 0xd9b56a }));
  boss.rotation.x = Math.PI / 2; g.add(boss);
  for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.12), new THREE.MeshLambertMaterial({ color: 0x8a5c38 })); leg.position.set(sx * r * 0.7, -0.6, -0.25); leg.rotation.z = sx * 0.15; g.add(leg); }
  return g;
}
function arrowMesh(a: Arrow) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6), new THREE.MeshLambertMaterial({ color: a.color, emissive: a.id === 'gold' || a.id === 'star' ? 0x6a4a00 : 0x000000 }));
  shaft.rotation.x = Math.PI / 2; g.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 6), new THREE.MeshLambertMaterial({ color: 0x9aa3ad }));
  tip.rotation.x = -Math.PI / 2; tip.position.z = -0.5; g.add(tip);
  const feathers = a.id === 'rainbow' ? [0xe4423a, 0xf2b134, 0x2e78d6] : [0xffffff, 0xe4423a, 0xffffff];
  feathers.forEach((col, i) => { const f = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.12, 0.2), new THREE.MeshLambertMaterial({ color: col })); f.position.z = 0.38; f.rotation.z = (i * Math.PI * 2) / 3; f.position.x = Math.sin(f.rotation.z) * 0.05; f.position.y = Math.cos(f.rotation.z) * 0.05; g.add(f); });
  g.scale.setScalar(a.scale);
  return g;
}
function bowMesh() {
  const g = new THREE.Group();
  const limb = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 6, 20, Math.PI * 0.9), new THREE.MeshLambertMaterial({ color: 0x7a4a2a }));
  limb.rotation.z = Math.PI / 2 + Math.PI * 0.05; g.add(limb);
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.88, 4), new THREE.MeshBasicMaterial({ color: 0xf4f4f4 }));
  string.position.x = -0.1; g.add(string);
  // held upright in the hand, the string towards you
  g.rotation.set(0, Math.PI / 2, 0); g.position.set(0, -0.05, 0.1);
  return g;
}

export class Archery implements Activity {
  readonly id = 'archery';
  active = false;
  level = 0; points = 0; shot = 0; private t = 0;
  private state: 'aim' | 'fly' | 'pause' | 'done' = 'aim';
  private shoot: THREE.Vector3; private lane: THREE.Vector3;
  private target: THREE.Group | null = null; private reticle: THREE.Mesh; private bow = bowMesh();
  private flying: { obj: THREE.Group; from: THREE.Vector3; to: THREE.Vector3; t: number; pts: number } | null = null;
  private stuck: THREE.Object3D[] = []; private nocked: THREE.Group | null = null; private releaseT = 0; private pauseT = 0;
  constructor(private g: Game, l: Landmark) {
    this.shoot = new THREE.Vector3(...l.at!.shoot); this.lane = new THREE.Vector3(...l.at!.line);
    this.reticle = new THREE.Mesh(new THREE.RingGeometry(0.09, 0.15, 24), new THREE.MeshBasicMaterial({ color: 0xff2a2a, depthTest: false, transparent: true }));
    this.reticle.renderOrder = 10; this.reticle.visible = false; g.scene.add(this.reticle);
  }
  private get st() { return (this.g.stats.archery ??= { lv: 1, best: [] }); }
  /** the best arrow you have won so far */
  get arrow() { return ARROWS[Math.min(ARROWS.length - 1, this.st.lv - 1)]; }
  near(p: THREE.Vector3) { return Math.abs(p.x - this.lane.x) < 9 && p.z > this.lane.z - 6 && p.z < this.lane.z + 6 && Math.abs(p.y - this.lane.y) < 5; }
  button(): [string, string] { return ['🏹', tr('Memanah', 'Archery')]; }
  open() {
    const g = this.g, top = Math.min(LEVELS.length, this.st.lv);
    g.ui.dialog({
      face: '🏹', who: tr('Lapangan Panahan', 'The Archery Range'),
      text: tr(`Tembak sasaran! Lingkaran merah kecil adalah bidikanmu — ketuk ✋ saat ada di tengah. Kuning 100, merah 50, biru 20, hitam/putih 10. Panahmu: <b>${t2(this.arrow.name)}</b>.`, `Hit the target! The little red circle is your aim — tap ✋ when it’s over the middle. Yellow 100, red 50, blue 20, black/white 10. Your arrow: <b>${t2(this.arrow.name)}</b>.`),
      buttons: [
        ...Array.from({ length: top }, (_, i) => ({ label: `🎯 ${tr('Level', 'Level')} ${i + 1}${this.st.best[i] ? ` · ${tr('terbaik', 'best')} ${this.st.best[i]}` : ''}`, cls: i === top - 1 ? 'gold' : '', fn: () => this.start(i) })),
        { label: tr('Nanti saja', 'Not now'), cls: 'ghost' },
      ],
    });
  }
  start(level: number) {
    const g = this.g;
    if (g.fun.riding) g.fun.dismount();
    this.active = true; this.level = level; this.points = 0; this.shot = 0; this.t = Math.random() * 10; this.state = 'aim';
    const lv = LEVELS[level];
    this.clearStuck();
    this.target = targetMesh(lv.r);
    this.target.position.set(this.lane.x, this.lane.y + 1.5, this.lane.z - lv.d);
    g.scene.add(this.target);
    (g.avatar?.hand ?? g.avatar?.armR)?.add(this.bow);
    g.ents.mo.stand = { pos: new THREE.Vector3(this.shoot.x + 2.2, this.shoot.y, this.shoot.z + 0.6), yaw: Math.PI };
    this.nock();
    g.goodWord('start', true);
    g.ui.say(lv.wind ? tr('Level 5: ada angin! Angin mendorong panah ke kanan — bidik sedikit ke kiri ya 💨', 'Level 5: it’s windy! The wind pushes your arrow to the right — aim a little to the left 💨')
      : lv.move ? tr('Level 4: sasarannya bergerak! Tunggu saat yang tepat 🎯', 'Level 4: the target moves! Wait for the right moment 🎯')
        : tr(`Level ${level + 1}: ketuk ✋ saat lingkaran merah ada di tengah kuning. Butuh ${lv.need} poin dengan 5 panah!`, `Level ${level + 1}: tap ✋ when the red circle is over the yellow middle. You need ${lv.need} points with 5 arrows!`), 'idea', 6000);
    g.stats.archeryRounds = (g.stats.archeryRounds || 0) + 1;
  }
  quit() { if (this.active) this.end(); }
  private nock() { if (this.nocked) this.nocked.removeFromParent(); this.nocked = arrowMesh(this.arrow); this.nocked.scale.multiplyScalar(0.8); this.bow.add(this.nocked); this.nocked.rotation.set(0, -Math.PI / 2, 0); this.nocked.position.set(0.25, 0, 0); }
  /** where your aim is on the target, in the world */
  private aimPoint(u: [number, number]) {
    const lv = LEVELS[this.level], c = this.target!.position;
    return new THREE.Vector3(c.x + u[0] * lv.r, c.y + u[1] * lv.r, c.z + 0.2);
  }
  tap() {
    if (this.state !== 'aim' || !this.target) return;
    const g = this.g, lv = LEVELS[this.level];
    // the target may be moving: aim and landing are relative to its middle
    const aim = aimAt(this.t, lv), land = landing(aim, lv, this.arrow.help);
    const dist = Math.hypot(land[0], land[1]), pts = ringPoints(dist);
    const to = pts ? this.aimPoint(land) : this.aimPoint([land[0] * 1.6 + Math.sign(land[0] || 1) * 0.4, land[1] * 1.6 - 0.3]);
    const obj = arrowMesh(this.arrow);
    const from = new THREE.Vector3(); this.bow.getWorldPosition(from);
    obj.position.copy(from); g.scene.add(obj);
    this.flying = { obj, from, to, t: 0, pts };
    if (this.nocked) { this.nocked.removeFromParent(); this.nocked = null; }
    this.state = 'fly'; this.releaseT = 0.35; this.shot++;
    SFX.pop(4);
  }
  step(dt: number): boolean {
    if (!this.active) return false;
    const g = this.g, lv = LEVELS[this.level], p = g.player;
    this.t += dt; this.releaseT = Math.max(0, this.releaseT - dt);
    // the moving target of level 4
    if (this.target) this.target.position.x = this.lane.x + (lv.move ? Math.sin(this.t * 0.9) * lv.move : 0);
    if (this.state === 'aim' && this.target) {
      this.reticle.visible = true;
      this.reticle.position.copy(this.aimPoint(aimAt(this.t, lv))).setZ(this.target.position.z + 0.25);
    } else this.reticle.visible = false;
    if (this.flying) {
      const f = this.flying; f.t += dt / 0.45;
      const k = Math.min(1, f.t);
      f.obj.position.lerpVectors(f.from, f.to, k); f.obj.position.y += Math.sin(k * Math.PI) * 0.35 * (lv.d / 10);
      f.obj.lookAt(f.to.x, f.to.y, f.to.z + 10); // points down the lane
      if (this.arrow.id === 'gold' || this.arrow.id === 'star') g.fx.sparkle(f.obj.position.x, f.obj.position.y, f.obj.position.z, 1, this.arrow.color, 0.6);
      if (k >= 1) this.hit(f);
    }
    if (this.state === 'pause' && (this.pauseT -= dt) <= 0) { this.state = 'aim'; this.nock(); }
    p.pos.copy(this.shoot); p.vel.set(0, 0, 0); p.visY = p.pos.y; p.onGround = true; p.speed = 0; p.yaw = 0;
    g.ui.actHud(`🏹 ${tr('Level', 'Level')} ${this.level + 1} · ${tr('panah', 'arrow')} ${Math.min(this.shot + (this.state === 'aim' ? 1 : 0), ARROWS_PER_ROUND)}/${ARROWS_PER_ROUND} · 🎯 ${this.points} / ${lv.need}${lv.wind ? ' · 💨 →' : ''}`, () => this.quit());
    return true;
  }
  private hit(f: NonNullable<Archery['flying']>) {
    const g = this.g, before = this.points;
    this.flying = null;
    if (f.pts) {
      // it stays in the target, moving with it
      this.target!.worldToLocal(f.obj.position); this.target!.add(f.obj); f.obj.rotation.set(0, 0, 0); this.stuck.push(f.obj);
      this.points += f.pts;
      const line = sumLine(before, f.pts);
      g.ui.raceMath(line.show);
      Speech.talk(tr(line.say[0], line.say[1]), tr('id', 'en') as 'id' | 'en', true, 1);
      SFX.pop(f.pts >= 50 ? 8 : 5); g.fx.sparkle(f.to.x, f.to.y, f.to.z, f.pts / 10, f.pts === 100 ? 0xffd21f : 0xffffff, 1.4);
      if (f.pts === 100) { g.goodWord('bullseye'); g.ents.mo.celebrate = 1.2; if (this.arrow.id === 'star') g.ui.confetti(25); }
    } else {
      g.scene.remove(f.obj);
      g.ui.raceMath(tr('Meleset!', 'Missed!')); SFX.pop(1); g.goodWord('missed');
    }
    if (this.shot >= ARROWS_PER_ROUND) { this.state = 'done'; setTimeout(() => this.result(), 1100); }
    else { this.state = 'pause'; this.pauseT = 0.9; }
  }
  private result() {
    const g = this.g, lv = LEVELS[this.level], st = this.st, passed = this.points >= lv.need;
    st.best[this.level] = Math.max(st.best[this.level] ?? 0, this.points);
    const coins = Math.floor(this.points / 10);
    let won = '';
    if (passed && st.lv === this.level + 1) {
      st.lv = Math.min(LEVELS.length + 1, this.level + 2);
      won = this.level + 1 < ARROWS.length ? tr(`<br>🎁 Hadiah: <b>${t2(ARROWS[this.level + 1].name)}</b>! Panah ini mendarat lebih dekat ke tengah.`, `<br>🎁 Prize: the <b>${t2(ARROWS[this.level + 1].name)}</b>! It lands nearer the middle.`)
        : tr('<br>🏆 Kamu <b>Juara Panahan</b>! Masya Allah!', '<br>🏆 You’re the <b>Archery Champion</b>! Masha Allah!');
      if (this.level + 1 === LEVELS.length) g.stats.archeryChampion = true;
    }
    if (coins) g.addCoins(coins, from => g.ui.coinPop(coins, from));
    SFX.fanfare(); g.ui.confetti(passed ? 60 : 20); g.ents.mo.celebrate = passed ? 2 : 0.8;
    g.goodWord(passed ? 'finished' : 'missed', true);
    const next = passed && this.level + 1 < LEVELS.length;
    g.ui.dialog({
      face: passed ? '🏆' : '🏹', who: passed ? tr('Lulus!', 'Level passed!') : tr('Hampir!', 'Nearly!'),
      text: (passed ? tr(`<b>${this.points} poin!</b> Kamu lulus level ${this.level + 1}. Alhamdulillah!`, `<b>${this.points} points!</b> You passed level ${this.level + 1}. Alhamdulillah!`)
        : tr(`<b>${this.points} poin.</b> Butuh ${lv.need} untuk lulus. Insya Allah bisa, coba lagi!`, `<b>${this.points} points.</b> You need ${lv.need} to pass. Insha Allah you can — try again!`))
        + won + `<br>🪙 ${tr(`Setiap 10 poin = 1 koin: ${this.points} ÷ 10 = ${coins}`, `Every 10 points = 1 coin: ${this.points} ÷ 10 = ${coins}`)}`,
      buttons: [
        ...(next ? [{ label: `🎯 ${tr('Level', 'Level')} ${this.level + 2}`, cls: 'gold', fn: () => { this.end(); setTimeout(() => this.start(this.level + 1), 300); } }] : []),
        { label: '🔁 ' + tr('Lagi', 'Again'), cls: next ? '' : 'gold', fn: () => { const lvl = this.level; this.end(); setTimeout(() => this.start(lvl), 300); } },
        { label: tr('Selesai', 'Done'), cls: 'ghost', fn: () => this.end() },
      ],
    });
    g.checkQuests(); g.saveSoon();
  }
  private clearStuck() { for (const o of this.stuck) o.removeFromParent(); this.stuck = []; }
  private end() {
    const g = this.g;
    this.active = false; this.state = 'done'; this.reticle.visible = false;
    if (this.flying) { g.scene.remove(this.flying.obj); this.flying = null; }
    this.clearStuck();
    if (this.target) { g.scene.remove(this.target); this.target = null; }
    this.bow.removeFromParent(); if (this.nocked) { this.nocked.removeFromParent(); this.nocked = null; }
    g.ents.mo.stand = null; g.ui.actHud(null);
    g.player.pos.set(this.shoot.x + 3, this.shoot.y, this.shoot.z + 1);
  }
  /** you: bow arm out towards the target, the other hand drawing the string to your chin; it springs forward when you shoot */
  pose(r: Rig) {
    const rel = this.releaseT / 0.35;
    r.body.rotation.y = 0.25;
    r.armR?.rotation.set(-Math.PI / 2, 0.15, 0);
    r.armL?.rotation.set(-1.45 + rel * 0.3, 0, 0.55 - rel * 0.9);
  }
  /** look over your shoulder down the lane, zoomed in on the target */
  camera(cam: THREE.PerspectiveCamera) {
    if (!this.target) return false;
    const lv = LEVELS[this.level], p = this.g.player.pos;
    cam.position.set(p.x + 1.0, p.y + 2.35, p.z + 2.0);
    cam.lookAt(this.lane.x, this.target.position.y, this.target.position.z);
    const fov = THREE.MathUtils.clamp((2 * Math.atan((lv.r * 2.8 + Math.abs(lv.move)) / (lv.d + 1.6)) * 180) / Math.PI, 12, 55);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    return true;
  }
}
