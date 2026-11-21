// Good deeds you can do in the village, each one recorded in the Amal Book:
// make wudu at the water, clear stones from the path, give to the masjid's
// charity box, give back extra change, remember Allah with the tasbih, and the
// Friday khutbah. Kept gentle: nothing is ever lost for not doing them.
import type { Game } from '../main';
import { tr, type T2 } from '../i18n';
import { B } from '../world/blocks';
import { VILLAGE_Y } from '../world/gen';
import { SFX } from './audio';

const G = VILLAGE_Y;

/** the steps of wudu, in order (simplified for children) */
export const WUDU: { icon: string; name: T2; times: number }[] = [
  { icon: '🤲', name: ['Niat & Bismillah', 'Intention & Bismillah'], times: 1 },
  { icon: '👐', name: ['Cuci kedua tangan', 'Wash both hands'], times: 3 },
  { icon: '👄', name: ['Berkumur', 'Rinse the mouth'], times: 3 },
  { icon: '👃', name: ['Bersihkan hidung', 'Rinse the nose'], times: 3 },
  { icon: '🙂', name: ['Basuh wajah', 'Wash the face'], times: 3 },
  { icon: '💪', name: ['Basuh tangan sampai siku', 'Wash arms to the elbows'], times: 3 },
  { icon: '🧑', name: ['Usap kepala', 'Wipe the head'], times: 1 },
  { icon: '👂', name: ['Usap telinga', 'Wipe the ears'], times: 1 },
  { icon: '🦶', name: ['Basuh kaki sampai mata kaki', 'Wash feet to the ankles'], times: 3 },
];

/** short Friday lessons, one per week */
export const KHUTBAH: T2[] = [
  ['Allah menyukai orang yang berbuat baik. Hari ini, coba bantu ayah atau ibu tanpa diminta ya.', 'Allah loves those who do good. Today, try helping your mum or dad without being asked.'],
  ['Rasulullah ﷺ selalu tersenyum kepada orang lain. Senyum itu sedekah yang paling mudah!', 'The Prophet ﷺ always smiled at people. A smile is the easiest charity!'],
  ['Jujur itu membawa kebaikan. Walaupun sulit, katakan yang benar ya.', 'Honesty leads to goodness. Even when it is hard, say what is true.'],
  ['Sayangilah yang lebih kecil, hormatilah yang lebih tua. Itu akhlak seorang Muslim.', 'Be gentle with those younger and respect those older. That is the character of a Muslim.'],
  ['Bumi ini amanah dari Allah. Jangan buang sampah sembarangan dan rawatlah tumbuhan.', 'The earth is a trust from Allah. Don’t litter, and look after the plants.'],
  ['Hari Jumat adalah hari terbaik dalam seminggu. Perbanyak shalawat kepada Nabi ﷺ.', 'Friday is the best day of the week. Send lots of blessings on the Prophet ﷺ.'],
];

export class Deeds {
  private rockT = 20;
  private jumuahShown = '';
  constructor(private g: Game) { }

  /** a stone or branch has fallen on a village path now and then */
  update(dt: number) {
    const g = this.g;
    if ((this.rockT -= dt) > 0) return;
    this.rockT = 90 + Math.random() * 90;
    const p = g.player.pos;
    if (Math.hypot(p.x, p.z) > 60) return;
    // the village's sandstone paths, away from where you're standing
    const paths: [number, number][] = [];
    for (let z = -10; z <= 19; z++) for (const x of [-1, 0, 1]) paths.push([x, z]);
    for (let x = -19; x <= 19; x++) for (const z of [4, 5, 6]) paths.push([x, z]);
    let free = 0;
    for (const [x, z] of paths) if (g.world.get(x, G + 1, z) === B.PATH_ROCK) free++;
    if (free >= 2) return;
    for (let k = 0; k < 12; k++) {
      const [x, z] = paths[Math.floor(Math.random() * paths.length)];
      if (Math.hypot(x + 0.5 - p.x, z + 0.5 - p.z) < 6 || Math.hypot(x, z) < 4) continue;
      if (g.world.get(x, G + 1, z) !== B.AIR || g.world.get(x, G, z) !== B.SANDSTONE) continue;
      g.world.set(x, G + 1, z, B.PATH_ROCK, false);
      return;
    }
  }
  /** cleared a stone from the path */
  clearedPath(x: number, y: number, z: number) {
    const g = this.g;
    g.fx.sparkle(x + 0.5, y + 0.6, z + 0.5, 12, 0xffd874, 1.5);
    g.amal('path');
    g.checkQuests();
  }

