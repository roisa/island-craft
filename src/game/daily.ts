// Today's three goals: small things a child can do in a few minutes each, so
// even a 5–10 minute session ends with something finished. Each goal gives
// coins; all three together give a bonus. New goals every real day.
import type { T2 } from '../i18n';
import type { Stats } from '../content';
import { hash3 } from '../world/noise';
import { B } from '../world/blocks';

export interface Goal { id: string; icon: string; name: T2; need: number; count: (s: Stats) => number }
const sum = (r: Record<number, number> | undefined, ids: number[]) => ids.reduce((a, id) => a + (r?.[id] || 0), 0);

export const GOALS: Goal[] = [
  { id: 'pet', icon: '💕', name: ['Sayangi 2 hewan', 'Pet 2 animals'], need: 2, count: s => s.petted },
  { id: 'wood', icon: '🪵', name: ['Kumpulkan 5 kayu', 'Collect 5 logs'], need: 5, count: s => sum(s.mined, [B.OAK_LOG, B.PINE_LOG, B.PALM_LOG, B.MANGROVE_LOG]) },
  { id: 'stone', icon: '🪨', name: ['Gali 5 batu', 'Dig 5 stones'], need: 5, count: s => sum(s.mined, [B.STONE, B.COBBLE]) },
  { id: 'build', icon: '🧱', name: ['Pasang 10 balok', 'Place 10 blocks'], need: 10, count: s => s.placed },
  { id: 'plant', icon: '🌱', name: ['Tanam 1 bibit', 'Plant 1 sapling'], need: 1, count: s => s.planted },
  { id: 'give', icon: '🤲', name: ['Beri makanan pada tetangga', 'Give food to a neighbour'], need: 1, count: s => s.gave },
  { id: 'pray', icon: '🕌', name: ['Sholat berjamaah 1 kali', 'Pray together once'], need: 1, count: s => s.jamaah },
  { id: 'fish', icon: '🎣', name: ['Tangkap 1 ikan', 'Catch 1 fish'], need: 1, count: s => s.fish || 0 },
  { id: 'cook', icon: '🍳', name: ['Masak 1 makanan', 'Cook 1 dish'], need: 1, count: s => s.cooked || 0 },
  { id: 'letter', icon: '🔤', name: ['Temukan 1 huruf hijaiyah', 'Find 1 hijaiyah letter'], need: 1, count: s => s.letters.length },
  { id: 'eat', icon: '🍎', name: ['Makan 1 kali (bismillah!)', 'Eat once (bismillah!)'], need: 1, count: s => s.ate },
  { id: 'quiz', icon: '✨', name: ['Jawab 3 tebak huruf', 'Answer 3 letter quiz questions'], need: 3, count: s => s.quiz },
];
export const GOAL_COINS = 30, ALL_BONUS = 100;

export interface Daily { day: string; goals: string[]; base: Record<string, number>; done: string[]; bonus?: boolean }

/** three different goals for a day; the same for the same world and day */
export function goalsFor(day: string, seed: number, letterLeft: boolean): string[] {
  let h = 0; for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) | 0;
  const pool = GOALS.filter(g => g.id !== 'letter' || letterLeft).map(g => g.id);
  const out: string[] = [];
  for (let k = 0; out.length < 3 && k < 50; k++) { const id = pool[Math.floor(hash3(h, k, 7, seed) * pool.length)]; if (!out.includes(id)) out.push(id); }
  return out;
}
/** start a new day (or keep today's), measuring progress from now */
export function dailyFor(cur: Daily | undefined, s: Stats, day: string, seed: number): Daily {
  if (cur && cur.day === day) return cur;
  const goals = goalsFor(day, seed, s.letters.length < 28);
  const base: Record<string, number> = {};
  for (const id of goals) base[id] = GOALS.find(g => g.id === id)!.count(s);
  return { day, goals, base, done: [] };
}
export const progress = (d: Daily, s: Stats, id: string) => {
  const g = GOALS.find(g => g.id === id)!;
  return Math.max(0, Math.min(g.need, g.count(s) - (d.base[id] ?? 0)));
};
