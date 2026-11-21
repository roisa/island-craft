// A practice catch with Baby Mo: the first time you go fishing he walks you
// through it live, one step at a time, on the tutorial card. Each step only
// moves on once you've done it: hold the rod, go to the water (a trail of
// sparkles shows the way, or he takes you there), throw the float, wait, and
// tap when it dips. The practice fish bites soon and stays on longer, so the
// first catch always works; a too-early tap just means "let's throw again".
import * as THREE from 'three';
import type { Game } from '../main';
import { tr } from '../i18n';
import { B, I } from '../world/blocks';
import { SEA, Biome } from '../world/gen';
import { SFX } from './audio';

export type CoachStep = 'rod' | 'water' | 'cast' | 'wait' | 'bite' | 'done';
export const COACH_STEPS: CoachStep[] = ['rod', 'water', 'cast', 'wait', 'bite', 'done'];
/** the practice fish: bites after this many seconds and stays on the hook this long */
export const PRACTICE = { wait: 3.5, window: 3.2, again: 2.5 };

/** what happens next in practice, given what the child just did */
export function coachNext(step: CoachStep, ev: 'held' | 'atWater' | 'cast' | 'bite' | 'early' | 'escaped' | 'caught' | 'putAway'): CoachStep {
  switch (ev) {
    case 'held': return step === 'rod' ? 'water' : step;
    case 'putAway': return step === 'done' ? step : 'rod';
    case 'atWater': return step === 'water' ? 'cast' : step;
    case 'cast': return step === 'cast' || step === 'water' ? 'wait' : step;
    case 'bite': return step === 'wait' ? 'bite' : step;
    case 'early': return step === 'wait' || step === 'bite' ? 'cast' : step;
    case 'escaped': return step === 'bite' ? 'wait' : step;
    case 'caught': return step === 'done' ? step : 'done';
  }
}

export class FishCoach {
  step: CoachStep | null = null;
  private trailT = 0; private target: THREE.Vector3 | null = null; private findT = 0;
  constructor(private g: Game) { }
  get active() { return this.step !== null && this.step !== 'done'; }

  /** start practice (from the guide, or by itself the first time) */
  start() {
    const g = this.g;
    if (g.kid.tutorialActive()) { g.ui.toast(tr('Selesaikan dulu langkah pertama bersama Baby Mo ya 😊', 'Finish your first steps with Baby Mo first 😊'), 3500); return; }
    // no rod yet: Baby Mo lends one for keeps
    if (!g.inv.count(I.FISHING_ROD)) { g.inv.add(I.FISHING_ROD, 1); g.ui.pickup(I.FISHING_ROD, 1); g.ui.toast(tr('🎣 Baby Mo memberimu pancingan!', '🎣 Baby Mo gives you a fishing rod!'), 3000); }
    // make sure it's in the bar at the bottom, where you can tap it
    const at = g.inv.slots.findIndex(s => s?.id === I.FISHING_ROD);
    if (at >= 9) { const free = g.inv.slots.findIndex((s, i) => i < 9 && !s); g.inv.swap(at, free >= 0 ? free : 8); g.ui.refreshHotbar(); }
    g.fishing.practice = true;
    document.body.classList.add('coach-on');
    this.go(g.inv.held()?.id === I.FISHING_ROD ? 'water' : 'rod');
  }
  stop(silent = false) {
    if (this.step === null) return;
    this.step = null; this.target = null;
    this.g.fishing.practice = false;
    this.g.ui.tutorial(null);
    document.body.classList.remove('coach-on');
    document.querySelectorAll('.coachHi').forEach(e => e.classList.remove('coachHi'));
    if (!silent) this.g.ui.toast(tr('Latihan memancing selesai. Buka 🎣❓ kapan saja untuk mengulang.', 'Fishing practice stopped. Open 🎣❓ any time to try again.'), 3500);
  }

  /** something happened in the game (see main.ts) */
  on(ev: Parameters<typeof coachNext>[1]) {
    if (!this.active) return;
    const next = coachNext(this.step!, ev);
    if (ev === 'early') SFX.splash();
    if (next !== this.step) this.go(next, ev);
  }

