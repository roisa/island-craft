// The villagers at the fishing pond: two on the pier and one on the bank, each
// sitting with a rod and a red float on the water. Now and then a float dips,
// they pull up a fish and cheer. When you come by, one of them shares a tip.
// They are only there while you're near (and go home at night).
import * as THREE from 'three';
import type { Game } from '../main';
import { tr } from '../i18n';
import type { Landmark } from '../world/landmarks';
import { buildBlocky, type BlockyOpts } from './blocky';
import { applyPrayerPose, clearPose, speechBubble, type Rig } from './models';
import { SFX } from './audio';

const LOOKS: BlockyOpts[] = [
  { skin: '#E8B48A', shirt: 0x3f7a5a, pants: 0x3b3a3d, peci: 0x1f1f22, beard: '#2B2018', beardStyle: 'short', adult: true, hair: 0x1f1a1a, backpack: null, emblem: null, shoes: 0x3b3a3d },
  { skin: '#F2C29A', shirt: 0xf28f3b, pants: 0x2a3550, hair: 0x2b2018, backpack: null, emblem: null, shoes: 0xf4f4f4 },
  { skin: '#D9A27A', shirt: 0xf6d8e3, shirtDark: 0xf6d8e3, pants: 0x6b4f8a, hijab: 0x6b4f8a, tunic: true, adult: true, lashes: true, backpack: null, emblem: null, hair: 0x2b2018, shoes: 0xf4f4f4 },
];
const NAMES = ['Pak Harun', 'Raka', 'Bu Salma'];
const TIPS: [string, string][] = [
  ['Sabar ya! Lempar, tunggu, lalu ketuk saat pelampungnya tenggelam 🎣', 'Be patient! Throw, wait, then tap when the float dips 🎣'],
  ['Di kolam ini ikannya cepat menggigit. Coba dari ujung dermaga!', 'The fish bite quickly in this pond. Try from the end of the pier!'],
  ['Ambil ikan secukupnya saja, dan jangan lupa Alhamdulillah 😊', 'Only take the fish you need, and don’t forget Alhamdulillah 😊'],
];

interface Fisher { rig: Rig; seat: THREE.Vector3; yaw: number; bob: THREE.Mesh; line: THREE.Line; t: number; next: number; cheer: number; bubble: THREE.Sprite | null; bubbleT: number }

export class Fishers {
  private people: Fisher[] = [];
  private group = new THREE.Group();
  private tipShown = false;
  readonly pond: THREE.Vector3; readonly spot: THREE.Vector3;
  constructor(private g: Game, private l: Landmark) {
    const a = l.at!;
    this.pond = new THREE.Vector3(...a.pond); this.spot = new THREE.Vector3(...a.spot);
    g.scene.add(this.group);
  }
  get count() { return this.people.length; }
  /** your place to fish: the end of the pier */
  near(p: THREE.Vector3, r = 11) { return Math.hypot(p.x - this.pond.x, p.z - this.pond.z) < r; }

