import { describe, it, expect } from 'vitest';
import { coachNext, COACH_STEPS, PRACTICE } from '../../src/game/fishcoach';
import { biteWindow } from '../../src/game/skills';

describe('fishing practice with Baby Mo', () => {
  it('goes step by step: hold, water, throw, wait, tap, done', () => {
    let s = coachNext('rod', 'held'); expect(s).toBe('water');
    s = coachNext(s, 'atWater'); expect(s).toBe('cast');
    s = coachNext(s, 'cast'); expect(s).toBe('wait');
    s = coachNext(s, 'bite'); expect(s).toBe('bite');
    s = coachNext(s, 'caught'); expect(s).toBe('done');
    expect(COACH_STEPS).toEqual(['rod', 'water', 'cast', 'wait', 'bite', 'done']);
  });
  it('a too-early tap just means throw again; a fish that got away means wait again', () => {
    expect(coachNext('wait', 'early')).toBe('cast');
    expect(coachNext('bite', 'escaped')).toBe('wait');
  });
  it('steps never jump ahead out of order', () => {
    expect(coachNext('rod', 'atWater')).toBe('rod');
    expect(coachNext('rod', 'bite')).toBe('rod');
    expect(coachNext('water', 'bite')).toBe('water');
  });
  it('putting the rod away goes back to holding it', () => {
    expect(coachNext('cast', 'putAway')).toBe('rod');
    expect(coachNext('done', 'putAway')).toBe('done');
  });
  it('the practice fish bites soon and gives more time to tap than a beginner normally gets', () => {
    expect(PRACTICE.wait).toBeLessThan(5);
    expect(PRACTICE.window).toBeGreaterThan(biteWindow(0));
  });
});
