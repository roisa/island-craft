// Learning English while playing: a little word card pops up (the English
// word, big, with its Indonesian meaning, and Baby Mo says it in English) when
// you do something great (praise words), walk past an animal, or come to a
// fruit tree. Every word you meet is kept in "My English Words" to hear again.
import type { Game } from '../main';
import type { AnimalKind } from './models';
import { Speech } from './audio';
import { B, I, nameOf } from '../world/blocks';
import { tr } from '../i18n';

export type WordCat = 'praise' | 'animal' | 'fruit' | 'color' | 'number' | 'body' | 'weather' | 'action' | 'phrase' | 'greet' | 'thing';
/** `key`: what it is kept as in "My English Words" (if not the English itself); `item`: show this item's picture */
export interface Word { en: string; id: string; icon: string; cat: WordCat; say?: string; key?: string; item?: number }

/** praise words, for when you do something good */
export const PRAISE: Word[] = [
  { en: 'Awesome!', id: 'Keren!', icon: '🤩', cat: 'praise' },
  { en: 'Great job!', id: 'Kerja bagus!', icon: '👍', cat: 'praise' },
  { en: 'Well done!', id: 'Bagus sekali!', icon: '👏', cat: 'praise' },
  { en: 'Fantastic!', id: 'Luar biasa!', icon: '🌟', cat: 'praise' },
  { en: 'Brilliant!', id: 'Cemerlang!', icon: '💡', cat: 'praise' },
  { en: 'Amazing!', id: 'Menakjubkan!', icon: '✨', cat: 'praise' },
  { en: 'Excellent!', id: 'Sangat bagus!', icon: '🏅', cat: 'praise' },
  { en: 'Super!', id: 'Super!', icon: '🦸', cat: 'praise' },
  { en: 'Wonderful!', id: 'Indah sekali!', icon: '🌈', cat: 'praise' },
  { en: 'You did it!', id: 'Kamu berhasil!', icon: '🎉', cat: 'praise' },
  { en: 'Keep it up!', id: 'Terus semangat!', icon: '💪', cat: 'praise' },
  { en: 'Nice work!', id: 'Hasil yang bagus!', icon: '😄', cat: 'praise' },
  { en: 'Perfect!', id: 'Sempurna!', icon: '💯', cat: 'praise' },
  { en: 'Way to go!', id: 'Hebat, lanjutkan!', icon: '🚀', cat: 'praise' },
  { en: 'Good thinking!', id: 'Pintar!', icon: '🧠', cat: 'praise' },
];

/** the animals you meet, with what they say */
export const ANIMAL_WORDS: Record<AnimalKind, Word> = {
  chicken: { en: 'Chicken', id: 'Ayam', icon: '🐔', cat: 'animal', say: 'Chicken! The chicken says cluck cluck.' },
  sheep: { en: 'Sheep', id: 'Domba', icon: '🐑', cat: 'animal', say: 'Sheep! The sheep says baa.' },
  cow: { en: 'Cow', id: 'Sapi', icon: '🐄', cat: 'animal', say: 'Cow! The cow says moo.' },
  camel: { en: 'Camel', id: 'Unta', icon: '🐪', cat: 'animal', say: 'Camel! The camel has a big hump.' },
  goat: { en: 'Goat', id: 'Kambing', icon: '🐐', cat: 'animal', say: 'Goat! The goat says meh.' },
  cat: { en: 'Cat', id: 'Kucing', icon: '🐱', cat: 'animal', say: 'Cat! The cat says meow.' },
};

