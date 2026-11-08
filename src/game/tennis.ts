// Tennis with Baby Mo at the tennis court. You stand at the near baseline,
// Baby Mo at the far one, both with a racket. Tap to serve; the ball flies
// over the net, bounces once and comes to you — tap ✋ (or the screen) as it
// reaches you to hit it back. You slide to the ball by yourself, so only the
// timing matters. Baby Mo hits most balls back but misses now and then.
// First to 3 points wins.
import * as THREE from 'three';
import type { Game } from '../main';
import { tr } from '../i18n';
import type { Landmark } from '../world/landmarks';
import { SFX } from './audio';

export const WIN = 3;
/** when a tap hits the ball: from this long before it reaches you until a little after */
export const HIT = { before: 0.55, after: 0.12 };

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
/** can a tap now hit the ball? (seconds left until it reaches you; negative once it has passed) */
export const canHit = (left: number) => left <= HIT.before && left >= -HIT.after;
/** does Baby Mo get it back? (a little less often as the rally gets longer) */
export const moReturns = (rally: number, roll: number) => roll < (rally < 3 ? 0.92 : rally < 7 ? 0.8 : 0.65);

export class Tennis {
  active = false;
  state: 'serve' | 'toMo' | 'toMe' | 'moServe' | 'done' = 'serve';
  me = 0; mo = 0; rally = 0;
  t = 0; T = 1.5; private from = new THREE.Vector3(); private to = new THREE.Vector3();
  private ball: THREE.Mesh; private rackets: THREE.Object3D[] = [];
  private myX = 0; private swingT = 0; private wait = 0;
  readonly c: THREE.Vector3; readonly mePos: THREE.Vector3; readonly moPos: THREE.Vector3;
  constructor(private g: Game, l: Landmark) {
    const a = l.at!;
    this.c = new THREE.Vector3(...a.centre); this.mePos = new THREE.Vector3(...a.me); this.moPos = new THREE.Vector3(...a.mo);
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), new THREE.MeshLambertMaterial({ color: 0xd9f23a, emissive: 0x6b7a10, emissiveIntensity: 0.3 }));
    this.ball.visible = false; g.scene.add(this.ball);
  }
  near(p: THREE.Vector3) { return Math.abs(p.x - this.c.x) < 11 && Math.abs(p.z - this.c.z) < 14 && Math.abs(p.y - this.c.y) < 5; }

  start() {
    const g = this.g;
    if (this.active) return;
    if (g.fun.riding) g.fun.dismount();
    this.active = true; this.me = 0; this.mo = 0; this.rally = 0; this.myX = this.mePos.x;
    // a racket each
    this.rackets = [racket(0xe4423a), racket(0x8dc63f)];
    (g.avatar?.hand ?? g.avatar?.armR)?.add(this.rackets[0]);
    (g.ents.mo.rig.hand ?? g.ents.mo.rig.armR)?.add(this.rackets[1]);
    g.ents.mo.stand = { pos: this.moPos.clone(), yaw: 0 };
    this.serveMe();
    g.ui.say(tr('Ayo main tenis! Ketuk ✋ untuk servis. Saat bola datang, ketuk lagi untuk memukulnya. Kamu bergeser sendiri ke bola!', 'Let’s play tennis! Tap ✋ to serve. When the ball comes to you, tap again to hit it. You move to the ball by yourself!'), 'alright', 7000);
    g.stats.tennis = (g.stats.tennis || 0) + 1;
  }
  quit() { if (this.active) this.end(); }

  private serveMe() { this.state = 'serve'; this.t = 0; this.wait = 0; this.rally = 0; this.myX = this.mePos.x; }

  /** ✋ or a tap on the screen */
  swing() {
    if (!this.active) return;
    this.swingT = 0.35; SFX.click();
    if (this.state === 'serve') { this.hitToMo(); return; }
    if (this.state === 'toMe') {
      const left = (1 - this.t / this.T) * this.T;
      if (canHit(left)) { this.rally++; SFX.pop(5); this.hitToMo(); this.g.fx.sparkle(this.ball.position.x, this.ball.position.y, this.ball.position.z, 6, 0xd9f23a, 1.5); }
    }
  }
  private hitToMo() {
    const me = this.racketPos(true);
    this.from.copy(me);
    this.to.set(this.moPos.x + (Math.random() - 0.5) * 4, this.c.y + 1.1, this.moPos.z);
    this.T = Math.max(1.0, 1.35 - this.rally * 0.03); this.t = 0; this.state = 'toMo';
  }
  private hitToMe() {
    this.from.copy(this.to);
    this.to.set(this.mePos.x + (Math.random() - 0.5) * 5, this.c.y + 1.1, this.mePos.z);
    this.T = Math.max(1.1, 1.45 - this.rally * 0.03); this.t = 0; this.state = 'toMe';
  }
  private racketPos(mine: boolean) { return mine ? new THREE.Vector3(this.myX + 0.4, this.c.y + 1.1, this.mePos.z - 0.3) : new THREE.Vector3(this.moPos.x, this.c.y + 1.0, this.moPos.z + 0.3); }

  /** true while it holds you in place on the court */
  step(dt: number): boolean {
    if (!this.active) return false;
    const g = this.g, mo = g.ents.mo;
    this.t += dt; this.swingT = Math.max(0, this.swingT - dt);
    if (this.state === 'serve') {
      // the ball bobs above your hand, waiting for the serve
      const r = this.racketPos(true); this.ball.position.set(r.x, r.y + 0.6 + Math.abs(Math.sin(this.t * 3)) * 0.5, r.z); this.ball.visible = true;
      if ((this.wait += dt) > 6) { this.wait = -20; g.ui.toast(tr('🎾 Ketuk ✋ untuk servis!', '🎾 Tap ✋ to serve!'), 2500); }
    } else if (this.state === 'moServe') {
      const r = this.racketPos(false); this.ball.position.set(r.x, r.y + 0.6 + Math.abs(Math.sin(this.t * 3)) * 0.5, r.z); this.ball.visible = true;
      if (this.t > 1.4) { mo.swing(); SFX.pop(3); this.to.copy(r); this.rally = 0; this.hitToMe(); }
    } else if (this.state === 'toMo' || this.state === 'toMe') {
      const u = this.t / this.T;
      ballAt(Math.min(u, 1.25), this.from, this.to, this.c.y + 0.12, this.ball.position);
      // you glide to where the ball is going
      if (this.state === 'toMe') this.myX += (this.to.x - this.myX) * Math.min(1, dt * 4);
      g.ui.fishCue(this.state === 'toMe' && canHit((1 - u) * this.T));
      if (this.state === 'toMo' && u >= 1) {
        mo.swing();
        if (moReturns(this.rally, Math.random())) { SFX.pop(3); this.hitToMe(); }
        else this.point(true);
      } else if (this.state === 'toMe' && (1 - u) * this.T < -HIT.after) this.point(false);
    }
    // you stand at the baseline, facing the net
    const p = g.player;
    p.pos.set(this.myX, this.c.y, this.mePos.z); p.vel.set(0, 0, 0); p.visY = p.pos.y; p.onGround = true; p.speed = 0; p.yaw = 0;
    if (mo.stand) mo.stand.pos.x += ((this.state === 'toMo' ? this.to.x : this.moPos.x) - mo.stand.pos.x) * Math.min(1, dt * 3);
    g.ui.tennisHud({ me: this.me, mo: this.mo, rally: this.rally });
    return true;
  }
  /** the arm swing for you (Baby Mo swings his own) */
  get swinging() { return this.swingT; }

  private point(mine: boolean) {
    const g = this.g;
    g.ui.fishCue(false);
    if (mine) { this.me++; SFX.chime(); g.ui.toast(tr(`🎾 Poin untukmu! ${this.me} – ${this.mo}`, `🎾 Your point! ${this.me} – ${this.mo}`), 2200); }
    else { this.mo++; SFX.pop(1); g.ui.toast(tr(`🎾 Poin untuk Baby Mo. ${this.me} – ${this.mo}. Ayo, bisa!`, `🎾 Baby Mo’s point. ${this.me} – ${this.mo}. You can do it!`), 2200); g.ents.mo.celebrate = 1; }
    const best = (g.stats.tennisRally ??= 0); if (this.rally > best) g.stats.tennisRally = this.rally;
    if (this.me >= WIN || this.mo >= WIN) { this.state = 'done'; this.ball.visible = false; setTimeout(() => this.result(), 700); return; }
    if (mine) this.serveMe(); else { this.state = 'moServe'; this.t = 0; }
  }
  private result() {
    const g = this.g, won = this.me > this.mo, coins = won ? 50 : 20;
    if (won) g.stats.tennisWins = (g.stats.tennisWins || 0) + 1;
    g.addCoins(coins, from => g.ui.coinPop(coins, from));
    SFX.fanfare(); g.ui.confetti(won ? 60 : 25); g.ents.mo.celebrate = 2;
    g.ui.dialog({
      face: '🎾', who: tr('Pertandingan selesai!', 'Match over!'),
      text: (won ? tr(`<b>Kamu menang ${this.me} – ${this.mo}!</b> Alhamdulillah! Baby Mo memberi selamat 🤝`, `<b>You won ${this.me} – ${this.mo}!</b> Alhamdulillah! Baby Mo says well done 🤝`) : tr(`<b>Baby Mo menang ${this.mo} – ${this.me}.</b> Permainan yang seru! Coba lagi ya 💪`, `<b>Baby Mo won ${this.mo} – ${this.me}.</b> What a fun game! Try again 💪`))
        + `<br>🎾 ${tr('Reli terpanjang', 'Longest rally')}: ${g.stats.tennisRally ?? 0} · 🪙 +${coins}`,
      buttons: [{ label: '🎾 ' + tr('Main lagi', 'Play again'), cls: 'gold', fn: () => { this.end(); setTimeout(() => this.start(), 300); } }, { label: tr('Selesai', 'Done'), fn: () => this.end() }],
    });
    g.checkQuests(); g.saveSoon();
  }
  private end() {
    const g = this.g;
    this.active = false; this.state = 'done'; this.ball.visible = false;
    for (const r of this.rackets) r.removeFromParent(); this.rackets = [];
    g.ents.mo.stand = null; g.ui.tennisHud(null); g.ui.fishCue(false);
    g.player.pos.set(this.mePos.x + 6, this.c.y, this.mePos.z - 4);
  }
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
