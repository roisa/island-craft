// Sky City's golden rings: twelve hoops hanging between the towers, round the city. Fly through one (with the
// web rope, the cape, or a jump off a roof) and it turns green with a star; all twelve in one go gives a bonus,
// and they light up again for another run. Part of Full BabyMo Craft (like the city's other fun); the city
// itself is open to walk around in. Drawn only when you're near the city.
import * as THREE from 'three';
import type { Game } from '../main';
import { tr } from '../i18n';
import type { Landmark } from '../world/landmarks';
import { SFX } from './audio';

/** how close (blocks, from the middle of your body to the ring's middle) counts as flying through */
export const RING_HIT = 2.1;
/** is this point inside a ring of radius RING_HIT round `c`? (kept apart so it can be tested) */
export const throughRing = (p: { x: number; y: number; z: number }, c: { x: number; y: number; z: number }) =>
  Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z) < RING_HIT;

export class SkyRings {
  readonly group = new THREE.Group();
  readonly rings: { at: THREE.Vector3; mesh: THREE.Mesh; got: boolean }[] = [];
  private gold = new THREE.MeshBasicMaterial({ color: 0xffc933 });
  private green = new THREE.MeshBasicMaterial({ color: 0x3fd07a });
  private centre: THREE.Vector3;
  private resetT = 0;
  private lockedT = 0;
  constructor(private g: Game, l: Landmark) {
    this.centre = new THREE.Vector3(l.x, l.y, l.z);
    const geo = new THREE.TorusGeometry(1.6, 0.16, 8, 28);
    const pts = Object.keys(l.at ?? {}).filter(k => /^ring\d+$/.test(k)).sort((a, b) => +a.slice(4) - +b.slice(4)).map(k => l.at![k]);
    pts.forEach((p, i) => {
      const at = new THREE.Vector3(...p), next = new THREE.Vector3(...pts[(i + 1) % pts.length]);
      const mesh = new THREE.Mesh(geo, this.gold);
      mesh.position.copy(at);
      // facing along the way round the city, so you fly straight through it on the loop
      mesh.lookAt(next.x, at.y, next.z);
      this.group.add(mesh);
      this.rings.push({ at, mesh, got: false });
    });
    this.group.visible = false;
    g.scene.add(this.group);
  }
  get got() { return this.rings.filter(r => r.got).length; }
  update(dt: number, t: number) {
    const p = this.g.player.pos, near = Math.hypot(p.x - this.centre.x, p.z - this.centre.z) < 90;
    this.group.visible = near;
    if (!near) return;
    for (const [i, r] of this.rings.entries()) if (!r.got) r.mesh.rotation.z = t * 0.6 + i;
    this.lockedT -= dt;
    if (this.resetT > 0 && (this.resetT -= dt) <= 0) { for (const r of this.rings) { r.got = false; r.mesh.material = this.gold; r.mesh.scale.setScalar(1); } }
    const body = { x: p.x, y: p.y + 1, z: p.z };
    for (const r of this.rings) {
      if (r.got || !throughRing(body, r.at)) continue;
      // Full BabyMo Craft (the family code opens it on the website)
      if (!this.g.full) { if (this.lockedT <= 0) { this.lockedT = 8; this.g.can('sky_city'); } return; }
      r.got = true; r.mesh.material = this.green; r.mesh.scale.setScalar(1.15);
      SFX.chime(); this.g.fx.sparkle(r.at.x, r.at.y, r.at.z, 22, 0xffd874, 2.4);
      this.g.kid.reward('pet');
      this.g.stats.skyRings = (this.g.stats.skyRings || 0) + 1;
      const n = this.got;
      if (n === 1 && !this.g.stats.skyRingTip) {
        this.g.stats.skyRingTip = 1;
        this.g.ui.say(tr('Masya Allah, kamu terbang melewati cincin emas! ⭐ Ada 12 cincin di antara gedung-gedung. Bisa kamu lewati semuanya?', 'Masha Allah, you flew through a golden ring! ⭐ There are 12 rings between the towers. Can you fly through them all?'), 'alright', 7000);
      }
      if (n === this.rings.length) {
        SFX.fanfare(); this.g.fx.fireworks(p.x, p.y + 2, p.z);
        this.g.kid.reward('quest');
        this.g.stats.skyRuns = (this.g.stats.skyRuns || 0) + 1;
        this.g.goodWord('big_win', true);
        this.g.ui.say(tr('Allahu Akbar! Semua 12 cincin! Kamu Pendekar Laba-laba sejati! 🕷️ Cincinnya menyala lagi sebentar lagi.', 'Allahu Akbar! All 12 rings! You’re a real Spider Warrior! 🕷️ The rings light up again in a moment.'), 'alright', 7000);
        this.resetT = 20;
      }
      this.g.saveSoon();
    }
  }
}