/** the fruits of the Fruit Orchard */
export const FRUIT_WORDS: Record<string, Word> = {
  apple: { en: 'Apple', id: 'Apel', icon: '🍎', cat: 'fruit', say: 'Apple! A red, crunchy apple.' },
  mango: { en: 'Mango', id: 'Mangga', icon: '🥭', cat: 'fruit', say: 'Mango! A sweet, yellow mango.' },
  banana: { en: 'Banana', id: 'Pisang', icon: '🍌', cat: 'fruit', say: 'Banana! A long, yellow banana.' },
  orange: { en: 'Orange', id: 'Jeruk', icon: '🍊', cat: 'fruit', say: 'Orange! A round, juicy orange.' },
  coconut: { en: 'Coconut', id: 'Kelapa', icon: '🥥', cat: 'fruit', say: 'Coconut! A hard coconut with water inside.' },
  papaya: { en: 'Papaya', id: 'Pepaya', icon: '🍈', cat: 'fruit', say: 'Papaya! A soft, orange papaya.' },
  rambutan: { en: 'Rambutan', id: 'Rambutan', icon: '🔴', cat: 'fruit', say: 'Rambutan! A hairy, red rambutan.' },
  watermelon: { en: 'Watermelon', id: 'Semangka', icon: '🍉', cat: 'fruit', say: 'Watermelon! A big, green watermelon, red inside.' },
};

/** colours, when you place coloured wool or flowers */
export const COLOR_WORDS: Record<string, Word> = {
  red: { en: 'Red', id: 'Merah', icon: '🔴', cat: 'color', say: 'Red! This is red.' },
  yellow: { en: 'Yellow', id: 'Kuning', icon: '🟡', cat: 'color', say: 'Yellow! This is yellow.' },
  blue: { en: 'Blue', id: 'Biru', icon: '🔵', cat: 'color', say: 'Blue! This is blue.' },
  purple: { en: 'Purple', id: 'Ungu', icon: '🟣', cat: 'color', say: 'Purple! This is purple.' },
  green: { en: 'Green', id: 'Hijau', icon: '🟢', cat: 'color', say: 'Green! This is green.' },
  white: { en: 'White', id: 'Putih', icon: '⚪', cat: 'color', say: 'White! This is white.' },
};
export const COLOR_BLOCK: Record<number, string> = {
  [B.WOOL_RED]: 'red', [B.FLOWER_RED]: 'red', [B.WOOL_YELLOW]: 'yellow', [B.FLOWER_YELLOW]: 'yellow', [B.WOOL_BLUE]: 'blue', [B.FLOWER_BLUE]: 'blue',
  [B.WOOL_PURPLE]: 'purple', [B.FLOWER_PURPLE]: 'purple', [B.WOOL_GREEN]: 'green', [B.WOOL_WHITE]: 'white',
};

/** counting 1 to 10 */
export const NUMBER_WORDS: Word[] = [
  ['One', 'Satu', '1️⃣'], ['Two', 'Dua', '2️⃣'], ['Three', 'Tiga', '3️⃣'], ['Four', 'Empat', '4️⃣'], ['Five', 'Lima', '5️⃣'],
  ['Six', 'Enam', '6️⃣'], ['Seven', 'Tujuh', '7️⃣'], ['Eight', 'Delapan', '8️⃣'], ['Nine', 'Sembilan', '9️⃣'], ['Ten', 'Sepuluh', '🔟'],
].map(([en, id, icon]) => ({ en, id, icon, cat: 'number' as const }));
/** things you can count: [one, many, in Indonesian] */
export const COUNTABLE: Record<number, [string, string, string]> = {
  [I.APPLE]: ['apple', 'apples', 'apel'], [I.MANGO]: ['mango', 'mangoes', 'mangga'], [I.BANANA]: ['banana', 'bananas', 'pisang'],
  [I.ORANGE]: ['orange', 'oranges', 'jeruk'], [I.COCONUT]: ['coconut', 'coconuts', 'kelapa'], [I.PAPAYA]: ['papaya', 'papayas', 'pepaya'],
  [I.RAMBUTAN]: ['rambutan', 'rambutans', 'rambutan'], [I.WATERMELON_SLICE]: ['watermelon slice', 'watermelon slices', 'potong semangka'],
  [I.DATES]: ['date', 'dates', 'kurma'], [I.EGG]: ['egg', 'eggs', 'telur'], [I.SMALL_FISH]: ['fish', 'fish', 'ikan'], [I.BIG_FISH]: ['big fish', 'big fish', 'ikan besar'],
  [B.OAK_LOG]: ['log', 'logs', 'kayu'], [B.PALM_LOG]: ['log', 'logs', 'kayu'], [B.PINE_LOG]: ['log', 'logs', 'kayu'], [B.COBBLE]: ['stone', 'stones', 'batu'],
  [I.PEARL]: ['pearl', 'pearls', 'mutiara'],
};
/** "Three apples!" (for 2 to 10) */
export function countWord(n: number, item: number): Word | null {
  const c = COUNTABLE[item]; if (!c || n < 2 || n > 10) return null;
  const num = NUMBER_WORDS[n - 1];
  return { en: `${num.en} ${c[1]}!`, id: `${num.id} ${c[2]}!`, icon: num.icon, cat: 'number', key: num.en, item };
}

