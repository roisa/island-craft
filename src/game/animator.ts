// Character animation for the blocky humanoids (player, Baby Mo, villagers).
//
// The rigs are rigid jointed parts (body, head, two arms pivoting at the
// shoulder, two legs pivoting at the hip), not skinned meshes. This animator
// drives those joints with:
//   - a LOCOMOTION layer: one looping or one-shot clip at a time
//     (idle, walk, run, jump, fall, land, swim, ride, fly), cross-faded over
//     a short time whenever the state changes;
//   - an ACTION layer on top (mine, chop, collect, build, wave, celebrate)
//     with its own fade in/out and a joint mask, so you can chop while
//     walking. Celebrate takes over the whole body.
// Walking is phase-locked to the distance travelled, so feet don't slide.
// Pure maths on a flat pose record, unit tested in tests/unit/animator.test.ts.

export type Loco = 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'land' | 'swim' | 'tread' | 'ride' | 'fly' | 'climb';
/** swimming strokes the player can choose */
export type Stroke = 'free' | 'breast' | 'dog' | 'back';
export const STROKES: Stroke[] = ['free', 'breast', 'dog', 'back'];
export type Action = 'mine' | 'chop' | 'collect' | 'build' | 'wave' | 'celebrate' | 'drink' | 'read';

/** Joint angles (radians) and the body's vertical offset (rig units). Negative x on arms/legs = forward. */
export interface Pose {
  bodyY: number; bodyX: number; bodyY_rot: number; bodyZ: number;
  headX: number; headY: number;
  armLx: number; armLz: number; armRx: number; armRy: number; armRz: number;
  legLx: number; legLz: number; legRx: number; legRz: number;
}
export const KEYS = ['bodyY', 'bodyX', 'bodyY_rot', 'bodyZ', 'headX', 'headY', 'armLx', 'armLz', 'armRx', 'armRy', 'armRz', 'legLx', 'legLz', 'legRx', 'legRz'] as const;
export const zeroPose = (): Pose => ({ bodyY: 0, bodyX: 0, bodyY_rot: 0, bodyZ: 0, headX: 0, headY: 0, armLx: 0, armLz: 0, armRx: 0, armRy: 0, armRz: 0, legLx: 0, legLz: 0, legRx: 0, legRz: 0 });

const TAU = Math.PI * 2;
const sin = Math.sin, cos = Math.cos;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x: number) => { x = clamp01(x); return x * x * (3 - 2 * x); };
/** 0 → 1 → 0 bump over u in [0,1], peaking at `at` */
const bump = (u: number, at = 0.5) => (u < at ? smooth(u / at) : smooth((1 - u) / (1 - at)));

interface Ctx { t: number; phase: number; u: number; speed: number; seed: number; stroke?: Stroke; under?: boolean; /** swimming time: runs faster the faster you swim, never jumps */ sw?: number }
interface Clip { loop: boolean; dur: number; sample(c: Ctx, o: Pose): void }

