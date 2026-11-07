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
  words?: number; play?: { day: string; sec: number }; playTotal?: number;
  bedug?: number; giftDay?: string; stories?: string[]; picnicDay?: number;
  /** glasses of water drunk at a water break */
  water?: number;
  /** furniture & decorations placed */
  decorated?: number;
  /** landmarks found (ids from world/landmarks.ts) */
  discovered?: string[];
  /** practice points per skill (sword, fishing, cooking, climbing) */
  skills?: Record<string, number>;
  bugs?: number; fish?: number; cooked?: number; perfectCooks?: number;
  /** treetops reached (keys of ~4-block areas, so each tree counts once) */
  treetops?: string[];
  /** power hats whose matching item was already given */
  hatGifts?: string[];
  /** secret spots found inside landmarks (the waterfall cave, the pearl cave) */
  spots?: string[];
  /** star pictures joined up at the telescope */
  constellations?: string[];
  /** shooting stars seen */
  meteors?: number;
  /** Eid bazaar: the welcome card was shown, villagers greeted (id → game day), stalls visited, outfits bought */
  eidWelcome?: boolean; eidGreet?: Record<string, number>; eidStall?: Record<string, number>; eidShirts?: string[];
  angpao?: number; fireworks?: number;
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
  { id: 'hello', icon: '👋', title: ['Kenalan dengan Baby Mo', 'Say hi to Baby Mo'], desc: ['Ketuk Baby Mo atau tombol 👋 Hai! di atas kepalanya.', 'Tap Baby Mo or the 👋 Hi! button above his head.'], goal: s => [s.talked.mo ? 1 : 0, 1], reward: [[I.APPLE, 2]], sticker: '🧒' },
  { id: 'wood', icon: '🪵', title: ['Kumpulkan kayu', 'Collect wood'], desc: ['Tahan ⛏️ pada batang pohon sampai lepas. Kumpulkan 4 kayu.', 'Hold ⛏️ on a tree trunk until it pops off. Collect 4 logs.'], goal: s => [Math.min(4, sum(s.mined, [B.OAK_LOG, B.PINE_LOG, B.PALM_LOG])), 4], reward: [[B.PLANKS, 4]], sticker: '🌳' },
  { id: 'pick', icon: '⛏️', title: ['Buat beliung kayu', 'Make a wooden pickaxe'], desc: ['Ketuk meja kerja di alun-alun desa, lalu pilih resepnya di 🔨 Buat.', 'Tap the workbench in the village square, then pick the recipe in 🔨 Craft.'], goal: s => [s.crafted[I.WOOD_PICK] ? 1 : 0, 1], reward: [[I.STICK, 4]], sticker: '🛠️' },
  { id: 'letter1', icon: '🔤', title: ['Temukan huruf pertamamu', 'Find your first letter'], desc: ['Ikuti kompas emas di atas layar menuju kuil huruf.', 'Follow the golden compass at the top to a letter shrine.'], goal: s => [Math.min(1, s.letters.length), 1], reward: [[B.LANTERN, 2]], sticker: '✨' },
  { id: 'ustadz', icon: '📖', title: ['Belajar bersama Ayah Ibrahim', 'Learn with Dad Ibrahim'], desc: ['Ayah Ibrahim ada di rumah kiri desa. Sapa Ayah, dapat hadiah, lalu belajar huruf bersama!', 'Dad Ibrahim is at the left house of the village. Say hi, get a present and learn letters together!'], goal: s => [s.talked.ustadz ? 1 : 0, 1], reward: [[B.BOOKSHELF, 1]], sticker: '👨' },
  { id: 'pet', icon: '🐑', title: ['Sayangi hewan', 'Be kind to animals'], desc: ['Elus 3 hewan dengan tombol ✋. Hewan senang disayang!', 'Pet 3 animals with ✋. Animals love kindness!'], goal: s => [Math.min(3, s.petted), 3], reward: [[B.WOOL_WHITE, 3]], sticker: '💕' },
  { id: 'adopt', icon: '💕', title: ['Sahabat hewan', 'An animal friend'], desc: ['Pegang kurma atau apel, lalu ketuk hewan untuk menjadikannya sahabatmu.', 'Hold dates or an apple, then tap an animal to make it your friend.'], goal: s => [s.pet ? 1 : 0, 1], reward: [[I.APPLE, 3]], sticker: '🐾' },
  { id: 'dates', icon: '🌴', title: ['Petik kurma', 'Pick dates'], desc: ['Kurma tumbuh di daun pohon kurma (di desa & oasis gurun). Kumpulkan 5.', 'Dates grow in date-palm leaves (village & desert oases). Collect 5.'], goal: s => [Math.min(5, s.mined[I.DATES] || 0), 5], reward: [[I.DATES, 3]], sticker: '🌴' },
  { id: 'milk', icon: '🥛', title: ['Ambil susu', 'Get some milk'], desc: ['Sapi dan kambing memberi susu kalau disayang. Ketuk dengan ✋.', 'Cows and goats share milk when you are gentle. Tap with ✋.'], goal: s => [Math.min(1, s.milk), 1], reward: [[I.MILK, 1]], sticker: '🐄' },
  { id: 'takjil', icon: '🍽️', title: ['Siapkan takjil', 'Prepare iftar snacks'], desc: ['Buat "Takjil Kurma & Susu" dari 3 kurma + 1 susu.', 'Make a "Dates & Milk" plate from 3 dates + 1 milk.'], goal: s => [s.crafted[I.TAKJIL] ? 1 : 0, 1], reward: [[I.APPLE, 2]], sticker: '🍽️' },
  { id: 'sedekah', icon: '🤲', title: ['Berbagi itu indah', 'Sharing is beautiful'], desc: ['Pegang makanan, lalu berikan ke warga desa dengan ✋.', 'Hold some food and give it to a villager with ✋.'], goal: s => [Math.min(1, s.gave), 1], reward: [[B.GOLD_TILE, 4]], sticker: '🤲' },
  { id: 'iftar', icon: '🌇', title: ['Berbuka puasa', 'Break the fast'], desc: ['Saat Maghrib di dalam game, makan kurma atau takjil.', 'At Maghrib in the game, eat dates or a takjil plate.'], goal: s => [Math.min(1, s.iftar), 1], reward: [[B.LANTERN, 4]], sticker: '🌙' },
  { id: 'jamaah', icon: '🕌', title: ['Sholat berjamaah', 'Pray together'], desc: ['Saat waktu sholat di game, datang ke masjid bersama warga.', 'When it is prayer time in the game, go to the masjid with the villagers.'], goal: s => [Math.min(1, s.jamaah), 1], reward: [[B.MOSAIC, 6]], sticker: '🕌' },
  { id: 'explore3', icon: '🧭', title: ['Penjelajah sejati', 'True explorer'], desc: ['Temukan 3 tempat istimewa di dunia. Lihat petunjuknya di 🗺️ Peta.', 'Find 3 special places in the world. See the clues in 🗺️ Map.'], goal: s => [Math.min(3, s.discovered?.length || 0), 3], reward: [[I.CRYSTAL, 2], [B.TORCH, 6]], sticker: '🧭' },
  { id: 'explore8', icon: '🗺️', title: ['Semua tempat istimewa', 'Every special place'], desc: ['Temukan semua 8 tempat istimewa: mercusuar, oasis, puncak gunung, dan lainnya!', 'Find all 8 special places: the lighthouse, the oasis, the mountain top and more!'], goal: s => [Math.min(8, s.discovered?.length || 0), 8], reward: [[I.GOLD_INGOT, 6], [I.CRYSTAL, 6]], sticker: '🌍' },
  { id: 'beetles', icon: '🐞', title: ['Usir kumbang nakal', 'Shoo the naughty beetles'], desc: ['Saat senja, kumbang nakal keluar. Ketuk mereka (pedang mainan membantu!) supaya pulang ke rumahnya. Usir 5 kumbang.', 'At dusk, naughty beetles come out. Tap them (a toy sword helps!) so they fly home. Shoo 5 beetles.'], goal: s => [Math.min(5, s.bugs || 0), 5], reward: [[I.STONE_SWORD, 1]], sticker: '🐞' },
  { id: 'fish1', icon: '🎣', title: ['Memancing', 'Gone fishing'], desc: ['Buat pancingan di meja kerja, lemparkan ke air, lalu ketuk saat pelampungnya tenggelam!', 'Make a fishing rod at the workbench, cast it into water, then tap when the float dips!'], goal: s => [Math.min(1, s.fish || 0), 1], reward: [[I.SMALL_FISH, 2]], sticker: '🐟' },
  { id: 'chef', icon: '🍳', title: ['Koki cilik', 'Little chef'], desc: ['Masak di tungku: ketuk saat penanda ada di zona hijau. Masak 3 kali.', 'Cook at a furnace: tap when the marker is in the green zone. Cook 3 times.'], goal: s => [Math.min(3, s.cooked || 0), 3], reward: [[I.MEAT, 2], [I.EGG, 2]], sticker: '👩‍🍳' },
  { id: 'falls', icon: '🏞️', title: ['Rahasia air terjun', 'The waterfall’s secret'], desc: ['Temukan Lembah Air Terjun (🧭 Peta), lalu berenang menembus air terjun. Ada apa di baliknya?', 'Find Waterfall Valley (🧭 Map), then swim through the falling water. What’s behind it?'], goal: s => [s.spots?.includes('waterfall_cave') ? 1 : 0, 1], reward: [[I.CRYSTAL, 2]], sticker: '💧' },
  { id: 'pearls', icon: '🫧', title: ['Penyelam mutiara', 'Pearl diver'], desc: ['Di Taman Karang ada lubang di dasar laut. Menyelam ke bawah, lewati terowongan, dan temukan Gua Mutiara!', 'In the Coral Reef there’s a hole in the sea floor. Dive down, swim through the tunnel and find the Pearl Cave!'], goal: s => [s.spots?.includes('pearl_cave') ? 1 : 0, 1], reward: [[I.PEARL, 2]], sticker: '🐢' },
  { id: 'stars', icon: '🔭', title: ['Astronom cilik', 'Little astronomer'], desc: ['Ketuk teropong di Bukit Bintang dan sambungkan 3 gambar bintang.', 'Tap the telescope on Stargazing Hill and join up 3 star pictures.'], goal: s => [Math.min(3, s.constellations?.length || 0), 3], reward: [[B.LANTERN, 2], [I.CRYSTAL, 1]], sticker: '🌠' },
  { id: 'volcano', icon: '🌋', title: ['Penjelajah gunung api', 'Volcano explorer'], desc: ['Buat perahu, berlayar ke Pulau Gunung Api, lalu naiki jalan batu sampai ke kawahnya.', 'Make a boat, sail to Volcano Island, then climb the stone path up to the crater.'], goal: s => [s.spots?.includes('crater') ? 1 : 0, 1], reward: [[B.OBSIDIAN, 4], [I.CRYSTAL, 1]], sticker: '🌋' },
  { id: 'treetop', icon: '🌳', title: ['Panjat pohon', 'Climb a tree'], desc: ['Jalan terus ke batang pohon untuk memanjat sampai ke puncaknya. Ada buah di atas!', 'Keep walking into a tree trunk to climb it to the top. There’s fruit up there!'], goal: s => [Math.min(1, s.treetops?.length || 0), 1], reward: [[I.APPLE, 3]], sticker: '🐒' },
  { id: 'decorate', icon: '🪑', title: ['Hias rumahmu', 'Decorate your home'], desc: ['Buat sajadah, meja atau lampu di meja kerja (🔨 Buat), lalu pasang 3 hiasan.', 'Make a prayer mat, table or lamp at the workbench (🔨 Craft), then place 3 decorations.'], goal: s => [Math.min(3, s.decorated || 0), 3], reward: [[I.LAMP, 1], [I.CUSHION, 2]], sticker: '🛋️' },
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
  { id: 'bedug', icon: '🥁', title: ['Pukul bedug', 'Beat the bedug'], desc: ['Ketuk bedug di depan masjid: dug dug dug!', 'Tap the bedug drum in front of the masjid: dum dum dum!'], goal: s => [Math.min(1, s.bedug || 0), 1], reward: [[B.LANTERN, 2]], sticker: '🥁' },
  { id: 'story', icon: '📚', title: ['Cerita sebelum tidur', 'A bedtime story'], desc: ['Di malam hari, ketuk kasur dan dengarkan cerita Baby Mo.', 'At night, tap a bed and listen to Baby Mo’s story.'], goal: s => [Math.min(1, (s.stories || []).length), 1], reward: [[I.MILK, 2]], sticker: '📚' },
  { id: 'words', icon: '🧩', title: ['Susun kata', 'Build words'], desc: ['Main 🧩 Susun Kata di 📖 Buku Huruf. Susun 5 kata Arab!', 'Play 🧩 Word Builder in the 📖 Letter Book. Build 5 Arabic words!'], goal: s => [Math.min(5, s.words || 0), 5], reward: [[B.GOLD_TILE, 6]], sticker: '🧩' },
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
  takbir: { id: 'takbir', ar: 'اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ اللَّهُ أَكْبَرُ، لَا إِلَٰهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ وَلِلَّهِ الْحَمْدُ', lat: 'Allāhu akbar, Allāhu akbar, Allāhu akbar, lā ilāha illallāhu wallāhu akbar, Allāhu akbar wa lillāhil-ḥamd', mean: ['Allah Maha Besar (3×). Tiada tuhan selain Allah, dan Allah Maha Besar. Allah Maha Besar, dan segala puji bagi Allah.', 'Allah is the Greatest (3×). There is no god but Allah, and Allah is the Greatest. Allah is the Greatest, and all praise is for Allah.'], src: 'Takbir Idul Fitri' },
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