/** the body parts of wudu, step by step (step 0 is the intention) */
export const BODY_WORDS: (Word | null)[] = [null,
  { en: 'Hands', id: 'Tangan', icon: '👐', cat: 'body', say: 'Hands! Wash your hands.' },
  { en: 'Mouth', id: 'Mulut', icon: '👄', cat: 'body', say: 'Mouth! Rinse your mouth.' },
  { en: 'Nose', id: 'Hidung', icon: '👃', cat: 'body', say: 'Nose! Clean your nose.' },
  { en: 'Face', id: 'Wajah', icon: '🙂', cat: 'body', say: 'Face! Wash your face.' },
  { en: 'Arms', id: 'Lengan', icon: '💪', cat: 'body', say: 'Arms! Wash your arms.' },
  { en: 'Head', id: 'Kepala', icon: '🧑', cat: 'body', say: 'Head! Wipe your head.' },
  { en: 'Ears', id: 'Telinga', icon: '👂', cat: 'body', say: 'Ears! Wipe your ears.' },
  { en: 'Feet', id: 'Kaki', icon: '🦶', cat: 'body', say: 'Feet! Wash your feet.' },
];

/** the weather and the time of day */
export const WEATHER_WORDS: Record<string, Word> = {
  sunny: { en: 'It’s sunny!', id: 'Cerah!', icon: '☀️', cat: 'weather', say: 'It’s sunny today!' },
  misty: { en: 'It’s misty!', id: 'Berkabut!', icon: '🌫️', cat: 'weather', say: 'It’s misty this morning!' },
  windy: { en: 'It’s windy!', id: 'Berangin!', icon: '💨', cat: 'weather', say: 'It’s windy today!' },
  blossom: { en: 'Flowers everywhere!', id: 'Bunga di mana-mana!', icon: '🌸', cat: 'weather', say: 'Look! Flowers everywhere!' },
  rain: { en: 'It’s raining!', id: 'Hujan turun!', icon: '🌧️', cat: 'weather', say: 'It’s raining!' },
  snow: { en: 'It’s snowing!', id: 'Salju turun!', icon: '❄️', cat: 'weather', say: 'It’s snowing!' },
  morning: { en: 'Good morning!', id: 'Selamat pagi!', icon: '🌅', cat: 'weather' },
  afternoon: { en: 'Good afternoon!', id: 'Selamat siang!', icon: '🌞', cat: 'weather' },
  evening: { en: 'Good evening!', id: 'Selamat sore!', icon: '🌇', cat: 'weather' },
  night: { en: 'Good night!', id: 'Selamat malam!', icon: '🌙', cat: 'weather', say: 'Good night! Look at the stars.' },
};
/** which part of the day it is, for the greeting (null in between) */
export function dayPart(h: number, s: { sunrise: number; dhuhr: number; asr: number; maghrib: number; isha: number }): 'morning' | 'afternoon' | 'evening' | 'night' | null {
  if (h >= s.sunrise && h < s.sunrise + 3) return 'morning';
  if (h >= s.dhuhr && h < s.asr) return 'afternoon';
  if (h >= s.maghrib && h < s.isha) return 'evening';
  if (h >= s.isha && h < s.isha + 2) return 'night';
  return null;
}

