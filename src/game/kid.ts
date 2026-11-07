import { ic } from '../icons';
// Things that make the game easy and joyful for young children:
// a step-by-step tutorial, a golden beacon that shows where to go, stars &
// levels with celebrations, a rescue when you're stuck, and protection for
// the village buildings so they can't be wrecked by accident.
import * as THREE from 'three';
import type { Game } from '../main';
import { tr, type T2 } from '../i18n';
import { B } from '../world/blocks';
import { CS, H, VILLAGE_Y, idx } from '../world/gen';
import { isTouch } from './input';
import { SFX, haptic } from './audio';
import { Animal } from './entities';

// ---------- stars & levels (pure maths lives in levels.ts) ----------
import { TITLES, starsFor, levelOf, titleOf } from './levels';
export { TITLES, starsFor, levelOf, titleOf };

export type KidEvent = 'letter' | 'quest' | 'pet' | 'give' | 'plant' | 'jamaah' | 'iftar' | 'sahur' | 'craft' | 'place' | 'biome' | 'calendar' | 'quiz' | 'tutorial' | 'water';
const STARS: Record<KidEvent, number> = { letter: 5, quest: 10, pet: 1, give: 3, plant: 2, jamaah: 5, iftar: 5, sahur: 3, craft: 1, place: 0, biome: 3, calendar: 3, quiz: 1, tutorial: 3, water: 3 };

// ---------- tutorial ----------
interface Step { icon: string; text: T2; hint?: string; done: (k: Kid) => boolean; target?: (k: Kid) => THREE.Vector3 | null }
const STEPS: Step[] = [
  {
    icon: '🕹️', hint: '#stick',
    text: isTouch ? ['Geser joystick untuk berjalan ke Baby Mo', 'Move the joystick to walk to Baby Mo'] : ['Tekan W A S D untuk berjalan ke Baby Mo', 'Press W A S D to walk to Baby Mo'],
    done: k => k.walked > 4, target: k => k.g.ents.mo.pos.clone(),
  },
  { icon: '👋', hint: '#moHi', text: isTouch ? ['Ketuk tombol 👋 di atas Baby Mo untuk menyapa!', 'Tap the 👋 button above Baby Mo to say hi!'] : ['Klik Baby Mo atau tombol 👋 di atasnya untuk menyapa!', 'Click Baby Mo or the 👋 button above him to say hi!'], done: k => !!k.g.stats.talked.mo, target: k => k.g.ents.mo.pos.clone() },
  { icon: '👀', text: isTouch ? ['Geser layar untuk melihat sekeliling', 'Swipe the screen to look around'] : ['Klik layar, lalu gerakkan mouse untuk melihat', 'Click the screen, then move the mouse to look around'], done: k => k.turned > 2.2 },
  {
    icon: '🌴', hint: '#bMine',
    text: isTouch ? ['Tahan jarimu di batang pohon sampai pohonnya tumbang!', 'Hold your finger on a tree trunk until the tree falls!'] : ['Tahan klik kiri di batang pohon sampai pohonnya tumbang!', 'Hold the left mouse button on a tree trunk until it falls!'],
    done: k => (k.g.stats.mined[B.PALM_LOG] || 0) + (k.g.stats.mined[B.OAK_LOG] || 0) + (k.g.stats.mined[B.PINE_LOG] || 0) > 0, target: k => k.nearestTree(),
  },
  { icon: '✨', text: ['Ikuti cahaya emas ke huruf pertamamu!', 'Follow the golden light to your first letter!'], done: k => k.g.stats.letters.length > 0, target: k => k.nearestShrine() },
];

// ---------- village buildings that can't be broken ----------
const PROTECT: [number, number, number, number][] = [
  [-8, 13, -28, -12],   // masjid + minaret
  [-19, -11, 8, 16], [11, 19, 8, 16], // houses
  [-11, -5, 6, 10], [6, 10, 6, 10],  // market stall, well
];
const POSTS = [[-6, -6], [6, -6], [-6, 6], [6, 6], [-3, -10], [3, -10], [-3, 16], [3, 16], [-12, 3], [12, 3], [-20, 3], [20, 3], [3, -3], [-3, -3]];

