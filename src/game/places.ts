// Life at the special places: mist and a rainbow at the waterfall, fish and
// sea turtles on the coral reef, shooting stars over the stargazing hill, and
// the secret spots hidden inside them (the cave behind the waterfall, the
// pearl cave under the reef).
import * as THREE from 'three';
import type { Game } from '../main';
import type { Landmark, Spot } from '../world/landmarks';
import { tr } from '../i18n';
import { mat } from './models';
import { SFX, haptic } from './audio';

const FISH_COLORS = [0xff9a3c, 0xffd23a, 0x4fc3f7, 0xff6f91, 0x7be08a, 0xffffff];

function rainbowTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d')!;
  ['#FF6B6B', '#FFB86B', '#FFE66B', '#6BFF9E', '#6BC6FF', '#8F6BFF'].forEach((col, i) => {
    x.strokeStyle = col; x.lineWidth = 9; x.globalAlpha = 0.7;
    x.beginPath(); x.arc(128, 128, 118 - i * 9, Math.PI, 2 * Math.PI); x.stroke();
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function turtle() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.74), mat(0x6b8e3a));
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.54), mat(0x8fae4e)); top.position.y = 0.13;
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.06, 0.64), mat(0xe8d9a0)); belly.position.y = -0.12;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.22), mat(0x9cc46a)); head.position.set(0, 0.02, 0.46);
  const eyeM = mat(0x222222);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.04), eyeM); e.position.set(s * 0.1, 0.06, 0.52); g.add(e); }
  g.add(shell, top, belly, head);
  const flippers: THREE.Mesh[] = [];
  for (const [x, z, w] of [[-0.38, 0.22, 0.34], [0.38, 0.22, 0.34], [-0.3, -0.3, 0.2], [0.3, -0.3, 0.2]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.16), mat(0x9cc46a)); f.position.set(x, -0.02, z); g.add(f); flippers.push(f);
  }
  g.userData.flippers = flippers;
  return g;
}

/** soft puffs that rise and fade: volcano smoke and steam over warm water */
class Puffs {
  private list: { s: THREE.Sprite; v: number; life: number; max: number; grow: number }[] = [];
  private tex: THREE.CanvasTexture;
  constructor(private scene: THREE.Scene) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d')!, gr = x.createRadialGradient(32, 32, 4, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    this.tex = new THREE.CanvasTexture(c);
  }
  add(x: number, y: number, z: number, color: number, size: number, rise: number, life: number) {
    if (this.list.length > 60) return;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, color, transparent: true, depthWrite: false, opacity: 0 }));
    s.position.set(x, y, z); s.scale.setScalar(size);
    this.scene.add(s);
    this.list.push({ s, v: rise, life, max: life, grow: size * 0.6 });
  }
  update(dt: number) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this.scene.remove(p.s); p.s.material.dispose(); this.list.splice(i, 1); continue; }
      const u = 1 - p.life / p.max;
      p.s.position.y += p.v * dt; p.s.position.x += Math.sin(u * 3 + i) * dt * 0.3;
      p.s.scale.setScalar(p.s.scale.x + p.grow * dt);
      p.s.material.opacity = Math.min(1, u * 5) * (1 - u) * 0.7;
    }
  }
}

export class Places {
  private rainbow: THREE.Sprite | null = null;
  private mistT = 0; private rushT = 0;
  private fish: THREE.InstancedMesh;
  private fishData: { r: number; h: number; sp: number; ph: number; wob: number }[] = [];
  private turtles: { g: THREE.Group; r: number; sp: number; ph: number; h: number }[] = [];
  private m = new THREE.Matrix4(); private q = new THREE.Quaternion(); private e = new THREE.Euler(); private s = new THREE.Vector3(1, 1, 1); private v = new THREE.Vector3();
  private fall?: Landmark; private reef?: Landmark; private hill?: Landmark; private volcano?: Landmark;
  private puffs: Puffs; private smokeT = 0; private steamT = 0; private crownT = 0;

