// Game content: gentle quests, the 30-day Ramadhan calendar and daily du'a cards.
// NOTE for the Baby Mo team: please have the Arabic texts and religious wording
// reviewed by a teacher before release.
import { B, I } from './world/blocks';
import type { T2 } from './i18n';
import { SEA } from './world/gen';

export interface Stats {
  mined: Record<number, number>; crafted: Record<number, number>; placed: number; placedIds: Record<number, number>;
  letters: number[]; petted: number; milk: number; eggs: number; wool: number; gave: number; planted: number;
  slept: number; jamaah: number; iftar: number; sahur: number; ate: number; biomes: string[]; talked: Record<string, boolean>;
  maxY: number; minY: number; quiz: number; days: string[]; prayersSeen: number;
  stars: number; tut?: number;
  pet?: { kind: string; name: string }; chests?: number; built?: number; rides?: number;
}
export const newStats = (): Stats => ({
  mined: {}, crafted: {}, placed: 0, placedIds: {}, letters: [], petted: 0, milk: 0, eggs: 0, wool: 0, gave: 0, planted: 0,
  slept: 0, jamaah: 0, iftar: 0, sahur: 0, ate: 0, biomes: [], talked: {}, maxY: 0, minY: 999, quiz: 0, days: [], prayersSeen: 0, stars: 0,
});

const sum = (r: Record<number, number>, ids: number[]) => ids.reduce((a, id) => a + (r[id] || 0), 0);

export interface Quest {
  id: string; icon: string; title: T2; desc: T2;
  goal: (s: Stats) => [number, number];
  reward: [number, number][]; sticker: string;
}

