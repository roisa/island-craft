// Builds chunk geometry: culled cube faces with ambient occlusion, soft sky
// light from column heightmaps, warm block light from lanterns/torches, cross
// sprites for plants, and a separate translucent water surface.
import * as THREE from 'three';
import { BLOCKS, B } from './blocks';
import { layerOf } from './atlas';
import { CS, H } from './gen';

export interface MeshInput {
  /** padded block array (CS+2)² × H, index ((y*(P)+z)*(P)+x) with x,z shifted by +1 */
  pad: Uint8Array;
  /** padded heightmap (CS+2)² */
  hm: Int16Array;
  /** emitters near this chunk in chunk-local coords: x,y,z,level */
  lights: number[];
  ox: number; oz: number;
}

export const PS = CS + 2;
export const pidx = (x: number, y: number, z: number) => (y * PS + (z + 1)) * PS + (x + 1);

// per-block lookup tables
const OPAQUE = new Uint8Array(256), RENDER = new Uint8Array(256), CUT = new Uint8Array(256), GLASSY = new Uint8Array(256), EMIT = new Float32Array(256);
const LT = new Int16Array(256), LS = new Int16Array(256), LB = new Int16Array(256), LF = new Int16Array(256);
export function initMesherTables() {
  for (let id = 0; id < 256; id++) {
    const b = BLOCKS[id];
    if (!b) { RENDER[id] = 0; continue; }
    OPAQUE[id] = b.opaque ? 1 : 0;
    RENDER[id] = b.render === 'cube' ? 1 : b.render === 'cross' ? 2 : b.render === 'water' ? 3 : 0;
    CUT[id] = b.cutout ? 1 : 0;
    GLASSY[id] = b.glassy ? 1 : 0;
    EMIT[id] = b.light ?? 0;
    LT[id] = layerOf.get(b.top) ?? 0; LS[id] = layerOf.get(b.side) ?? 0; LB[id] = layerOf.get(b.bottom) ?? 0;
    LF[id] = layerOf.get(b.front ?? b.side) ?? 0;
  }
}
export const isOpaque = (id: number) => OPAQUE[id] === 1;
export const emission = (id: number) => EMIT[id];

class Buf {
  pos: number[] = []; uv: number[] = []; layer: number[] = []; light: number[] = []; index: number[] = [];
  n = 0;
  build(): THREE.BufferGeometry | null {
    if (!this.n) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('layer', new THREE.Float32BufferAttribute(this.layer, 1));
    g.setAttribute('light', new THREE.Float32BufferAttribute(this.light, 3));
    g.setIndex(this.n > 65535 ? new THREE.Uint32BufferAttribute(this.index, 1) : new THREE.Uint16BufferAttribute(this.index, 1));
    g.computeBoundingSphere();
    return g;
  }
}

// Face definitions: normal, 4 corners (counter-clockwise seen from outside), uv per corner, shade
const FACES = [
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1.0, kind: 0 },   // top
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: 0.55, kind: 2 }, // bottom
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.82, kind: 3 },  // south (+z) = front
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.82, kind: 1 }, // north
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: 0.68, kind: 1 },  // east
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.68, kind: 1 }, // west
] as const;
const UVS = [[0, 0], [1, 0], [1, 1], [0, 1]];
const AO = [0.42, 0.62, 0.8, 1];

export interface ChunkGeoms { solid: THREE.BufferGeometry | null; cross: THREE.BufferGeometry | null; water: THREE.BufferGeometry | null }