  constructor(private g: Game) {
    const ls = g.gen.landmarks;
    this.fall = ls.find(l => l.id === 'waterfall'); this.reef = ls.find(l => l.id === 'reef'); this.hill = ls.find(l => l.id === 'stargaze'); this.volcano = ls.find(l => l.id === 'volcano');
    this.puffs = new Puffs(g.scene);
    if (this.fall?.at?.rainbow) {
      this.rainbow = new THREE.Sprite(new THREE.SpriteMaterial({ map: rainbowTexture(), transparent: true, depthWrite: false, opacity: 0 }));
      const [x, y, z] = this.fall.at.rainbow; this.rainbow.position.set(x, y, z); this.rainbow.scale.set(18, 9, 1);
      this.rainbow.visible = false;
      g.scene.add(this.rainbow);
    }
    // a little school of fish; each is a flat box, all in one draw call
    const N = 16;
    this.fish = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.14, 0.07), new THREE.MeshLambertMaterial(), N);
    const col = new THREE.Color();
    for (let i = 0; i < N; i++) {
      this.fish.setColorAt(i, col.setHex(FISH_COLORS[i % FISH_COLORS.length]));
      this.fishData.push({ r: 2 + (i % 5) * 1.1, h: 0.8 + (i % 4) * 0.7, sp: 0.5 + (i % 3) * 0.18, ph: i * 0.7, wob: Math.random() * 6 });
    }
    this.fish.visible = false; this.fish.frustumCulled = false;
    g.scene.add(this.fish);
    for (let i = 0; i < 2; i++) {
      const t = turtle(); t.visible = false; g.scene.add(t);
      this.turtles.push({ g: t, r: 5 + i * 1.5, sp: 0.16 + i * 0.05, ph: i * Math.PI, h: 2 + i });
    }
    g.sky.onMeteor = () => this.meteor();
  }

  /** what the treasure chest at x,y,z holds when it belongs to a landmark */
  lootAt(x: number, y: number, z: number): [number, number][] | null {
    for (const l of this.g.gen.landmarks) if (l.loot && Math.hypot(l.x - x, l.z - z) < 16 && Math.abs(l.y - y) < 24) return l.loot;
    return null;
  }

  private near(l: Landmark | undefined, r: number) {
    if (!l) return false;
    const p = this.g.player.pos; return Math.hypot(l.x - p.x, l.z - p.z) < r;
  }

  private meteor() {
    const g = this.g;
    g.stats.meteors = (g.stats.meteors || 0) + 1;
    if (!this.near(this.hill, 30) || g.ui.isOpen()) return;
    SFX.twinkle();
    g.ui.toast(tr('🌠 Bintang jatuh! Indah sekali, Subhanallah', '🌠 A shooting star! So beautiful, Subhanallah'));
    if (g.stats.meteors % 3 === 0) g.kid.reward('biome', 1);
  }

  /** secret spots: a smaller discovery for each one, once */
  checkSpots() {
    const g = this.g, p = g.player.pos, found = (g.stats.spots ??= []);
    for (const l of g.gen.landmarks) for (const s of l.spots ?? []) {
      if (found.includes(s.id) || Math.hypot(s.x - p.x, s.y - p.y, s.z - p.z) > s.r) continue;
      found.push(s.id);
      this.foundSpot(s);
    }
  }
  private foundSpot(s: Spot) {
    const g = this.g;
    g.kid.reward('quest', 0.5);
    SFX.fanfare(); haptic([15, 40, 15]);
    g.fx.sparkle(s.x, s.y + 1, s.z, 40, 0x8be9fd, 3);
    g.anim.play('celebrate', 1.6); g.ents.mo.celebrate = 2;
    g.ui.spotFound(s);
    g.checkQuests(); g.saveSoon();
  }

  update(dt: number, t: number) {
    const g = this.g, p = g.player.pos, lite = g.settings.lowGfx;
    // ---- waterfall: spray at its foot, a gentle rush, and a rainbow on sunny afternoons
    if (this.fall?.at?.foot) {
      const [fx, fy, fz] = this.fall.at.foot, d = Math.hypot(fx - p.x, fz - p.z);
      if (d < 46 && !lite && (this.mistT -= dt) <= 0) { this.mistT = 0.22; g.fx.sparkle(fx + (Math.random() - 0.5) * 1.6, fy - 0.2, fz + 0.3, 3, 0xe8f7ff, 1.4); }
      if (d < 18 && (this.rushT -= dt) <= 0) { this.rushT = 1.3; SFX.rush(1 - d / 18); }
      if (this.rainbow) {
        const sc = g.schedule, h = g.hour;
        const want = d < 90 && h > sc.dhuhr + 0.5 && h < sc.maghrib - 0.4 && !g.sky.raining && g.sky.daylight > 0.75 ? 0.85 : 0;
        const m = this.rainbow.material as THREE.SpriteMaterial;
        m.opacity += (want - m.opacity) * Math.min(1, dt * 0.8);
        this.rainbow.visible = m.opacity > 0.02;
      }
    }
    // ---- reef: fish circle the coral, two turtles glide slowly
    const reefOn = !!this.reef?.at?.reef && this.near(this.reef, 60);
    this.fish.visible = reefOn;
    for (const tt of this.turtles) tt.g.visible = reefOn;
    if (reefOn) {
      const [cx, cy, cz] = this.reef!.at!.reef;
      this.fishData.forEach((f, i) => {
        const a = t * f.sp + f.ph, school = i < 8 ? 1 : -1;
        const x = cx + Math.cos(a * school) * f.r, z = cz + Math.sin(a * school) * f.r * 0.8, y = cy + f.h + Math.sin(t * 1.3 + f.wob) * 0.25;
        this.e.set(0, -a * school - (school > 0 ? 0 : Math.PI), Math.sin(t * 9 + i) * 0.25);
        this.q.setFromEuler(this.e);
        this.m.compose(this.v.set(x, y, z), this.q, this.s);
        this.fish.setMatrixAt(i, this.m);
      });
      this.fish.instanceMatrix.needsUpdate = true;
      for (const tt of this.turtles) {
        const a = t * tt.sp + tt.ph;
        tt.g.position.set(cx + Math.cos(a) * tt.r, cy + tt.h + Math.sin(t * 0.7 + tt.ph) * 0.4, cz + Math.sin(a) * tt.r);
        tt.g.rotation.y = -a + Math.PI;
        const fl = tt.g.userData.flippers as THREE.Mesh[];
        fl.forEach((f, k) => (f.rotation.z = Math.sin(t * 2.4 + k) * 0.5 * (k % 2 ? -1 : 1)));
      }
    }
    // ---- volcano: grey smoke from the crater (seen from far away), steam over the warm springs
    this.puffs.update(dt);
    const v = this.volcano?.at;
    if (v && this.near(this.volcano, 150) && (this.smokeT -= dt) <= 0) {
      this.smokeT = lite ? 0.9 : 0.45;
      const [x, y, z] = v.smoke; this.puffs.add(x + (Math.random() - 0.5) * 2, y + 1, z + (Math.random() - 0.5) * 2, 0x6e6e78, 5, 2.4, 7);
    }
    if (v && this.near(this.volcano, 40) && (this.steamT -= dt) <= 0) {
      this.steamT = lite ? 0.7 : 0.35;
      const [x, y, z] = Math.random() < 0.5 ? v.spring1 : v.spring2; this.puffs.add(x + (Math.random() - 0.5), y - 0.4, z + (Math.random() - 0.5), 0xffffff, 0.9, 0.8, 2.5);
    }
    // ---- the treasure hunter's crown sparkles as you go
    if (g.hasHat('crown') && !lite && (this.crownT -= dt) <= 0) { this.crownT = 0.5; g.fx.sparkle(p.x + (Math.random() - 0.5) * 0.6, p.y + 2, p.z + (Math.random() - 0.5) * 0.6, 2, 0xffd874, 0.8); }
    // ---- stargazing hill: more shooting stars up there
    g.sky.meteorBoost = this.near(this.hill, 30);
  }
}