export const QUESTS: Quest[] = [
  { id: 'hello', icon: '👋', title: ['Kenalan dengan Baby Mo', 'Say hi to Baby Mo'], desc: ['Ketuk Baby Mo (tombol ✋ Pakai) untuk menyapanya.', 'Tap Baby Mo (✋ Use button) to say hello.'], goal: s => [s.talked.mo ? 1 : 0, 1], reward: [[I.APPLE, 2]], sticker: '🧒' },
  { id: 'wood', icon: '🪵', title: ['Kumpulkan kayu', 'Collect wood'], desc: ['Tahan ⛏️ pada batang pohon sampai lepas. Kumpulkan 4 kayu.', 'Hold ⛏️ on a tree trunk until it pops off. Collect 4 logs.'], goal: s => [Math.min(4, sum(s.mined, [B.OAK_LOG, B.PINE_LOG, B.PALM_LOG])), 4], reward: [[B.PLANKS, 4]], sticker: '🌳' },
  { id: 'pick', icon: '⛏️', title: ['Buat beliung kayu', 'Make a wooden pickaxe'], desc: ['Ketuk meja kerja di alun-alun desa, lalu pilih resepnya di 🔨 Buat.', 'Tap the workbench in the village square, then pick the recipe in 🔨 Craft.'], goal: s => [s.crafted[I.WOOD_PICK] ? 1 : 0, 1], reward: [[I.STICK, 4]], sticker: '🛠️' },
  { id: 'letter1', icon: '🔤', title: ['Temukan huruf pertamamu', 'Find your first letter'], desc: ['Ikuti kompas emas di atas layar menuju kuil huruf.', 'Follow the golden compass at the top to a letter shrine.'], goal: s => [Math.min(1, s.letters.length), 1], reward: [[B.LANTERN, 2]], sticker: '✨' },
  { id: 'ustadz', icon: '📖', title: ['Belajar dengan Ustadz Hasan', 'Learn with Ustadz Hasan'], desc: ['Ustadz Hasan tinggal di rumah kiri desa. Sapa beliau!', 'Ustadz Hasan lives in the left house of the village. Say hi!'], goal: s => [s.talked.ustadz ? 1 : 0, 1], reward: [[B.BOOKSHELF, 1]], sticker: '👳' },
  { id: 'pet', icon: '🐑', title: ['Sayangi hewan', 'Be kind to animals'], desc: ['Elus 3 hewan dengan tombol ✋. Hewan senang disayang!', 'Pet 3 animals with ✋. Animals love kindness!'], goal: s => [Math.min(3, s.petted), 3], reward: [[B.WOOL_WHITE, 3]], sticker: '💕' },
  { id: 'adopt', icon: '💕', title: ['Sahabat hewan', 'An animal friend'], desc: ['Pegang kurma atau apel, lalu ketuk hewan untuk menjadikannya sahabatmu.', 'Hold dates or an apple, then tap an animal to make it your friend.'], goal: s => [s.pet ? 1 : 0, 1], reward: [[I.APPLE, 3]], sticker: '🐾' },
  { id: 'dates', icon: '🌴', title: ['Petik kurma', 'Pick dates'], desc: ['Kurma tumbuh di daun pohon kurma (di desa & oasis gurun). Kumpulkan 5.', 'Dates grow in date-palm leaves (village & desert oases). Collect 5.'], goal: s => [Math.min(5, s.mined[I.DATES] || 0), 5], reward: [[I.DATES, 3]], sticker: '🌴' },
  { id: 'milk', icon: '🥛', title: ['Ambil susu', 'Get some milk'], desc: ['Sapi dan kambing memberi susu kalau disayang. Ketuk dengan ✋.', 'Cows and goats share milk when you are gentle. Tap with ✋.'], goal: s => [Math.min(1, s.milk), 1], reward: [[I.MILK, 1]], sticker: '🐄' },
  { id: 'takjil', icon: '🍽️', title: ['Siapkan takjil', 'Prepare iftar snacks'], desc: ['Buat "Takjil Kurma & Susu" dari 3 kurma + 1 susu.', 'Make a "Dates & Milk" plate from 3 dates + 1 milk.'], goal: s => [s.crafted[I.TAKJIL] ? 1 : 0, 1], reward: [[I.APPLE, 2]], sticker: '🍽️' },
  { id: 'sedekah', icon: '🤲', title: ['Berbagi itu indah', 'Sharing is beautiful'], desc: ['Pegang makanan, lalu berikan ke warga desa dengan ✋.', 'Hold some food and give it to a villager with ✋.'], goal: s => [Math.min(1, s.gave), 1], reward: [[B.GOLD_TILE, 4]], sticker: '🤲' },
  { id: 'iftar', icon: '🌇', title: ['Berbuka puasa', 'Break the fast'], desc: ['Saat Maghrib di dalam game, makan kurma atau takjil.', 'At Maghrib in the game, eat dates or a takjil plate.'], goal: s => [Math.min(1, s.iftar), 1], reward: [[B.LANTERN, 4]], sticker: '🌙' },
  { id: 'jamaah', icon: '🕌', title: ['Sholat berjamaah', 'Pray together'], desc: ['Saat waktu sholat di game, datang ke masjid bersama warga.', 'When it is prayer time in the game, go to the masjid with the villagers.'], goal: s => [Math.min(1, s.jamaah), 1], reward: [[B.MOSAIC, 6]], sticker: '🕌' },
  { id: 'blueprint', icon: '🏗️', title: ['Bangun dengan rancangan', 'Build from a blueprint'], desc: ['Buka 🏗️ Rancang, pilih Rumah Kecil, lalu bangun!', 'Open 🏗️ Blueprints, pick the Little House, then build it!'], goal: s => [Math.min(1, s.built || 0), 1], reward: [[B.LANTERN, 3]], sticker: '🏠' },
  { id: 'chest', icon: '🎁', title: ['Harta karun', 'Treasure hunt'], desc: ['Temukan peti harta karun di luar desa atau di dalam gua, lalu ketuk.', 'Find a treasure chest outside the village or in a cave, then tap it.'], goal: s => [Math.min(1, s.chests || 0), 1], reward: [[I.GOLD_INGOT, 2]], sticker: '🎁' },
  { id: 'ride', icon: '🐪', title: ['Ayo naik!', 'All aboard!'], desc: ['Naik unta (ketuk unta) atau buat perahu dan berlayar.', 'Ride a camel (tap one) or make a boat and sail.'], goal: s => [Math.min(1, s.rides || 0), 1], reward: [[I.DATES, 5]], sticker: '🛶' },
  { id: 'stone', icon: '🪨', title: ['Beliung batu', 'Stone pickaxe'], desc: ['Gali batu, lalu buat beliung batu di meja kerja.', 'Mine stone, then make a stone pickaxe at a workbench.'], goal: s => [s.crafted[I.STONE_PICK] ? 1 : 0, 1], reward: [[B.TORCH, 8]], sticker: '🪨' },
  { id: 'lantern', icon: '🏮', title: ['Hias dengan lentera', 'Decorate with lanterns'], desc: ['Pasang 3 lentera Ramadhan di mana saja.', 'Place 3 Ramadan lanterns anywhere.'], goal: s => [Math.min(3, s.placedIds[B.LANTERN] || 0), 3], reward: [[B.WOOL_YELLOW, 4]], sticker: '🏮' },
  { id: 'plant', icon: '🌱', title: ['Tanam pohon', 'Plant trees'], desc: ['Tanam 3 bibit di tanah berumput. Menanam pohon itu sedekah!', 'Plant 3 saplings on grass. Planting trees is a good deed!'], goal: s => [Math.min(3, s.planted), 3], reward: [[I.APPLE, 3]], sticker: '🌱' },
  { id: 'explore', icon: '🧭', title: ['Penjelajah cilik', 'Little explorer'], desc: ['Kunjungi hutan, gurun kurma, dan bukit salju.', 'Visit the forest, the date desert and the snowy hills.'], goal: s => [['FOREST', 'DESERT', 'SNOWY'].filter(b => s.biomes.includes(b)).length, 3], reward: [[I.IRON_INGOT, 3]], sticker: '🧭' },
  { id: 'letters10', icon: '📚', title: ['10 huruf hijaiyah', '10 hijaiyah letters'], desc: ['Temukan 10 huruf. Dengarkan bunyinya ya!', 'Find 10 letters. Listen to how they sound!'], goal: s => [Math.min(10, s.letters.length), 10], reward: [[B.MOSAIC, 8]], sticker: '📚' },
  { id: 'sleep', icon: '🛏️', title: ['Tidur yang baik', 'A good night’s sleep'], desc: ['Buat kasur dan tidur di malam hari. Jangan lupa berdoa!', 'Make a bed and sleep at night. Remember the du’a!'], goal: s => [Math.min(1, s.slept), 1], reward: [[I.MILK, 2]], sticker: '🌜' },
  { id: 'sahur', icon: '🍚', title: ['Makan sahur', 'Eat suhoor'], desc: ['Makan sesuatu sebelum Subuh di dalam game.', 'Eat something before Fajr in the game.'], goal: s => [Math.min(1, s.sahur), 1], reward: [[I.DATES, 4]], sticker: '⏰' },
  { id: 'cave', icon: '💎', title: ['Kristal gua', 'Cave crystals'], desc: ['Masuk gua yang dalam dan temukan kristal bercahaya (perlu beliung besi).', 'Go deep into a cave and find a glowing crystal (needs an iron pickaxe).'], goal: s => [Math.min(1, s.mined[I.CRYSTAL] || 0), 1], reward: [[B.LANTERN, 4]], sticker: '💎' },
  { id: 'mountain', icon: '🏔️', title: ['Puncak gunung', 'Mountain top'], desc: ['Daki gunung yang sangat tinggi!', 'Climb a really tall mountain!'], goal: s => [s.maxY >= SEA + 45 ? 1 : 0, 1], reward: [[I.GOLD_INGOT, 2]], sticker: '🏔️' },
  { id: 'builder', icon: '🏠', title: ['Arsitek cilik', 'Little architect'], desc: ['Pasang 150 balok untuk membangun rumah atau masjidmu sendiri.', 'Place 150 blocks to build your own house or masjid.'], goal: s => [Math.min(150, s.placed), 150], reward: [[B.GOLD_TILE, 8]], sticker: '🏗️' },
  { id: 'quiz', icon: '🎯', title: ['Tebak huruf', 'Letter quiz'], desc: ['Jawab benar 10 soal Tebak Huruf di 📖 Buku Huruf.', 'Answer 10 Letter Quiz questions in the 📖 Letter Book.'], goal: s => [Math.min(10, s.quiz), 10], reward: [[I.CRYSTAL, 2]], sticker: '🎯' },
  { id: 'letters28', icon: '🏆', title: ['Semua 28 huruf!', 'All 28 letters!'], desc: ['Temukan seluruh huruf hijaiyah di dunia Baby Mo.', 'Find every hijaiyah letter in Baby Mo’s world.'], goal: s => [s.letters.length, 28], reward: [[B.GOLD_TILE, 16]], sticker: '🏆' },
];

