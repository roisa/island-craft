// Blocky character & animal models built from boxes (original designs).
// Characters use "chamfered" boxes (three overlapping boxes) so heads and
// bodies read as soft and rounded, and smooth hand-drawn faces that blink.
import * as THREE from 'three';
import { mergeRig } from './merge';

const matCache = new Map<string, THREE.Material>();
/** Lambert material with a little self-light so colours stay cheerful in shade. */
export function mat(c: number | string | THREE.Texture, glow = 0.32): THREE.Material {
  if (c instanceof THREE.Texture) return new THREE.MeshLambertMaterial({ map: c, emissive: 0xffffff, emissiveMap: c, emissiveIntensity: glow });
  const k = String(c) + '|' + glow;
  let m = matCache.get(k);
  if (!m) {
    const col = new THREE.Color(c as THREE.ColorRepresentation);
    m = new THREE.MeshLambertMaterial({ color: col, emissive: col.clone().multiplyScalar(glow) });
    matCache.set(k, m);
  }
  return m;
}
function ctex(w: number, h: number, draw: (x: CanvasRenderingContext2D) => void, smooth = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!; draw(x);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter;
  t.anisotropy = 4;
  return t;
}
/** Box whose origin is at its top (for limbs that swing from the shoulder/hip). */
function limb(w: number, h: number, d: number, m: THREE.Material | THREE.Material[], x: number, y: number, z: number) {
  const g = new THREE.BoxGeometry(w, h, d); g.translate(0, -h / 2, 0);
  const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); return mesh;
}
function box(w: number, h: number, d: number, m: THREE.Material | THREE.Material[], x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mesh.position.set(x, y, z); return mesh;
}
/** Rounded-looking box: three overlapping boxes with the edges cut. `front` goes on the +z face. */
function soft(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, c = 0.05, front?: THREE.Material, top?: THREE.Material) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const f = front ?? m, tp = top ?? m;
  g.add(box(w, h - c * 2, d - c * 2, [m, m, tp, m, m, m], 0, 0, 0));
  g.add(box(w - c * 2, h, d - c * 2, [m, m, tp, m, m, m], 0, 0, 0));
  g.add(box(w - c * 2, h - c * 2, d, [m, m, tp, m, f, m], 0, 0, 0));
  return g;
}
function softLimb(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, c = 0.025) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const s = soft(w, h, d, m, 0, -h / 2, 0, c); g.add(s);
  return g;
}

export interface Rig {
  root: THREE.Group; body: THREE.Group; head: THREE.Object3D; armL?: THREE.Object3D; armR?: THREE.Object3D; legs: THREE.Object3D[]; height: number;
  blink?: (closed: boolean) => void; hand?: THREE.Object3D;
  hip?: number; scale?: number; neck?: number;
}

