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
  adult?: boolean; smile?: 'open' | 'soft'; lashes?: boolean; tunic?: boolean; fringe?: number; star?: string;
  shortSleeves?: boolean; polo?: boolean; beardStyle?: 'full' | 'short'; emblemSmall?: boolean;
}

function shade(c: number, k: number) { const col = new THREE.Color(c); col.multiplyScalar(k); return col.getHex(); }

function faceTex(o: BlockyOpts, closed: boolean) {
  const skin = o.skin ?? '#F6C9A0', brow = o.beard ? '#5B4A42' : '#4A2C22';
  return tex((x, S) => {
    const r = (a: number, b: number, w: number, h: number, c: string) => { x.fillStyle = c; x.fillRect(a * S, b * S, w * S, h * S); };
    r(0, 0, 1, 1, skin);
    // thick brows
    const bh = o.lashes ? 0.045 : 0.07, by = o.lashes ? 0.32 : 0.3;
    r(0.14, by, 0.24, bh, brow); r(0.62, by, 0.24, bh, brow);
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
    if (o.beard && o.beardStyle === 'short') {
      // moustache, a beard along the jaw and a little chin tuft, smile still visible
      x.fillStyle = o.beard;
      x.fillRect(0, 0.72 * S, 0.06 * S, 0.28 * S); x.fillRect(0.94 * S, 0.72 * S, 0.06 * S, 0.28 * S);   // sideburns
      x.fillRect(0, 0.93 * S, S, 0.07 * S);                                                             // jaw line
      x.fillRect(0.06 * S, 0.88 * S, 0.24 * S, 0.06 * S); x.fillRect(0.7 * S, 0.88 * S, 0.24 * S, 0.06 * S);
      x.fillRect(0.44 * S, 0.88 * S, 0.12 * S, 0.06 * S);                                               // chin tuft
      x.fillRect(0.32 * S, 0.665 * S, 0.36 * S, 0.04 * S);                                              // moustache
    } else if (o.beard) { x.fillStyle = o.beard; x.fillRect(0.06 * S, 0.7 * S, 0.88 * S, 0.3 * S); x.fillRect(0, 0.48 * S, 0.08 * S, 0.5 * S); x.fillRect(0.92 * S, 0.48 * S, 0.08 * S, 0.5 * S); }
    // mouth
    if ((o.smile ?? 'open') === 'open' && (!o.beard || o.beardStyle === 'short')) {
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
    if (o.polo) {
      // polo collar: a V placket with two collar tabs
      x.fillStyle = '#F6C9A0'; x.beginPath(); x.moveTo(S * 0.4, 0); x.lineTo(S * 0.6, 0); x.lineTo(S * 0.5, S * 0.16); x.closePath(); x.fill();
      x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(S * 0.47, S * 0.14, S * 0.06, S * 0.14);
      x.fillStyle = '#FFFFFF'; x.beginPath(); x.moveTo(S * 0.3, 0); x.lineTo(S * 0.42, 0); x.lineTo(S * 0.47, S * 0.13); x.lineTo(S * 0.36, S * 0.1); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(S * 0.7, 0); x.lineTo(S * 0.58, 0); x.lineTo(S * 0.53, S * 0.13); x.lineTo(S * 0.64, S * 0.1); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = S * 0.012; x.stroke();
    }
    if (o.emblem === 'star') {
      const sm = o.emblemSmall ? 0.55 : 1, sx = o.emblemSmall ? 0.7 : 0.56, sy = o.emblemSmall ? 0.36 : (o.tunic ? 0.64 : 0.4);
      x.fillStyle = o.star ?? '#F7F5EF'; x.beginPath();
      for (let i = 0; i < 10; i++) { const rr = (i % 2 ? S * 0.09 : S * 0.2) * sm, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(S * sx + Math.cos(a) * rr, S * sy + Math.sin(a) * rr); }
      x.closePath(); x.fill();
    } else if (o.emblem === 'moon') {
      const col = o.star ?? '#FFE27A', cy = S * (o.tunic ? 0.62 : 0.4);
      // crescent moon with a small star
      const c2 = document.createElement('canvas'); c2.width = c2.height = S; const y = c2.getContext('2d')!;
      y.fillStyle = col; y.beginPath(); y.arc(S * 0.52, cy, S * 0.17, 0, Math.PI * 2); y.fill();
      y.globalCompositeOperation = 'destination-out'; y.beginPath(); y.arc(S * 0.6, cy - S * 0.05, S * 0.15, 0, Math.PI * 2); y.fill();
      y.globalCompositeOperation = 'source-over'; y.fillStyle = col; y.beginPath();
      for (let i = 0; i < 10; i++) { const rr = i % 2 ? S * 0.03 : S * 0.07, a = -Math.PI / 2 + i * Math.PI / 5; y.lineTo(S * 0.68 + Math.cos(a) * rr, cy - S * 0.08 + Math.sin(a) * rr); }
      y.fill();
      x.drawImage(c2, 0, 0);
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
  if (o.tunic) { body.add(bbox(BW + 0.1, 0.16, BD + 0.1, shirtM, 0, LEG + 0.02, 0, undefined, 0.03)); body.add(bbox(BW + 0.12, 0.04, BD + 0.12, darkM, 0, LEG - 0.07, 0, undefined, 0.01)); }

  // ---- torso with emblem, collar and belt
  body.add(bbox(BW, TORSO, BD, shirtM, 0, LEG + TORSO / 2, 0, o.emblem || o.polo ? texMat(bodyTex(o)) : undefined));
  if (!o.polo) body.add(bbox(0.16, 0.05, 0.03, m(o.collar ?? 0xf7941d), 0, LEG + TORSO - 0.03, BD / 2 + 0.005, undefined, 0.008));
  if (o.belt !== undefined) body.add(bbox(BW * 0.5, 0.06, 0.03, m(o.belt), 0.02, LEG + 0.09, BD / 2 + 0.005, undefined, 0.01));

  // ---- backpack with straps
  if (o.backpack !== null && o.backpack !== undefined) {
    const bp = m(o.backpack), bpD = m(shade(o.backpack, 0.75));
    body.add(bbox(BW * 0.8, TORSO * 0.78, 0.14, bp, 0, LEG + TORSO * 0.5, -BD / 2 - 0.07, undefined, 0.03));
    body.add(bbox(BW * 0.45, TORSO * 0.3, 0.06, bpD, 0, LEG + TORSO * 0.3, -BD / 2 - 0.16, undefined, 0.015));
    for (const sx of [-1, 1]) {
      body.add(bbox(0.05, TORSO * 0.75, 0.03, bpD, sx * BW * 0.3, LEG + TORSO * 0.6, BD / 2 + 0.012, undefined, 0.006));
      body.add(bbox(0.05, 0.035, BD + 0.04, bpD, sx * BW * 0.3, LEG + TORSO - 0.015, 0, undefined, 0.006));
      body.add(bbox(0.07, 0.05, 0.035, m(shade(o.backpack, 0.6)), sx * BW * 0.3, LEG + TORSO * 0.55, BD / 2 + 0.02, undefined, 0.008));
    }
  }

  // ---- arms: sleeve, yellow cuff, block hand (pivot at the shoulder)
  const arm = (side: number) => {
    const g = new THREE.Group(); g.position.set(side * (BW / 2 + 0.09), LEG + TORSO - 0.05, 0); body.add(g);
    const sl = TORSO * 0.78;
    if (o.shortSleeves) {
      // short sleeve over a bare arm
      g.add(bbox(0.16, sl + 0.12, 0.17, skinM, 0, -(sl + 0.12) / 2 + 0.05, 0, undefined, 0.025));
      g.add(bbox(0.19, sl * 0.38, 0.2, shirtM, 0, -sl * 0.19 + 0.05, 0, undefined, 0.02));
    } else {
      g.add(bbox(0.17, sl, 0.18, shirtM, 0, -sl / 2 + 0.05));
      g.add(bbox(0.18, 0.05, 0.19, m(o.cuff ?? 0xffd21f), 0, -sl + 0.025, 0, undefined, 0.01));
      g.add(bbox(0.16, 0.12, 0.17, skinM, 0, -sl - 0.06, 0, undefined, 0.025));
    }
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
    const hm = m(o.hijab), hd = m(shade(o.hijab, 0.9));
    // a roomy hood: top, back and thick sides that frame the face
    headG.add(bbox(HEAD + 0.12, 0.16, HEAD + 0.12, hm, 0, HEAD + 0.04, -0.02, undefined, 0.045));
    headG.add(bbox(HEAD + 0.12, HEAD + 0.06, 0.12, hm, 0, HEAD * 0.5 + 0.02, -HEAD / 2 - 0.05, undefined, 0.04));
    for (const sx of [-1, 1]) headG.add(bbox(0.09, HEAD * 1.02, HEAD + 0.1, hm, sx * (HEAD / 2 + 0.05), HEAD * 0.5, -0.02, undefined, 0.035));
    // the front edge with a notch in the middle, and a little hair fringe peeking out
    headG.add(bbox(HEAD * 0.36, 0.1, 0.07, hm, -HEAD * 0.32, HEAD * 0.9, HEAD / 2 + 0.03, undefined, 0.02));
    headG.add(bbox(HEAD * 0.36, 0.1, 0.07, hm, HEAD * 0.32, HEAD * 0.9, HEAD / 2 + 0.03, undefined, 0.02));
    headG.add(bbox(HEAD * 0.3, 0.06, 0.07, hm, 0, HEAD * 0.96, HEAD / 2 + 0.03, undefined, 0.015));
    if (o.fringe !== undefined) {
      const fr = m(o.fringe, 0.2);
      headG.add(bbox(HEAD * 0.32, 0.05, 0.03, fr, 0, HEAD * 0.9, HEAD / 2 + 0.005, undefined, 0.008));
      for (const sx of [-1, 1]) headG.add(bbox(0.035, HEAD * 0.32, 0.03, fr, sx * (HEAD / 2 - 0.035), HEAD * 0.66, HEAD / 2 + 0.005, undefined, 0.008));
    }
    // the drape: wraps the neck and comes to a point on the chest
    headG.add(bbox(HEAD + 0.2, 0.16, HEAD * 0.95, hd, 0, -0.02, -0.02, undefined, 0.05));
    const drape = new THREE.Group(); drape.position.set(0, -0.08, BD / 2 + 0.03); headG.add(drape);
    for (let k = 0; k < 3; k++) drape.add(bbox(0.5 - k * 0.16, 0.06, 0.05, hd, 0, -k * 0.05, 0, undefined, 0.015));
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
export const AISYAH = (shirt = 0xf28fa6, hijab = 0xf48aa3): BlockyOpts => ({
  shirt, shirtDark: shade(shirt, 0.88), pants: shirt, pantsBand: 0xf9c8d4, hijab, fringe: 0x6b4434, emblem: 'moon', star: '#FFF1F4',
  backpack: null, cuff: 0xf9c8d4, collar: shirt, shoes: 0xf9d3dc, shoeStripe: 0xf28fa6, tunic: true, hair: 0x6b4434,
});
export const AYAH: BlockyOpts = {
  skin: '#F2C29A', shirt: 0xf5f3ee, shirtDark: 0xdcd8cf, pants: 0xe2c79a, pantsBand: 0xe2c79a, hair: 0x5a3b2e,
  beard: '#5A3B2E', beardStyle: 'short', polo: true, emblem: 'star', emblemSmall: true, star: '#24335E',
  shortSleeves: true, backpack: 0x3b3a3d, shoes: 0xf7f7f4, shoeStripe: 0xf7f7f4, adult: true,
};
