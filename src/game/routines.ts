// Villagers' days: where each one goes and what they do there, by game hour.
// Pure data + lookup (unit tested). Prayer times and the iftar picnic still
// override the routine, as before.
import { VILLAGE_Y } from '../world/gen';

export type Activity = 'stand' | 'sell' | 'read' | 'sit' | 'chat' | 'water' | 'sleep' | 'garden';
export interface Place { x: number; z: number; yaw: number }
export const PLACES = {
  // behind the market counter, facing the plaza
  market: { x: -7.5, z: 8.6, yaw: Math.PI },
  // beside the well, facing it
  well: { x: 8.5, z: 5.6, yaw: 0 },
  // the plaza around the lantern posts
  plazaA: { x: -1.6, z: 1.6, yaw: Math.PI / 2 },
  plazaB: { x: 2.6, z: 1.6, yaw: -Math.PI / 2 },
  plazaC: { x: 0.5, z: 4.2, yaw: Math.PI },
  // in front of the masjid door
  porch: { x: 0.5, z: -11.4, yaw: 0 },
  // the flower bed by the masjid
  garden: { x: -6.5, z: -9.6, yaw: Math.PI },
  // just outside each front door
  ibrahimDoor: { x: -15.5, z: 16.4, yaw: 0 },
  aminahDoor: { x: 15.5, z: 16.4, yaw: 0 },
  // beside the beds, for the night
  ibrahimBed: { x: -16.2, z: 10.6, yaw: 0 },
  aminahBed: { x: 13.8, z: 10.6, yaw: 0 },
  yusufBed: { x: 16.6, z: 13.6, yaw: Math.PI / 2 },
} satisfies Record<string, Place>;
export type PlaceId = keyof typeof PLACES;

export interface Slot { from: number; to: number; at: PlaceId; act: Activity }
/** Day plans (hours 0–24, game clock). Night (sleep) is decided by the prayer times, see routineAt. */
export const ROUTINES: Record<'ustadz' | 'aminah' | 'yusuf', Slot[]> = {
  ustadz: [
    { from: 0, to: 8, at: 'ibrahimDoor', act: 'stand' },
    { from: 8, to: 10, at: 'plazaA', act: 'chat' },
    { from: 10, to: 12, at: 'porch', act: 'read' },
    { from: 12, to: 15, at: 'market', act: 'chat' },
    { from: 15, to: 17, at: 'garden', act: 'garden' },
    { from: 17, to: 24, at: 'ibrahimDoor', act: 'stand' },
  ],
  aminah: [
    { from: 0, to: 7, at: 'aminahDoor', act: 'stand' },
    { from: 7, to: 11, at: 'market', act: 'sell' },
    { from: 11, to: 13, at: 'well', act: 'water' },
    { from: 13, to: 17, at: 'market', act: 'sell' },
    { from: 17, to: 24, at: 'plazaC', act: 'chat' },
  ],
  yusuf: [
    { from: 0, to: 8, at: 'well', act: 'water' },
    { from: 8, to: 12, at: 'plazaB', act: 'sit' },
    { from: 12, to: 14, at: 'porch', act: 'read' },
    { from: 14, to: 17, at: 'plazaB', act: 'chat' },
    { from: 17, to: 24, at: 'garden', act: 'garden' },
  ],
};
const BEDS: Record<keyof typeof ROUTINES, PlaceId> = { ustadz: 'ibrahimBed', aminah: 'aminahBed', yusuf: 'yusufBed' };

/** Where `id` should be and what they're doing at `hour`. Asleep from an hour after Isha until Fajr. */
export function routineAt(id: string, hour: number, isha = 19.3, fajr = 4.6): { place: Place; at: PlaceId; act: Activity } {
  const plan = ROUTINES[id as keyof typeof ROUTINES];
  if (!plan) return { place: PLACES.plazaC, at: 'plazaC', act: 'stand' };
  const h = ((hour % 24) + 24) % 24;
  const bedtime = (isha + 1) % 24;
  const asleep = bedtime > fajr ? h >= bedtime || h < fajr : h >= bedtime && h < fajr;
  if (asleep) { const b = BEDS[id as keyof typeof ROUTINES]; return { place: PLACES[b], at: b, act: 'sleep' }; }
  const s = plan.find(s => h >= s.from && h < s.to) ?? plan[plan.length - 1];
  return { place: PLACES[s.at], at: s.at, act: s.act };
}

export const placeY = VILLAGE_Y + 1;

/** Friendly lines villagers say when you come close, by activity (ID, EN). */
export const GREETINGS: Record<Activity, [string, string][]> = {
  stand: [['Assalamu’alaikum! 😊', 'Assalamu’alaikum! 😊']],
  sell: [['Kurma segar! Mau? 🌴', 'Fresh dates! Want some? 🌴'], ['Assalamu’alaikum, Nak!', 'Assalamu’alaikum, dear!']],
  read: [['Sedang membaca buku 📖', 'Reading a good book 📖'], ['Yuk belajar huruf! ✨', 'Let’s learn letters! ✨']],
  sit: [['Duduk sebentar, kaki Kakek capek 😄', 'Grandpa is resting his legs 😄']],
  chat: [['Assalamu’alaikum! Sedang ngobrol 😊', 'Assalamu’alaikum! Just chatting 😊']],
  water: [['Menimba air untuk tanaman 💧', 'Fetching water for the plants 💧']],
  sleep: [['Zzz… 😴', 'Zzz… 😴']],
  garden: [['Bunganya cantik ya? 🌷', 'Aren’t the flowers pretty? 🌷']],
};
