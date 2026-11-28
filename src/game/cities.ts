// The world town list for choosing where the prayer times are for: the same list and search as the Baby Mo
// app (public/cities.js: 27,139 towns from GeoNames, CC BY 4.0, each with its country and time zone). It is a
// big file, so it loads only when the city search opens. Nothing is sent anywhere.
import type { Loc } from './prayer';

export interface Town { n: string; cc: string; lat: number; lng: number; tz: string; p: number; nn: string; k: string }
interface Data { tz: string[]; cc: Record<string, string>; rows: string }

export const norm = (x: string) => String(x).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/** names Indonesian families type, and the names we show (as in the app) */
const ALIAS: Record<string, string> = {
  'george town|MY': 'penang pulau pinang', 'mecca|SA': 'makkah mekah mekkah makah', 'medina|SA': 'madinah al madinah', 'cairo|EG': 'kairo',
  'south tangerang|ID': 'tangerang selatan tangsel', 'jeddah|SA': 'jedah jiddah', 'riyadh|SA': 'riyad', 'the hague|NL': 'den haag',
  'beijing|CN': 'peking', 'jerusalem|IL': 'al quds', 'east jerusalem|PS': 'al quds baitul maqdis',
};
const SHOW: Record<string, string> = { 'Mecca|SA': 'Makkah', 'Medina|SA': 'Madinah' };
export const townName = (c: { n: string; cc: string }) => SHOW[c.n + '|' + c.cc] ?? c.n;
export const flag = (cc = '') => (cc.length === 2 ? String.fromCodePoint(127397 + cc.charCodeAt(0), 127397 + cc.charCodeAt(1)) : '🌍');

let towns: Town[] | null = null, countries: Record<string, { en: string; id: string }> = {};
let loading: Promise<Town[]> | null = null;
/** parse the data (exported for the tests, which read the file directly) */
export function parseTowns(D: Data): Town[] {
  countries = {};
  for (const [cc, v] of Object.entries(D.cc)) { const [en, id] = v.split('|'); countries[cc] = { en, id: id || en }; }
  return D.rows.split(';').map(r => {
    const f = r.split('|'), nn = norm(f[0]), cc = f[1];
    return { n: f[0], cc, lat: +f[2], lng: +f[3], tz: D.tz[+f[4]] || '', p: +f[5], nn, k: (nn + ' ' + (ALIAS[nn + '|' + cc] ?? '')).trim() };
  });
}
export function loadTowns(): Promise<Town[]> {
  if (towns) return Promise.resolve(towns);
  loading ??= new Promise<Town[]>((ok, fail) => {
    const w = window as unknown as { BMCitiesData?: Data };
    const done = () => { if (!w.BMCitiesData) { loading = null; fail(new Error('no city list')); return; } towns = parseTowns(w.BMCitiesData); ok(towns); };
    if (w.BMCitiesData) { done(); return; }
    const sc = document.createElement('script'); sc.src = 'cities.js?v=1'; sc.async = true;
    sc.onload = done; sc.onerror = () => { loading = null; fail(new Error('the city list could not load')); };
    document.head.appendChild(sc);
  });
  return loading;
}
export const countryName = (cc: string, lang: 'id' | 'en') => countries[cc]?.[lang] ?? cc;

/** towns matching what was typed: the exact name (or a known alias) first, then names starting with it, then containing it */
export function searchTowns(list: Town[], q: string, cc = '', max = 40): Town[] {
  const nq = norm(q), out: Town[] = [], seen = new Set<string>();
  const push = (c: Town) => { const key = c.n + '|' + c.cc; if (!seen.has(key)) { seen.add(key); out.push(c); } };
  if (!nq) { for (const c of list) { if (out.length >= max) break; if (!cc || c.cc === cc) push(c); } return out; }
  const tiers: Town[][] = [[], [], []], w = ' ' + nq;
  for (const c of list) {
    if (cc && c.cc !== cc) continue;
    const k = c.k;
    if (c.nn === nq || (' ' + k + ' ').includes(' ' + nq + ' ')) tiers[0].push(c);
    else if (k.startsWith(nq) || (' ' + k).includes(w)) tiers[1].push(c);
    else if (nq.length >= 3 && k.indexOf(nq) > 0) tiers[2].push(c);
    if (tiers[0].length + tiers[1].length > 80) break;
  }
  for (const t of tiers) for (const c of t) if (out.length < max) push(c);
  return out;
}
/** the biggest town within ~20 km of a GPS spot (so a street in London reads "London"), else the nearest */
export function nearestTown(list: Town[], lat: number, lng: number): { c: Town; km: number } | null {
  let best: Town | null = null, bd = 1e9, big: Town | null = null, bp = -1, bk = 0;
  const cl = Math.cos(lat * Math.PI / 180), r2 = (20 / 111) ** 2;
  for (const c of list) {
    const dx = (c.lng - lng) * cl, dy = c.lat - lat, d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = c; }
    if (d < r2 && c.p > bp) { bp = c.p; big = c; bk = d; }
  }
  if (big) return { c: big, km: Math.sqrt(bk) * 111 };
  return best ? { c: best, km: Math.sqrt(bd) * 111 } : null;
}
export const townLoc = (c: Town): Loc => ({ name: townName(c), lat: c.lat, lng: c.lng, tz: c.tz, cc: c.cc });