// ---------------------------------------------------------------- locomotion
const LOCO: Record<Loco, Clip> = {
  idle: { loop: true, dur: 1, sample(c, o) {
    const b = sin(c.t * 2.1 + c.seed);
    o.bodyY = b * 0.008; o.headX = sin(c.t * 0.7 + c.seed) * 0.05; o.headY = sin(c.t * 0.37 + c.seed * 2) * 0.12;
    o.armLx = b * 0.04; o.armRx = -b * 0.04; o.armLz = -0.05; o.armRz = 0.05;
  } },
  walk: { loop: true, dur: 1, sample(c, o) {
    const s = sin(c.phase), k = Math.min(1, 0.55 + c.speed * 0.12);
    o.legLx = s * 0.65 * k; o.legRx = -s * 0.65 * k;
    o.armLx = -s * 0.55 * k; o.armRx = s * 0.55 * k; o.armLz = -0.06; o.armRz = 0.06;
    o.bodyY = Math.abs(cos(c.phase)) * 0.045; o.bodyX = 0.03; o.bodyY_rot = s * 0.06; o.headY = -s * 0.04;
  } },
  run: { loop: true, dur: 1, sample(c, o) {
    const s = sin(c.phase);
    o.legLx = s * 0.95; o.legRx = -s * 0.95;
    o.armLx = -s * 0.95 - 0.2; o.armRx = s * 0.95 - 0.2; o.armLz = -0.12; o.armRz = 0.12;
    o.bodyY = Math.abs(cos(c.phase)) * 0.09; o.bodyX = 0.16; o.bodyY_rot = s * 0.1; o.headX = -0.1;
  } },
  jump: { loop: false, dur: 0.35, sample(c, o) {
    const k = smooth(c.u / 0.6);
    o.armLx = -0.5 * k; o.armRx = -0.5 * k; o.armLz = -0.55 * k; o.armRz = 0.55 * k;
    o.legLx = -0.55 * k; o.legRx = 0.25 * k; o.bodyX = -0.06 * k; o.headX = -0.15 * k;
  } },
  fall: { loop: true, dur: 1, sample(c, o) {
    const w = sin(c.t * 9 + c.seed) * 0.18;
    o.armLx = -1.0 + w; o.armRx = -1.0 - w; o.armLz = -0.75; o.armRz = 0.75;
    o.legLx = -0.25 + w * 0.6; o.legRx = 0.15 - w * 0.6; o.headX = 0.2;
  } },
  land: { loop: false, dur: 0.3, sample(c, o) {
    const k = bump(c.u, 0.3);
    o.bodyY = -0.09 * k; o.bodyX = 0.18 * k; o.legLx = -0.3 * k; o.legRx = -0.3 * k;
    o.armLx = -0.4 * k; o.armRx = -0.4 * k; o.armLz = -0.3 * k; o.armRz = 0.3 * k; o.headX = 0.1 * k;
  } },
  swim: { loop: true, dur: 1, sample(c, o) {
    const st = c.under ? 'dive' : c.stroke ?? 'free', t = (c.sw ?? c.t) + c.seed, k = 1;
    if (st === 'dive') {
      // underwater: streamlined, arms pulling wide and back, a slow dolphin kick
      const p = (t * 2.2) % 1, pull = p < 0.55 ? smooth(p / 0.55) : 1 - smooth((p - 0.55) / 0.45), w = sin(t * 5);
      o.bodyX = 1.35 + w * 0.06; o.headX = -1.0;
      o.armLx = -3.0 + pull * 2.3; o.armRx = -3.0 + pull * 2.3; o.armLz = -0.15 - pull * 0.9; o.armRz = 0.15 + pull * 0.9;
      o.legLx = 1.35 + w * 0.3; o.legRx = 1.35 + w * 0.3; o.bodyY = -0.05;
    } else if (st === 'free') {
      // front crawl: arms windmill one after the other, a quick flutter kick, the body rolls and the head turns to breathe
      const a = t * 4.6 * k, f = sin(t * 13 * k);
      o.bodyX = 1.25; o.headX = -0.95; o.bodyZ = sin(a) * 0.22; o.headY = sin(a) > 0.75 ? 0.6 * (sin(a) - 0.75) * 4 : 0;
      // each arm reaches forward, pulls down to the hip, then swings out over the water to reach again (no jumps in the angle)
      const arm = (ph: number) => -Math.PI / 2 - (Math.PI / 2) * cos(ph), out = (ph: number) => (sin(ph) < 0 ? -sin(ph) * 0.7 : 0);
      o.armLx = arm(a); o.armRx = arm(a + Math.PI); o.armLz = -0.15 - out(a); o.armRz = 0.15 + out(a + Math.PI);
      o.legLx = 1.25 + f * 0.3; o.legRx = 1.25 - f * 0.3;
    } else if (st === 'breast') {
      // breaststroke: pull wide, glide; a frog kick; the head lifts to breathe on each pull
      const p = (t * 1.4 * k) % 1, pull = p < 0.4 ? smooth(p / 0.4) : 1 - smooth((p - 0.4) / 0.6), kick = bump(p, 0.55);
      o.bodyX = 1.05 - pull * 0.25; o.headX = -0.7 - pull * 0.35; o.bodyY = pull * 0.05;
      o.armLx = -2.9 + pull * 1.4; o.armRx = -2.9 + pull * 1.4; o.armLz = -0.15 - pull * 1.0; o.armRz = 0.15 + pull * 1.0;
      o.legLx = 1.05 - kick * 0.9; o.legRx = 1.05 - kick * 0.9; o.legLz = -kick * 0.45; o.legRz = kick * 0.45;
    } else if (st === 'dog') {
      // doggy paddle: upright-ish, little quick paws in front, head well above the water
      const a = t * 9 * k;
      o.bodyX = 0.55; o.headX = -0.45; o.bodyY = Math.abs(sin(a)) * 0.04;
      o.armLx = -1.5 + sin(a) * 0.55; o.armRx = -1.5 - sin(a) * 0.55; o.armLz = -0.1; o.armRz = 0.1;
      o.legLx = 0.55 + sin(a + 1) * 0.5; o.legRx = 0.55 - sin(a + 1) * 0.5;
    } else {
      // backstroke: lying on the back, face up, arms circling backwards, flutter kick
      const a = t * 4 * k, f = sin(t * 12 * k);
      o.bodyX = -1.2; o.headX = 0.55; o.bodyZ = sin(a) * 0.15;
      const arm = (ph: number) => -Math.PI / 2 - (Math.PI / 2) * cos(ph), out = (ph: number) => (sin(ph) > 0 ? sin(ph) * 0.6 : 0);
      o.armLx = arm(a); o.armRx = arm(a + Math.PI); o.armLz = -0.2 - out(a); o.armRz = 0.2 + out(a + Math.PI);
      o.legLx = -1.2 + f * 0.3; o.legRx = -1.2 - f * 0.3;
    }
  } },
  // still in the water: upright, hands sculling, legs treading slowly, bobbing
  tread: { loop: true, dur: 1, sample(c, o) {
    const t = c.t + c.seed, s = sin(t * 2.6), e = sin(t * 3.2);
    o.bodyX = 0.12; o.bodyY = sin(t * 1.6) * 0.05; o.headX = -0.1 + sin(t * 0.8) * 0.06;
    o.armLx = -0.55 + s * 0.12; o.armRx = -0.55 - s * 0.12; o.armLz = -0.85 + s * 0.35; o.armRz = 0.85 + s * 0.35;
    o.legLx = 0.3 + e * 0.4; o.legRx = 0.3 - e * 0.4; o.legLz = -0.2; o.legRz = 0.2;
  } },
  ride: { loop: true, dur: 1, sample(c, o) {
    o.legLx = -1.3; o.legRx = -1.3; o.legLz = -0.35; o.legRz = 0.35;
    o.armLx = -0.7; o.armRx = -0.7; o.bodyY = Math.abs(sin(c.t * 5)) * 0.03 * Math.min(1, c.speed / 3);
  } },
  // hand over hand up a trunk, knees pushing
  climb: { loop: true, dur: 0.7, sample(c, o) {
    const s = sin(c.u * TAU);
    o.armLx = -2.6 + s * 0.45; o.armRx = -2.6 - s * 0.45; o.armLz = -0.15; o.armRz = 0.15;
    o.legLx = -0.6 - s * 0.4; o.legRx = -0.6 + s * 0.4; o.bodyX = 0.12; o.headX = -0.35;
  } },
  fly: { loop: true, dur: 1, sample(c, o) {
    const w = sin(c.t * 2 + c.seed) * 0.08;
    o.legLx = 0.2 + w; o.legRx = 0.25 - w; o.armLz = -0.45; o.armRz = 0.45; o.armLx = -0.2; o.armRx = -0.2; o.bodyX = 0.1;
  } },
};