  private go(s: CoachStep, why?: string) {
    const g = this.g, n = COACH_STEPS.indexOf(s) + 1, of = COACH_STEPS.length;
    this.step = s;
    document.querySelectorAll('.coachHi').forEach(e => e.classList.remove('coachHi'));
    const touch = document.body.classList.contains('desktop') ? tr('klik kanan', 'right-click') : tr('ketuk ✋ Pakai', 'tap ✋ Use');
    const card = (icon: string, id: string, en: string, hint?: string) => g.ui.tutorial({ icon, text: tr(id, en), n, of, hint });
    switch (s) {
      case 'rod': {
        card('🎣', 'Ketuk kotak pancingan di bawah layar untuk memegangnya.', 'Tap the fishing rod’s box at the bottom of the screen to hold it.');
        const at = g.inv.slots.findIndex((x, i) => i < 9 && x?.id === I.FISHING_ROD);
        document.querySelectorAll('#hotbar .slot')[at]?.classList.add('coachHi');
        break;
      }
      case 'water':
        this.target = null; this.findT = 0;
        card('🌊', 'Bagus! Sekarang jalan ke pinggir air. Ikuti kilauan emas ✨', 'Great! Now walk to the edge of the water. Follow the golden sparkles ✨');
        break;
      case 'cast':
        card('👀', why === 'early' ? `Ups, terlalu cepat! Pelampungnya harus tenggelam dulu. Ayo lempar lagi: lihat ke air, lalu ${touch}.` : `Lihat ke air, lalu ${touch} untuk melempar pelampung merah!`,
          why === 'early' ? `Oops, too early! The float has to dip first. Let’s throw again: look at the water, then ${touch}.` : `Look at the water, then ${touch} to throw the red float!`, '#bUse');
        break;
      case 'wait':
        card('⏳', why === 'escaped' ? 'Ikannya lepas, tidak apa-apa! Tunggu yang berikutnya… jangan ketuk dulu.' : 'Lemparan hebat! Sekarang tunggu… lihat pelampung merahnya. Jangan ketuk dulu ya!',
          why === 'escaped' ? 'It got away, that’s OK! Wait for the next one… don’t tap yet.' : 'Great throw! Now wait… watch the red float. Don’t tap yet!');
        break;
      case 'bite':
        card('❗', `SEKARANG! Pelampungnya tenggelam — ${touch}!`, `NOW! The float dipped — ${touch}!`, '#bUse');
        break;
      case 'done':
        g.ui.tutorial(null);
        g.fishing.practice = false;
        document.body.classList.remove('coach-on');
        g.stats.fishPractice = true;
        g.addCoins(50, from => g.ui.coinPop(50, from));
        g.ents.mo.celebrate = 2.5; g.ui.confetti(60); SFX.fanfare();
        g.ui.say(tr('Masya Allah, kamu berhasil! 🎉 Sekarang kamu pemancing sungguhan. Ingat: lempar, tunggu, lalu ketuk saat pelampung tenggelam. Alhamdulillah untuk rezekinya!', 'Masha Allah, you did it! 🎉 You’re a real fisher now. Remember: throw, wait, then tap when the float dips. Alhamdulillah for the catch!'), 'alright', 8000);
        g.saveSoon();
        setTimeout(() => { if (this.step === 'done') this.step = null; }, 500);
        break;
    }
  }

