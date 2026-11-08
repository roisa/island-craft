import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Animator, KEYS, LOCO_STATES, ACTIONS, RUN_MIN, applyPose, type AnimInput, type Pose } from '../../src/game/animator';

const DT = 1 / 60;
const ground = (speed = 0): AnimInput => ({ speed, grounded: true, vy: 0 });
function run(a: Animator, secs: number, inp: AnimInput | ((t: number) => AnimInput), t0 = 0) {
  let t = t0;
  for (let i = 0; i < Math.round(secs / DT); i++) { t += DT; a.update(DT, t, typeof inp === 'function' ? inp(t) : inp); }
  return t;
}
const maxJump = (a: Pose, b: Pose) => Math.max(...KEYS.map(k => Math.abs(a[k] - b[k])));

describe('locomotion states', () => {
  it('idle → walk → run follows the speed', () => {
    const a = new Animator(1);
    run(a, 0.5, ground(0)); expect(a.loco).toBe('idle');
    run(a, 0.5, ground(3)); expect(a.loco).toBe('walk');
    run(a, 0.5, ground(RUN_MIN + 1)); expect(a.loco).toBe('run');
    run(a, 0.8, ground(0)); expect(a.loco).toBe('idle');
  });
  it('jump → fall → land → idle', () => {
    const a = new Animator(1);
    run(a, 0.2, ground());
    run(a, 0.15, { speed: 0, grounded: false, vy: 6 }); expect(a.loco).toBe('jump');
    run(a, 0.3, { speed: 0, grounded: false, vy: -6 }); expect(a.loco).toBe('jump'); // a normal hop
    run(a, 0.6, { speed: 0, grounded: false, vy: -12 }); expect(a.loco).toBe('fall');
    a.update(DT, 5, ground()); expect(a.loco).toBe('land');
    run(a, 0.5, ground(), 5); expect(a.loco).toBe('idle');
  });
  it('a tiny step down does not trigger falling', () => {
    const a = new Animator(1);
    run(a, 0.3, ground(3));
    run(a, 0.1, { speed: 3, grounded: false, vy: -1 });
    expect(a.loco).toBe('walk');
  });
  it('swim, ride and fly win over the ground states', () => {
    const a = new Animator(1);
    run(a, 0.3, { speed: 2, grounded: false, vy: 0, swimming: true }); expect(a.loco).toBe('swim');
    run(a, 0.3, { speed: 2, grounded: true, vy: 0, riding: true }); expect(a.loco).toBe('ride');
    run(a, 0.3, { speed: 2, grounded: false, vy: 0, flying: true }); expect(a.loco).toBe('fly');
  });
  it('every state produces finite joint values', () => {
    expect(LOCO_STATES.length).toBe(11);
    const a = new Animator(1);
    const inputs: AnimInput[] = [ground(0), ground(3), ground(7), { speed: 0, grounded: false, vy: 5 }, { speed: 0, grounded: false, vy: -9 }, { speed: 1, grounded: false, vy: 0, swimming: true }, { speed: 0, grounded: false, vy: 0, swimming: true }, { speed: 2, grounded: false, vy: 0, swimming: true, underwater: true }, { speed: 2, grounded: false, vy: 0, swimming: true, stroke: 'back' }, { speed: 1, grounded: true, vy: 0, riding: true }, { speed: 1, grounded: false, vy: 0, flying: true }, { speed: 1, grounded: false, vy: 3, climbing: true }];
    for (const inp of inputs) { run(a, 0.4, inp); for (const k of KEYS) expect(Number.isFinite(a.pose[k]), `${a.loco}.${k}`).toBe(true); }
  });
});

