// Smooth-edged blocky characters in the style of the Baby Mo reference art:
// chunky hair blocks hanging over the forehead, thick brows, big square eyes,
// an open smile, a backpack, cuffed sleeves and sneakers. One builder makes
// Baby Mo (green), Ibra & Aisyah (blue) and the villagers.
import * as THREE from 'three';
import type { Rig } from './models';

const mats = new Map<string, THREE.Material>();
function m(c: number | string, glow = 0.28): THREE.Material {
  const k = c + '|' + glow; let x = mats.get(k);
  if (!x) { const col = new THREE.Color(c as THREE.ColorRepresentation); x = new THREE.MeshLambertMaterial({ color: col, emissive: col.clone().multiplyScalar(glow) }); mats.set(k, x); }
  return x;
}
function tex(draw: (x: CanvasRenderingContext2D, S: number) => void, S = 128) {
  const c = document.createElement('canvas'); c.width = c.height = S; draw(c.getContext('2d')!, S);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const texMat = (t: THREE.Texture) => new THREE.MeshLambertMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.28 });

/** a box with softly bevelled edges (3 overlapping boxes); `front` replaces the +z face */
function bbox(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0, front?: THREE.Material, bevel = 0.018) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const c = Math.min(bevel, w / 4, h / 4, d / 4);
  const fm = [mat, mat, mat, mat, front ?? mat, mat];
  g.add(new THREE.Mesh(new THREE.BoxGeometry(w, h - c * 2, d - c * 2), fm));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(w - c * 2, h, d - c * 2), fm));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(w - c * 2, h - c * 2, d), fm));
  return g;
}

export interface BlockyOpts {
  shirt: number; shirtDark?: number; pants?: number; pantsBand?: number;
  hair?: number; skin?: string; cuff?: number; collar?: number; belt?: number;
  emblem?: 'star' | 'moon' | null; backpack?: number | null; shoes?: number; shoeStripe?: number;
  hijab?: number; peci?: number; beard?: string; glasses?: boolean; robe?: boolean;
  adult?: boolean; smile?: 'open' | 'soft'; lashes?: boolean;
}

function shade(c: number, k: number) { const col = new THREE.Color(c); col.multiplyScalar(k); return col.getHex(); }

function faceTex(o: BlockyOpts, closed: boolean) {
  const skin = o.skin ?? '#F6C9A0', brow = o.beard ? '#5B4A42' : '#4A2C22';
  return tex((x, S) => {
    const r = (a: number, b: number, w: number, h: number, c: string) => { x.fillStyle = c; x.fillRect(a * S, b * S, w * S, h * S); };
    r(0, 0, 1, 1, skin);
    // thick brows
    r(0.12, 0.3, 0.27, 0.07, brow); r(0.61, 0.3, 0.27, 0.07, brow);
    // big square eyes: white on the outer side, a large brown iris, a tiny shine
    for (const [ex, flip] of [[0.15, false], [0.6, true]] as [number, boolean][]) {
      if (closed) { r(ex, 0.5, 0.25, 0.05, '#3A2116'); continue; }
      r(ex - 0.02, 0.41, 0.29, 0.25, '#FFFFFF');
      const ix = flip ? ex - 0.02 : ex + 0.06;
      r(ix, 0.41, 0.21, 0.25, '#5B3320');
      r(ix + 0.03, 0.48, 0.15, 0.18, '#3A1E10');
      r(ix + (flip ? 0.13 : 0.05), 0.45, 0.05, 0.05, '#FFFFFF');
      if (o.lashes) r(ex - 0.02, 0.42, 0.29, 0.03, '#2A1A12');
    }
    if (o.glasses) { x.strokeStyle = '#333'; x.lineWidth = S * 0.025; x.strokeRect(0.12 * S, 0.41 * S, 0.31 * S, 0.26 * S); x.strokeRect(0.57 * S, 0.41 * S, 0.31 * S, 0.26 * S); r(0.43, 0.5, 0.14, 0.025, '#333'); }
    // rosy cheeks
    r(0.08, 0.68, 0.14, 0.07, 'rgba(255,140,130,.55)'); r(0.78, 0.68, 0.14, 0.07, 'rgba(255,140,130,.55)');
    if (o.beard) { x.fillStyle = o.beard; x.fillRect(0.06 * S, 0.7 * S, 0.88 * S, 0.3 * S); x.fillRect(0, 0.48 * S, 0.08 * S, 0.5 * S); x.fillRect(0.92 * S, 0.48 * S, 0.08 * S, 0.5 * S); }
    // mouth
    if ((o.smile ?? 'open') === 'open' && !o.beard) {
      x.fillStyle = '#8E2A20'; x.beginPath(); x.moveTo(0.35 * S, 0.71 * S); x.lineTo(0.65 * S, 0.71 * S); x.lineTo(0.63 * S, 0.81 * S); x.quadraticCurveTo(0.5 * S, 0.94 * S, 0.37 * S, 0.81 * S); x.closePath(); x.fill();
      r(0.36, 0.71, 0.28, 0.04, '#FFFFFF');
      x.fillStyle = '#F07A72'; x.beginPath(); x.ellipse(0.5 * S, 0.85 * S, 0.09 * S, 0.045 * S, 0, 0, Math.PI * 2); x.fill();
    } else {
      x.strokeStyle = '#8E2A20'; x.lineWidth = S * 0.035; x.lineCap = 'round';
      x.beginPath(); x.moveTo(0.4 * S, 0.76 * S); x.quadraticCurveTo(0.5 * S, 0.84 * S, 0.6 * S, 0.76 * S); x.stroke();
    }
  });
}

