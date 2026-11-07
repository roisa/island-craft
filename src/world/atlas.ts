// Procedural, original pixel-art textures. Every tile is painted on a 16×16
// grid (scaled ×4 to 64px so letter glyphs stay crisp) and packed into a
// WebGL2 texture array — no atlas bleeding, proper mipmaps.
import * as THREE from 'three';
import { mulberry32 } from './noise';
import { BLOCKS, ITEMS, LETTERS, isBlockId } from './blocks';

export const TILE = 64;
const PX = TILE / 16;

type Ctx = CanvasRenderingContext2D;
type Painter = (g: Grid) => void;

class Grid {
  rnd: () => number;
  constructor(public x: Ctx, seed: number) { this.rnd = mulberry32(seed); }
  p(px: number, py: number, c: string) { this.x.fillStyle = c; this.x.fillRect(px * PX, py * PX, PX, PX); }
  rect(px: number, py: number, w: number, h: number, c: string) { this.x.fillStyle = c; this.x.fillRect(px * PX, py * PX, w * PX, h * PX); }
  fill(c: string) { this.rect(0, 0, 16, 16, c); }
  pick<T>(a: readonly T[]): T { return a[Math.floor(this.rnd() * a.length)]; }
  /** base colour + random speckles from palette */
  noise(base: string, pal: string[], density = 0.45) {
    this.fill(base);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (this.rnd() < density) this.p(x, y, this.pick(pal));
  }
  clear() { this.x.clearRect(0, 0, TILE, TILE); }
}

function hashStr(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

const GRASS = ['#6CBF4F', '#7FD05E', '#5CA842', '#84D967', '#66B84A'];
const DIRT = ['#8A5D3A', '#A97A50', '#7C5231', '#9A6B44'];
const STONE = ['#7E858C', '#9DA4AB', '#767D84', '#8D949B'];

function ore(g: Grid, colors: string[]) {
  g.noise('#8D949B', STONE, 0.4);
  for (let i = 0; i < 6; i++) {
    const cx = 2 + Math.floor(g.rnd() * 12), cy = 2 + Math.floor(g.rnd() * 12);
    g.p(cx, cy, colors[0]); g.p(cx + 1, cy, colors[1]); g.p(cx, cy + 1, colors[1]); if (g.rnd() < 0.6) g.p(cx + 1, cy + 1, colors[2] ?? colors[0]);
  }
}
function log(g: Grid, bark: string[], dark: string) {
  g.noise(bark[0], bark, 0.5);
  for (let x = 0; x < 16; x += 3 + Math.floor(g.rnd() * 2)) for (let y = 0; y < 16; y++) if (g.rnd() < 0.7) g.p(x, y, dark);
}
function rings(g: Grid, inner: string, ring: string, bark: string) {
  g.fill(bark);
  g.rect(1, 1, 14, 14, inner);
  for (const r of [5, 3]) { for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.p(Math.round(7.5 + Math.cos(a) * r), Math.round(7.5 + Math.sin(a) * r), ring); } }
}
function leaves(g: Grid, pal: string[], holes = 0.12) {
  g.clear();
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (g.rnd() > holes) g.p(x, y, g.pick(pal));
}
function wool(g: Grid, c: string, d: string) {
  g.noise(c, [d, c, c], 0.35);
  for (let y = 1; y < 16; y += 4) for (let x = 0; x < 16; x++) if ((x + y) % 3 === 0) g.p(x, y, d);
}
function coral(g: Grid, pal: string[], tip: string) {
  g.noise(pal[0], pal, 0.5);
  for (let i = 0; i < 14; i++) { const x = Math.floor(g.rnd() * 15), y = Math.floor(g.rnd() * 15); g.p(x, y, tip); g.p(x + 1, y, pal[2]); }
  for (let i = 0; i < 5; i++) { const x = Math.floor(g.rnd() * 14), y = Math.floor(g.rnd() * 14); g.rect(x, y, 2, 2, pal[2]); }
}
function flower(g: Grid, petal: string, center: string) {
  g.clear();
  for (let y = 8; y < 16; y++) g.p(7, y, '#3F8A46');
  g.p(6, 12, '#4FA356'); g.p(5, 11, '#4FA356'); g.p(8, 13, '#4FA356'); g.p(9, 12, '#4FA356');
  for (const [dx, dy] of [[0, -2], [2, 0], [0, 2], [-2, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]]) g.p(7 + dx, 6 + dy, petal);
  g.p(7, 6, center);
}
function tool(g: Grid, head: string, headDark: string, kind: 'pick' | 'axe' | 'shovel') {
  g.clear();
  for (let i = 0; i < 11; i++) g.p(3 + i, 13 - i, i % 2 ? '#7B5131' : '#96683F'); // handle diagonal
  if (kind === 'pick') {
    for (const [x, y] of [[4, 2], [5, 2], [6, 2], [7, 2], [8, 3], [9, 3], [10, 3], [11, 4], [12, 5], [12, 6], [13, 7], [13, 8], [3, 3], [2, 4]]) g.p(x, y, head);
    for (const [x, y] of [[9, 4], [10, 4], [11, 5], [11, 6], [12, 7]]) g.p(x, y, headDark);
  } else if (kind === 'axe') {
    for (let y = 1; y < 7; y++) for (let x = 9; x < 14; x++) if (x - 9 + Math.abs(y - 4) < 5) g.p(x, y, y > 4 ? headDark : head);
  } else {
    for (let y = 1; y < 6; y++) for (let x = 10; x < 15; x++) if (Math.abs(x - 12) + Math.abs(y - 3) < 3) g.p(x, y, head);
    g.p(12, 5, headDark); g.p(11, 4, headDark);
  }
}