  update(dt: number) {
    if (!this.active) return;
    const g = this.g, p = g.player.pos, held = g.inv.held()?.id === I.FISHING_ROD;
    if (this.step === 'rod' && held) { SFX.pop(4); this.on('held'); return; }
    if (this.step !== 'rod' && !held && !g.fishing.busy) { this.on('putAway'); return; }
    if (this.step !== 'water') return;
    if (g.nearFishingWater()) { SFX.pop(6); this.on('atWater'); return; }
    // find the nearest water once in a while, and lay a trail of sparkles to it
    if ((this.findT -= dt) <= 0) {
      this.findT = 3; this.target = this.findWater(p);
      if (!this.target && !g.ui.isOpen()) this.offerRide();
    }
    if (!this.target || (this.trailT -= dt) > 0) return;
    this.trailT = 0.45;
    const dx = this.target.x - p.x, dz = this.target.z - p.z, d = Math.hypot(dx, dz);
    for (let i = 1; i <= 5 && i * 2.2 < d; i++) {
      const x = p.x + dx / d * i * 2.2, z = p.z + dz / d * i * 2.2, top = g.world.heightAt(Math.floor(x), Math.floor(z));
      g.fx.sparkle(x, Math.abs(top - p.y) < 6 ? top + 1.15 : p.y + 0.15, z, 1, 0xffd874, 0.25);
    }
  }
  /** the nearest open water (sea, river, pond) within reach */
  findWater(p: THREE.Vector3): THREE.Vector3 | null {
    const W = this.g.world, px = Math.floor(p.x), pz = Math.floor(p.z);
    for (let r = 2; r <= 48; r += 2) for (let k = 0; k < r * 4; k++) {
      const side = Math.floor(k / r), o = (k % r) - r / 2;
      const x = px + (side === 0 ? o : side === 1 ? r / 2 : side === 2 ? -o : -r / 2), z = pz + (side === 0 ? -r / 2 : side === 1 ? o : side === 2 ? r / 2 : -o);
      const top = W.heightAt(x, z);
      if (W.get(x, top + 1, z) === B.WATER && W.get(x, top + 2, z) !== B.WATER || W.get(x, top, z) === B.WATER) return new THREE.Vector3(x + 0.5, top + 1, z + 0.5);
    }
    return null;
  }
  private offered = false;
  /** water is far away: Baby Mo offers to take you to the shore */
  private offerRide() {
    if (this.offered) return;
    this.offered = true;
    const g = this.g;
    g.ui.dialog({
      face: 'img/baby-mo-ok.webp', img: true, who: 'Baby Mo',
      text: g.fishers ? tr('Airnya jauh dari sini. Mau aku antar ke Kolam Pancing? Di sana ikannya cepat menggigit 🎣', 'The water is far from here. Shall I take you to the Fishing Pond? The fish bite quickly there 🎣') : tr('Airnya jauh dari sini. Mau aku antar ke pantai? 🏖️', 'The water is far from here. Shall I take you to the beach? 🏖️'),
      buttons: [{ label: '✨ ' + tr('Ya, antar aku', 'Yes, take me'), cls: 'gold', fn: () => this.toShore() }, { label: tr('Aku jalan sendiri', 'I’ll walk'), cls: 'ghost' }],
    });
  }
  /** move to the nearest dry spot right next to open water (within a few steps), facing it */
  snapToEdge(): boolean {
    const g = this.g, W = g.world, p = g.player.pos;
    if (g.nearFishingWater() && g.waterAhead()) return true;
    const px = Math.floor(p.x), pz = Math.floor(p.z);
    let best: [number, number, number, number, number] | null = null, bd = Infinity;
    for (let dx = -14; dx <= 14; dx++) for (let dz = -14; dz <= 14; dz++) {
      const x = px + dx, z = pz + dz, top = W.heightAt(x, z);
      if (W.get(x, top, z) === B.WATER || W.get(x, top + 1, z) !== B.AIR || W.get(x, top + 2, z) !== B.AIR || Math.abs(top + 1 - p.y) > 6) continue;
      for (const [ex, ez] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        // open water just ahead, and more beyond it
        if (W.get(x + ex, top, z + ez) !== B.WATER && W.get(x + ex, top - 1, z + ez) !== B.WATER) continue;
        if (W.get(x + 3 * ex, top, z + 3 * ez) !== B.WATER && W.get(x + 3 * ex, top - 1, z + 3 * ez) !== B.WATER) continue;
        const d = dx * dx + dz * dz;
        if (d < bd) { bd = d; best = [x, top + 1, z, ex, ez]; }
      }
    }
    if (!best) return false;
    const [x, y, z, ex, ez] = best;
    p.set(x + 0.5, y, z + 0.5); g.player.vel.set(0, 0, 0); g.player.visY = y;
    g.player.yaw = Math.atan2(-ex, -ez); g.player.pitch = -0.45;
    return true;
  }
  /** to the fishing pond (or, if this world has none, the nearest beach next to the sea) */
  toShore() {
    const g = this.g, p = g.player.pos;
    if (g.goToPond()) return true;
    for (let r = 8; r <= 400; r += 4) for (let a = 0; a < Math.PI * 2; a += 4 / r) {
      const x = Math.round(p.x + Math.cos(a) * r), z = Math.round(p.z + Math.sin(a) * r), c = g.gen.column(x, z);
      if (c.h < SEA || c.h > SEA + 3) continue;
      // right at the edge: water one or two steps ahead, and more of it beyond, so the float lands on water
      // (not where it's snowy: the sea freezes over there, see gen.ts)
      const open = (cx: number, cz: number, below: number) => { const k = g.gen.column(cx, cz); return k.h < below && !(k.snow > 0.55 && k.biome !== Biome.DESERT); };
      const dir = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dz]) => open(x + dx, z + dz, SEA) && open(x + 2 * dx, z + 2 * dz, SEA) && open(x + 4 * dx, z + 4 * dz, SEA - 1));
      if (!dir) continue;
      const wet = dir;
      g.ui.sleepFade(true);
      setTimeout(() => {
        p.set(x + 0.5, c.h + 1, z + 0.5); g.player.vel.set(0, 0, 0); g.player.visY = p.y;
        g.player.yaw = Math.atan2(-wet[0], -wet[1]); // facing the water
        g.ents.mo.pos.set(x + 1.5, c.h + 1, z + 0.5);
        g.ui.sleepFade(false);
        // once the ground here has loaded, step right up to the real water's edge
        let tries = 0;
        const snap = () => { if (!this.snapToEdge() && ++tries < 8) setTimeout(snap, 500); };
        setTimeout(snap, 500);
      }, 600);
      return true;
    }
    g.ui.toast(tr('Tidak ada pantai di dekat sini 😅', 'There’s no beach nearby 😅'));
    return false;
  }
}
