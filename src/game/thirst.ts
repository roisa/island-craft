// Drinking water: you and Baby Mo both get thirsty while working (digging,
// building, swimming, running about), a little slower while resting. A water
// bottle in the bag holds four sips; fill it at the sea, a river or the village
// well, drink with "Use", or hold it and tap Baby Mo to give him a drink.
// Kept gentle: being thirsty only slows you a little, nothing is ever lost.
import type { Game } from '../main';
import { tr } from '../i18n';
import { I } from '../world/blocks';
import { SFX } from './audio';

export const SIPS = 4;
/** one sip brings this much back */
export const SIP = 40;
/** below this you (or Mo) feel thirsty */
export const LOW = 25;
/** points lost per second: about 10 minutes of busy work, or 30 of resting, from full to empty */
export const RATE = { busy: 100 / 600, rest: 100 / 1800 };

export interface Hydration { me: number; mo: number; sips: number; got?: boolean }
export const newHydration = (): Hydration => ({ me: 100, mo: 100, sips: SIPS });

/** a level after dt seconds of busy or quiet play */
export function drain(level: number, dt: number, busy: boolean): number {
  return Math.max(0, level - (busy ? RATE.busy : RATE.rest) * dt);
}
/** after one sip */
export const sip = (level: number) => Math.min(100, level + SIP);
/** how fast you move and dig: a little slower when thirsty, never stopped */
export const thirstSpeed = (level: number) => (level < LOW ? 0.8 + 0.2 * (level / LOW) : 1);

export class Thirst {
  private moSaidT = 30;
  private meSaid = false;
  private dropT = 0;
  constructor(private g: Game) { }
  get h(): Hydration {
    return (this.g.stats.hydr ??= newHydration());
  }

  update(dt: number, busy: boolean) {
    const g = this.g, h = this.h;
    // Baby Mo gives you a water bottle the first time (and again if it's gone)
    if (!g.inv.count(I.BOTTLE) && !g.ui.isOpen() && !g.kid.tutorialActive()) {
      g.inv.add(I.BOTTLE, 1); h.sips = SIPS;
      g.ui.say(h.got ? tr('Ini botol air baru untukmu 💧', 'Here’s a new water bottle for you 💧')
        : tr('Ini botol air untukmu! 💧 Kalau haus, pegang botolnya lalu ketuk <b>Pakai</b>. Isi lagi di laut, sungai atau sumur desa.', 'Here’s a water bottle for you! 💧 When you’re thirsty, hold it and tap <b>Use</b>. Fill it again at the sea, a river or the village well.'), 'idea', 7000);
      h.got = true; g.saveSoon();
    }
    if (!g.inv.count(I.BOTTLE) || g.paused || g.ui.isOpen() || g.prayingTogether) return; // no thirst before you have a bottle
    h.me = drain(h.me, dt, busy);
    h.mo = drain(h.mo, dt, busy);
    if (h.me < LOW && !this.meSaid) { this.meSaid = true; g.ui.say(tr('Kamu kelihatan haus… 💧 Minum dulu dari botol air ya, supaya kuat lagi!', 'You look thirsty… 💧 Have a drink from your water bottle so you feel strong again!'), 'idea', 6000); }
    if (h.me >= LOW + 15) this.meSaid = false;
    // a thirsty Baby Mo has little water drops over his head now and then
    if (h.mo < LOW && (this.dropT -= dt) <= 0) { this.dropT = 4; const mo = g.ents.mo; g.fx.sparkle(mo.pos.x, mo.pos.y + 2.1, mo.pos.z, 4, 0x8fd3ec, 0.6); }
    if (h.mo < LOW && (this.moSaidT -= dt) <= 0) {
      this.moSaidT = 90;
      g.ui.say(tr('Aku haus… 🥺 Boleh minta minum? Pegang botol air lalu ketuk aku ya.', 'I’m thirsty… 🥺 Can I have a drink? Hold the water bottle and tap me.'), 'pose-05', 6000);
    }
  }

  /** "Use" with the bottle: fill it by water, otherwise drink a sip */
  use(nearWater: boolean) {
    const g = this.g, h = this.h;
    if (nearWater && h.sips < SIPS) {
      h.sips = SIPS; SFX.pour();
      g.ui.toast(tr('💧 Botol penuh lagi! Bismillah', '💧 Bottle filled! Bismillah'), 3000);
      g.saveSoon(); return;
    }
    if (h.sips <= 0) { g.ui.toast(tr('🫙 Botolnya kosong. Isi di laut, sungai atau sumur desa ya!', '🫙 The bottle is empty. Fill it at the sea, a river or the village well!'), 4000); return; }
    h.sips--; h.me = sip(h.me);
    SFX.gulp(); g.anim.play('drink', 2.4);
    g.fx.sparkle(g.player.pos.x, g.player.pos.y + 1.5, g.player.pos.z, 8, 0x8fd3ec, 1.2);
    g.amal('bismillah');
    g.ui.toast(tr(`😋 Bismillah… Alhamdulillah, segar! (sisa ${h.sips} teguk) · Sunnah: minum sambil duduk, pakai tangan kanan, 3 kali napas`, `😋 Bismillah… Alhamdulillah, so fresh! (${h.sips} sips left) · Sunnah: sit, use your right hand, drink in 3 breaths`), 4500);
    g.checkQuests(); g.saveSoon();
  }

  /** hold the bottle and tap Baby Mo */
  giveMo(): boolean {
    const g = this.g, h = this.h, mo = g.ents.mo;
    if (h.sips <= 0) { g.ui.say(tr('Botolnya kosong 😅 Isi dulu di air ya, nanti kita minum bareng!', 'The bottle is empty 😅 Fill it at the water, then we can drink together!'), 'ok', 4500); return true; }
    h.sips--; h.mo = sip(h.mo);
    mo.holdGlass(3); mo.anim?.play('drink', 3);
    SFX.gulp(); g.fx.hearts(mo.pos.x, mo.pos.y + 1.8, mo.pos.z, 3);
    g.amal('water');
    setTimeout(() => g.ui.say(tr('Ahh, segar! Terima kasih 💚 Rasulullah ﷺ bilang memberi air adalah sedekah yang paling baik.', 'Ahh, so fresh! Thank you 💚 The Prophet ﷺ said giving water is the best charity.'), 'ok', 6000), 1200);
    g.checkQuests(); g.saveSoon();
    return true;
  }

  /** a real glass of water during the water break fills everyone up */
  refillAll() { const h = this.h; h.me = 100; h.mo = 100; h.sips = SIPS; this.meSaid = false; }
}