// ---- Ramadhan calendar: one gentle card per day ---------------------------------
export interface DayCard { icon: string; title: T2; tip: T2; reward: [number, number] }
export const CALENDAR: DayCard[] = [
  { icon: '🌙', title: ['Marhaban ya Ramadhan', 'Welcome, Ramadan'], tip: ['Ramadhan adalah bulan penuh berkah. Yuk mulai dengan senyum!', 'Ramadan is a month full of blessings. Let’s start with a smile!'], reward: [B.LANTERN, 2] },
  { icon: '🍚', title: ['Sahur itu berkah', 'Suhoor is a blessing'], tip: ['Rasulullah SAW mengajak kita makan sahur karena ada berkahnya.', 'The Prophet (peace be upon him) encouraged us to eat suhoor because it is blessed.'], reward: [I.DATES, 3] },
  { icon: '🤲', title: ['Bismillah', 'Bismillah'], tip: ['Ucapkan "Bismillah" sebelum makan dan bermain.', 'Say "Bismillah" before eating and playing.'], reward: [I.APPLE, 2] },
  { icon: '🌴', title: ['Berbuka dengan kurma', 'Break the fast with dates'], tip: ['Berbuka dengan kurma atau air putih adalah sunnah.', 'Breaking the fast with dates or water is a sunnah.'], reward: [I.DATES, 4] },
  { icon: '😊', title: ['Senyum itu sedekah', 'A smile is charity'], tip: ['Senyum kepada saudara kita adalah sedekah. Senyum hari ini ya!', 'Smiling at others is a charity. Smile today!'], reward: [B.FLOWER_YELLOW, 4] },
  { icon: '👨‍👩‍👧', title: ['Bantu ayah & ibu', 'Help mum & dad'], tip: ['Bantu siapkan meja untuk berbuka bersama keluarga.', 'Help set the table for iftar with your family.'], reward: [B.WOOL_RED, 4] },
  { icon: '📖', title: ['Belajar huruf', 'Learn letters'], tip: ['Belajar huruf hijaiyah supaya nanti lancar membaca Al-Qur’an.', 'Learn hijaiyah letters so you can read the Qur’an one day.'], reward: [B.MOSAIC, 4] },
  { icon: '💧', title: ['Hemat air', 'Save water'], tip: ['Saat wudhu, pakai air secukupnya. Jangan boros ya!', 'Use just enough water for wudhu. Don’t waste it!'], reward: [B.GLASS, 4] },
  { icon: '🐈', title: ['Sayang hewan', 'Be kind to animals'], tip: ['Beri minum kucing atau burung di sekitar rumah.', 'Give water to a cat or birds near your home.'], reward: [B.WOOL_WHITE, 4] },
  { icon: '🍲', title: ['Berbagi takjil', 'Share iftar snacks'], tip: ['Memberi makan orang yang berbuka mendapat pahala seperti orang yang berpuasa.', 'Whoever feeds a fasting person gets a reward like theirs.'], reward: [I.MILK, 2] },
  { icon: '🕌', title: ['Ke masjid', 'Go to the masjid'], tip: ['Ikut sholat tarawih bersama keluarga, walau sebentar.', 'Join tarawih prayer with your family, even for a short while.'], reward: [B.GOLD_TILE, 4] },
  { icon: '🧹', title: ['Rapi itu indah', 'Tidy is beautiful'], tip: ['Rapikan mainan dan kamar sendiri. Allah suka kebersihan.', 'Tidy your toys and room. Allah loves cleanliness.'], reward: [B.MARBLE, 6] },
  { icon: '🗣️', title: ['Kata-kata baik', 'Kind words'], tip: ['Ucapkan tolong, maaf, dan terima kasih hari ini.', 'Say please, sorry and thank you today.'], reward: [B.FLOWER_BLUE, 4] },
  { icon: '🌱', title: ['Tanam kebaikan', 'Plant goodness'], tip: ['Siram tanaman di rumah. Menanam pohon juga sedekah.', 'Water the plants at home. Planting trees is charity too.'], reward: [B.SAPLING, 3] },
  { icon: '⭐', title: ['Setengah jalan!', 'Halfway there!'], tip: ['Hebat! Sudah 15 hari Ramadhan. Terus semangat!', 'Amazing! 15 days of Ramadan. Keep going!'], reward: [I.GOLD_INGOT, 1] },
  { icon: '🤝', title: ['Maafkan teman', 'Forgive a friend'], tip: ['Kalau ada yang berbuat salah, maafkan dengan hati lapang.', 'If someone makes a mistake, forgive them kindly.'], reward: [B.WOOL_PURPLE, 4] },
  { icon: '📿', title: ['Dzikir pagi & petang', 'Morning & evening dhikr'], tip: ['Ucapkan Subhanallah, Alhamdulillah, Allahu Akbar.', 'Say Subhanallah, Alhamdulillah, Allahu Akbar.'], reward: [B.LANTERN, 2] },
  { icon: '👵', title: ['Kunjungi nenek & kakek', 'Visit grandparents'], tip: ['Telepon atau kunjungi kakek-nenek. Mereka pasti senang!', 'Call or visit your grandparents. They will be so happy!'], reward: [I.KOLAK, 1] },
  { icon: '🎒', title: ['Berbagi mainan', 'Share your toys'], tip: ['Ajak adik atau teman bermain bersama.', 'Invite a sibling or friend to play together.'], reward: [B.WOOL_GREEN, 4] },
  { icon: '🍞', title: ['Tidak boros makanan', 'Don’t waste food'], tip: ['Ambil makanan secukupnya dan habiskan.', 'Take just enough food and finish it.'], reward: [I.APPLE, 3] },
  { icon: '✨', title: ['Sepuluh malam terakhir', 'The last ten nights'], tip: ['Sepuluh malam terakhir Ramadhan sangat istimewa. Perbanyak doa!', 'The last ten nights of Ramadan are very special. Make lots of du’a!'], reward: [B.LANTERN, 3] },
  { icon: '📖', title: ['Dengarkan Al-Qur’an', 'Listen to the Qur’an'], tip: ['Dengarkan surat pendek bersama ayah atau ibu.', 'Listen to a short surah with mum or dad.'], reward: [B.BOOKSHELF, 1] },
  { icon: '🤲', title: ['Doa untuk orang tua', 'Du’a for parents'], tip: ['Doakan ayah dan ibu setiap selesai sholat.', 'Make du’a for your parents after every prayer.'], reward: [B.FLOWER_RED, 4] },
  { icon: '💰', title: ['Kotak sedekah', 'Charity box'], tip: ['Sisihkan sedikit uang jajan untuk kotak sedekah.', 'Save a little pocket money for the charity box.'], reward: [I.GOLD_INGOT, 1] },
  { icon: '🌌', title: ['Lailatul Qadar', 'Laylatul Qadr'], tip: ['Malam yang lebih baik dari seribu bulan. Carilah di malam-malam ganjil!', 'A night better than a thousand months. Seek it in the odd nights!'], reward: [I.CRYSTAL, 1] },
  { icon: '🙏', title: ['Bersyukur', 'Be thankful'], tip: ['Sebutkan 3 hal yang kamu syukuri hari ini.', 'Name 3 things you are thankful for today.'], reward: [B.GOLD_TILE, 4] },
  { icon: '🌾', title: ['Zakat fitrah', 'Zakat al-Fitr'], tip: ['Sebelum Idul Fitri, keluarga kita membayar zakat fitrah untuk berbagi.', 'Before Eid, our family pays zakat al-Fitr to share with others.'], reward: [I.DATES, 5] },
  { icon: '👕', title: ['Siap-siap lebaran', 'Getting ready for Eid'], tip: ['Bantu siapkan baju dan kue untuk hari raya.', 'Help prepare clothes and cakes for Eid.'], reward: [I.KOLAK, 2] },
  { icon: '📢', title: ['Takbiran', 'Takbir'], tip: ['Allahu Akbar, Allahu Akbar, Allahu Akbar, laa ilaaha illallah…', 'Allahu Akbar, Allahu Akbar, Allahu Akbar, laa ilaaha illallah…'], reward: [B.LANTERN, 4] },
  { icon: '🎉', title: ['Selamat Idul Fitri!', 'Eid Mubarak!'], tip: ['Taqabbalallahu minna wa minkum. Mohon maaf lahir dan batin!', 'Taqabbalallahu minna wa minkum. May Allah accept from us and you!'], reward: [B.GOLD_TILE, 10] },
];

