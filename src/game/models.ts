// Blocky character & animal models built from boxes (original designs).
// Characters use "chamfered" boxes (three overlapping boxes) so heads and
// bodies read as soft and rounded, and smooth hand-drawn faces that blink.
import * as THREE from 'three';

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
  hip?: number; scale?: number;
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

// ---- Baby Mo -------------------------------------------------------------------
// A toddler: big round head with a black swoopy fringe, green star onesie
// (with feet), orange sleeves with yellow cuffs.
export function buildBabyMo(): Rig {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const SKIN = '#F7C8A2', HAIR = '#17171B', HAIR_HI = '#2E2E36';
  const skin = mat(SKIN, 0.34), hair = mat(HAIR, 0.12);
  const green = mat(0x4fcf4a, 0.3), greenD = mat(0x3fb83c, 0.3), orange = mat(0xf58f4f, 0.3), yellow = mat(0xf7e27a, 0.3);
  const S = 128;
  // --- head textures: the fringe is painted on, so it reads as soft hair, not blocks
  const fringe = (x: CanvasRenderingContext2D, side: boolean) => {
    x.fillStyle = HAIR;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(S, 0);
    if (side) { x.lineTo(S, S * 0.36); x.quadraticCurveTo(S * 0.75, S * 0.42, S * 0.5, S * 0.3); x.quadraticCurveTo(S * 0.3, S * 0.4, 0, S * 0.36); }
    else {
      // a fringe that sweeps to one side with a few soft points
      x.lineTo(S, S * 0.42);
      x.quadraticCurveTo(S * 0.9, S * 0.3, S * 0.84, S * 0.36);
      x.quadraticCurveTo(S * 0.74, S * 0.24, S * 0.64, S * 0.34);
      x.quadraticCurveTo(S * 0.52, S * 0.2, S * 0.42, S * 0.32);
      x.quadraticCurveTo(S * 0.3, S * 0.18, S * 0.2, S * 0.3);
      x.quadraticCurveTo(S * 0.1, S * 0.2, 0, S * 0.34);
    }
    x.closePath(); x.fill();
    x.strokeStyle = HAIR_HI; x.lineWidth = 3; x.lineCap = 'round';
    for (const [a, b, c] of side ? [[0.2, 0.08, 0.3]] : [[0.3, 0.06, 0.24], [0.6, 0.05, 0.22], [0.82, 0.08, 0.3]]) { x.beginPath(); x.moveTo(S * a, S * b); x.quadraticCurveTo(S * (a + 0.05), S * (b + c / 2), S * (a - 0.02), S * c); x.stroke(); }
  };
  const faceTex = (closed: boolean) => ctex(S, S, x => {
    x.fillStyle = SKIN; x.fillRect(0, 0, S, S);
    const ell = (cx: number, cy: number, rx: number, ry: number, c: string) => { x.fillStyle = c; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fill(); };
    // rosy cheeks
    x.globalAlpha = 0.5; ell(S * 0.15, S * 0.76, S * 0.12, S * 0.085, '#FF8C7A'); ell(S * 0.85, S * 0.76, S * 0.12, S * 0.085, '#FF8C7A'); x.globalAlpha = 1;
    // big, low-set eyes
    for (const ex of [S * 0.3, S * 0.7]) {
      const ey = S * 0.58, r = S * 0.135;
      if (closed) {
        x.strokeStyle = '#2A1A10'; x.lineWidth = 4; x.lineCap = 'round';
        x.beginPath(); x.arc(ex, ey - r * 0.2, r * 0.8, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke();
      } else {
        ell(ex, ey, r * 0.92, r, '#FFFFFF');
        ell(ex, ey + r * 0.08, r * 0.8, r * 0.88, '#6B3A1E');
        ell(ex, ey + r * 0.15, r * 0.55, r * 0.6, '#2B160A');
        ell(ex + r * 0.3, ey - r * 0.32, r * 0.28, r * 0.28, '#FFFFFF');
        ell(ex - r * 0.3, ey + r * 0.38, r * 0.12, r * 0.12, '#FFFFFF');
        x.strokeStyle = '#1B120C'; x.lineWidth = 4.5; x.lineCap = 'round';
        x.beginPath(); x.ellipse(ex, ey, r * 0.95, r * 1.02, 0, 1.1 * Math.PI, 1.9 * Math.PI); x.stroke();
      }
      // small brows peeking under the fringe
      x.strokeStyle = '#3A2414'; x.lineWidth = 3.5;
      x.beginPath(); x.arc(ex, ey - r * 0.35, r * 1.35, 1.36 * Math.PI, 1.64 * Math.PI); x.stroke();
    }
    // nose & a small happy smile
    ell(S * 0.5, S * 0.72, S * 0.022, S * 0.016, 'rgba(200,110,80,.55)');
    x.fillStyle = '#8E2F22'; x.beginPath(); x.moveTo(S * 0.42, S * 0.81); x.quadraticCurveTo(S * 0.5, S * 0.95, S * 0.58, S * 0.81); x.closePath(); x.fill();
    x.fillStyle = '#FF8E8E'; x.beginPath(); x.ellipse(S * 0.5, S * 0.875, S * 0.04, S * 0.022, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#FFFFFF'; x.fillRect(S * 0.45, S * 0.81, S * 0.1, S * 0.018);
    fringe(x, false);
  }, true);
  const sideTex = ctex(S, S, x => { x.fillStyle = SKIN; x.fillRect(0, 0, S, S); fringe(x, true); x.fillStyle = HAIR; x.fillRect(S * 0.72, 0, S * 0.28, S * 0.62); }, true);
  const sideTexR = ctex(S, S, x => { x.fillStyle = SKIN; x.fillRect(0, 0, S, S); fringe(x, true); x.fillStyle = HAIR; x.fillRect(0, 0, S * 0.28, S * 0.62); }, true);
  const backTex = ctex(S, S, x => { x.fillStyle = HAIR; x.fillRect(0, 0, S, S * 0.66); x.fillStyle = SKIN; x.fillRect(0, S * 0.66, S, S * 0.34); x.fillStyle = HAIR; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(i * S / 4, S * 0.64); x.quadraticCurveTo(i * S / 4 + S / 8, S * 0.76, (i + 1) * S / 4, S * 0.64); x.fill(); } }, true);
  const open = mat(faceTex(false), 0.32), shut = mat(faceTex(true), 0.32);
  const sideL = mat(sideTex, 0.32), sideR = mat(sideTexR, 0.32), back = mat(backTex, 0.2);

  // --- head (big & round-ish), hair volume on top, big ears
  const headG = new THREE.Group(); headG.position.y = 0.7; body.add(headG);
  const HW = 0.76, HH = 0.68, HD = 0.66;
  const headBox = new THREE.Group(); headBox.position.y = HH / 2;
  const c = 0.08;
  // three overlapping boxes give rounded edges; faces: +x, -x, +y, -y, +z(front), -z(back)
  headBox.add(new THREE.Mesh(new THREE.BoxGeometry(HW, HH - c * 2, HD - c * 2), [sideR, sideL, hair, skin, open, back]));
  headBox.add(new THREE.Mesh(new THREE.BoxGeometry(HW - c * 2, HH, HD - c * 2), [sideR, sideL, hair, skin, open, back]));
  const front = new THREE.Mesh(new THREE.BoxGeometry(HW - c * 2, HH - c * 2, HD), [sideR, sideL, hair, skin, open, back]);
  headBox.add(front);
  headG.add(headBox);
  // a thin, soft hair cap and a swooping tuft on top (no spiky blocks)
  headG.add(soft(HW + 0.04, 0.09, HD + 0.04, hair, 0, HH + 0.02, -0.01, 0.04));
  const tuft = (x: number, y: number, z: number, w: number, h: number, d: number, rz: number) => { const t = soft(w, h, d, hair, x, y, z, 0.03); t.rotation.set(0, 0, rz); headG.add(t); };
  tuft(0.06, HH + 0.1, 0.06, 0.34, 0.08, 0.3, -0.18);
  tuft(-0.16, HH + 0.08, -0.12, 0.2, 0.07, 0.22, 0.22);
  headG.add(box(HW + 0.03, HH * 0.4, 0.05, hair, 0, HH * 0.78, -HD / 2 - 0.01));
  const ear = (sx: number) => { const e = soft(0.08, 0.17, 0.13, skin, sx * (HW / 2 + 0.035), HH * 0.47, 0.02, 0.03); headG.add(e); const inner = box(0.02, 0.09, 0.06, mat('#F2A98A', 0.3), sx * (HW / 2 + 0.075), HH * 0.47, 0.02); headG.add(inner); };
  ear(-1); ear(1);

  // --- body: green onesie with white star & orange smile stripe, orange shirt peeking at the neck
  const star = ctex(S, S, x => {
    x.fillStyle = '#4FCF4A'; x.fillRect(0, 0, S, S);
    x.fillStyle = '#EDEDED'; x.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? S * 0.11 : S * 0.24, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(S / 2 + Math.cos(a) * r, S * 0.38 + Math.sin(a) * r); }
    x.closePath(); x.fill();
    x.strokeStyle = '#F58F4F'; x.lineWidth = S * 0.05; x.lineCap = 'round';
    x.beginPath(); x.moveTo(S * 0.28, S * 0.72); x.quadraticCurveTo(S * 0.5, S * 0.8, S * 0.72, S * 0.72); x.stroke();
  }, true);
  body.add(soft(0.52, 0.38, 0.38, green, 0, 0.52, 0, 0.09, mat(star, 0.3)));
  body.add(soft(0.3, 0.05, 0.24, orange, 0, 0.72, 0, 0.02));         // shirt collar
  // arms: orange sleeve, yellow cuff, little hand
  const arm = (side: number) => {
    const a = new THREE.Group(); a.position.set(0.32 * side, 0.68, 0); body.add(a);
    a.add(softLimb(0.15, 0.17, 0.15, orange, 0, 0, 0, 0.04));
    a.add(softLimb(0.155, 0.055, 0.155, yellow, 0, -0.155, 0, 0.02));
    a.add(softLimb(0.13, 0.09, 0.13, skin, 0, -0.205, 0, 0.045));
    const hand = new THREE.Group(); hand.position.set(0, -0.27, 0.04); a.add(hand);
    return { a, hand };
  };
  const L = arm(-1), R = arm(1);
  // short legs with round green feet
  const leg = (side: number) => {
    const l = new THREE.Group(); l.position.set(0.125 * side, 0.34, 0); body.add(l);
    l.add(softLimb(0.21, 0.24, 0.23, greenD, 0, 0, 0, 0.06));
    l.add(soft(0.23, 0.1, 0.29, green, 0, -0.29, 0.035, 0.045));
    return l;
  };
  const legs = [leg(-1), leg(1)];
  const blink = (closed: boolean) => { for (const m of headBox.children as THREE.Mesh[]) (m.material as THREE.Material[])[4] = closed ? shut : open; };
  return { root, body, head: headG, armL: L.a, armR: R.a, legs, height: 1.52, blink, hand: R.hand, hip: 0.34, scale: 1 };
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