export function meshChunk(inp: MeshInput): ChunkGeoms {
  const { pad, hm, lights } = inp;
  const solid = new Buf(), cross = new Buf(), water = new Buf();
  const get = (x: number, y: number, z: number) => (y < 0 ? B.BEDROCK : y >= H ? 0 : pad[pidx(x, y, z)]);
  const occ = (x: number, y: number, z: number) => (y >= 0 && y < H && OPAQUE[pad[pidx(x, y, z)]] === 1 ? 1 : 0);

  const skyAt = (x: number, y: number, z: number) => {
    const top = hm[(z + 1) * PS + (x + 1)];
    if (y > top) return 1;
    const v = 1 - (top - y + 1) * 0.09;
    return v < 0.16 ? 0.16 : v;
  };
  const blockLightAt = (x: number, y: number, z: number) => {
    let best = 0;
    for (let i = 0; i < lights.length; i += 4) {
      const dx = x - lights[i], dy = y - lights[i + 1], dz = z - lights[i + 2];
      const d2 = dx * dx + dy * dy + dz * dz;
      const lv = lights[i + 3], R = 11 * lv + 1;
      if (d2 >= R * R) continue;
      const v = lv * (1 - Math.sqrt(d2) / R);
      if (v > best) best = v;
    }
    return best;
  };

  for (let y = 0; y < H; y++) for (let z = 0; z < CS; z++) for (let x = 0; x < CS; x++) {
    const id = pad[pidx(x, y, z)];
    if (!id) continue;
    const r = RENDER[id];
    if (r === 0) continue;
    const emit = EMIT[id];

    if (r === 2) { // cross sprite
      const L = LS[id];
      const sky = skyAt(x, y, z), bl = Math.max(blockLightAt(x + 0.5, y + 0.5, z + 0.5), emit);
      const quads = [[[0.15, 0.15], [0.85, 0.85]], [[0.85, 0.15], [0.15, 0.85]]];
      for (const [[ax, az], [bx, bz]] of quads) {
        const base = cross.n;
        const pts = [[ax, 0, az], [bx, 0, bz], [bx, 1, bz], [ax, 1, az]];
        for (let k = 0; k < 4; k++) {
          cross.pos.push(x + pts[k][0], y + pts[k][1], z + pts[k][2]);
          cross.uv.push(UVS[k][0], UVS[k][1]); cross.layer.push(L); cross.light.push(1, sky, bl);
        }
        cross.index.push(base, base + 1, base + 2, base, base + 2, base + 3);
        cross.n += 4;
      }
      continue;
    }

    for (let f = 0; f < 6; f++) {
      const F = FACES[f];
      const nx = x + F.n[0], ny = y + F.n[1], nz = z + F.n[2];
      const nb = get(nx, ny, nz);
      if (r === 3) { // water
        if (nb === B.WATER || OPAQUE[nb] || nb === B.ICE) continue;
        if (f === 1 && nb !== 0) continue;
      } else {
        if (OPAQUE[nb]) continue;
        if ((CUT[id] || GLASSY[id]) && nb === id) continue;
      }
      const buf = r === 3 ? water : solid;
      const L = r === 3 ? LT[id] : F.kind === 0 ? LT[id] : F.kind === 2 ? LB[id] : F.kind === 3 ? LF[id] : LS[id];
      const base = buf.n;
      const aos: number[] = [];
      const waterTop = r === 3 && get(x, y + 1, z) !== B.WATER;
      for (let k = 0; k < 4; k++) {
        const c = F.c[k];
        let px = x + c[0], py = y + c[1], pz = z + c[2];
        // AO + light sampling around the vertex on the face plane
        const sx = c[0] ? 1 : -1, sy = c[1] ? 1 : -1, sz = c[2] ? 1 : -1;
        let s1: number, s2: number, cc: number, l1: number[], l2: number[], l3: number[];
        if (F.n[1] !== 0) { s1 = occ(nx + sx, ny, nz); s2 = occ(nx, ny, nz + sz); cc = occ(nx + sx, ny, nz + sz); l1 = [nx + sx, ny, nz]; l2 = [nx, ny, nz + sz]; l3 = [nx + sx, ny, nz + sz]; }
        else if (F.n[0] !== 0) { s1 = occ(nx, ny + sy, nz); s2 = occ(nx, ny, nz + sz); cc = occ(nx, ny + sy, nz + sz); l1 = [nx, ny + sy, nz]; l2 = [nx, ny, nz + sz]; l3 = [nx, ny + sy, nz + sz]; }
        else { s1 = occ(nx + sx, ny, nz); s2 = occ(nx, ny + sy, nz); cc = occ(nx + sx, ny + sy, nz); l1 = [nx + sx, ny, nz]; l2 = [nx, ny + sy, nz]; l3 = [nx + sx, ny + sy, nz]; }
        const ao = r === 3 ? 3 : (s1 && s2 ? 0 : 3 - (s1 + s2 + cc));
        aos.push(ao);
        let sky = skyAt(nx, ny, nz), cnt = 1;
        if (!s1) { sky += skyAt(l1[0], l1[1], l1[2]); cnt++; }
        if (!s2) { sky += skyAt(l2[0], l2[1], l2[2]); cnt++; }
        if (!cc && !(s1 && s2)) { sky += skyAt(l3[0], l3[1], l3[2]); cnt++; }
        sky /= cnt;
        let bl = emit > 0 ? emit : blockLightAt(px, py, pz);
        if (r === 3 && waterTop && c[1] === 1) py -= 0.12;
        buf.pos.push(px, py, pz);
        if (r === 3) {
          const wu = F.n[0] !== 0 ? pz : px, wv = F.n[1] !== 0 ? pz : py;
          buf.uv.push(wu, wv);
        } else buf.uv.push(UVS[k][0], UVS[k][1]);
        buf.layer.push(L);
        buf.light.push(AO[ao] * F.shade, sky, bl);
      }
      if (aos[0] + aos[2] < aos[1] + aos[3]) buf.index.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
      else buf.index.push(base, base + 1, base + 2, base, base + 2, base + 3);
      buf.n += 4;
    }
  }
  return { solid: solid.build(), cross: cross.build(), water: water.build() };
}

