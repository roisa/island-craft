// The masjids you can pray in together: the village masjid and the Grand
// Masjid near the village. Each has a light beacon so you can find it from
// far away (brightest at prayer time), a place for you in the row, and the
// Grand Masjid fills with people at prayer time: men in the front hall, women
// in their own hall behind the curtain.
import * as THREE from 'three';
import type { Game } from '../main';
import type { T2 } from '../i18n';
import type { Landmark } from '../world/landmarks';
import { VILLAGE_Y } from '../world/gen';
import { buildBlocky, type BlockyOpts } from './blocky';
import { applyPrayerPose, clearPose, type Rig } from './models';
import { rowPose } from './jamaah';

export interface MasjidSite {
  id: 'village' | 'grand';
  name: T2;
  /** the middle of the prayer hall (distance checks) */
  spot: THREE.Vector3;
  /** where fast travel puts you: just outside a door you're allowed in */
  door: (girl: boolean) => THREE.Vector3;
  /** your place in the row, and Baby Mo's next to you */
  row: (girl: boolean) => { player: THREE.Vector3; mo: THREE.Vector3 };
  /** standing inside the prayer hall */
  inside: (p: THREE.Vector3) => boolean;
  /** the top of the dome, where the light beam starts */
  top: THREE.Vector3;
}

const G = VILLAGE_Y;
const v = (a: [number, number, number]) => new THREE.Vector3(a[0], a[1], a[2]);

export const VILLAGE_SITE: MasjidSite = {
  id: 'village', name: ['Masjid Desa', 'The Village Masjid'],
  spot: new THREE.Vector3(0.5, G + 1, -18.5),
  door: () => new THREE.Vector3(0.5, G + 1, -11.5),
  row: () => ({ player: new THREE.Vector3(0.5, G + 1, -18.5), mo: new THREE.Vector3(2.0, G + 1, -18.5) }),
  inside: p => p.x > -6 && p.x < 7 && p.z > -26 && p.z < -13 && Math.abs(p.y - (G + 1)) < 3,
  top: new THREE.Vector3(0.5, G + 16, -19.5),
};

/** the Grand Masjid, from its landmark */
export function grandSite(l: Landmark): MasjidSite | null {
  const a = l.at; if (!a?.men || !a.women || !a.hall || !a.top) return null;
  const men = v(a.men), women = v(a.women), hall = v(a.hall);
  return {
    id: 'grand', name: ['Masjid Raya', 'The Grand Masjid'],
    spot: hall,
    // boys use the men's side door, girls the women's door at the back
    door: girl => v(girl ? a.womenDoor : a.menDoor),
    row: girl => { const p = girl ? women : men; return { player: p.clone(), mo: p.clone().add(new THREE.Vector3(1.15, 0, 0)) }; },
    inside: p => Math.abs(p.x - hall.x) < 11 && Math.abs(p.z - hall.z) < 9 && Math.abs(p.y - hall.y) < 3,
    top: v(a.top),
  };
}

/** which site is nearest to p (straight-line distance) */
export function nearestSite(sites: MasjidSite[], p: THREE.Vector3): MasjidSite {
  let best = sites[0], bd = Infinity;
  for (const s of sites) { const d = Math.hypot(s.spot.x - p.x, s.spot.z - p.z); if (d < bd) { bd = d; best = s; } }
  return best;
}

/** where each person stands in the Grand Masjid: an imam, men's rows in front, women's rows behind the curtain */
export function congregationLayout(site: MasjidSite, imam: THREE.Vector3, girl: boolean, small: boolean) {
  const out: { pos: THREE.Vector3; woman: boolean; imam?: boolean }[] = [{ pos: imam.clone(), woman: false, imam: true }];
  const men = site.row(false).player, women = site.row(true).player, K = small ? 2 : 4;
  const row = (z: number, base: THREE.Vector3, woman: boolean, skipYou: boolean) => {
    for (let k = -K; k <= K; k++) {
      if (skipYou && (k === 0 || k === 1)) continue; // your place, and Baby Mo's
      out.push({ pos: new THREE.Vector3(base.x + k * 1.15, base.y, z), woman });
    }
  };
  row(men.z - 1.4, men, false, false);
  row(men.z, men, false, !girl);
  row(women.z, women, true, girl);
  row(women.z + 1.4, women, true, false);
  return out;
}

