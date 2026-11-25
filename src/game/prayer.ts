// Real prayer times (computed offline with the adhan library) and Hijri dates.
import { Coordinates, CalculationMethod, CalculationParameters, PrayerTimes, Madhab, HighLatitudeRule, PolarCircleResolution } from 'adhan';
import { tr } from '../i18n';

export interface City { n: string; i: string; lat: number; lng: number; tz: string; cc?: string }
export const CITIES: City[] = [
  { n: 'Jakarta', i: '🏙️', lat: -6.2088, lng: 106.8456, tz: 'Asia/Jakarta' }, { n: 'Bandung', i: '🌋', lat: -6.9175, lng: 107.6191, tz: 'Asia/Jakarta' },
  { n: 'Surabaya', i: '🦈', lat: -7.2575, lng: 112.7521, tz: 'Asia/Jakarta' }, { n: 'Malang', i: '🍎', lat: -7.9778, lng: 112.5347, tz: 'Asia/Jakarta' },
  { n: 'Yogyakarta', i: '🏛️', lat: -7.7956, lng: 110.3695, tz: 'Asia/Jakarta' }, { n: 'Semarang', i: '⛵', lat: -6.9667, lng: 110.4167, tz: 'Asia/Jakarta' },
  { n: 'Medan', i: '🌴', lat: 3.5952, lng: 98.6722, tz: 'Asia/Jakarta' }, { n: 'Makassar', i: '⛵', lat: -5.1477, lng: 119.4327, tz: 'Asia/Makassar' },
  { n: 'Denpasar', i: '🌺', lat: -8.65, lng: 115.2167, tz: 'Asia/Makassar' }, { n: 'Palembang', i: '🌉', lat: -2.9909, lng: 104.7566, tz: 'Asia/Jakarta' },
  { n: 'Banjarmasin', i: '🛶', lat: -3.3186, lng: 114.5944, tz: 'Asia/Makassar' }, { n: 'Banda Aceh', i: '🕌', lat: 5.5483, lng: 95.3238, tz: 'Asia/Jakarta' },
  { n: 'Pontianak', i: '🌐', lat: -0.0263, lng: 109.3425, tz: 'Asia/Pontianak' }, { n: 'Manado', i: '🐠', lat: 1.4748, lng: 124.8421, tz: 'Asia/Makassar' },
  { n: 'Ambon', i: '🏝️', lat: -3.6954, lng: 128.1814, tz: 'Asia/Jayapura' }, { n: 'Jayapura', i: '🦜', lat: -2.5337, lng: 140.7181, tz: 'Asia/Jayapura' },
  { n: 'Pekanbaru', i: '🌳', lat: 0.5071, lng: 101.4478, tz: 'Asia/Jakarta' }, { n: 'Balikpapan', i: '🛢️', lat: -1.2379, lng: 116.8529, tz: 'Asia/Makassar' },
  { n: 'Kuala Lumpur', i: '🇲🇾', lat: 3.139, lng: 101.6869, tz: 'Asia/Kuala_Lumpur' }, { n: 'Singapore', i: '🇸🇬', lat: 1.3521, lng: 103.8198, tz: 'Asia/Singapore' },
  { n: 'Makkah', i: '🕋', lat: 21.4225, lng: 39.8262, tz: 'Asia/Riyadh' }, { n: 'London', i: '🇬🇧', lat: 51.5074, lng: -0.1278, tz: 'Europe/London' },
  { n: 'Amsterdam', i: '🇳🇱', lat: 52.3676, lng: 4.9041, tz: 'Europe/Amsterdam' }, { n: 'Sydney', i: '🇦🇺', lat: -33.8688, lng: 151.2093, tz: 'Australia/Sydney' },
];

