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

describe('family code (website)', () => {
  it('matches a code by its hash, ignoring case, spaces and dashes', async () => {
    const { isFamilyCode, sha256Hex, normCode, FAMILY_HASH } = await import('../../src/game/unlock');
    expect(normCode('mo-ab12 cd34')).toBe('MOAB12CD34');
    const hash = await sha256Hex('MOTEST1234');
    expect(await isFamilyCode('mo-test-1234', hash)).toBe(true);
    expect(await isFamilyCode('MO TEST 1234', hash)).toBe(true);
    expect(await isFamilyCode('MO-TEST-1235', hash)).toBe(false);
    expect(await isFamilyCode('', hash)).toBe(false);
    // the real code is not in the source, only its hash
    expect(FAMILY_HASH).toMatch(/^[0-9a-f]{64}$/);
  });
});