// ---------------------------------------------------------------- actions
// `mask` lists the joints the action owns (arms + upper body by default).
const UPPER: (keyof Pose)[] = ['armLx', 'armLz', 'armRx', 'armRy', 'armRz', 'bodyY_rot', 'bodyZ', 'headX'];
interface ActionClip extends Clip { mask: (keyof Pose)[] | 'all'; fadeIn: number; fadeOut: number }
const ACT: Record<Action, ActionClip> = {
  // overhead strike, repeated while the button is held
  mine: { loop: true, dur: 0.32, fadeIn: 0.06, fadeOut: 0.15, mask: UPPER, sample(c, o) {
    const u = c.u, up = u < 0.45 ? smooth(u / 0.45) : 1 - smooth((u - 0.45) / 0.25);
    o.armRx = -0.5 - 2.0 * up; o.armRz = 0.1; o.armRy = 0;
    o.armLx = -0.5 - 0.6 * up; o.armLz = -0.15; o.bodyY_rot = -0.12 * up; o.headX = 0.15 * (1 - up);
  } },
  // sideways swing with a body twist, like an axe on a trunk
  chop: { loop: true, dur: 0.42, fadeIn: 0.08, fadeOut: 0.18, mask: UPPER, sample(c, o) {
    const u = c.u, back = u < 0.5 ? smooth(u / 0.5) : 1 - smooth((u - 0.5) / 0.22);
    o.armRx = -1.35; o.armRy = 0.9 * back - 0.4; o.armRz = 0.25 + 0.5 * back;
    o.armLx = -1.2; o.armLz = 0.25 + 0.3 * back;
    o.bodyY_rot = 0.45 * back - 0.25; o.headX = 0.05;
  } },
  // a quick bend to scoop something up
  collect: { loop: false, dur: 0.5, fadeIn: 0.05, fadeOut: 0.12, mask: [...UPPER, 'bodyX'], sample(c, o) {
    const k = bump(c.u, 0.4);
    o.bodyX = 0.45 * k; o.armLx = -1.2 * k; o.armRx = -1.2 * k; o.armLz = 0.15 * k; o.armRz = -0.15 * k; o.headX = 0.2 * k;
  } },
  // reach forward and tap the block into place
  build: { loop: false, dur: 0.3, fadeIn: 0.04, fadeOut: 0.1, mask: UPPER, sample(c, o) {
    const k = bump(c.u, 0.35);
    o.armRx = -0.4 - 1.1 * k; o.armRz = 0.05; o.armLx = -0.2 * k; o.bodyY_rot = -0.1 * k;
  } },
  // a glass to the mouth, head tipped back, three little sips
  drink: { loop: true, dur: 0.9, fadeIn: 0.25, fadeOut: 0.3, mask: [...UPPER, 'headY'], sample(c, o) {
    const sip = sin(c.u * TAU) * 0.08;
    o.armRx = -2.15 + sip; o.armRy = 0; o.armRz = -0.55; o.armLx = -0.1; o.armLz = -0.08;
    o.headX = -0.32 - sip; o.headY = 0; o.bodyY_rot = 0; o.bodyZ = 0;
  } },
  // holding a book open in both hands, looking down at it, turning a page now and then
  read: { loop: true, dur: 4, fadeIn: 0.3, fadeOut: 0.3, mask: UPPER, sample(c, o) {
    const page = c.u > 0.85 ? sin((c.u - 0.85) / 0.15 * Math.PI) * 0.35 : 0;
    o.armLx = -1.05; o.armLz = 0.32; o.armRx = -1.05 - page * 0.4; o.armRy = 0; o.armRz = -0.32 - page;
    o.headX = 0.38; o.bodyY_rot = 0; o.bodyZ = 0;
  } },
  wave: { loop: true, dur: 0.6, fadeIn: 0.15, fadeOut: 0.2, mask: ['armRx', 'armRy', 'armRz', 'headY'], sample(c, o) {
    o.armRx = -2.7; o.armRz = 0.25 + sin(c.u * TAU) * 0.35; o.armRy = 0; o.headY = 0.1;
  } },
  // hop with both arms up and a little wiggle
  celebrate: { loop: true, dur: 0.55, fadeIn: 0.1, fadeOut: 0.25, mask: 'all', sample(c, o) {
    const h = sin(c.u * Math.PI);
    o.bodyY = h * 0.32; o.armLx = -2.8 + h * 0.2; o.armRx = -2.8 + h * 0.2; o.armLz = -0.35; o.armRz = 0.35;
    o.legLx = -0.2 * h; o.legRx = -0.2 * h; o.legLz = -0.12 * h; o.legRz = 0.12 * h;
    o.bodyY_rot = sin(c.u * TAU) * 0.35; o.headX = -0.2 * h; o.bodyX = 0; o.bodyZ = 0; o.headY = 0;
  } },
};

