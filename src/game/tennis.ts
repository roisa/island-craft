// Tennis with Baby Mo on a real-size court. Tap 🎾 and choose:
//  - Drill: Baby Mo feeds 10 balls, forehand and backhand in turn. Tap ✋ (or
//    the screen) as the ball reaches you to hit it back.
//  - Serve practice: 6 serves, from the right (deuce) and left (ad) side in
//    turn. Tap once to toss the ball up, and again at the top to hit it into
//    the service box across the net (it glows yellow).
//  - A game: you serve one game with real tennis scoring (love, 15, 30, 40,
//    deuce, advantage, game). Two tries at each serve; then rally.
// You slide to the ball by yourself, so only the timing matters. Forehand or
// backhand depends on which side the ball comes to; you and Baby Mo swing
// with natural forehand, two-handed backhand and serve motions (tennispose.ts).
import * as THREE from 'three';
import type { Game } from '../main';
import { tr } from '../i18n';
import type { Landmark } from '../world/landmarks';
import { SFX, Speech } from './audio';
import { COURT } from './court';
import { applyStroke, racketHand, type Stroke } from './tennispose';

/** when a tap hits the ball: from this long before it reaches you until a little after */
export const HIT = { before: 0.55, after: 0.12 };
/** the serve toss: seconds to the top, and when a tap hits a good serve */
export const TOSS = { peak: 0.62, fall: 1.35, good: [0.42, 0.88] as [number, number] };
export const DRILL_BALLS = 10, SERVES = 6;

/** where the ball is, u = 0 … 1 of the way from the hitter to the other player: over the net, one bounce, up to the racket */
export function ballAt(u: number, a: THREE.Vector3, b: THREE.Vector3, floor: number, out = new THREE.Vector3()) {
  const B = 0.68; // the bounce, two-thirds of the way
  const bx = a.x + (b.x - a.x) * B, bz = a.z + (b.z - a.z) * B;
  if (u < B) {
    const k = u / B;
    out.set(a.x + (bx - a.x) * k, 0, a.z + (bz - a.z) * k);
    out.y = a.y + (floor - a.y) * k + Math.sin(k * Math.PI) * 2.4;
  } else {
    const k = (u - B) / (1 - B);
    out.set(bx + (b.x - bx) * k, 0, bz + (b.z - bz) * k);
    out.y = floor + (b.y - floor) * k + Math.sin(k * Math.PI) * 0.9;
  }
  return out;
}
/** the end point that makes the ball bounce at `bounce` (ballAt bounces two-thirds of the way) */
export function aimFor(from: THREE.Vector3, bounce: { x: number; z: number }, y: number) {
  return new THREE.Vector3(from.x + (bounce.x - from.x) / 0.68, y, from.z + (bounce.z - from.z) / 0.68);
}
/** can a tap now hit the ball? (seconds left until it reaches you; negative once it has passed) */
export const canHit = (left: number) => left <= HIT.before && left >= -HIT.after;
/** does Baby Mo get it back? (a little less often as the rally gets longer) */
export const moReturns = (rally: number, roll: number) => roll < (rally < 3 ? 0.9 : rally < 7 ? 0.78 : 0.62);
/** a serve, by when you tapped after the toss: in, into the net (too early) or long (too late) */
export const serveResult = (t: number): 'in' | 'net' | 'long' => (t < TOSS.good[0] ? 'net' : t > TOSS.good[1] ? 'long' : 'in');

