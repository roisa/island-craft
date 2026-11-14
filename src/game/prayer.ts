// Real prayer times (computed offline with the adhan library) and Hijri dates.
import { Coordinates, CalculationMethod, CalculationParameters, PrayerTimes, Madhab } from 'adhan';
import { tr } from '../i18n';

export interface City { n: string; i: string; lat: number; lng: number }
export const CITIES: City[] = [
  { n: 'Jakarta', i: '🏙️', lat: -6.2088, lng: 106.8456 }, { n: 'Bandung', i: '🌋', lat: -6.9175, lng: 107.6191 },
  { n: 'Surabaya', i: '🦈', lat: -7.2575, lng: 112.7521 }, { n: 'Malang', i: '🍎', lat: -7.9778, lng: 112.5347 },
  { n: 'Yogyakarta', i: '🏛️', lat: -7.7956, lng: 110.3695 }, { n: 'Semarang', i: '⛵', lat: -6.9667, lng: 110.4167 },
  { n: 'Medan', i: '🌴', lat: 3.5952, lng: 98.6722 }, { n: 'Makassar', i: '⛵', lat: -5.1477, lng: 119.4327 },
  { n: 'Denpasar', i: '🌺', lat: -8.65, lng: 115.2167 }, { n: 'Palembang', i: '🌉', lat: -2.9909, lng: 104.7566 },
  { n: 'Banjarmasin', i: '🛶', lat: -3.3186, lng: 114.5944 }, { n: 'Banda Aceh', i: '🕌', lat: 5.5483, lng: 95.3238 },
  { n: 'Pekanbaru', i: '🌳', lat: 0.5071, lng: 101.4478 }, { n: 'Balikpapan', i: '🛢️', lat: -1.2379, lng: 116.8529 },
  { n: 'Kuala Lumpur', i: '🇲🇾', lat: 3.139, lng: 101.6869 }, { n: 'Singapore', i: '🇸🇬', lat: 1.3521, lng: 103.8198 },
  { n: 'Makkah', i: '🕋', lat: 21.4225, lng: 39.8262 }, { n: 'London', i: '🇬🇧', lat: 51.5074, lng: -0.1278 },
  { n: 'Amsterdam', i: '🇳🇱', lat: 52.3676, lng: 4.9041 }, { n: 'Sydney', i: '🇦🇺', lat: -33.8688, lng: 151.2093 },
];

export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type Prayer = typeof PRAYERS[number];
export const PRAYER_NAME: Record<Prayer, [string, string]> = {
  fajr: ['Subuh', 'Fajr'], dhuhr: ['Dzuhur', 'Dhuhr'], asr: ['Ashar', 'Asr'], maghrib: ['Maghrib', 'Maghrib'], isha: ['Isya', 'Isha'],
};
export const PRAYER_ICON: Record<Prayer, string> = { fajr: '🌅', dhuhr: '☀️', asr: '🌤️', maghrib: '🌇', isha: '🌙' };
export const prayerName = (p: Prayer) => tr(PRAYER_NAME[p][0], PRAYER_NAME[p][1]);

export type MethodId = 'kemenag' | 'mwl' | 'ummalqura' | 'isna' | 'egypt';
export const METHODS: { id: MethodId; label: [string, string] }[] = [
  { id: 'kemenag', label: ['Kemenag RI / JAKIM (20° / 18°)', 'Indonesia / Malaysia (20° / 18°)'] },
  { id: 'mwl', label: ['Liga Muslim Dunia', 'Muslim World League'] },
  { id: 'ummalqura', label: ['Umm al-Qura (Makkah)', 'Umm al-Qura (Makkah)'] },
  { id: 'isna', label: ['ISNA (Amerika Utara)', 'ISNA (North America)'] },
  { id: 'egypt', label: ['Mesir', 'Egyptian'] },
];

function params(m: MethodId): CalculationParameters {
  let p: CalculationParameters;
  switch (m) {
    case 'mwl': p = CalculationMethod.MuslimWorldLeague(); break;
    case 'ummalqura': p = CalculationMethod.UmmAlQura(); break;
    case 'isna': p = CalculationMethod.NorthAmerica(); break;
    case 'egypt': p = CalculationMethod.Egyptian(); break;
    default:
      p = new CalculationParameters('Other', 20, 18);
      // small precautionary minutes (ihtiyat), as commonly published in Indonesia
      p.adjustments.fajr = 2; p.adjustments.dhuhr = 3; p.adjustments.asr = 2; p.adjustments.maghrib = 2; p.adjustments.isha = 2;
  }
  p.madhab = Madhab.Shafi;
  return p;
}

