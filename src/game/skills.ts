// Skills that grow with practice: sword (shooing naughty beetles), fishing,
// cooking and climbing. Pure maths and tables, unit tested.
export type Skill = 'sword' | 'fishing' | 'cooking' | 'climbing';
export const SKILLS: Skill[] = ['sword', 'fishing', 'cooking', 'climbing'];

/** XP needed to reach level n (index n-1); level 5 is the top */
export const LEVEL_XP = [0, 8, 24, 50, 90];
export const MAX_LEVEL = LEVEL_XP.length;
export function skillLevel(xp: number) { let l = 1; while (l < MAX_LEVEL && xp >= LEVEL_XP[l]) l++; return l; }
/** XP still missing for the next level (0 at the top) */
export function toNext(xp: number) { const l = skillLevel(xp); return l >= MAX_LEVEL ? 0 : LEVEL_XP[l] - xp; }

// ---------- sword ----------
/** base power by sword tier (0 = bare hands) */
export const SWORD_POWER = [0.5, 1, 1.6, 2.4];
/** a hit's strength: tier power, +15% per sword level */
export const hitPower = (tier: number, level: number) => SWORD_POWER[Math.max(0, Math.min(3, tier))] * (1 + 0.15 * (level - 1));

// ---------- fishing ----------
export type Catch = 'small' | 'big' | 'golden' | 'treasure';
/** seconds until a bite: shorter with skill and with the fishing hat */
export function biteDelay(level: number, hat: boolean, r: number) { return (2.2 + r * 4) * (1 - 0.08 * (level - 1)) * (hat ? 0.6 : 1); }
/** how long you have to tap after the bite */
export const biteWindow = (level: number) => 1.1 + 0.15 * (level - 1);
/** what you pull out, for a random r in [0,1) */
export function catchFor(level: number, hat: boolean, r: number): Catch {
  const golden = (0.02 + 0.015 * (level - 1)) * (hat ? 2 : 1);
  const treasure = 0.05 + 0.01 * (level - 1);
  const big = 0.22 + 0.04 * (level - 1);
  if (r < golden) return 'golden';
  if (r < golden + treasure) return 'treasure';
  if (r < golden + treasure + big) return 'big';
  return 'small';
}

// ---------- cooking ----------
/** width of the green "just right" zone (0..1 of the bar), wider with skill and the chef's hat */
export const cookZone = (level: number, hat: boolean) => Math.min(0.5, 0.18 + 0.04 * (level - 1) + (hat ? 0.08 : 0));
/** result of a cooking game: hits out of rounds → quality (food is always made: no losing) */
export function cookQuality(hits: number, rounds: number): 'perfect' | 'good' | 'crispy' {
  if (hits >= rounds) return 'perfect';
  if (hits >= Math.ceil(rounds / 2)) return 'good';
  return 'crispy';
}
/** where the marker is at time t (seconds): bounces 0→1→0, a little faster each round */
export const markerAt = (t: number, round: number) => { const sp = 0.7 + 0.18 * round; const x = (t * sp) % 2; return x < 1 ? x : 2 - x; };