/** a city's country, from its time zone (the quick list is Indonesia plus a few places families travel to) */
const ZONE_CC: Record<string, string> = { 'Asia/Jakarta': 'ID', 'Asia/Pontianak': 'ID', 'Asia/Makassar': 'ID', 'Asia/Jayapura': 'ID', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Singapore': 'SG', 'Asia/Riyadh': 'SA', 'Europe/London': 'GB', 'Europe/Amsterdam': 'NL', 'Australia/Sydney': 'AU' };
for (const c of CITIES) c.cc = ZONE_CC[c.tz];

export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type Prayer = typeof PRAYERS[number];
export const PRAYER_NAME: Record<Prayer, [string, string]> = {
  fajr: ['Subuh', 'Fajr'], dhuhr: ['Dzuhur', 'Dhuhr'], asr: ['Ashar', 'Asr'], maghrib: ['Maghrib', 'Maghrib'], isha: ['Isya', 'Isha'],
};
export const PRAYER_ICON: Record<Prayer, string> = { fajr: '🌅', dhuhr: '☀️', asr: '🌤️', maghrib: '🌇', isha: '🌙' };
export const prayerName = (p: Prayer) => tr(PRAYER_NAME[p][0], PRAYER_NAME[p][1]);

/** calculation methods: the same list and the same choice by country as the Baby Mo app (bm-prayertimes.js) */
export type MethodId = 'auto' | 'kemenag' | 'jakim' | 'muis' | 'mwl' | 'umm' | 'egypt' | 'karachi' | 'isna' | 'diyanet' | 'dubai'
  | 'qatar' | 'kuwait' | 'gulf' | 'jordan' | 'morocco' | 'algeria' | 'tunisia' | 'uoif' | 'russia' | 'tehran';
export const METHODS: { id: Exclude<MethodId, 'auto'>; label: [string, string] }[] = [
  { id: 'kemenag', label: ['Kemenag RI (Indonesia)', 'Kemenag RI (Indonesia)'] },
  { id: 'jakim', label: ['JAKIM (Malaysia)', 'JAKIM (Malaysia)'] },
  { id: 'muis', label: ['MUIS (Singapura)', 'MUIS (Singapore)'] },
  { id: 'mwl', label: ['Liga Muslim Dunia (MWL)', 'Muslim World League (MWL)'] },
  { id: 'umm', label: ['Umm al-Qura (Makkah)', 'Umm al-Qura (Makkah)'] },
  { id: 'egypt', label: ['Otoritas Survei Mesir', 'Egyptian General Authority'] },
  { id: 'karachi', label: ['Univ. Ilmu Islam Karachi', 'Univ. of Islamic Sciences, Karachi'] },
  { id: 'isna', label: ['ISNA (Amerika Utara)', 'ISNA (North America)'] },
  { id: 'diyanet', label: ['Diyanet (Turki)', 'Diyanet (Turkey)'] },
  { id: 'dubai', label: ['Dubai (UEA)', 'Dubai (UAE)'] },
  { id: 'qatar', label: ['Qatar', 'Qatar'] },
  { id: 'kuwait', label: ['Kuwait', 'Kuwait'] },
  { id: 'gulf', label: ['Kawasan Teluk', 'Gulf Region'] },
  { id: 'jordan', label: ['Yordania', 'Jordan'] },
  { id: 'morocco', label: ['Maroko', 'Morocco'] },
  { id: 'algeria', label: ['Aljazair', 'Algeria'] },
  { id: 'tunisia', label: ['Tunisia', 'Tunisia'] },
  { id: 'uoif', label: ['UOIF (Prancis)', 'UOIF (France)'] },
  { id: 'russia', label: ['Rusia', 'Russia'] },
  { id: 'tehran', label: ['Univ. Teheran', 'University of Tehran'] },
];
const BY_CC: Record<string, Exclude<MethodId, 'auto'>> = {
  ID: 'kemenag', MY: 'jakim', SG: 'muis', BN: 'muis',
  SA: 'umm', YE: 'umm', AE: 'dubai', QA: 'qatar', KW: 'kuwait', BH: 'gulf', OM: 'gulf',
  EG: 'egypt', SD: 'egypt', SS: 'egypt', LY: 'egypt', SY: 'egypt', LB: 'egypt', IQ: 'egypt', PS: 'egypt',
  JO: 'jordan', DZ: 'algeria', TN: 'tunisia', MA: 'morocco', TR: 'diyanet', FR: 'uoif', RU: 'russia', IR: 'tehran',
  PK: 'karachi', IN: 'karachi', BD: 'karachi', AF: 'karachi', LK: 'karachi', NP: 'karachi',
  US: 'isna', CA: 'isna',
};
const HANAFI_CC = new Set(['PK', 'IN', 'BD', 'AF', 'UZ', 'TJ', 'TM', 'KG', 'KZ']);
/** the method a country uses (Muslim World League where none is set) */
export const methodFor = (cc = ''): Exclude<MethodId, 'auto'> => BY_CC[cc] ?? 'mwl';
/** a place saved without its country: the 20° / 18° region (Indonesia and its neighbours) counts as Indonesia */
export const guessCC = (lat: number, lng: number) => (lat > -11.5 && lat < 7.5 && lng > 94 && lng < 141.5 ? 'ID' : '');
/** the method actually used: the chosen one, or (automatic) the place's country's */
export const resolveMethod = (m: MethodId | undefined, cc = ''): Exclude<MethodId, 'auto'> => (m && m !== 'auto' && METHODS.some(x => x.id === m) ? m : methodFor(cc));
export const methodLabel = (m: MethodId) => { const x = METHODS.find(y => y.id === m); return x ? tr(x.label[0], x.label[1]) : m; };
const isRamadan = (d: Date) => { try { return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { month: 'numeric' }).format(d) === '9'; } catch { return false; } };

