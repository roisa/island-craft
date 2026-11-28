// The Iqro journey: what comes after finding all 28 letters, step by step the
// way children learn to read the Qur'an (Iqro / Qaida):
//   Stage 1  the 28 letters (the shrines) ✓
//   Stage 2  harakat: fathah, kasrah, dhammah — ba, bi, bu
//   Stage 3  tanwin (ban, bin, bun) and long vowels (baa, bii, buu)
//   Stage 4  reading words, syllable by syllable
//   Stage 5  short surahs, ayah by ayah, ending with Al-Fatihah
// then review lessons, round and round.
//
// Each lesson waits in the world as a glowing book (📖); the compass points to
// it. Open it: listen to each sound, then a little listening quiz.
import { LETTERS } from '../world/blocks';
import type { T2 } from '../i18n';

export type Mark = 'a' | 'i' | 'u' | 'an' | 'in' | 'un' | 'aa' | 'ii' | 'uu';
export interface Syll { ar: string; lat: string; letter: number }
export interface IqroWord { ar: string; parts: Syll[]; lat: string; mean: T2; icon: string }
export interface Ayah { ar: string; lat: string; mean: T2 }
export interface Surah { id: string; name: string; mean: T2; ayat: Ayah[] }
export type Lesson =
  | { kind: 'syll'; stage: 2 | 3; mark: Mark; items: Syll[] }
  | { kind: 'word'; stage: 4; words: IqroWord[] }
  | { kind: 'surah'; stage: 5; surah: Surah };

const MARK: Record<Mark, string> = { a: 'َ', i: 'ِ', u: 'ُ', an: 'ً', in: 'ٍ', un: 'ٌ', aa: 'َا', ii: 'ِي', uu: 'ُو' };
/** what each mark is called, and what it does */
export const MARK_INFO: Record<Mark, { name: string; how: T2 }> = {
  a: { name: 'Fathah', how: ['Garis miring di atas huruf: dibaca “a”', 'A little line above the letter: say “a”'] },
  i: { name: 'Kasrah', how: ['Garis miring di bawah huruf: dibaca “i”', 'A little line below the letter: say “i”'] },
  u: { name: 'Dhammah', how: ['Seperti huruf wau kecil di atas: dibaca “u”', 'Like a tiny waw on top: say “u”'] },
  an: { name: 'Tanwin fathah', how: ['Dua garis di atas: dibaca “an”', 'Two lines on top: say “an”'] },
  in: { name: 'Tanwin kasrah', how: ['Dua garis di bawah: dibaca “in”', 'Two lines below: say “in”'] },
  un: { name: 'Tanwin dhammah', how: ['Dua dhammah: dibaca “un”', 'Two dhammahs: say “un”'] },
  aa: { name: 'Mad (a panjang)', how: ['Fathah lalu alif: dibaca panjang “aa”, dua ketukan', 'Fathah then alif: say a long “aa”, two beats'] },
  ii: { name: 'Mad (i panjang)', how: ['Kasrah lalu ya: dibaca panjang “ii”', 'Kasrah then ya: say a long “ii”'] },
  uu: { name: 'Mad (u panjang)', how: ['Dhammah lalu wau: dibaca panjang “uu”', 'Dhammah then waw: say a long “uu”'] },
};
const ALIF: Record<Mark, string> = { a: 'أَ', i: 'إِ', u: 'أُ', an: 'أً', in: 'إٍ', un: 'أٌ', aa: 'آ', ii: 'إِي', uu: 'أُو' };

/** a letter with a mark: its Arabic and how it's read */
export function syll(letter: number, m: Mark): Syll {
  const L = LETTERS[letter];
  const ar = letter === 0 ? ALIF[m] : L.g + MARK[m];
  const lat = letter === 0 ? m : L.lat === "'" ? "'" + m : L.lat + m;
  return { ar, lat, letter };
}
const group = (k: number, n: number) => Array.from({ length: n }, (_, i) => k * n + i);