export const LOCO_STATES = Object.keys(LOCO) as Loco[];
export const ACTIONS = Object.keys(ACT) as Action[];

export interface AnimInput {
  /** horizontal speed in blocks/second */
  speed: number;
  grounded: boolean;
  /** vertical velocity (blocks/s, + up) */
  vy: number;
  swimming?: boolean; riding?: boolean; flying?: boolean; climbing?: boolean;
  /** the chosen swimming stroke, and whether the head is under water */
  stroke?: Stroke; underwater?: boolean;
}

/** Thresholds shared with the tests. */
export const WALK_MIN = 0.35, RUN_MIN = 5.2, FALL_VY = -9.5, FALL_AIR = 0.9;

export class Animator {
  loco: Loco = 'idle';
  private locoT = 0;
  private fade = 1;          // 0..1 progress of the cross-fade into `loco`
  private fadeDur = 0.2;
  private phase = 0;         // walk/run cycle phase
  private speed = 0;
  private airT = 0;          // time spent off the ground
  action: Action | null = null;
  private actT = 0;
  private actW = 0;          // current action weight (0..1)
  private actHold = false;   // looping actions run while held
  private seed: number;
  private stroke = 'free';
  private swimT = 0;
  readonly pose = zeroPose();
  private a = zeroPose(); private c = zeroPose(); private from = zeroPose(); private locoOut = zeroPose();