// ---- "Susun Kata" (word builder): simple words made from collected letters ----
// `letters` are indices into LETTERS in reading order (right to left).
export interface Word { plain: string; voweled: string; lat: string; mean: T2; icon: string; letters: number[] }
const L = { a: 0, b: 1, t: 2, j: 4, d: 7, r: 9, z: 10, s: 11, sy: 12, sh: 13, f: 19, q: 20, k: 21, l: 22, m: 23, n: 24, w: 25, h: 26, y: 27 };
export const WORDS: Word[] = [
  { plain: 'باب', voweled: 'بَاب', lat: 'baab', mean: ['pintu', 'door'], icon: '🚪', letters: [L.b, L.a, L.b] },
  { plain: 'بيت', voweled: 'بَيْت', lat: 'bait', mean: ['rumah', 'house'], icon: '🏠', letters: [L.b, L.y, L.t] },
  { plain: 'تمر', voweled: 'تَمْر', lat: 'tamr', mean: ['kurma', 'dates'], icon: '🌴', letters: [L.t, L.m, L.r] },
  { plain: 'قمر', voweled: 'قَمَر', lat: 'qamar', mean: ['bulan', 'moon'], icon: '🌕', letters: [L.q, L.m, L.r] },
  { plain: 'شمس', voweled: 'شَمْس', lat: 'syams', mean: ['matahari', 'sun'], icon: '☀️', letters: [L.sy, L.m, L.s] },
  { plain: 'نور', voweled: 'نُور', lat: 'nuur', mean: ['cahaya', 'light'], icon: '💡', letters: [L.n, L.w, L.r] },
  { plain: 'لبن', voweled: 'لَبَن', lat: 'laban', mean: ['susu', 'milk'], icon: '🥛', letters: [L.l, L.b, L.n] },
  { plain: 'ورد', voweled: 'وَرْد', lat: 'ward', mean: ['bunga mawar', 'rose'], icon: '🌹', letters: [L.w, L.r, L.d] },
  { plain: 'قلم', voweled: 'قَلَم', lat: 'qalam', mean: ['pena', 'pen'], icon: '✏️', letters: [L.q, L.l, L.m] },
  { plain: 'جمل', voweled: 'جَمَل', lat: 'jamal', mean: ['unta', 'camel'], icon: '🐪', letters: [L.j, L.m, L.l] },
  { plain: 'سمك', voweled: 'سَمَك', lat: 'samak', mean: ['ikan', 'fish'], icon: '🐟', letters: [L.s, L.m, L.k] },
  { plain: 'صوم', voweled: 'صَوْم', lat: 'shaum', mean: ['puasa', 'fasting'], icon: '🌙', letters: [L.sh, L.w, L.m] },
  { plain: 'زيت', voweled: 'زَيْت', lat: 'zait', mean: ['minyak zaitun', 'olive oil'], icon: '🫒', letters: [L.z, L.y, L.t] },
  { plain: 'فيل', voweled: 'فِيل', lat: 'fiil', mean: ['gajah', 'elephant'], icon: '🐘', letters: [L.f, L.y, L.l] },
  { plain: 'كتاب', voweled: 'كِتَاب', lat: 'kitaab', mean: ['buku', 'book'], icon: '📖', letters: [L.k, L.t, L.a, L.b] },
  { plain: 'مسجد', voweled: 'مَسْجِد', lat: 'masjid', mean: ['masjid', 'mosque'], icon: '🕌', letters: [L.m, L.s, L.j, L.d] },
  { plain: 'هلال', voweled: 'هِلَال', lat: 'hilaal', mean: ['bulan sabit', 'crescent moon'], icon: '🌙', letters: [L.h, L.l, L.a, L.l] },
];

