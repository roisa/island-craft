import { ic } from '../icons';
// Ramadhan atmosphere in Baby Mo's village: strings of lanterns over the
// plaza, a crescent & star on the minaret, an iftar picnic at Maghrib, the
// bedug drum, a daily gift and bedtime stories.
import * as THREE from 'three';
import type { Game } from '../main';
import { tr, t2 } from '../i18n';
import { B, I, nameOf } from '../world/blocks';
import { VILLAGE_Y } from '../world/gen';
import { mat } from './models';
import { SFX } from './audio';
import { STORIES } from '../content';

const G = VILLAGE_Y + 1;
export const PICNIC = new THREE.Vector3(0.5, G, 1.5);

function glowLantern(color: number) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.34), new THREE.MeshBasicMaterial({ color }));
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.4), mat(0x9b6818));
  cap.position.y = 0.26; const bot = cap.clone(); bot.position.y = -0.26;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.setScalar(1.3);
  g.add(body, cap, bot, glow);
  return g;
}

export class Festive {
  private decor = new THREE.Group();
  private picnic = new THREE.Group();
  private lanterns: THREE.Object3D[] = [];
  picnicOn = false;
  storyNight = -1;

  constructor(public g: Game) {
    this.buildDecor();
    this.buildPicnic();
    g.scene.add(this.decor, this.picnic);
    this.picnic.visible = false;
  }