  constructor(seed = Math.random() * 10) { this.seed = seed; }

  /** Start an action. Looping ones (mine, chop, wave, celebrate) run until stop() or `secs` pass. */
  play(a: Action, secs?: number) {
    if (this.action !== a || !ACT[a].loop) { this.action = a; this.actT = 0; }
    this.actHold = true;
    this.actUntil = secs ?? (ACT[a].loop ? Infinity : ACT[a].dur);
  }
  private actUntil = 0;
  stop(a?: Action) { if (!a || this.action === a) this.actHold = false; }
  /** a one-shot locomotion clip (land) or any state change, with a cross-fade */
  private setLoco(s: Loco, fade: number) {
    if (s === this.loco) return;
    // fade from what is on screen right now (even mid-fade), never from a clip
    // the character isn't showing: interrupted fades then can't snap
    copy(this.locoOut, this.from);
    this.loco = s; this.locoT = 0; this.fade = 0; this.fadeDur = fade;
  }

  /** Decide the locomotion state from movement, advance time and compute `pose`. */
  update(dt: number, t: number, inp: AnimInput): Pose {
    this.speed += (inp.speed - this.speed) * Math.min(1, dt * 10);
    this.airT = inp.grounded || inp.swimming ? 0 : this.airT + dt;
    const want = this.decide(inp);
    // a new stroke cross-fades like a new state
    const stroke = (inp.underwater ? 'dive' : inp.stroke) ?? 'free';
    if (want === 'swim' && this.loco === 'swim' && stroke !== this.stroke) { copy(this.locoOut, this.from); this.fade = 0; this.fadeDur = 0.35; }
    this.stroke = stroke;
    this.swimT += dt * (0.45 + Math.min(1, this.speed / 2.6) * 0.55);
    if (want !== this.loco) {
      const toLand = want === 'land';
      this.setLoco(want, toLand ? 0.06 : this.loco === 'land' ? 0.18 : want === 'jump' ? 0.08 : 0.2);
    }
    this.locoT += dt;
    this.fade = Math.min(1, this.fade + dt / this.fadeDur);
    // stride length grows a little with speed; phase advances with distance travelled
    const stride = this.loco === 'run' ? 0.95 : 0.7;
    this.phase = (this.phase + (this.speed * dt / stride) * Math.PI) % (TAU * 1000);

    // ---- locomotion layer with cross-fade
    const ctx = (s: Loco, lt: number): Ctx => { const cl = LOCO[s]; return { t, phase: this.phase, u: cl.loop ? (lt / cl.dur) % 1 : clamp01(lt / cl.dur), speed: this.speed, seed: this.seed, stroke: inp.stroke, under: inp.underwater, sw: this.swimT }; };
    reset(this.a); LOCO[this.loco].sample(ctx(this.loco, this.locoT), this.a);
    if (this.fade < 1) mix(this.from, this.a, smooth(this.fade), this.pose);
    else copy(this.a, this.pose);
    copy(this.pose, this.locoOut);

    // ---- action layer
    if (this.action) {
      const cl = ACT[this.action];
      this.actT += dt;
      if (this.actT >= this.actUntil) this.actHold = false;
      const target = this.actHold ? 1 : 0;
      const rate = target > this.actW ? 1 / cl.fadeIn : 1 / cl.fadeOut;
      this.actW = target > this.actW ? Math.min(1, this.actW + dt * rate) : Math.max(0, this.actW - dt * rate);
      if (this.actW <= 0 && !this.actHold) { this.action = null; this.actT = 0; }
      else {
        reset(this.c);
        cl.sample({ t, phase: this.phase, u: cl.loop ? (this.actT / cl.dur) % 1 : clamp01(this.actT / cl.dur), speed: this.speed, seed: this.seed }, this.c);
        const w = smooth(this.actW);
        const keys = cl.mask === 'all' ? KEYS : cl.mask;
        for (const k of keys) this.pose[k] += (this.c[k] - this.pose[k]) * w;
      }
    }
    return this.pose;
  }