const MEN_SHIRTS = [0xf5f3ee, 0xe8dfc6, 0x3f7a5a, 0x2f5f9e, 0x8a5a3c, 0xdfe7ef, 0x6b4f8a];
const MUKENA = [0xffffff, 0xfbeef3, 0xeef4fb, 0xffffff, 0xf7f3e6];
function personLook(i: number, woman: boolean, imam: boolean): BlockyOpts {
  const skin = ['#F6C9A0', '#E8B48A', '#D9A27A', '#F2C29A', '#C98E64'][i % 5];
  const kid = !imam && i % 6 === 3;
  if (woman) {
    const c = MUKENA[i % MUKENA.length];
    return { skin, shirt: c, shirtDark: c, pants: c, pantsBand: c, hijab: c, robe: true, tunic: true, backpack: null, emblem: null, cuff: c, collar: c, shoes: 0xf4f4f4, adult: !kid, lashes: true, hair: 0x2b2018 };
  }
  const c = imam ? 0xffffff : MEN_SHIRTS[i % MEN_SHIRTS.length];
  return {
    skin, shirt: c, pants: imam ? 0xffffff : [0xe2d6bc, 0x3b3a3d, 0x2a3550][i % 3], robe: imam || i % 3 === 0, peci: imam ? 0xffffff : i % 2 ? 0x1f1f22 : 0xf4f4f4,
    beard: !kid && (imam || i % 4 === 1) ? '#1F1A1A' : undefined, beardStyle: imam ? 'full' : 'short', backpack: null, emblem: null, adult: !kid, hair: 0x1f1a1a, shoes: 0x3b3a3d,
  };
}

/** the people praying in the Grand Masjid at prayer time */
export class Congregation {
  private people: { rig: Rig; pos: THREE.Vector3; sit: boolean }[] = [];
  private group = new THREE.Group();
  constructor(private g: Game, private site: MasjidSite, private imam: THREE.Vector3) { g.scene.add(this.group); }
  get count() { return this.people.length; }

  update(active: boolean, praying: boolean, prayed: boolean) {
    if (!active) { if (this.people.length) this.clear(); return; }
    if (!this.people.length) this.spawn();
    for (const p of this.people) {
      const r = p.rig;
      r.root.position.copy(p.pos); r.root.rotation.y = Math.PI; // facing the qibla wall
      if (praying) { applyPrayerPose(r, rowPose.pose); r.head.rotation.y = rowPose.head; }
      // waiting for the prayer (some sit until it starts), and dhikr afterwards
      else if (prayed || p.sit) { applyPrayerPose(r, 'julus'); r.head.rotation.y = 0; }
      else { clearPose(r); r.head.rotation.y = 0; }
    }
  }
  private spawn() {
    const girl = this.g.settings.avatar === 'girl', small = !!this.g.settings.lowGfx;
    congregationLayout(this.site, this.imam, girl, small).forEach((s, i) => {
      const rig = buildBlocky(personLook(i, s.woman, !!s.imam));
      this.group.add(rig.root);
      this.people.push({ rig, pos: s.pos, sit: !s.imam && i % 3 === 1 });
    });
  }
  private clear() {
    for (const p of this.people) p.rig.root.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => { (x as THREE.MeshLambertMaterial).map?.dispose(); x.dispose(); }); } });
    this.group.clear(); this.people = [];
  }
}

/** a soft beam of light over each masjid and a glowing crescent marker: brightest at prayer time */
export class Beacons {
  private items: { beam: THREE.Mesh; mark: THREE.Sprite; site: MasjidSite }[] = [];
  constructor(scene: THREE.Scene, sites: MasjidSite[]) {
    const tex = crescentTexture();
    for (const site of sites) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.0, 90, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xffb627, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      beam.position.set(site.top.x, site.top.y + 45, site.top.z); beam.renderOrder = 5; beam.frustumCulled = false;
      const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, fog: false, sizeAttenuation: false }));
      mark.scale.set(0.07, 0.07, 1); mark.position.set(site.top.x, site.top.y + 3, site.top.z); mark.renderOrder = 6;
      scene.add(beam, mark);
      this.items.push({ beam, mark, site });
    }
  }
  /** prayerTime: a prayer is waiting for you; night: the beams glow softly anyway */
  update(t: number, cam: THREE.Vector3, prayerTime: boolean, night: boolean) {
    for (const it of this.items) {
      const d = Math.hypot(cam.x - it.site.spot.x, cam.z - it.site.spot.z);
      const want = prayerTime ? 0.42 + Math.sin(t * 3) * 0.12 : night ? 0.14 : 0;
      const m = it.beam.material as THREE.MeshBasicMaterial;
      m.opacity += (want * Math.min(1, d / 30) - m.opacity) * 0.05;
      it.beam.visible = m.opacity > 0.01;
      // the crescent marker shows where to go, from far away, while a prayer waits
      it.mark.visible = prayerTime && d > 22;
      if (it.mark.visible) { const s = 0.085 + Math.sin(t * 4) * 0.01; it.mark.scale.set(s, s, 1); it.mark.position.y = it.site.top.y + 3 + Math.sin(t * 2) * 0.4; }
    }
  }
}

function crescentTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d')!;
  // a soft glow, a golden crescent and a star
  const gr = x.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, 'rgba(255,224,138,0.75)'); gr.addColorStop(1, 'rgba(255,224,138,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#FFD24A'; x.beginPath(); x.arc(58, 64, 34, 0, Math.PI * 2); x.fill();
  x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(72, 56, 30, 0, Math.PI * 2); x.fill();
  x.globalCompositeOperation = 'source-over'; x.fillStyle = '#FFF4C2';
  x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 6 : 14; x.lineTo(88 + Math.cos(a) * r, 60 + Math.sin(a) * r); } x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