// ---- faces -------------------------------------------------------------------
interface FaceOpts { eyes?: number; lashes?: boolean; beard?: string; brows?: string; mouth?: 'smile' | 'open'; glasses?: boolean }
function drawFace(x: CanvasRenderingContext2D, S: number, skin: string, o: FaceOpts, closed: boolean) {
  x.fillStyle = skin; x.fillRect(0, 0, S, S);
  const k = S / 64, er = (o.eyes ?? 6) * k, ey = 34 * k;
  const ell = (cx: number, cy: number, rx: number, ry: number, c: string) => { x.fillStyle = c; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fill(); };
  // cheeks
  x.globalAlpha = 0.5; ell(11 * k, 46 * k, 6.5 * k, 4 * k, '#ff8f86'); ell(53 * k, 46 * k, 6.5 * k, 4 * k, '#ff8f86'); x.globalAlpha = 1;
  for (const ex of [21 * k, 43 * k]) {
    if (closed) {
      x.strokeStyle = '#2a1a10'; x.lineWidth = 2.2 * k; x.lineCap = 'round';
      x.beginPath(); x.arc(ex, ey - er * 0.2, er * 0.9, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();
    } else {
      ell(ex, ey, er * 0.95, er * 1.12, '#ffffff');
      ell(ex, ey + er * 0.1, er * 0.82, er, '#4a2a17');
      ell(ex, ey + er * 0.22, er * 0.48, er * 0.56, '#1a0f08');
      ell(ex + er * 0.32, ey - er * 0.35, er * 0.3, er * 0.3, '#ffffff');
      ell(ex - er * 0.35, ey + er * 0.45, er * 0.14, er * 0.14, '#ffffff');
      x.strokeStyle = '#1b120c'; x.lineWidth = 1.8 * k; x.lineCap = 'round';
      x.beginPath(); x.ellipse(ex, ey, er * 0.98, er * 1.14, 0, 1.08 * Math.PI, 1.92 * Math.PI); x.stroke();
      if (o.lashes) { x.beginPath(); x.moveTo(ex + er * 0.85, ey - er * 0.7); x.lineTo(ex + er * 1.3, ey - er * 1.05); x.moveTo(ex - er * 0.85, ey - er * 0.7); x.lineTo(ex - er * 1.3, ey - er * 1.05); x.stroke(); }
    }
    // brows
    x.strokeStyle = o.brows ?? '#2a1a10'; x.lineWidth = 2.2 * k; x.lineCap = 'round';
    x.beginPath(); x.arc(ex, ey - er * 0.6, er * 1.25, 1.3 * Math.PI, 1.7 * Math.PI); x.stroke();
  }
  if (o.glasses) { x.strokeStyle = '#3b3b3b'; x.lineWidth = 1.6 * k; for (const ex of [21 * k, 43 * k]) { x.beginPath(); x.arc(ex, ey, er * 1.45, 0, Math.PI * 2); x.stroke(); } x.beginPath(); x.moveTo(27 * k, ey); x.lineTo(37 * k, ey); x.stroke(); }
  // nose
  ell(32 * k, 44 * k, 2 * k, 1.4 * k, 'rgba(160,80,60,0.45)');
  if (o.beard) {
    // full, soft beard around the chin with sideburns; the smile stays visible above it
    x.fillStyle = o.beard;
    x.beginPath(); x.moveTo(3 * k, 34 * k); x.lineTo(9 * k, 34 * k); x.lineTo(11 * k, 46 * k);
    x.quadraticCurveTo(18 * k, 54 * k, 32 * k, 54 * k); x.quadraticCurveTo(46 * k, 54 * k, 53 * k, 46 * k);
    x.lineTo(55 * k, 34 * k); x.lineTo(61 * k, 34 * k); x.lineTo(61 * k, 50 * k);
    x.quadraticCurveTo(56 * k, 64 * k, 32 * k, 64 * k); x.quadraticCurveTo(8 * k, 64 * k, 3 * k, 50 * k); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(24 * k, 50.5 * k); x.quadraticCurveTo(32 * k, 47 * k, 40 * k, 50.5 * k); x.lineTo(40 * k, 52 * k); x.quadraticCurveTo(32 * k, 49 * k, 24 * k, 52 * k); x.fill(); // moustache
  }
  // mouth
  if (o.mouth === 'open') {
    x.fillStyle = '#8a2f25'; x.beginPath(); x.ellipse(32 * k, 51.5 * k, 4 * k, 3.2 * k, 0, 0, Math.PI); x.fill();
    x.fillStyle = '#ff8a8a'; x.beginPath(); x.ellipse(32 * k, 53 * k, 2.4 * k, 1.4 * k, 0, 0, Math.PI); x.fill();
  } else {
    x.strokeStyle = '#8a2f25'; x.lineWidth = 2.2 * k; x.lineCap = 'round';
    x.beginPath(); x.arc(32 * k, o.beard ? 49 * k : 47 * k, 5 * k, 0.2 * Math.PI, 0.8 * Math.PI); x.stroke();
  }
}
function faceMats(skin: string, o: FaceOpts) {
  const open = mat(ctex(128, 128, x => drawFace(x, 128, skin, o, false), true), 0.3);
  const shut = mat(ctex(128, 128, x => drawFace(x, 128, skin, o, true), true), 0.3);
  return { open, shut };
}
function blinker(front: THREE.Mesh, f: { open: THREE.Material; shut: THREE.Material }) {
  return (closed: boolean) => { (front.material as THREE.Material[])[4] = closed ? f.shut : f.open; };
}
/** The face-carrying box of a soft() group is its third child. */
const frontOf = (g: THREE.Group) => g.children[2] as THREE.Mesh;

// ---- Baby Mo ----------------------------------------------------------------
// Baby Mo as a classic blocky "skin" avatar: sharp boxes for head, body,
// arms and legs, each face painted as pixel art (16 px per head face),
// plus a slightly larger transparent outer layer for the hair - the way
// block-game avatars are built. Original Baby Mo design.
const PX = 1 / 32;                       // one skin pixel in world units
type Pix = string[];                      // rows of characters, '.' = transparent
const MO_PAL: Record<string, string> = {
  H: '#1B1B20', h: '#34343C',             // hair, hair highlight
  S: '#F6C7A0', s: '#E9B08A', E: '#E39C7B', // skin, skin shade, ear inner
  K: '#1A110B', B: '#6B3A1E', b: '#3A1E0E', W: '#FFFFFF', // eye outline, iris, pupil, shine
  P: '#FF8F86', M: '#9C3326', T: '#FF7F7F', // cheeks, mouth, tongue
  G: '#4FCF4A', g: '#3FB43B', D: '#2F9A2E', // greens
  O: '#F58F4F', o: '#D9763A', Y: '#F7E27A', w: '#EFEFEF', // orange, yellow cuff, star white
};
function pixTex(rows: Pix, flipX = false) {
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const ch = rows[j][flipX ? w - 1 - i : i];
    if (ch === '.' || ch === undefined) continue;
    x.fillStyle = MO_PAL[ch] ?? '#ff00ff'; x.fillRect(i, j, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const fill = (w: number, h: number, ch: string): Pix => Array.from({ length: h }, () => ch.repeat(w));
function skinMat(rows: Pix, overlay = false, flipX = false) {
  const t = pixTex(rows, flipX);
  return new THREE.MeshLambertMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.3, transparent: overlay, alphaTest: overlay ? 0.5 : 0, side: overlay ? THREE.DoubleSide : THREE.FrontSide });
}
/** a sharp box w×h×d skin pixels; mats = [right, left, top, bottom, front, back] pixel maps */
function skinBox(w: number, h: number, d: number, faces: [Pix, Pix, Pix, Pix, Pix, Pix], overlay = false) {
  return new THREE.Mesh(new THREE.BoxGeometry(w * PX, h * PX, d * PX), faces.map(f => skinMat(f, overlay)));
}

// ---- head (16×16×16) ----
const FACE_OPEN: Pix = [
  'HHHHHHHHHHHHHHHH',
  'HHHHHhHHHHHHhHHH',
  'HHHHHHHHHHHHHHHH',
  'HHHhHHHHHHHHHHHH',
  'HHHHHHHHHHHHHHHH',
  'HSHHHHSHHHHSHHHH',
  'HSSHHSSSHHSSSHHS',
  'SSSSSSSSSSSSSSSS',
  'SSSKKKSSSSKKKSSS',
  'SSKBWBKSSKBWBKSS',
  'SSKBbBKSSKBbBKSS',
  'SSSKKKSSSSKKKSSS',
  'SPPSSSSssSSSSPPS',
  'SPPSSMSSSSMSSPPS',
  'SSSSSSMTTMSSSSSS',
  'SSSSSSSSSSSSSSSS',
];
const FACE_SHUT: Pix = FACE_OPEN.map((r, j) => (j >= 8 && j <= 11 ? (j === 10 ? 'SSKKKKSSSSKKKKSS' : 'SSSSSSSSSSSSSSSS') : r));
const HEAD_SIDE: Pix = [
  'HHHHHHHHHHHHHHHH', 'HHHHHHHHHHHHHHHH', 'HHHHHHHHHHHHHHHH', 'HHHHHhHHHHHHHHHH',
  'HHHHHHHHHHHHHHHH', 'HHHHHHHHHHHHHHHS', 'HHHHHHHHHHHHHHSS', 'HHHHHHHHHHHSSSSS',
  'HHHHHHHSSSSSSSSS', 'HHHHHHSSESSSSSSS', 'HHHHHSSEESSSSSSS', 'HHHHSSSEESSSSSSS',
  'HHHSSSSSSSSSSSSS', 'HHSSSSSSSSSSSSSS', 'sSSSSSSSSSSSSSSS', 'ssSSSSSSSSSSSSSS',
];
const HEAD_BACK: Pix = [
  ...fill(16, 11, 'H'), 'HHHHHHHHHHHHHHHH', 'HHSHHHHSHHHHSHHS', 'sSSSSSSSSSSSSSSs', 'sSSSSSSSSSSSSSSs', 'ssssssssssssssss',
].map((r, j) => (j === 2 ? 'HHHHhHHHHHHhHHHH' : r));
const HEAD_TOP: Pix = fill(16, 16, 'H').map((r, j) => (j % 5 === 2 ? 'HHhHHHHhHHHHhHHH' : r));
const HEAD_BOTTOM: Pix = fill(16, 16, 'S');
// outer hair layer (17×17×17 effectively, drawn on the same 16 grid): fringe tufts that stick out
const HAIR_FRONT: Pix = [
  'HHHHHHHHHHHHHHHH', 'HHHHHhHHHHHHhHHH', 'HHHHHHHHHHHHHHHH', 'HHHhHHHHHHHHHHHH',
  'HHHHHHHHHHHHHHHH', 'H.HHHH.HHHH.HHHH', '...HH...HH...HH.', '................',
  ...fill(16, 8, '.'),
];
const HAIR_SIDE: Pix = [
  ...fill(16, 4, 'H'), 'HHHHHHHHHHHHHHH.', 'HHHHHHHHHHHHHH..', 'HHHHHHHHHHH.....', 'HHHHHHH.........', 'HHHHH...........',
  ...fill(16, 7, '.'),
];
const HAIR_BACK: Pix = [...fill(16, 11, 'H'), 'HH.HHH.HHHH.HH.H', ...fill(16, 4, '.')];

// ---- body (16 wide × 20 tall × 8 deep) ----
const BODY_FRONT: Pix = [
  'GGGGGOOOOOOGGGGG',
  'GGGGGGOOOOGGGGGG',
  'GGGGGGGGGGGGGGGG',
  'GGGGGGGwwGGGGGGG',
  'GGGGGGGwwGGGGGGG',
  'GGGwwwwwwwwwwGGG',
  'GGGGwwwwwwwwGGGG',
  'GGGGGwwwwwwGGGGG',
  'GGGGGwwGGwwGGGGG',
  'GGGGwwGGGGwwGGGG',
  'GGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGG',
  'GGGOGGGGGGGGOGGG',
  'GGGGOOOOOOOOGGGG',
  'GGGgGGGGGGGGgGGG',
  'GGGgGGGGGGGGgGGG',
  'GGGgggggggggGGGG',
  'GGGGGGGGGGGGGGGG',
  'gggggggggggggggg',
  'gggggggggggggggg',
];
const BODY_SIDE: Pix = ['GGGOOGGG', ...fill(8, 17, 'G'), 'gggggggg', 'gggggggg'];
const BODY_BACK: Pix = ['GGGGGOOOOOOGGGGG', ...fill(16, 17, 'G'), ...fill(16, 2, 'g')];
const BODY_TOP: Pix = ['GGGGGOOOOOOGGGGG', 'GGGGGOOOOOOGGGGG', ...fill(16, 6, 'G')];
const BODY_BOTTOM: Pix = fill(16, 8, 'g');

// ---- arm (8 × 20 × 8): orange sleeve, yellow cuff, hand ----
const ARM_SIDE: Pix = [...fill(6, 12, 'O').map((r, j) => (j === 11 ? 'oooooo' : r)), 'YYYYYY', 'YYYYYY', ...fill(6, 6, 'S')];
const ARM_TOP: Pix = fill(6, 6, 'O');
const ARM_BOTTOM: Pix = fill(6, 6, 's');

// ---- leg (8 × 16 × 8): green leg, round green foot ----
const LEG_FRONT: Pix = [...fill(8, 11, 'g'), 'gggggggg', 'GGGGGGGG', 'GGGGGGGG', 'GGGGGGGG', 'DDDDDDDD'];
const LEG_TOP: Pix = fill(8, 8, 'g');
const LEG_BOTTOM: Pix = fill(8, 8, 'D');

export function buildBabyMo(): Rig {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const LEG = 16 * PX, TORSO = 20 * PX, HEAD = 16 * PX;
  // legs (pivot at the hip)
  const leg = (side: number) => {
    const g = new THREE.Group(); g.position.set(side * 4 * PX, LEG, 0); body.add(g);
    const m = skinBox(8, 16, 8, [LEG_FRONT, LEG_FRONT, LEG_TOP, LEG_BOTTOM, LEG_FRONT, LEG_FRONT]); m.position.y = -LEG / 2; g.add(m);
    return g;
  };
  const legs = [leg(-1), leg(1)];
  // torso
  const torso = skinBox(16, 20, 8, [BODY_SIDE, BODY_SIDE, BODY_TOP, BODY_BOTTOM, BODY_FRONT, BODY_BACK]);
  torso.position.y = LEG + TORSO / 2; body.add(torso);
  // arms (pivot at the shoulder)
  const arm = (side: number) => {
    const g = new THREE.Group(); g.position.set(side * 11 * PX, LEG + TORSO - 2 * PX, 0); body.add(g);
    const m = skinBox(6, 20, 6, [ARM_SIDE, ARM_SIDE, ARM_TOP, ARM_BOTTOM, ARM_SIDE, ARM_SIDE]); m.position.y = -TORSO / 2 + 2 * PX; g.add(m);
    const hand = new THREE.Group(); hand.position.set(0, -TORSO + 3 * PX, 3 * PX); g.add(hand);
    return { g, hand };
  };
  const L = arm(-1), R = arm(1);
  // head with an outer hair layer
  const headG = new THREE.Group(); headG.position.y = LEG + TORSO; body.add(headG);
  const open = skinMat(FACE_OPEN), shut = skinMat(FACE_SHUT);
  const sideR = skinMat(HEAD_SIDE, false, true), sideL = skinMat(HEAD_SIDE);
  const head = new THREE.Mesh(new THREE.BoxGeometry(HEAD, HEAD, HEAD), [sideR, sideL, skinMat(HEAD_TOP), skinMat(HEAD_BOTTOM), open, skinMat(HEAD_BACK)]);
  head.position.y = HEAD / 2; headG.add(head);
  const hairOuter = new THREE.Mesh(new THREE.BoxGeometry(HEAD * 1.09, HEAD * 1.09, HEAD * 1.09),
    [skinMat(HAIR_SIDE, true, true), skinMat(HAIR_SIDE, true), skinMat(HEAD_TOP, true), skinMat(fill(16, 16, '.'), true), skinMat(HAIR_FRONT, true), skinMat(HAIR_BACK, true)]);
  hairOuter.position.y = HEAD / 2 + HEAD * 0.03; headG.add(hairOuter);
  const blink = (closed: boolean) => { (head.material as THREE.Material[])[4] = closed ? shut : open; };
  return { root, body, head: headG, armL: L.g, armR: R.g, legs, height: LEG + TORSO + HEAD + 0.05, blink, hand: R.hand, hip: LEG, scale: 1 };
}

// ---- humans (player avatar & villagers) ------------------------------------------
export interface HumanOpts { skin: string; shirt: number; pants: number; hair?: number; hijab?: number; peci?: number; beard?: string; robe?: boolean; lashes?: boolean; scale?: number; kid?: boolean; glasses?: boolean; trim?: number }
export function buildHuman(o: HumanOpts): Rig {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const s = o.scale ?? 1; body.scale.setScalar(s);
  const skin = mat(o.skin);
  const kid = !!o.kid;
  const hs = kid ? 0.6 : 0.52;                  // head size
  const headY = kid ? 1.22 : 1.36;
  const f = faceMats(o.skin, { eyes: kid ? 6.4 : 5, lashes: o.lashes, beard: o.beard, glasses: o.glasses, brows: o.beard ? '#777' : undefined });
  const headG = new THREE.Group(); headG.position.y = headY; body.add(headG);
  let headBox: THREE.Group;
  if (o.hijab !== undefined) {
    const hm = mat(o.hijab);
    headBox = soft(hs, hs, hs, skin, 0, hs / 2, 0, 0.05, f.open);
    headG.add(headBox);
    // hijab: frames the face, covers hair & neck, drapes over the shoulders
    headG.add(soft(hs + 0.08, 0.16, hs + 0.08, hm, 0, hs - 0.02, -0.01, 0.04));
    headG.add(box(0.06, hs + 0.04, hs + 0.04, hm, -(hs / 2 + 0.03), hs / 2 - 0.02, -0.01), box(0.06, hs + 0.04, hs + 0.04, hm, hs / 2 + 0.03, hs / 2 - 0.02, -0.01));
    headG.add(box(hs + 0.12, hs + 0.04, 0.08, hm, 0, hs / 2 - 0.02, -(hs / 2 + 0.02)));
    headG.add(box(hs + 0.04, 0.05, 0.05, hm, 0, hs - 0.06, hs / 2 + 0.01));
    headG.add(soft(hs + 0.16, 0.2, hs * 0.9, hm, 0, -0.06, -0.02, 0.04));
    if (o.trim !== undefined) headG.add(box(hs + 0.05, 0.035, 0.03, mat(o.trim), 0, hs - 0.1, hs / 2 + 0.03));
  } else {
    const hair = mat(o.hair ?? 0x2a1d14, 0.18);
    headBox = soft(hs, hs, hs, skin, 0, hs / 2, 0, 0.05, f.open, hair);
    headG.add(headBox);
    headG.add(soft(hs + 0.05, 0.12, hs + 0.05, hair, 0, hs + 0.01, -0.005, 0.03));
    headG.add(box(hs + 0.04, hs * 0.55, 0.08, hair, 0, hs * 0.72, -(hs / 2 + 0.01)));
    headG.add(box(0.05, hs * 0.3, hs * 0.85, hair, -(hs / 2 + 0.01), hs * 0.8, -0.03), box(0.05, hs * 0.3, hs * 0.85, hair, hs / 2 + 0.01, hs * 0.8, -0.03));
    if (o.peci === undefined) headG.add(box(hs * 0.9, 0.08, 0.06, hair, 0.02, hs * 0.92, hs / 2 + 0.01));
    else headG.add(soft(hs + 0.07, 0.17, hs + 0.07, mat(o.peci), 0, hs + 0.05, 0, 0.03));
  }
  headG.add(soft(0.06, 0.12, 0.09, skin, -(hs / 2 + 0.03), hs * 0.48, 0.02, 0.015), soft(0.06, 0.12, 0.09, skin, hs / 2 + 0.03, hs * 0.48, 0.02, 0.015));
  const shirt = mat(o.shirt), pants = mat(o.pants);
  const torsoH = kid ? 0.5 : 0.62, hipY = kid ? 0.66 : 0.74;
  body.add(soft(0.5, torsoH, 0.3, shirt, 0, hipY + torsoH / 2, 0, 0.05));
  if (o.trim !== undefined && o.hijab === undefined) body.add(box(0.05, torsoH - 0.08, 0.02, mat(o.trim), 0, hipY + torsoH / 2, 0.155));
  if (o.robe) body.add(soft(0.52, hipY - 0.1, 0.32, shirt, 0, (hipY + 0.1) / 2 + 0.02, 0, 0.04));
  const armY = hipY + torsoH - 0.04;
  const arm = (side: number) => {
    const a = new THREE.Group(); a.position.set(0.33 * side, armY, 0); body.add(a);
    a.add(softLimb(0.16, torsoH * 0.7, 0.16, shirt, 0, 0, 0));
    a.add(softLimb(0.13, 0.13, 0.13, skin, 0, -torsoH * 0.7, 0));
    const hand = new THREE.Group(); hand.position.set(0, -torsoH * 0.7 - 0.1, 0.06); a.add(hand);
    return { a, hand };
  };
  const L = arm(-1), R = arm(1);
  const leg = (side: number) => {
    const l = new THREE.Group(); l.position.set(0.12 * side, hipY, 0); body.add(l);
    l.add(softLimb(0.19, hipY - 0.06, 0.2, o.robe ? shirt : pants, 0, 0, 0));
    l.add(soft(0.2, 0.09, 0.26, mat(0x3b2a20), 0, -hipY + 0.045, 0.03, 0.025));
    return l;
  };
  const legs = [leg(-1), leg(1)];
  return { root, body, head: headG, armL: L.a, armR: R.a, legs, height: (headY + hs + 0.1) * s, blink: blinker(frontOf(headBox), f), hand: R.hand, hip: hipY, scale: s };
}

// ---- animals -------------------------------------------------------------------
export type AnimalKind = 'chicken' | 'sheep' | 'cow' | 'camel' | 'goat' | 'cat';

function quad(bodyW: number, bodyH: number, bodyL: number, legH: number, bodyM: THREE.Material | THREE.Material[], legM: THREE.Material) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  body.add(box(bodyW, bodyH, bodyL, bodyM, 0, legH + bodyH / 2, 0));
  const legs: THREE.Object3D[] = [];
  const lx = bodyW / 2 - 0.1, lz = bodyL / 2 - 0.12;
  for (const [x, z] of [[-lx, lz], [lx, lz], [-lx, -lz], [lx, -lz]]) { const l = limb(0.16, legH, 0.16, legM, x, legH, z); legs.push(l); body.add(l); }
  return { root, body, legs };
}

