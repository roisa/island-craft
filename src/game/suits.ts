// The hero suits (and the outfit item type they share with hats, hijabs, shirts and capes).
// Kept apart from the 3D code so they can be checked on their own.
import type { T2 } from '../i18n';
import type { Stats } from '../content';

export type OutfitSlot = 'hat' | 'hijab' | 'cape' | 'shirt' | 'suit';
export interface OutfitItem {
  id: string; slot: OutfitSlot; name: T2; icon: string; level: number; color?: number; perk?: T2;
  /** a hero suit: the whole outfit's colours, a cape, a mask and a chest symbol */
  suit?: SuitDef;
  /** another way to open it before that level, and how to say it */
  unlock?: { test: (s: Stats) => boolean; how: T2 };
}
/**
 * A hero suit. Our own designs: the colours are the bright mixes children know from hero stories,
 * but every name is our own and the chest symbol is a simple shape (a star, a crescent, a leaf…),
 * never anyone's logo.
 */
export interface SuitDef {
  pants: number; belt: number; boots: number; gloves: number; cape?: number; mask?: number;
  emblem: SuitEmblem; emblemColor: number; emblemBack?: number;
  /** Baby Ais: the hijab's colour with this suit */
  hijab: number;
}
export type SuitEmblem = 'star' | 'crescent' | 'bolt' | 'leaf' | 'drop' | 'cloud' | 'gem' | 'heart' | 'snowflake';
const ALL_LETTERS = (s: Stats) => (s.letters?.length ?? 0) >= 28;
const SUIT_HOW: T2 = ['Temukan semua 28 huruf hijaiyah', 'Find all 28 hijaiyah letters'];
const suit = (id: string, name: T2, icon: string, shirt: number, def: SuitDef): OutfitItem => ({ id, slot: 'suit', name, icon, level: 99, color: shirt, suit: def, unlock: { test: ALL_LETTERS, how: SUIT_HOW } });
/** the 10 hero suits, opened by finding all 28 letters */
export const SUITS: OutfitItem[] = [
  suit('su_star', ['Bintang Penolong', 'Helper Star'], '⭐', 0x1f4fbf, { pants: 0xd62f2f, belt: 0xf2c230, boots: 0xd62f2f, gloves: 0xd62f2f, cape: 0xd62f2f, emblem: 'star', emblemColor: 0xf2c230, emblemBack: 0xffffff, hijab: 0xd62f2f }),
  suit('su_night', ['Penjaga Malam', 'Night Watcher'], '🌙', 0x3a3d45, { pants: 0x2a2c33, belt: 0xf2c230, boots: 0x1c1d22, gloves: 0x1c1d22, cape: 0x1c1d22, mask: 0x1c1d22, emblem: 'crescent', emblemColor: 0xf2c230, hijab: 0x2a2c33 }),
  suit('su_bolt', ['Pelari Kilat', 'Lightning Runner'], '⚡', 0xc8202a, { pants: 0xc8202a, belt: 0xf2c230, boots: 0xf2c230, gloves: 0xc8202a, mask: 0xc8202a, emblem: 'bolt', emblemColor: 0xf2c230, hijab: 0xc8202a }),
  suit('su_forest', ['Penjaga Hutan', 'Forest Guardian'], '🍃', 0x2fa84f, { pants: 0x1d1f22, belt: 0x1d1f22, boots: 0x1d1f22, gloves: 0x1d1f22, mask: 0x1d1f22, emblem: 'leaf', emblemColor: 0x2fa84f, emblemBack: 0xffffff, hijab: 0x2fa84f }),
  suit('su_wave', ['Penjelajah Ombak', 'Wave Rider'], '🌊', 0xf28c28, { pants: 0x2e8b57, belt: 0xf2c230, boots: 0x2e8b57, gloves: 0x2e8b57, emblem: 'drop', emblemColor: 0x2f8fd0, emblemBack: 0xf2c230, hijab: 0x2e8b57 }),
  suit('su_sky', ['Penjaga Langit', 'Sky Guardian'], '☁️', 0x2f6fde, { pants: 0x9aa6b2, belt: 0x9aa6b2, boots: 0xd62f2f, gloves: 0x9aa6b2, cape: 0xd62f2f, emblem: 'cloud', emblemColor: 0xffffff, hijab: 0x2f6fde }),
  suit('su_mighty', ['Si Hijau Perkasa', 'Mighty Green'], '💪', 0x5bbf3a, { pants: 0x6b3fa0, belt: 0x6b3fa0, boots: 0x3f2a1e, gloves: 0x5bbf3a, emblem: 'heart', emblemColor: 0x6b3fa0, hijab: 0x6b3fa0 }),
  suit('su_armor', ['Zirah Emas', 'Golden Armour'], '🛡️', 0xb3202a, { pants: 0xd9a52b, belt: 0xd9a52b, boots: 0xd9a52b, gloves: 0xd9a52b, mask: 0xd9a52b, emblem: 'gem', emblemColor: 0x9fe3ff, hijab: 0xb3202a }),
  suit('su_shadow', ['Bayangan Ungu', 'Purple Shadow'], '🔮', 0x1e1b26, { pants: 0x1e1b26, belt: 0x8e44ad, boots: 0x1e1b26, gloves: 0x8e44ad, cape: 0x8e44ad, mask: 0x8e44ad, emblem: 'gem', emblemColor: 0xb57bd6, hijab: 0x8e44ad }),
  suit('su_ice', ['Pahlawan Salju', 'Snow Hero'], '❄️', 0xe9f6ff, { pants: 0x7fc8f8, belt: 0x7fc8f8, boots: 0x7fc8f8, gloves: 0x7fc8f8, cape: 0x7fc8f8, mask: 0x7fc8f8, emblem: 'snowflake', emblemColor: 0x2f8fd0, hijab: 0x7fc8f8 }),
];
/** the chest symbols, drawn as little pixel pictures (5×5, from the top row down): 1 = colour, 2 = the back circle's colour */
export const EMBLEMS: Record<SuitEmblem, string[]> = {
  star:      ['00100', '11111', '01110', '01010', '10001'],
  crescent:  ['01110', '11000', '11000', '11000', '01110'],
  bolt:      ['00110', '01100', '11111', '00110', '01100'],
  leaf:      ['00011', '00111', '01110', '11100', '10000'],
  drop:      ['00100', '01110', '11111', '11111', '01110'],
  cloud:     ['00000', '01100', '11110', '11111', '00000'],
  gem:       ['00100', '01110', '11111', '01110', '00100'],
  heart:     ['01010', '11111', '11111', '01110', '00100'],
  snowflake: ['10101', '01110', '11111', '01110', '10101'],
};