const CALLS = ['love', 'fifteen', 'thirty', 'forty'];
const SHOW = ['0', '15', '30', '40'];
/** the score of a tennis game (you serve): what to show, what the umpire says, and who has won */
export function gameScore(me: number, mo: number): { show: [string, string]; call: string; won: 'me' | 'mo' | null } {
  if (me >= 4 && me - mo >= 2) return { show: ['Game! Kamu menang', 'Game! You win'], call: 'Game!', won: 'me' };
  if (mo >= 4 && mo - me >= 2) return { show: ['Game! Baby Mo menang', 'Game! Baby Mo wins'], call: 'Game, Baby Mo!', won: 'mo' };
  if (me >= 3 && mo >= 3) {
    if (me === mo) return { show: ['Deuce (40–40)', 'Deuce (40–40)'], call: 'Deuce!', won: null };
    return me > mo ? { show: ['Advantage kamu', 'Advantage you'], call: 'Advantage, you!', won: null } : { show: ['Advantage Baby Mo', 'Advantage Baby Mo'], call: 'Advantage, Baby Mo!', won: null };
  }
  const call = me === mo ? (me === 0 ? 'Love all!' : `${CALLS[me]} all!`) : `${CALLS[me]}, ${CALLS[mo]}!`;
  return { show: [`${SHOW[me]} – ${SHOW[mo]}`, `${SHOW[me]} – ${SHOW[mo]}`], call: call[0].toUpperCase() + call.slice(1), won: null };
}

type Mode = 'drill' | 'serve' | 'match';
type State = 'feed' | 'serveReady' | 'toss' | 'toMo' | 'toMe' | 'pause' | 'done';

