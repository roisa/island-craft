import { describe, it, expect } from 'vitest';
import { mainColors, guessLook, skinness } from '../../src/game/photo';

/** a simple "person" picture: dark hair on top, skin face, red shirt, blue trousers */
function person(w = 40, h = 80) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const f = y / h; let c = [235, 235, 235];
    if (f < 0.12 && x > w * 0.25 && x < w * 0.75) c = [40, 28, 20];
    else if (f < 0.42 && x > w * 0.3 && x < w * 0.7) c = [228, 180, 140];
    else if (f > 0.5 && f < 0.8 && x > w * 0.15 && x < w * 0.85) c = [210, 40, 50];
    else if (f >= 0.82 && x > w * 0.2 && x < w * 0.8) c = [40, 60, 160];
    const i = (y * w + x) * 4; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
  }
  return { px, w, h };
}
const rgb = (n: number) => [n >> 16 & 255, n >> 8 & 255, n & 255];
const near = (a: number[], b: number[], tol = 40) => a.every((v, i) => Math.abs(v - b[i]) < tol);

describe('avatar from a photo', () => {
  it('finds the main colours', () => {
    const { px } = person();
    const cs = mainColors(px, 5).map(x => x.c.map(Math.round));
    expect(cs.some(c => near(c, [210, 40, 50]))).toBe(true);
    expect(cs.some(c => near(c, [228, 180, 140]))).toBe(true);
  });
  it('guesses hair, skin, shirt and trousers', () => {
    const { px, w, h } = person();
    const look = guessLook(px, w, h);
    expect(near(rgb(look.hair), [40, 28, 20])).toBe(true);
    expect(near(rgb(look.skin), [228, 180, 140])).toBe(true);
    expect(near(rgb(look.shirt), [210, 40, 50])).toBe(true);
    expect(near(rgb(look.pants), [40, 60, 160])).toBe(true);
  });
  it('knows skin-like colours from others', () => {
    expect(skinness([228, 180, 140])).toBeGreaterThan(skinness([40, 60, 160]));
    expect(skinness([140, 95, 70])).toBeGreaterThan(0.2);
  });
});
