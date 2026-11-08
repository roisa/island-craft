import { describe, it, expect } from 'vitest';
import { drain, sip, thirstSpeed, newHydration, SIPS, LOW, RATE, MO_ASK_EVERY } from '../../src/game/thirst';
import { DEEDS } from '../../src/game/amal';
import { I, ITEMS } from '../../src/world/blocks';

describe('thirst', () => {
  it('starts full with a full bottle', () => {
    expect(newHydration()).toEqual({ me: 100, mo: 100, sips: SIPS });
  });
  it('drains faster while busy, never below zero', () => {
    expect(drain(100, 60, true)).toBeLessThan(drain(100, 60, false));
    // thirsty after about 20 real minutes of busy play, not before
    expect(drain(100, 19 * 60, true)).toBeGreaterThan(LOW);
    expect(drain(100, 20 * 60, true)).toBeCloseTo(LOW, 5);
    expect(drain(100, 45 * 60, false)).toBeGreaterThan(LOW);   // resting is much slower
    expect(MO_ASK_EVERY).toBeGreaterThanOrEqual(600);          // Baby Mo doesn't keep asking
    expect(drain(5, 999, true)).toBe(0);
    expect(RATE.busy).toBeGreaterThan(RATE.rest);
  });
  it('a sip helps, capped at full', () => {
    expect(sip(10)).toBe(50);
    expect(sip(90)).toBe(100);
  });
  it('thirst only slows you a little, never stops you', () => {
    expect(thirstSpeed(100)).toBe(1);
    expect(thirstSpeed(LOW)).toBe(1);
    expect(thirstSpeed(0)).toBeCloseTo(0.8);
    expect(thirstSpeed(LOW / 2)).toBeGreaterThan(0.8);
  });
  it('the bottle is an item, and giving water is a good deed', () => {
    expect(ITEMS.get(I.BOTTLE)?.name[1]).toBe('Water Bottle');
    expect(DEEDS.find(d => d.id === 'water')?.src).toMatch(/HR\. /);
  });
});
