import { describe, it, expect } from 'vitest';
import { shotPlan, keeperSaves, youSave, shootoutWinner, FACTS, powerSweep } from '../../src/game/stadium';

describe('a penalty', () => {
  it('in the green it goes where you aimed', () => {
    const p = shotPlan(0.8, 0.1, 0.5);
    expect(p.x).toBeCloseTo(0.8, 5); expect(p.y).toBeCloseTo(0.1, 5); expect(p.miss).toBeNull();
  });
  it('too hard rises over the bar; too soft drifts to the middle and is slow', () => {
    expect(shotPlan(0, 0.6, 1).miss).toBe('over');
    const soft = shotPlan(0.9, 0.2, 0); expect(Math.abs(soft.x)).toBeLessThan(0.6); expect(soft.speed).toBeLessThan(shotPlan(0.9, 0.2, 0.5).speed);
  });
  it('aiming outside the goal is wide, right at the edge hits the post', () => {
    expect(shotPlan(1.2, 0.2, 0.5).miss).toBe('wide');
    expect(shotPlan(1.0, 0.2, 0.5).miss).toBe('post');
  });
  it('Baby Mo saves it when he dives the right way, misses it when he goes the wrong way', () => {
    expect(keeperSaves(0.8, 0.2, 0.8, 1)).toBe(true);
    expect(keeperSaves(0.8, 0.2, -0.8, 1)).toBe(false);
    // the top corner can't be reached unless he's right there
    expect(keeperSaves(0.9, 0.9, 0.6, 1)).toBe(false);
    // a soft one is easier
    expect(keeperSaves(0.3, 0.2, 0.9, 0.7)).toBe(true);
  });
  it('the power bar sweeps 0 → 1 → 0', () => {
    expect(powerSweep(0)).toBe(0); expect(powerSweep(1 / 1.05)).toBeCloseTo(1, 5); expect(powerSweep(2 / 1.05)).toBeCloseTo(0, 5);
  });
});

describe('you in goal', () => {
  it('dive the right way (or stay for one down the middle) and it’s a save', () => {
    expect(youSave(0.7, 1)).toBe(true); expect(youSave(-0.7, -1)).toBe(true);
    expect(youSave(0.7, -1)).toBe(false); expect(youSave(0.1, 0)).toBe(true); expect(youSave(0.7, 0)).toBe(false);
  });
});

describe('the shootout', () => {
  it('ends early when one side can’t catch up', () => {
    expect(shootoutWinner([1, 1, 1], [0, 0, 0])).toBe('me');      // 3–0 with 2 left each: Baby Mo can only reach 2
    expect(shootoutWinner([1, 1], [0, 0])).toBeNull();
  });
  it('after five each the higher score wins; level goes to sudden death', () => {
    expect(shootoutWinner([1, 0, 1, 0, 1], [1, 1, 0, 0, 0])).toBe('me');
    expect(shootoutWinner([1, 0, 1, 0, 1], [1, 1, 0, 1, 0])).toBeNull();
    expect(shootoutWinner([1, 0, 1, 0, 1, 1], [1, 1, 0, 1, 0, 0])).toBe('me');
    expect(shootoutWinner([1, 0, 1, 0, 1, 1], [1, 1, 0, 1, 0])).toBeNull(); // (Baby Mo still has his kick)
  });
});

describe('football facts', () => {
  it('each fact is in both languages', () => { for (const [id, en] of FACTS) { expect(id.length).toBeGreaterThan(10); expect(en.length).toBeGreaterThan(10); } });
});
