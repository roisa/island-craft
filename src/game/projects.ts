// Sadaqah jariyah: good deeds help build things for the whole village. When a
// project's good deeds are complete it is built in the village, with a
// celebration, and the villagers start using it. Rasulullah ﷺ taught that some
// good keeps on giving after us: ongoing charity, beneficial knowledge, and a
// righteous child who prays for us (Muslim 1631).
import type { Game } from '../main';
import { tr, t2, type T2 } from '../i18n';
import { B } from '../world/blocks';
import { VILLAGE_Y } from '../world/gen';
import { kindTotal, newLog, type ProjectKind } from './amal';
import { PLACES, ROUTINES } from './routines';
import { SFX, haptic } from './audio';

const G = VILLAGE_Y; // the village ground level (blocks stand on G + 1)

export interface Project {
  id: string; icon: string; name: T2; kind: ProjectKind; need: number;
  why: T2; done: T2;
  /** blocks to place: [x, y, z, id] relative to the village ground */
  cells: () => [number, number, number, number][];
  /** the spot the villagers use once it's built */
  place: { x: number; z: number; yaw: number };
}
const boxCells = (out: [number, number, number, number][], x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, f: (x: number, y: number, z: number) => number | null) => {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) { const id = f(x, y, z); if (id !== null) out.push([x, y, z, id]); }
};