// ---- loading-screen tips -------------------------------------------------------------
export const LOAD_TIPS: T2[] = [
  ['Tahukah kamu? Ada 28 huruf hijaiyah. Bisa kamu temukan semuanya?', 'Did you know? There are 28 hijaiyah letters. Can you find them all?'],
  ['Pegang kurma, lalu ketuk hewan supaya ia jadi sahabatmu 💕', 'Hold some dates and tap an animal to make it your friend 💕'],
  ['Tersesat? Ketuk tombol 🏠 untuk pulang ke desa.', 'Lost? Tap the 🏠 button to go back to the village.'],
  ['Salah pasang balok? Ketuk ↩️ untuk membatalkan.', 'Placed a block by mistake? Tap ↩️ to undo it.'],
  ['Saat Maghrib, warga desa berbuka puasa bersama. Ayo ikut!', 'At Maghrib the villagers break their fast together. Join them!'],
  ['Pukul bedug di depan masjid: dug dug dug! 🥁', 'Tap the bedug drum by the masjid: dum dum dum! 🥁'],
  ['Di malam hari, tidur di kasur dan dengarkan cerita Baby Mo 🌙', 'At night, sleep in a bed and listen to Baby Mo’s story 🌙'],
  ['Senyum itu sedekah. Senyum dulu sebelum main ya 😊', 'A smile is a charity. Smile before you play 😊'],
];

