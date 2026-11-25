import { describe, it, expect } from 'vitest';
import { timesFor, hijri, ramadhanStatus, placeOffset, placeHour, tzOffset, guessCity, hoursOf, fmtHour, METHODS, CITIES } from '../../src/game/prayer';

describe('prayer times (offline, adhan)', () => {
  it('are in the right order for every city and method', () => {
    const date = new Date(Date.UTC(2026, 2, 1, 12));
    for (const c of CITIES) for (const m of METHODS) {
      const t = timesFor(c.lat, c.lng, date, m.id);
      const seq = [t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha].map(d => d.getTime());
      for (let i = 1; i < seq.length; i++) expect(seq[i], `${c.n} ${m.id} #${i}`).toBeGreaterThan(seq[i - 1]);
    }
  });
  it('gives Jakarta a Maghrib close to 18:00 local time', () => {
    const t = timesFor(-6.2, 106.8, new Date(Date.UTC(2026, 2, 1, 5)), 'kemenag');
    const local = (t.maghrib.getUTCHours() + t.maghrib.getUTCMinutes() / 60 + 7) % 24;
    expect(local).toBeGreaterThan(17.8); expect(local).toBeLessThan(18.6);
  });
  it('estimates a place offset from longitude', () => {
    expect(Math.round(placeOffset(106.8))).toBe(7);
  });
  it('formats hours as HH:MM', () => { expect(fmtHour(5.5)).toMatch(/^0?5[:.]30$/); });
});

describe('hijri calendar', () => {
  it('knows Ramadhan 1447 (around 18 Feb – 19 Mar 2026)', () => {
    const h = hijri(new Date(2026, 1, 25));
    expect(h?.month).toBe(9);
    expect(ramadhanStatus(new Date(2026, 1, 25)).inRamadhan).toBe(true);
  });
  it('counts days until the next Ramadhan outside it', () => {
    const s = ramadhanStatus(new Date(2026, 5, 1));
    expect(s.inRamadhan).toBe(false);
    expect(s.daysUntil).toBeGreaterThan(200); expect(s.daysUntil).toBeLessThan(300);
  });
});

describe('Ramadhan status is worked out once a day', () => {
  it('gives the same answer, without recounting, for the same date', async () => {
    const { ramadhanStatus } = await import('../../src/game/prayer');
    const d = new Date(2026, 10, 17, 9), later = new Date(2026, 10, 17, 21);
    const a = ramadhanStatus(d);
    expect(ramadhanStatus(later)).toBe(a);
    expect(ramadhanStatus(new Date(2026, 10, 18))).not.toBe(a);
  });
});

describe('the real clock of the chosen city', () => {
  const d = new Date(Date.UTC(2026, 10, 24, 5, 30)); // 12:30 in Jakarta, 13:30 in Makassar, 14:30 in Jayapura
  it('every city has a time zone, and Indonesia\'s three zones are right', () => {
    for (const c of CITIES) expect(tzOffset(c.tz, d), c.n).not.toBeNull();
    expect(placeHour(d, 106.8, 'Asia/Jakarta')).toBeCloseTo(12.5);
    expect(placeHour(d, 119.4, 'Asia/Makassar')).toBeCloseTo(13.5);
    expect(placeHour(d, 115.2, 'Asia/Makassar')).toBeCloseTo(13.5); // (Denpasar: WITA though its longitude says +8 is close to +7)
    expect(placeHour(d, 140.7, 'Asia/Jayapura')).toBeCloseTo(14.5);
  });
  it('summer time counts (London in July is UTC+1)', () => {
    expect(tzOffset('Europe/London', new Date(Date.UTC(2026, 6, 1, 12)))).toBe(1);
    expect(tzOffset('Europe/London', new Date(Date.UTC(2026, 0, 1, 12)))).toBe(0);
  });
  it('without a time zone it falls back to the longitude', () => {
    expect(placeOffset(119.4, undefined, d)).toBe(Math.abs(-d.getTimezoneOffset() / 60 - 119.4 / 15) < 2.5 ? -d.getTimezoneOffset() / 60 : 8);
    expect(tzOffset('Not/AZone', d)).toBeNull();
  });
  it('the first guess of the city comes from the device time zone', () => {
    expect(guessCity('Asia/Makassar').name).toBe('Makassar');
    expect(guessCity('Asia/Jayapura').tz).toBe('Asia/Jayapura');
    expect(guessCity('Europe/London').name).toBe('London');
    expect(guessCity('America/Nowhere').name).toBe('Jakarta');
  });
  it("Dhuhr in Makassar, on Makassar's clock, is around midday", () => {
    const c = CITIES.find(x => x.n === 'Makassar')!;
    const h = hoursOf(timesFor(c.lat, c.lng, d, 'kemenag'), c.lng, c.tz);
    expect(h.dhuhr).toBeGreaterThan(11.5); expect(h.dhuhr).toBeLessThan(12.5);
    expect(fmtHour(h.fajr) < fmtHour(h.dhuhr)).toBe(true);
  });
});