  update(dt: number, t: number) {
    const g = this.g, p = g.player.pos, d = Math.hypot(p.x - this.pond.x, p.z - this.pond.z);
    const day = g.hour > g.schedule.fajr + 0.5 && g.hour < g.schedule.isha;
    // they go to the masjid at prayer time like everyone else
    const here = d < 70 && day && !g.gameEvent;
    if (!here) { if (this.people.length) this.clear(); return; }
    if (!this.people.length) this.spawn();
    for (const f of this.people) {
      const r = f.rig;
      r.root.position.copy(f.seat); r.root.rotation.y = f.yaw;
      applyPrayerPose(r, 'julus');
      // arm out holding the rod; raised high when a fish comes up
      if (r.armR) r.armR.rotation.x = f.cheer > 0 ? -2.6 : -1.2;
      f.t += dt;
      const water = f.seat.clone().add(new THREE.Vector3(Math.sin(f.yaw) * 3, 0, Math.cos(f.yaw) * 3));
      water.y = this.pond.y + 0.95;
      const biting = f.next - f.t < 1.2 && f.next - f.t > 0;
      f.bob.position.set(water.x, water.y + Math.sin(t * 2.5 + f.next) * 0.03 - (biting ? 0.12 + Math.sin(t * 30) * 0.04 : 0), water.z);
      const tip = r.hand ? r.hand.getWorldPosition(new THREE.Vector3()) : f.seat.clone().add(new THREE.Vector3(0, 1.2, 0));
      const lp = (f.line.geometry.attributes.position as THREE.BufferAttribute);
      lp.setXYZ(0, tip.x, tip.y + 0.6, tip.z); lp.setXYZ(1, f.bob.position.x, f.bob.position.y + 0.05, f.bob.position.z); lp.needsUpdate = true;
      if (f.t >= f.next) {
        // a catch!
        f.t = 0; f.next = 9 + Math.random() * 12; f.cheer = 1.6;
        g.fx.sparkle(water.x, water.y + 0.2, water.z, 8, 0x8fd3ec, 1.4);
        if (d < 22) SFX.splash();
        this.say(f, Math.random() < 0.3 ? '🐟 Alhamdulillah!' : ['🐟!', '🐠!', '🎣✨'][Math.floor(Math.random() * 3)], 2.2);
      }
      if (f.cheer > 0) f.cheer -= dt;
      if (f.bubble && (f.bubbleT -= dt) <= 0) { f.bubble.removeFromParent(); f.bubble.material.map?.dispose(); f.bubble.material.dispose(); f.bubble = null; }
    }
    // coming by: one of them shares a tip, once a visit
    if (d < 9 && !this.tipShown && !g.ui.isOpen()) {
      this.tipShown = true;
      const k = Math.floor(Math.random() * TIPS.length);
      g.ui.say(`${NAMES[k % NAMES.length]}: ${tr(TIPS[k][0], TIPS[k][1])}`, 'idea', 6000);
    }
    if (d > 20) this.tipShown = false;
  }
  private say(f: Fisher, text: string, secs: number) {
    if (f.bubble) { f.bubble.removeFromParent(); f.bubble.material.map?.dispose(); f.bubble.material.dispose(); }
    f.bubble = speechBubble(text); f.bubble.position.y = f.rig.height + 0.4; f.rig.root.add(f.bubble); f.bubbleT = secs;
  }
  private spawn() {
    const a = this.l.at!;
    const seats: [number, number, number][] = [a.f1, a.f2, a.f3];
    seats.forEach((s, i) => {
      const rig = buildBlocky(LOOKS[i]);
      // a bamboo rod in the hand
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 1.6, 6), new THREE.MeshLambertMaterial({ color: 0xc8a165 }));
      rod.position.set(0, -0.1, 0.75); rod.rotation.x = Math.PI / 2 - 0.5;
      (rig.hand ?? rig.armR ?? rig.root).add(rod);
      const seat = new THREE.Vector3(...s);
      // the two on the pier look out north over the water; the one on the bank looks east
      // (a model faces +z when turned 0, so north is π)
      const yaw = i === 2 ? Math.PI / 2 : Math.PI;
      const bob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshLambertMaterial({ color: 0xe4423a, emissive: 0xe4423a, emissiveIntensity: 0.3 }));
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xf2f2f2, transparent: true, opacity: 0.8 })); line.frustumCulled = false;
      this.group.add(rig.root, bob, line);
      this.people.push({ rig, seat, yaw, bob, line, t: 0, next: 4 + i * 5 + Math.random() * 6, cheer: 0, bubble: null, bubbleT: 0 });
    });
  }
  private clear() {
    for (const f of this.people) clearPose(f.rig);
    this.group.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh || (o as THREE.Line).isLine) { m.geometry?.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => { (x as THREE.MeshLambertMaterial)?.map?.dispose(); x?.dispose(); }); } });
    this.group.clear(); this.people = [];
  }
}