// ---- bedtime stories (original, short, each with a gentle lesson) -------------------------
export interface Story { id: string; icon: string; title: T2; pages: T2[]; lesson: T2 }
export const STORIES: Story[] = [
  {
    id: 'last-date', icon: '🌴', title: ['Kurma Terakhir', 'The Last Date'],
    pages: [
      ['Sore itu Baby Mo punya satu kurma terakhir. Kurmanya manis dan besar.', 'One evening Baby Mo had one last date. It was big and sweet.'],
      ['Lalu ia melihat Kakek Yusuf duduk sendiri. Kakek belum berbuka.', 'Then he saw Grandpa Yusuf sitting alone. Grandpa hadn’t eaten yet.'],
      ['Baby Mo berpikir sebentar… lalu memberikan kurmanya. "Untuk Kakek!"', 'Baby Mo thought for a moment… then gave him the date. "For you, Grandpa!"'],
      ['Kakek tersenyum lebar. Hati Baby Mo terasa hangat, lebih manis dari kurma.', 'Grandpa smiled a big smile. Baby Mo’s heart felt warm, sweeter than any date.'],
    ],
    lesson: ['Berbagi membuat hati bahagia.', 'Sharing makes our hearts happy.'],
  },
  {
    id: 'thirsty-cat', icon: '🐈', title: ['Kucing yang Haus', 'The Thirsty Cat'],
    pages: [
      ['Siang itu panas sekali. Seekor kucing kecil mengeong pelan di dekat sumur.', 'It was a very hot day. A little cat mewed softly by the well.'],
      ['Adam melihat lidah kucing itu kering. "Kamu haus ya?"', 'Adam saw the cat’s dry little tongue. "Are you thirsty?"'],
      ['Adam mengambil air dan menuangnya ke mangkuk. Kucing minum sampai puas.', 'Adam fetched water and poured it into a bowl. The cat drank and drank.'],
      ['Sejak hari itu, si kucing selalu menemani Adam bermain.', 'From that day on, the cat always came to play with Adam.'],
    ],
    lesson: ['Sayangi hewan, karena mereka juga ciptaan Allah.', 'Be kind to animals; Allah created them too.'],
  },
  {
    id: 'little-tree', icon: '🌱', title: ['Pohon Kecil Kakek', 'Grandpa’s Little Tree'],
    pages: [
      ['Kakek Yusuf menanam bibit kecil. "Kapan berbuahnya, Kek?" tanya Baby Mo.', 'Grandpa Yusuf planted a tiny seedling. "When will it grow fruit?" asked Baby Mo.'],
      ['"Masih lama," jawab Kakek. "Mungkin nanti untuk anak-anakmu."', '"Not for a long time," said Grandpa. "Maybe for your children one day."'],
      ['Setiap hari mereka menyiramnya. Pohon itu tumbuh pelan-pelan.', 'Every day they watered it. Slowly, slowly, it grew.'],
      ['Burung-burung mulai bersarang di dahannya. Kakek tersenyum: "Kebaikan itu terus tumbuh."', 'Birds began to nest in its branches. Grandpa smiled: "Kindness keeps on growing."'],
    ],
    lesson: ['Kebaikan kecil bisa tumbuh menjadi besar. Sabar ya!', 'Small good deeds grow big. Be patient!'],
  },
  {
    id: 'honest', icon: '🪙', title: ['Koin di Jalan', 'The Coin on the Path'],
    pages: [
      ['Aisyah menemukan koin emas di jalan dekat pasar.', 'Aisyah found a golden coin on the path near the market.'],
      ['"Wah, aku bisa beli kue!" pikirnya. Tapi koin ini milik siapa ya?', '"I could buy a cake!" she thought. But whose coin was it?'],
      ['Ia bertanya ke Bu Aminah. Ternyata koin itu milik Kakek Yusuf yang sedang mencarinya.', 'She asked Mrs Aminah. It belonged to Grandpa Yusuf, who was looking for it.'],
      ['Kakek berterima kasih. Aisyah merasa tenang dan bangga karena jujur.', 'Grandpa thanked her. Aisyah felt calm and proud for being honest.'],
    ],
    lesson: ['Jujur membuat hati tenang.', 'Honesty brings a peaceful heart.'],
  },
  {
    id: 'lantern', icon: '🏮', title: ['Lentera untuk Tetangga', 'A Lantern for the Neighbour'],
    pages: [
      ['Malam Ramadhan, rumah Bu Aminah gelap. Lenteranya rusak.', 'One Ramadan night, Mrs Aminah’s house was dark. Her lantern was broken.'],
      ['Baby Mo dan Adam membuat lentera baru dari kaca dan kayu.', 'Baby Mo and Adam made a new lantern from glass and wood.'],
      ['Mereka menggantungnya di depan rumah Bu Aminah. Cahayanya hangat sekali.', 'They hung it outside Mrs Aminah’s house. Its light was so warm.'],
      ['"Terima kasih, Nak," kata Bu Aminah. Malam itu seluruh desa terasa lebih terang.', '"Thank you, dears," said Mrs Aminah. That night the whole village felt brighter.'],
    ],
    lesson: ['Menolong tetangga itu indah.', 'Helping our neighbours is beautiful.'],
  },
  {
    id: 'moon', icon: '🌙', title: ['Mencari Bulan Sabit', 'Looking for the Crescent'],
    pages: [
      ['Di akhir bulan Sya’ban, semua warga naik ke bukit saat Maghrib.', 'At the end of Sha’ban, everyone climbed the hill at Maghrib.'],
      ['Mereka memandang langit barat, mencari bulan sabit yang sangat tipis.', 'They looked at the western sky for a very thin crescent moon.'],
      ['"Itu dia!" seru Baby Mo. Bulan sabit kecil bersinar lembut.', '"There it is!" called Baby Mo. A tiny crescent glowed softly.'],
      ['"Marhaban ya Ramadhan!" Semua orang tersenyum dan saling mendoakan.', '"Welcome, Ramadan!" Everyone smiled and made du’a for each other.'],
    ],
    lesson: ['Bulan sabit menandai awal bulan Hijriah, termasuk Ramadhan.', 'The crescent moon marks the start of a Hijri month, like Ramadan.'],
  },
];

