// Fewer draw calls for characters: after a rig is built, every little box
// inside a joint (body, head, an arm, a leg...) is baked into ONE mesh per
// material for that joint. The joints themselves stay, so animation, prayer
// poses and held items work exactly as before.
import * as THREE from 'three';

/**
 * Merge the static meshes under each joint of `root`.
 * `joints` are the objects that move on their own (they keep their place in
 * the tree); anything in `keep` is left completely alone (e.g. a cape that
 * swings, sheep wool that shrinks, name tags).
 */
export function mergeRig(root: THREE.Object3D, joints: THREE.Object3D[], keep: THREE.Object3D[] = []) {
  const jointSet = new Set<THREE.Object3D>([root, ...joints]);
  const keepSet = new Set(keep);
  root.updateMatrixWorld(true);
  let before = 0, after = 0;
  for (const j of jointSet) {
    // meshes owned by this joint: reachable without passing another joint or a kept object
    const owned: THREE.Mesh[] = [];
    const walk = (o: THREE.Object3D) => {
      for (const c of o.children) {
        if (jointSet.has(c) || keepSet.has(c)) continue;
        if ((c as THREE.Mesh).isMesh && !(c as THREE.Mesh as any).isInstancedMesh) owned.push(c as THREE.Mesh);
        walk(c);
      }
    };
    walk(j);
    if (owned.length < 2) continue;
    before += owned.length;
    const inv = new THREE.Matrix4().copy(j.matrixWorld).invert();
    // material → triangle soup (positions, normals, uvs) in the joint's space
    const buckets = new Map<THREE.Material, { p: number[]; n: number[]; u: number[] }>();
    const m = new THREE.Matrix4(), nm = new THREE.Matrix3();
    for (const mesh of owned) {
      m.multiplyMatrices(inv, mesh.matrixWorld);
      nm.getNormalMatrix(m);
      const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
      const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const groups = g.groups.length ? g.groups : [{ start: 0, count: pos.count, materialIndex: 0 }];
      const v = new THREE.Vector3();
      for (const gr of groups) {
        // a single material covers every group (a box has six face groups, all drawn with it)
        const mat = Array.isArray(mesh.material) ? mats[gr.materialIndex ?? 0] : mesh.material; if (!mat) continue;
        let b = buckets.get(mat); if (!b) buckets.set(mat, b = { p: [], n: [], u: [] });
        for (let i = gr.start; i < gr.start + gr.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(m); b.p.push(v.x, v.y, v.z);
          if (nor) { v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); b.n.push(v.x, v.y, v.z); } else b.n.push(0, 1, 0);
          if (uv) b.u.push(uv.getX(i), uv.getY(i)); else b.u.push(0, 0);
        }
      }
      if (g !== mesh.geometry) g.dispose();
    }
    // one geometry for the joint, one group (= one draw call) per material
    const P: number[] = [], N: number[] = [], U: number[] = [], mats: THREE.Material[] = [];
    const geo = new THREE.BufferGeometry();
    for (const [mat, b] of buckets) {
      geo.addGroup(P.length / 3, b.p.length / 3, mats.length);
      mats.push(mat); P.push(...b.p); N.push(...b.n); U.push(...b.u);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    geo.computeBoundingSphere();
    for (const mesh of owned) { mesh.removeFromParent(); mesh.geometry.dispose(); }
    // drop the now-empty helper groups
    const prune = (o: THREE.Object3D) => { for (const c of [...o.children]) { if (jointSet.has(c) || keepSet.has(c)) continue; prune(c); if (!c.children.length && !(c as THREE.Mesh).isMesh && !(c as THREE.Sprite).isSprite) c.removeFromParent(); } };
    prune(j);
    const merged = new THREE.Mesh(geo, mats.length === 1 ? mats[0] : mats);
    merged.name = 'merged';
    j.add(merged);
    after += mats.length;
  }
  return { before, after };
}
