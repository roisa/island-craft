// The Eid bazaar: at the end of the Ramadhan calendar (or on the real days of
// Eid, or when a parent opens it) the path south of the plaza leads into
// a little market lane: a welcome gate, umbul-umbul flags, four stalls, greetings and
// Eid envelopes from the villagers, and fireworks at night. Everything is a
// scene object, so nothing in the world is changed and it can come and go.
import * as THREE from 'three';
import type { Game } from '../main';
import { tr, t2, type T2 } from '../i18n';
import { B, I, nameOf } from '../world/blocks';
import { VILLAGE_Y } from '../world/gen';
import { hijri } from './prayer';
import { mat } from './models';
import { SFX, haptic } from './audio';
import { DUAS } from '../content';

const G = VILLAGE_Y + 1;

export type EidMode = 'auto' | 'on' | 'off';

/**
 * Is it Eid time? The last days of the real Ramadhan and the first week of
 * Syawal; or, outside Ramadhan, once the child has reached day 28 of the
 * calendar in the game. A parent can open or close it.
 */
export function eidOpen(mode: EidMode | undefined, now: Date, calendarDay: number): boolean {
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  const h = hijri(now);
  if (h && h.month === 9 && h.day >= 28) return true;
  if (h && h.month === 10 && h.day <= 7) return true;
  if (h && h.month === 9) return false; // during the real Ramadhan, wait for its last days
  return calendarDay >= 28;
}

interface Stall { id: string; icon: string; name: T2; pos: THREE.Vector3; front: THREE.Vector3; color: number; goods: number[] }

function textSprite(lines: string[], w = 512, h = 128, bg = '#1F8A4C', fg = '#FFF4C8') {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  x.fillStyle = bg; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 22); x.fill();
  x.strokeStyle = '#F1C232'; x.lineWidth = 6; x.stroke();
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  const fs = lines.length > 1 ? h * 0.3 : h * 0.44;
  lines.forEach((l, i) => { x.font = `bold ${fs}px system-ui, sans-serif`; x.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * fs * 1.15); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function stripes(a: string, b: string) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 16;
  const x = c.getContext('2d')!;
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect(i * 8, 0, 8, 16); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
  return t;
}
function ketupat() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), mat(0x8fcf5a)); m.scale.set(1, 1.15, 0.5);
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.03), mat(0x3f8030)); s.position.y = 0.36;
  const r = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.03, 0.13), mat(0xe6cf5a));
  g.add(m, s, r);
  return g;
}

export class Eid {
  group = new THREE.Group();
  private sky = new THREE.Group();
  private flags: THREE.Mesh[] = [];
  private kets: THREE.Object3D[] = [];
  stalls: Stall[] = [];
  open = false;
  private fwT = 2; private atStall: string | null = null; private checkT = 0;

  constructor(private g: Game) {
    this.build();
    g.scene.add(this.group);
    this.group.visible = false;
  }