export const PROJECTS: Project[] = [
  {
    id: 'fountain', icon: '⛲', name: ['Pancuran Air untuk Semua', 'A Water Fountain for Everyone'], kind: 'kind', need: 20,
    why: ['Sahabat Sa’d bin ‘Ubadah membuat sumur untuk semua orang sebagai sedekah untuk ibunya. Memberi air adalah sedekah terbaik.', 'The companion Sa‘d ibn ‘Ubadah dug a well for everyone as charity for his mother. Giving water is the best charity.'],
    done: ['Pancuran air sudah jadi! Siapa pun yang lewat bisa minum: warga, musafir, dan hewan.', 'The fountain is built! Anyone passing by can drink: villagers, travellers and animals.'],
    cells: () => {
      const c: [number, number, number, number][] = [], x = 16, z = -3;
      boxCells(c, x - 2, G, z - 2, x + 2, G, z + 2, () => B.MOSAIC);
      boxCells(c, x - 1, G + 1, z - 1, x + 1, G + 1, z + 1, (X, _y, Z) => (X === x && Z === z ? B.WATER : B.MARBLE));
      c.push([x, G + 2, z, B.MARBLE], [x, G + 3, z, B.WATER]);
      for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) c.push([x + dx, G + 1, z + dz, B.OAK_LOG], [x + dx, G + 2, z + dz, B.LANTERN]);
      c.push([x + 4, G + 1, z, B.PALM_LOG], [x + 4, G + 2, z, B.PALM_LOG], [x + 4, G + 3, z, B.PALM_LOG], [x + 4, G + 4, z, B.PALM_LEAVES]);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.push([x + 4 + dx, G + 4, z + dz, B.PALM_LEAVES]);
      return c;
    },
    place: { x: 14.5, z: -2.5, yaw: Math.PI / 2 },
  },
  {
    id: 'madrasah', icon: '🏫', name: ['Madrasah Desa', 'The Village Madrasah'], kind: 'learn', need: 15,
    why: ['Ilmu yang bermanfaat terus memberi pahala, bahkan setelah kita tiada. Madrasah tempat semua warga belajar membaca Al-Qur’an.', 'Beneficial knowledge keeps giving reward even after we are gone. A madrasah where everyone learns to read the Qur’an.'],
    done: ['Madrasah sudah jadi! Ayah Ibrahim mengajar di sini setiap pagi.', 'The madrasah is built! Dad Ibrahim teaches here every morning.'],
    cells: () => {
      const c: [number, number, number, number][] = [], x0 = -22, x1 = -16, z0 = -8, z1 = -3;
      boxCells(c, x0, G, z0, x1, G, z1, () => B.PLANKS);
      boxCells(c, x0, G + 1, z0, x1, G + 4, z1, (X, Y, Z) => {
        const wall = X === x0 || X === x1 || Z === z0 || Z === z1;
        if (!wall) return B.AIR;
        if (X === x1 && Z >= z0 + 2 && Z <= z0 + 3 && Y <= G + 2) return B.AIR;   // door, facing the plaza
        if (Y === G + 2 && (Z === z0 || Z === z1) && (X - x0) % 2 === 1) return B.GLASS;
        return Y === G + 4 ? B.MOSAIC : B.BRICK;
      });
      for (let l = 0; l < 3; l++) boxCells(c, x0 - 1 + l, G + 5 + l, z0 - 1 + l, x1 + 1 - l, G + 5 + l, z1 + 1 - l, (X, _y, Z) => (l < 2 && X > x0 - 1 + l && X < x1 + 1 - l && Z > z0 - 1 + l && Z < z1 + 1 - l ? null : B.WOOL_GREEN));
      c.push([x0 + 1, G + 1, z0 + 1, B.BOOKSHELF], [x0 + 1, G + 1, z0 + 2, B.BOOKSHELF], [x0 + 1, G + 1, z1 - 1, B.BOOKSHELF]);
      c.push([x0 + 3, G + 1, z0 + 1, B.WOOL_BLUE], [x0 + 3, G + 1, z1 - 1, B.WOOL_BLUE], [x0 + 4, G + 1, z0 + 1, B.WOOL_YELLOW], [x0 + 4, G + 1, z1 - 1, B.WOOL_YELLOW]);
      c.push([x0 + 2, G + 3, z0 + 2, B.LANTERN], [x0 + 4, G + 3, z1 - 2, B.LANTERN]);
      for (let i = 0; i < 4; i++) c.push([x0 + 1 + i * 2 - (i > 2 ? 1 : 0), G + 3, z0 + 1, B.LETTER_0 + i]);
      return c;
    },
    place: { x: -20.5, z: -5.5, yaw: Math.PI / 2 },
  },
  {
    id: 'garden', icon: '🌳', name: ['Taman Masjid', 'The Masjid Garden'], kind: 'worship', need: 15,
    why: ['Taman yang teduh di samping masjid, dengan bangku, pohon dan bunga, tempat warga berdzikir dan beristirahat.', 'A shady garden beside the masjid, with benches, trees and flowers, where people remember Allah and rest.'],
    done: ['Taman masjid sudah jadi! Kakek Yusuf suka berdzikir di sini.', 'The masjid garden is built! Grandpa Yusuf loves to sit and remember Allah here.'],
    cells: () => {
      const c: [number, number, number, number][] = [], x0 = 14, x1 = 19, z0 = -22, z1 = -18;
      boxCells(c, x0, G, z0, x1, G, z1, (X, _y, Z) => ((X === x0 || X === x1 || Z === z0 || Z === z1) ? B.COBBLE : B.GRASS));
      const fl = [B.FLOWER_RED, B.FLOWER_YELLOW, B.FLOWER_BLUE, B.FLOWER_PURPLE];
      boxCells(c, x0 + 1, G + 1, z0 + 1, x1 - 1, G + 1, z1 - 1, (X, _y, Z) => ((X + Z) % 2 === 0 ? fl[(X * 3 + Z + 40) % 4] : null));
      for (const [tx, tz] of [[x0, z0], [x1, z1]]) { for (let i = 1; i <= 4; i++) c.push([tx, G + i, tz, B.OAK_LOG]); boxCells(c, tx - 1, G + 4, tz - 1, tx + 1, G + 6, tz + 1, (X, Y, Z) => (X === tx && Z === tz && Y < G + 5 ? null : B.OAK_LEAVES)); }
      c.push([x0 + 2, G + 1, z1, B.PLANKS], [x0 + 3, G + 1, z1, B.PLANKS], [x1 - 1, G + 1, z0, B.PLANKS]);
      c.push([x1, G + 1, z0, B.LANTERN], [x0, G + 1, z1, B.LANTERN]);
      return c;
    },
    place: { x: 16.5, z: -17.4, yaw: Math.PI },
  },
];