  /** the charity box: give some coins, quietly */
  charityBox() {
    const g = this.g, have = g.stats.coins || 0;
    const opts = [10, 50, 100].filter(n => n <= have);
    g.ui.dialog({
      face: '💰', who: tr('Kotak Sedekah', 'Charity Box'),
      text: have ? tr(`Sedekah untuk masjid dan orang yang membutuhkan. Koinmu: <b>🪙 ${have}</b>.<br><small>Rasulullah ﷺ: “Sedekah tidak mengurangi harta.” (HR. Muslim 2588)</small>`, `Charity for the masjid and people in need. Your coins: <b>🪙 ${have}</b>.<br><small>The Prophet ﷺ: “Charity never makes your wealth less.” (Muslim 2588)</small>`)
        : tr('Kamu belum punya koin. Tidak apa-apa! Senyum dan membantu orang juga sedekah 😊', 'You don’t have any coins yet. That’s fine! A smile and helping others are charity too 😊'),
      buttons: [...opts.map(n => ({ label: `🪙 ${n}`, cls: 'gold', fn: () => this.give(n) })), { label: tr('Nanti', 'Later') }],
    });
  }
  private give(n: number) {
    const g = this.g;
    if (!g.spendCoins(n)) return;
    g.stats.given = (g.stats.given || 0) + n;
    SFX.chime(); g.ui.confetti(30);
    g.fx.hearts(3.5, G + 2.2, -12.5, 4);
    g.amal('sadaqah');
    g.ui.say(tr(`Jazakallahu khairan! ${n} koinmu membantu masjid dan tetangga yang membutuhkan 💚`, `Jazakallahu khairan! Your ${n} coins help the masjid and neighbours in need 💚`), 'alright', 5000);
    g.checkQuests(); g.saveSoon();
  }

  /** sometimes Bu Aminah gives too much change by mistake */
  maybeExtraChange() {
    const g = this.g;
    if (Math.random() > 0.25) return;
    const extra = 10;
    g.addCoins(extra);
    g.ui.dialog({
      face: '🧕', who: 'Bu Aminah',
      text: tr(`Eh… sepertinya Bu Aminah memberi kembalian <b>${extra} koin</b> terlalu banyak. Apa yang mau kamu lakukan?`, `Oh… it looks like Bu Aminah gave you <b>${extra} coins</b> too much change. What will you do?`),
      buttons: [
        { label: tr('Kembalikan 🤝', 'Give it back 🤝'), cls: 'gold', fn: () => { g.spendCoins(extra); g.amal('honest'); SFX.chime(); g.ui.say(tr('Masya Allah, kamu jujur sekali! Bu Aminah senang sekali 💚', 'Masha Allah, you’re so honest! Bu Aminah is very happy 💚'), 'alright', 5000); g.checkQuests(); } },
        { label: tr('Simpan', 'Keep it'), fn: () => g.ui.say(tr('Hmm… uang itu milik Bu Aminah lho. Kalau berubah pikiran, kejujuran selalu lebih baik 😊', 'Hmm… that money belongs to Bu Aminah. Honesty is always better, if you change your mind 😊'), 'ok', 5000) },
      ],
    });
  }

  /** on a real Friday, the first visit to the masjid has a short khutbah for children */
  jumuah(inMasjid: boolean) {
    const g = this.g, now = new Date(), day = now.toDateString();
    if (now.getDay() !== 5 || !inMasjid || this.jumuahShown === day || g.stats.jumuahDay === day || g.ui.isOpen()) return;
    this.jumuahShown = day; g.stats.jumuahDay = day;
    const week = Math.floor(now.getTime() / (7 * 86400000));
    const lesson = KHUTBAH[week % KHUTBAH.length];
    g.ui.dialog({
      face: 'img/ibrahim-face.webp', img: true, who: tr('Khutbah Jumat untuk anak', 'A Friday talk for children'),
      text: tr(`<b>Hari ini hari Jumat!</b> 🕌<br>${lesson[0]}`, `<b>It’s Friday today!</b> 🕌<br>${lesson[1]}`),
      buttons: [{ label: tr('Insya Allah! 🤲', 'In sha Allah! 🤲'), cls: 'gold', fn: () => { g.amal('learn'); g.checkQuests(); } }],
    });
  }
}
