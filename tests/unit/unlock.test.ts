import { describe, it, expect } from 'vitest';
import { allowed, FREE_LETTERS, LOCKED } from '../../src/game/unlock';

describe('free + one-time unlock', () => {
  it('lets the first 7 letters be found for free, then needs Full Mo Craft', () => {
    expect(FREE_LETTERS).toBe(7);
    for (let n = 0; n < 7; n++) expect(allowed(false, 'letter', n)).toBe(true);
    expect(allowed(false, 'letter', 7)).toBe(false);
    expect(allowed(false, 'letter', 27)).toBe(false);
    expect(allowed(true, 'letter', 27)).toBe(true);
  });
  it('keeps the Iqro journey and the exams for Full Mo Craft', () => {
    expect(allowed(false, 'iqro')).toBe(false);
    expect(allowed(false, 'exam')).toBe(false);
    expect(allowed(true, 'iqro')).toBe(true);
  });
  it('locks the sports and riding places, never the free ones or worship', () => {
    for (const id of ['tennis', 'archery', 'basketball', 'soccer', 'horses', 'skating']) { expect(LOCKED.has(id)).toBe(true); expect(allowed(false, id)).toBe(false); expect(allowed(true, id)).toBe(true); }
    for (const id of ['fish_pond', 'race_track', 'orchard', 'camp', 'masjid', 'prayer', 'wudu']) expect(allowed(false, id)).toBe(true);
  });
});