  private build() {
    const wood = mat(0x8c5e33), cloth = mat(0xf4f0e6);
    // the welcome gate over the path just south of the plaza; the market lane turns east from it
    for (const x of [-2.4, 2.4]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.4, 0.3), mat(0x1f8a4c)); p.position.set(x + 0.5, G + 2.2, 17.5); this.group.add(p);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.42), mat(0xf1c232)); cap.position.set(x + 0.5, G + 4.5, 17.5); this.group.add(cap);
    }
    // two faces back to back, so the words read the right way from both sides
    const bannerTex = textSprite([tr('Selamat Hari Raya', 'Eid Mubarak'), tr('Idul Fitri ✨', 'Happy Eid ✨')]);
    for (const r of [0, Math.PI]) {
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), new THREE.MeshBasicMaterial({ map: bannerTex, transparent: true }));
      banner.position.set(0.5, G + 3.7, 17.5 + (r ? -0.01 : 0.01)); banner.rotation.y = r; this.group.add(banner);
    }
    for (const x of [-1.6, 0, 1.6]) { const k = ketupat(); k.position.set(x + 0.5, G + 2.75, 17.5); this.group.add(k); this.kets.push(k); }
    // a red carpet from the gate into the market lane
    const carpet = (cx: number, cz: number, w: number, d: number) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), mat(0xb23a48)); c.position.set(cx, G + 0.02, cz); this.group.add(c);
      const e = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.025, d + 0.2), mat(0xf1c232)); e.position.set(cx, G + 0.012, cz); this.group.add(e);
    };
    carpet(0.5, 19.6, 2.2, 4.2); carpet(6.8, 22, 11, 2.2);
    // umbul-umbul: tall bamboo poles with long colourful flags along the lane
    const flagCols = [0xe4423a, 0xf4c430, 0x2e6fe0, 0x3fa34d, 0x9b59b6, 0xff8fb1];
    let k = 0;
    for (const x of [2.6, 7, 11.4]) for (const z of [20.4, 23.6]) {
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 5.4, 0.1), mat(0xd9c27a)); pole.position.set(x, G + 2.7, z); this.group.add(pole);
      const fg = new THREE.PlaneGeometry(0.5, 2.6); fg.translate(0.26, -1.3, 0);
      const f = new THREE.Mesh(fg, new THREE.MeshLambertMaterial({ color: flagCols[k++ % flagCols.length], side: THREE.DoubleSide }));
      f.position.set(x + 0.05, G + 5.3, z); this.group.add(f); this.flags.push(f);
    }
    // four stalls, two on each side of the lane, facing it
    const defs: [string, string, T2, number, number, boolean, number, number[]][] = [
      ['food', '🍲', ['Warung Ketupat', 'Ketupat Stall'], 4, 18.6, true, 0xf2b33a, [0x8fcf5a, 0xf2b33a, 0xf4f0e6]],
      ['cakes', '🍪', ['Kue Lebaran', 'Eid Cakes'], 9.2, 18.6, true, 0xe4423a, [0xf2b33a, 0xe4423a, 0xc98a12]],
      ['fun', '🎆', ['Kembang Api & Mainan', 'Fireworks & Toys'], 4, 25.4, false, 0x2e6fe0, [0xe4423a, 0x2e6fe0, 0xf4c430]],
      ['clothes', '👕', ['Baju Lebaran', 'Eid Clothes'], 9.2, 25.4, false, 0x1f8a4c, [0x1f8a4c, 0xe9cf7a, 0xf4f0e6]],
    ];
    for (const [id, icon, name, x, z, north, color, goods] of defs) {
      const s = new THREE.Group();
      const face = north ? 0 : Math.PI; // the front (+z locally) looks at the lane
      s.position.set(x + 0.5, G, z); s.rotation.y = face;
      const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.8), wood); counter.position.y = 0.45; s.add(counter);
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 0.9), cloth); top.position.y = 0.94; s.add(top);
      const front = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.32, 0.02), mat(color)); front.position.set(0, 0.62, 0.41); s.add(front);
      for (const [px, pz] of [[-1.15, -0.4], [1.15, -0.4], [-1.15, 0.4], [1.15, 0.4]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.3, 0.1), wood); p.position.set(px, 1.15, pz); s.add(p); }
      const aw = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.06, 1.4), new THREE.MeshLambertMaterial({ map: stripes('#' + new THREE.Color(color).getHexString(), '#FFF4E0') }));
      aw.position.set(0, 2.35, 0.15); aw.rotation.x = 0.22; s.add(aw);
      goods.forEach((c, i) => { for (let j = 0; j < 2; j++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.3), mat(c)); b.position.set(-0.75 + i * 0.75 + (j ? 0.18 : -0.12), 1.09, j ? 0.12 : -0.15); s.add(b); } });
      const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: textSprite([icon + ' ' + t2(name)], 512, 112, '#FFF4E0', '#5E3E25'), transparent: true }));
      sign.scale.set(2.6, 0.57, 1); sign.position.set(0, 2.95, 0.2); s.add(sign);
      this.group.add(s);
      const pos = new THREE.Vector3(x + 0.5, G, z);
      const fr = pos.clone().add(new THREE.Vector3(Math.sin(face), 0, Math.cos(face)).multiplyScalar(1.3));
      this.stalls.push({ id, icon, name, pos, front: fr, color, goods });
    }
    this.group.add(this.sky);
  }

  /** check the calendar / the real date and show or hide the bazaar */
  refresh() {
    const g = this.g;
    const was = this.open;
    this.open = eidOpen(g.settings.eid, new Date(), g.calendarUnlocked());
    this.group.visible = this.open;
    if (this.open && !was && g.running) g.ui.toast(tr('🎉 Bazar Lebaran sudah buka di desa! Ikuti jalan ke selatan dari alun-alun.', '🎉 The Eid bazaar is open in the village! Follow the path south of the plaza.'));
  }

  update(dt: number, t: number) {
    if (!this.open) return;
    const g = this.g, p = g.player.pos;
    this.flags.forEach((f, i) => { f.rotation.y = Math.sin(t * 1.6 + i) * 0.35; });
    this.kets.forEach((k, i) => { k.rotation.z = Math.sin(t * 1.2 + i) * 0.15; });
    const inVillage = Math.hypot(p.x, p.z) < 34;
    // fireworks over the village at night
    if (g.sky.night && Math.hypot(p.x, p.z) < 80 && (this.fwT -= dt) <= 0) {
      this.fwT = (g.settings.lowGfx ? 5 : 2.4) + Math.random() * 2; // fewer with light graphics, but never none
      g.fx.fireworks((Math.random() - 0.5) * 26, G + 12, 4 + (Math.random() - 0.3) * 24);
      if (Math.hypot(p.x, p.z) < 50) SFX.boom();
    }
    if ((this.checkT -= dt) > 0) return;
    this.checkT = 0.2;
    if (inVillage && !g.stats.eidWelcome && !g.ui.isOpen()) { g.stats.eidWelcome = true; this.welcome(); return; }
    // walking up to a stall opens it (once, until you step away)
    const at = this.stalls.find(s => Math.hypot(s.front.x - p.x, s.front.z - p.z) < 1.5 && Math.abs(p.y - G) < 2);
    if (!at) { if (this.atStall && !this.stalls.some(s => s.id === this.atStall && Math.hypot(s.front.x - p.x, s.front.z - p.z) < 3)) this.atStall = null; return; }
    if (this.atStall === at.id || g.ui.isOpen()) return;
    this.atStall = at.id;
    this.stall(at);
  }

  welcome() {
    const g = this.g;
    SFX.fanfare(); g.ui.confetti(90); haptic([20, 40, 20]);
    g.fx.fireworks(g.player.pos.x, g.player.pos.y + 3, g.player.pos.z);
    g.ents.mo.celebrate = 3; g.anim.play('celebrate', 2);
    g.kid.reward('quest');
    g.ui.dialog({
      face: '🌙', who: tr('Selamat Idul Fitri!', 'Eid Mubarak!'),
      text: tr('<b>Taqabbalallahu minna wa minkum</b> — semoga Allah menerima amal kita semua. Di hari raya kita sholat Id bersama di pagi hari, saling <b>memaafkan</b> (“mohon maaf lahir dan batin”), berkunjung ke keluarga, dan berbagi makanan. Sebelum sholat Id, kita membayar <b>zakat fitrah</b> untuk membantu orang lain.<br><br>Ayo ke bazar: lewati gerbang di jalan selatan, lalu belok ke timur, dan beri salam pada semua tetangga! 🤝',
        '<b>Taqabbalallahu minna wa minkum</b> — may Allah accept from us and from you. On Eid we pray the Eid prayer together in the morning, <b>forgive</b> each other, visit family and share food. Before the Eid prayer we give <b>zakat al-fitr</b> to help others.<br><br>Visit the bazaar: go through the gate on the south path, then turn east, and greet all your neighbours! 🤝'),
      buttons: [
        { label: '📿 ' + tr('Takbir', 'Takbir'), cls: 'gold', fn: () => g.ui.duaCard(DUAS.takbir, tr('🌙 Takbir Hari Raya', '🌙 The Eid takbir')) },
        { label: tr('Alhamdulillah! 🎉', 'Alhamdulillah! 🎉') },
      ],
    });
  }

  /** a stall's offer: some things are free on Eid, others are swapped for things you found */
  stall(s: Stall) {
    const g = this.g, inv = g.inv, day = g.day, st = (g.stats.eidStall ??= {});
    const give = (id: number, n: number) => { inv.add(id, n); g.collectFx(id, n, s.pos.clone().setY(G + 1.3)); SFX.pickup(); };
    const swap = (need: [number, number][], get: () => void) => () => {
      for (const [id, n] of need) if (inv.count(id) < n) { SFX.error(); g.ui.toast(tr(`Belum cukup ${t2(nameOf(id))}`, `Not enough ${t2(nameOf(id))} yet`)); return; }
      for (const [id, n] of need) inv.remove(id, n);
      get(); g.saveSoon();
    };
    const has = (id: number, n: number) => inv.count(id) >= n;
    const label = (need: [number, number][], what: string) => `${need.map(([id, n]) => `${n} ${t2(nameOf(id))}`).join(' + ')} → ${what}`;
    if (s.id === 'food') {
      const free = st.food !== day;
      g.ui.dialog({
        face: '🍲', who: t2(s.name),
        text: free ? tr('Selamat Lebaran! Hari ini <b>ketupat & opor gratis</b> untuk semua. Ambil dua ya: satu untukmu, satu untuk dibagi! 🤲', 'Happy Eid! Today <b>ketupat & opor are free</b> for everyone. Take two: one for you and one to share! 🤲')
          : tr('Sudah ambil hari ini. Sudahkah kamu berbagi dengan tetangga? Berikan makanan pada mereka 😊', 'You already took some today. Have you shared with a neighbour? Give them some food 😊'),
        buttons: [...(free ? [{ label: tr('🍲 Ambil, terima kasih!', '🍲 Take, thank you!'), cls: 'gold', fn: () => { st.food = day; give(I.KETUPAT_OPOR, 2); g.saveSoon(); } }] : []), { label: tr('Nanti saja', 'Maybe later') }],
      });
    } else if (s.id === 'cakes') {
      const a: [number, number][] = [[I.EGG, 2]], b: [number, number][] = [[I.DATES, 3]];
      g.ui.dialog({
        face: '🍪', who: t2(s.name),
        text: tr('Kue nastar isi nanas, baru keluar dari oven! Mau tukar dengan telur atau kurma?', 'Pineapple tarts, fresh from the oven! Would you like to swap some eggs or dates?'),
        buttons: [
          { label: label(a, '3 ' + t2(nameOf(I.NASTAR))), cls: has(I.EGG, 2) ? 'gold' : 'ghost', fn: swap(a, () => give(I.NASTAR, 3)) },
          { label: label(b, '2 ' + t2(nameOf(I.NASTAR))), cls: has(I.DATES, 3) ? 'gold' : 'ghost', fn: swap(b, () => give(I.NASTAR, 2)) },
          { label: tr('Nanti saja', 'Maybe later') },
        ],
      });
    } else if (s.id === 'fun') {
      const a: [number, number][] = [[I.PEARL, 1]], b: [number, number][] = [[I.APPLE, 3]];
      g.ui.dialog({
        face: '🎆', who: t2(s.name),
        text: tr('Kembang api warna-warni! Pegang, lalu ketuk 👆 Pakai untuk meluncurkannya ke langit. Mutiara ada di kerang di Taman Karang 🪸', 'Colourful fireworks! Hold one and tap 👆 Use to launch it into the sky. Pearls are inside clams at the Coral Reef 🪸'),
        buttons: [
          { label: label(a, '4 ' + t2(nameOf(I.FIREWORK))), cls: has(I.PEARL, 1) ? 'gold' : 'ghost', fn: swap(a, () => give(I.FIREWORK, 4)) },
          { label: label(b, '2 ' + t2(nameOf(I.FIREWORK))), cls: has(I.APPLE, 3) ? 'gold' : 'ghost', fn: swap(b, () => give(I.FIREWORK, 2)) },
          { label: tr('Nanti saja', 'Maybe later') },
        ],
      });
    } else {
      const own = (g.stats.eidShirts ??= []);
      const a: [number, number][] = [[I.PEARL, 2]], b: [number, number][] = [[I.PEARL, 3]];
      const buy = (id: string) => () => { own.push(id); g.ui.confetti(40); SFX.quest(); g.ui.toast(tr('👕 Baju baru! Pakai di 👕 Baju', '👕 New outfit! Wear it in 👕 Outfits')); };
      g.ui.dialog({
        face: '👕', who: t2(s.name),
        text: tr('Baju baru untuk hari raya! Memakai baju terbaik di hari Id itu sunnah. Tukar dengan mutiara dari Taman Karang 🪸', 'New clothes for Eid! Wearing your best clothes on Eid is a sunnah. Swap them for pearls from the Coral Reef 🪸'),
        buttons: [
          ...(!own.includes('s_eid_green') ? [{ label: label(a, '🌙 ' + tr('Baju Hijau', 'Green Outfit')), cls: has(I.PEARL, 2) ? 'gold' : 'ghost', fn: swap(a, buy('s_eid_green')) }] : []),
          ...(!own.includes('s_eid_gold') ? [{ label: label(b, '✨ ' + tr('Baju Emas', 'Golden Outfit')), cls: has(I.PEARL, 3) ? 'gold' : 'ghost', fn: swap(b, buy('s_eid_gold')) }] : []),
          ...(own.length ? [{ label: '👕 ' + tr('Coba pakai', 'Try it on'), cls: 'ghost', fn: () => g.ui.openBook('wardrobe') }] : []),
          { label: tr('Nanti saja', 'Maybe later') },
        ],
      });
    }
  }

  /** talking to a villager on Eid: you greet and forgive each other, and get an Eid envelope (once a day) */
  greet(npcId: string, who: string, face: string, img: boolean, at: THREE.Vector3): boolean {
    const g = this.g, gr = (g.stats.eidGreet ??= {});
    if (!this.open || gr[npcId] === g.day) return false;
    gr[npcId] = g.day;
    g.inv.add(I.ANGPAO, 1); g.collectFx(I.ANGPAO, 1, at.clone().setY(at.y + 1.3));
    SFX.quest(); g.fx.hearts(at.x, at.y + 2, at.z, 4);
    g.kid.reward('give');
    g.ui.dialog({
      face, img, who,
      text: tr('<b>Minal ‘aidin wal faizin</b>, mohon maaf lahir dan batin ya, Nak. 🤝 Ini <b>amplop lebaran</b> untukmu. Pegang lalu ketuk 👆 Pakai untuk membukanya!', '<b>Minal ‘aidin wal faizin</b> — please forgive me for anything, dear. 🤝 Here is an <b>Eid envelope</b> for you. Hold it and tap 👆 Use to open it!'),
      buttons: [{ label: tr('Sama-sama, maaf lahir batin 🤲', 'I forgive you too 🤲'), cls: 'gold' }],
    });
    g.checkQuests(); g.saveSoon();
    return true;
  }

  /** opening an Eid envelope: a little surprise */
  openAngpao() {
    const g = this.g;
    if (!g.inv.remove(I.ANGPAO, 1)) return;
    const gifts: [number, number][][] = [[[I.GOLD_INGOT, 1], [I.NASTAR, 2]], [[I.PEARL, 1], [I.FIREWORK, 2]], [[B.GOLD_TILE, 4], [I.DATES, 3]], [[I.CRYSTAL, 1], [I.FIREWORK, 3]]];
    const pick = gifts[(g.stats.angpao = (g.stats.angpao || 0) + 1) % gifts.length];
    for (const [id, n] of pick) { g.inv.add(id, n); g.ui.pickup(id, n); }
    g.kid.reward('quest', 0.3);
    SFX.fanfare(); g.ui.confetti(50); haptic([15, 30, 15]);
    g.ui.say(tr('Alhamdulillah, terima kasih! Jangan lupa berbagi juga ya 💚', 'Alhamdulillah, thank you! Remember to share too 💚'), 'alright');
    g.saveSoon();
  }

  /** a firework from your hand: a sparkling trail up, then a burst */
  launch() {
    const g = this.g;
    if (!g.inv.remove(I.FIREWORK, 1)) return;
    const p = g.player.pos.clone();
    g.stats.fireworks = (g.stats.fireworks || 0) + 1;
    SFX.boom();
    for (let i = 0; i < 6; i++) setTimeout(() => g.fx.sparkle(p.x, p.y + 2 + i * 2, p.z, 3, 0xffd874, 0.6), i * 70);
    setTimeout(() => g.fx.fireworks(p.x, p.y + 9, p.z), 450);
    g.anim.play('celebrate', 1);
  }
}
