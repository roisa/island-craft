// Small particle effects: block debris, hearts, sparkles, fireworks.
import * as THREE from 'three';
import { heartTexture, sparkTexture } from './models';
import { iconURL } from '../world/atlas';
import { MATS, matOf, debrisColors } from './materials';

/** an item icon that flies from where it dropped into the player's bag */
interface Flyer { s: THREE.Sprite; from: THREE.Vector3; t: number; dur: number; delay: number; to: () => THREE.Vector3; arc: number; done: () => void }

interface P { obj: THREE.Object3D; v: THREE.Vector3; life: number; max: number; grav: number; spin: number; fade: boolean }

export class FX {
  lite = false;
  private parts: P[] = [];
  private cube = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  private cubeMats = new Map<number, THREE.MeshLambertMaterial>();
  constructor(private scene: THREE.Scene) { }

  private flyers: Flyer[] = [];
  private iconTex = new Map<number, THREE.Texture>();
  private mat(color: number) {
    let m = this.cubeMats.get(color);
    if (!m) { m = new THREE.MeshLambertMaterial({ color }); this.cubeMats.set(color, m); }
    return m;
  }
  /** a single-colour burst (kept for callers that only know a colour) */
  debris(x: number, y: number, z: number, color: number, n = 8) {
    for (let i = 0; i < n; i++) this.piece(x, y, z, color, 1, 14, 3, 1);
  }
  private piece(x: number, y: number, z: number, color: number, size: number, grav: number, speed: number, spread: number, v?: THREE.Vector3) {
    const o = new THREE.Mesh(this.cube, this.mat(color));
    o.scale.setScalar(size * (0.6 + Math.random() * 0.7));
    o.position.set(x + (Math.random() - 0.5) * 0.6 * spread, y + (Math.random() - 0.5) * 0.6 * spread, z + (Math.random() - 0.5) * 0.6 * spread);
    o.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    this.add(o, v ?? new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed + 1, (Math.random() - 0.5) * speed), 0.55 + Math.random() * 0.35, grav, 6, false, true);
  }
  /** the block falls apart in pieces that look and fall like its material (leaves drift, sand pours) */
  breakBurst(x: number, y: number, z: number, id: number) {
    const m = MATS[matOf(id)], cols = debrisColors(id);
    for (let i = 0; i < m.pieces; i++) this.piece(x, y, z, cols[(Math.random() * cols.length) | 0], m.size, m.grav, m.grav < 5 ? 1.6 : 3, 1);
  }
  /** a few chips spring off the face being hit, towards the player */
  chips(x: number, y: number, z: number, nx: number, ny: number, nz: number, id: number) {
    const m = MATS[matOf(id)], cols = debrisColors(id);
    for (let i = 0; i < m.chips; i++) {
      const v = new THREE.Vector3(nx * 2.2 + (Math.random() - 0.5) * 1.6, ny * 2.2 + Math.random() * 1.8 + 0.4, nz * 2.2 + (Math.random() - 0.5) * 1.6);
      this.piece(x + nx * 0.52, y + ny * 0.52, z + nz * 0.52, cols[(Math.random() * cols.length) | 0], m.size * 0.6, m.grav, 0, 0.5, v);
    }
  }
  /** a soft puff around the base of a block that was just placed */
  puff(x: number, y: number, z: number, id: number) {
    const cols = debrisColors(id);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + Math.random() * 0.5;
      const v = new THREE.Vector3(Math.cos(a) * 1.6, 0.6 + Math.random() * 0.6, Math.sin(a) * 1.6);
      this.piece(x + Math.cos(a) * 0.5, y - 0.45, z + Math.sin(a) * 0.5, cols[(Math.random() * cols.length) | 0], 0.55, 2.5, 0, 0, v);
    }
  }
  private icon(id: number) {
    let t = this.iconTex.get(id);
    if (!t) {
      const img = new Image(); t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace;
      const tex = t; img.onload = () => { tex.needsUpdate = true; }; img.src = iconURL(id);
      this.iconTex.set(id, t);
    }
    return t;
  }
  /**
   * The item's icon pops out of where it dropped, arcs to the player and calls
   * `done` on arrival (that's when the bag shows it). Several items in one go
   * leave one after another.
   */
  flyItem(id: number, from: THREE.Vector3, to: () => THREE.Vector3, delay: number, done: () => void) {
    if (this.lite && delay > 0.3) { setTimeout(done, delay * 1000); return; }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.icon(id), transparent: true, depthTest: false, depthWrite: false }));
    s.renderOrder = 10; s.scale.setScalar(0.42); s.position.copy(from); s.visible = delay <= 0;
    this.scene.add(s);
    this.flyers.push({ s, from: from.clone(), t: 0, dur: 0.55, delay, to, arc: 0.9 + Math.random() * 0.4, done });
  }
  hearts(x: number, y: number, z: number, n = 3) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTexture(), transparent: true, depthWrite: false }));
      s.scale.setScalar(0.35); s.position.set(x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6);
      this.add(s, new THREE.Vector3((Math.random() - 0.5) * 0.4, 1.2 + Math.random() * 0.4, (Math.random() - 0.5) * 0.4), 1.4, 0, 0, true);
    }
  }
  sparkle(x: number, y: number, z: number, n = 14, color = 0xffffff, speed = 2.5) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.scale.setScalar(0.4); s.position.set(x, y, z);
      const d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.5 + Math.random()));
      this.add(s, d, 0.9 + Math.random() * 0.5, 1.5, 0, true);
    }
  }
  fireworks(x: number, y: number, z: number) {
    const colors = [0xffd874, 0xff6f91, 0x8fd3ec, 0x7fc8a9, 0xe0b84d, 0xb388ff];
    for (let i = 0; i < 6; i++) setTimeout(() => this.sparkle(x + (Math.random() - 0.5) * 8, y + 4 + Math.random() * 4, z + (Math.random() - 0.5) * 8, 26, colors[i % colors.length], 5), i * 220);
  }
  private add(obj: THREE.Object3D, v: THREE.Vector3, life: number, grav: number, spin: number, fade: boolean, shrink = false) {
    if (this.lite && Math.random() < 0.55) return;
    if (this.parts.length > 400) return; // a hard cap keeps big chain reactions cheap
    (obj as any).shrink = shrink ? obj.scale.x : 0;
    this.scene.add(obj);
    this.parts.push({ obj, v, life, max: life, grav, spin, fade });
  }
  get count() { return this.parts.length + this.flyers.length; }
  update(dt: number) {
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const f = this.flyers[i];
      if (f.delay > 0) { f.delay -= dt; if (f.delay <= 0) f.s.visible = true; else continue; }
      f.t += dt;
      const u = Math.min(1, f.t / f.dur), e = u * u * (3 - 2 * u);
      const to = f.to();
      f.s.position.lerpVectors(f.from, to, e);
      f.s.position.y += Math.sin(u * Math.PI) * f.arc;
      f.s.scale.setScalar(0.42 * (1 - 0.45 * u) * (u < 0.15 ? 0.6 + u / 0.15 * 0.4 : 1));
      if (u >= 1) { this.scene.remove(f.s); f.s.material.dispose(); this.flyers.splice(i, 1); f.done(); }
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.obj);
        if (p.obj instanceof THREE.Sprite) p.obj.material.dispose();
        this.parts.splice(i, 1); continue;
      }
      p.v.y -= p.grav * dt;
      p.obj.position.addScaledVector(p.v, dt);
      p.obj.rotation.x += p.spin * dt; p.obj.rotation.y += p.spin * dt;
      const sh = (p.obj as any).shrink; if (sh && p.life < 0.25) p.obj.scale.setScalar(sh * p.life / 0.25);
      if (p.fade && p.obj instanceof THREE.Sprite) p.obj.material.opacity = Math.min(1, p.life / p.max * 2);
    }
  }
}