describe('like the Baby Mo app: method by country, and the world town list', async () => {
  const { methodFor, resolveMethod, guessCC, timesFor: tf } = await import('../../src/game/prayer');
  const { parseTowns, searchTowns, nearestTown, townLoc } = await import('../../src/game/cities');
  const fs = await import('fs');
  const g: any = {}; new Function('window', fs.readFileSync('public/cities.js', 'utf8'))(g);
  const towns = parseTowns(g.BMCitiesData);
  it('the method follows the country (as in the app), with a chosen method winning', () => {
    expect(methodFor('ID')).toBe('kemenag'); expect(methodFor('MY')).toBe('jakim'); expect(methodFor('SA')).toBe('umm');
    expect(methodFor('TR')).toBe('diyanet'); expect(methodFor('US')).toBe('isna'); expect(methodFor('GB')).toBe('mwl'); expect(methodFor('')).toBe('mwl');
    expect(resolveMethod('auto', 'EG')).toBe('egypt'); expect(resolveMethod('mwl', 'ID')).toBe('mwl');
    expect(guessCC(-6.2, 106.8)).toBe('ID'); expect(guessCC(51.5, -0.1)).toBe('');
  });
  it('Hanafi Asr in Pakistan is later than Shafi\'i Asr at the same spot', () => {
    const d = new Date(Date.UTC(2026, 10, 25, 4));
    expect(+tf(24.86, 67.01, d, 'karachi', 'PK').asr).toBeGreaterThan(+tf(24.86, 67.01, d, 'karachi', 'IN-not').asr);
  });
  it('the whole list loads: 27,000+ towns, each with a time zone', () => {
    expect(towns.length).toBeGreaterThan(27000);
    expect(towns.every(t => t.tz && t.cc.length === 2)).toBe(true);
  });
  it('search finds towns the way families type them', () => {
    expect(searchTowns(towns, 'bekasi')[0]).toMatchObject({ n: 'Bekasi', cc: 'ID', tz: 'Asia/Jakarta' });
    expect(townLoc(searchTowns(towns, 'mekah')[0]).name).toBe('Makkah');
    expect(searchTowns(towns, 'tangsel')[0].n).toBe('South Tangerang');
    expect(searchTowns(towns, 'makassar')[0].tz).toBe('Asia/Makassar');
    expect(searchTowns(towns, 'london')[0].cc).toBe('GB');
    expect(searchTowns(towns, 'zzzzqx')).toEqual([]);
  });
  it('a GPS spot is named after the biggest town close by', () => {
    expect(nearestTown(towns, -6.21, 106.85)!.c.n).toBe('Jakarta');
    expect(nearestTown(towns, 51.51, -0.12)!.c.n).toBe('London');
  });
  it('far north (Tromsø in summer) still gives every prayer a time', () => {
    const t = tf(69.65, 18.96, new Date(Date.UTC(2026, 5, 21, 12)), 'auto', 'NO');
    for (const k of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) expect(isNaN(+t[k])).toBe(false);
  });
});
