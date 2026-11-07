// "Make my avatar from a photo": find a few main colours in a picture and
// guess which is hair, skin, shirt and trousers. Only the colours are kept;
// the photo itself never leaves the device and is not saved.
// Pure functions on RGBA pixel arrays (unit tested).

export interface Look { hair: number; skin: number; shirt: number; pants: number }
type RGB = [number, number, number];
const hex = ([r, g, b]: RGB) => (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);

/** a few main colours by k-means on a sample of pixels (deterministic start) */
export function mainColors(px: Uint8ClampedArray | number[], k = 5, iters = 8): { c: RGB; n: number }[] {
  const pts: RGB[] = [];
  const step = Math.max(1, Math.floor(px.length / 4 / 1500));
  for (let i = 0; i < px.length; i += 4 * step) if ((px[i + 3] ?? 255) > 128) pts.push([px[i], px[i + 1], px[i + 2]]);
  if (!pts.length) return [];
  // start from evenly spread picks by brightness
  const sorted = [...pts].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  let cs: RGB[] = Array.from({ length: Math.min(k, sorted.length) }, (_, i) => [...sorted[Math.floor((i + 0.5) * sorted.length / k)]] as RGB);
  let counts: number[] = [];
  for (let it = 0; it < iters; it++) {
    const sum = cs.map(() => [0, 0, 0]); counts = cs.map(() => 0);
    for (const p of pts) {
      let best = 0, bd = Infinity;
      cs.forEach((c, j) => { const d = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2; if (d < bd) { bd = d; best = j; } });
      sum[best][0] += p[0]; sum[best][1] += p[1]; sum[best][2] += p[2]; counts[best]++;
    }
    cs = cs.map((c, j) => (counts[j] ? [sum[j][0] / counts[j], sum[j][1] / counts[j], sum[j][2] / counts[j]] : c) as RGB);
  }
  return cs.map((c, j) => ({ c, n: counts[j] })).filter(x => x.n > 0).sort((a, b) => b.n - a.n);
}

/** how much a colour looks like skin (0..1) */
export function skinness([r, g, b]: RGB) {
  if (!(r > g && g > b)) return 0;
  const sat = (r - b) / Math.max(1, r);
  const light = (r + g + b) / 3;
  return Math.max(0, 1 - Math.abs(sat - 0.35) * 2.2) * (light > 50 && light < 235 ? 1 : 0.2);
}

/** the average colour of a region of the picture (fractions of width/height) */
export function regionColor(px: Uint8ClampedArray | number[], w: number, h: number, x0: number, y0: number, x1: number, y1: number): RGB {
  const top = mainColors(sliceRegion(px, w, h, x0, y0, x1, y1), 3)[0];
  return top ? top.c : [128, 128, 128];
}
function sliceRegion(px: Uint8ClampedArray | number[], w: number, h: number, x0: number, y0: number, x1: number, y1: number) {
  const out: number[] = [];
  const X0 = Math.floor(x0 * w), X1 = Math.ceil(x1 * w), Y0 = Math.floor(y0 * h), Y1 = Math.ceil(y1 * h);
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) { const i = (y * w + x) * 4; out.push(px[i], px[i + 1], px[i + 2], px[i + 3] ?? 255); }
  return out;
}

/**
 * Guess a look from a picture of a person: hair from the top, skin from the
 * most skin-like main colour (or the face area), shirt from the middle,
 * trousers from the bottom. Everything can be changed afterwards.
 */
export function guessLook(px: Uint8ClampedArray | number[], w: number, h: number): Look {
  const main = mainColors(px, 6);
  const skinC = [...main].sort((a, b) => skinness(b.c) * Math.sqrt(b.n) - skinness(a.c) * Math.sqrt(a.n))[0];
  const skin: RGB = skinC && skinness(skinC.c) > 0.25 ? skinC.c : regionColor(px, w, h, 0.35, 0.2, 0.65, 0.4);
  const hair = regionColor(px, w, h, 0.3, 0.0, 0.7, 0.12);
  const shirt = regionColor(px, w, h, 0.2, 0.55, 0.8, 0.75);
  const pants = regionColor(px, w, h, 0.25, 0.85, 0.75, 1.0);
  return { hair: hex(hair), skin: hex(skin), shirt: hex(shirt), pants: hex(pants) };
}
export const toCss = (n: number) => '#' + n.toString(16).padStart(6, '0');
