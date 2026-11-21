// The Animal Sanctuary: five little animals are lost around the world. Tap one
// and it follows you; walk it into the sanctuary's pen and it has a home. The
// rescued animals live in the pen from then on, and you can visit and feed them.
import * as THREE from 'three';
import type { Game } from '../main';
import { tr, type T2 } from '../i18n';
import { Animal } from './entities';
import { nameTag, type AnimalKind } from './models';
import { mulberry32 } from '../world/noise';
import { Biome, SEA } from '../world/gen';
import { I } from '../world/blocks';
import { SFX, haptic } from './audio';

export interface Lost { id: string; kind: AnimalKind; name: string; icon: string; x: number; z: number }
const FRIENDS: { kind: AnimalKind; name: string; icon: string; say: T2 }[] = [
  { kind: 'sheep', name: 'Kapas', icon: '🐑', say: ['Embee… aku tersesat!', 'Baa… I’m lost!'] },
  { kind: 'cat', name: 'Belang', icon: '🐱', say: ['Meong… aku mencari rumah.', 'Meow… I’m looking for a home.'] },
  { kind: 'goat', name: 'Kiki', icon: '🐐', say: ['Mbek! Aku tidak tahu jalan pulang.', 'Maa! I don’t know the way home.'] },
  { kind: 'chicken', name: 'Pipit', icon: '🐔', say: ['Petok… di mana rumahku?', 'Cluck… where’s my home?'] },
  { kind: 'cow', name: 'Mochi', icon: '🐄', say: ['Mooo… aku sendirian.', 'Mooo… I’m all alone.'] },
];

/** where the lost animals wait: the same places for the same world */
export function lostSpots(seed: number, column: (x: number, z: number) => { h: number; biome: Biome }, avoid: { x: number; z: number }[]): Lost[] {
  const rnd = mulberry32(seed ^ 0xa11a), out: Lost[] = [];
  FRIENDS.forEach((f, i) => {
    for (let k = 0; k < 200; k++) {
      const a = rnd() * Math.PI * 2, d = 45 + i * 25 + rnd() * 40;
      const x = Math.round(Math.cos(a) * d), z = Math.round(Math.sin(a) * d), c = column(x, z);
      if (c.biome === Biome.OCEAN || c.biome === Biome.VILLAGE || c.h <= SEA || c.h > SEA + 30) continue;
      if (avoid.some(p => Math.hypot(p.x - x, p.z - z) < 16)) continue;
      out.push({ id: f.kind, kind: f.kind, name: f.name, icon: f.icon, x: x + 0.5, z: z + 0.5 });
      break;
    }
  });
  return out;
}

export class Sanctuary {
  lost: Lost[];
  private live = new Map<string, Animal>();
  private pen: { x: number; y: number; z: number } | null = null;
  private t = 0;
  constructor(private g: Game) {
    const l = g.gen.landmarks.find(l => l.id === 'sanctuary');
    if (l?.at?.pen) { const [x, y, z] = l.at.pen; this.pen = { x, y, z }; }
    this.lost = lostSpots(g.seed, (x, z) => g.gen.column(x, z), [...g.gen.landmarks, ...g.gen.shrines]);
  }
  private get rescued() { return (this.g.stats.rescued ??= []); }
  friend(id: string) { return FRIENDS.find(f => f.kind === id)!; }
  /** an animal from here (lost, following or living in the pen) */
  owns(a: Animal) { for (const [id, x] of this.live) if (x === a) return id; return null; }
  isLost(a: Animal) { const id = this.owns(a); return !!id && !this.rescued.includes(id) && !a.follow; }
  isHome(a: Animal) { const id = this.owns(a); return !!id && this.rescued.includes(id); }
  following() { return [...this.live.entries()].filter(([id, a]) => a.follow && !this.rescued.includes(id)).map(([id]) => id); }
  /** for the explorer's arrow: a lost animal you asked to find */
  target(id: string): { x: number; z: number; icon: string } | null {
    if (!id.startsWith('lost:')) return null;
    const l = this.lost.find(l => l.id === id.slice(5));
    if (!l || this.rescued.includes(l.id)) return null;
    const a = this.live.get(l.id);
    return { x: a ? a.pos.x : l.x, z: a ? a.pos.z : l.z, icon: l.icon };
  }

  private spawn(id: string, kind: AnimalKind, x: number, z: number, home: boolean) {
    const g = this.g;
    if (!g.world.chunkAt(x, z)) return; // not loaded yet
    // the ground itself (the height map would count treetops)
    const top = home ? this.pen!.y - 1 : g.gen.column(Math.floor(x), Math.floor(z)).h;
    const a = new Animal(kind, g.world);
    a.pos.set(x, top + 1, z); a.chunk = 'sanctuary';
    const f = this.friend(id);
    const tag = nameTag(home ? '🏡 ' + f.name : '🥺 ' + tr('Tersesat', 'Lost'), home ? '#B8F2B0' : '#FFE08A');
    tag.position.y = a.rig.height + 0.35; a.rig.root.add(tag); a.tagObj = tag;
    if (home && this.pen) a.pen = { x: this.pen.x, z: this.pen.z, r: 4 };
    g.ents.animals.push(a); g.scene.add(a.rig.root);
    this.live.set(id, a);
  }
  private retag(a: Animal, text: string, color: string) {
    if (a.tagObj) a.rig.root.remove(a.tagObj);
    const tag = nameTag(text, color); tag.position.y = a.rig.height + 0.35; a.rig.root.add(tag); a.tagObj = tag;
  }

