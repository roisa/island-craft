// The guide arrow: a frosted, greyish glass arrow floating just ahead of you, pointing the
// way to what the golden compass shows (the next letter, the Iqro book, the masjid at prayer
// time, a place you follow). It fades away when you're close, while you play a game, ride
// or pray, and when it's switched off in Settings.
import * as THREE from 'three';

/** the arrow's outline, pointing along +Y (1.1 long, 0.9 wide) */
function arrowShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.62);
  s.lineTo(0.45, 0.12); s.lineTo(0.17, 0.12); s.lineTo(0.17, -0.48);
  s.lineTo(-0.17, -0.48); s.lineTo(-0.17, 0.12); s.lineTo(-0.45, 0.12);
  s.closePath();
  return s;
}

export class GuideArrow {
  readonly obj = new THREE.Group();
  private glass: THREE.MeshStandardMaterial;
  private rim: THREE.LineBasicMaterial;
  private show = 0; private ang = 0; private t = 0; private placed = false;
  constructor(scene: THREE.Scene) {
    const geo = new THREE.ExtrudeGeometry(arrowShape(), { depth: 0.07, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 3 });
    geo.translate(0, 0, -0.035);
    this.glass = new THREE.MeshStandardMaterial({ color: 0xb9c4cf, emissive: 0x8a9bae, emissiveIntensity: 0.45, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.55, depthWrite: false });
    this.rim = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
    const mesh = new THREE.Mesh(geo, this.glass);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), this.rim);
    const tilt = new THREE.Group();
    tilt.add(mesh, edges);
    tilt.rotation.x = Math.PI / 2 - 0.75; // tip pointing ahead (+Z), lying low and tilted up a little so it reads from the camera behind you
    tilt.scale.setScalar(2.1);
    this.obj.add(tilt);
    this.obj.renderOrder = 5; mesh.renderOrder = 5; edges.renderOrder = 6;
    this.obj.visible = false;
    scene.add(this.obj);
  }
  /** `dir` = the world direction to the target (atan2(dx, dz)), or null for none; `yaw` = where you face */
  update(dt: number, feet: THREE.Vector3, yaw: number, dir: number | null, on: boolean, portrait = false) {
    this.t += dt;
    this.show += ((on && dir !== null ? 1 : 0) - this.show) * Math.min(1, dt * 4);
    this.obj.visible = this.show > 0.02;
    if (!this.obj.visible || dir === null) return;
    // turn smoothly the short way round
    let d = dir - this.ang; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.ang = this.placed ? this.ang + d * Math.min(1, dt * 6) : dir;
    // it floats in front of you (where you look), just above the ground past your shoulders, and turns to point at the mission
    // on a tall (portrait) screen the view is narrow: a smaller arrow, a bit further on
    const ahead = portrait ? 6 : 5, bob = Math.sin(this.t * 2.6) * 0.07;
    const x = feet.x - Math.sin(yaw) * ahead, z = feet.z - Math.cos(yaw) * ahead, y = feet.y + 1.7 + bob;
    if (!this.placed) { this.obj.position.set(x, y, z); this.placed = true; }
    else this.obj.position.lerp(new THREE.Vector3(x, y, z), Math.min(1, dt * 10));
    this.obj.rotation.y = this.ang;
    this.obj.scale.setScalar(portrait ? 0.62 : 1);
    // a gentle "this way" pulse
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 3.2);
    this.glass.opacity = (0.62 + 0.18 * pulse) * this.show;
    this.rim.opacity = (0.7 + 0.25 * pulse) * this.show;
  }
}