// ---- du'a cards -------------------------------------------------------------------
export interface Dua { id: string; ar: string; lat: string; mean: T2; src: string }
export const DUAS: Record<string, Dua> = {
  eat: { id: 'eat', ar: 'بِسْمِ اللَّهِ', lat: 'Bismillah', mean: ['Dengan nama Allah', 'In the name of Allah'], src: 'HR. Bukhari & Muslim' },
  done: { id: 'done', ar: 'الْحَمْدُ لِلَّهِ', lat: 'Alhamdulillah', mean: ['Segala puji bagi Allah', 'All praise is for Allah'], src: '' },
  iftar: {
    id: 'iftar', ar: 'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ',
    lat: "Dzahabazh zhoma’u wabtallatil ‘uruqu wa tsabatal ajru insya Allah",
    mean: ['Telah hilang rasa haus, urat-urat telah basah, dan pahala telah tetap, insya Allah', 'Thirst is gone, the veins are moistened, and the reward is certain, if Allah wills'], src: 'HR. Abu Dawud',
  },
  sleep: { id: 'sleep', ar: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', lat: 'Bismika Allahumma amutu wa ahya', mean: ['Dengan nama-Mu ya Allah, aku mati dan aku hidup', 'In Your name, O Allah, I die and I live'], src: 'HR. Bukhari' },
  wake: {
    id: 'wake', ar: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    lat: 'Alhamdulillahilladzi ahyana ba’da ma amatana wa ilaihin nusyur',
    mean: ['Segala puji bagi Allah yang menghidupkan kami setelah mematikan kami, dan kepada-Nya kami kembali', 'All praise is for Allah who gave us life after causing us to die, and to Him is the return'], src: 'HR. Bukhari',
  },
};