/** what you are doing */
export const ACTION_WORDS: Record<string, Word> = {
  jump: { en: 'Jump!', id: 'Lompat!', icon: '🦘', cat: 'action', say: 'Jump! You can jump high!' },
  swim: { en: 'Swim!', id: 'Berenang!', icon: '🏊', cat: 'action', say: 'Swim! You are swimming.' },
  climb: { en: 'Climb!', id: 'Memanjat!', icon: '🧗', cat: 'action', say: 'Climb! Up, up, up!' },
  ride: { en: 'Ride!', id: 'Naik!', icon: '🐪', cat: 'action', say: 'Ride! Off we go!' },
  dig: { en: 'Dig!', id: 'Gali!', icon: '⛏️', cat: 'action', say: 'Dig! Dig, dig, dig!' },
};

/** Baby Mo's English sentence of the day */
export const PHRASES: Word[] = [
  ['I am happy.', 'Aku senang.', '😊'], ['Thank you!', 'Terima kasih!', '🙏'], ['Let’s go!', 'Ayo pergi!', '🚶'], ['I love my family.', 'Aku sayang keluargaku.', '👨‍👩‍👦'],
  ['Please help me.', 'Tolong bantu aku.', '🤝'], ['I am sorry.', 'Maaf ya.', '🥺'], ['Let’s play!', 'Ayo main!', '⚽'], ['I can do it!', 'Aku bisa!', '💪'],
  ['I am hungry.', 'Aku lapar.', '🍽️'], ['I am thirsty.', 'Aku haus.', '💧'], ['See you later!', 'Sampai jumpa!', '👋'], ['What is this?', 'Ini apa?', '❓'],
  ['I like apples.', 'Aku suka apel.', '🍎'], ['The sky is blue.', 'Langitnya biru.', '🌤️'], ['Be kind.', 'Berbuat baiklah.', '💛'], ['I am strong.', 'Aku kuat.', '🏋️'],
  ['Where is Baby Mo?', 'Baby Mo di mana?', '🔍'], ['It is a big tree.', 'Itu pohon yang besar.', '🌳'], ['My cat is cute.', 'Kucingku lucu.', '🐱'], ['Bismillah, let’s start!', 'Bismillah, ayo mulai!', '✨'],
].map(([en, id, icon]) => ({ en, id, icon, cat: 'phrase' as const }));
/** the sentence for a date (the same all day) */
export function phraseFor(d: Date): Word {
  const n = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate();
  return PHRASES[n % PHRASES.length];
}

/** saying hello to a villager in English */
export const GREETS: Record<'morning' | 'afternoon' | 'evening' | 'night', Word> = {
  morning: { en: 'Good morning! How are you?', id: 'Selamat pagi! Apa kabar?', icon: '🌅', cat: 'greet' },
  afternoon: { en: 'Good afternoon! How are you?', id: 'Selamat siang! Apa kabar?', icon: '🌞', cat: 'greet' },
  evening: { en: 'Good evening! How are you?', id: 'Selamat sore! Apa kabar?', icon: '🌇', cat: 'greet' },
  night: { en: 'Good night! How are you?', id: 'Selamat malam! Apa kabar?', icon: '🌙', cat: 'greet' },
};
/** what you can answer, and what they say back */
export const REPLIES: { me: Word; back: Word }[] = [
  { me: { en: 'I’m fine, thank you!', id: 'Aku baik, terima kasih!', icon: '😊', cat: 'greet' }, back: { en: 'Great! Have a nice day!', id: 'Bagus! Semoga harimu menyenangkan!', icon: '🌈', cat: 'greet' } },
  { me: { en: 'I’m happy!', id: 'Aku senang!', icon: '😄', cat: 'greet' }, back: { en: 'Me too! Let’s smile!', id: 'Aku juga! Ayo tersenyum!', icon: '😁', cat: 'greet' } },
  { me: { en: 'I’m hungry!', id: 'Aku lapar!', icon: '🍽️', cat: 'greet' }, back: { en: 'Let’s eat some fruit!', id: 'Ayo makan buah!', icon: '🍎', cat: 'greet' } },
];

