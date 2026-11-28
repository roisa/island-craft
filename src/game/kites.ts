// Layang-layang: a kite made at the workbench. Hold it and tap Use to let it
// fly; tap again to reel it in. It climbs higher the higher you stand (hills
// and mountain tops catch the wind) and on windy days.
import * as THREE from 'three';
import type { Game } from '../main';
import { tr } from '../i18n';
import { I } from '../world/blocks';
import { SEA } from '../world/gen';
import { clamp } from '../world/noise';
import { SFX } from './audio';

export const KITES: Record<number, { main: string; second: string }> = {
  [I.KITE_RED]: { main: '#E4423A', second: '#F4C430' },
  [I.KITE_BLUE]: { main: '#2E6FE0', second: '#FFFFFF' },
  [I.KITE_YELLOW]: { main: '#F4C430', second: '#3FA34D' },
};
export const isKite = (id: number | undefined) => id !== undefined && id in KITES;

/** how high the kite flies (blocks above your hand) for how high you stand and how windy it is */
export function kiteHeight(standY: number, wind: number) {
  const hill = clamp((standY - SEA - 3) / 22, 0, 1);
  return 4 + hill * 9 + wind * 5;
}

function kiteTexture(main: string, second: string) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d')!;
  x.fillStyle = main; x.beginPath(); x.moveTo(32, 0); x.lineTo(64, 26); x.lineTo(32, 64); x.lineTo(0, 26); x.closePath(); x.fill();
  x.fillStyle = second; x.beginPath(); x.moveTo(32, 0); x.lineTo(64, 26); x.lineTo(32, 26); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(32, 26); x.lineTo(32, 64); x.lineTo(0, 26); x.closePath(); x.fill();
  x.strokeStyle = '#5E3E25'; x.lineWidth = 2; x.beginPath(); x.moveTo(32, 0); x.lineTo(32, 64); x.moveTo(0, 26); x.lineTo(64, 26); x.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Kites {
  flying: number | null = null;
  private kite = new THREE.Group();
  private face: THREE.Mesh;
  private line: THREE.Line; private linePos = new Float32Array(6);
  private tail: THREE.Mesh[] = []; private tailPts: THREE.Vector3[] = [];
  private pos = new THREE.Vector3(); private h = 4; private t = 0;
  /** 0..1, how windy it is (set by the weather) */
  wind = 0.4;
  constructor(private g: Game) {
    this.face = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true }));
    this.kite.add(this.face);
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.02), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffffff : 0xe4423a }));
      this.tail.push(b); this.tailPts.push(new THREE.Vector3()); g.scene.add(b); b.visible = false;
    }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3));
    this.line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xf2f2f2, transparent: true, opacity: 0.85 }));
    this.line.frustumCulled = false;
    this.kite.visible = false; this.line.visible = false;
    g.scene.add(this.kite, this.line);
  }

  /** Use with a kite in hand: let it fly, or reel it in */
  toggle(id: number) {
    const g = this.g;
    if (this.flying) { this.stop(); SFX.click(); return; }
    const p = g.player.pos;
    if (g.player.inWater) { g.ui.toast(tr('🪁 Keluar dari air dulu ya', '🪁 Get out of the water first')); return; }
    if (g.world.heightAt(Math.floor(p.x), Math.floor(p.z)) > p.y + 2.5) { g.ui.toast(tr('🪁 Layang-layang butuh langit terbuka!', '🪁 A kite needs open sky!')); return; }
    const k = KITES[id];
    (this.face.material as THREE.MeshBasicMaterial).map = kiteTexture(k.main, k.second);
    (this.face.material as THREE.MeshBasicMaterial).needsUpdate = true;
    this.tail.forEach((b, i) => (b.material as THREE.MeshBasicMaterial).color.set(i % 2 ? k.second : k.main));
    this.flying = id; this.h = 1.5; this.t = 0;
    this.pos.set(p.x, p.y + 2, p.z);
    this.tailPts.forEach(v => v.copy(this.pos));
    this.kite.visible = this.line.visible = true; this.tail.forEach(b => (b.visible = true));
    SFX.jump();
    g.stats.kites = (g.stats.kites || 0) + 1;
    if (g.stats.kites === 1) g.ui.say(tr('Layang-layang terbang! Di Indonesia, banyak orang bermain layang-layang di pantai dan di bukit. Naik ke tempat tinggi supaya terbang lebih tinggi! 🪁', 'The kite is flying! In Indonesia, lots of people fly kites on beaches and hills. Climb up high to make it fly higher! 🪁'), 'alright', 7000);
  }
  stop() {
    this.flying = null;
    this.kite.visible = this.line.visible = false; this.tail.forEach(b => (b.visible = false));
  }

  update(dt: number, t: number) {
    if (!this.flying) return;
    const g = this.g, pl = g.player;
    // put it away when you change what you hold, ride, or swim
    if (g.inv.held()?.id !== this.flying || g.fun.riding || pl.inWater) { this.stop(); return; }
    this.t += dt;
    const want = kiteHeight(pl.pos.y, this.wind);
    this.h += (want - this.h) * Math.min(1, dt * 0.6);
    // the wind blows it out in front of you, a little to the side, swaying
    const yaw = pl.yaw + Math.sin(t * 0.4) * 0.35;
    const out = 3 + this.h * 0.55;
    const target = new THREE.Vector3(pl.pos.x - Math.sin(yaw) * out, pl.pos.y + 1.2 + this.h + Math.sin(t * 1.7) * 0.4 * (0.5 + this.wind), pl.pos.z - Math.cos(yaw) * out);
    this.pos.lerp(target, Math.min(1, dt * 2));
    this.kite.position.copy(this.pos);
    this.kite.lookAt(pl.pos.x, pl.pos.y + 1.2, pl.pos.z);
    this.kite.rotateZ(Math.sin(t * 2.3) * 0.25 * (0.5 + this.wind));
    // the tail trails behind and below
    let prev = this.pos.clone().add(new THREE.Vector3(0, -0.55, 0));
    this.tailPts.forEach((v, i) => {
      const goal = prev.clone().add(new THREE.Vector3(Math.sin(t * 3 + i) * 0.12, -0.32, 0));
      v.lerp(goal, Math.min(1, dt * 8)); this.tail[i].position.copy(v); this.tail[i].rotation.z = Math.sin(t * 4 + i) * 0.6;
      prev = v;
    });
    const hand = pl.pos;
    this.linePos.set([hand.x, hand.y + 1.1, hand.z, this.pos.x, this.pos.y - 0.4, this.pos.z]);
    (this.line.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    // flying it high counts once
    if (this.h > 12 && !g.stats.kiteHigh) { g.stats.kiteHigh = true; SFX.fanfare(); g.ui.confetti(40); g.kid.reward('quest', 0.5); g.ui.toast(tr('🪁 Tinggi sekali! Masya Allah!', '🪁 So high! Masha Allah!')); g.checkQuests(); g.saveSoon(); }
  }
}
