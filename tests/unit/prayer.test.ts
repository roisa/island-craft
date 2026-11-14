import { describe, it, expect } from 'vitest';
import { timesFor, hijri, ramadhanStatus, placeOffset, fmtHour, METHODS, CITIES } from '../../src/game/prayer';

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
