import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { mergeRig } from '../../src/game/merge';

function rig() {
  const red = new THREE.MeshLambertMaterial({ color: 0xff0000 }), blue = new THREE.MeshLambertMaterial({ color: 0x0000ff }), face = new THREE.MeshLambertMaterial();
  const root = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group(), arm = new THREE.Group(), cape = new THREE.Group();
  root.add(body); body.add(head, arm, cape); head.position.set(0, 1.2, 0); arm.position.set(0.4, 1, 0); arm.rotation.z = 0.3;
  // a "bevelled box": a group of three boxes using a material array with a different front
  const bevel = (w: number, x: number, y: number) => { const g = new THREE.Group(); g.position.set(x, y, 0); for (let i = 0; i < 3; i++) g.add(new THREE.Mesh(new THREE.BoxGeometry(w, w * (1 - i * 0.1), w), [red, red, red, red, face, red])); return g; };
  body.add(bevel(0.5, 0, 0.5), new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), blue));
  head.add(bevel(0.4, 0, 0.2), bevel(0.1, 0.1, 0.4));
  arm.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), blue), new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), red));
  cape.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.02), blue), new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.03), red));
  return { root, body, head, arm, cape, mats: { red, blue, face } };
}
const meshes = (o: THREE.Object3D) => { const a: THREE.Mesh[] = []; o.traverse(c => { if ((c as THREE.Mesh).isMesh) a.push(c as THREE.Mesh); }); return a; };
const drawCalls = (o: THREE.Object3D) => meshes(o).reduce((n, m) => n + (Array.isArray(m.material) ? (m.geometry.groups.length || 1) : 1), 0);

describe('merging a rig', () => {
  it('keeps the exact shape in world space', () => {
    const a = rig(), b = rig();
    mergeRig(b.root, [b.body, b.head, b.arm], [b.cape]);
    a.root.updateMatrixWorld(true); b.root.updateMatrixWorld(true);
    const ba = new THREE.Box3().setFromObject(a.root, true), bb = new THREE.Box3().setFromObject(b.root, true); // precise: vertex by vertex
    expect(bb.min.distanceTo(ba.min)).toBeLessThan(1e-5); expect(bb.max.distanceTo(ba.max)).toBeLessThan(1e-5);
  });
  it('makes one draw call per material per joint', () => {
    const r = rig();
    const before = drawCalls(r.root);
    mergeRig(r.root, [r.body, r.head, r.arm], [r.cape]);
    // body: red+face+blue = 3, head: red+face = 2, arm: blue+red = 2, cape untouched = 2
    expect(drawCalls(r.root)).toBe(9);
    expect(before).toBeGreaterThan(30);
  });
  it('keeps joints and kept parts in place so they can still move', () => {
    const r = rig();
    mergeRig(r.root, [r.body, r.head, r.arm], [r.cape]);
    expect(r.head.parent).toBe(r.body); expect(r.arm.parent).toBe(r.body); expect(r.cape.parent).toBe(r.body);
    expect(r.cape.children.length).toBe(2); // not merged
    // moving a joint after merging still moves its part
    const y0 = new THREE.Box3().setFromObject(r.head).max.y;
    r.head.position.y += 1; r.root.updateMatrixWorld(true);
    expect(new THREE.Box3().setFromObject(r.head).max.y).toBeCloseTo(y0 + 1, 5);
  });
  it('the face material keeps its identity (blinking swaps its picture)', () => {
    const r = rig();
    mergeRig(r.root, [r.body, r.head, r.arm], [r.cape]);
    const headMats = (r.head.children.find(c => (c as THREE.Mesh).isMesh) as THREE.Mesh).material as THREE.Material[];
    expect(headMats).toContain(r.mats.face);
  });
});

describe('merging keeps whole boxes', () => {
  it('keeps every face of every box (a box has six face groups but one material)', () => {
    const root = new THREE.Group(), joint = new THREE.Group(); root.add(joint);
    const m1 = new THREE.MeshBasicMaterial({ color: 0xff0000 }), m2 = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    joint.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m1));
    const b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m1); b.position.x = 2; joint.add(b);
    const c = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), m2); c.position.y = 2; joint.add(c);
    mergeRig(root, [joint]);
    const merged = joint.children.find(o => o.name === 'merged') as THREE.Mesh;
    expect(merged).toBeTruthy();
    expect(merged.geometry.attributes.position.count).toBe(3 * 36); // 3 boxes × 6 faces × 2 triangles × 3 vertices
    expect((merged.material as THREE.Material[]).length).toBe(2);
    // and it is closed on every side: the bounding box spans all three boxes
    merged.geometry.computeBoundingBox();
    const bb = merged.geometry.boundingBox!;
    expect(bb.min.x).toBeCloseTo(-0.5); expect(bb.max.x).toBeCloseTo(2.5); expect(bb.max.y).toBeCloseTo(2.5); expect(bb.min.z).toBeCloseTo(-0.5);
  });
});
