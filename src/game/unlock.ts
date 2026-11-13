// Free + one-time unlock. The free part: the island, Baby Mo, the first 7
// hijaiyah letters, wudu and prayer, the masjids, the fishing pond, the
// orchard, the camp and the race track. "Full BabyMo Craft" (one purchase in the
// iPhone/iPad app) opens the rest: all 28 letters, the Iqro journey and Dad's
// exams, and the tennis court, archery, sports park, horse farm and ice rink.
// Worship basics are never locked.

/** the App Store product (a non-consumable in-app purchase) */
export const FULL_ID = 'com.babymo.islandcraft.full';
/** how many letters can be found without Full BabyMo Craft */
export const FREE_LETTERS = 7;
/** the places and games that need Full BabyMo Craft (activity ids and landmark ids) */
export const LOCKED = new Set(['tennis', 'archery', 'basketball', 'soccer', 'horses', 'skating', 'sports', 'horse_farm', 'ice_rink']);

export type Feature = 'letter' | 'iqro' | 'exam' | string;

/** may this be used? `found` = letters already found */
export function allowed(full: boolean, what: Feature, found = 0): boolean {
  if (full) return true;
  if (what === 'letter') return found < FREE_LETTERS;
  if (what === 'iqro' || what === 'exam') return false;
  return !LOCKED.has(what);
}

/**
 * The family code (website only: in the app, Apple allows only the in-app purchase).
 * Only its SHA-256 is here, so the code can't be read from the page's source.
 */
export const FAMILY_HASH = 'd55d6b3cda829639b7bfbd31a423000914786e7934cd8074067b5fe9bff3a86b';
/** "mo-ab12 cd34" and "MOAB12CD34" are the same code */
export const normCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
export async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
/** is this the family code (or, for tests, the code of another hash)? */
export async function isFamilyCode(code: string, hash = FAMILY_HASH): Promise<boolean> {
  const n = normCode(code);
  return n.length >= 6 && (await sha256Hex(n)) === hash;
}