export function buildAnimal(kind: AnimalKind): Rig & { wool?: THREE.Object3D } {
  const r = buildAnimalParts(kind);
  // one mesh per material for each moving part; the wool stays its own part (it shrinks when sheared)
  mergeRig(r.root, [r.body, r.head, ...r.legs, ...(r.wool ? [r.wool] : [])]);
  return r;
}
function buildAnimalParts(kind: AnimalKind): Rig & { wool?: THREE.Object3D } {
  const eye = mat(0x1a1a1a);
  if (kind === 'chicken') {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const w = mat(0xfafafa);
    body.add(box(0.36, 0.32, 0.46, w, 0, 0.42, 0));
    const head = new THREE.Group(); head.position.set(0, 0.62, 0.22); body.add(head);
    head.add(box(0.24, 0.28, 0.2, w, 0, 0.08, 0));
    head.add(box(0.12, 0.08, 0.12, mat(0xf2a33a), 0, 0.06, 0.14));
    head.add(box(0.08, 0.1, 0.06, mat(0xe4423a), 0, -0.04, 0.12));
    head.add(box(0.06, 0.1, 0.14, mat(0xe4423a), 0, 0.26, 0.02));
    head.add(box(0.26, 0.05, 0.05, eye, 0, 0.13, 0.08));
    const legs = [limb(0.06, 0.26, 0.06, mat(0xf2a33a), -0.08, 0.26, 0), limb(0.06, 0.26, 0.06, mat(0xf2a33a), 0.08, 0.26, 0)];
    body.add(...legs);
    body.add(box(0.06, 0.2, 0.3, w, -0.2, 0.44, -0.02), box(0.06, 0.2, 0.3, w, 0.2, 0.44, -0.02));
    return { root, body, head, legs, height: 0.9 };
  }
  if (kind === 'sheep') {
    const woolM = mat(0xf4f1ea), face = mat(0x4a4040);
    const q = quad(0.62, 0.5, 0.9, 0.42, woolM, face);
    const wool = q.body.children[0];
    const head = new THREE.Group(); head.position.set(0, 0.86, 0.48); q.body.add(head);
    head.add(box(0.34, 0.34, 0.34, face, 0, 0, 0.06));
    head.add(box(0.38, 0.14, 0.3, woolM, 0, 0.18, 0.02));
    head.add(box(0.36, 0.06, 0.04, eye, 0, 0.02, 0.24));
    head.add(box(0.06, 0.12, 0.16, face, -0.22, 0.02, 0), box(0.06, 0.12, 0.16, face, 0.22, 0.02, 0));
    return { root: q.root, body: q.body, head, legs: q.legs, height: 1.1, wool };
  }
  if (kind === 'cow') {
    const hide = ctex(16, 16, x => { x.fillStyle = '#f5f0e8'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#5b3a24'; x.fillRect(1, 2, 6, 5); x.fillRect(9, 8, 6, 6); x.fillRect(11, 1, 3, 3); x.fillRect(2, 11, 3, 3); });
    const hm = mat(hide), dark = mat(0x5b3a24);
    const q = quad(0.7, 0.62, 1.1, 0.5, hm, dark);
    const head = new THREE.Group(); head.position.set(0, 1.08, 0.6); q.body.add(head);
    head.add(box(0.46, 0.42, 0.36, hm, 0, 0, 0.08));
    head.add(box(0.36, 0.18, 0.08, mat(0xf2b8a8), 0, -0.1, 0.28));
    head.add(box(0.48, 0.06, 0.04, eye, 0, 0.08, 0.27));
    head.add(box(0.1, 0.16, 0.08, mat(0xeee6c8), -0.27, 0.24, 0.04), box(0.1, 0.16, 0.08, mat(0xeee6c8), 0.27, 0.24, 0.04));
    return { root: q.root, body: q.body, head, legs: q.legs, height: 1.4 };
  }
  if (kind === 'camel') {
    const tan = mat(0xd2a86a), tanD = mat(0xb88a50);
    const q = quad(0.62, 0.6, 1.2, 0.95, tan, tanD);
    q.body.add(box(0.46, 0.4, 0.5, tan, 0, 1.75, -0.05));
    const neck = new THREE.Group(); neck.position.set(0, 1.4, 0.55); q.body.add(neck);
    neck.add(box(0.24, 0.7, 0.24, tan, 0, 0.3, 0.12));
    const head = new THREE.Group(); head.position.set(0, 0.68, 0.22); neck.add(head);
    head.add(box(0.3, 0.28, 0.5, tan, 0, 0, 0.12));
    head.add(box(0.32, 0.05, 0.05, eye, 0, 0.06, 0.18));
    head.add(box(0.08, 0.12, 0.06, tanD, -0.12, 0.18, -0.04), box(0.08, 0.12, 0.06, tanD, 0.12, 0.18, -0.04));
    return { root: q.root, body: q.body, head, legs: q.legs, height: 2.3 };
  }
  if (kind === 'goat') {
    const wh = mat(0xe9e4da), gr = mat(0x8c857a);
    const q = quad(0.5, 0.46, 0.8, 0.46, wh, gr);
    const head = new THREE.Group(); head.position.set(0, 0.98, 0.42); q.body.add(head);
    head.add(box(0.3, 0.32, 0.36, wh, 0, 0, 0.06));
    head.add(box(0.32, 0.05, 0.04, eye, 0, 0.06, 0.24));
    head.add(box(0.06, 0.2, 0.06, gr, -0.1, 0.24, -0.04), box(0.06, 0.2, 0.06, gr, 0.1, 0.24, -0.04));
    head.add(box(0.08, 0.14, 0.06, wh, 0, -0.22, 0.18));
    return { root: q.root, body: q.body, head, legs: q.legs, height: 1.2 };
  }
  // cat
  const fur = ctex(16, 16, x => { x.fillStyle = '#f2a24a'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#d27a2a'; for (let i = 0; i < 16; i += 4) x.fillRect(i, 0, 2, 16); });
  const fm = mat(fur), lt = mat(0xf2a24a);
  const q = quad(0.3, 0.26, 0.62, 0.22, fm, lt);
  const head = new THREE.Group(); head.position.set(0, 0.56, 0.36); q.body.add(head);
  head.add(box(0.3, 0.26, 0.26, lt, 0, 0, 0.04));
  head.add(box(0.08, 0.1, 0.06, lt, -0.1, 0.17, 0), box(0.08, 0.1, 0.06, lt, 0.1, 0.17, 0));
  head.add(box(0.24, 0.05, 0.04, mat(0x2d8a3a), 0, 0.03, 0.18));
  const tail = new THREE.Group(); tail.position.set(0, 0.42, -0.3); q.body.add(tail);
  tail.add(box(0.07, 0.4, 0.07, fm, 0, 0.18, -0.05));
  return { root: q.root, body: q.body, head, legs: q.legs, height: 0.75 };
}

// ---- floating labels & hearts --------------------------------------------------
export function nameTag(text: string, color = '#ffffff') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d')!;
  x.font = 'bold 30px Nunito, system-ui, sans-serif';
  const w = Math.min(250, x.measureText(text).width + 28);
  x.fillStyle = 'rgba(15,32,22,0.72)';
  x.beginPath(); x.roundRect((256 - w) / 2, 10, w, 44, 18); x.fill();
  x.fillStyle = color; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 33);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(1.1, 0.275, 1);
  return s;
}
/** a white speech bubble with a little tail, for villagers' greetings */
export function speechBubble(text: string) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const x = c.getContext('2d')!;
  x.font = '800 38px Nunito, system-ui, sans-serif';
  const w = Math.min(500, x.measureText(text).width + 44);
  x.fillStyle = 'rgba(255,255,255,0.96)'; x.strokeStyle = 'rgba(15,32,22,0.25)'; x.lineWidth = 4;
  x.beginPath(); x.roundRect((512 - w) / 2, 8, w, 86, 30); x.fill(); x.stroke();
  x.beginPath(); x.moveTo(236, 92); x.lineTo(256, 122); x.lineTo(276, 92); x.closePath(); x.fill();
  x.fillStyle = '#1d2b22'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 256, 52);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  sp.scale.set(2.0, 0.5, 1); sp.renderOrder = 5;
  return sp;
}
let heartTex: THREE.Texture | null = null, sparkTex: THREE.Texture | null = null;
export function heartTexture() {
  return heartTex ??= ctex(32, 32, x => {
    x.fillStyle = '#ff5c8a';
    const px = [[1, 0, 1, 1, 0, 1, 1, 0], [1, 1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 1, 1], [0, 1, 1, 1, 1, 1, 1, 0], [0, 0, 1, 1, 1, 1, 0, 0], [0, 0, 0, 1, 1, 0, 0, 0]];
    px.forEach((r, y) => r.forEach((v, i) => { if (v) x.fillRect(i * 4, (y + 1) * 4, 4, 4); }));
    x.clearRect(0, 4, 4, 4); x.clearRect(12, 4, 8, 4); x.clearRect(28, 4, 4, 4);
  });
}
export function sparkTexture() {
  return sparkTex ??= ctex(32, 32, x => {
    const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,250,210,1)'); g.addColorStop(0.4, 'rgba(255,216,116,.8)'); g.addColorStop(1, 'rgba(255,216,116,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  });
}