describe('blending', () => {
  it('switching states never snaps a joint in one frame', () => {
    const a = new Animator(1);
    const seq: AnimInput[] = [ground(0), ground(3), ground(7), ground(0), { speed: 0, grounded: false, vy: 6 }, { speed: 0, grounded: false, vy: -9 }, ground(0), { speed: 1, grounded: false, vy: 0, swimming: true }, ground(0)];
    let t = 0, prev = { ...a.update(DT, t, ground()) }, worst = 0;
    for (const inp of seq) for (let i = 0; i < 40; i++) { t += DT; const p = a.update(DT, t, inp); worst = Math.max(worst, maxJump(prev, p)); prev = { ...p }; }
    expect(worst).toBeLessThan(0.45); // radians per 1/60 s frame
  });
  it('swimming: treading when still, each stroke and diving blend without snapping', () => {
    const a = new Animator(1);
    const sw = (speed: number, stroke?: 'free' | 'breast' | 'dog' | 'back', underwater = false): AnimInput => ({ speed, grounded: false, vy: 0, swimming: true, stroke, underwater });
    run(a, 0.5, sw(0)); expect(a.loco).toBe('tread');
    run(a, 0.5, sw(2.5)); expect(a.loco).toBe('swim');
    let t = 10, prev = { ...a.update(DT, t, sw(2.5)) }, worst = 0;
    for (const inp of [sw(2.5, 'free'), sw(2.5, 'breast'), sw(2.5, 'dog'), sw(2.5, 'back'), sw(2.5, 'free', true), sw(0), sw(2.5, 'free')]) for (let i = 0; i < 60; i++) { t += DT; const p = a.update(DT, t, inp); worst = Math.max(worst, maxJump(prev, p)); prev = { ...p }; }
    expect(worst).toBeLessThan(0.45);
  });
  it('walk is phase-locked to distance: twice the speed, twice the cadence', () => {
    const crossings = (speed: number) => {
      const a = new Animator(1); let n = 0, last = 0;
      run(a, 0.5, ground(speed));
      for (let i = 0; i < 120; i++) { a.update(DT, i * DT, ground(speed)); const v = a.pose.legLx; if (last < 0 && v >= 0) n++; last = v; }
      return n;
    };
    const slow = crossings(2), fast = crossings(4);
    expect(fast).toBeGreaterThanOrEqual(slow * 2 - 1);
    expect(fast).toBeLessThanOrEqual(slow * 2 + 1);
  });
});

describe('actions', () => {
  it('has all the interaction clips', () => { expect(ACTIONS.sort()).toEqual(['build', 'celebrate', 'chop', 'collect', 'drink', 'mine', 'read', 'wave'].sort()); });
  it('mining keeps the legs walking (upper-body mask)', () => {
    const a = new Animator(1), b = new Animator(1);
    a.play('mine');
    let t = 0;
    for (let i = 0; i < 60; i++) { t += DT; a.update(DT, t, ground(3)); b.update(DT, t, ground(3)); }
    expect(a.pose.legLx).toBeCloseTo(b.pose.legLx, 6);
    expect(Math.abs(a.pose.armRx - b.pose.armRx)).toBeGreaterThan(0.2);
  });
  it('one-shot actions end by themselves and fade out', () => {
    const a = new Animator(1);
    a.play('build');
    run(a, 0.15, ground()); expect(a.action).toBe('build');
    run(a, 0.6, ground()); expect(a.action).toBeNull();
  });
  it('looping actions stop when released', () => {
    const a = new Animator(1);
    a.play('chop'); run(a, 1, ground()); expect(a.action).toBe('chop');
    a.stop('chop'); run(a, 0.5, ground()); expect(a.action).toBeNull();
  });
  it('timed celebrate runs for the given time and owns the whole body', () => {
    const a = new Animator(1);
    a.play('celebrate', 1);
    let maxY = 0; const t = run(a, 0.8, ground(), 0);
    for (let i = 0; i < 20; i++) { a.update(DT, t + i * DT, ground()); maxY = Math.max(maxY, a.pose.bodyY); }
    expect(maxY).toBeGreaterThan(0.15);
    run(a, 0.8, ground(), 2); expect(a.action).toBeNull();
  });
});

describe('applying to a rig', () => {
  it('bends at the hip: feet stay put when the body leans', () => {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const mk = () => { const g = new THREE.Group(); body.add(g); return g; };
    const legL = mk(), legR = mk(); legL.position.set(-0.1, 0.5, 0); legR.position.set(0.1, 0.5, 0);
    const foot = new THREE.Object3D(); foot.position.set(0, -0.5, 0); legL.add(foot);
    const rig: any = { root, body, head: mk(), armL: mk(), armR: mk(), legs: [legL, legR], height: 1.6, hip: 0.5, scale: 1 };
    const p: any = Object.fromEntries(KEYS.map(k => [k, 0]));
    applyPose(rig, p); root.updateMatrixWorld(true);
    const before = foot.getWorldPosition(new THREE.Vector3());
    p.bodyX = 0.9; applyPose(rig, p); root.updateMatrixWorld(true);
    const after = foot.getWorldPosition(new THREE.Vector3());
    expect(after.distanceTo(before)).toBeLessThan(1e-6);
  });
});