/** the words of stage 4 (fathah, kasrah and dhammah together), split into the syllables you read */
const W = (ar: string, parts: [number, Mark][], mean: T2, icon: string): IqroWord => {
  const ps = parts.map(([l, m]) => syll(l, m));
  return { ar, parts: ps, lat: ps.map(p => p.lat).join('-'), mean, icon };
};
export const WORDS: IqroWord[] = [
  W('أَكَلَ', [[0, 'a'], [21, 'a'], [22, 'a']], ['makan', 'ate'], '🍽️'),
  W('كَتَبَ', [[21, 'a'], [2, 'a'], [1, 'a']], ['menulis', 'wrote'], '✍️'),
  W('جَلَسَ', [[4, 'a'], [22, 'a'], [11, 'a']], ['duduk', 'sat'], '🪑'),
  W('ذَهَبَ', [[8, 'a'], [26, 'a'], [1, 'a']], ['pergi', 'went'], '🚶'),
  W('فَتَحَ', [[19, 'a'], [2, 'a'], [5, 'a']], ['membuka', 'opened'], '🚪'),
  W('خَلَقَ', [[6, 'a'], [22, 'a'], [20, 'a']], ['menciptakan', 'created'], '🌍'),
  W('شَرِبَ', [[12, 'a'], [9, 'i'], [1, 'a']], ['minum', 'drank'], '🥛'),
  W('سَمِعَ', [[11, 'a'], [23, 'i'], [17, 'a']], ['mendengar', 'heard'], '👂'),
  W('عَمِلَ', [[17, 'a'], [23, 'i'], [22, 'a']], ['bekerja', 'worked'], '🛠️'),
  W('رَجَعَ', [[9, 'a'], [4, 'a'], [17, 'a']], ['kembali', 'came back'], '↩️'),
  W('حَسُنَ', [[5, 'a'], [11, 'u'], [24, 'a']], ['menjadi baik', 'became good'], '🌟'),
  W('كَرُمَ', [[21, 'a'], [9, 'u'], [23, 'a']], ['menjadi mulia', 'became noble'], '👑'),
];