const P: Record<string, Painter> = {
  grass_top: g => g.noise('#6CBF4F', GRASS, 0.55),
  grass_side: g => { g.noise('#9A6B44', DIRT, 0.4); g.rect(0, 0, 16, 4, '#6CBF4F'); for (let x = 0; x < 16; x++) { const d = Math.floor(g.rnd() * 3); for (let y = 4; y < 4 + d; y++) g.p(x, y, '#5CA842'); if (g.rnd() < 0.4) g.p(x, 1, '#84D967'); } },
  dirt: g => g.noise('#9A6B44', DIRT, 0.5),
  stone: g => { g.noise('#8D949B', STONE, 0.45); for (let i = 0; i < 3; i++) { let x = Math.floor(g.rnd() * 16), y = Math.floor(g.rnd() * 16); for (let k = 0; k < 4; k++) { g.p(x, y, '#6E757C'); x = (x + 1) % 16; y = (y + (g.rnd() < 0.5 ? 1 : 0)) % 16; } } },
  cobble: g => { g.fill('#5E656C'); for (let i = 0; i < 9; i++) { const x = Math.floor(g.rnd() * 13), y = Math.floor(g.rnd() * 13), w = 3 + Math.floor(g.rnd() * 3), h = 3 + Math.floor(g.rnd() * 2); g.rect(x, y, w, h, g.pick(['#8D949B', '#9DA4AB', '#7E858C'])); g.rect(x, y, w, 1, '#AEB5BC'); } },
  sand: g => g.noise('#E6D3A2', ['#DCC793', '#EFDDB0', '#D8C08A'], 0.45),
  sandstone_top: g => { g.noise('#E3CC92', ['#DCC58E', '#EAD7A6'], 0.35); g.rect(0, 0, 16, 1, '#CDB57C'); g.rect(0, 15, 16, 1, '#CDB57C'); },
  sandstone_side: g => { g.noise('#E3CC92', ['#DCC58E', '#EAD7A6'], 0.3); g.rect(0, 4, 16, 1, '#CDB57C'); g.rect(0, 10, 16, 1, '#CDB57C'); g.rect(0, 15, 16, 1, '#C2A970'); },
  gravel: g => { g.fill('#8A8580'); for (let i = 0; i < 40; i++) { const x = Math.floor(g.rnd() * 15), y = Math.floor(g.rnd() * 15); const c = g.pick(['#A8A39E', '#6F6A66', '#B9B4AE', '#7D7873']); g.p(x, y, c); g.p(x + 1, y, c); } },
  snow: g => g.noise('#F4F8FF', ['#E6EEF9', '#FFFFFF', '#DCE6F5'], 0.35),
  snow_side: g => { g.noise('#9A6B44', DIRT, 0.4); g.rect(0, 0, 16, 4, '#F4F8FF'); for (let x = 0; x < 16; x++) if (g.rnd() < 0.5) g.p(x, 4, '#E6EEF9'); },
  ice: g => { g.fill('rgba(168,216,240,0.78)'); for (let i = 0; i < 6; i++) { const x = Math.floor(g.rnd() * 12), y = Math.floor(g.rnd() * 14); for (let k = 0; k < 4; k++) g.p(x + k, y + (k >> 1), 'rgba(255,255,255,0.7)'); } },
  water: g => { g.fill('#3B9FD1'); for (let i = 0; i < 18; i++) { const x = Math.floor(g.rnd() * 14), y = Math.floor(g.rnd() * 16); g.p(x, y, '#5DC3E0'); g.p(x + 1, y, '#5DC3E0'); } for (let i = 0; i < 6; i++) g.p(Math.floor(g.rnd() * 16), Math.floor(g.rnd() * 16), '#BDEBFA'); },
  bedrock: g => g.noise('#3A3A3A', ['#222', '#555', '#2D2D2D', '#666'], 0.7),
  clay: g => g.noise('#A9B3C4', ['#9AA4B5', '#B6BFCE'], 0.4),
  oak_log: g => log(g, ['#8A5C38', '#7B5131', '#96683F'], '#5E3E25'),
  oak_top: g => rings(g, '#C49A62', '#A8804F', '#7B5131'),
  oak_leaves: g => leaves(g, ['#4F9E48', '#5FB055', '#438A3D', '#68BB5D']),
  pine_log: g => log(g, ['#5E4129', '#4E3522', '#6B4A30'], '#3B2818'),
  pine_top: g => rings(g, '#B08A5A', '#8E6C43', '#4E3522'),
  pine_leaves: g => leaves(g, ['#2F6B45', '#3A7D52', '#255A39', '#447F57'], 0.08),
  palm_log: g => { g.fill('#A98457'); for (let y = 0; y < 16; y += 3) { g.rect(0, y, 16, 1, '#8C6A40'); for (let x = 0; x < 16; x += 2) if (g.rnd() < 0.5) g.p(x, y + 1, '#BF9A6A'); } },
  palm_top: g => rings(g, '#D2B07C', '#B08F5E', '#8C6A40'),
  palm_leaves: g => { leaves(g, ['#6AA84F', '#7DBB5E', '#5A9442', '#89C46A'], 0.18); for (let i = 0; i < 4; i++) { const x = 2 + Math.floor(g.rnd() * 12), y = 2 + Math.floor(g.rnd() * 12); g.p(x, y, '#8B4A1F'); g.p(x + 1, y, '#A0582A'); g.p(x, y + 1, '#6E3A18'); } },
  planks: g => { g.noise('#C49A62', ['#B98E57', '#CFA66D'], 0.3); for (let y = 3; y < 16; y += 4) g.rect(0, y, 16, 1, '#8F6A3E'); for (let r = 0; r < 4; r++) g.p((r * 7 + 3) % 16, r * 4 + 1, '#8F6A3E'); },
  glass: g => { g.clear(); g.x.strokeStyle = '#E8F7FF'; g.x.lineWidth = PX; g.x.strokeRect(PX / 2, PX / 2, TILE - PX, TILE - PX); g.p(3, 3, '#FFFFFF'); g.p(4, 4, '#FFFFFF'); g.p(5, 5, 'rgba(255,255,255,.7)'); g.p(11, 3, 'rgba(255,255,255,.6)'); g.x.fillStyle = 'rgba(200,235,255,0.18)'; g.x.fillRect(PX, PX, TILE - 2 * PX, TILE - 2 * PX); },
  brick: g => { g.fill('#D9D2C5'); for (let row = 0; row < 4; row++) { const off = row % 2 ? 4 : 0; for (let c = -1; c < 3; c++) g.rect(c * 8 + off + 0, row * 4, 7, 3, g.pick(['#B5553C', '#A84B34', '#C0603F'])); } },
  marble: g => { g.noise('#F2EFE8', ['#E9E5DC', '#FAF8F3'], 0.3); for (let i = 0; i < 2; i++) { let x = Math.floor(g.rnd() * 16), y = 0; while (y < 16) { g.p(x, y, '#D9D3C7'); y++; x = (x + (g.rnd() < 0.5 ? 1 : 15)) % 16; } } },
  mosaic: g => { g.fill('#1F8C84'); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.abs(x - 7.5) + Math.abs(y - 7.5); if (d < 3) g.p(x, y, '#F4C430'); else if (d > 5.5 && d < 7) g.p(x, y, '#F2EFE8'); else if ((x + y) % 4 === 0) g.p(x, y, '#2AA198'); } g.rect(0, 0, 16, 1, '#176A64'); g.rect(0, 0, 1, 16, '#176A64'); },
  gold_tile: g => { g.noise('#F1C232', ['#E5B020', '#FFD966', '#F7CB45'], 0.4); for (let y = 0; y < 16; y += 4) g.rect(0, y, 16, 1, '#C99A12'); g.p(3, 2, '#FFF2B3'); g.p(11, 10, '#FFF2B3'); },
  coal_ore: g => ore(g, ['#2B2B2B', '#3F3F3F', '#1A1A1A']),
  iron_ore: g => ore(g, ['#D8A47F', '#E8BC97', '#B98563']),
  gold_ore: g => ore(g, ['#F1C232', '#FFE07A', '#D4A017']),
  crystal_ore: g => { ore(g, ['#8BE9FD', '#C4F5FF', '#5BC8E8']); g.p(7, 7, '#FFFFFF'); },
  cactus_side: g => { g.noise('#4C8C3A', ['#5A9E46', '#3F7A30'], 0.3); for (let x = 1; x < 16; x += 4) for (let y = 0; y < 16; y++) g.p(x, y, '#3F7A30'); for (let i = 0; i < 6; i++) g.p(Math.floor(g.rnd() * 16), Math.floor(g.rnd() * 16), '#F2EFD0'); },
  cactus_top: g => { g.noise('#5A9E46', ['#4C8C3A', '#6BB255'], 0.3); g.rect(6, 6, 4, 4, '#7CC466'); },
  bench_top: g => { P.planks(g); g.rect(1, 1, 14, 14, '#B98E57'); g.rect(2, 2, 5, 5, '#8F6A3E'); g.rect(9, 9, 5, 5, '#8F6A3E'); g.rect(9, 2, 5, 1, '#7E858C'); },
  bench_side: g => { P.planks(g); g.rect(0, 0, 16, 3, '#8F6A3E'); g.rect(3, 5, 3, 6, '#7E858C'); g.rect(9, 6, 5, 2, '#5E3E25'); g.rect(10, 8, 2, 4, '#5E3E25'); },
  furnace_side: g => { P.cobble(g); },
  furnace_top: g => { g.noise('#7E858C', STONE, 0.4); g.rect(0, 0, 16, 1, '#5E656C'); },
  furnace_front: g => { P.cobble(g); g.rect(4, 7, 8, 6, '#2B2B2B'); g.rect(5, 10, 6, 3, '#F2872E'); g.rect(6, 11, 4, 2, '#FFD766'); g.rect(4, 3, 8, 2, '#5E656C'); },
  lantern: g => { g.clear(); g.rect(3, 0, 10, 2, '#9B6818'); g.rect(2, 2, 12, 12, '#9B6818'); g.rect(3, 3, 10, 10, '#FFD766'); g.rect(5, 4, 6, 8, '#FFF2B3'); for (let y = 3; y < 13; y += 3) g.rect(3, y, 10, 1, '#C78A1E'); g.rect(7, 3, 2, 10, '#C78A1E'); g.rect(3, 14, 10, 2, '#9B6818'); },
  lantern_top: g => { g.fill('#9B6818'); g.rect(5, 5, 6, 6, '#E0B84D'); g.rect(7, 7, 2, 2, '#FFF2B3'); },
  torch: g => { g.clear(); g.rect(7, 6, 2, 10, '#8A5C38'); g.rect(6, 3, 4, 3, '#FFB347'); g.rect(7, 2, 2, 2, '#FFE07A'); g.p(7, 1, '#FFF2B3'); },
  flower_red: g => flower(g, '#E4423A', '#FFD65C'),
  flower_yellow: g => flower(g, '#F4C430', '#FF9F1C'),
  flower_blue: g => flower(g, '#4C8DFF', '#FFFFFF'),
  flower_purple: g => flower(g, '#A66BD3', '#FFE6FF'),
  tall_grass: g => { g.clear(); for (let i = 0; i < 9; i++) { const x = 1 + Math.floor(g.rnd() * 14), h = 5 + Math.floor(g.rnd() * 9); for (let y = 16 - h; y < 16; y++) g.p(x + ((16 - y) > h * 0.7 && i % 2 ? 1 : 0), y, g.pick(GRASS)); } },
  dead_bush: g => { g.clear(); const br = [[7, 15], [7, 14], [7, 13], [6, 12], [5, 11], [4, 10], [8, 12], [9, 11], [10, 10], [11, 9], [7, 11], [7, 10], [8, 9], [3, 9], [6, 9], [9, 8]]; for (const [x, y] of br) g.p(x, y, '#9A7B4F'); },
  sapling: g => { g.clear(); for (let y = 9; y < 16; y++) g.p(7, y, '#7B5131'); for (const [x, y] of [[6, 8], [7, 7], [8, 8], [5, 7], [9, 7], [6, 6], [8, 6], [7, 5], [4, 8], [10, 8], [7, 8]]) g.p(x, y, g.pick(['#4F9E48', '#5FB055'])); },
  pine_sapling: g => { g.clear(); for (let y = 10; y < 16; y++) g.p(7, y, '#4E3522'); for (let r = 0; r < 4; r++) for (let x = 7 - r; x <= 7 + r; x++) g.p(x, 4 + r * 2, '#2F6B45'); },
  palm_sapling: g => { g.clear(); for (let y = 8; y < 16; y++) g.p(7, y, '#A98457'); for (const [x, y] of [[4, 7], [5, 6], [6, 7], [8, 7], [9, 6], [10, 7], [3, 8], [11, 8], [7, 5], [7, 4]]) g.p(x, y, '#6AA84F'); },
  bed_top: g => { g.fill('#E4423A'); g.rect(0, 0, 16, 5, '#F2F2F2'); g.rect(2, 1, 12, 3, '#FFFFFF'); for (let y = 6; y < 16; y += 3) g.rect(0, y, 16, 1, '#C7362F'); },
  bed_side: g => { g.fill('#C49A62'); g.rect(0, 2, 16, 6, '#E4423A'); g.rect(0, 2, 4, 6, '#F2F2F2'); g.rect(0, 13, 2, 3, '#8F6A3E'); g.rect(14, 13, 2, 3, '#8F6A3E'); },
  bookshelf: g => { P.planks(g); for (const y of [1, 9]) { g.rect(1, y, 14, 6, '#5E3E25'); for (let x = 1; x < 15; x += 2) g.rect(x, y + (g.rnd() < 0.3 ? 1 : 0), 2, 6 - (g.rnd() < 0.3 ? 1 : 0), g.pick(['#E4423A', '#2E6FE0', '#3FA34D', '#F4C430', '#9B59B6', '#1F8C84'])); } },
  wool_white: g => wool(g, '#F2F2F2', '#DADADA'),
  wool_red: g => wool(g, '#E4423A', '#C7362F'),
  wool_yellow: g => wool(g, '#F4C430', '#D9A91B'),
  wool_blue: g => wool(g, '#2E6FE0', '#2458B8'),
  wool_purple: g => wool(g, '#9B59B6', '#7E4396'),
  wool_green: g => wool(g, '#3FA34D', '#2F8A3C'),
  bedug_side: g => { g.fill('#8A4F2A'); for (let x = 0; x < 16; x += 3) g.rect(x, 0, 1, 16, '#6E3C1E'); g.rect(0, 1, 16, 2, '#C9A227'); g.rect(0, 13, 16, 2, '#C9A227'); for (let x = 1; x < 16; x += 3) { g.p(x, 2, '#5E3E25'); g.p(x, 14, '#5E3E25'); } },
  bedug_face: g => { g.fill('#8A4F2A'); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7.5); if (d < 6.6) g.p(x, y, d < 2 ? '#D8BC8A' : '#EAD3A4'); else if (d < 7.6) g.p(x, y, '#C9A227'); } },
  chest_side: g => { g.fill('#A9743F'); for (let y = 0; y < 16; y += 4) g.rect(0, y, 16, 1, '#7A5129'); g.rect(0, 5, 16, 2, '#F1C232'); g.rect(0, 0, 1, 16, '#F1C232'); g.rect(15, 0, 1, 16, '#F1C232'); },
  chest_front: g => { P.chest_side(g); g.rect(6, 5, 4, 5, '#F1C232'); g.rect(7, 7, 2, 2, '#5E3E25'); },
  chest_top: g => { g.fill('#B98250'); for (let x = 0; x < 16; x += 4) g.rect(x, 0, 1, 16, '#8C5E33'); g.rect(0, 0, 16, 1, '#F1C232'); g.rect(0, 15, 16, 1, '#F1C232'); g.rect(0, 0, 1, 16, '#F1C232'); g.rect(15, 0, 1, 16, '#F1C232'); },
  // items (UI icons only)
  coral_pink: g => coral(g, ['#FF7AA8', '#FF9CC0', '#E85C8E'], '#FFD1E2'),
  coral_orange: g => coral(g, ['#FF9A3C', '#FFB466', '#E07A22'], '#FFE0B8'),
  coral_purple: g => coral(g, ['#A66BD3', '#BE8BE6', '#8A4FB8'], '#E8D4F7'),
  sea_grass: g => { g.clear(); for (let i = 0; i < 7; i++) { let x = 2 + i * 2 + Math.floor(g.rnd() * 2); const h = 7 + Math.floor(g.rnd() * 8); for (let k = 0; k < h; k++) { g.p(x, 15 - k, g.pick(['#3FA36B', '#4DBA7A', '#2F8A55'])); if (k % 3 === 2) x += g.rnd() < 0.5 ? 1 : -1; x = Math.max(0, Math.min(15, x)); } } },
  coral_fan: g => { g.clear(); for (let y = 11; y < 16; y++) g.p(7, y, '#C24A72'); for (let r = 1; r < 8; r++) for (let a = -6; a <= 6; a++) { const t = a / 6 * 1.1; const x = Math.round(7.5 + Math.sin(t) * r), y = Math.round(11 - Math.cos(t) * r); if (g.rnd() < 0.75) g.p(x, y, r % 2 ? '#FF6F91' : '#FF9CB5'); } },
  clam_top: g => { g.noise('#E6D3A2', ['#DCC793', '#EFDDB0'], 0.4); for (let y = 4; y < 13; y++) for (let x = 3; x < 13; x++) if (Math.hypot(x - 7.5, y - 8.5) < 5) g.p(x, y, (x + y) % 3 ? '#C9A9DC' : '#E7D6F2'); g.rect(3, 8, 10, 1, '#8D6BA6'); g.p(7, 7, '#FFFFFF'); g.p(8, 7, '#F2EEF8'); },
  clam_side: g => { g.noise('#E6D3A2', ['#DCC793', '#EFDDB0'], 0.4); g.rect(3, 0, 10, 4, '#C9A9DC'); g.rect(3, 4, 10, 1, '#8D6BA6'); for (let x = 3; x < 13; x += 2) g.p(x, 1, '#E7D6F2'); },
  telescope: g => { g.clear(); for (let i = 0; i < 10; i++) g.rect(3 + i, 8 - Math.floor(i * 0.6), 3, 3, i < 2 ? '#2E4A7A' : i > 7 ? '#E0B84D' : '#3D5F99'); g.rect(12, 2, 3, 3, '#F1C232'); g.p(13, 3, '#BDEBFA'); for (let y = 10; y < 16; y++) { g.p(8 - Math.floor((y - 10) / 2), y, '#8C5E33'); g.p(8 + Math.floor((y - 10) / 2), y, '#8C5E33'); g.p(8, y, '#6E4A2A'); } },
  i_stick: g => { g.clear(); for (let i = 0; i < 11; i++) g.p(3 + i, 13 - i, i % 2 ? '#7B5131' : '#96683F'); },
  i_pick_wood: g => tool(g, '#C49A62', '#8F6A3E', 'pick'),
  i_pick_stone: g => tool(g, '#9DA4AB', '#6E757C', 'pick'),
  i_pick_iron: g => tool(g, '#E8E8F0', '#B0B4C0', 'pick'),
  i_axe_wood: g => tool(g, '#C49A62', '#8F6A3E', 'axe'),
  i_axe_stone: g => tool(g, '#9DA4AB', '#6E757C', 'axe'),
  i_axe_iron: g => tool(g, '#E8E8F0', '#B0B4C0', 'axe'),
  i_shovel_wood: g => tool(g, '#C49A62', '#8F6A3E', 'shovel'),
  i_shovel_stone: g => tool(g, '#9DA4AB', '#6E757C', 'shovel'),
  i_shovel_iron: g => tool(g, '#E8E8F0', '#B0B4C0', 'shovel'),
  i_coal: g => { g.clear(); for (let y = 4; y < 13; y++) for (let x = 4; x < 13; x++) if (Math.hypot(x - 8, y - 8) < 4.6) g.p(x, y, g.pick(['#2B2B2B', '#3F3F3F', '#1A1A1A'])); g.p(6, 6, '#666'); },
  i_iron: g => { g.clear(); g.rect(3, 6, 10, 5, '#D5D8E0'); g.rect(4, 5, 8, 1, '#F2F3F7'); g.rect(3, 10, 10, 1, '#9EA3AF'); },
  i_gold: g => { g.clear(); g.rect(3, 6, 10, 5, '#F1C232'); g.rect(4, 5, 8, 1, '#FFE07A'); g.rect(3, 10, 10, 1, '#C99A12'); },
  i_crystal: g => { g.clear(); for (let y = 2; y < 14; y++) { const w = y < 6 ? y - 1 : (14 - y) / 2 + 1; for (let x = Math.round(8 - w); x <= Math.round(8 + w); x++) g.p(x, y, x < 8 ? '#8BE9FD' : '#5BC8E8'); } g.p(7, 4, '#fff'); },
  i_dates: g => { g.clear(); for (const [x, y] of [[5, 6], [9, 5], [7, 9], [11, 9], [4, 10], [8, 12]]) { g.rect(x, y, 3, 4, '#8B4A1F'); g.p(x, y, '#B0652F'); g.p(x + 2, y + 3, '#5E2F12'); } g.p(8, 3, '#6AA84F'); g.p(9, 2, '#6AA84F'); },
  i_milk: g => { g.clear(); g.rect(5, 4, 6, 10, '#FFFFFF'); g.rect(6, 2, 4, 2, '#DDE7F2'); g.rect(5, 8, 6, 3, '#4C8DFF'); g.rect(5, 13, 6, 1, '#C9D6E6'); },
  i_egg: g => { g.clear(); for (let y = 3; y < 14; y++) for (let x = 3; x < 13; x++) if (((x - 8) / 4.2) ** 2 + ((y - 8.5) / 5.2) ** 2 < 1) g.p(x, y, '#FFF4E0'); g.p(6, 6, '#FFFFFF'); },
  i_apple: g => { g.clear(); for (let y = 4; y < 14; y++) for (let x = 3; x < 13; x++) if (Math.hypot(x - 8, y - 9) < 5) g.p(x, y, '#E4423A'); g.p(8, 3, '#7B5131'); g.p(9, 2, '#4F9E48'); g.p(6, 6, '#FF9A8F'); },
  i_takjil: g => { g.clear(); g.rect(1, 11, 14, 2, '#F2EFE8'); g.rect(2, 13, 12, 1, '#C9C3B5'); for (const x of [3, 6, 9]) { g.rect(x, 8, 2, 3, '#8B4A1F'); } g.rect(11, 4, 3, 7, '#FFFFFF'); g.rect(11, 6, 3, 2, '#4C8DFF'); },
  i_sword_wood: g => { g.clear(); for (let i = 0; i < 9; i++) { g.rect(6 + i, 9 - i, 2, 2, '#C99158'); g.p(7 + i, 9 - i, '#E0B884'); } g.rect(3, 10, 6, 2, '#8C5E33'); g.rect(5, 8, 2, 6, '#8C5E33'); g.rect(2, 12, 3, 3, '#5E3B1A'); },
  i_sword_stone: g => { g.clear(); for (let i = 0; i < 9; i++) { g.rect(6 + i, 9 - i, 2, 2, '#9A9A9A'); g.p(7 + i, 9 - i, '#C8C8C8'); } g.rect(3, 10, 6, 2, '#8C5E33'); g.rect(5, 8, 2, 6, '#8C5E33'); g.rect(2, 12, 3, 3, '#5E3B1A'); },
  i_sword_iron: g => { g.clear(); for (let i = 0; i < 9; i++) { g.rect(6 + i, 9 - i, 2, 2, '#D8E0E8'); g.p(7 + i, 9 - i, '#FFFFFF'); } g.rect(3, 10, 6, 2, '#8C5E33'); g.rect(5, 8, 2, 6, '#8C5E33'); g.rect(2, 12, 3, 3, '#5E3B1A'); },
  i_rod: g => { g.clear(); for (let i = 0; i < 12; i++) g.rect(2 + i, 13 - i, 2, 1, '#8C5E33'); g.rect(13, 1, 1, 9, '#E8E8E8'); g.rect(12, 10, 3, 2, '#E4423A'); g.rect(3, 11, 3, 3, '#5E3B1A'); },
  i_fish_small: g => { g.clear(); g.rect(3, 6, 8, 4, '#5BA8D8'); g.rect(4, 5, 6, 1, '#7CC0E8'); g.rect(4, 10, 6, 1, '#3E86B8'); g.rect(11, 5, 2, 2, '#5BA8D8'); g.rect(11, 9, 2, 2, '#5BA8D8'); g.rect(12, 7, 2, 2, '#3E86B8'); g.p(5, 7, '#111'); },
  i_fish_big: g => { g.clear(); g.rect(1, 5, 11, 6, '#3FA36B'); g.rect(2, 4, 9, 1, '#62C48C'); g.rect(2, 11, 9, 1, '#2C7A50'); g.rect(12, 3, 3, 3, '#3FA36B'); g.rect(12, 10, 3, 3, '#3FA36B'); g.rect(13, 6, 2, 4, '#2C7A50'); g.rect(3, 6, 1, 1, '#111'); g.rect(6, 4, 3, 1, '#2C7A50'); },
  i_fish_gold: g => { g.clear(); g.rect(2, 5, 10, 6, '#F2C43A'); g.rect(3, 4, 8, 1, '#FFE27A'); g.rect(3, 11, 8, 1, '#C98A12'); g.rect(12, 4, 3, 3, '#F2C43A'); g.rect(12, 9, 3, 3, '#F2C43A'); g.rect(13, 7, 2, 2, '#C98A12'); g.p(4, 6, '#111'); g.p(8, 7, '#FFF6C8'); g.p(1, 2, '#FFF6C8'); g.p(14, 13, '#FFF6C8'); },
  i_meat: g => { g.clear(); g.rect(3, 4, 9, 8, '#C8473F'); g.rect(4, 5, 7, 2, '#E06A5F'); g.rect(3, 11, 9, 1, '#9E322C'); g.rect(11, 6, 3, 3, '#F2EBD9'); g.rect(13, 5, 2, 2, '#F2EBD9'); g.rect(13, 8, 2, 2, '#F2EBD9'); },
  i_fish_grilled: g => { g.clear(); g.rect(1, 12, 14, 2, '#E8E8E8'); g.rect(3, 6, 8, 5, '#B5763A'); g.rect(4, 5, 6, 1, '#D49450'); g.rect(11, 5, 2, 2, '#B5763A'); g.rect(11, 9, 2, 2, '#B5763A'); for (const x of [4, 6, 8]) g.rect(x, 6, 1, 5, '#6E3F17'); g.p(4, 7, '#111'); },
  i_egg_fried: g => { g.clear(); g.rect(2, 4, 12, 8, '#F7F7F2'); g.rect(3, 3, 9, 1, '#F7F7F2'); g.rect(4, 12, 8, 1, '#F7F7F2'); g.rect(6, 6, 4, 4, '#F4B731'); g.p(7, 7, '#FFE27A'); },
  i_steak: g => { g.clear(); g.rect(1, 12, 14, 2, '#E8E8E8'); g.rect(2, 5, 11, 7, '#8B4A2B'); g.rect(3, 6, 9, 2, '#A85E38'); for (const x of [4, 7, 10]) g.rect(x, 5, 1, 7, '#5C2E18'); g.rect(12, 7, 2, 2, '#F2EBD9'); g.rect(8, 3, 2, 2, '#6CBF4F'); },
  i_prayer_mat: g => { g.clear(); g.rect(3, 1, 10, 14, '#D9B44A'); g.rect(4, 2, 8, 12, '#1F7A4D'); g.rect(6, 3, 4, 1, '#D9B44A'); g.rect(5, 4, 1, 3, '#D9B44A'); g.rect(10, 4, 1, 3, '#D9B44A'); g.rect(6, 9, 4, 3, '#2E9C64'); g.p(7, 10, '#D9B44A'); g.p(8, 10, '#D9B44A'); },
  i_table: g => { g.clear(); g.rect(1, 5, 14, 3, '#B07A43'); g.rect(1, 5, 14, 1, '#C99158'); g.rect(2, 8, 2, 7, '#8C5E33'); g.rect(12, 8, 2, 7, '#8C5E33'); },
  i_chair: g => { g.clear(); g.rect(4, 1, 2, 14, '#8C5E33'); g.rect(4, 2, 8, 2, '#B07A43'); g.rect(4, 8, 9, 2, '#C99158'); g.rect(11, 10, 2, 5, '#8C5E33'); g.rect(4, 10, 2, 5, '#8C5E33'); },
  i_cushion: g => { g.clear(); g.rect(2, 7, 12, 6, '#E4573A'); g.rect(2, 7, 12, 1, '#F07C5C'); g.rect(3, 13, 10, 1, '#B23A23'); g.p(8, 10, '#FFD874'); g.p(2, 6, '#FFD874'); g.p(13, 6, '#FFD874'); },
  i_plant_pot: g => { g.clear(); g.rect(4, 9, 8, 6, '#C1663A'); g.rect(3, 9, 10, 1, '#D97D4F'); g.rect(7, 4, 2, 5, '#3F8030'); g.rect(4, 3, 3, 3, '#6CBF4F'); g.rect(9, 2, 3, 3, '#6CBF4F'); g.rect(6, 1, 3, 3, '#4F9D3A'); },
  i_lamp: g => { g.clear(); g.rect(5, 1, 6, 4, '#FFD874'); g.rect(4, 4, 8, 1, '#E0A11A'); g.rect(7, 5, 2, 8, '#5C4632'); g.rect(5, 13, 6, 2, '#5C4632'); g.p(7, 2, '#FFF6C8'); },
  i_dates_bowl: g => { g.clear(); g.rect(2, 9, 12, 4, '#B07A43'); g.rect(4, 13, 8, 1, '#8C5E33'); for (const [x, y] of [[3, 7], [6, 6], [9, 7], [5, 8], [8, 8], [11, 8]]) { g.rect(x, y, 2, 2, '#8B4A1F'); g.p(x, y, '#B0652F'); } },
  i_ketupat: g => { g.clear(); g.rect(7, 0, 2, 4, '#3F8030'); for (let i = 0; i < 6; i++) { g.rect(8 - i, 4 + i, i * 2, 1, i % 2 ? '#6CBF4F' : '#D9C24A'); g.rect(8 - i, 15 - i, i * 2, 1, i % 2 ? '#6CBF4F' : '#D9C24A'); } g.rect(2, 9, 12, 1, '#6CBF4F'); },
  i_rug: g => { g.clear(); g.rect(1, 3, 14, 10, '#B23A48'); g.rect(2, 4, 12, 8, '#D45563'); g.rect(4, 6, 8, 4, '#F2C14E'); g.rect(6, 7, 4, 2, '#B23A48'); for (let x = 1; x < 15; x += 2) { g.p(x, 2, '#F2C14E'); g.p(x, 13, '#F2C14E'); } },
  i_book_stand: g => { g.clear(); for (let i = 0; i < 6; i++) { g.rect(2 + i, 4 + i, 2, 1, '#8C5E33'); g.rect(12 - i, 4 + i, 2, 1, '#8C5E33'); } g.rect(1, 2, 7, 3, '#1F7A4D'); g.rect(8, 2, 7, 3, '#1F7A4D'); g.rect(2, 3, 5, 1, '#F2EBD9'); g.rect(9, 3, 5, 1, '#F2EBD9'); },
  i_crescent: g => { g.clear(); g.rect(7, 9, 2, 6, '#5C4632'); g.rect(5, 14, 6, 1, '#5C4632'); for (const [x, y, w] of [[5, 1, 3], [3, 2, 2], [2, 3, 2], [2, 4, 2], [2, 5, 2], [3, 6, 2], [4, 7, 5]]) g.rect(x, y, w, 1, '#FFD874'); g.rect(10, 3, 2, 2, '#FFE9A0'); },
  i_boat: g => { g.clear(); g.rect(1, 9, 14, 3, '#A9743F'); g.rect(3, 12, 10, 2, '#8C5E33'); g.rect(1, 8, 2, 1, '#8C5E33'); g.rect(13, 8, 2, 1, '#8C5E33'); g.rect(7, 2, 1, 7, '#7B5131'); g.rect(8, 3, 4, 4, '#F2F2F2'); g.rect(8, 7, 3, 1, '#F2F2F2'); },
  i_pearl: g => { g.clear(); for (let y = 3; y < 14; y++) for (let x = 3; x < 14; x++) { const d = Math.hypot(x - 8, y - 8.5); if (d < 5) g.p(x, y, d < 2.2 ? '#FFFFFF' : d < 3.6 ? '#F2EEF8' : '#D8D0E8'); } g.p(6, 6, '#FFFFFF'); g.p(6, 7, '#FFFFFF'); g.p(10, 11, '#C9BEDD'); },
  i_ketupat_opor: g => { g.clear(); g.rect(1, 10, 14, 4, '#F2EFE8'); g.rect(2, 14, 12, 1, '#C9C3B5'); g.rect(2, 9, 12, 2, '#F2B33A'); g.rect(4, 8, 3, 2, '#E9D6A0'); g.rect(9, 8, 3, 2, '#E9D6A0'); for (let i = 0; i < 4; i++) { g.rect(11 - i, 1 + i, i * 2 + 1, 1, i % 2 ? '#6CBF4F' : '#D9C24A'); g.rect(11 - i, 7 - i, i * 2 + 1, 1, i % 2 ? '#6CBF4F' : '#D9C24A'); } },
  i_nastar: g => { g.clear(); g.rect(2, 9, 12, 5, '#E4423A'); g.rect(2, 8, 12, 1, '#FF6B5E'); for (const [x, y] of [[3, 4], [7, 3], [11, 4], [5, 6], [9, 6]]) { g.rect(x, y, 3, 3, '#F2B33A'); g.p(x + 1, y, '#C98A12'); g.p(x + 1, y + 1, '#E07A22'); } },
  i_angpao: g => { g.clear(); g.rect(2, 3, 12, 10, '#1F8A4C'); g.rect(2, 3, 12, 1, '#2FAE64'); for (let i = 0; i < 6; i++) { g.p(2 + i, 4 + i, '#17703C'); g.p(13 - i, 4 + i, '#17703C'); } g.rect(6, 8, 4, 3, '#F1C232'); g.p(7, 9, '#FFE07A'); g.p(8, 9, '#FFE07A'); },
  i_firework: g => { g.clear(); g.rect(6, 7, 4, 7, '#E4423A'); g.rect(6, 9, 4, 1, '#F4C430'); g.rect(6, 12, 4, 1, '#F4C430'); g.rect(7, 5, 2, 2, '#2E6FE0'); g.p(8, 4, '#8C5E33'); g.p(9, 3, '#8C5E33'); for (const [x, y, c] of [[11, 2, '#FFD874'], [13, 4, '#FF8FB1'], [4, 2, '#8FD3EC'], [2, 5, '#FFD874'], [12, 7, '#B388FF']] as [number, number, string][]) g.p(x, y, c); },
  i_kolak: g => { g.clear(); g.rect(2, 8, 12, 5, '#F4C430'); g.rect(2, 7, 12, 1, '#FFFFFF'); g.rect(3, 6, 10, 1, '#E4423A'); g.rect(7, 4, 2, 2, '#E4423A'); g.rect(2, 13, 12, 1, '#C78A1E'); },
};