// ---- prayer movements (gentle, simplified) ----------------------------------------
export type PrayerPose = 'qiyam' | 'ruku' | 'sujud' | 'julus';
/** order of one rakaat, seconds per pose */
export const PRAYER_CYCLE: [PrayerPose, number][] = [['qiyam', 4], ['ruku', 2.5], ['qiyam', 1.5], ['sujud', 2.5], ['julus', 1.5], ['sujud', 2.5]];
export function poseAt(t: number): PrayerPose {
  const total = PRAYER_CYCLE.reduce((a, [, d]) => a + d, 0);
  let x = t % total;
  for (const [p, d] of PRAYER_CYCLE) { if (x < d) return p; x -= d; }
  return 'qiyam';
}
/** bend a human rig around the hips; legs stay put. Call every frame (it overrides walk swings). */
export function applyPrayerPose(r: Rig, pose: PrayerPose | null) {
  const hip = r.hip ?? 0.7, s = r.scale ?? 1;
  const body = r.body;
  let tilt = 0, drop = 0, leg = 0, arms = 0;
  if (pose === 'qiyam') arms = -0.9;
  else if (pose === 'ruku') { tilt = 1.35; arms = -1.2; }
  else if (pose === 'sujud') { leg = 1.05; drop = hip * (1 - Math.cos(leg)); tilt = 1.95; arms = -2.5; }   // knees down, forehead to the floor
  else if (pose === 'julus') { leg = 1.5; drop = hip * (1 - Math.cos(leg)) - 0.04; arms = -0.4; }            // sitting back on the heels
  // rotate the body about the hip joint
  body.rotation.x = tilt;
  const hy = hip * s;
  body.position.set(0, (hy - hy * Math.cos(tilt)) - drop * s, -hy * Math.sin(tilt));
  for (const l of r.legs) { l.rotation.x = -tilt + leg; l.rotation.z = 0; }
  if (r.armL) { r.armL.rotation.set(arms, 0, pose === 'qiyam' ? 0.5 : 0); }
  if (r.armR) { r.armR.rotation.set(arms, 0, pose === 'qiyam' ? -0.5 : 0); }
  r.head.rotation.x = 0;
}
export function clearPose(r: Rig) { r.body.rotation.x = 0; r.body.position.set(0, 0, 0); }