  /** strings of colourful lanterns across the plaza + a crescent on the minaret */
  private buildDecor() {
    const cols = [0xffc94d, 0xff6f91, 0x6bd0ff, 0x7be08a, 0xb38bff];
    const rope = new THREE.LineBasicMaterial({ color: 0x5e3e25 });
    // strung high between the lantern posts, away from where the camera usually is
    const H3 = G + 3.6;
    const strings: [THREE.Vector3, THREE.Vector3][] = [
      [new THREE.Vector3(-5.5, H3, -5.5), new THREE.Vector3(6.5, H3, -5.5)],
      [new THREE.Vector3(-2.5, H3, -9.5), new THREE.Vector3(3.5, H3, -9.5)],
      [new THREE.Vector3(-11.5, H3, 3.5), new THREE.Vector3(-19.5, H3, 3.5)],
      [new THREE.Vector3(12.5, H3, 3.5), new THREE.Vector3(20.5, H3, 3.5)],
    ];
    let k = 0;
    for (const [a, b] of strings) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 12; i++) { const t = i / 12; const p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * 0.6; pts.push(p); }
      this.decor.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), rope));
      for (let i = 2; i <= 10; i += 2) {
        const l = glowLantern(cols[k++ % cols.length]);
        l.position.copy(pts[i]).add(new THREE.Vector3(0, -0.35, 0));
        l.scale.setScalar(0.7);
        this.decor.add(l); this.lanterns.push(l);
      }
    }
    // crescent & star above the minaret
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d')!;
    x.fillStyle = '#F1C232'; x.beginPath(); x.arc(56, 64, 44, 0, Math.PI * 2); x.fill();
    x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(76, 56, 38, 0, Math.PI * 2); x.fill();
    x.globalCompositeOperation = 'source-over'; x.fillStyle = '#F1C232'; x.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 7 : 16, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(96 + Math.cos(a) * r, 62 + Math.sin(a) * r); }
    x.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true }));
    moon.scale.setScalar(2.2); moon.position.set(9.5, G + 23.5, -23.5);
    this.decor.add(moon);
  }

  /** an iftar mat on the plaza with plates of dates, milk and cake */
  private buildPicnic() {
    const mat1 = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.04, 3), mat(0xc7362f));
    mat1.position.set(PICNIC.x, G + 0.02, PICNIC.z);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.05, 0.4), mat(0xf4c430));
    stripe.position.set(PICNIC.x, G + 0.03, PICNIC.z);
    this.picnic.add(mat1, stripe);
    const plate = (x: number, z: number, food: number) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.06, 12), mat(0xf4f4f0)); p.position.set(PICNIC.x + x, G + 0.07, PICNIC.z + z);
      this.picnic.add(p);
      for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.14), mat(food)); f.position.set(PICNIC.x + x + (i - 1) * 0.12, G + 0.14, PICNIC.z + z); this.picnic.add(f); }
    };
    plate(-1.2, -0.6, 0x8b4a1f); plate(0, 0.6, 0x8b4a1f); plate(1.2, -0.6, 0xf4c430); plate(-0.6, 0.7, 0xff9f4d);
    for (const [x, z] of [[0.6, -0.4], [-0.3, -0.5], [1.4, 0.5]]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.22, 8), mat(0xffffff)); cup.position.set(PICNIC.x + x, G + 0.14, PICNIC.z + z); this.picnic.add(cup); }
  }

  /** seats around the mat for the villagers */
  seat(i: number) {
    const spots = [[-2.6, 0], [2.6, 0], [0, -2], [0, 2]];
    const [x, z] = spots[i % spots.length];
    return new THREE.Vector3(PICNIC.x + x, G, PICNIC.z + z);
  }
  setPicnic(on: boolean) { this.picnicOn = on; this.picnic.visible = on; }
  nearPicnic() { const p = this.g.player.pos; return this.picnicOn && Math.hypot(p.x - PICNIC.x, p.z - PICNIC.z) < 4 && Math.abs(p.y - G) < 2; }

  update(t: number) {
    // lanterns sway gently; brighter at night
    const night = this.g.sky.night;
    this.lanterns.forEach((l, i) => {
      l.rotation.z = Math.sin(t * 1.3 + i) * 0.12;
      const glow = l.children[3] as THREE.Sprite; (glow.material as THREE.SpriteMaterial).opacity = night ? 0.55 + Math.sin(t * 2 + i) * 0.1 : 0.18;
    });
  }

  // ---------- the bedug ----------
  bedug() {
    SFX.drum(3);
    const g = this.g;
    g.fx.sparkle(-3.5, G + 2.2, -11.5, 8, 0xffd874, 1.5);
    g.stats.bedug = (g.stats.bedug || 0) + 1;
    if (g.stats.bedug === 1) g.ui.say(tr('Dug dug dug! Bedug dipukul untuk memanggil orang ke masjid 🥁', 'Dum dum dum! The bedug is beaten to call people to the masjid 🥁'), 'alright');
    g.checkQuests();
  }

  // ---------- daily gift ----------
  dailyGift() {
    const g = this.g, today = new Date().toDateString();
    if (g.stats.giftDay === today) return;
    g.stats.giftDay = today;
    const gifts: [number, number][][] = [[[I.DATES, 4]], [[B.LANTERN, 2]], [[I.APPLE, 3]], [[B.GOLD_TILE, 4]], [[B.MOSAIC, 4]], [[I.KOLAK, 1]], [[B.WOOL_YELLOW, 4]], [[I.MILK, 2]]];
    const gift = gifts[Math.floor(Math.random() * gifts.length)];
    const streak = g.stats.days.length;
    const { el, close } = g.ui.modal(`<div class="gift"><div class="box" id="gBox">🎁</div><h2>${tr('Hadiah hari ini!', 'Today’s gift!')}</h2>
      <p>${tr(`Hari ke-${streak} bermain bersama Baby Mo. Ketuk kadonya!`, `Day ${streak} playing with Baby Mo. Tap the present!`)}</p>
      <div class="gifts hidden" id="gIn">${gift.map(([id, n]) => `<span>${t2(nameOf(id))} ×${n}</span>`).join('')}<span>⭐ +3</span></div>
      <button class="btn gold hidden" id="gOk">${tr('Terima kasih! 💚', 'Thank you! 💚')}</button></div>`);
    const box = el.querySelector<HTMLElement>('#gBox')!;
    box.onclick = () => {
      if (box.classList.contains('open')) return;
      box.classList.add('open'); box.textContent = '✨';
      SFX.fanfare(); g.ui.confetti(50);
      for (const [id, n] of gift) g.inv.add(id, n);
      g.kid.reward('calendar');
      el.querySelector('#gIn')!.classList.remove('hidden'); el.querySelector('#gOk')!.classList.remove('hidden');
    };
    el.querySelector<HTMLElement>('#gOk')!.onclick = () => close();
  }

  // ---------- bedtime stories ----------
  story(then?: () => void) {
    const g = this.g;
    const read = new Set(g.stats.stories || []);
    const s = STORIES.find(x => !read.has(x.id)) ?? STORIES[Math.floor(Math.random() * STORIES.length)];
    let page = 0;
    const { el, close } = g.ui.modal(`<div class="story"><div class="sicon">${s.icon}</div><h2>${t2(s.title)}</h2><p class="spage" id="sPage"></p><div class="sdots" id="sDots"></div>
      <div class="row"><button class="btn ghost" id="sSay">${ic('speaker')} ${tr('Bacakan', 'Read aloud')}</button><button class="btn" id="sNext"></button></div></div>`, () => { g.ui.stopSpeech(); then?.(); }, { onShow: () => render() });
    const P = el.querySelector<HTMLElement>('#sPage')!, D = el.querySelector<HTMLElement>('#sDots')!, N = el.querySelector<HTMLElement>('#sNext')!;
    const last = () => page >= s.pages.length;
    const render = () => {
      if (last()) {
        P.innerHTML = `💡 <b>${t2(s.lesson)}</b>`;
        N.textContent = tr('Selamat tidur 🌙', 'Good night 🌙');
      } else {
        P.textContent = t2(s.pages[page]);
        N.textContent = tr('Lanjut ▶', 'Next ▶');
      }
      D.innerHTML = s.pages.map((_, i) => `<i class="${i === page ? 'on' : ''}"></i>`).join('') + `<i class="${last() ? 'on' : ''}"></i>`;
      if (g.settings.moVoice) g.ui.speak(P.textContent || '');
    };
    el.querySelector<HTMLElement>('#sSay')!.onclick = () => g.ui.speak(P.textContent || '', true);
    N.onclick = () => {
      if (last()) {
        if (!read.has(s.id)) { g.stats.stories = [...read, s.id]; g.kid.reward('quest', 0.5); g.checkQuests(); }
        close(); return;
      }
      page++; SFX.click(); render();
    };
  }
}