function letterPainter(i: number): Painter {
  return g => {
    const x = g.x, s = TILE;
    const gr = x.createLinearGradient(0, 0, s, s); gr.addColorStop(0, '#FFF9E8'); gr.addColorStop(1, '#FBE7B8');
    x.fillStyle = gr; x.fillRect(0, 0, s, s);
    // name band at the bottom, kept separate from the glyph area
    const band = Math.round(s * 0.2);
    x.fillStyle = '#1FA971'; x.fillRect(0, s - band, s, band);
    x.strokeStyle = '#E0B84D'; x.lineWidth = s * 0.07; x.strokeRect(x.lineWidth / 2, x.lineWidth / 2, s - x.lineWidth, s - x.lineWidth);
    // fit the glyph inside the area above the band, using its real ink box
    const glyph = LETTERS[i].g;
    const m = s * 0.12, top = m, bottom = s - band - s * 0.05, availH = bottom - top, availW = s - 2 * m;
    let size = s * 0.8;
    x.font = `700 ${size}px "Scheherazade New","Noto Naskh Arabic","Amiri","Traditional Arabic",serif`;
    let mt = x.measureText(glyph);
    const h0 = mt.actualBoundingBoxAscent + mt.actualBoundingBoxDescent, w0 = mt.actualBoundingBoxLeft + mt.actualBoundingBoxRight;
    size *= Math.min(availH / h0, availW / w0);
    x.font = `700 ${size}px "Scheherazade New","Noto Naskh Arabic","Amiri","Traditional Arabic",serif`;
    mt = x.measureText(glyph);
    const h = mt.actualBoundingBoxAscent + mt.actualBoundingBoxDescent, w = mt.actualBoundingBoxLeft + mt.actualBoundingBoxRight;
    x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.direction = 'rtl';
    x.fillStyle = '#12261F';
    x.fillText(glyph, m + (availW - w) / 2 + mt.actualBoundingBoxLeft, top + (availH - h) / 2 + mt.actualBoundingBoxAscent);
    x.direction = 'ltr'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#FFFFFF'; x.font = `800 ${Math.round(band * 0.62)}px Nunito, system-ui, sans-serif`;
    x.fillText(LETTERS[i].name.toUpperCase(), s / 2, s - band / 2 - s * 0.02);
  };
}
for (let i = 0; i < LETTERS.length; i++) P['letter_' + i] = letterPainter(i);

