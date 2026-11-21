// Stars and levels: pure maths, no DOM, so it can be unit tested.
import type { T2 } from '../i18n';

export const TITLES: T2[] = [
  ['Penjelajah Cilik', 'Little Explorer'], ['Sahabat Baby Mo', 'Baby Mo’s Friend'], ['Pencari Huruf', 'Letter Seeker'],
  ['Pembangun Muda', 'Young Builder'], ['Penjaga Desa', 'Village Helper'], ['Ksatria Kebaikan', 'Knight of Kindness'],
  ['Bintang Ramadhan', 'Ramadan Star'], ['Juara Hijaiyah', 'Hijaiyah Champion'],
];
/** stars needed to reach level n (level 1 = 0) */
export const starsFor = (n: number) => { let s = 0; for (let i = 1; i < n; i++) s += 15 + 10 * (i - 1); return s; };
export function levelOf(stars: number) { let n = 1; while (stars >= starsFor(n + 1)) n++; return n; }
export const titleOf = (lv: number) => TITLES[Math.min(TITLES.length - 1, lv - 1)];