// ---- material ------------------------------------------------------------
export interface WorldUniforms {
  uMap: { value: THREE.DataArrayTexture };
  uDay: { value: number };
  uSkyTint: { value: THREE.Color };
  uFogColor: { value: THREE.Color };
  uFogNear: { value: number };
  uFogFar: { value: number };
  uTime: { value: number };
  uUnderwater: { value: number };
}

const VERT = /* glsl */`
in float layer;
in vec3 light;
out vec2 vUv;
flat out float vLayer;
out vec3 vLight;
out float vDist;
uniform float uTime;
uniform float uWater;
void main(){
  vUv = uv;
  if (uWater > 0.5) vUv += vec2(uTime * 0.03, uTime * 0.017);
  vLayer = layer;
  vLight = light;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDist = length(mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */`
precision highp sampler2DArray;
uniform sampler2DArray uMap;
uniform float uDay;
uniform vec3 uSkyTint;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uWater;
uniform float uUnderwater;
in vec2 vUv;
flat in float vLayer;
in vec3 vLight;
in float vDist;
out highp vec4 outColor;
void main(){
  vec4 t = texture(uMap, vec3(vUv, vLayer));
  if (uWater < 0.5 && t.a < 0.5) discard;
  float sky = vLight.y * uDay;
  vec3 skyC = uSkyTint * sky;
  vec3 blk = vec3(1.0, 0.78, 0.48) * vLight.z * 1.15;
  vec3 lit = max(skyC, blk) + vec3(0.06, 0.065, 0.085);
  vec3 col = t.rgb * lit * vLight.x;
  float a = uWater > 0.5 ? 0.78 : 1.0;
  float fog = smoothstep(uFogNear, uFogFar, vDist);
  if (uUnderwater > 0.5) fog = smoothstep(2.0, 22.0, vDist);
  col = mix(col, uFogColor, fog);
  outColor = linearToOutputTexel(vec4(col, a));
}`;

export function makeMaterials(u: WorldUniforms) {
  const mk = (water: boolean, side: THREE.Side) => new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: { ...u, uWater: { value: water ? 1 : 0 } },
    vertexShader: VERT, fragmentShader: FRAG,
    side, transparent: water, depthWrite: !water,
  });
  return { solid: mk(false, THREE.FrontSide), cross: mk(false, THREE.DoubleSide), water: mk(true, THREE.DoubleSide) };
}
