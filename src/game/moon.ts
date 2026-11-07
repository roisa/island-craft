// The real moon tonight, and simple star pictures to join up at the telescope.
// The phase comes from the mean length of a lunar month counted from a known
// new moon, which is within about half a day of the true phase: plenty for
// showing a child whether tonight is a thin crescent or a full moon.
import type { T2 } from '../i18n';

/** average time from one new moon to the next */
export const SYNODIC = 29.530588853;
/** a known new moon: 6 January 2000, 18:14 UTC */
const REF_NEW = Date.UTC(2000, 0, 6, 18, 14);

/** days since the last new moon (0 … 29.5) */
export function moonAge(d: Date): number {
  const days = (d.getTime() - REF_NEW) / 86400000;
  return ((days % SYNODIC) + SYNODIC) % SYNODIC;
}
/** 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter */
export const moonPhase = (d: Date) => moonAge(d) / SYNODIC;
/** how much of the moon is lit, 0 … 1 */
export const moonLit = (d: Date) => (1 - Math.cos(moonPhase(d) * Math.PI * 2)) / 2;
/** which of the 8 named phases */
export const phaseIndex = (p: number) => Math.floor(p * 8 + 0.5) % 8;
/** days until the next new moon (the new crescent shows a day or so after) */
export const daysToNewMoon = (d: Date) => SYNODIC - moonAge(d);

export const PHASES: { name: T2; icon: string }[] = [
  { name: ['Bulan baru', 'New moon'], icon: '🌑' },
  { name: ['Bulan sabit (hilal)', 'Crescent (hilal)'], icon: '🌒' },
  { name: ['Bulan separuh', 'First quarter'], icon: '🌓' },
  { name: ['Bulan cembung', 'Waxing gibbous'], icon: '🌔' },
  { name: ['Bulan purnama', 'Full moon'], icon: '🌕' },
  { name: ['Bulan cembung menyusut', 'Waning gibbous'], icon: '🌖' },
  { name: ['Bulan separuh akhir', 'Last quarter'], icon: '🌗' },
  { name: ['Bulan sabit akhir', 'Waning crescent'], icon: '🌘' },
];

/**
 * Paint the moon at phase p (0..1) as seen from the northern half of the
 * world: a growing moon is lit on the right.
 */
export function drawMoon(x: CanvasRenderingContext2D, cx: number, cy: number, r: number, p: number, light = '#FFF4C8', dark = 'rgba(70,82,120,0.55)') {
  const k = Math.cos(p * Math.PI * 2), waxing = p < 0.5;
  // paint on a scratch canvas, so erasing never touches what is already drawn underneath
  const c = document.createElement('canvas'); c.width = c.height = Math.ceil(r * 2 + 4);
  const m = c.getContext('2d')!, o = r + 2;
  m.fillStyle = light; m.beginPath(); m.arc(o, o, r, -Math.PI / 2, Math.PI / 2, !waxing); m.closePath(); m.fill();
  // the terminator: an ellipse that carves the lit half into a crescent, or adds to it for a gibbous moon
  m.beginPath(); m.ellipse(o, o, r * Math.abs(k), r, 0, 0, Math.PI * 2);
  if (k > 0) { m.globalCompositeOperation = 'destination-out'; m.fillStyle = '#000'; } else m.fillStyle = light;
  m.fill();
  x.save();
  x.fillStyle = dark; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  x.drawImage(c, cx - o, cy - o);
  x.restore();
}

// ---- star pictures ------------------------------------------------------
export interface Star { name: string; x: number; y: number; big?: boolean }
export interface Constellation {
  id: string; icon: string; name: T2;
  stars: Star[];
  /** the order to tap the stars (indexes into stars) */
  path: number[];
  fact: T2;
}
export const CONSTELLATIONS: Constellation[] = [
  {
    id: 'triangle', icon: '🔺', name: ['Segitiga Musim Panas', 'The Summer Triangle'],
    stars: [{ name: 'Vega', x: 30, y: 22, big: true }, { name: 'Deneb', x: 74, y: 16, big: true }, { name: 'Altair', x: 52, y: 78, big: true }],
    path: [0, 1, 2, 0],
    fact: ['Ketiga nama bintang ini dari bahasa Arab! Altair dari “at-tha’ir” (yang terbang), Deneb dari “dzanab” (ekor), Vega dari “al-waqi’” (yang menukik).', 'All three names come from Arabic! Altair is from “al-ṭā’ir” (the flyer), Deneb from “dhanab” (tail) and Vega from “al-wāqi‘” (the swooping one).'],
  },
  {
    id: 'orion', icon: '🏹', name: ['Si Pemburu (Al-Jabbar)', 'The Hunter (Al-Jabbar)'],
    stars: [{ name: 'Betelgeuse', x: 28, y: 18, big: true }, { name: 'Bellatrix', x: 64, y: 22 }, { name: 'Mintaka', x: 56, y: 46 }, { name: 'Rigel', x: 70, y: 80, big: true }, { name: 'Saiph', x: 32, y: 80 }, { name: 'Alnitak', x: 42, y: 52 }, { name: 'Alnilam', x: 49, y: 49 }],
    path: [0, 1, 2, 6, 5, 4, 3, 2],
    fact: ['Rigel dari kata Arab “rijl” (kaki), dan Betelgeuse dari “yad al-jauza’” (tangan Al-Jauza’). Tiga bintang di tengah disebut sabuk.', 'Rigel comes from the Arabic “rijl” (foot) and Betelgeuse from “yad al-jawzā’” (the hand of al-Jawzā’). The three stars in the middle are its belt.'],
  },
  {
    id: 'dipper', icon: '🥄', name: ['Biduk (Banat Na’sy)', 'The Big Dipper (Banāt Na‘sh)'],
    stars: [{ name: 'Alkaid', x: 10, y: 40 }, { name: 'Mizar', x: 25, y: 28 }, { name: 'Alioth', x: 41, y: 25 }, { name: 'Megrez', x: 57, y: 29 }, { name: 'Dubhe', x: 82, y: 20, big: true }, { name: 'Merak', x: 84, y: 46 }, { name: 'Phecda', x: 62, y: 52 }],
    path: [0, 1, 2, 3, 4, 5, 6, 3],
    fact: ['Bintang-bintangnya bernama Arab: Dubhe artinya “beruang”, Alkaid artinya “pemimpin”. Dua bintang di ujung (Dubhe & Merak) menunjuk ke Bintang Utara.', 'Its stars have Arabic names: Dubhe means “bear” and Alkaid means “the leader”. The two end stars (Dubhe and Merak) point to the North Star.'],
  },
];