export class Kid {
  walked = 0; turned = 0;
  private lastPos = new THREE.Vector3(); private lastYaw = 0;
  private beacon = new THREE.Group(); private arrow: THREE.Mesh; private beam: THREE.Mesh;
  private target: THREE.Vector3 | null = null;
  private targetT = 0;
  private trace: { x: number; z: number; moving: boolean }[] = [];
  private traceT = 0; private stuckCooldown = 10;
  private shownStep = -1;
  private treeCache: { at: number; pos: THREE.Vector3 | null } = { at: -1, pos: null };

  constructor(public g: Game) {
    const gold = new THREE.MeshBasicMaterial({ color: 0xffd874, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, 36, 12, 1, true), gold);
    this.beam.position.y = 18;
    this.arrow = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.8, 4), new THREE.MeshBasicMaterial({ color: 0xffc23a }));
    this.arrow.rotation.x = Math.PI;
    this.beacon.add(this.beam, this.arrow);
    this.beacon.visible = false;
    g.scene.add(this.beacon);
  }

  get step() { return this.g.stats.tut ?? 0; }
  /** the "say hi" step: the floating 👋 button over Baby Mo is shown */
  get helloStep() { return this.tutorialActive() && STEPS[this.step].icon === '👋'; }
  /** the skip button on the tutorial card: move on without the reward */
  skipStep() {
    if (!this.tutorialActive()) return;
    this.g.stats.tut = this.step + 1;
    if (!this.tutorialActive()) this.g.ui.tutorial(null); else this.showStep();
    this.g.saveSoon();
  }
  /** skip everything that's left (offered after a skip) */
  skipAll() { this.g.stats.tut = STEPS.length; this.g.ui.tutorial(null); this.g.saveSoon(); }
  tutorialActive() { return this.step < STEPS.length; }

  /** called once after loading: players with progress skip the tutorial */
  start(isNew: boolean) {
    const s = this.g.stats;
    if (s.tut === undefined) s.tut = isNew ? 0 : (s.letters.length > 0 || this.g.questsDone.size > 2 ? 99 : 0);
    this.lastPos.copy(this.g.player.pos); this.lastYaw = this.g.player.yaw;
    this.showStep();
  }

  // ---------- stars ----------
  reward(ev: KidEvent, mult = 1) {
    const n = STARS[ev] * mult;
    if (n <= 0) return;
    const s = this.g.stats;
    const before = levelOf(s.stars);
    s.stars += n;
    this.g.ui.starPop(n);
    const after = levelOf(s.stars);
    if (after > before) setTimeout(() => this.levelUp(after), 900);
  }
  private levelUp(lv: number) {
    SFX.fanfare(); haptic([20, 40, 20, 40, 40]);
    const p = this.g.player.pos;
    this.g.fx.fireworks(p.x, p.y + 2, p.z);
    this.g.ents.mo.celebrate = 3;
    this.g.anim.play('celebrate', 2);
    const gifts: [number, number][] = [[B.LANTERN, 2], [B.GOLD_TILE, 4 + lv], [B.MOSAIC, 4 + lv]];
    for (const [id, k] of gifts) this.g.inv.add(id, k);
    this.g.onLevelUp?.(lv);
    this.g.ui.levelUp(lv, titleOf(lv), gifts);
  }

  // ---------- per-frame ----------
  update(dt: number, t: number) {
    const g = this.g, p = g.player;
    const d = Math.hypot(p.pos.x - this.lastPos.x, p.pos.z - this.lastPos.z);
    if (d < 3) this.walked += d;
    let dy = Math.abs(p.yaw - this.lastYaw); if (dy > Math.PI) dy = 0;
    this.turned += dy;
    this.lastPos.copy(p.pos); this.lastYaw = p.yaw;

    // tutorial progress
    if (this.tutorialActive()) {
      const st = STEPS[this.step];
      if (st.done(this)) {
        g.stats.tut = this.step + 1;
        SFX.quest(); this.reward('tutorial');
        g.ents.mo.celebrate = 1.5;
        g.ui.confetti(30);
        if (!this.tutorialActive()) {
          g.ui.tutorial(null);
          setTimeout(() => g.ui.say(tr('Hebat! Kamu sudah siap berpetualang sendiri. Lihat ⭐ misi di kanan atas ya!', 'Amazing! You’re ready to explore on your own. Check the ⭐ quests at the top right!'), 'alright', 7000), 600);
          setTimeout(() => g.festive.dailyGift(), 4000);
        } else this.showStep();
      }
    }

    // golden beacon over the current target
    this.targetT -= dt;
    if (this.targetT <= 0) { this.targetT = 0.5; this.target = this.pickTarget(); }
    const tg = this.target;
    if (tg && Math.hypot(tg.x - p.pos.x, tg.z - p.pos.z) > 2.5) {
      this.beacon.visible = true;
      this.beacon.position.copy(tg);
      this.arrow.position.y = 2.6 + Math.sin(t * 4) * 0.25;
      this.arrow.rotation.y += dt * 2;
      (this.beam.material as THREE.MeshBasicMaterial).opacity = 0.22 + Math.sin(t * 3) * 0.08;
    } else this.beacon.visible = false;

    // stuck rescue: trying to move for a while without getting anywhere
    this.traceT -= dt; this.stuckCooldown -= dt;
    if (this.traceT <= 0) {
      this.traceT = 1;
      const ax = g.input.axis();
      this.trace.push({ x: p.pos.x, z: p.pos.z, moving: Math.hypot(ax.fx, ax.fz) > 0.3 || g.input.jump() });
      if (this.trace.length > 8) this.trace.shift();
      if (this.trace.length === 8 && this.stuckCooldown <= 0 && !p.flying) {
        const a = this.trace[0], b = this.trace[7];
        const tries = this.trace.filter(e => e.moving).length;
        let groundY = 0;
        for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) groundY = Math.max(groundY, this.surfaceY(Math.floor(p.pos.x) + ox, Math.floor(p.pos.z) + oz));
        const inHole = p.pos.y < groundY - 1.5;
        if (tries >= 6 && Math.hypot(a.x - b.x, a.z - b.z) < 1.6 && (inHole || tries === 8)) { this.stuckCooldown = 45; this.offerRescue(); }
      }
    }
  }

  private showStep() {
    if (!this.tutorialActive()) { this.g.ui.tutorial(null); return; }
    if (this.shownStep === this.step) return;
    this.shownStep = this.step;
    const st = STEPS[this.step];
    this.g.ui.tutorial({ icon: st.icon, text: tr(st.text[0], st.text[1]), n: this.step + 1, of: STEPS.length, hint: st.hint });
  }

  private pickTarget(): THREE.Vector3 | null {
    const g = this.g;
    if (this.tutorialActive()) return STEPS[this.step].target?.(this) ?? null;
    const q = g.activeQuests()[0];
    if (!q) return null;
    const npc = (id: string) => g.ents.npcs.find(n => n.id === id)?.pos.clone() ?? null;
    switch (q.id) {
      case 'hello': return g.ents.mo.pos.clone();
      case 'wood': case 'dates': return this.nearestTree(q.id === 'dates');
      case 'pick': return new THREE.Vector3(3.5, VILLAGE_Y + 1, -2.5);
      case 'letter1': case 'letters10': case 'letters28': return this.nearestShrine();
      case 'ustadz': return npc('ustadz');
      case 'sedekah': return npc('aminah');
      case 'milk': return this.nearestAnimal(['cow', 'camel', 'goat']);
      case 'pet': return this.nearestAnimal();
      case 'jamaah': return new THREE.Vector3(0.5, VILLAGE_Y + 1, -18.5);
    }
    return null;
  }

  nearestShrine(): THREE.Vector3 | null {
    const p = this.g.player.pos, have = new Set(this.g.stats.letters);
    let best: THREE.Vector3 | null = null, bd = Infinity;
    for (const s of this.g.gen.shrines) {
      if (have.has(s.letter)) continue;
      const d = Math.hypot(s.x - p.x, s.z - p.z);
      if (d < bd) { bd = d; best = new THREE.Vector3(s.x + 0.5, s.y, s.z + 0.5); }
    }
    return best;
  }
  nearestTree(palmOnly = false): THREE.Vector3 | null {
    const now = performance.now();
    if (now - this.treeCache.at < 2000) return this.treeCache.pos;
    const w = this.g.world, p = this.g.player.pos;
    const px = Math.floor(p.x), pz = Math.floor(p.z), py = Math.floor(p.y);
    let best: THREE.Vector3 | null = null, bd = Infinity;
    for (let dx = -24; dx <= 24; dx++) for (let dz = -24; dz <= 24; dz++) {
      const dd = dx * dx + dz * dz; if (dd >= bd) continue;
      for (let y = py - 3; y <= py + 3; y++) {
        const id = w.get(px + dx, y, pz + dz);
        if ((palmOnly ? id === B.PALM_LOG : (id === B.PALM_LOG || id === B.OAK_LOG || id === B.PINE_LOG)) && w.get(px + dx, y - 1, pz + dz) !== id) {
          bd = dd; best = new THREE.Vector3(px + dx + 0.5, y, pz + dz + 0.5); break;
        }
      }
    }
    this.treeCache = { at: now, pos: best };
    return best;
  }
  private nearestAnimal(kinds?: string[]): THREE.Vector3 | null {
    const p = this.g.player.pos;
    let best: Animal | null = null, bd = Infinity;
    for (const a of this.g.ents.animals) {
      if (kinds && !kinds.includes(a.kind)) continue;
      const d = a.pos.distanceToSquared(p); if (d < bd) { bd = d; best = a; }
    }
    return best ? best.pos.clone() : null;
  }

  private surfaceY(x: number, z: number) {
    const w = this.g.world;
    for (let y = H - 2; y > 0; y--) { const b = w.get(x, y, z); if (b !== B.AIR && b !== B.WATER && w.solidAt(x, y, z)) return y + 1; }
    return VILLAGE_Y + 1;
  }
  private offerRescue() {
    const g = this.g;
    if (g.ui.isOpen()) return;
    g.ui.dialog({
      face: 'img/baby-mo-idea.webp', img: true, who: 'Baby Mo',
      text: tr('Sepertinya kamu terjebak. Mau aku bantu? 🤗', 'Looks like you’re stuck. Shall I help you? 🤗'),
      speak: true,
      buttons: [
        { label: ic('up') + tr('Naik ke atas', 'Go up to the surface'), cls: 'gold', fn: () => this.rescueUp() },
        { label: ic('home') + tr('Pulang ke desa', 'Back to the village'), fn: () => g.goHome(true) },
        { label: tr('Tidak usah', 'No thanks'), cls: 'ghost' },
      ],
    });
  }
  rescueUp() {
    const g = this.g, p = g.player.pos;
    // stand on the highest ground around the hole
    let y = 0, bx = Math.floor(p.x), bz = Math.floor(p.z);
    for (const [ox, oz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const sy = this.surfaceY(Math.floor(p.x) + ox, Math.floor(p.z) + oz); if (sy > y) { y = sy; bx = Math.floor(p.x) + ox; bz = Math.floor(p.z) + oz; } }
    p.x = bx + 0.5; p.z = bz + 0.5; p.y = y; g.player.vel.set(0, 0, 0); g.player.visY = y;
    g.fx.sparkle(p.x, p.y + 1, p.z, 20, 0xffd874, 2.5); SFX.pickup();
  }

  // ---------- protection ----------
  isProtected(x: number, y: number, z: number) {
    if (!this.g.settings.protectVillage || y < VILLAGE_Y) return false;
    let inside = PROTECT.some(([x0, x1, z0, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1);
    if (!inside) inside = POSTS.some(([px, pz]) => px === x && pz === z && y <= VILLAGE_Y + 3);
    if (!inside) return false;
    // blocks the player placed there themselves can always be removed
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
    const e = this.g.world.edits.get(cx + ',' + cz);
    if (e && e.get(idx(x - cx * CS, y, z - cz * CS)) === this.g.world.get(x, y, z)) return false;
    return true;
  }
}