/** the fruit block on a tree → its word */
export const FRUIT_BLOCK: Record<number, string> = {
  [B.FRUIT_APPLE]: 'apple', [B.FRUIT_MANGO]: 'mango', [B.FRUIT_BANANA]: 'banana', [B.FRUIT_ORANGE]: 'orange',
  [B.FRUIT_COCONUT]: 'coconut', [B.FRUIT_PAPAYA]: 'papaya', [B.FRUIT_RAMBUTAN]: 'rambutan', [B.WATERMELON]: 'watermelon',
};
const BLOCK_ITEM: Record<number, number> = {
  [B.FRUIT_APPLE]: I.APPLE, [B.FRUIT_MANGO]: I.MANGO, [B.FRUIT_BANANA]: I.BANANA, [B.FRUIT_ORANGE]: I.ORANGE,
  [B.FRUIT_COCONUT]: I.COCONUT, [B.FRUIT_PAPAYA]: I.PAPAYA, [B.FRUIT_RAMBUTAN]: I.RAMBUTAN, [B.WATERMELON]: I.WATERMELON_SLICE,
};
const FRUIT_ITEMS = new Set([I.APPLE, I.MANGO, I.BANANA, I.ORANGE, I.COCONUT, I.PAPAYA, I.RAMBUTAN, I.WATERMELON_SLICE]);
/** picked fruit grows back after this long (real time) */
export const REGROW_MS = 3 * 60 * 1000;
/** the word card for coming up to a fruit tree: "This is a mango tree." */
export function treeWord(key: string): Word {
  const w = FRUIT_WORDS[key];
  const say = key === 'watermelon' ? 'These are watermelons. Watermelon!' : `This is ${/^[aeiou]/.test(key) ? 'an' : 'a'} ${key} tree. ${w.en}!`;
  return { ...w, say };
}

/** a praise word different from the last one */
export function nextPraise(last: string, roll: number): Word {
  const pool = PRAISE.filter(w => w.en !== last);
  return pool[Math.floor(roll * pool.length) % pool.length];
}

export class English {
  private lastPraise = ''; private praiseAt = -1e9; private shownAt = -1e9;
  private animalAt: Partial<Record<AnimalKind, number>> = {};
  private seenAt = new Map<string, number>();
  private scanT = 0; private bornAt = performance.now(); private wasGround = true;
  constructor(private g: Game) { }
  private get on() { return this.g.settings.english !== false; }
  private busy() { const g = this.g; return g.ui.isOpen() || !!g.race?.active || !!g.tennis?.active || !!g.jamaah || g.kid.tutorialActive(); }

  /** show the word card and say it in English; it goes into "My English Words" */
  show(w: Word, force = false) {
    const g = this.g, now = performance.now();
    if (!this.on || (!force && (this.busy() || g.ui.phraseShown() || now - this.shownAt < 6000))) return false;
    this.shownAt = now;
    g.ui.wordCard(w);
    Speech.talk(w.say ?? w.en, 'en', false, 0);
    this.learn(w);
    return true;
  }
  /** keep a word in "My English Words" (without a card) */
  learn(w: Word) {
    const g = this.g, v = (g.stats.vocab ??= {});
    const e = (v[w.key ?? w.en] ??= { cat: w.cat, n: 0 }); e.n++;
    if (w.cat === 'thing') { e.item = w.item; e.id = w.id; }
    g.saveSoon();
  }
  /** say a word in English straight away (inside a pop-up: no card), and keep it */
  hear(w: Word) {
    if (!this.on) return;
    Speech.talk(w.say ?? w.en, 'en', true, 0);
    this.learn(w);
  }
  /** how often a word was met */
  met(key: string) { return this.g.stats.vocab?.[key]?.n ?? 0; }

