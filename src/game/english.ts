// Learning English while playing: a little word card pops up (the English
// word, big, with its Indonesian meaning, and Baby Mo says it in English) when
// you do something great (praise words), walk past an animal, or come to a
// fruit tree. Every word you meet is kept in "My English Words" to hear again.
import type { Game } from '../main';
import type { AnimalKind } from './models';
import { Speech } from './audio';
import { B } from '../world/blocks';

export type WordCat = 'praise' | 'animal' | 'fruit';
export interface Word { en: string; id: string; icon: string; cat: WordCat; say?: string }

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

/** the fruit block on a tree → its word */
export const FRUIT_BLOCK: Record<number, string> = {
  [B.FRUIT_APPLE]: 'apple', [B.FRUIT_MANGO]: 'mango', [B.FRUIT_BANANA]: 'banana', [B.FRUIT_ORANGE]: 'orange',
  [B.FRUIT_COCONUT]: 'coconut', [B.FRUIT_PAPAYA]: 'papaya', [B.FRUIT_RAMBUTAN]: 'rambutan', [B.WATERMELON]: 'watermelon',
};
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
  private scanT = 0;
  constructor(private g: Game) { }
  private get on() { return this.g.settings.english !== false; }
  private busy() { const g = this.g; return g.ui.isOpen() || !!g.race?.active || !!g.tennis?.active || !!g.jamaah || g.kid.tutorialActive(); }

  /** show the word card and say it in English; it goes into "My English Words" */
  show(w: Word, force = false) {
    const g = this.g, now = performance.now();
    if (!this.on || (!force && (this.busy() || now - this.shownAt < 6000))) return false;
    this.shownAt = now;
    g.ui.wordCard(w);
    Speech.talk(w.say ?? w.en, 'en', false, 0);
    const v = (g.stats.vocab ??= {});
    const e = (v[w.en] ??= { cat: w.cat, n: 0 }); e.n++;
    g.saveSoon();
    return true;
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
    this.show(FRUIT_WORDS[key], true);
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

  /** walking past an animal or a fruit tree: its name in English */
  update(dt: number) {
    if ((this.scanT -= dt) > 0) return;
    this.scanT = 0.5;
    this.regrow();
    if (!this.on) return;
    const g = this.g, p = g.player.pos;
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
    if (!best) return;
    const t = this.animalAt[best.kind] ?? -1e9, now = performance.now();
    if (now - t < 120000) return;
    if (this.show(ANIMAL_WORDS[best.kind])) this.animalAt[best.kind] = now;
  }
}