function bodyTex(o: BlockyOpts) {
  const shirt = '#' + new THREE.Color(o.shirt).getHexString();
  return tex((x, S) => {
    x.fillStyle = shirt; x.fillRect(0, 0, S, S);
    if (o.emblem === 'star') {
      x.fillStyle = '#F7F5EF'; x.beginPath();
      for (let i = 0; i < 10; i++) { const rr = i % 2 ? S * 0.09 : S * 0.2, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(S * 0.56 + Math.cos(a) * rr, S * 0.4 + Math.sin(a) * rr); }
      x.closePath(); x.fill();
    } else if (o.emblem === 'moon') {
      x.fillStyle = '#FFE27A'; x.beginPath(); x.arc(S * 0.52, S * 0.4, S * 0.17, 0, Math.PI * 2); x.fill();
      x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(S * 0.6, S * 0.35, S * 0.15, 0, Math.PI * 2); x.fill();
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = shirt; x.beginPath(); x.arc(S * 0.6, S * 0.35, S * 0.15, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#FFE27A'; x.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? S * 0.03 : S * 0.07, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(S * 0.68 + Math.cos(a) * rr, S * 0.32 + Math.sin(a) * rr); } x.fill();
    }
  });
}

export function buildBlocky(o: BlockyOpts): Rig {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const A = !!o.adult;
  const skinM = m(o.skin ?? '#F6C9A0'), hairM = m(o.hair ?? 0x5b3b2f, 0.18);
  const shirtM = m(o.shirt), darkM = m(o.shirtDark ?? shade(o.shirt, 0.55));
  const pantsM = m(o.pants ?? o.shirt), bandM = m(o.pantsBand ?? o.shirtDark ?? shade(o.shirt, 0.55));
  const LEG = A ? 0.62 : 0.5, TORSO = A ? 0.6 : 0.5, HEAD = A ? 0.5 : 0.56, BW = A ? 0.5 : 0.46, BD = 0.27;

  // ---- legs: trousers, a darker band, white sneakers with a stripe
  const leg = (side: number) => {
    const g = new THREE.Group(); g.position.set(side * BW / 4, LEG, 0); body.add(g);
    const lw = BW / 2 - 0.01;
    g.add(bbox(lw, LEG - 0.17, 0.25, pantsM, 0, -(LEG - 0.17) / 2));
    g.add(bbox(lw + 0.005, 0.06, 0.255, bandM, 0, -(LEG - 0.17) - 0.03));
    g.add(bbox(lw + 0.02, 0.12, 0.31, m(o.shoes ?? 0xf7f7f4), 0, -LEG + 0.06, 0.025, undefined, 0.025));
    g.add(bbox(lw + 0.03, 0.03, 0.32, m(o.shoeStripe ?? 0xf7941d), 0, -LEG + 0.09, 0.025, undefined, 0.008));
    return g;
  };
  const legs = [leg(-1), leg(1)];
  if (o.robe) body.add(bbox(BW + 0.02, LEG * 0.7, BD + 0.02, shirtM, 0, LEG - LEG * 0.35));

  // ---- torso with emblem, collar and belt
  body.add(bbox(BW, TORSO, BD, shirtM, 0, LEG + TORSO / 2, 0, o.emblem ? texMat(bodyTex(o)) : undefined));
  body.add(bbox(0.16, 0.05, 0.03, m(o.collar ?? 0xf7941d), 0, LEG + TORSO - 0.03, BD / 2 + 0.005, undefined, 0.008));
  if (o.belt !== undefined) body.add(bbox(BW * 0.5, 0.06, 0.03, m(o.belt), 0.02, LEG + 0.09, BD / 2 + 0.005, undefined, 0.01));

  // ---- backpack with straps
  if (o.backpack !== null && o.backpack !== undefined) {
    const bp = m(o.backpack), bpD = m(shade(o.backpack, 0.75));
    body.add(bbox(BW * 0.8, TORSO * 0.78, 0.14, bp, 0, LEG + TORSO * 0.5, -BD / 2 - 0.07, undefined, 0.03));
    body.add(bbox(BW * 0.45, TORSO * 0.3, 0.06, bpD, 0, LEG + TORSO * 0.3, -BD / 2 - 0.16, undefined, 0.015));
    for (const sx of [-1, 1]) {
      body.add(bbox(0.05, TORSO * 0.75, 0.03, bpD, sx * BW * 0.3, LEG + TORSO * 0.6, BD / 2 + 0.012, undefined, 0.006));
      body.add(bbox(0.05, 0.035, BD + 0.04, bpD, sx * BW * 0.3, LEG + TORSO - 0.015, 0, undefined, 0.006));
      body.add(bbox(0.07, 0.05, 0.035, m(0x3c4a28), sx * BW * 0.3, LEG + TORSO * 0.55, BD / 2 + 0.02, undefined, 0.008));
    }
  }

  // ---- arms: sleeve, yellow cuff, block hand (pivot at the shoulder)
  const arm = (side: number) => {
    const g = new THREE.Group(); g.position.set(side * (BW / 2 + 0.09), LEG + TORSO - 0.05, 0); body.add(g);
    const sl = TORSO * 0.78;
    g.add(bbox(0.17, sl, 0.18, shirtM, 0, -sl / 2 + 0.05));
    g.add(bbox(0.18, 0.05, 0.19, m(o.cuff ?? 0xffd21f), 0, -sl + 0.025, 0, undefined, 0.01));
    g.add(bbox(0.16, 0.12, 0.17, skinM, 0, -sl - 0.06, 0, undefined, 0.025));
    const hand = new THREE.Group(); hand.position.set(0, -sl - 0.1, 0.06); g.add(hand);
    return { g, hand };
  };
  const L = arm(-1), R = arm(1);

  // ---- head
  const headG = new THREE.Group(); headG.position.y = LEG + TORSO; body.add(headG);
  const open = texMat(faceTex(o, false)), shut = texMat(faceTex(o, true));
  const headBox = bbox(HEAD, HEAD, HEAD, skinM, 0, HEAD / 2, 0, open, 0.03);
  headG.add(headBox);
  // ears
  if (o.hijab === undefined) for (const sx of [-1, 1]) headG.add(bbox(0.05, 0.12, 0.1, skinM, sx * (HEAD / 2 + 0.02), HEAD * 0.48, 0.02, undefined, 0.012));
  if (o.hijab !== undefined) {
    // hijab: frames the face and falls over the shoulders
    const hm = m(o.hijab), hd = m(shade(o.hijab, 0.85));
    headG.add(bbox(HEAD + 0.08, 0.14, HEAD + 0.08, hm, 0, HEAD + 0.02, -0.01, undefined, 0.03));
    headG.add(bbox(HEAD + 0.08, HEAD * 0.98, 0.08, hm, 0, HEAD * 0.5, -HEAD / 2 - 0.03));
    for (const sx of [-1, 1]) headG.add(bbox(0.06, HEAD * 0.98, HEAD + 0.06, hm, sx * (HEAD / 2 + 0.035), HEAD * 0.5, -0.01));
    headG.add(bbox(HEAD + 0.06, 0.07, 0.05, hm, 0, HEAD * 0.86, HEAD / 2 + 0.01, undefined, 0.01));
    headG.add(bbox(HEAD + 0.16, 0.18, HEAD * 0.9, hd, 0, -0.04, -0.03, undefined, 0.04));
  } else {
    // chunky hair: a cap, a thick fringe with hanging blocks, sides and back
    headG.add(bbox(HEAD + 0.07, 0.14, HEAD + 0.08, hairM, 0, HEAD + 0.03, -0.01, undefined, 0.035));
    headG.add(bbox(HEAD + 0.06, HEAD * 0.62, 0.09, hairM, 0, HEAD * 0.68, -HEAD / 2 - 0.02, undefined, 0.025));
    for (const sx of [-1, 1]) headG.add(bbox(0.06, HEAD * 0.42, HEAD + 0.05, hairM, sx * (HEAD / 2 + 0.025), HEAD * 0.78, -0.01, undefined, 0.02));
    headG.add(bbox(HEAD + 0.06, 0.1, 0.08, hairM, 0, HEAD - 0.02, HEAD / 2 + 0.02, undefined, 0.02));
    if (!o.peci) {
      const chunks: [number, number, number][] = [[-0.21, 0.13, 0.12], [-0.08, 0.12, 0.17], [0.07, 0.13, 0.11], [0.2, 0.1, 0.15]];   // x, width, drop
      for (const [cx, w, drop] of chunks) headG.add(bbox(w * HEAD / 0.56, drop * HEAD / 0.56, 0.07, hairM, cx * HEAD / 0.56, HEAD - 0.06 - (drop * HEAD / 0.56) / 2, HEAD / 2 + 0.02, undefined, 0.015));
      // sideburn blocks
      for (const sx of [-1, 1]) headG.add(bbox(0.06, HEAD * 0.22, 0.12, hairM, sx * (HEAD / 2 + 0.02), HEAD * 0.48, HEAD / 2 - 0.08, undefined, 0.012));
    }
    if (o.peci !== undefined) headG.add(bbox(HEAD + 0.08, 0.16, HEAD + 0.08, m(o.peci), 0, HEAD + 0.06, 0, undefined, 0.02));
  }
  const fronts = headBox.children as THREE.Mesh[];
  const blink = (closed: boolean) => { for (const f of fronts) (f.material as THREE.Material[])[4] = closed ? shut : open; };
  const height = LEG + TORSO + HEAD + 0.14;
  return { root, body, head: headG, armL: L.g, armR: R.g, legs, height, blink, hand: R.hand, hip: LEG, scale: 1, neck: LEG + TORSO };
}

// ---- the cast ----
export const BABY_MO: BlockyOpts = { shirt: 0x8dc63f, shirtDark: 0x4f7a2c, hair: 0x5b3b2f, emblem: 'star', belt: 0xf7941d, backpack: 0x55663a, cuff: 0xffd21f };
export const IBRA = (shirt = 0x4a90e2): BlockyOpts => ({ shirt, shirtDark: shade(shirt, 0.6), hair: 0x3b2a22, emblem: 'moon', belt: 0xf7941d, backpack: 0x2d3e66, cuff: 0xffd21f });
export const AISYAH = (shirt = 0x4a90e2, hijab = 0x2aa198): BlockyOpts => ({ shirt, shirtDark: shade(shirt, 0.6), hijab, emblem: 'star', belt: 0xf7941d, backpack: 0x7a3e8e, cuff: 0xffd21f, lashes: true, shoeStripe: 0xff6fa5 });