export class Projects {
  constructor(private g: Game) { }
  private get built() { return (this.g.stats.projects ??= []); }
  private get placed() { return (this.g.stats.projectsPlaced ??= []); }
  progress(p: Project) { return Math.min(p.need, kindTotal(this.g.stats.amal ?? newLog(), p.kind) - (this.g.stats.projectBase?.[p.kind] ?? 0)); }
  /** a good deed was done: is a project complete now? */
  check() {
    const g = this.g;
    for (const p of PROJECTS) {
      if (this.built.includes(p.id) || this.progress(p) < p.need) continue;
      this.built.push(p.id);
      this.useIt(p);
      SFX.fanfare(); haptic([20, 50, 20]); g.ui.confetti(100);
      g.ents.mo.celebrate = 3; g.kid.reward('quest');
      g.addCoins(150, from => g.ui.coinPop(150, from));
      g.ui.dialog({ face: p.icon, who: t2(p.name), text: `<b>${tr('Alhamdulillah, sudah dibangun bersama-sama!', 'Alhamdulillah, built together!')}</b><br>${t2(p.done)}<br><br>💛 ${t2(p.why)}<br><small>${tr('“Jika manusia meninggal, amalnya terputus kecuali tiga: sedekah jariyah, ilmu yang bermanfaat, dan anak saleh yang mendoakannya.” (HR. Muslim 1631)', '“When a person dies, their deeds end except three: ongoing charity, beneficial knowledge, and a righteous child who prays for them.” (Muslim 1631)')}</small>`, buttons: [{ label: tr('Ayo lihat! 🧭', 'Let’s go and see! 🧭'), cls: 'gold' }] });
      g.saveSoon();
    }
  }
  /** villagers start using what's been built */
  private useIt(p: Project) {
    (PLACES as Record<string, { x: number; z: number; yaw: number }>)[p.id] = p.place;
    const swap = (who: keyof typeof ROUTINES, from: string, to: string) => { for (const s of ROUTINES[who]) if (s.at === from) (s as { at: string }).at = to; };
    if (p.id === 'madrasah') swap('ustadz', 'porch', 'madrasah');
    if (p.id === 'fountain') swap('yusuf', 'well', 'fountain');
    if (p.id === 'garden') swap('yusuf', 'garden', 'garden2');
    if (p.id === 'garden') (PLACES as Record<string, { x: number; z: number; yaw: number }>).garden2 = p.place;
  }
  /** build what's finished once the village is loaded (block edits are saved with the world) */
  update() {
    const g = this.g;
    for (const p of PROJECTS) {
      if (!this.built.includes(p.id) || this.placed.includes(p.id)) continue;
      const cells = p.cells();
      if (!cells.every(([x, , z]) => g.world.chunkAt(x, z))) continue;
      for (const [x, y, z, id] of cells) g.world.set(x, y, z, id);
      this.placed.push(p.id);
      g.fx.fireworks(p.place.x, G + 3, p.place.z);
      g.saveSoon();
    }
  }
  /** after loading a save: villagers keep using what was built */
  restore() { for (const p of PROJECTS) if (this.built.includes(p.id)) this.useIt(p); }
  html() {
    return `<h3>🏗️ ${tr('Proyek desa (sedekah jariyah)', 'Village projects (ongoing charity)')}</h3><div class="projList">${PROJECTS.map(p => {
      const b = this.built.includes(p.id), n = this.progress(p);
      const kind = { kind: tr('kebaikan & berbagi', 'kindness & sharing'), learn: tr('belajar', 'learning'), worship: tr('ibadah', 'worship') }[p.kind];
      return `<div class="projRow ${b ? 'built' : ''}"><div class="ic">${p.icon}</div><div class="tx"><b>${esc(t2(p.name))}</b><small>${b ? '✅ ' + tr('Sudah dibangun di desa!', 'Built in the village!') : tr(`Butuh ${p.need} amal ${kind}: ${n}/${p.need}`, `Needs ${p.need} good deeds of ${kind}: ${n}/${p.need}`)}</small>${b ? '' : `<div class="bar"><i style="width:${Math.round(n / p.need * 100)}%"></i></div>`}</div></div>`;
    }).join('')}</div>`;
  }
}
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