export class Tennis {
  active = false;
  mode: Mode = 'drill';
  state: State = 'feed';
  /** the game score (points), the rally, and the drill / serve counts */
  me = 0; mo = 0; rally = 0;
  done = 0; good = 0; private serveTry = 0;
  t = 0; T = 1.5; private from = new THREE.Vector3(); private to = new THREE.Vector3();
  /** which way the ball coming to you is to be hit */
  side: 'fh' | 'bh' = 'fh';
  private ball: THREE.Mesh; private shadow: THREE.Mesh; private target: THREE.Mesh; private arrow: THREE.Mesh; private rackets: THREE.Object3D[] = [];
  private myX = 0; private moX = 0; private wait = 0; private after: (() => void) | null = null; private pauseT = 0;
  // the strokes being played: yours, and Baby Mo's
  private my: { kind: Stroke; t: number } | null = null; private moS: { kind: Stroke; t: number } | null = null;
  private moSwung = false; private moStroke: 'fh' | 'bh' = 'fh'; private serveIn = false; private fault: string | null = null;
  readonly c: THREE.Vector3;
  constructor(private g: Game, l: Landmark) {
    this.c = new THREE.Vector3(...l.at!.centre);
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshLambertMaterial({ color: 0xd9f23a, emissive: 0x6b7a10, emissiveIntensity: 0.35 }));
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.22, 14), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.target = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xfff23a, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
    this.target.rotation.x = -Math.PI / 2;
    // a yellow arrow bobbing over the target, easy to see over the net
    this.arrow = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 12), new THREE.MeshLambertMaterial({ color: 0xffd23f, emissive: 0x8a6a00, emissiveIntensity: 0.6 }));
    this.arrow.rotation.x = Math.PI;
    for (const m of [this.ball, this.shadow, this.target, this.arrow]) { m.visible = false; g.scene.add(m); }
  }
  /** where you stand (behind your baseline) and Baby Mo (behind his) */
  get meZ() { return this.c.z + COURT.half + 1.3; }
  get moZ() { return this.c.z - COURT.half - 1.3; }
  near(p: THREE.Vector3) { return Math.abs(p.x - this.c.x) < COURT.doubles + 6 && Math.abs(p.z - this.c.z) < COURT.half + 8 && Math.abs(p.y - this.c.y) < 5; }

  /** the 🎾 button: choose what to play */
  menu() {
    const g = this.g;
    if (this.active) return;
    g.ui.dialog({
      face: '🎾', who: tr('Main tenis', 'Play tennis'),
      text: tr('Mau main apa dengan Baby Mo?', 'What would you like to play with Baby Mo?'),
      buttons: [
        { label: '🎾 ' + tr('Latihan forehand & backhand', 'Forehand & backhand drill'), cls: 'gold', fn: () => this.start('drill') },
        { label: '🎯 ' + tr('Latihan servis', 'Serve practice'), fn: () => this.start('serve') },
        { label: '🏆 ' + tr('Main satu game', 'Play a game'), fn: () => this.start('match') },
        { label: tr('Nanti saja', 'Not now'), cls: 'ghost' },
      ],
    });
  }

  start(mode: Mode = 'match') {
    const g = this.g;
    if (this.active) return;
    if (g.fun.riding) g.fun.dismount();
    this.active = true; this.mode = mode; this.me = 0; this.mo = 0; this.rally = 0; this.done = 0; this.good = 0; this.serveTry = 0;
    this.myX = this.c.x; this.moX = this.c.x; this.my = null; this.moS = null;
    // a racket each, in the right hand
    this.rackets = [racket(0xe4423a), racket(0x8dc63f)];
    const myRig = g.avatar, moRig = g.ents.mo.rig;
    (myRig ? racketHand(myRig) : null)?.add(this.rackets[0]);
    racketHand(moRig)?.add(this.rackets[1]);
    g.ents.mo.stand = { pos: new THREE.Vector3(this.c.x, this.c.y, this.moZ), yaw: 0 };
    g.stats.tennis = (g.stats.tennis || 0) + 1;
    if (mode === 'drill') {
      g.ui.say(tr('Latihan! Baby Mo melempar 10 bola: forehand, lalu backhand. Ketuk ✋ saat bola sampai di dekatmu. Kamu bergeser sendiri ke bola!', 'Drill time! Baby Mo sends you 10 balls: a forehand, then a backhand. Tap ✋ when the ball reaches you. You move to the ball by yourself!'), 'alright', 7000);
      this.feed(1.6);
    } else {
      g.ui.say(mode === 'serve'
        ? tr('Latihan servis! Ketuk ✋ untuk melempar bola ke atas, lalu ketuk lagi saat bola di puncak. Arahkan ke kotak kuning!', 'Serve practice! Tap ✋ to toss the ball up, then tap again when it’s at the top. Aim for the yellow box!')
        : tr('Ayo main satu game! Kamu yang servis. Ketuk ✋ untuk melempar bola, ketuk lagi di puncak. Lalu pukul balik bolanya!', 'Let’s play a game! You serve. Tap ✋ to toss, tap again at the top. Then hit the ball back!'), 'alright', 7000);
      this.serveReady();
    }
    this.hud();
  }
  quit() { if (this.active) this.end(); }

  // ---------- the parts of a point ----------
  /** your serve: from the right of the centre mark on even points, the left on odd ones */
  private get deuce() { return this.mode === 'serve' ? this.done % 2 === 0 : (this.me + this.mo) % 2 === 0; }
  private serveReady() {
    this.state = 'serveReady'; this.t = 0; this.wait = 0; this.rally = 0;
    this.myX = this.c.x + (this.deuce ? 1.8 : -1.8);
    // the box to serve into: diagonally across the net
    const bx = this.c.x + (this.deuce ? -1 : 1) * COURT.singles / 2;
    this.target.position.set(bx, this.c.y + 0.06, this.c.z - COURT.service / 2);
    this.target.scale.set(COURT.singles - 1, COURT.service - 1, 1);
    this.target.visible = true;
    this.g.ents.mo.stand!.pos.x = this.c.x + (this.deuce ? -1.5 : 1.5);
  }
  private feed(delay: number) { this.state = 'feed'; this.t = -delay; this.target.visible = false; }
  /** a ball from Baby Mo to you, to your forehand or backhand */
  private hitToMe(side: 'fh' | 'bh', from: THREE.Vector3) {
    this.side = side;
    const reach = 0.9, rs = this.mySide();
    // the ball comes to one side of you; you slide so it's on your racket side (forehand) or the other (backhand)
    const bx = this.c.x + (Math.random() - 0.5) * 5;
    this.myX = THREE.MathUtils.clamp(bx - (side === 'fh' ? 1 : -1) * rs * reach, this.c.x - COURT.doubles, this.c.x + COURT.doubles);
    this.from.copy(from);
    this.to.set(bx, this.c.y + 1.0, this.meZ - 0.3);
    this.T = Math.max(1.25, 1.6 - this.rally * 0.03); this.t = 0; this.state = 'toMe';
  }
  /** your shot back over the net */
  private hitToMo(from: THREE.Vector3) {
    this.from.copy(from);
    const bx = this.c.x + (Math.random() - 0.5) * 2 * (COURT.singles - 1);
    this.to.set(bx, this.c.y + 1.0, this.moZ + 0.3);
    this.T = Math.max(1.15, 1.5 - this.rally * 0.03); this.t = 0; this.state = 'toMo'; this.moSwung = false;
    // Baby Mo goes to meet it: forehand or backhand, whichever is nearer
    const rs = this.moSide(), side: 'fh' | 'bh' = Math.random() < 0.55 ? 'fh' : 'bh';
    this.moX = bx - (side === 'fh' ? 1 : -1) * rs * 0.9;
    this.moStroke = side;
  }
  /** which way along x your racket hand is (+1 or −1) */
  private mySide() { return sideOf(this.g.avatar?.armL); }
  private moSide() { return sideOf(this.g.ents.mo.rig.armL); }
  private racketPos(mine: boolean) {
    return mine ? new THREE.Vector3(this.myX + this.mySide() * 0.6, this.c.y + 1.1, this.meZ - 0.4) : new THREE.Vector3(this.moX + this.moSide() * 0.6, this.c.y + 1.1, this.moZ + 0.4);
  }

  /** ✋ or a tap on the screen */
  swing() {
    if (!this.active) return;
    const g = this.g;
    if (this.state === 'serveReady') { this.state = 'toss'; this.t = 0; SFX.click(); return; }
    if (this.state === 'toss') {
      this.my = { kind: 'serve', t: 0 }; SFX.pop(5);
      const res = serveResult(this.t), r = this.racketPos(true); r.y = this.c.y + 2.7;
      this.target.visible = false;
      if (res === 'in') {
        // into the box, then on to Baby Mo
        const box = this.target.position, bounce = { x: box.x + (Math.random() - 0.5) * (COURT.singles - 2), z: box.z + (Math.random() - 0.5) * (COURT.service - 2.5) };
        this.from.copy(r); this.to.copy(aimFor(r, bounce, this.c.y + 1.0)); this.T = 1.1; this.t = 0; this.state = 'toMo'; this.moSwung = false;
        this.moX = this.to.x - this.moSide() * 0.9; this.moStroke = 'fh';
        g.ui.raceMath(tr('Masuk! ✓', 'In! ✓')); Speech.talk('In!', 'en', true, 0);
        this.serveIn = true;
      } else {
        const bounce = res === 'net' ? { x: this.myX + (this.target.position.x - this.myX) * 0.5, z: this.c.z + 0.6 } : { x: this.target.position.x, z: this.c.z - COURT.service - 2.5 };
        this.from.copy(r); this.to.copy(aimFor(r, bounce, this.c.y + 0.3)); this.T = 1.0; this.t = 0; this.state = 'toMo'; this.moSwung = true;
        g.ui.raceMath(res === 'net' ? tr('Kena net! (terlalu cepat)', 'Net! (too early)') : tr('Keluar! (terlalu lambat)', 'Out! (too late)'));
        Speech.talk(res === 'net' ? 'Net!' : 'Out!', 'en', true, 0);
        this.serveIn = false; this.fault = res;
      }
      return;
    }
    if (this.state === 'toMe') {
      const left = (1 - this.t / this.T) * this.T;
      this.my = { kind: this.side, t: 0 }; SFX.click();
      if (canHit(left)) {
        this.rally++; SFX.pop(5); this.good++;
        g.fx.sparkle(this.ball.position.x, this.ball.position.y, this.ball.position.z, 6, 0xd9f23a, 1.5);
        if (this.mode === 'drill') { g.ui.raceMath(this.side === 'fh' ? 'Forehand! ✓' : 'Backhand! ✓'); Speech.talk(this.side === 'fh' ? 'Forehand!' : 'Backhand!', 'en', true, 0); }
        this.hitToMo(this.ball.position.clone());
      }
    } else if (this.state !== 'pause') { this.my = { kind: this.side, t: 0 }; SFX.click(); }
  }

  /** true while it holds you in place on the court */
  step(dt: number): boolean {
    if (!this.active) return false;
    const g = this.g, mo = g.ents.mo, floor = this.c.y + 0.12;
    this.t += dt;
    if (this.my) { this.my.t += dt; if (this.my.t > 0.55) this.my = null; }
    if (this.moS) { this.moS.t += dt; if (this.moS.t > 0.55) this.moS = null; }
    let cue = false;
    if (this.state === 'pause') {
      if ((this.pauseT -= dt) <= 0) { const f = this.after; this.after = null; f?.(); }
    } else if (this.state === 'feed') {
      // Baby Mo bounces the ball and sends it over
      const r = this.racketPos(false);
      this.ball.position.set(r.x, floor + 0.2 + Math.abs(Math.sin(this.t * 4)) * 0.8, r.z + 0.3);
      if (this.t >= 0) { this.moS = { kind: 'fh', t: 0 }; SFX.pop(3); this.rally = 0; this.hitToMe(this.done % 2 === 0 ? 'fh' : 'bh', r); }
    } else if (this.state === 'serveReady') {
      const r = this.racketPos(true); this.ball.position.set(r.x - this.mySide() * 1.1, this.c.y + 1.0 + Math.abs(Math.sin(this.t * 3)) * 0.25, r.z + 0.2);
      if ((this.wait += dt) > 6) { this.wait = -20; g.ui.toast(tr('🎾 Ketuk ✋ untuk melempar bola!', '🎾 Tap ✋ to toss the ball!'), 2500); }
    } else if (this.state === 'toss') {
      // the toss: up above your head and down again
      const k = Math.min(1, this.t / TOSS.fall), r = this.racketPos(true);
      this.ball.position.set(r.x - this.mySide() * 0.4, this.c.y + 1.4 + Math.sin(k * Math.PI) * 2.0, r.z - 0.3);
      cue = this.t >= TOSS.good[0] && this.t <= TOSS.good[1];
      if (this.t > TOSS.fall) { g.ui.toast(tr('Terlambat — lempar lagi ya!', 'Too late — toss again!'), 2000); this.serveReady(); }
    } else if (this.state === 'toMo' || this.state === 'toMe') {
      const u = this.t / this.T;
      ballAt(Math.min(u, 1.25), this.from, this.to, floor, this.ball.position);
      if (this.state === 'toMe') cue = canHit((1 - u) * this.T);
      // Baby Mo starts his swing just before the ball reaches him
      if (this.state === 'toMo' && !this.moSwung && (1 - u) * this.T < 0.28) {
        this.moSwung = true;
        this.moS = { kind: this.moStroke ?? 'fh', t: 0 };
      }
      if (this.state === 'toMo' && u >= 1) this.atMo();
      else if (this.state === 'toMe' && (1 - u) * this.T < -HIT.after) this.missed();
    }
    // you slide along your baseline, and Baby Mo along his
    const p = g.player;
    this.slide(dt);
    p.pos.set(this.curX, this.c.y, this.meZ); p.vel.set(0, 0, 0); p.visY = p.pos.y; p.onGround = true; p.speed = 0; p.yaw = 0;
    if (mo.stand) mo.stand.pos.x += (this.moX - mo.stand.pos.x) * Math.min(1, dt * 3), mo.stand.pos.z = this.moZ;
    // the serve target glows, gently pulsing
    if (this.target.visible) (this.target.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(performance.now() / 180) * 0.25;
    this.arrow.visible = this.target.visible;
    if (this.arrow.visible) this.arrow.position.set(this.target.position.x, this.c.y + 2.4 + Math.abs(Math.sin(performance.now() / 260)) * 0.6, this.target.position.z);
    this.ball.visible = this.state !== 'done';
    this.shadow.visible = this.ball.visible; this.shadow.position.set(this.ball.position.x, this.c.y + 0.03, this.ball.position.z);
    g.ui.fishCue(cue);
    this.hud();
    return true;
  }
  private curX = 0;
  private slide(dt: number) { if (!this.curX) this.curX = this.myX; this.curX += (this.myX - this.curX) * Math.min(1, dt * 4); }

  /** the ball has reached Baby Mo's end */
  private atMo() {
    const g = this.g;
    if (this.mode === 'serve') { this.done++; if (this.serveIn) this.good++; return this.next(1.0); }
    if (this.mode === 'drill') { this.done++; return this.next(0.6); }
    // a match
    if (this.fault) {
      this.fault = null;
      if (this.serveTry === 0) { this.serveTry = 1; g.ui.toast(tr('Servis kedua!', 'Second serve!'), 1800); return this.pause(1.0, () => this.serveReady()); }
      this.serveTry = 0; g.ui.toast(tr('Double fault — poin untuk Baby Mo', 'Double fault — Baby Mo’s point'), 2000);
      return this.point(false);
    }
    this.serveTry = 0;
    if (moReturns(this.rally, Math.random())) { SFX.pop(3); this.hitToMe(Math.random() < 0.5 ? 'fh' : 'bh', this.ball.position.clone()); }
    else this.point(true);
  }
  /** the ball went past you */
  private missed() {
    if (this.mode === 'drill') { this.done++; return this.next(0.8); }
    this.point(false);
  }
  private pause(secs: number, then: () => void) { this.state = 'pause'; this.pauseT = secs; this.after = then; }
  /** the next ball of a drill or serve practice, or the end of it */
  private next(delay: number) {
    const total = this.mode === 'drill' ? DRILL_BALLS : SERVES;
    if (this.done >= total) { this.state = 'done'; this.target.visible = false; setTimeout(() => this.result(), 700); return; }
    if (this.mode === 'drill') this.feed(delay); else this.pause(delay, () => this.serveReady());
  }
  private point(mine: boolean) {
    const g = this.g;
    g.ui.fishCue(false);
    if (mine) { this.me++; SFX.chime(); } else { this.mo++; SFX.pop(1); g.ents.mo.celebrate = 1; }
    const best = (g.stats.tennisRally ??= 0); if (this.rally > best) g.stats.tennisRally = this.rally;
    const s = gameScore(this.me, this.mo);
    g.ui.toast(`🎾 ${tr(s.show[0], s.show[1])}`, 2200);
    Speech.talk(s.call, 'en', true, 1);
    if (s.won) { this.state = 'done'; this.ball.visible = false; setTimeout(() => this.result(), 900); return; }
    this.pause(1.4, () => this.serveReady());
  }
  private result() {
    const g = this.g;
    let text: string, coins: number, face = '🎾';
    if (this.mode === 'drill') {
      coins = 10 + this.good * 3;
      text = tr(`<b>${this.good} dari ${DRILL_BALLS}</b> bola kamu pukul balik! Forehand dan backhand-mu makin bagus 💪`, `You hit back <b>${this.good} of ${DRILL_BALLS}</b> balls! Your forehand and backhand are getting better 💪`);
    } else if (this.mode === 'serve') {
      coins = 10 + this.good * 5; face = '🎯';
      text = tr(`<b>${this.good} dari ${SERVES}</b> servis masuk! Ingat: lempar, tunggu bola di puncak, lalu pukul.`, `<b>${this.good} of ${SERVES}</b> serves went in! Remember: toss, wait for the top, then hit.`);
    } else {
      const won = this.me > this.mo; coins = won ? 50 : 20; face = won ? '🏆' : '🎾';
      if (won) g.stats.tennisWins = (g.stats.tennisWins || 0) + 1;
      text = won ? tr('<b>Game! Kamu menang!</b> Alhamdulillah! Baby Mo memberi selamat 🤝', '<b>Game! You won!</b> Alhamdulillah! Baby Mo says well done 🤝') : tr('<b>Baby Mo menang game ini.</b> Permainan yang seru! Coba lagi ya 💪', '<b>Baby Mo won this game.</b> What a fun game! Try again 💪');
      text += `<br>🎾 ${tr('Reli terpanjang', 'Longest rally')}: ${g.stats.tennisRally ?? 0}`;
    }
    g.addCoins(coins, from => g.ui.coinPop(coins, from));
    SFX.fanfare(); g.ui.confetti(30 + this.good * 3); g.ents.mo.celebrate = 2;
    const mode = this.mode;
    g.ui.dialog({
      face, who: tr('Selesai!', 'All done!'), text: text + ` · 🪙 +${coins}`,
      buttons: [{ label: '🎾 ' + tr('Lagi', 'Again'), cls: 'gold', fn: () => { this.end(); setTimeout(() => this.start(mode), 300); } }, { label: '🔁 ' + tr('Pilih lain', 'Something else'), fn: () => { this.end(); setTimeout(() => this.menu(), 300); } }, { label: tr('Selesai', 'Done'), cls: 'ghost', fn: () => this.end() }],
    });
    g.checkQuests(); g.saveSoon();
  }
  private end() {
    const g = this.g;
    this.active = false; this.state = 'done'; this.ball.visible = false; this.shadow.visible = false; this.target.visible = false; this.arrow.visible = false; this.curX = 0;
    for (const r of this.rackets) r.removeFromParent(); this.rackets = [];
    g.ents.mo.stand = null; g.ui.tennisHud(null); g.ui.fishCue(false);
    g.player.pos.set(this.c.x + COURT.doubles + 3, this.c.y, this.c.z + 4);
  }
  private hud() {
    const t = this.mode === 'drill' ? `🎾 ${tr('Latihan', 'Drill')} ${Math.min(this.done + 1, DRILL_BALLS)}/${DRILL_BALLS} · ✓ ${this.good}`
      : this.mode === 'serve' ? `🎯 ${tr('Servis', 'Serve')} ${Math.min(this.done + 1, SERVES)}/${SERVES} · ${tr('masuk', 'in')} ${this.good} · ${this.deuce ? tr('kanan', 'right') : tr('kiri', 'left')}`
        : `🏆 ${tr(gameScore(this.me, this.mo).show[0], gameScore(this.me, this.mo).show[1])} · ${tr('reli', 'rally')} ${this.rally}`;
    this.g.ui.tennisHud(t);
  }

  /** the stroke for your avatar this frame (null when not playing) */
  get pose(): { kind: Stroke; u: number } | null {
    if (!this.active) return null;
    if (this.my) return { kind: this.my.kind, u: this.my.t / 0.5 };
    if (this.state === 'toss') return { kind: 'toss', u: Math.min(1, this.t / TOSS.peak) };
    return { kind: 'ready', u: 0 };
  }
  /** Baby Mo's stroke this frame */
  get moPose(): { kind: Stroke; u: number } | null {
    if (!this.active) return null;
    if (this.moS) return { kind: this.moS.kind, u: this.moS.t / 0.5 };
    return { kind: 'ready', u: 0 };
  }
  /** (kept for older callers) how far into a swing you are */
  get swinging() { return this.my ? 0.35 : 0; }
}

/** which way along world x an arm is from its body (+1 or −1) */
function sideOf(arm?: THREE.Object3D) {
  if (!arm?.parent) return 1;
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  arm.getWorldPosition(a); arm.parent.getWorldPosition(b);
  return a.x >= b.x ? 1 : -1;
}

/** a little racket: a handle and an oval frame with strings */
function racket(color: number) {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.32, 6), new THREE.MeshLambertMaterial({ color: 0x3b3a3d }));
  handle.position.y = -0.16; g.add(handle);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 16), new THREE.MeshLambertMaterial({ color }));
  frame.scale.set(1, 1.3, 1); frame.position.y = -0.52; g.add(frame);
  const net = new THREE.Mesh(new THREE.CircleGeometry(0.16, 14), new THREE.MeshLambertMaterial({ color: 0xf4f4f4, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  net.scale.set(1, 1.3, 1); net.position.y = -0.52; g.add(net);
  g.rotation.x = Math.PI; g.position.set(0, -0.05, 0.1);
  return g;
}
