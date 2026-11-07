// Small particle effects: block debris, hearts, sparkles, fireworks.
import * as THREE from 'three';
import { heartTexture, sparkTexture } from './models';

interface P { obj: THREE.Object3D; v: THREE.Vector3; life: number; max: number; grav: number; spin: number; fade: boolean }

export class FX {
  lite = false;
  private parts: P[] = [];
  private cube = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  private cubeMats = new Map<number, THREE.MeshLambertMaterial>();
  constructor(private scene: THREE.Scene) { }

  debris(x: number, y: number, z: number, color: number, n = 8) {
    let m = this.cubeMats.get(color);
    if (!m) { m = new THREE.MeshLambertMaterial({ color }); this.cubeMats.set(color, m); }
    for (let i = 0; i < n; i++) {
      const o = new THREE.Mesh(this.cube, m);
      o.position.set(x + (Math.random() - 0.5) * 0.6, y + (Math.random() - 0.5) * 0.6, z + (Math.random() - 0.5) * 0.6);
      this.add(o, new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3 + 1, (Math.random() - 0.5) * 3), 0.6 + Math.random() * 0.3, 14, 6, false);
    }
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
  private add(obj: THREE.Object3D, v: THREE.Vector3, life: number, grav: number, spin: number, fade: boolean) {
    if (this.lite && Math.random() < 0.55) return;
    this.scene.add(obj);
    this.parts.push({ obj, v, life, max: life, grav, spin, fade });
  }
  update(dt: number) {
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
      if (p.fade && p.obj instanceof THREE.Sprite) p.obj.material.opacity = Math.min(1, p.life / p.max * 2);
    }
  }
}