/** short surahs to read and learn by heart, ayah by ayah */
export const SURAHS: Surah[] = [
  {
    id: 'kautsar', name: 'Al-Kautsar', mean: ['Nikmat yang banyak', 'Abundance'], ayat: [
      { ar: 'إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ', lat: 'Innā a‘ṭainākal-kauṡar', mean: ['Sungguh, Kami telah memberimu nikmat yang banyak.', 'Indeed, We have given you abundance.'] },
      { ar: 'فَصَلِّ لِرَبِّكَ وَانْحَرْ', lat: 'Fa ṣalli lirabbika wanḥar', mean: ['Maka sholatlah karena Tuhanmu, dan berkurbanlah.', 'So pray to your Lord and sacrifice.'] },
      { ar: 'إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ', lat: 'Inna syāni’aka huwal-abtar', mean: ['Sungguh, orang yang membencimu dialah yang terputus.', 'Indeed, your enemy is the one cut off.'] },
    ],
  },
  {
    id: 'ikhlas', name: 'Al-Ikhlas', mean: ['Memurnikan keesaan Allah', 'Sincerity'], ayat: [
      { ar: 'قُلْ هُوَ اللّٰهُ أَحَدٌ', lat: 'Qul huwallāhu aḥad', mean: ['Katakanlah: Dialah Allah, Yang Maha Esa.', 'Say: He is Allah, the One.'] },
      { ar: 'اللّٰهُ الصَّمَدُ', lat: 'Allāhuṣ-ṣamad', mean: ['Allah tempat meminta segala sesuatu.', 'Allah, the Eternal Refuge.'] },
      { ar: 'لَمْ يَلِدْ وَلَمْ يُولَدْ', lat: 'Lam yalid wa lam yūlad', mean: ['Dia tidak beranak dan tidak pula diperanakkan.', 'He neither begets nor is born.'] },
      { ar: 'وَلَمْ يَكُنْ لَّهُ كُفُوًا أَحَدٌ', lat: 'Wa lam yakul lahū kufuwan aḥad', mean: ['Dan tidak ada sesuatu pun yang setara dengan Dia.', 'Nor is there any equivalent to Him.'] },
    ],
  },
  {
    id: 'asr', name: 'Al-‘Asr', mean: ['Masa', 'Time'], ayat: [
      { ar: 'وَالْعَصْرِ', lat: 'Wal-‘aṣr', mean: ['Demi masa.', 'By time.'] },
      { ar: 'إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ', lat: 'Innal-insāna lafī khusr', mean: ['Sungguh, manusia berada dalam kerugian,', 'Indeed, mankind is in loss,'] },
      { ar: 'إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ', lat: 'Illal-lażīna āmanū wa ‘amiluṣ-ṣāliḥāti wa tawāṣau bil-ḥaqqi wa tawāṣau biṣ-ṣabr', mean: ['kecuali orang-orang yang beriman dan beramal saleh, serta saling menasihati untuk kebenaran dan kesabaran.', 'except those who believe and do good, and urge one another to the truth and to patience.'] },
    ],
  },
  {
    id: 'falaq', name: 'Al-Falaq', mean: ['Waktu subuh', 'The Daybreak'], ayat: [
      { ar: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ', lat: 'Qul a‘ūżu birabbil-falaq', mean: ['Katakanlah: Aku berlindung kepada Tuhan yang menguasai subuh,', 'Say: I seek refuge in the Lord of daybreak,'] },
      { ar: 'مِنْ شَرِّ مَا خَلَقَ', lat: 'Min syarri mā khalaq', mean: ['dari kejahatan makhluk yang Dia ciptakan,', 'from the evil of what He created,'] },
      { ar: 'وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ', lat: 'Wa min syarri gāsiqin iżā waqab', mean: ['dan dari kejahatan malam apabila telah gelap gulita,', 'and from the evil of the night when it grows dark,'] },
      { ar: 'وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ', lat: 'Wa min syarrin-naffāṡāti fil-‘uqad', mean: ['dan dari kejahatan perempuan-perempuan penyihir yang meniup pada buhul-buhul,', 'and from the evil of those who blow on knots,'] },
      { ar: 'وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ', lat: 'Wa min syarri ḥāsidin iżā ḥasad', mean: ['dan dari kejahatan orang yang dengki apabila dia dengki.', 'and from the evil of an envier when he envies.'] },
    ],
  },
  {
    id: 'nas', name: 'An-Nas', mean: ['Manusia', 'Mankind'], ayat: [
      { ar: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ', lat: 'Qul a‘ūżu birabbin-nās', mean: ['Katakanlah: Aku berlindung kepada Tuhannya manusia,', 'Say: I seek refuge in the Lord of mankind,'] },
      { ar: 'مَلِكِ النَّاسِ', lat: 'Malikin-nās', mean: ['Raja manusia,', 'the King of mankind,'] },
      { ar: 'إِلٰهِ النَّاسِ', lat: 'Ilāhin-nās', mean: ['sembahan manusia,', 'the God of mankind,'] },
      { ar: 'مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ', lat: 'Min syarril-waswāsil-khannās', mean: ['dari kejahatan bisikan setan yang bersembunyi,', 'from the evil of the whisperer who withdraws,'] },
      { ar: 'الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ', lat: 'Allażī yuwaswisu fī ṣudūrin-nās', mean: ['yang membisikkan kejahatan ke dalam dada manusia,', 'who whispers into the hearts of mankind,'] },
      { ar: 'مِنَ الْجِنَّةِ وَالنَّاسِ', lat: 'Minal-jinnati wan-nās', mean: ['dari golongan jin dan manusia.', 'from among the jinn and mankind.'] },
    ],
  },
  {
    id: 'fatihah', name: 'Al-Fatihah', mean: ['Pembukaan', 'The Opening'], ayat: [
      { ar: 'بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ', lat: 'Bismillāhir-raḥmānir-raḥīm', mean: ['Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.', 'In the name of Allah, the Most Gracious, the Most Merciful.'] },
      { ar: 'الْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِينَ', lat: 'Al-ḥamdu lillāhi rabbil-‘ālamīn', mean: ['Segala puji bagi Allah, Tuhan seluruh alam,', 'All praise is for Allah, Lord of all the worlds,'] },
      { ar: 'الرَّحْمٰنِ الرَّحِيمِ', lat: 'Ar-raḥmānir-raḥīm', mean: ['Yang Maha Pengasih, Maha Penyayang,', 'the Most Gracious, the Most Merciful,'] },
      { ar: 'مَالِكِ يَوْمِ الدِّينِ', lat: 'Māliki yaumid-dīn', mean: ['Pemilik hari pembalasan.', 'Master of the Day of Judgement.'] },
      { ar: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', lat: 'Iyyāka na‘budu wa iyyāka nasta‘īn', mean: ['Hanya kepada Engkaulah kami menyembah dan hanya kepada Engkaulah kami memohon pertolongan.', 'You alone we worship, and You alone we ask for help.'] },
      { ar: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', lat: 'Ihdinaṣ-ṣirāṭal-mustaqīm', mean: ['Tunjukilah kami jalan yang lurus,', 'Guide us to the straight path,'] },
      { ar: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ', lat: 'Ṣirāṭal-lażīna an‘amta ‘alaihim gairil-magḍūbi ‘alaihim wa laḍ-ḍāllīn', mean: ['yaitu jalan orang-orang yang telah Engkau beri nikmat, bukan jalan mereka yang dimurkai dan bukan pula jalan mereka yang sesat.', 'the path of those You have blessed, not of those who earned anger, nor of those who went astray.'] },
    ],
  },
];

/** the whole journey, in order */
export function lessons(): Lesson[] {
  const out: Lesson[] = [];
  // stage 2: four groups of 7 letters, each with fathah, kasrah and dhammah (ba, bi, bu)
  for (let k = 0; k < 4; k++) for (const m of ['a', 'i', 'u'] as Mark[]) out.push({ kind: 'syll', stage: 2, mark: m, items: group(k, 7).map(l => syll(l, m)) });
  // stage 3: tanwin and long vowels, on each half of the alphabet
  for (const m of ['an', 'in', 'un', 'aa', 'ii', 'uu'] as Mark[]) for (let k = 0; k < 2; k++) out.push({ kind: 'syll', stage: 3, mark: m, items: group(k, 14).filter((_, i) => i % 2 === (m.length === 2 && m[0] === m[1] ? 1 : 0)).map(l => syll(l, m)) });
  // stage 4: words, three at a time
  for (let k = 0; k < WORDS.length; k += 3) out.push({ kind: 'word', stage: 4, words: WORDS.slice(k, k + 3) });
  // stage 5: the surahs
  for (const s of SURAHS) out.push({ kind: 'surah', stage: 5, surah: s });
  return out;
}
export const STAGES: { n: number; icon: string; name: T2 }[] = [
  { n: 1, icon: '🔤', name: ['Huruf hijaiyah', 'The letters'] },
  { n: 2, icon: '✏️', name: ['Harakat: a, i, u', 'Vowel marks: a, i, u'] },
  { n: 3, icon: '〰️', name: ['Tanwin & bacaan panjang', 'Tanwin & long vowels'] },
  { n: 4, icon: '📝', name: ['Membaca kata', 'Reading words'] },
  { n: 5, icon: '📖', name: ['Surat pendek', 'Short surahs'] },
];
/** the lesson for a step of the journey; past the end, review lessons go round and round */
export function lessonAt(n: number): { lesson: Lesson; index: number; review: boolean } {
  const all = lessons();
  if (n < all.length) return { lesson: all[n], index: n, review: false };
  const i = ((n - all.length) * 7) % all.length;
  return { lesson: all[i], index: i, review: true };
}
/** three choices for a listening question: the right one and two others, shuffled */
export function choices<T>(pool: T[], right: T, roll: () => number): T[] {
  const others = pool.filter(x => x !== right);
  const pick: T[] = [right];
  while (pick.length < Math.min(3, pool.length)) { const o = others.splice(Math.floor(roll() * others.length), 1)[0]; pick.push(o); }
  for (let i = pick.length - 1; i > 0; i--) { const j = Math.floor(roll() * (i + 1)); [pick[i], pick[j]] = [pick[j], pick[i]]; }
  return pick;
}