export interface DayTimes { fajr: Date; sunrise: Date; dhuhr: Date; asr: Date; maghrib: Date; isha: Date }

export function timesFor(lat: number, lng: number, date: Date, method: MethodId): DayTimes {
  const pt = new PrayerTimes(new Coordinates(lat, lng), date, params(method));
  return { fajr: pt.fajr, sunrise: pt.sunrise, dhuhr: pt.dhuhr, asr: pt.asr, maghrib: pt.maghrib, isha: pt.isha };
}

/**
 * Hours (0..24) for each moment, on the clock of the place. Uses the device's
 * time zone when it matches the location, otherwise an offset from longitude.
 */
export function placeOffset(lng: number) {
  const dev = -new Date().getTimezoneOffset() / 60;
  return Math.abs(dev - lng / 15) < 2.5 ? dev : Math.round(lng / 15);
}
export const placeHour = (d: Date, lng: number) => ((d.getUTCHours() + d.getUTCMinutes() / 60 + placeOffset(lng)) % 24 + 24) % 24;
export function hoursOf(t: DayTimes, lng: number) {
  const h = (d: Date) => placeHour(d, lng);
  return { fajr: h(t.fajr), sunrise: h(t.sunrise), dhuhr: h(t.dhuhr), asr: h(t.asr), maghrib: h(t.maghrib), isha: h(t.isha) };
}

export const fmtTime = (d: Date, lng: number) => fmtHour(placeHour(d, lng) + 0.5 / 60);
export const fmtHour = (h: number) => {
  const hh = Math.floor(h) % 24, mm = Math.floor((h - Math.floor(h)) * 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
};

// ---- Hijri ---------------------------------------------------------------
export interface Hijri { day: number; month: number; year: number }
export function hijri(d: Date): Hijri | null {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d);
    const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10);
    const r = { day: get('day'), month: get('month'), year: get('year') };
    return r.month ? r : null;
  } catch { return null; }
}
export const HIJRI_MONTHS: [string, string][] = [
  ['Muharram', 'Muharram'], ['Safar', 'Safar'], ["Rabi'ul Awal", "Rabi' al-Awwal"], ["Rabi'ul Akhir", "Rabi' al-Thani"],
  ['Jumadil Awal', 'Jumada al-Ula'], ['Jumadil Akhir', 'Jumada al-Akhirah'], ['Rajab', 'Rajab'], ["Sya'ban", "Sha'ban"],
  ['Ramadhan', 'Ramadan'], ['Syawal', 'Shawwal'], ["Dzulqa'dah", "Dhu al-Qi'dah"], ['Dzulhijjah', 'Dhu al-Hijjah'],
];

/** Ramadhan status today: day of Ramadhan (1..30) or days until it begins. */
export function ramadhanStatus(now = new Date()): { inRamadhan: boolean; day: number; daysUntil: number; hijri: Hijri | null } {
  const h = hijri(now);
  if (h && h.month === 9) return { inRamadhan: true, day: h.day, daysUntil: 0, hijri: h };
  let until = -1;
  const d = new Date(now);
  for (let i = 1; i < 400; i++) {
    d.setDate(d.getDate() + 1);
    const x = hijri(d);
    if (x && x.month === 9 && x.day === 1) { until = i; break; }
  }
  return { inRamadhan: false, day: 0, daysUntil: until, hijri: h };
}

// ---- location ----------------------------------------------------------------
export interface Loc { name: string; lat: number; lng: number }
export function loadLocation(): Loc {
  // shared with the Baby Mo hub's prayer tab when served from the same site
  try {
    const own = JSON.parse(localStorage.getItem('bmic_loc') || 'null');
    if (own && typeof own.lat === 'number') return own;
    const m = JSON.parse(localStorage.getItem('mo_manual_city') || 'null');
    if (m && typeof m.lat === 'number') return { name: m.n, lat: m.lat, lng: m.lng };
    const c = JSON.parse(localStorage.getItem('mo_cached_loc') || 'null');
    if (c && typeof c.lat === 'number') return { name: tr('Lokasiku', 'My location'), lat: c.lat, lng: c.lng };
  } catch { /* ignore */ }
  return { name: 'Jakarta', lat: -6.2088, lng: 106.8456 };
}
export function saveLocation(l: Loc) {
  try { localStorage.setItem('bmic_loc', JSON.stringify(l)); } catch { /* ignore */ }
}