  private decide(inp: AnimInput): Loco {
    if (inp.riding) return 'ride';
    if (inp.flying) return 'fly';
    if (inp.climbing) return 'climb';
    if (inp.swimming) return this.speed > 0.5 || inp.underwater ? 'swim' : 'tread';
    if (!inp.grounded) {
      if (inp.vy < FALL_VY || this.airT > FALL_AIR) return 'fall'; // a normal hop stays a jump
      if (inp.vy > 0.5 || this.loco === 'jump') return 'jump';
      return this.loco === 'fall' ? 'fall' : this.groundState();
    }
    // touching down after a real fall: a short squash
    if (this.loco === 'fall' || (this.loco === 'jump' && this.locoT > 0.25)) return 'land';
    if (this.loco === 'land' && this.locoT < LOCO.land.dur) return 'land';
    return this.groundState();
  }
  private groundState(): Loco {
    if (this.speed > RUN_MIN) return 'run';
    if (this.speed > WALK_MIN) return 'walk';
    return 'idle';
  }
}

function reset(o: Pose) { for (const k of KEYS) o[k] = 0; }
function copy(a: Pose, o: Pose) { for (const k of KEYS) o[k] = a[k]; }
function mix(a: Pose, b: Pose, w: number, o: Pose) { for (const k of KEYS) o[k] = a[k] + (b[k] - a[k]) * w; }

// ---------------------------------------------------------------- applying to a rig
import type { Rig } from './models';
/** Write a pose onto a blocky rig (rotations about the existing joint pivots). */
// `bodyX` bends the upper body at the hip (like the prayer poses): the body
// group pivots about the hip joint and the legs are counter-rotated so the
// feet stay where they are. Leg angles are therefore relative to upright.
export function applyPose(r: Rig, p: Pose) {
  const s = r.scale ?? 1, hy = (r.hip ?? 0.5) * s;
  r.body.position.set(0, p.bodyY * s + (hy - hy * Math.cos(p.bodyX)), -hy * Math.sin(p.bodyX));
  r.body.rotation.set(p.bodyX, p.bodyY_rot, p.bodyZ);
  r.head.rotation.set(p.headX, p.headY, 0);
  if (r.armL) r.armL.rotation.set(p.armLx, 0, p.armLz);
  if (r.armR) r.armR.rotation.set(p.armRx, p.armRy, p.armRz);
  const [l, rr] = r.legs;
  if (l) l.rotation.set(p.legLx - p.bodyX, 0, p.legLz);
  if (rr) rr.rotation.set(p.legRx - p.bodyX, 0, p.legRz);
}