// ---------- rewards for finding hijaiyah letters ----------
// Every letter brings a small gift; every 4th letter opens a treasure chest
// with something special, so there is always a next goal in sight.
export const LETTER_GIFTS: [number, number][] = [
  [I.DATES, 3], [B.LANTERN, 1], [I.APPLE, 2], [B.GOLD_TILE, 3], [B.MOSAIC, 3], [B.WOOL_PURPLE, 4], [I.MILK, 1],
  [B.FLOWER_RED, 3], [B.GLASS, 4], [I.TAKJIL, 1], [B.MARBLE, 4], [B.WOOL_YELLOW, 4], [I.DATES, 3], [B.LANTERN, 2],
];
export interface Treasure { at: number; icon: string; title: T2; gifts: [number, number][] }
export const LETTER_TREASURES: Treasure[] = [
  { at: 4, icon: '🗝️', title: ['Peti Huruf Pertama', 'First Letter Chest'], gifts: [[I.CRYSTAL, 2], [B.GOLD_TILE, 6], [I.KOLAK, 1]] },
  { at: 8, icon: '🎒', title: ['Peti Penjelajah', 'Explorer’s Chest'], gifts: [[I.STONE_PICK, 1], [B.TORCH, 8], [I.CRYSTAL, 2]] },
  { at: 12, icon: '🏮', title: ['Peti Lentera', 'Lantern Chest'], gifts: [[B.LANTERN, 6], [B.MOSAIC, 10], [I.GOLD_INGOT, 2]] },
  { at: 16, icon: '⛵', title: ['Peti Pelaut', 'Sailor’s Chest'], gifts: [[I.BOAT, 1], [I.CRYSTAL, 3], [I.TAKJIL, 2]] },
  { at: 20, icon: '💎', title: ['Peti Kristal', 'Crystal Chest'], gifts: [[I.CRYSTAL, 6], [B.GOLD_TILE, 12], [I.IRON_PICK, 1]] },
  { at: 24, icon: '🕌', title: ['Peti Masjid', 'Masjid Chest'], gifts: [[B.MARBLE, 20], [B.GOLD_TILE, 16], [B.LANTERN, 8]] },
  { at: 28, icon: '🏆', title: ['Peti Juara Hijaiyah', 'Hijaiyah Champion Chest'], gifts: [[I.CRYSTAL, 10], [I.GOLD_INGOT, 6], [I.KOLAK, 3]] },
];
/** What finding letter number `count` (1..28) gives, and how far the next chest is. */
export function letterReward(count: number): { gift: [number, number]; treasure: Treasure | null; next: Treasure | null; toNext: number } {
  const gift = LETTER_GIFTS[(count - 1) % LETTER_GIFTS.length];
  const treasure = LETTER_TREASURES.find(t => t.at === count) ?? null;
  const next = LETTER_TREASURES.find(t => t.at > count) ?? null;
  return { gift, treasure, next, toNext: next ? next.at - count : 0 };
}
