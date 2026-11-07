// 3D model of the item in your hand: a little textured cube for blocks,
// a flat cut-out for tools, food and plants.
import * as THREE from 'three';
import { BLOCKS, isBlockId } from '../world/blocks';
import { tileCanvas, iconURL } from '../world/atlas';

const cache = new Map<number, THREE.Object3D>();
const texOf = (c: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t; };

export function heldModel(id: number): THREE.Object3D {
  const hit = cache.get(id);
  if (hit) return hit.clone();
  let o: THREE.Object3D;
  const b = isBlockId(id) ? BLOCKS[id] : undefined;
  if (b && b.render === 'cube') {
    const m = (n: string) => new THREE.MeshLambertMaterial({ map: texOf(tileCanvas(n)!), transparent: !!b.cutout || !!b.glassy, alphaTest: 0.3, emissive: 0xffffff, emissiveMap: texOf(tileCanvas(n)!), emissiveIntensity: 0.25 });
    const side = m(b.side);
    o = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [side, side, m(b.top), m(b.bottom), m(b.front ?? b.side), side]);
    o.scale.setScalar(0.24);
  } else {
    const tex = new THREE.TextureLoader().load(iconURL(id));
    tex.magFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
    o = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }));
    o.scale.setScalar(0.42);
  }
  cache.set(id, o);
  return o.clone();
}