function params(m: Exclude<MethodId, 'auto'>, cc: string, date: Date): CalculationParameters {
  let p: CalculationParameters;
  const other = (fajr: number, isha: number, ishaInterval = 0) => new CalculationParameters('Other', fajr, isha, ishaInterval);
  switch (m) {
    case 'mwl': p = CalculationMethod.MuslimWorldLeague(); break;
    case 'umm': p = CalculationMethod.UmmAlQura(); if (isRamadan(date)) p.ishaInterval = 120; break; // (Umm al-Qura: Isha 2 hours after Maghrib in Ramadan)
    case 'isna': p = CalculationMethod.NorthAmerica(); break;
    case 'egypt': p = CalculationMethod.Egyptian(); break;
    case 'karachi': p = CalculationMethod.Karachi(); break;
    case 'muis': p = CalculationMethod.Singapore(); break;
    case 'diyanet': p = CalculationMethod.Turkey(); break;
    case 'dubai': p = CalculationMethod.Dubai(); break;
    case 'qatar': p = CalculationMethod.Qatar(); break;
    case 'kuwait': p = CalculationMethod.Kuwait(); break;
    case 'tehran': p = CalculationMethod.Tehran(); break;
    case 'jakim': p = other(20, 18); break;
    case 'gulf': p = other(19.5, 0, 90); break;
    case 'jordan': p = other(18, 18); p.methodAdjustments.maghrib = 5; break;
    case 'morocco': p = other(19, 17); break;
    case 'algeria': p = other(18, 17); break;
    case 'tunisia': p = other(18, 18); break;
    case 'uoif': p = other(12, 12); break;
    case 'russia': p = other(16, 15); break;
    default:
      p = other(20, 18);
      // small precautionary minutes (ihtiyat), as in the schedules Kemenag publishes
      p.adjustments.fajr = 2; p.adjustments.dhuhr = 3; p.adjustments.asr = 2; p.adjustments.maghrib = 2; p.adjustments.isha = 2;
  }
  p.madhab = HANAFI_CC.has(cc) ? Madhab.Hanafi : Madhab.Shafi;
  p.highLatitudeRule = HighLatitudeRule.TwilightAngle; // (as the Baby Mo app: "angle based" far north and south)
  p.polarCircleResolution = PolarCircleResolution.AqrabYaum; // (midnight sun / polar night: the nearest day that has a sunrise and a sunset)
  return p;
}

export interface DayTimes { fajr: Date; sunrise: Date; dhuhr: Date; asr: Date; maghrib: Date; isha: Date }

export function timesFor(lat: number, lng: number, date: Date, method: MethodId, cc = guessCC(lat, lng)): DayTimes {
  const pt = new PrayerTimes(new Coordinates(lat, lng), date, params(resolveMethod(method, cc), cc, date));
  return { fajr: pt.fajr, sunrise: pt.sunrise, dhuhr: pt.dhuhr, asr: pt.asr, maghrib: pt.maghrib, isha: pt.isha };
}

/**
 * Hours (0..24) for each moment, on the clock of the place. Uses the device's
 * time zone when it matches the location, otherwise an offset from longitude.
 */
/** hours ahead of UTC in a time zone at that moment (summer time included), or null if the zone is unknown */
const tzFmt = new Map<string, Intl.DateTimeFormat | null>();
export function tzOffset(tz: string, d: Date): number | null {
  let f = tzFmt.get(tz);
  if (f === undefined) { try { f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }); } catch { f = null; } tzFmt.set(tz, f); }
  if (!f) return null;
  const v: Record<string, number> = {};
  for (const p of f.formatToParts(d)) if (p.type !== 'literal') v[p.type] = +p.value;
  const asUtc = Date.UTC(v.year, v.month - 1, v.day, v.hour % 24, v.minute);
  return Math.round((asUtc - (+d - d.getUTCSeconds() * 1000 - d.getUTCMilliseconds())) / 60000) / 60;
}
/**
 * The place's clock: its own time zone when known (a city from the list, or "my location": the device's zone),
 * otherwise the device's time zone when it fits the longitude, else an offset from the longitude.
 */