  /** you placed a block: its colour, now and then */
  placed(id: number) {
    const c = COLOR_BLOCK[id]; if (c) this.near('color:' + c, COLOR_WORDS[c], 240);
  }
  /** something came into your bag: its English name the first time, then counting (“Three apples!”) */
  gained(id: number) {
    if (!this.on || FRUIT_ITEMS.has(id)) return;
    const name = nameOf(id), en = name[1].replace(/\s*\(.*\)\s*/, '');
    if (!this.met(en) && en) {
      const w: Word = { en, id: name[0].replace(/\s*\(.*\)\s*/, ''), icon: '🎒', cat: 'thing', item: id, say: en + '!' };
      this.near('thing', w, 20); return;
    }
    const n = this.g.inv.count(id), w = countWord(n, id);
    if (w) this.near('count', w, 40);
  }
  /** a step of wudu: the body part in English */
  wuduStep(i: number) { const w = BODY_WORDS[i]; if (w) this.hear(w); }

  /** the sentence of the day, from Baby Mo, once a day */
  private phraseOfDay() {
    const g = this.g, today = new Date().toDateString();
    if (g.stats.phraseDay === today || this.busy() || performance.now() - this.bornAt < 45000) return;
    g.stats.phraseDay = today;
    const w = phraseFor(new Date());
    // a small card at the top: it never stops the game or hides other pop-ups
    g.ui.phraseCard(w, () => { this.learn(w); g.addCoins(10, from => g.ui.coinPop(10, from)); Speech.talk('Well done!', 'en', true, 0); });
    setTimeout(() => Speech.talk(w.en, 'en', true, 0), 400);
  }

  /** saying hello to a villager in English: they greet you, you pick an answer */
  chat(who: string, face: string, img: boolean) {
    const g = this.g, part = dayPart(g.hour, g.schedule) ?? (g.hour < 12 ? 'morning' : g.hour < 18 ? 'afternoon' : 'night');
    const hi = GREETS[part];
    Speech.talk(hi.en, 'en', true, 0); this.learn(hi);
    g.ui.dialog({
      face, img, who, speak: false,
      text: `<span class="phrase">${hi.icon} <b>${hi.en}</b></span><br><small>${hi.id}</small><br>${tr('Jawab dalam Bahasa Inggris:', 'Answer in English:')}`,
      buttons: REPLIES.map(r => ({
        label: `${r.me.icon} ${r.me.en}`, cls: 'ghost', fn: () => {
          Speech.talk(r.me.en, 'en', true, 0); this.learn(r.me);
          const today = new Date().toDateString(), cd = (g.stats.chatDay ??= {}), first = cd[who] !== today;
          cd[who] = today;
          setTimeout(() => {
            Speech.talk(r.back.en, 'en', true, 0); this.learn(r.back);
            if (first) g.addCoins(5, from => g.ui.coinPop(5, from));
            g.ui.dialog({ face, img, who, speak: false, text: `<span class="phrase">${r.back.icon} <b>${r.back.en}</b></span><br><small>${r.back.id}</small>${first ? '<br>🪙 +5' : ''}`, buttons: [{ label: '👋 Bye!' }] });
          }, 1400);
        },
      })),
    });
  }
  /** something good happened (stars): a praise word now and then */
  praise() {
    const now = performance.now();
    if (now - this.praiseAt < 25000) return;
    const w = nextPraise(this.lastPraise, Math.random());
    if (this.show(w)) { this.praiseAt = now; this.lastPraise = w.en; }
  }
  /** the word for a thing you came close to, at most once in a while per thing */
  near(key: string, w: Word, every = 150) {
    const now = performance.now(), t = this.seenAt.get(key) ?? -1e9;
    if (now - t < every * 1000) return;
    if (this.show(w)) this.seenAt.set(key, now);
  }

