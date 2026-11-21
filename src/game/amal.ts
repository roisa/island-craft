// The Amal Book: good deeds the child does in the game, each linked to what
// Rasulullah ﷺ taught about it. The numbers come from the hadith itself
// (×27 for praying together, ×10 for each letter of the Qur'an); they are
// shown as his words, not as a score: the real reward is with Allah.
// Deeds also fill the village's sadaqah jariyah projects (see projects.ts).
import type { T2 } from '../i18n';

export type ProjectKind = 'kind' | 'learn' | 'worship';

export interface Deed {
  id: string; icon: string; name: T2;
  /** the multiplier the hadith itself mentions, shown as "×27" */
  times?: number;
  /** what Rasulullah ﷺ (or the Qur'an) says, for a child */
  hadith: T2; src: string;
  /** which village project it helps build */
  kind: ProjectKind;
}

export const DEEDS: Deed[] = [
  { id: 'jamaah', icon: '🕌', name: ['Sholat berjamaah', 'Praying together'], times: 27, kind: 'worship',
    hadith: ['Sholat berjamaah lebih utama 27 derajat daripada sholat sendirian.', 'Praying together is 27 times better than praying alone.'], src: 'HR. Bukhari 645, Muslim 650' },
  { id: 'steps', icon: '👣', name: ['Langkah ke masjid', 'Steps to the masjid'], kind: 'worship',
    hadith: ['Setiap langkah menuju masjid mengangkat satu derajat dan menghapus satu kesalahan.', 'Each step to the masjid raises you a degree and wipes away a mistake.'], src: 'HR. Muslim 666' },
  { id: 'wudu', icon: '💧', name: ['Berwudhu', 'Making wudu'], kind: 'worship',
    hadith: ['Saat berwudhu, kesalahan-kesalahan ikut keluar bersama air.', 'When you make wudu, mistakes leave with the water.'], src: 'HR. Muslim 244' },
  { id: 'dhikr', icon: '📿', name: ['Berdzikir', 'Remembering Allah'], kind: 'worship',
    hadith: ['Dua kalimat ringan di lisan, berat di timbangan: Subhanallahi wa bihamdihi, Subhanallahil ‘azhim.', 'Two phrases light on the tongue, heavy on the scale: Subhanallahi wa bihamdihi, Subhanallahil ‘azhim.'], src: 'HR. Bukhari 6406, Muslim 2694' },
  { id: 'bismillah', icon: '🍽️', name: ['Bismillah & Alhamdulillah', 'Bismillah & Alhamdulillah'], kind: 'worship',
    hadith: ['“Ucapkan bismillah, makanlah dengan tangan kanan, dan makan yang dekat denganmu.”', '“Say bismillah, eat with your right hand, and eat from what is near you.”'], src: 'HR. Bukhari 5376, Muslim 2022' },
  { id: 'sleep', icon: '🌙', name: ['Doa sebelum tidur', 'Du’a before sleeping'], kind: 'worship',
    hadith: ['Rasulullah ﷺ berdoa sebelum tidur: “Bismika Allahumma amutu wa ahya.”', 'Before sleeping the Prophet ﷺ said: “Bismika Allahumma amutu wa ahya.”'], src: 'HR. Bukhari 6324' },
  { id: 'letter', icon: '🔤', name: ['Belajar huruf Al-Qur’an', 'Learning the Qur’an’s letters'], times: 10, kind: 'learn',
    hadith: ['Siapa membaca satu huruf dari Al-Qur’an, baginya satu kebaikan, dan satu kebaikan dilipatkan sepuluh. Alif Lam Mim bukan satu huruf.', 'Whoever reads a letter of the Qur’an gets a good deed, and a good deed is multiplied by ten. Alif Lam Mim is not one letter.'], src: 'HR. Tirmidzi 2910' },
  { id: 'learn', icon: '📚', name: ['Menuntut ilmu', 'Seeking knowledge'], kind: 'learn',
    hadith: ['Siapa menempuh jalan untuk mencari ilmu, Allah mudahkan baginya jalan ke surga.', 'Whoever walks a path to seek knowledge, Allah makes easy for them a path to Jannah.'], src: 'HR. Muslim 2699' },
  { id: 'plant', icon: '🌱', name: ['Menanam pohon', 'Planting trees'], kind: 'kind',
    hadith: ['Tidaklah seorang Muslim menanam pohon, lalu dimakan manusia atau hewan, kecuali menjadi sedekah baginya.', 'When a Muslim plants a tree and a person or animal eats from it, it is charity for them.'], src: 'HR. Bukhari 2320, Muslim 1552' },
  { id: 'animal', icon: '🐾', name: ['Sayang binatang', 'Kindness to animals'], kind: 'kind',
    hadith: ['Seorang laki-laki memberi minum anjing yang kehausan, lalu Allah mengampuninya. Pada setiap makhluk hidup ada pahala.', 'A man gave water to a thirsty dog and Allah forgave him. There is reward in kindness to every living thing.'], src: 'HR. Bukhari 2363' },
  { id: 'share', icon: '🤲', name: ['Berbagi makanan', 'Sharing food'], kind: 'kind',
    hadith: ['Sedekah tidak mengurangi harta.', 'Charity never makes your wealth less.'], src: 'HR. Muslim 2588' },
  { id: 'iftar', icon: '🌇', name: ['Memberi buka puasa', 'Iftar together'], kind: 'kind',
    hadith: ['Siapa memberi makan orang yang berpuasa, ia mendapat pahala seperti orang itu.', 'Whoever gives food to a fasting person gets the same reward as them.'], src: 'HR. Tirmidzi 807' },
  { id: 'salam', icon: '👋', name: ['Mengucap salam', 'Saying salam'], kind: 'kind',
    hadith: ['“Sebarkanlah salam di antara kalian.”', '“Spread salam among yourselves.”'], src: 'HR. Muslim 54' },
  { id: 'smile', icon: '😊', name: ['Tersenyum', 'Smiling'], kind: 'kind',
    hadith: ['Senyummu kepada saudaramu adalah sedekah.', 'Your smile to your brother or sister is charity.'], src: 'HR. Tirmidzi 1956' },
  { id: 'path', icon: '🪨', name: ['Menyingkirkan halangan di jalan', 'Clearing the path'], kind: 'kind',
    hadith: ['Menyingkirkan gangguan dari jalan adalah sedekah.', 'Removing something harmful from the path is charity.'], src: 'HR. Bukhari 2989, Muslim 1009' },
  { id: 'water', icon: '🚰', name: ['Memberi minum', 'Giving water'], kind: 'kind',
    hadith: ['Sa’ad bertanya sedekah apa yang paling baik. Rasulullah ﷺ menjawab: “Air.”', 'Sa’d asked which charity is best. The Prophet ﷺ answered: “Water.”'], src: 'HR. Abu Dawud 1679' },
  { id: 'sadaqah', icon: '💰', name: ['Sedekah', 'Giving charity'], kind: 'kind',
    hadith: ['Sedekah tidak mengurangi harta.', 'Charity never makes your wealth less.'], src: 'HR. Muslim 2588' },
  { id: 'honest', icon: '🤝', name: ['Jujur', 'Being honest'], kind: 'kind',
    hadith: ['Kejujuran membawa kepada kebaikan, dan kebaikan membawa ke surga.', 'Honesty leads to goodness, and goodness leads to Jannah.'], src: 'HR. Bukhari 6094, Muslim 2607' },
];
export const deed = (id: string) => DEEDS.find(d => d.id === id);

/** what the book stores: totals, today, and how much went into each project */
export interface AmalLog { total: Record<string, number>; today: Record<string, number>; day: string; first: string[] }
export const newLog = (): AmalLog => ({ total: {}, today: {}, day: '', first: [] });

/** record one good deed; true when it's the first time ever (show its hadith) */
export function record(log: AmalLog, id: string, day: string, n = 1): boolean {
  if (!deed(id)) return false;
  if (log.day !== day) { log.day = day; log.today = {}; }
  log.total[id] = (log.total[id] || 0) + n;
  log.today[id] = (log.today[id] || 0) + n;
  if (log.first.includes(id)) return false;
  log.first.push(id);
  return true;
}
/** all good deeds of one kind (for the village projects) */
export const kindTotal = (log: AmalLog, kind: ProjectKind) => DEEDS.filter(d => d.kind === kind).reduce((a, d) => a + (log.total[d.id] || 0), 0);
