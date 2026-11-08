// Fishing: cast the float onto water, wait, and when it dips (a bite!) tap
// to reel in. Tapping too early just pulls the float back: no losing.
import * as THREE from 'three';
import { biteDelay, biteWindow } from './skills';
import { PRACTICE } from './fishcoach';

export type FishEvent = 'bite' | 'escaped' | null;

export class Fishing {
  state: 'idle' | 'flying' | 'waiting' | 'bite' = 'idle';
  /** practice with Baby Mo: the fish bites soon and stays on longer */
  practice = false;
  private bobber: THREE.Group;
  private line: THREE.Line;
  private linePos = new Float32Array(6);
  private from = new THREE.Vector3(); private to = new THREE.Vector3();
  private t = 0; private waitFor = 0; private window = 0;
  constructor(private scene: THREE.Scene) {
    this.bobber = new THREE.Group();
    const red = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xe4423a, emissive: 0xe4423a, emissiveIntensity: 0.3 }));
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.3 }));
    this.bobber.add(red, white); this.bobber.visible = false;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3));
    this.line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xf2f2f2, transparent: true, opacity: 0.8 }));
    this.line.frustumCulled = false; this.line.visible = false;
    scene.add(this.bobber, this.line);
  }
  get busy() { return this.state !== 'idle'; }
  /** throw the float from the rod tip to a point on the water surface */
  cast(rodTip: THREE.Vector3, water: THREE.Vector3, level: number, hat: boolean) {
    this.from.copy(rodTip); this.to.copy(water);
    this.state = 'flying'; this.t = 0;
    this.bobber.position.copy(rodTip); // start at the rod, not at the world's origin
    this.waitFor = this.practice ? PRACTICE.wait : biteDelay(level, hat, Math.random());
    this.window = this.practice ? PRACTICE.window : biteWindow(level);
    this.bobber.visible = true; this.line.visible = true;
  }
  /** pull the line back in (Use pressed); says what happened */
  reel(): 'caught' | 'early' | 'none' {
    if (this.state === 'idle') return 'none';
    const r = this.state === 'bite' ? 'caught' : 'early';
    this.stop();
    return r;
  }
  stop() { this.state = 'idle'; this.bobber.visible = false; this.line.visible = false; }
  /** where the float is now (for effects) */
  get float() { return this.bobber.position; }
  update(dt: number, t: number, rodTip: THREE.Vector3): FishEvent {
    if (this.state === 'idle') return null;
    this.t += dt;
    let ev: FishEvent = null;
    const b = this.bobber.position;
    if (this.state === 'flying') {
      const u = Math.min(1, this.t / 0.6);
      b.lerpVectors(this.from, this.to, u); b.y += Math.sin(u * Math.PI) * 1.4;
      if (u >= 1) { this.state = 'waiting'; this.t = 0; }
    } else if (this.state === 'waiting') {
      b.copy(this.to); b.y += Math.sin(t * 2.5) * 0.03;
      // little nibbles before the real bite
      if (this.t > this.waitFor - 0.8 && Math.sin(t * 25) > 0.7) b.y -= 0.04;
      if (this.t >= this.waitFor) { this.state = 'bite'; this.t = 0; ev = 'bite'; }
    } else if (this.state === 'bite') {
      b.copy(this.to); b.y -= 0.12 + Math.sin(t * 30) * 0.04; // pulled under
      if (this.t > this.window) { this.state = 'waiting'; this.t = 0; this.waitFor = this.practice ? PRACTICE.again : 1.5 + Math.random() * 2.5; ev = 'escaped'; }
    }
    this.linePos.set([rodTip.x, rodTip.y, rodTip.z, b.x, b.y + 0.06, b.z]);
    (this.line.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    return ev;
  }
}
