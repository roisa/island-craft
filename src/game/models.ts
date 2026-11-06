// Blocky character & animal models built from boxes (original designs).
import * as THREE from 'three';

const matCache = new Map<string, THREE.Material>();
export function mat(c: number | string | THREE.Texture): THREE.Material {
  if (c instanceof THREE.Texture) return new THREE.MeshLambertMaterial({ map: c });
  const k = String(c);
  let m = matCache.get(k);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: c as THREE.ColorRepresentation }); matCache.set(k, m); }
  return m;
}
function ctex(w: number, h: number, draw: (x: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!; draw(x);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
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

export interface Rig { root: THREE.Group; body: THREE.Group; head: THREE.Object3D; armL?: THREE.Object3D; armR?: THREE.Object3D; legs: THREE.Object3D[]; height: number }

// ---- faces -------------------------------------------------------------------
function face(skin: string, opts: { big?: boolean; beard?: string; lashes?: boolean } = {}) {
  return ctex(32, 32, x => {
    x.fillStyle = skin; x.fillRect(0, 0, 32, 32);
    const ey = opts.big ? 14 : 13, er = opts.big ? 4 : 3;
    // eyes
    for (const ex of [10, 22]) {
      x.fillStyle = '#ffffff'; x.fillRect(ex - er, ey - er, er * 2, er * 2 + 1);
      x.fillStyle = '#3a2416'; x.fillRect(ex - er + 1, ey - er + 1, er * 2 - 1, er * 2);
      x.fillStyle = '#ffffff'; x.fillRect(ex - er + 1, ey - er + 1, 2, 2);
      if (opts.lashes) { x.fillStyle = '#1a1a1a'; x.fillRect(ex - er - 1, ey - er - 1, er * 2 + 2, 1); }
    }
    // cheeks
    x.fillStyle = 'rgba(255,120,110,0.45)'; x.fillRect(4, 20, 5, 3); x.fillRect(23, 20, 5, 3);
    // mouth
    x.fillStyle = '#9b4a3a'; x.fillRect(13, 23, 6, 2); x.fillRect(12, 22, 1, 1); x.fillRect(19, 22, 1, 1);
    if (opts.beard) { x.fillStyle = opts.beard; x.fillRect(5, 24, 22, 8); x.fillRect(3, 18, 3, 10); x.fillRect(26, 18, 3, 10); x.fillStyle = '#9b4a3a'; x.fillRect(13, 24, 6, 2); }
  });
}

// ---- Baby Mo -------------------------------------------------------------------
export function buildBabyMo(): Rig {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const skin = '#F2C3A0', green = 0x4CC34A, greenD = 0x3AA338, orange = 0xF29A5B, yellow = 0xF5E07A;
  const headG = new THREE.Group(); headG.position.y = 0.92; body.add(headG);
  const skinM = mat(skin), hair = mat(0x1b1b1f);
  const headMats = [skinM, skinM, hair, skinM, mat(face(skin, { big: true })), skinM];
  headG.add(box(0.64, 0.58, 0.58, headMats, 0, 0.27, 0));
  // hair: top cap + fringe tufts + back
  headG.add(box(0.68, 0.16, 0.62, hair, 0, 0.6, 0));
  headG.add(box(0.68, 0.22, 0.14, hair, 0, 0.47, -0.25));
  headG.add(box(0.18, 0.12, 0.08, hair, -0.18, 0.47, 0.3));
  headG.add(box(0.22, 0.1, 0.08, hair, 0.08, 0.5, 0.3));
  headG.add(box(0.1, 0.12, 0.12, hair, 0.26, 0.7, -0.05));
  // ears
  headG.add(box(0.08, 0.14, 0.1, skinM, -0.35, 0.25, 0)); headG.add(box(0.08, 0.14, 0.1, skinM, 0.35, 0.25, 0));
  // onesie with star
  const star = ctex(32, 32, x => {
    x.fillStyle = '#4CC34A'; x.fillRect(0, 0, 32, 32);
    x.fillStyle = '#f4f4f4'; x.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 5 : 11, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(16 + Math.cos(a) * r, 13 + Math.sin(a) * r); }
    x.fill(); x.fillStyle = '#F29A5B'; x.fillRect(9, 25, 14, 2);
  });
  const gm = mat(green);
  body.add(box(0.46, 0.46, 0.32, [gm, gm, gm, gm, mat(star), gm], 0, 0.67, 0));
  const armL = new THREE.Group(); armL.position.set(-0.3, 0.86, 0); body.add(armL);
  const armR = new THREE.Group(); armR.position.set(0.3, 0.86, 0); body.add(armR);
  for (const a of [armL, armR]) { a.add(limb(0.15, 0.24, 0.15, mat(orange), 0, 0, 0)); a.add(limb(0.14, 0.07, 0.14, mat(yellow), 0, -0.22, 0)); a.add(limb(0.12, 0.08, 0.12, skinM, 0, -0.29, 0)); }
  const legL = limb(0.19, 0.36, 0.22, mat(greenD), -0.12, 0.44, 0), legR = limb(0.19, 0.36, 0.22, mat(greenD), 0.12, 0.44, 0);
  legL.add(box(0.21, 0.1, 0.27, gm, 0, -0.33, 0.03)); legR.add(box(0.21, 0.1, 0.27, gm, 0, -0.33, 0.03));
  body.add(legL, legR);
  return { root, body, head: headG, armL, armR, legs: [legL, legR], height: 1.6 };
}

// ---- humans (player avatar & villagers) ------------------------------------------
export interface HumanOpts { skin: string; shirt: number; pants: number; hair?: number; hijab?: number; peci?: number; beard?: string; robe?: boolean; lashes?: boolean; scale?: number }
export function buildHuman(o: HumanOpts): Rig {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const s = o.scale ?? 1; body.scale.setScalar(s);
  const skinM = mat(o.skin);
  const headG = new THREE.Group(); headG.position.y = 1.36; body.add(headG);
  const f = mat(face(o.skin, { beard: o.beard, lashes: o.lashes }));
  if (o.hijab !== undefined) {
    const hm = mat(o.hijab);
    headG.add(box(0.5, 0.5, 0.5, [skinM, skinM, skinM, skinM, f, skinM], 0, 0.25, 0));
    headG.add(box(0.58, 0.14, 0.58, hm, 0, 0.54, 0));
    headG.add(box(0.06, 0.56, 0.58, hm, -0.28, 0.22, 0)); headG.add(box(0.06, 0.56, 0.58, hm, 0.28, 0.22, 0));
    headG.add(box(0.58, 0.56, 0.06, hm, 0, 0.22, -0.28));
    headG.add(box(0.62, 0.16, 0.5, hm, 0, -0.04, 0)); // drape over shoulders
    headG.add(box(0.5, 0.06, 0.04, hm, 0, 0.47, 0.26));
  } else {
    const hair = mat(o.hair ?? 0x2a1d14);
    headG.add(box(0.5, 0.5, 0.5, [skinM, skinM, hair, skinM, f, skinM], 0, 0.25, 0));
    headG.add(box(0.54, 0.12, 0.54, hair, 0, 0.51, 0));
    headG.add(box(0.54, 0.26, 0.1, hair, 0, 0.38, -0.23));
    if (o.peci !== undefined) headG.add(box(0.54, 0.14, 0.54, mat(o.peci), 0, 0.58, 0));
  }
  const shirt = mat(o.shirt), pants = mat(o.pants);
  body.add(box(0.5, 0.62, 0.3, shirt, 0, 1.05, 0));
  if (o.robe) body.add(box(0.52, 0.42, 0.32, shirt, 0, 0.6, 0));
  const armL = new THREE.Group(); armL.position.set(-0.33, 1.34, 0); body.add(armL);
  const armR = new THREE.Group(); armR.position.set(0.33, 1.34, 0); body.add(armR);
  for (const a of [armL, armR]) { a.add(limb(0.16, 0.42, 0.16, shirt, 0, 0, 0)); a.add(limb(0.14, 0.14, 0.14, skinM, 0, -0.42, 0)); }
  const legL = limb(0.2, 0.74, 0.2, o.robe ? shirt : pants, -0.12, 0.74, 0), legR = limb(0.2, 0.74, 0.2, o.robe ? shirt : pants, 0.12, 0.74, 0);
  legL.add(box(0.21, 0.1, 0.26, mat(0x3b2a20), 0, -0.69, 0.03)); legR.add(box(0.21, 0.1, 0.26, mat(0x3b2a20), 0, -0.69, 0.03));
  body.add(legL, legR);
  return { root, body, head: headG, armL, armR, legs: [legL, legR], height: 1.9 * s };
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
  s.scale.set(1.6, 0.4, 1);
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