  /** tapping a lost animal: it trusts you and follows */
  befriend(a: Animal) {
    const g = this.g, id = this.owns(a)!, f = this.friend(id);
    a.follow = () => g.player.pos; a.cheer();
    this.retag(a, '🥰 ' + f.name, '#FFB3C8');
    SFX.pet(); SFX.critter(a.kind); haptic(15);
    g.fx.hearts(a.pos.x, a.pos.y + a.rig.height, a.pos.z, 5);
    if (g.exploreTarget === 'lost:' + id) g.exploreTarget = null;
    if (this.pen) g.exploreTarget = 'sanctuary';
    g.ui.dialog({
      face: f.icon, who: f.name,
      text: tr(`${f.say[0]} <br>Kamu mau menolongku? Aku akan mengikutimu. Antar aku ke <b>🏡 Rumah Hewan</b> ya — panah emas menunjukkan jalannya!`, `${f.say[1]} <br>Will you help me? I’ll follow you. Take me to the <b>🏡 Animal Sanctuary</b> — the golden arrow shows the way!`),
      buttons: [{ label: tr('Ayo pulang! 🏡', 'Let’s go home! 🏡'), cls: 'gold' }],
    });
  }

  /** tapping an animal that lives in the pen while holding food: a meal */
  feed(a: Animal): boolean {
    const g = this.g, held = g.inv.held();
    if (!held || ![I.APPLE, I.DATES, I.MILK].includes(held.id) || a.petCd > 0) return false;
    g.inv.useHeld(); a.petCd = 1.5; a.cheer(); a.spin = 0.7;
    g.fx.hearts(a.pos.x, a.pos.y + a.rig.height, a.pos.z, 6); SFX.pet(); SFX.critter(a.kind);
    g.stats.fed = (g.stats.fed || 0) + 1; g.amal('animal');
    g.kid.reward('give');
    g.ui.toast(tr(`😋 ${this.friend(this.owns(a)!).name} kenyang dan senang!`, `😋 ${this.friend(this.owns(a)!).name} is full and happy!`));
    g.checkQuests(); g.saveSoon();
    return true;
  }

  private welcomeHome(id: string, a: Animal) {
    const g = this.g, f = this.friend(id);
    this.rescued.push(id); g.amal('animal', 3);
    a.follow = null; a.pen = { x: this.pen!.x, z: this.pen!.z, r: 4 }; a.target = new THREE.Vector3(this.pen!.x, a.pos.y, this.pen!.z);
    this.retag(a, '🏡 ' + f.name, '#B8F2B0');
    SFX.fanfare(); haptic([15, 40, 15]); g.ui.confetti(60);
    g.fx.hearts(a.pos.x, a.pos.y + a.rig.height, a.pos.z, 10);
    g.ents.mo.celebrate = 2; g.anim.play('celebrate', 1.6);
    g.kid.reward('quest', 0.5);
    if (g.exploreTarget === 'sanctuary') g.exploreTarget = null;
    const left = this.lost.length - this.rescued.length;
    g.ui.say(left ? tr(`Selamat datang di rumah, ${f.name}! Masih ada ${left} hewan yang tersesat 🐾`, `Welcome home, ${f.name}! ${left} more animals are still lost 🐾`) : tr('Masya Allah! Semua hewan sudah punya rumah! 🏡💕', 'Masha Allah! Every animal has a home now! 🏡💕'), 'alright', 6000);
    g.checkQuests(); g.saveSoon();
  }

  update(dt: number) {
    if ((this.t -= dt) > 0) return;
    this.t = 0.5;
    const g = this.g, p = g.player.pos;
    // lost animals appear when you come near their spot; rescued ones live in the pen
    for (const l of this.lost) {
      if (this.live.has(l.id)) continue;
      const home = this.rescued.includes(l.id);
      if (home && this.pen && Math.hypot(this.pen.x - p.x, this.pen.z - p.z) < 70) this.spawn(l.id, l.kind, this.pen.x + (Math.random() - 0.5) * 6, this.pen.z + (Math.random() - 0.5) * 6, true);
      else if (!home && Math.hypot(l.x - p.x, l.z - p.z) < 60) this.spawn(l.id, l.kind, l.x, l.z, false);
    }
    // a friend walked into the pen: home at last
    if (!this.pen) return;
    for (const [id, a] of this.live) {
      if (!a.follow || this.rescued.includes(id)) continue;
      if (Math.hypot(a.pos.x - this.pen.x, a.pos.z - this.pen.z) < 5.5 && Math.abs(a.pos.y - this.pen.y) < 3) this.welcomeHome(id, a);
    }
  }
}