// ------------------------------------------------------------------------
export const layerOf = new Map<string, number>();
const canvases = new Map<string, HTMLCanvasElement>();

function paint(name: string) {
  const c = document.createElement('canvas'); c.width = c.height = TILE;
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  const painter = P[name] ?? (g => g.fill('#ff00ff'));
  painter(new Grid(x, hashStr(name)));
  canvases.set(name, c);
  return c;
}

export function buildTextureArray(): THREE.DataArrayTexture {
  const names = Object.keys(P).filter(n => !n.startsWith('i_'));
  const data = new Uint8Array(TILE * TILE * 4 * names.length);
  names.forEach((n, i) => {
    layerOf.set(n, i);
    const img = paint(n).getContext('2d')!.getImageData(0, 0, TILE, TILE).data;
    // flip vertically so v=0 is the bottom of the tile
    for (let y = 0; y < TILE; y++) {
      const src = (TILE - 1 - y) * TILE * 4;
      data.set(img.subarray(src, src + TILE * 4), i * TILE * TILE * 4 + y * TILE * 4);
    }
  });
  const tex = new THREE.DataArrayTexture(data, TILE, TILE, names.length);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  for (const n of Object.keys(P)) if (n.startsWith('i_')) paint(n);
  return tex;
}

export const tileCanvas = (name: string) => canvases.get(name);

