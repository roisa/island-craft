// The treasure map: four pieces wait in the lighthouse, the oasis camp, the
// igloo and the library ruins. Each piece shows a quarter of a hand-drawn map;
// with all four the map shows a red X far away. Dig under the X for the great
// treasure: gold, crystals and a treasure hunter's crown.
import type { Game } from '../main';
import { tr, t2 } from '../i18n';
import { B, I } from '../world/blocks';
import { Biome } from '../world/gen';
import { MAP_PIECE_PLACES } from '../world/landmarks';
import { SFX, haptic } from './audio';

const COLORS: Record<number, string> = {
  [Biome.OCEAN]: '#7FB8D8', [Biome.BEACH]: '#EAD9A0', [Biome.MEADOW]: '#B5D88A', [Biome.FOREST]: '#7FB06A',
  [Biome.DESERT]: '#E8CF8E', [Biome.SNOWY]: '#F2F4F7', [Biome.MOUNTAIN]: '#A9A39A', [Biome.VILLAGE]: '#D9B98A',
};
export const MAP_RANGE = 300;

export class Treasure {
  private hintShown = false;
  constructor(private g: Game) { }
  get pieces() { return (this.g.stats.mapPieces ??= []); }
  get complete() { return this.pieces.length >= MAP_PIECE_PLACES.length; }
  /** which place a scroll at x,z belongs to */
  private placeOf(x: number, z: number) {
    let best = '', bd = Infinity;
    for (const l of this.g.gen.landmarks) { if (!MAP_PIECE_PLACES.includes(l.id)) continue; const d = Math.hypot(l.x - x, l.z - z); if (d < bd) { bd = d; best = l.id; } }
    return bd < 30 ? best : '';
  }

  /** tapping a map scroll */
  collect(x: number, y: number, z: number) {
    const g = this.g, id = this.placeOf(x, z);
    g.world.set(x, y, z, B.AIR);
    if (!id || this.pieces.includes(id)) return;
    this.pieces.push(id);
    g.inv.add(I.MAP_PIECE, 1); g.collectFx(I.MAP_PIECE, 1, { x: x + 0.5, y: y + 0.5, z: z + 0.5 } as any);
    SFX.fanfare(); haptic([15, 30, 15]);
    g.kid.reward('quest', 0.3);
    g.ui.mapPiece(this.complete);
    if (this.complete) g.exploreTarget = 'treasure';
    g.checkQuests(); g.saveSoon();
  }

  /** draw the map: a quarter shows for each piece you have; the X once it's whole */
  private land: HTMLCanvasElement | null = null;
  /** the land itself, drawn once (it never changes for a world) */
  private landCanvas() {
    if (this.land) return this.land;
    const N = 60, c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d')!;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const wx = -MAP_RANGE + (i + 0.5) * (2 * MAP_RANGE / N), wz = -MAP_RANGE + (j + 0.5) * (2 * MAP_RANGE / N);
      x.fillStyle = COLORS[this.g.gen.column(Math.round(wx), Math.round(wz)).biome] ?? '#ccc';
      x.fillRect(i, j, 1, 1);
    }
    return (this.land = c);
  }
  draw(cv: HTMLCanvasElement) {
    const g = this.g, x = cv.getContext('2d')!, W = cv.width;
    const toPx = (wx: number) => (wx + MAP_RANGE) / (2 * MAP_RANGE) * W;
    x.imageSmoothingEnabled = false;
    x.drawImage(this.landCanvas(), 0, 0, W, W);
    // the parts you don't have yet are blank parchment
    const quarter = [[0, 0], [1, 0], [0, 1], [1, 1]];
    MAP_PIECE_PLACES.forEach((id, k) => {
      if (this.pieces.includes(id)) return;
      const [qx, qy] = quarter[k];
      x.fillStyle = '#E9D8A6'; x.fillRect(qx * W / 2, qy * W / 2, W / 2, W / 2);
      x.fillStyle = '#C9A36D'; x.font = `${W / 7}px system-ui`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', qx * W / 2 + W / 4, qy * W / 2 + W / 4);
    });
    x.strokeStyle = 'rgba(94,62,37,.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(W / 2, 0); x.lineTo(W / 2, W); x.moveTo(0, W / 2); x.lineTo(W, W / 2); x.stroke();
    x.font = `${W / 14}px system-ui`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('🕌', toPx(0), toPx(0));
    if (this.complete) {
      const t = g.gen.treasure, px = toPx(t.x), pz = toPx(t.z), r = W / 28;
      x.strokeStyle = '#C0392B'; x.lineWidth = 4; x.beginPath(); x.moveTo(px - r, pz - r); x.lineTo(px + r, pz + r); x.moveTo(px + r, pz - r); x.lineTo(px - r, pz + r); x.stroke();
      x.setLineDash([4, 5]); x.lineWidth = 2; x.beginPath(); x.moveTo(toPx(0), toPx(0)); x.lineTo(px, pz); x.stroke(); x.setLineDash([]);
    }
    const p = g.player.pos;
    x.fillStyle = '#2E6FE0'; x.beginPath(); x.arc(toPx(p.x), toPx(p.z), W / 70 + 2, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#5E3E25'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, W - 3, W - 3);
  }

  isGreatChest(x: number, y: number, z: number) { const t = this.g.gen.treasure; return x === t.x && y === t.y && z === t.z; }
  /** the great treasure chest */
  openGreat() {
    const g = this.g, t = g.gen.treasure;
    g.world.set(t.x, t.y, t.z, B.AIR);
    const gifts: [number, number][] = [[I.GOLD_INGOT, 6], [I.CRYSTAL, 5], [I.PEARL, 3], [B.GOLD_TILE, 12]];
    for (const [id, n] of gifts) { g.inv.add(id, n); g.ui.pickup(id, n); }
    g.stats.greatTreasure = true; g.stats.chests = (g.stats.chests || 0) + 1;
    if (g.exploreTarget === 'treasure') g.exploreTarget = null;
    SFX.fanfare(); haptic([20, 50, 20, 50]);
    g.fx.fireworks(t.x + 0.5, t.y + 4, t.z + 0.5);
    g.ents.mo.celebrate = 3; g.anim.play('celebrate', 2);
    g.kid.reward('quest', 2);
    g.ui.greatTreasure(gifts);
    g.checkQuests(); g.saveSoon();
  }

  /** standing on the X: a nudge to dig */
  update() {
    if (!this.complete || this.g.stats.greatTreasure || this.hintShown) return;
    const t = this.g.gen.treasure, p = this.g.player.pos;
    if (Math.hypot(t.x + 0.5 - p.x, t.z + 0.5 - p.z) < 3 && Math.abs(p.y - (t.y + 4)) < 3) {
      this.hintShown = true;
      this.g.ui.say(tr('Ini tanda X-nya! Gali ke bawah di tengah X — harta karun ada 3 balok di bawah ⛏️', 'This is the X! Dig straight down in the middle of the X — the treasure is 3 blocks below ⛏️'), 'alright', 7000);
    }
  }
  /** for the explorer's arrow */
  target(id: string) { if (id !== 'treasure' || !this.complete) return null; const t = this.g.gen.treasure; return { x: t.x, z: t.z, icon: '❌' }; }
  label() { return t2(['Peta harta', 'Treasure map']); }
}
