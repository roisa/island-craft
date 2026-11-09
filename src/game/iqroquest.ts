// The Iqro journey in the world: once all 28 letters are found, the next
// lesson waits somewhere nearby as a glowing open book (📖) under a beam of
// light; the golden compass points to it. Walk into it to open the lesson.
// Finishing it gives coins and stars, and the next book appears.
import * as THREE from 'three';
import type { Game } from '../main';
import { tr, t2 } from '../i18n';
import { B } from '../world/blocks';
import { lessonAt, lessons, STAGES } from './iqro';
import { SFX } from './audio';

export const UNLOCK = 28;
/** coins for a lesson: 10, and 5 more for each star */
export const lessonCoins = (stars: number) => 10 + stars * 5;
/** is this the last lesson of its stage? */
export function stageEnds(n: number) {
  const all = lessons();
  return n < all.length && (n === all.length - 1 || all[n + 1].stage !== all[n].stage);
}

function bookMesh() {
  const g = new THREE.Group();
  const page = (side: number) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.56), new THREE.MeshLambertMaterial({ color: 0xfff6dc, emissive: 0x6a5a20, emissiveIntensity: 0.4 }));
    p.position.set(side * 0.22, 0, 0); p.rotation.z = -side * 0.22; g.add(p);
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.03, 0.6), new THREE.MeshLambertMaterial({ color: 0x1f7a4d }));
    cover.position.set(side * 0.23, -0.04, 0); cover.rotation.z = -side * 0.22; g.add(cover);
  };
  page(-1); page(1);
  g.scale.setScalar(1.6);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 14, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 4.4; g.add(beam);
  const glow = new THREE.PointLight(0xffd874, 1.2, 6); glow.position.y = 0.6; g.add(glow);
  return g;
}

export class IqroQuest {
  private book: THREE.Group | null = null; private placeT = 0; private opened = false;
  constructor(private g: Game) { }
  private get st() { return (this.g.stats.iqro ??= { n: 0, stars: {} }); }
  get unlocked() { return this.g.stats.letters.length >= UNLOCK; }
  /** where the book is, for the compass */
  get stone(): [number, number, number] | null { return this.unlocked ? this.st.stone ?? null : null; }
  /** the step you're on */
  get step() { return this.st.n; }

  update(dt: number) {
    const g = this.g;
    if (!this.unlocked) return;
    const st = this.st;
    // place the next book when there's none
    if (!st.stone && (this.placeT -= dt) <= 0) { this.placeT = 2; this.place(); }
    if (!st.stone) { if (this.book) { g.scene.remove(this.book); this.book = null; } return; }
    const [x, y, z] = st.stone;
    if (!this.book) { this.book = bookMesh(); g.scene.add(this.book); }
    const t = performance.now() / 1000;
    this.book.position.set(x, y + 0.9 + Math.sin(t * 2) * 0.12, z); this.book.rotation.y = t * 0.6;
    // walk into it to open the lesson (not while something else is going on)
    const p = g.player.pos;
    const busy = g.ui.isOpen() || !!g.playing || !!g.race?.active || !!g.tennis?.active || !!g.fun.riding || !!g.jamaah || this.opened;
    const d = Math.hypot(p.x - x, p.z - z);
    if (d > 2.6) this.away = true;
    if (!busy && this.away && d < 1.8 && Math.abs(p.y - y) < 3) { this.away = false; this.open(); }
  }
  /** a dry spot 18–35 blocks away, on the ground */
  private place() {
    const g = this.g, p = g.player.pos;
    for (let k = 0; k < 30; k++) {
      const a = Math.random() * Math.PI * 2, d = 18 + Math.random() * 17;
      const x = Math.floor(p.x + Math.cos(a) * d), z = Math.floor(p.z + Math.sin(a) * d);
      if (!g.world.isLoaded(x, z)) continue;
      const h = g.world.heightAt(x, z), top = g.world.get(x, h, z);
      if (top === B.WATER || top === B.ICE || h < 30 || Math.abs(h - p.y) > 12 || g.world.roofed(x + 0.5, h + 1, z + 0.5)) continue;
      this.st.stone = [x + 0.5, h + 1, z + 0.5];
      g.saveSoon();
      return;
    }
  }
  /** open the lesson of the book you found */
  open(review = false, at?: number) {
    const g = this.g, st = this.st;
    const step = at ?? st.n, { lesson, index, review: loop } = lessonAt(step);
    this.opened = true;
    SFX.letter();
    const stage = STAGES.find(s => s.n === lesson.stage)!;
    g.goodWord('start', true);
    g.ui.iqroLesson(lesson, `${stage.icon} Iqro ${lesson.stage} · ${t2(stage.name)}`, stars => {
      this.opened = false;
      st.stars ??= {}; st.stars[index] = Math.max(st.stars[index] ?? 0, stars);
      const coins = lessonCoins(stars);
      g.addCoins(coins, from => g.ui.coinPop(coins, from));
      g.kid.reward('letter'); g.ents.mo.celebrate = 1.5;
      if (review || at !== undefined) { g.saveSoon(); return; }
      // on to the next book
      if (stageEnds(step)) this.stageDone(lesson.stage);
      else if (loop) st.reviews = (st.reviews || 0) + 1;
      if (!loop || stageEnds(step)) g.goodWord(stars === 3 ? 'welldone' : 'thanks', true);
      st.n = step + 1; st.stone = undefined;
      if (this.book) { g.fx.sparkle(this.book.position.x, this.book.position.y, this.book.position.z, 20, 0xffd874, 2); g.scene.remove(this.book); this.book = null; }
      this.placeT = 3;
      setTimeout(() => g.ui.say(tr('Buku pelajaran berikutnya muncul di dekatmu. Ikuti kompas emas 📖', 'The next lesson book is somewhere near you. Follow the golden compass 📖'), 'idea', 6000), 3500);
      g.checkQuests(); g.saveSoon();
    }, () => { this.opened = false; });
  }
  /** you have to step away from a book you closed before it opens again */
  private away = true;
  private stageDone(stage: number) {
    const g = this.g, s = STAGES.find(x => x.n === stage)!, next = STAGES.find(x => x.n === stage + 1);
    g.addCoins(50, from => g.ui.coinPop(50, from));
    SFX.fanfare(); g.ui.confetti(80); g.fx.fireworks(g.player.pos.x, g.player.pos.y + 3, g.player.pos.z);
    g.ui.dialog({
      face: '🏆', who: tr(`Iqro ${stage} selesai!`, `Iqro ${stage} complete!`),
      text: tr(`<b>${s.icon} ${t2(s.name)}</b> — tamat! Masya Allah, kamu hebat! 🪙 +50`, `<b>${s.icon} ${t2(s.name)}</b> — finished! Masha Allah, well done! 🪙 +50`)
        + (next ? `<br>${tr('Berikutnya', 'Next')}: <b>${next.icon} ${t2(next.name)}</b>` : `<br>${tr('Kamu sudah menamatkan perjalanan Iqro! Sekarang buku-buku ulangan akan muncul — terus berlatih ya, sampai lancar membaca Al-Qur’an.', 'You finished the whole Iqro journey! Review books will keep appearing — keep practising until you read the Qur’an fluently.')}`),
    });
  }
}
