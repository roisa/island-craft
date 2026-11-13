// Free + one-time unlock. The free part: the island, Baby Mo, the first 7
// hijaiyah letters, wudu and prayer, the masjids, the fishing pond, the
// orchard, the camp and the race track. "Full Mo Craft" (one purchase in the
// iPhone/iPad app) opens the rest: all 28 letters, the Iqro journey and Dad's
// exams, and the tennis court, archery, sports park, horse farm and ice rink.
// Worship basics are never locked.

/** the App Store product (a non-consumable in-app purchase) */
export const FULL_ID = 'com.babymo.islandcraft.full';
/** how many letters can be found without Full Mo Craft */
export const FREE_LETTERS = 7;
/** the places and games that need Full Mo Craft (activity ids and landmark ids) */
export const LOCKED = new Set(['tennis', 'archery', 'basketball', 'soccer', 'horses', 'skating', 'sports', 'horse_farm', 'ice_rink']);

export type Feature = 'letter' | 'iqro' | 'exam' | string;

/** may this be used? `found` = letters already found */
export function allowed(full: boolean, what: Feature, found = 0): boolean {
  if (full) return true;
  if (what === 'letter') return found < FREE_LETTERS;
  if (what === 'iqro' || what === 'exam') return false;
  return !LOCKED.has(what);
}