export function placeOffset(lng: number, tz?: string, d = new Date()) {
  const z = tz ? tzOffset(tz, d) : null;
  if (z !== null) return z;
  const dev = -d.getTimezoneOffset() / 60;
  return Math.abs(dev - lng / 15) < 2.5 ? dev : Math.round(lng / 15);
}
export const placeHour = (d: Date, lng: number, tz?: string) => ((d.getUTCHours() + d.getUTCMinutes() / 60 + placeOffset(lng, tz, d)) % 24 + 24) % 24;
export function hoursOf(t: DayTimes, lng: number, tz?: string) {
  const h = (d: Date) => placeHour(d, lng, tz);
  return { fajr: h(t.fajr), sunrise: h(t.sunrise), dhuhr: h(t.dhuhr), asr: h(t.asr), maghrib: h(t.maghrib), isha: h(t.isha) };
}

export const fmtTime = (d: Date, lng: number, tz?: string) => fmtHour(placeHour(d, lng, tz) + 0.5 / 60);
export const fmtHour = (h: number) => {
  const hh = Math.floor(h) % 24, mm = Math.floor((h - Math.floor(h)) * 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
};

// ---- Hijri ---------------------------------------------------------------
export interface Hijri { day: number; month: number; year: number }
let hijriFmt: Intl.DateTimeFormat | null = null; // (made once: building one is slow, and Ramadhan's start looks at up to 400 days)
export function hijri(d: Date): Hijri | null {
  try {
    const parts = (hijriFmt ??= new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' })).formatToParts(d);
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
type RStatus = { inRamadhan: boolean; day: number; daysUntil: number; hijri: Hijri | null };
const rCache = new Map<string, RStatus>();
export function ramadhanStatus(now = new Date()): RStatus {
  const key = now.toDateString(), hit = rCache.get(key);
  if (hit) return hit;
  const r = ramadhanOn(now);
  rCache.set(key, r);
  return r;
}
function ramadhanOn(now: Date): RStatus {
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
export interface Loc { name: string; lat: number; lng: number; /** its time zone (IANA), when known */ tz?: string; /** its country (ISO code): picks the calculation method */ cc?: string; /** a GPS spot: the nearest town */ near?: string }
export function loadLocation(): Loc {
  // shared with the Baby Mo hub's prayer tab when served from the same site
  try {
    const own = JSON.parse(localStorage.getItem('bmic_loc') || 'null');
    if (own && typeof own.lat === 'number') { // (saved before cities had a time zone and a country: fill them in)
      const c = CITIES.find(x => x.n === own.name);
      return { ...own, tz: own.tz ?? c?.tz, cc: own.cc ?? c?.cc ?? guessCC(own.lat, own.lng) };
    }
    const m = JSON.parse(localStorage.getItem('mo_manual_city') || 'null');
    if (m && typeof m.lat === 'number') return { name: m.n, lat: m.lat, lng: m.lng, tz: m.tz ?? CITIES.find(c => c.n === m.n)?.tz, cc: m.cc ?? CITIES.find(c => c.n === m.n)?.cc ?? guessCC(m.lat, m.lng) };
    const c = JSON.parse(localStorage.getItem('mo_cached_loc') || 'null');
    if (c && typeof c.lat === 'number') return { name: c.near || tr('Lokasiku', 'My location'), lat: c.lat, lng: c.lng, tz: c.tz, cc: c.cc ?? guessCC(c.lat, c.lng) };
  } catch { /* ignore */ }
  return guessCity();
}
/**
 * No city chosen yet: a first guess from the device's time zone (no location permission needed), so the
 * prayer times are right for most families straight away. A grown-up can pick the city in the settings.
 */
const ZONE_CITY: Record<string, string> = {
  'Asia/Jakarta': 'Jakarta', 'Asia/Pontianak': 'Pontianak', 'Asia/Makassar': 'Makassar', 'Asia/Ujung_Pandang': 'Makassar',
  'Asia/Jayapura': 'Jayapura', 'Asia/Kuala_Lumpur': 'Kuala Lumpur', 'Asia/Kuching': 'Kuala Lumpur', 'Asia/Singapore': 'Singapore',
  'Asia/Riyadh': 'Makkah', 'Europe/London': 'London', 'Europe/Amsterdam': 'Amsterdam', 'Australia/Sydney': 'Sydney',
  'Australia/Melbourne': 'Sydney', 'Australia/Canberra': 'Sydney',
};
export function guessCity(zone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ''; } })()): Loc {
  const c = CITIES.find(x => x.n === ZONE_CITY[zone]) ?? CITIES[0];
  return { name: c.n, lat: c.lat, lng: c.lng, tz: c.tz, cc: c.cc };
}
export function saveLocation(l: Loc) {
  try { localStorage.setItem('bmic_loc', JSON.stringify(l)); } catch { /* ignore */ }
}