  /** you picked a fruit: say its name, and it grows back in a while */
  picked(x: number, y: number, z: number, id: number) {
    const key = FRUIT_BLOCK[id]; if (!key) return;
    const item = BLOCK_ITEM[id], n = item ? this.g.inv.count(item) : 0;
    this.show(countWord(n, item) ?? FRUIT_WORDS[key], true);
    const list = (this.g.stats.fruitPicked ??= []);
    if (list.length < 200) list.push([x, y, z, id, Date.now()]);
  }
  /** put back the fruit that has grown again (only where the spot is still empty) */
  private regrow() {
    const g = this.g, list = g.stats.fruitPicked; if (!list?.length) return;
    const now = Date.now();
    g.stats.fruitPicked = list.filter(([x, y, z, id, t]) => {
      if (now - t < REGROW_MS) return true;
      if (!g.world.isLoaded(x, z)) return true;
      if (g.world.get(x, y, z) === B.AIR) g.world.set(x, y, z, id);
      return false;
    });
    if (g.stats.fruitPicked.length !== list.length) g.saveSoon();
  }

  /** what you are doing, the first few times (each at most every few minutes) */
  private act(k: string) { if (this.met(ACTION_WORDS[k].en) < 5) this.near('act:' + k, ACTION_WORDS[k], 480); }

  /** walking past an animal or a fruit tree: its name in English; the weather, the time of day, what you do */
  update(dt: number) {
    const g = this.g, pl = g.player;
    if (this.on && pl) {
      // a jump: you just left the ground going up
      if (this.wasGround && !pl.onGround && pl.vel.y > 3 && !pl.inWater && !pl.flying && !g.fun.riding) this.act('jump');
      this.wasGround = pl.onGround;
    }
    if ((this.scanT -= dt) > 0) return;
    this.scanT = 0.5;
    this.regrow();
    if (!this.on) return;
    const p = pl.pos;
    if (pl.inWater && !pl.onGround && !g.fun.riding) this.act('swim');
    else if (pl.climbing) this.act('climb');
    else if (g.fun.riding) this.act('ride');
    else if (g.mining) this.act('dig');
    const orch = g.gen.landmarks.find(l => l.id === 'orchard');
    if (orch?.at && Math.abs(p.x - orch.x) < 20 && Math.abs(p.z - orch.z) < 20) {
      // the nearest fruit tree you are standing by
      let tree: { key: string; d: number } | null = null;
      for (const [k, v] of Object.entries(orch.at)) {
        const key = k.slice(5), d = Math.hypot(p.x - v[0], p.z - v[2]);
        if (k.startsWith('tree_') && FRUIT_WORDS[key] && d < 4.2 && Math.abs(p.y - v[1]) < 5 && (!tree || d < tree.d)) tree = { key, d };
      }
      if (tree) { this.near('tree:' + tree.key, treeWord(tree.key), 90); return; }
    }
    let best: { kind: AnimalKind; d: number } | null = null;
    for (const a of g.ents.animals) {
      const d = a.pos.distanceTo(p);
      if (d < 4.5 && (!best || d < best.d)) best = { kind: a.kind as AnimalKind, d };
    }
    if (best) {
      const t = this.animalAt[best.kind] ?? -1e9, now = performance.now();
      if (now - t >= 120000 && this.show(ANIMAL_WORDS[best.kind])) { this.animalAt[best.kind] = now; return; }
    }
    if (performance.now() - this.bornAt < 20000) return;
    // the weather of the day, rain or snow, and good morning / good night
    const wk = g.weather?.kind;
    if (wk && WEATHER_WORDS[wk]) this.near('wx:' + g.day, WEATHER_WORDS[wk], 1e9);
    if (g.sky.raining && !g.world.roofed(p.x, p.y, p.z)) this.near('rain', g.sky.snowy ? WEATHER_WORDS.snow : WEATHER_WORDS.rain, 600);
    const part = dayPart(g.hour, g.schedule);
    if (part) this.near('time:' + part + ':' + g.day, WEATHER_WORDS[part], 1e9);
    this.phraseOfDay();
  }
}
