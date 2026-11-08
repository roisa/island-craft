// Bedtime instead of a sudden stop. When today's play time is nearly over the
// island gets ready for bed: about 10 minutes before, the light turns to
// evening and Baby Mo starts to yawn ("let's finish building, soon it's
// bedtime"); 5 minutes before he asks you to get ready, and you can go to bed
// early for a little reward. At the end Baby Mo falls asleep and a goodnight
// card says the house is saved for tomorrow. If you were in the middle of
// building, Mo waits two more minutes once a day so you can finish.
import type { Game } from '../main';
import { tr } from '../i18n';
import { SFX } from './audio';
import * as THREE from 'three';
import { BLOCKS } from '../world/blocks';

/** seconds before the limit when evening starts, and when Mo asks you to get ready */
export const EVENING = 600, READY = 300, GRACE = 120;

/** 0 playing · 1 evening, Mo is sleepy · 2 get ready for bed · 3 time to sleep */
export function bedPhase(rem: number): 0 | 1 | 2 | 3 {
  return rem <= 0 ? 3 : rem <= READY ? 2 : rem <= EVENING ? 1 : 0;
}
/** how much evening tint to show (0..1) */
export const duskAmount = (rem: number) => Math.max(0, Math.min(1, (EVENING - rem) / EVENING));

export class Bedtime {
  phase = 0;
  private yawnT = 20;
  private zzzT = 0;
  /** you placed a block a moment ago (set by main) */
  lastBuildAt = -1e9;
  constructor(private g: Game) { }

  /** called every frame with the seconds left today (null: no limit) */
  tick(rem: number | null, dt: number) {
    const g = this.g, mo = g.ents.mo;
    if (rem === null) { if (this.phase) this.reset(); return; }
    const pl = g.stats.play!;
    // went to bed early: today's play is over until a grown-up adds time
    if (pl.slept && !g.ui.locked) { this.goodnight(false); return; }
    const ph = pl.slept ? 3 : bedPhase(rem);
    g.ui.dusk(pl.slept ? 1 : duskAmount(rem));
    g.ui.bedHud(ph === 1 || ph === 2 ? rem : null);
    if (ph === 3) {
      if (g.ui.locked) { this.zzz(dt); return; }
      // in the middle of building: Mo waits a little, once a day
      if (this.phase >= 1 && !pl.grace && performance.now() - this.lastBuildAt < 45000) {
        pl.grace = true; pl.extra = (pl.extra || 0) + GRACE;
        g.ui.say(tr('Oke, Mo tunggu <b>2 menit</b> lagi supaya kamu bisa menyelesaikan bagian terakhir 🧱 Habis itu kita tidur ya 😴', 'Okay, I’ll wait <b>2 more minutes</b> so you can finish the last part 🧱 Then we sleep 😴'), 'ok', 7000);
        return;
      }
      this.goodnight(false); return;
    }
    if (ph > this.phase) {
      if (ph === 1) g.ui.say(tr('Hoaam… 🥱 Sudah sore, Mo mulai ngantuk. Yuk selesaikan bangunannya, sebentar lagi waktunya tidur!', 'Yaaawn… 🥱 It’s getting late and I’m sleepy. Let’s finish our building, it’s nearly bedtime!'), 'pose-05', 7000);
      if (ph === 2) g.ui.say(tr('5 menit lagi waktunya tidur 😴 Rumahmu selalu tersimpan, besok kita lanjutkan! Ketuk <b>Tidur sekarang</b> kalau sudah siap — tidur tepat waktu dapat hadiah ⭐', 'Bedtime in 5 minutes 😴 Your house is always saved, we’ll carry on tomorrow! Tap <b>Sleep now</b> when you’re ready — going to bed on time gets a reward ⭐'), 'idea', 8000);
      this.phase = ph;
    }
    if (ph < this.phase) this.reset(); // a grown-up added time
    if (ph >= 1 && (this.yawnT -= dt) <= 0) { this.yawnT = ph === 2 ? 35 : 60; mo.yawn(); }
  }

  /** "Sleep now", before the time is up: a little reward for going to bed on time */
  sleepNow() {
    const g = this.g, pl = g.stats.play;
    if (!pl || pl.slept) return;
    pl.slept = true;
    g.stats.onTime = (g.stats.onTime || 0) + 1;
    g.addCoins(20); g.kid.reward('sleep');
    SFX.chime();
    this.goodnight(true);
  }

  /** Baby Mo falls asleep, and the goodnight card comes */
  private goodnight(early: boolean) {
    const g = this.g;
    this.phase = 3;
    const mo = g.ents.mo;
    // Baby Mo sits down beside you on the left, facing the camera, so you can see him sleep
    if (!mo.sleeping && !mo.prayAt && !mo.seat && !g.fun.riding) {
      const d = g.camera.getWorldDirection(new THREE.Vector3()); d.y = 0;
      if (d.lengthSq() > 1e-4) {
        d.normalize();
        const p = g.player.pos, x = p.x + d.z * 1.3 + d.x * 0.6, z = p.z - d.x * 1.3 + d.z * 0.6;
        const solid = (y: number) => BLOCKS[g.world.get(Math.floor(x), Math.floor(y), Math.floor(z))]?.solid;
        if (!solid(p.y + 0.2) && !solid(p.y + 1.2) && solid(p.y - 0.5)) { mo.pos.set(x, p.y, z); mo.yaw = Math.atan2(-d.x, -d.z); }
      }
    }
    mo.sleeping = true;
    g.ui.bedHud(null); g.ui.dusk(1);
    if (g.stats.amal?.day !== new Date().toDateString() || !(g.stats.amal?.today.sleep)) g.amal('sleep', 1, true);
    g.ui.lockScreen(true, early);
  }

  private zzz(dt: number) {
    if ((this.zzzT -= dt) > 0) return;
    this.zzzT = 1.6;
    const mo = this.g.ents.mo;
    this.g.fx.sparkle(mo.pos.x, mo.pos.y + 1.9, mo.pos.z, 3, 0xbfd7ff, 0.5);
  }

  /** more time was added: wake up, daylight again */
  reset() {
    const g = this.g;
    this.phase = 0; this.yawnT = 20;
    g.ents.mo.sleeping = false;
    g.ui.dusk(0); g.ui.bedHud(null);
  }
}
