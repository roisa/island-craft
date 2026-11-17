// The Mini Stadium: football with Baby Mo.
//
//  🎓 Penalty school   Baby Mo shows, step by step and in slow motion, how to take a penalty
//                      (ball on the spot, pick a corner, step back, plant your foot, inside of the
//                      foot, follow through) and how a goalkeeper gets ready and dives. Then you try.
//  ⚽ Take penalties   5 kicks, Baby Mo in goal: the aim moves round the goal (or steer it with the
//                      joystick), tap to aim, then tap the power bar in the green.
//  🧤 Be the keeper    Baby Mo takes 5 kicks: watch his run-up (where his body leans) and dive
//                      left, stay, or dive right.
//  🏆 Shootout         5 each, you kick then you keep; sudden death if it's level.
//  ✨ Skills show      Baby Mo dribbles through the cones, does a step-over and keepy-uppies,
//                      counting out loud — then it's your turn at keepy-uppy.
//
// Between kicks: a football fact. The net billows when it's a goal, the crowd in the stands
// jumps and cheers, the scoreboard keeps the score, and the big moments go into slow motion.
import * as THREE from 'three';
import type { Game } from '../main';
import { tr, getLang } from '../i18n';
import type { Landmark } from '../world/landmarks';
import type { Activity } from './activity';
import type { Rig } from './models';
import { buildBlocky, type BlockyOpts } from './blocky';
import { SFX, Speech } from './audio';

// ---------------------------------------------------------------- the rules of a kick (pure, tested)
/** the goal's opening: half its width and its height (blocks) */
export const GOAL2 = { half: 2.5, h: 3 };
/**
 * Where a penalty goes. `aimX` −1 … 1 across the goal, `aimY` 0 … 1 up it, `power` where the power bar
 * stopped (0 … 1; the green middle is just right). Too hard: it rises (over the bar!); too soft: it's
 * slower and drifts to the middle (easier to save).
 */
export function shotPlan(aimX: number, aimY: number, power: number) {
  const off = power - 0.5; // − too soft … + too hard
  const soft = Math.max(0, -off * 2);
  const x = aimX * (1 - soft * 0.45);
  const y = Math.max(0.05, aimY + off * 1.1);
  const speed = 0.65 + power * 0.7; // 0.65 (a gentle roll) … 1.35 (a rocket)
  let miss: 'over' | 'wide' | 'post' | null = null;
  if (y > 1.06) miss = 'over';
  else if (Math.abs(x) > 1.08) miss = 'wide';
  else if (Math.abs(x) > 0.98 || y > 0.97) miss = 'post';
  return { x: Math.max(-1.3, Math.min(1.3, x)), y: Math.min(1.25, y), speed, miss };
}
/** does a keeper who dived to `diveX` (−1 … 1, 0 = stayed) stop a shot at (x, y)? Slower shots are easier. */
export function keeperSaves(x: number, y: number, diveX: number, speed: number) {
  const reach = 0.42 + Math.max(0, 1.35 - speed) * 0.55;
  if (y > 0.82 && Math.abs(x) > 0.75 && Math.abs(x - diveX) > 0.25) return false; // right in the top corner: unstoppable!
  return Math.abs(x - diveX) < reach;
}
/** you in goal: did your dive (−1 left of the goal as you face out, 0 stay, +1 right) stop it? (kind on small keepers) */
export function youSave(x: number, dive: -1 | 0 | 1) {
  if (dive === 0) return Math.abs(x) < 0.38;
  return Math.sign(x) === dive && Math.abs(x) > 0.2;
}
/** a shootout: after `n` kicks each, who has won (null: not decided yet). Sudden death after five. */
export function shootoutWinner(me: number[], mo: number[]): 'me' | 'mo' | null {
  const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
  const a = sum(me), b = sum(mo), na = me.length, nb = mo.length;
  if (na <= 5 && nb <= 5) {
    // can the one behind still catch up with the kicks they have left?
    if (a + (5 - na) < b) return 'mo';
    if (b + (5 - nb) < a) return 'me';
    if (na === 5 && nb === 5 && a !== b) return a > b ? 'me' : 'mo';
    return null;
  }
  if (na === nb && a !== b) return a > b ? 'me' : 'mo';
  return null;
}

/** little football facts between the kicks: [Indonesian, English] */
export const FACTS: [string, string][] = [
  ['Satu tim sepak bola punya 11 pemain di lapangan — salah satunya kiper.', 'A football team has 11 players on the pitch — one of them is the goalkeeper.'],
  ['Hanya kiper yang boleh memegang bola dengan tangan, dan hanya di kotak penaltinya sendiri.', 'Only the goalkeeper may hold the ball with their hands — and only inside their own penalty box.'],
  ['Di lapangan besar, titik penalti jaraknya 11 meter dari gawang.', 'On a big pitch the penalty spot is 11 metres from the goal.'],
  ['Satu pertandingan ada dua babak, masing-masing 45 menit.', 'A match has two halves of 45 minutes each.'],
  ['Gawang sungguhan lebarnya 7,32 meter dan tingginya 2,44 meter!', 'A real goal is 7.32 metres wide and 2.44 metres high!'],
  ['Menendang dengan kaki bagian dalam membuat bola lebih tepat sasaran.', 'Kicking with the inside of your foot makes the ball go exactly where you want.'],
  ['Pemain yang sportif membantu temannya berdiri saat jatuh, dan bersalaman setelah bertanding.', 'A good sport helps a friend up when they fall, and shakes hands after the game.'],
  ['Ucapkan Bismillah sebelum bermain, dan Alhamdulillah — menang atau kalah!', 'Say Bismillah before you play, and Alhamdulillah — whether you win or lose!'],
  ['Minum air saat istirahat: tubuh kita perlu air untuk bermain dengan baik.', 'Drink water at half-time: your body needs water to play well.'],
  ['Kiper yang baik memperhatikan pinggul penendang — ke sanalah biasanya bola pergi.', 'A good goalkeeper watches the kicker’s hips — that’s usually where the ball goes.'],
  ['Juggling (keepy-uppy) melatih sentuhan bola: makin sering latihan, makin jago!', 'Keepy-uppy trains your touch: the more you practise, the better you get!'],
  ['Mukmin yang kuat lebih dicintai Allah (HR. Muslim 2664) — olahraga membuat badan sehat dan kuat.', 'The strong believer is more beloved to Allah (Muslim 2664) — sport keeps your body healthy and strong.'],
];
const NUM_EN = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const NUM_ID = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas', 'dua puluh'];
const numWord = (n: number) => (n <= 20 ? (getLang() === 'en' ? NUM_EN[n] : NUM_ID[n]) : String(n));

const CROWD: BlockyOpts[] = [
  { skin: '#E8B48A', shirt: 0xe4423a, pants: 0x2a3550, peci: 0x1f1f1f, adult: true, backpack: null, emblem: null, hair: 0x1f1a1a },
  { skin: '#D9A27A', shirt: 0x2e78d6, pants: 0x3b3a3d, hijab: 0xf2b134, tunic: true, adult: true, backpack: null, emblem: null, hair: 0x2b2018 },
  { skin: '#F1C7A3', shirt: 0x8dc63f, pants: 0x2a3550, backpack: null, emblem: null, hair: 0x3b2a1a },
  { skin: '#C98E66', shirt: 0xf2a7c3, pants: 0x3b3a3d, hijab: 0x9b59b6, tunic: true, adult: true, backpack: null, emblem: null, hair: 0x1f1a1a },
  { skin: '#E8B48A', shirt: 0xf2b134, pants: 0x3b3a3d, backpack: null, emblem: null, hair: 0x1f1a1a },
  { skin: '#F1C7A3', shirt: 0x1abc9c, pants: 0x3b3a3d, hijab: 0xffffff, tunic: true, backpack: null, emblem: null, hair: 0x2b2018 },
];
const yawTo = (ax: number, az: number, bx: number, bz: number) => Math.atan2(-(bx - ax), -(bz - az)); // (the player: 0 faces −z)
const faceDir = (dx: number, dz: number) => Math.atan2(dx, dz);                                       // (models: 0 faces +z)
const smooth = (k: number) => k * k * (3 - 2 * k);

function ballTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const x = c.getContext('2d')!;
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 64);
  x.fillStyle = '#1f1f1f';
  for (const [px, py] of [[16, 16], [48, 40], [80, 16], [112, 40], [16, 52], [80, 52], [48, 8], [112, 8]]) { x.beginPath(); x.arc(px, py, 7, 0, Math.PI * 2); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

type Mode = 'school' | 'shoot' | 'keep' | 'shootout' | 'skills' | 'juggle';
type Phase = 'idle' | 'aim' | 'power' | 'runup' | 'fly' | 'after' | 'moSetup' | 'moRun' | 'script' | 'juggle' | 'drop' | 'done';

export class Stadium implements Activity {
  readonly id = 'stadium';
  active = false;
  mode: Mode = 'shoot'; phase: Phase = 'idle';
  /** kicks taken / scored by you, and by Baby Mo (shootout); saves you made */
  myKicks: number[] = []; moKicks: number[] = []; saves = 0; juggles = 0;
  private gx: number; private gy: number; private gz: number; private spot: THREE.Vector3; private centre: THREE.Vector3;
  private board: THREE.Vector3 | null;
  private ball: THREE.Mesh; private aimRing: THREE.Mesh; private hint: THREE.Mesh;
  private net: THREE.Mesh; private netBase: Float32Array; private netHit: { x: number; y: number; t: number } | null = null;
  private boardMesh: THREE.Mesh | null = null; private boardCtx: CanvasRenderingContext2D | null = null; private boardTex: THREE.CanvasTexture | null = null;
  private crowd: { rig: Rig; ph: number; y: number }[] = []; private cheerT = 0;
  private cones: THREE.Object3D[] = [];
  private t = 0; private pt = 0; private slow = 1; private shake = 0; private dt = 0;
  // the kick in the air
  private flight: { from: THREE.Vector3; to: THREE.Vector3; dur: number; k: number; curve: number; res: 'goal' | 'saved' | 'post' | 'over' | 'wide'; byMe: boolean } | null = null;
  private loose: { v: THREE.Vector3 } | null = null;
  private aim = { x: 0, y: 0.3, manual: false }; private power = 0.5;
  private keeperX = 0; private keeperTo = 0; private keeperDive = 0; // Baby Mo in goal (−1 … 1 across the goal), dive 0 … 1
  private myDive: -1 | 0 | 1 = 0; private myDiveT = 0;              // you in goal
  private moShot = { x: 0, y: 0.3 }; private kickAnim = 0; private moKick = 0; private lean = 0;
  private script: { at: number; run: () => void }[] = []; private scriptT = 0; private waitTap = false;
  private stepNo = 0; private juggleBall = { y: 0, v: 0 }; private ring = 0; private best = 0;
  private camPos = new THREE.Vector3(); private camLook = new THREE.Vector3(); private camWant = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  private camSet = false;
  private moPos = new THREE.Vector3(); private moYaw = 0; private mePos = new THREE.Vector3(); private meYaw = 0; private meSpeed = 0;
  private moPoseKind: 'idle' | 'keeper' | 'kick' | 'dribble' | 'stepover' | 'juggle' | 'cheer' | 'carry' = 'idle';
  private mePoseKind: 'idle' | 'keeper' | 'kick' | 'juggle' | 'watch' = 'idle';

  constructor(private g: Game, l: Landmark) {
    const a = l.at!;
    this.gx = a.goal[0]; this.gy = a.goal[1]; this.gz = a.goal[2];
    this.spot = new THREE.Vector3(...a.spot); this.centre = new THREE.Vector3(...a.centre);
    this.board = a.board ? new THREE.Vector3(...a.board) : null;
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 14), new THREE.MeshLambertMaterial({ map: ballTexture() }));
    this.ball.visible = false; g.scene.add(this.ball);
    this.aimRing = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.42, 28), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.95, depthTest: false, side: THREE.DoubleSide }));
    this.aimRing.renderOrder = 10; this.aimRing.visible = false; g.scene.add(this.aimRing);
    // the hint over Baby Mo's head when you're in goal: which way his body leans
    const hc = document.createElement('canvas'); hc.width = hc.height = 64; const hx = hc.getContext('2d')!;
    hx.fillStyle = '#ffd23f'; hx.beginPath(); hx.moveTo(8, 32); hx.lineTo(36, 8); hx.lineTo(36, 22); hx.lineTo(58, 22); hx.lineTo(58, 42); hx.lineTo(36, 42); hx.lineTo(36, 56); hx.closePath(); hx.fill();
    const ht = new THREE.CanvasTexture(hc); ht.colorSpace = THREE.SRGBColorSpace;
    this.hint = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: ht, transparent: true, depthTest: false }));
    this.hint.renderOrder = 11; this.hint.visible = false; g.scene.add(this.hint);
    // the net behind the north goal: a soft mesh that billows when the ball hits it
    const geo = new THREE.PlaneGeometry(GOAL2.half * 2, GOAL2.h, 20, 12);
    this.net = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.75 }));
    this.net.position.set(this.gx, this.gy + GOAL2.h / 2, this.gz - 1.5);
    g.scene.add(this.net);
    this.netBase = (geo.attributes.position.array as Float32Array).slice();
    // the sides and the roof of the net (still)
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.55 });
    const roof = new THREE.Mesh(new THREE.PlaneGeometry(GOAL2.half * 2, 1.5, 20, 6), mat); roof.rotation.x = -Math.PI / 2; roof.position.set(this.gx, this.gy + GOAL2.h, this.gz - 0.75); g.scene.add(roof);
    for (const s of [-1, 1]) { const side = new THREE.Mesh(new THREE.PlaneGeometry(1.5, GOAL2.h, 6, 12), mat); side.rotation.y = Math.PI / 2; side.position.set(this.gx + s * GOAL2.half, this.gy + GOAL2.h / 2, this.gz - 0.75); g.scene.add(side); }
    // the scoreboard
    if (this.board) {
      const c = document.createElement('canvas'); c.width = 512; c.height = 192;
      this.boardCtx = c.getContext('2d'); this.boardTex = new THREE.CanvasTexture(c); this.boardTex.colorSpace = THREE.SRGBColorSpace;
      this.boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.75), new THREE.MeshBasicMaterial({ map: this.boardTex }));
      this.boardMesh.position.copy(this.board); this.boardMesh.rotation.y = Math.PI; g.scene.add(this.boardMesh);
      this.drawBoard('BabyMo FC', '⚽', '');
    }
  }

  // ---------------------------------------------------------------- the Activity side
  near(p: THREE.Vector3) { return Math.abs(p.x - this.centre.x) < 13 && Math.abs(p.z - this.centre.z) < 20 && Math.abs(p.y - this.centre.y) < 5; }
  button(): [string, string] { return ['⚽', tr('Stadion', 'Stadium')]; }
  open() {
    const g = this.g, first = !g.stats.stadiumSchool;
    g.ui.dialog({
      face: '⚽', who: tr('Stadion Mini', 'The Mini Stadium'),
      text: tr('Mau main apa? Kalau baru pertama kali, coba <b>Sekolah penalti</b> dulu bersama Baby Mo!', 'What shall we play? If it’s your first time, try <b>Penalty school</b> with Baby Mo!'),
      buttons: [
        { label: '🎓 ' + tr('Sekolah penalti', 'Penalty school'), cls: first ? 'gold' : '', fn: () => this.start('school') },
        { label: '⚽ ' + tr('Aku menendang', 'I take the kicks'), cls: first ? '' : 'gold', fn: () => this.start('shoot') },
        { label: '🧤 ' + tr('Aku jadi kiper', 'I’m the goalkeeper'), fn: () => this.start('keep') },
        { label: '🏆 ' + tr('Adu penalti lawan Baby Mo', 'Shootout against Baby Mo'), fn: () => this.start('shootout') },
        { label: '✨ ' + tr('Pertunjukan skill Baby Mo', 'Baby Mo’s skills show'), fn: () => this.start('skills') },
        { label: tr('Nanti saja', 'Not now'), cls: 'ghost' },
      ],
    });
  }
  start(mode: Mode) {
    const g = this.g;
    if (g.fun.riding) g.fun.dismount();
    this.active = true; this.mode = mode; this.t = 0; this.myKicks = []; this.moKicks = []; this.saves = 0; this.juggles = 0;
    this.slow = 1; this.camSet = false; this.flight = null; this.loose = null; this.script = []; this.netHit = null; this.practice = false; this.stepNo = 0;
    g.ents.mo.stand = { pos: this.moPos, yaw: 0 };
    this.seatCrowd();
    this.drawBoard(tr('KAMU', 'YOU'), '0 – 0', 'BABY MO');
    g.goodWord('start', true);
    g.stats.stadiumGames = (g.stats.stadiumGames || 0) + 1;
    if (mode === 'school') this.school();
    else if (mode === 'skills') this.skills();
    else if (mode === 'juggle') this.juggleStart();
    else if (mode === 'keep') { g.ui.say(tr('Kamu kipernya! Perhatikan ke mana badan Baby Mo condong waktu berlari, lalu lompat ke kiri ⬅️, tetap 🧤, atau ke kanan ➡️.', 'You’re in goal! Watch which way Baby Mo’s body leans as he runs up, then dive left ⬅️, stay 🧤, or dive right ➡️.'), 'idea', 7000); this.moSetup(); }
    else { if (mode === 'shootout') g.ui.say(tr('Adu penalti! Kamu menendang dulu, lalu jadi kiper. 5 tendangan masing-masing. Bismillah!', 'Shootout! You kick first, then you go in goal. 5 kicks each. Bismillah!'), 'alright', 6000); else g.ui.say(tr('Bidikan kuning berputar di gawang — ketuk untuk memilih sudut (atau arahkan dengan joystick). Lalu ketuk lagi saat bar tenaga di hijau!', 'The yellow aim moves round the goal — tap to pick a corner (or steer it with the joystick). Then tap again when the power bar is in the green!'), 'idea', 7000); this.shootSetup(); }
  }
  quit() { if (this.active) this.end(); }
  tap() {
    // a tap while Baby Mo is showing something skips ahead; once the game is yours, taps are yours (none is lost)
    if (this.waitTap) { this.waitTap = false; if (this.phase === 'script') { this.scriptT = Math.max(this.scriptT, this.nextAt()); return; } }
    if (this.phase === 'aim') { this.phase = 'power'; this.pt = 0; SFX.click(); return; }
    if (this.phase === 'power') { this.power = powerSweep(this.pt); this.g.ui.meter(null); this.phase = 'runup'; this.pt = 0; return; }
    if (this.phase === 'moRun' && this.myDive === 0 && this.myDiveT === 0) { this.dive(0); return; }
    if (this.phase === 'juggle') this.juggleTap();
  }
  private nextAt() { const n = this.script.find(s => s.at > this.scriptT); return n ? n.at : this.scriptT; }

  // ---------------------------------------------------------------- you take a penalty
  private shootSetup() {
    const g = this.g;
    this.phase = 'aim'; this.pt = Math.random() * 3; this.aim = { x: 0, y: 0.3, manual: false }; this.kickAnim = 0;
    this.keeperX = 0; this.keeperTo = 0; this.keeperDive = 0; this.flight = null; this.loose = null; this.slow = 1; this.moKick = 0; this.myDive = 0; this.myDiveT = 0;
    this.ball.visible = true; this.ball.position.set(this.spot.x, this.spot.y + 0.26, this.spot.z); this.ball.rotation.set(0, 0, 0);
    // you behind the ball, Baby Mo in goal
    this.mePos.set(this.spot.x - 0.5, this.spot.y, this.spot.z + 2.6); this.meYaw = 0; this.mePoseKind = 'idle'; this.meSpeed = 0;
    this.moPos.set(this.gx, this.gy, this.gz + 0.7); this.moYaw = 0; this.moPoseKind = 'keeper';
    this.want('shoot');
    g.ui.actChoices(null);
  }
  private aimPoint(x: number, y: number, z = this.gz) { return new THREE.Vector3(this.gx + x * (GOAL2.half - 0.3), this.gy + 0.28 + y * (GOAL2.h - 0.6), z); }
  private kickNow() {
    // Baby Mo guesses a side (sometimes he stays), a little late for a fast kick
    const plan = shotPlan(this.aim.x, this.aim.y, this.power);
    this.keeperTo = Math.random() < 0.2 ? 0 : (Math.random() < 0.5 ? -1 : 1) * (0.55 + Math.random() * 0.4);
    const saved = !plan.miss && keeperSaves(plan.x, plan.y, this.keeperTo, plan.speed);
    const res = plan.miss ?? (saved ? 'saved' : 'goal');
    const from = this.ball.position.clone();
    let to = this.aimPoint(plan.x, plan.y, this.gz - (res === 'goal' ? 1.3 : 0.05));
    if (res === 'saved') to = this.aimPoint(this.keeperTo * 0.85 + (plan.x - this.keeperTo) * 0.4, Math.min(plan.y, 0.8), this.gz + 0.5);
    if (res === 'over') to.y += 1.6;
    if (res === 'wide') to.x += Math.sign(plan.x) * 1.4;
    this.flight = { from, to, dur: 0.95 / plan.speed, k: 0, curve: (Math.random() - 0.5) * 0.8, res, byMe: true };
    this.phase = 'fly'; this.pt = 0; this.kickAnim = 0.5;
    SFX.pop(5); this.g.fx.sparkle(from.x, from.y, from.z, 6, 0xffffff, 1.2);
  }

  // ---------------------------------------------------------------- Baby Mo takes a penalty, you're in goal
  private moSetup() {
    const g = this.g;
    this.phase = 'moSetup'; this.pt = 0; this.myDive = 0; this.myDiveT = 0; this.flight = null; this.loose = null; this.slow = 1;
    const r = Math.random();
    this.moShot = { x: (r < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.65), y: 0.1 + Math.random() * 0.6 };
    if (Math.random() < 0.15) this.moShot.x = (Math.random() - 0.5) * 0.4; // sometimes straight down the middle!
    this.lean = 0; this.moKick = 0;
    this.ball.visible = true; this.ball.position.set(this.spot.x, this.spot.y + 0.26, this.spot.z);
    // you on the goal line, facing out; Baby Mo walks back for his run-up
    this.mePos.set(this.gx, this.gy, this.gz + 0.5); this.meYaw = -Math.PI; this.mePoseKind = 'keeper';
    this.moPos.set(this.spot.x + 0.3, this.spot.y, this.spot.z + 0.8); this.moYaw = Math.PI; this.moPoseKind = 'idle';
    this.want('keep');
    const dive = (d: -1 | 0 | 1) => () => this.dive(d);
    g.ui.actChoices([
      { label: `<b>⬅️</b>${tr('Kiri', 'Left')}`, fn: dive(1) },     // (your left, facing out = towards +x)
      { label: `<b>🧤</b>${tr('Tetap', 'Stay')}`, fn: dive(0) },
      { label: `<b>➡️</b>${tr('Kanan', 'Right')}`, fn: dive(-1) },
    ]);
  }
  /** you dive (1 = to your left, −1 = to your right, 0 = stay in the middle) */
  private dive(d: -1 | 0 | 1) {
    if (this.phase !== 'moRun' && this.phase !== 'moSetup') return; // (once Baby Mo has kicked, the save is already decided)
    if (this.myDiveT > 0) return;
    this.myDive = d; this.myDiveT = 0.001; SFX.jump();
  }
  private moKickNow() {
    const s = this.moShot, dive = this.myDive;
    const saved = youSave(s.x, dive);
    const res = saved ? 'saved' : 'goal';
    const from = this.ball.position.clone();
    const to = saved ? this.aimPoint(dive * 0.75 + s.x * 0.25, Math.min(s.y, 0.7), this.gz + 0.55) : this.aimPoint(s.x, s.y, this.gz - 1.3);
    this.flight = { from, to, dur: 1.0, k: 0, curve: (Math.random() - 0.5) * 0.6, res, byMe: false };
    this.phase = 'fly'; this.pt = 0; SFX.pop(5);
  }

  // ---------------------------------------------------------------- after a kick
  private land(res: 'goal' | 'saved' | 'post' | 'over' | 'wide', byMe: boolean) {
    const g = this.g, b = this.ball.position;
    this.flight = null; this.slow = 1;
    if (res === 'goal') {
      this.netHit = { x: b.x - this.gx, y: b.y - this.gy - GOAL2.h / 2, t: 0 };
      this.loose = { v: new THREE.Vector3(0, -1, -0.5) };
      this.shake = 0.35; this.cheer(byMe ? 2.5 : 1.2);
      g.fx.sparkle(b.x, b.y, b.z, 18, 0xffffff, 2.2);
      if (byMe) {
        SFX.fanfare(); g.ui.confetti(40); g.ui.raceCount(tr('GOL!', 'GOAL!')); this.banner = 1.4;
        Speech.talk(tr('Gol! Masya Allah!', 'Goal! Masha Allah!'), getLang(), true, 1);
        g.ents.mo.celebrate = 0; g.stats.stadiumGoals = (g.stats.stadiumGoals || 0) + 1;
      } else if (this.mode === 'school') { SFX.fanfare(); g.ui.raceCount(tr('GOL!', 'GOAL!')); this.banner = 1.2; g.ui.confetti(25); }
      else { SFX.chime(); g.ui.raceMath(tr('Gol untuk Baby Mo! Tidak apa-apa, ayo coba lagi 💪', 'A goal for Baby Mo! That’s okay, let’s try again 💪')); this.moPoseKind = 'cheer'; }
    } else if (res === 'saved') {
      this.loose = { v: new THREE.Vector3((Math.random() - 0.5) * 3, 3, 4) };
      if (byMe) { SFX.pop(2); g.ui.raceMath(tr('Ditangkap Baby Mo! 🧤', 'Saved by Baby Mo! 🧤')); this.cheer(0.8); }
      else {
        SFX.fanfare(); this.cheer(2.2); this.shake = 0.25; g.ui.confetti(30); g.ui.raceCount(tr('TANGKAP!', 'SAVED!')); this.banner = 1.4;
        g.fx.sparkle(b.x, b.y, b.z, 18, 0xffd23f, 2.2); this.saves++; g.stats.stadiumSaves = (g.stats.stadiumSaves || 0) + 1;
        Speech.talk(tr('Tangkapan hebat!', 'What a save!'), getLang(), true, 1);
      }
    } else if (res === 'post') { SFX.boom(); this.loose = { v: new THREE.Vector3((Math.random() - 0.5) * 2, 2.5, 5) }; g.ui.raceMath(tr('Kena tiang! 🥅', 'Off the post! 🥅')); this.shake = 0.2; }
    else { SFX.pop(1); this.loose = { v: new THREE.Vector3(0, -0.5, -3) }; g.ui.raceMath(res === 'over' ? tr('Melambung di atas mistar!', 'Over the bar!') : tr('Melebar!', 'Wide!')); }
    if (byMe) this.myKicks.push(res === 'goal' ? 1 : 0); else this.moKicks.push(res === 'goal' ? 1 : 0);
    this.scoreBoard();
    this.phase = 'after'; this.pt = 0;
  }
  private banner = 0;
  /** what comes after a kick: the next one, the other side in a shootout, or the end */
  private next() {
    const g = this.g, m = this.mode;
    // a fact now and then
    const n = this.myKicks.length + this.moKicks.length;
    if (n % 2 === 1 && m !== 'school') { const f = FACTS[(g.stats.stadiumFact = ((g.stats.stadiumFact ?? -1) + 1) % FACTS.length)]; g.ui.say('⚽ ' + tr(f[0], f[1]), 'idea', 5500); }
    if (m === 'shoot') { if (this.myKicks.length >= (this.practice ? 3 : 5)) this.result(); else this.shootSetup(); return; }
    if (m === 'school') { if (this.myKicks.length >= 3) this.result(); else this.shootSetup(); return; }
    if (m === 'keep') { if (this.moKicks.length >= 5) this.result(); else this.moSetup(); return; }
    // the shootout: you kick, then Baby Mo; sudden death after five each
    const w = shootoutWinner(this.myKicks, this.moKicks);
    if (w && this.myKicks.length === this.moKicks.length) { this.result(); return; }
    if (w && this.myKicks.length <= 5) { this.result(); return; }
    if (this.myKicks.length > this.moKicks.length) this.moSetup(); else this.shootSetup();
    if (this.myKicks.length === 5 && this.moKicks.length === 5 && !w) g.ui.raceMath(tr('Sudden death! ⚡', 'Sudden death! ⚡'));
  }
  private practice = false;
  private result() {
    const g = this.g, m = this.mode, goals = this.myKicks.reduce((a, b) => a + b, 0), against = this.moKicks.reduce((a, b) => a + b, 0);
    this.phase = 'done'; g.ui.actChoices(null); g.ui.meter(null);
    let text = '', coins = 0, face = '⚽', win = false;
    if (m === 'keep') { coins = this.saves * 10; text = tr(`Kamu menangkap <b>${this.saves}</b> dari 5 tendangan Baby Mo! 🧤`, `You saved <b>${this.saves}</b> of Baby Mo’s 5 kicks! 🧤`); face = '🧤'; win = this.saves >= 3; }
    else if (m === 'shootout') {
      win = goals > against; coins = goals * 10 + (win ? 50 : 10); face = win ? '🏆' : '🤝';
      text = (win ? tr(`<b>Kamu menang ${goals}–${against}!</b> Alhamdulillah! 🏆`, `<b>You won ${goals}–${against}!</b> Alhamdulillah! 🏆`) : tr(`<b>Baby Mo menang ${against}–${goals}.</b> Pertandingan seru! Ayo bersalaman 🤝`, `<b>Baby Mo won ${against}–${goals}.</b> What a match! Let’s shake hands 🤝`));
      if (win) g.stats.stadiumWins = (g.stats.stadiumWins || 0) + 1;
    } else { coins = goals * 10; win = goals >= 3; text = tr(`<b>${goals} gol</b> dari ${this.myKicks.length} tendangan!`, `<b>${goals} goals</b> from ${this.myKicks.length} kicks!`); }
    if (coins) g.addCoins(coins, from => g.ui.coinPop(coins, from));
    SFX.fanfare(); g.ui.confetti(win ? 70 : 30); this.cheer(3); g.goodWord(win ? 'won' : 'finished', true);
    const f = FACTS[Math.floor(Math.random() * FACTS.length)];
    g.ui.dialog({
      face, who: tr('Peluit panjang!', 'Full time!'),
      text: text + (coins ? `<br>🪙 +${coins}` : '') + `<br><br>💡 ${tr(f[0], f[1])}`,
      buttons: [{ label: '⚽ ' + tr('Main lagi', 'Play again'), cls: 'gold', fn: () => { const mm = m === 'school' ? 'shoot' : m; this.end(); setTimeout(() => this.start(mm), 300); } }, { label: tr('Menu stadion', 'Stadium menu'), fn: () => { this.end(); setTimeout(() => this.open(), 300); } }, { label: tr('Selesai', 'Done'), cls: 'ghost', fn: () => this.end() }],
      onClose: () => { if (this.active && this.phase === 'done') this.end(); },
    });
    g.checkQuests(); g.saveSoon();
  }

  // ---------------------------------------------------------------- 🎓 Penalty school: a little film with Baby Mo
  private school() {
    const g = this.g, S = this.spot, Gz = this.gz;
    this.phase = 'script'; this.scriptT = 0; this.stepNo = 0; this.practice = true; this.want('school-spot');
    this.ball.visible = true; this.ball.position.set(S.x + 2, S.y + 0.26, S.z + 4);
    this.mePos.set(S.x + 3, S.y, S.z + 5.5); this.meYaw = yawTo(S.x + 3, S.z + 5.5, S.x, S.z); this.mePoseKind = 'watch'; // (watching from out of the camera's way)
    this.moPos.set(S.x + 2, S.y, S.z + 4.6); this.moYaw = Math.PI; this.moPoseKind = 'carry';
    const step = (n: number, title: [string, string], say: [string, string]) => () => {
      this.stepNo = n; SFX.chime(); g.ui.raceMath(`${n}. ${tr(title[0], title[1])}`); g.ui.say(tr(say[0], say[1]), n === 7 ? 'alright' : 'idea', 6500);
    };
    let at = 0;
    const add = (dt: number, run: () => void) => { at += dt; this.script.push({ at, run }); };
    this.script = [];
    // 1. the ball on the spot
    add(0.3, () => { this.want('school-spot'); step(1, ['Bola di titik penalti', 'The ball on the spot'], ['Pertama, letakkan bola di titik penalti. Di lapangan besar, jaraknya 11 meter dari gawang!', 'First, put the ball on the penalty spot. On a big pitch it’s 11 metres from the goal!'])(); this.walkMo(S.x + 0.1, S.z + 0.5, 1.6, true); });
    add(2.0, () => { this.ball.position.set(S.x, S.y + 0.26, S.z); this.moPoseKind = 'idle'; SFX.pop(2); this.g.fx.sparkle(S.x, S.y + 0.1, S.z, 8, 0xffffff, 1); });
    // 2. pick a corner
    add(2.6, () => { this.want('school-behind'); step(2, ['Pilih sudut', 'Pick a corner'], ['Lihat kipernya, lalu pilih sudut. Sudut bawah paling sulit ditangkap! 🎯', 'Look at the goalkeeper, then pick a corner. The bottom corners are the hardest to save! 🎯'])(); this.aimRing.visible = true; this.aimRing.position.copy(this.aimPoint(0.85, 0.05, Gz + 0.3)); });
    // 3. step back
    add(3.4, () => { step(3, ['Mundur beberapa langkah', 'Take a few steps back'], ['Mundur tiga langkah, agak ke samping. Tarik napas, tenang — Bismillah!', 'Take three steps back, a little to the side. Breathe, stay calm — Bismillah!'])(); this.walkMo(S.x - 1.2, S.z + 2.6, 1.4, false); });
    // 4. the run-up and the planted foot, in slow motion
    add(3.2, () => { this.want('school-side'); step(4, ['Lari, kaki tumpuan di samping bola', 'Run up, plant your foot beside the ball'], ['Lari kecil ke bola. Kaki tumpuan diletakkan di SAMPING bola, menghadap ke sasaran.', 'Run up to the ball. Put your standing foot BESIDE the ball, pointing at your target.'])(); this.slow = 0.35; this.walkMo(S.x - 0.35, S.z + 0.35, 2.8, false); });
    // 5. inside of the foot, follow through
    add(3.6, () => { step(5, ['Tendang dengan kaki bagian dalam', 'Kick with the inside of your foot'], ['Tendang dengan kaki bagian DALAM supaya tepat, lalu ayunkan kaki terus ke depan!', 'Kick with the INSIDE of your foot so it goes exactly there — and follow through!'])(); this.moKick = 0.001; });
    add(0.55, () => {
      const from = this.ball.position.clone(), to = this.aimPoint(0.85, 0.08, Gz - 1.3);
      this.flight = { from, to, dur: 0.9, k: 0, curve: 0.25, res: 'goal', byMe: false }; this.aimRing.visible = false; SFX.pop(5);
    });
    add(2.6, () => { this.slow = 1; this.flight = null; });
    // 6. the goalkeeper's turn
    add(1.0, () => {
      this.want('school-keeper'); step(6, ['Kalau jadi kiper', 'When you’re in goal'], ['Kiper: berdiri di tengah, lutut sedikit ditekuk, perhatikan bola dan pinggul penendang… lalu lompat!', 'Goalkeeper: stand in the middle, knees bent, watch the ball and the kicker’s hips… then dive!'])();
      this.loose = null; this.ball.position.set(this.gx + 3, this.gy + 0.26, this.gz + 6);
      this.moPos.set(this.gx, this.gy, this.gz + 0.7); this.moYaw = 0; this.moPoseKind = 'keeper'; this.keeperX = 0; this.keeperTo = 0; this.keeperDive = 0;
    });
    add(3.2, () => { this.slow = 0.4; this.keeperTo = -0.85; this.flight = { from: this.ball.position.clone(), to: this.aimPoint(-0.75, 0.35, this.gz + 0.55), dur: 0.9, k: 0, curve: 0, res: 'saved', byMe: false }; });
    add(2.6, () => { this.slow = 1; });
    // 7. your turn
    add(1.4, () => { step(7, ['Giliranmu!', 'Your turn!'], ['Sekarang kamu! 3 tendangan latihan. Ketuk untuk membidik, lalu ketuk saat bar tenaga di hijau. Kamu pasti bisa!', 'Now you! 3 practice kicks. Tap to aim, then tap when the power bar is in the green. You can do it!'])(); });
    add(2.2, () => { g.stats.stadiumSchool = 1; this.script = []; this.mode = 'school'; this.myKicks = []; this.shootSetup(); });
  }
  /** Baby Mo walks (or jogs) to a spot over `dur` seconds; `carry` keeps the ball at his feet */
  private walk: { from: THREE.Vector3; to: THREE.Vector3; dur: number; k: number; carry: boolean } | null = null;
  private walkMo(x: number, z: number, dur: number, carry: boolean) {
    this.walk = { from: this.moPos.clone(), to: new THREE.Vector3(x, this.moPos.y, z), dur, k: 0, carry };
    this.moYaw = faceDir(x - this.moPos.x, z - this.moPos.z);
  }

  // ---------------------------------------------------------------- ✨ Skills show, then your keepy-uppies
  private skills() {
    const g = this.g, C = this.centre;
    this.phase = 'script'; this.scriptT = 0; this.script = []; this.want('skills');
    this.clearCones();
    const coneMat = new THREE.MeshLambertMaterial({ color: 0xff7a1a });
    const xs = [-6, -3.5, -1, 1.5, 4];
    for (const cx of xs) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.6, 12), coneMat); c.position.set(C.x + cx, C.y + 0.3, C.z + 6); g.scene.add(c); this.cones.push(c); }
    this.ball.visible = true; this.ball.position.set(C.x - 8.5, C.y + 0.26, C.z + 6);
    this.moPos.set(C.x - 9, C.y, C.z + 6); this.moYaw = Math.PI / 2; this.moPoseKind = 'dribble';
    this.mePos.set(C.x - 1, C.y, C.z + 2.2); this.meYaw = yawTo(C.x - 1, C.z + 2.2, C.x - 1, C.z + 6); this.mePoseKind = 'watch'; // (across the cones, facing the camera)
    let at = 0;
    const add = (dt: number, run: () => void) => { at += dt; this.script.push({ at, run }); };
    const title = (a: string, b: string, say: [string, string]) => { SFX.chime(); g.ui.raceMath(tr(a, b)); g.ui.say(tr(say[0], say[1]), 'alright', 6000); };
    add(0.3, () => { this.want('skills'); title('Menggiring bola', 'Dribbling', ['Lihat aku menggiring bola melewati kerucut! Sentuhan kecil-kecil, bola tetap dekat kaki.', 'Watch me dribble through the cones! Small touches, keep the ball close to your feet.']); this.dribble = { path: [[-9, 6], [-7.5, 7.2], [-6, 5.2], [-4.75, 4.9], [-3.5, 6.9], [-2.25, 7.1], [-1, 5.1], [0.25, 4.9], [1.5, 6.9], [2.75, 7.1], [4, 5.1], [5.5, 6]], k: 0, dur: 7, touch: 0 }; });
    add(7.4, () => { this.dribble = null; this.moPoseKind = 'stepover'; this.stepT = 0; title('Step-over!', 'Step-over!', ['Step-over: kakiku berputar MELEWATI bola untuk mengecoh lawan!', 'A step-over: my foot circles OVER the ball to fool the defender!']); });
    add(3.2, () => { this.moPoseKind = 'juggle'; this.moJuggle = 0; this.moJugT = 0; title('Juggling!', 'Keepy-uppy!', ['Sekarang juggling — bola tidak boleh jatuh! Ayo hitung bersama!', 'Now keepy-uppy — don’t let it drop! Let’s count together!']); });
    add(8.5, () => { this.moPoseKind = 'cheer'; this.cheer(2.5); g.ui.confetti(40); SFX.fanfare(); title('Tadaa! ✨', 'Ta-da! ✨', ['Masya Allah, sepuluh! Sekarang giliranmu juggling!', 'Masha Allah, ten! Now it’s your turn at keepy-uppy!']); });
    add(2.8, () => { this.script = []; this.mode = 'juggle'; this.juggleStart(); });
  }
  private dribble: { path: number[][]; k: number; dur: number; touch: number } | null = null;
  private stepT = 0; private moJuggle = 0; private moJugT = 0;
  private clearCones() { for (const c of this.cones) this.g.scene.remove(c); this.cones = []; }

  private juggleStart() {
    const g = this.g, C = this.centre;
    this.clearCones();
    this.phase = 'juggle'; this.juggles = 0; this.juggleBall = { y: 1.6, v: 0 }; this.ring = 0;
    this.mePos.set(C.x, C.y, C.z + 3); this.meYaw = 0; this.mePoseKind = 'juggle';
    this.moPos.set(C.x - 2.6, C.y, C.z + 4.6); this.moYaw = faceDir(2.6, -1.6); this.moPoseKind = 'cheer';
    this.ball.visible = true;
    this.want('juggle');
    g.ui.say(tr('Ketuk saat bola turun ke kakimu (saat lingkaran kuning mengecil)! Berapa yang bisa kamu hitung?', 'Tap when the ball comes down to your foot (when the yellow ring gets small)! How many can you count?'), 'idea', 6000);
  }
  private juggleTap() {
    const g = this.g, h = this.juggleBall.y;
    if (this.juggleBall.v > 0) return; // still going up
    if (h < 0.95 && h > 0.15) {
      // a good touch: up it goes again (a little quicker each time)
      this.juggles++; this.kickAnim = 0.35;
      this.juggleBall.v = 4.6 + Math.min(1.2, this.juggles * 0.05);
      SFX.pop(Math.min(8, this.juggles % 9)); g.fx.sparkle(this.ball.position.x, this.ball.position.y, this.ball.position.z, 5, 0xffd23f, 1);
      Speech.talk(numWord(this.juggles), getLang(), true, 1);
      g.ui.raceMath(`${this.juggles}${getLang() === 'id' ? ` · ${NUM_EN[this.juggles] ?? ''}` : ''}`);
      if (this.juggles % 5 === 0) this.cheer(1);
    }
  }
  private juggleEnd() {
    const g = this.g, n = this.juggles;
    this.best = Math.max(g.stats.keepyBest || 0, n); const record = n > (g.stats.keepyBest || 0); g.stats.keepyBest = this.best;
    this.phase = 'done'; const coins = n * 2;
    if (coins) g.addCoins(coins, from => g.ui.coinPop(coins, from));
    SFX.fanfare(); g.ui.confetti(20 + n * 3); this.cheer(record ? 3 : 1);
    g.ui.dialog({
      face: '⚽', who: tr('Juggling', 'Keepy-uppy'),
      text: tr(`Kamu juggling <b>${n}</b> kali${n ? ` (${numWord(n)})` : ''}!`, `You did <b>${n}</b> keepy-uppies${n ? ` (${numWord(n)})` : ''}!`) + (record && n ? ` 🏅 ${tr('Rekor baru!', 'New record!')}` : '') + `<br>${tr('Rekor', 'Best')}: ${this.best} · 🪙 +${coins}`,
      buttons: [{ label: '⚽ ' + tr('Lagi', 'Again'), cls: 'gold', fn: () => { this.end(); setTimeout(() => this.start('juggle'), 300); } }, { label: tr('Menu stadion', 'Stadium menu'), fn: () => { this.end(); setTimeout(() => this.open(), 300); } }, { label: tr('Selesai', 'Done'), cls: 'ghost', fn: () => this.end() }],
      onClose: () => { if (this.active && this.phase === 'done') this.end(); },
    });
    g.saveSoon();
  }

  // ---------------------------------------------------------------- every frame
  step(dt: number, t: number): boolean {
    if (!this.active) return false;
    const g = this.g, sdt = dt * this.slow;
    this.dt = dt; this.t += dt; this.pt += sdt;
    if (this.banner > 0 && (this.banner -= dt) <= 0) g.ui.raceCount(null);
    if (this.phase === 'script') {
      this.scriptT += dt;
      while (this.script.length && this.script[0].at <= this.scriptT) this.script.shift()!.run();
    }
    // Baby Mo walking somewhere (with the ball at his feet when he's carrying it)
    if (this.walk) {
      const w = this.walk; w.k = Math.min(1, w.k + sdt / w.dur);
      this.moPos.lerpVectors(w.from, w.to, smooth(w.k));
      if (w.carry) { const f = new THREE.Vector3(Math.sin(this.moYaw) * 0.45, 0, Math.cos(this.moYaw) * 0.45); this.ball.position.set(this.moPos.x + f.x, this.gy + 0.26, this.moPos.z + f.z); }
      if (w.k >= 1) { this.walk = null; }
    }
    // the dribble: along the path, a touch every so often (the ball runs a little ahead, then he catches it up)
    if (this.dribble) {
      const d = this.dribble; d.k = Math.min(1, d.k + sdt / d.dur);
      const pts = d.path, u = d.k * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(u)), f = u - i;
      const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, z = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f;
      const nx = this.centre.x + x, nz = this.centre.z + z;
      this.moYaw = faceDir(nx - this.moPos.x, nz - this.moPos.z) || this.moYaw;
      this.moPos.set(nx, this.gy, nz);
      const touch = (this.t * 2.4) % 1, ahead = 0.35 + Math.sin(touch * Math.PI) * 0.5;
      if (touch < d.touch) SFX.pop(0);
      d.touch = touch;
      this.ball.position.set(nx + Math.sin(this.moYaw) * ahead, this.gy + 0.26, nz + Math.cos(this.moYaw) * ahead);
      this.ball.rotation.x += sdt * 9;
    }
    if (this.moPoseKind === 'stepover') { this.stepT += dt; const fwd = new THREE.Vector3(Math.sin(this.moYaw) * 0.45, 0, Math.cos(this.moYaw) * 0.45); this.ball.position.set(this.moPos.x + fwd.x, this.gy + 0.26, this.moPos.z + fwd.z); }
    if (this.moPoseKind === 'juggle' && this.mode === 'skills') {
      // Baby Mo's keepy-uppies: a little hop of the ball each time, counted out loud up to ten
      this.moJugT += dt;
      const per = 0.72, n = Math.floor(this.moJugT / per), k = (this.moJugT % per) / per;
      if (n > this.moJuggle && n <= 10) { this.moJuggle = n; SFX.pop(n % 8); Speech.talk(numWord(n), getLang(), true, 1); g.ui.raceMath(`${n}${getLang() === 'id' ? ` · ${NUM_EN[n]}` : ''}`); }
      const fwd = new THREE.Vector3(Math.sin(this.moYaw) * 0.4, 0, Math.cos(this.moYaw) * 0.4);
      this.ball.position.set(this.moPos.x + fwd.x, this.gy + 0.45 + Math.sin(k * Math.PI) * 1.3, this.moPos.z + fwd.z);
      this.ball.rotation.x += dt * 6;
    }
    // ---- you take a penalty: aim, power, run-up, kick
    if (this.phase === 'aim') {
      const ax = g.input.axis();
      if (Math.abs(ax.fx) > 0.25 || Math.abs(ax.fz) > 0.25) this.aim.manual = true;
      if (this.aim.manual) { this.aim.x = Math.max(-1, Math.min(1, this.aim.x + ax.fx * dt * 1.6)); this.aim.y = Math.max(0, Math.min(1, this.aim.y - ax.fz * dt * 1.4)); }
      else { const a = this.pt * 1.15; this.aim.x = Math.sin(a) * 0.92; this.aim.y = 0.42 + Math.sin(a * 2) * 0.42; } // a figure of eight through the corners
      this.aimRing.visible = true; this.aimRing.position.copy(this.aimPoint(this.aim.x, this.aim.y, this.gz + 0.35));
      this.aimRing.scale.setScalar(1 + Math.sin(this.t * 8) * 0.08);
      this.keeperX = Math.sin(this.t * 1.6) * 0.12;
    } else if (this.phase !== 'script') this.aimRing.visible = false;
    if (this.phase === 'power') g.ui.meter({ pos: powerSweep(this.pt), zone: [0.38, 0.62], label: tr('Tenaga — ketuk di hijau!', 'Power — tap in the green!') });
    if (this.phase === 'runup') {
      // three quick steps up to the ball, then the kick
      const k = Math.min(1, this.pt / 0.75);
      const from = new THREE.Vector3(this.spot.x - 0.5, this.gy, this.spot.z + 2.6), to = new THREE.Vector3(this.spot.x - 0.35, this.gy, this.spot.z + 0.45);
      this.mePos.lerpVectors(from, to, k); this.meSpeed = 4.5;
      if (k >= 1) { this.meSpeed = 0; this.kickNow(); }
    }
    // ---- you in goal: Baby Mo walks back, runs up (his body leans to where he'll shoot), kicks
    if (this.phase === 'moSetup') {
      const back = new THREE.Vector3(this.spot.x + 0.6, this.gy, this.spot.z + 3);
      if (!this.walk && this.moPos.distanceTo(back) > 0.3 && this.pt < 0.2) this.walkMo(back.x, back.z, 1.3, false);
      if (this.pt > 1.9) { this.moYaw = Math.PI; this.phase = 'moRun'; this.pt = 0; this.walk = null; }
    }
    if (this.phase === 'moRun') {
      const k = Math.min(1, this.pt / 1.0), from = new THREE.Vector3(this.spot.x + 0.6, this.gy, this.spot.z + 3), to = new THREE.Vector3(this.spot.x + 0.3, this.gy, this.spot.z + 0.45);
      this.moPos.lerpVectors(from, to, k); this.moYaw = Math.PI;
      this.lean = Math.sign(this.moShot.x) * Math.min(1, k * 1.4) * (Math.abs(this.moShot.x) > 0.2 ? 1 : 0);
      // the hint: in the first shots, an arrow over his head shows the lean (as you see it)
      const learn = (g.stats.stadiumSaves || 0) < 3 && this.mode !== 'shootout';
      this.hint.visible = learn && Math.abs(this.lean) > 0.3;
      if (this.hint.visible) { this.hint.position.set(this.moPos.x, this.gy + 2.6 + Math.sin(this.t * 6) * 0.08, this.moPos.z); this.hint.lookAt(this.camPos); this.hint.rotateZ(this.lean > 0 ? 0 : Math.PI); } // (it points the way the ball will go, as you see it)
      if (k >= 1) { this.hint.visible = false; this.moKick = 0.001; this.moKickNow(); }
    }
    // the keeper's dive (you): the buttons, or the joystick / A D keys (as you face out, left is +x)
    if ((this.phase === 'moSetup' || this.phase === 'moRun') && this.myDiveT === 0) { const fx = g.input.axis().fx; if (fx < -0.5) this.dive(1); else if (fx > 0.5) this.dive(-1); }
    if (this.myDiveT > 0) this.myDiveT = Math.min(1, this.myDiveT + sdt / 0.5);
    // ---- the ball in the air (with a little curl), slow motion as it reaches the goal
    if (this.flight) {
      const f = this.flight; f.k = Math.min(1, f.k + sdt / f.dur);
      const k = f.k, p = new THREE.Vector3().lerpVectors(f.from, f.to, k);
      p.x += Math.sin(k * Math.PI) * f.curve; p.y += Math.sin(k * Math.PI) * 0.35;
      this.ball.position.copy(p); this.ball.rotation.x -= sdt * 16; this.ball.rotation.y += sdt * f.curve * 8;
      // Baby Mo in goal dives a beat after the kick
      if (f.byMe || this.mode === 'school') { this.keeperDive = Math.min(1, this.keeperDive + sdt / 0.42); this.keeperX += (this.keeperTo - this.keeperX) * Math.min(1, sdt * 6); }
      if (this.mode !== 'school') this.slow = k > 0.45 && k < 0.98 ? 0.4 : 1;
      if (k >= 1) this.land(f.res, f.byMe);
    }
    // a loose ball: bounces and rolls to a stop
    if (this.loose) {
      const v = this.loose.v, b = this.ball.position;
      v.y -= 9.8 * dt; b.addScaledVector(v, dt);
      if (b.z < this.gz - 1.25) { b.z = this.gz - 1.25; v.z = Math.abs(v.z) * 0.2; }
      if (b.y < this.gy + 0.26) { b.y = this.gy + 0.26; v.y = Math.abs(v.y) * 0.45; v.x *= 0.8; v.z *= 0.8; if (Math.abs(v.y) < 0.4) v.y = 0; }
      this.ball.rotation.x += dt * v.z * 3;
    }
    if (this.phase === 'after' && this.pt > 2.0) this.next();
    // ---- your keepy-uppies
    if (this.phase === 'juggle') {
      const jb = this.juggleBall;
      jb.v -= 9.8 * 0.55 * dt; jb.y += jb.v * dt;
      const fwd = 0.45;
      this.ball.position.set(this.mePos.x, this.gy + 0.26 + Math.max(0, jb.y), this.mePos.z - fwd);
      this.ball.rotation.x += dt * 5;
      // the ring: shrinks as the ball comes down to the foot; tap when it's small
      this.aimRing.visible = jb.v < 0 && jb.y < 1.6;
      if (this.aimRing.visible) { const s = 0.6 + Math.max(0, jb.y) * 1.2; this.aimRing.scale.setScalar(s); this.aimRing.position.copy(this.ball.position); this.aimRing.lookAt(this.camPos); (this.aimRing.material as THREE.MeshBasicMaterial).color.set(jb.y < 0.95 ? 0x3ccf7e : 0xffd23f); }
      if (jb.y <= 0) { this.aimRing.visible = false; this.phase = 'drop'; this.pt = 0; SFX.pop(1); this.loose = { v: new THREE.Vector3(0.8, 1.2, -1.2) }; g.ui.raceMath(tr(`Jatuh! ${this.juggles} kali`, `Dropped! ${this.juggles} touches`)); }
    }
    if (this.phase === 'drop' && this.pt > 1.4) this.juggleEnd();
    // ---- the net billows where the ball hit it, then wobbles back
    this.netTick(dt);
    // ---- the crowd: bobbing, and jumping with arms up when they cheer
    this.cheerT = Math.max(0, this.cheerT - dt);
    for (const c of this.crowd) {
      const w = Math.sin(t * (this.cheerT > 0 ? 9 : 2) + c.ph), up = this.cheerT > 0;
      c.rig.armL?.rotation.set(up ? -2.8 + w * 0.3 : -0.15 + w * 0.08, 0, 0); c.rig.armR?.rotation.set(up ? -2.8 - w * 0.3 : -0.15 - w * 0.08, 0, 0);
      c.rig.root.position.y = c.y + (up ? Math.max(0, w) * 0.25 : 0);
    }
    this.kickAnim = Math.max(0, this.kickAnim - dt);
    if (this.moKick > 0) this.moKick = Math.min(1, this.moKick + sdt / 0.5);
    // ---- you and Baby Mo stay where the game puts you
    const p = g.player;
    const dx = this.myDiveT > 0 ? this.myDive * smooth(Math.min(1, this.myDiveT * 1.3)) * 1.25 : 0; // (facing out, your left is +x)
    p.pos.set(this.mePos.x + dx, this.mePos.y + (this.myDiveT > 0 && this.myDive ? Math.sin(Math.min(1, this.myDiveT) * Math.PI) * 0.45 : 0), this.mePos.z);
    p.vel.set(0, 0, 0); p.visY = p.pos.y; p.onGround = true; p.speed = this.meSpeed; p.yaw = this.meYaw;
    if (this.moPoseKind === 'keeper' && (this.mode !== 'keep' || this.phase === 'idle')) {
      this.moPos.x = this.gx + this.keeperX * (GOAL2.half - 0.4);
      this.moPos.y = this.gy + Math.sin(Math.min(1, this.keeperDive) * Math.PI) * 0.5 * Math.min(1, Math.abs(this.keeperTo));
    } else if (this.moPoseKind !== 'keeper') this.moPos.y = this.gy;
    const st = g.ents.mo.stand; if (st) { st.pos.copy(this.moPos); st.yaw = this.moYaw; }
    const score = this.hudText();
    g.ui.actHud(score, () => this.quit());
    if (this.phase === 'script') g.ui.actHud(score + ` · <small>${tr('ketuk untuk lanjut', 'tap to skip ahead')}</small>`, () => this.quit());
    if (this.phase === 'script' && !this.waitTap) this.waitTap = true;
    return true;
  }
  private hudText() {
    const g = (a: number[]) => a.reduce((s, v) => s + v, 0);
    switch (this.mode) {
      case 'shoot': return `⚽ ${tr('Tendangan', 'Kick')} ${Math.min(5, this.myKicks.length + 1)}/5 · ${tr('gol', 'goals')} ${g(this.myKicks)}`;
      case 'keep': return `🧤 ${tr('Tendangan', 'Kick')} ${Math.min(5, this.moKicks.length + 1)}/5 · ${tr('tangkapan', 'saves')} ${this.saves}`;
      case 'shootout': return `🏆 ${tr('Kamu', 'You')} ${g(this.myKicks)} – ${g(this.moKicks)} Baby Mo`;
      case 'juggle': return `⚽ ${tr('Juggling', 'Keepy-uppy')}: ${this.juggles} · ${tr('rekor', 'best')} ${Math.max(this.best, this.g.stats.keepyBest || 0)}`;
      case 'skills': return `✨ ${tr('Skill Baby Mo', 'Baby Mo’s skills')}`;
      default: return `🎓 ${tr('Sekolah penalti', 'Penalty school')}${this.stepNo ? ` · ${this.stepNo}/7` : ''}`;
    }
  }
  private netTick(dt: number) {
    const geo = this.net.geometry as THREE.PlaneGeometry, pos = geo.attributes.position.array as Float32Array, base = this.netBase;
    const h = this.netHit;
    if (h) h.t += dt;
    for (let i = 0; i < pos.length; i += 3) {
      let dz = 0;
      if (h && h.t < 2.5) {
        const d2 = (base[i] - h.x) ** 2 + (base[i + 1] - h.y) ** 2;
        dz = -Math.exp(-d2 / 0.9) * 0.9 * Math.exp(-h.t * 2.2) * Math.cos(h.t * 11);
      }
      pos[i + 2] = base[i + 2] + dz;
    }
    geo.attributes.position.needsUpdate = true;
    if (h && h.t >= 2.5) this.netHit = null;
  }
  private cheer(sec: number) { this.cheerT = Math.max(this.cheerT, sec); if (sec >= 1) SFX.boom(); }
  /** the fans are made once and stay in their seats; between games they're just hidden (no new ones each game) */
  private seatCrowd() {
    if (this.crowd.length) { for (const c of this.crowd) c.rig.root.visible = true; return; }
    const C = this.centre, g = this.g;
    let n = 0;
    for (const side of [-1, 1]) for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) {
      if ((i + row) % 2 === 1 && row > 0) continue;
      const rig = buildBlocky(CROWD[n++ % CROWD.length]);
      const z = C.z + (i < 3 ? -14 + i * 4 : 4 + (i - 3) * 4) + (row % 2) * 1.5;
      const x = C.x + side * (14 + row), y = C.y + 1 + row;
      rig.root.position.set(x, y, z); rig.root.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      g.scene.add(rig.root); this.crowd.push({ rig, ph: Math.random() * 6, y });
    }
  }
  private clearCrowd() { for (const c of this.crowd) c.rig.root.visible = false; }
  private scoreBoard() {
    const a = this.myKicks.reduce((s, v) => s + v, 0), b = this.moKicks.reduce((s, v) => s + v, 0);
    if (this.mode === 'keep') this.drawBoard(tr('TANGKAP', 'SAVES'), String(this.saves), `/${this.moKicks.length}`);
    else if (this.mode === 'shootout') this.drawBoard(tr('KAMU', 'YOU'), `${a} – ${b}`, 'BABY MO', this.myKicks, this.moKicks);
    else this.drawBoard(tr('GOL', 'GOALS'), String(a), `/${this.myKicks.length}`);
  }
  /** the scoreboard: two names, the score, and a row of ● ○ for each kick in a shootout */
  private drawBoard(left: string, mid: string, right: string, ka?: number[], kb?: number[]) {
    const x = this.boardCtx; if (!x || !this.boardTex) return;
    x.fillStyle = '#0d1b2a'; x.fillRect(0, 0, 512, 192);
    x.strokeStyle = '#ffd23f'; x.lineWidth = 6; x.strokeRect(6, 6, 500, 180);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '900 34px Nunito, sans-serif'; x.fillText(left, 110, 70); x.fillText(right, 402, 70);
    x.fillStyle = '#ffd23f'; x.font = '900 64px Nunito, sans-serif'; x.fillText(mid, 256, 72);
    const dots = (list: number[] | undefined, cx: number) => { if (!list) return; list.slice(-7).forEach((v, i) => { x.fillStyle = v ? '#3ccf7e' : '#e4423a'; x.beginPath(); x.arc(cx - 60 + i * 20, 140, 8, 0, Math.PI * 2); x.fill(); }); };
    dots(ka, 110); dots(kb, 402);
    if (!ka) { x.fillStyle = '#9fb4c8'; x.font = '700 24px Nunito, sans-serif'; x.fillText('BabyMo FC · ' + tr('Stadion Mini', 'Mini Stadium'), 256, 150); }
    this.boardTex.needsUpdate = true;
  }

  // ---------------------------------------------------------------- the camera: a few set shots, eased
  private want(kind: string) {
    const S = this.spot, G = new THREE.Vector3(this.gx, this.gy, this.gz), C = this.centre, w = this.camWant;
    switch (kind) {
      case 'shoot': w.pos.set(S.x + 0.6, S.y + 2.5, S.z + 6.2); w.look.set(G.x, G.y + 1.3, G.z); break;
      case 'keep': w.pos.set(G.x + 0.4, G.y + 2.6, G.z); w.look.set(S.x, S.y + 0.6, S.z + 1.2); break; // (just under the crossbar, behind you: the keeper's view)
      case 'school-spot': w.pos.set(S.x + 4.5, S.y + 2.2, S.z + 4.5); w.look.set(S.x, S.y + 0.6, S.z + 1.5); break;
      case 'school-behind': w.pos.set(S.x - 0.4, S.y + 1.8, S.z + 5); w.look.set(G.x, G.y + 1.2, G.z); break;
      case 'school-side': w.pos.set(S.x + 6.2, S.y + 1.7, S.z + 1.6); w.look.set(S.x - 0.5, S.y + 0.7, S.z + 1.2); break;
      case 'school-keeper': w.pos.set(G.x + 3.2, G.y + 1.8, G.z + 6.5); w.look.set(G.x, G.y + 1.1, G.z + 0.5); break;
      case 'skills': w.pos.set(C.x - 1, C.y + 3.2, C.z + 13.5); w.look.set(C.x - 1, C.y + 0.8, C.z + 6); break;
      case 'juggle': w.pos.set(C.x + 1.2, C.y + 1.7, C.z - 0.9); w.look.set(C.x, C.y + 1.0, C.z + 2.7); break; // (from in front of you)
    }
  }
  camera(cam: THREE.PerspectiveCamera) {
    const w = this.camWant, dt = this.dt || 1 / 60;
    if (this.mode === 'skills' && (this.dribble || this.moPoseKind === 'stepover' || this.moPoseKind === 'juggle')) {
      // follow Baby Mo along the cones, from the side
      w.look.set(this.moPos.x, this.gy + 0.8, this.moPos.z); w.pos.set(this.moPos.x + 0.6, this.gy + 2.1, this.moPos.z + 5.2);
    }
    if (this.flight && this.slow < 1 && this.mode !== 'keep') {
      // slow motion: the camera leans in to follow the ball into the goal
      const b = this.ball.position; w.look.lerp(b, 0.15);
    }
    if (!this.camSet) { this.camPos.copy(w.pos); this.camLook.copy(w.look); this.camSet = true; }
    const k = 1 - Math.exp(-dt * 3.5);
    this.camPos.lerp(w.pos, k); this.camLook.lerp(w.look, k);
    cam.position.copy(this.camPos);
    if (this.shake > 0) { this.shake = Math.max(0, this.shake - dt); const s = this.shake * 0.25; cam.position.x += (Math.random() - 0.5) * s; cam.position.y += (Math.random() - 0.5) * s; }
    cam.lookAt(this.camLook);
    const fov = this.slow < 1 ? 48 : 58;
    if (Math.abs(cam.fov - fov) > 0.2) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 5); cam.updateProjectionMatrix(); }
    return true;
  }

  // ---------------------------------------------------------------- poses
  /** you: ready to kick, the kick itself, the keeper's crouch and dive, keepy-uppies, watching */
  pose(r: Rig) {
    const [left, right] = r.legs;
    if (this.mePoseKind === 'keeper') {
      const d = this.myDiveT > 0 ? smooth(Math.min(1, this.myDiveT * 1.4)) : 0;
      r.body.rotation.z = -this.myDive * d * 1.1; // (towards the side you dive: +x is your left as you face out)
      r.body.rotation.x = d ? 0 : 0.18;
      r.armL?.rotation.set(-2.9 * (0.35 + d * 0.65), 0, -0.25 - d * 0.3); r.armR?.rotation.set(-2.9 * (0.35 + d * 0.65), 0, 0.25 + d * 0.3);
      if (d === 0) { left?.rotation.set(-0.25, 0, -0.12); right?.rotation.set(-0.25, 0, 0.12); }
      return;
    }
    r.body.rotation.z = 0; r.body.rotation.x = 0;
    if (this.mePoseKind === 'juggle' || this.kickAnim > 0) {
      const k = this.kickAnim > 0 ? 1 - this.kickAnim / (this.mePoseKind === 'juggle' ? 0.35 : 0.5) : 0;
      const leg = this.mePoseKind === 'juggle' ? -Math.sin(k * Math.PI) * 1.0 : (k < 0.3 ? (k / 0.3) * 0.9 : 0.9 - ((k - 0.3) / 0.7) * 2.4);
      right?.rotation.set(this.kickAnim > 0 ? leg : 0, 0, 0);
      r.armL?.rotation.set(-0.3, 0, -0.8); r.armR?.rotation.set(-0.3, 0, 0.8);
      return;
    }
    if (this.mePoseKind === 'watch') { r.armL?.rotation.set(0, 0, -0.15); r.armR?.rotation.set(0, 0, 0.15); }
  }
  /** Baby Mo: the keeper's crouch and dive, the kick, the step-over, keepy-uppies, cheering */
  moPose(r: Rig, t: number) {
    const [left, right] = r.legs, kind = this.moPoseKind;
    r.body.rotation.z = 0;
    if (kind === 'keeper') {
      const d = this.keeperDive > 0 ? smooth(Math.min(1, this.keeperDive)) * Math.min(1, Math.abs(this.keeperTo) * 1.3) : 0;
      r.body.rotation.z = -Math.sign(this.keeperTo || 1) * d * 1.15;
      r.body.rotation.x = d > 0 ? 0 : 0.18;
      r.armL?.rotation.set(-2.9 * (0.4 + d * 0.6), 0, -0.3); r.armR?.rotation.set(-2.9 * (0.4 + d * 0.6), 0, 0.3);
      if (!d) { left?.rotation.set(-0.25, 0, -0.12); right?.rotation.set(-0.25, 0, 0.12); }
      return;
    }
    r.body.rotation.x = 0;
    if (this.moKick > 0 && this.moKick < 1) {
      const k = this.moKick, leg = k < 0.3 ? (k / 0.3) * 0.95 : 0.95 - ((k - 0.3) / 0.7) * 2.5;
      right?.rotation.set(leg, 0, 0); left?.rotation.set(0, 0, 0);
      r.armL?.rotation.set(-0.4, 0, -0.9); r.armR?.rotation.set(-0.4, 0, 0.9);
      return;
    }
    if (this.phase === 'moRun' && this.lean) { r.body.rotation.z = this.lean * 0.22; } // (the tell: his body leans the way he'll kick)
    if (kind === 'stepover') {
      // the right foot circles over the ball, then the left
      const k = (this.stepT * 1.6) % 2, foot = k < 1 ? right : left, s = k < 1 ? 1 : -1, u = k % 1;
      foot?.rotation.set(-Math.sin(u * Math.PI) * 0.9, 0, s * Math.sin(u * Math.PI * 2) * 0.45);
      r.body.rotation.z = s * Math.sin(u * Math.PI) * 0.18;
      r.armL?.rotation.set(-0.3, 0, -0.7); r.armR?.rotation.set(-0.3, 0, 0.7);
    } else if (kind === 'juggle') {
      const per = 0.72, k = (this.moJugT % per) / per, foot = Math.floor(this.moJugT / per) % 2 ? left : right;
      foot?.rotation.set(-Math.max(0, Math.cos(k * Math.PI * 2)) * 0.9, 0, 0);
      r.armL?.rotation.set(-0.3, 0, -0.8); r.armR?.rotation.set(-0.3, 0, 0.8);
    } else if (kind === 'cheer') {
      const w = Math.sin(t * 9);
      r.armL?.rotation.set(-2.8 + w * 0.3, 0, -0.3); r.armR?.rotation.set(-2.8 - w * 0.3, 0, 0.3);
    } else if (kind === 'carry' || kind === 'dribble') {
      r.armL?.rotation.set(-0.2, 0, -0.35); r.armR?.rotation.set(-0.2, 0, 0.35);
    }
  }

  private end() {
    const g = this.g;
    this.active = false; this.phase = 'idle'; this.flight = null; this.loose = null; this.walk = null; this.dribble = null; this.script = []; this.waitTap = false;
    this.ball.visible = false; this.aimRing.visible = false; this.hint.visible = false; this.slow = 1;
    this.clearCones(); this.clearCrowd(); this.practice = false; this.myDiveT = 0; this.myDive = 0; this.kickAnim = 0; this.moKick = 0; this.keeperDive = 0;
    for (const r of [g.avatar, g.ents.mo.rig]) if (r) r.body.rotation.set(0, 0, 0); // (no dive or lean left over)
    g.ents.mo.stand = null; g.ui.actHud(null); g.ui.actChoices(null); g.ui.meter(null); g.ui.raceCount(null);
    g.player.pos.set(this.centre.x + 3, this.centre.y, this.centre.z + 2); g.player.vel.set(0, 0, 0); g.player.speed = 0;
    this.drawBoard('BabyMo FC', '⚽', '');
  }
}

/** the power bar's marker: 0 → 1 → 0… (a little quicker than the aim) */
export const powerSweep = (t: number) => { const k = (t * 1.05) % 2; return k < 1 ? k : 2 - k; };