// ---- UI icons ----------------------------------------------------------
const iconCache = new Map<number, string>();
function shade(src: HTMLCanvasElement, k: number) {
  const c = document.createElement('canvas'); c.width = c.height = TILE;
  const x = c.getContext('2d')!; x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = `rgba(0,0,0,${k})`; x.fillRect(0, 0, TILE, TILE);
  return c;
}
export function iconURL(id: number): string {
  const hit = iconCache.get(id); if (hit) return hit;
  const S = 64;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d')!; x.imageSmoothingEnabled = false;
  if (isBlockId(id)) {
    const b = BLOCKS[id]!;
    if (b.render === 'cross') {
      x.drawImage(canvases.get(b.side)!, 0, 0, S, S);
    } else {
      const top = canvases.get(b.top)!, side = shade(canvases.get(b.front ?? b.side)!, 0.18), side2 = shade(canvases.get(b.side)!, 0.36);
      const h = S / 4, w = S / 2;
      // top face (rhombus)
      x.setTransform(w / TILE, h / TILE, -w / TILE, h / TILE, w, 0); x.drawImage(top, 0, 0);
      // left face
      x.setTransform(w / TILE, h / TILE, 0, (S / 2) / TILE, 0, h); x.drawImage(side, 0, 0);
      // right face
      x.setTransform(w / TILE, -h / TILE, 0, (S / 2) / TILE, w, 2 * h); x.drawImage(side2, 0, 0);
      x.setTransform(1, 0, 0, 1, 0, 0);
    }
  } else {
    const it = ITEMS.get(id);
    const src = it ? canvases.get(it.icon) : undefined;
    if (src) x.drawImage(src, 0, 0, S, S);
  }
  const url = c.toDataURL();
  iconCache.set(id, url);
  return url;
}
