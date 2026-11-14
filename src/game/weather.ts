// Weather of the day: every day in the game has its own weather, the same
// for the same world and day. Sunny; a misty morning; a windy day (kites fly
// high, clouds race); or a blossom day with petals drifting from the trees.
// Rain still comes and goes on its own.
import * as THREE from 'three';
import type { Game } from '../main';
import { tr, type T2 } from '../i18n';
import { hash3 } from '../world/noise';
import { Biome } from '../world/gen';

export type WeatherKind = 'sunny' | 'misty' | 'windy' | 'blossom';
export const WEATHER: Record<WeatherKind, { icon: string; name: T2; say: T2; wind: number }> = {
  sunny: { icon: '☀️', name: ['Cerah', 'Sunny'], say: ['Hari ini cerah! Langitnya biru sekali ☀️', 'It’s a sunny day! The sky is so blue ☀️'], wind: 0.4 },
  misty: { icon: '🌫️', name: ['Pagi berkabut', 'Misty morning'], say: ['Pagi ini berkabut! Kabut adalah awan yang turun dekat tanah. Nanti siang kabutnya hilang 🌫️', 'A misty morning! Mist is a cloud that comes down near the ground. It will clear by midday 🌫️'], wind: 0.2 },
  windy: { icon: '💨', name: ['Berangin', 'Windy'], say: ['Hari ini berangin! Pas sekali untuk main layang-layang 🪁', 'It’s a windy day! Perfect for flying a kite 🪁'], wind: 1 },
  blossom: { icon: '🌸', name: ['Hari bunga', 'Blossom day'], say: ['Hari bunga! Kelopak bunga beterbangan dari pohon. Indah ya, Subhanallah 🌸', 'A blossom day! Petals are drifting from the trees. So pretty, Subhanallah 🌸'], wind: 0.5 },
};

/** the weather for a day of a world */
export function weatherFor(seed: number, day: number): WeatherKind {
  const r = hash3(day, 17, 3, seed);
  return r < 0.4 ? 'sunny' : r < 0.6 ? 'misty' : r < 0.8 ? 'windy' : 'blossom';
}

const N = 90;
export class Weather {
  kind: WeatherKind = 'sunny';
  private day = -1;
  private petals: THREE.Points; private pos = new Float32Array(N * 3); private vel: number[] = [];
  constructor(private g: Game) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const x = c.getContext('2d')!; x.fillStyle = '#FFB3D1'; x.beginPath(); x.ellipse(8, 8, 7, 4, 0.6, 0, Math.PI * 2); x.fill(); x.fillStyle = '#FFE0EC'; x.fillRect(6, 6, 3, 2);
    this.petals = new THREE.Points(geo, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(c), size: 0.42, transparent: true, depthWrite: false, alphaTest: 0.2 }));
    this.petals.frustumCulled = false; this.petals.visible = false;
    for (let i = 0; i < N; i++) this.vel.push(0.4 + Math.random() * 0.5);
    g.scene.add(this.petals);
  }
  get info() { return WEATHER[this.kind]; }

  update(dt: number, t: number) {
    const g = this.g, p = g.player.pos, sc = g.schedule, h = g.hour;
    if (g.day !== this.day) {
      const first = this.day === -1;
      this.day = g.day; this.kind = weatherFor(g.seed, g.day);
      if (!first) g.ui.say(tr(this.info.say[0], this.info.say[1]), 'ok', 6000);
      for (let i = 0; i < N; i++) this.pos.set([p.x + (Math.random() - 0.5) * 24, p.y + Math.random() * 10, p.z + (Math.random() - 0.5) * 24], i * 3);
    }
    // mist hangs from dawn until a couple of hours after sunrise, then lifts
    let mist = 0;
    if (this.kind === 'misty' && h > sc.fajr - 0.5 && h < sc.sunrise + 3) mist = Math.min(1, (h - (sc.fajr - 0.5)) / 0.5) * Math.min(1, (sc.sunrise + 3 - h) / 1.5);
    g.sky.mist += (mist - g.sky.mist) * Math.min(1, dt * 0.5);
    g.sky.windy = this.kind === 'windy';
    g.kites.wind = this.info.wind;
    // petals drifting down around you on blossom days, outside and in the daytime
    const col = g.gen.column(Math.floor(p.x), Math.floor(p.z));
    const show = this.kind === 'blossom' && !g.sky.night && !g.settings.lowGfx && p.y > col.h - 3 && col.biome !== Biome.DESERT && col.biome !== Biome.SNOWY && col.biome !== Biome.OCEAN;
    this.petals.visible = show;
    if (!show) return;
    for (let i = 0; i < N; i++) {
      const k = i * 3;
      this.pos[k] += (Math.sin(t * 0.8 + i) * 0.4 + 0.5) * dt;
      this.pos[k + 1] -= this.vel[i] * dt;
      this.pos[k + 2] += Math.cos(t * 0.6 + i * 1.3) * 0.4 * dt;
      if (this.pos[k + 1] < p.y - 1 || Math.abs(this.pos[k] - p.x) > 11 || Math.abs(this.pos[k + 2] - p.z) > 11 || g.world.roofed(this.pos[k], this.pos[k + 1] - 1.5, this.pos[k + 2])) {
        this.pos.set([p.x + (Math.random() - 0.5) * 18, p.y + 3 + Math.random() * 5, p.z + (Math.random() - 0.5) * 18], k);
        // petals only drift where there's open sky: none inside the masjid or a house
        if (g.world.roofed(this.pos[k], this.pos[k + 1] - 1.5, this.pos[k + 2])) this.pos[k + 1] = -1000;
      }
    }
    (this.petals.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}
