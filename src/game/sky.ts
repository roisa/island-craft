// Sky dome, sun & crescent moon, stars, blocky clouds, gentle weather and the
// lighting that follows an in-game day shaped by real prayer times:
// dawn at Subuh, the sun rises at syuruq, sets at Maghrib, night after Isya.
import * as THREE from 'three';
import type { WorldUniforms } from '../world/mesher';
import { H } from '../world/gen';
import { lerp, clamp, smoothstep, Simplex } from '../world/noise';
import { drawMoon } from './moon';

export interface Schedule { fajr: number; sunrise: number; dhuhr: number; asr: number; maghrib: number; isha: number }

const C = (h: number) => new THREE.Color(h);
const SKY = {
  dayTop: C(0x5fb4ea), dayHor: C(0xbfe6f5),
  setTop: C(0x4a5c9a), setHor: C(0xffa96b),
  nightTop: C(0x07122e), nightHor: C(0x1a2a55),
  dawnTop: C(0x3d5a9a), dawnHor: C(0xf7c3a1),
};

export class Sky {
  group = new THREE.Group();
  hemi = new THREE.HemisphereLight(0xffffff, 0x6b8f5a, 1.2);
  sun = new THREE.DirectionalLight(0xffffff, 1.6);
  daylight = 1;
  night = false;
  raining = false; rainAmount = 0; snowy = false;
  private dome: THREE.Mesh; private domeMat: THREE.ShaderMaterial;
  private sunSpr: THREE.Sprite; private moonSpr: THREE.Sprite; private stars: THREE.Points;
  private clouds: THREE.Mesh; private cloudTex: THREE.CanvasTexture;
  private rain: THREE.Points; private rainPos: Float32Array;
  private rainbow: THREE.Sprite; rainbowT = 0;
  private weatherTimer = 240;
  private moonCanvas: HTMLCanvasElement; private moonTex: THREE.CanvasTexture;
  moonPhase = -1;
  /** shooting stars: a short bright streak now and then on clear nights */
  private meteor: THREE.LineSegments; private meteorPos = new Float32Array(18); private meteorT = 0; private meteorWait = 25;
  private meteorFrom = new THREE.Vector3(); private meteorDir = new THREE.Vector3();
  /** more of them up on the stargazing hill */
  meteorBoost = false;
  /** wearing the diving mask: you see further underwater */
  diver = false;
  /** weather of the day: morning mist (0..1) and wind (clouds race) */
  mist = 0; windy = false;
  private cloudOff = 0;
  onMeteor?: () => void;
  horizon = new THREE.Color();

  constructor(scene: THREE.Scene, private u: WorldUniforms) {
    this.domeMat = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3() }, glow: { value: new THREE.Color(0xfff1c4) } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 glow; varying vec3 vDir;
        void main(){ float h = clamp(vDir.y, -0.2, 1.0); vec3 c = mix(hor, top, pow(max(h,0.0), 0.55));
          float s = max(dot(normalize(vDir), sunDir), 0.0); c += glow * pow(s, 24.0) * 0.45;
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(380, 24, 16), this.domeMat);
    this.dome.renderOrder = -10; this.dome.frustumCulled = false;
    this.group.add(this.dome);

    const disc = (draw: (x: CanvasRenderingContext2D, s: number) => void) => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      draw(c.getContext('2d')!, 128);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    };
    const sunTex = disc((x, s) => {
      const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.28, 'rgba(255,236,170,1)'); g.addColorStop(0.32, 'rgba(255,220,140,.5)'); g.addColorStop(1, 'rgba(255,200,120,0)');
      x.fillStyle = g; x.fillRect(0, 0, s, s);
    });
    // the moon shows tonight's real phase (see setMoonPhase)
    this.moonCanvas = document.createElement('canvas'); this.moonCanvas.width = this.moonCanvas.height = 128;
    const moonTex = new THREE.CanvasTexture(this.moonCanvas); moonTex.colorSpace = THREE.SRGBColorSpace;
    this.moonTex = moonTex;
    this.setMoonPhase(0.08);
    this.sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, depthWrite: false, fog: false, transparent: true }));
    this.sunSpr.scale.set(90, 90, 1);
    this.moonSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, depthWrite: false, fog: false, transparent: true }));
    this.moonSpr.scale.set(70, 70, 1);
    this.group.add(this.sunSpr, this.moonSpr);

    const sp: number[] = [];
    for (let i = 0; i < 900; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.95);
      sp.push(Math.sin(ph) * Math.cos(th) * 340, Math.cos(ph) * 340, Math.sin(ph) * Math.sin(th) * 340);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.group.add(this.stars);

    // blocky clouds
    const cc = document.createElement('canvas'); cc.width = cc.height = 128;
    const cx = cc.getContext('2d')!; const n = new Simplex(42);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const v = n.noise2(Math.cos(x / 128 * Math.PI * 2) * 3 + 5, y / 9) * 0.6 + n.noise2(x / 9, Math.sin(y / 128 * Math.PI * 2) * 3) * 0.6;
      if (v > 0.25) { cx.fillStyle = 'rgba(255,255,255,0.92)'; cx.fillRect(x, y, 1, 1); }
    }
    this.cloudTex = new THREE.CanvasTexture(cc);
    this.cloudTex.magFilter = THREE.NearestFilter; this.cloudTex.wrapS = this.cloudTex.wrapT = THREE.RepeatWrapping;
    this.cloudTex.repeat.set(4, 4);
    this.clouds = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshBasicMaterial({ map: this.cloudTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    this.clouds.rotation.x = -Math.PI / 2;
    this.clouds.position.y = H + 14;
    scene.add(this.clouds);

    // rain / snow
    const N = 1400; this.rainPos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { this.rainPos[i * 3] = (Math.random() - 0.5) * 40; this.rainPos[i * 3 + 1] = Math.random() * 30; this.rainPos[i * 3 + 2] = (Math.random() - 0.5) * 40; }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3));
    this.rain = new THREE.Points(rg, new THREE.PointsMaterial({ color: 0xcfe8ff, size: 0.12, transparent: true, opacity: 0.7, depthWrite: false }));
    this.rain.visible = false; this.rain.frustumCulled = false;
    scene.add(this.rain);

    const rbTex = disc((x, s) => {
      ['#FF6B6B', '#FFB86B', '#FFE66B', '#6BFF9E', '#6BC6FF', '#8F6BFF'].forEach((c, i) => {
        x.strokeStyle = c; x.lineWidth = s * 0.04; x.globalAlpha = 0.75;
        x.beginPath(); x.arc(s / 2, s, s * 0.46 - i * s * 0.04, Math.PI, 2 * Math.PI); x.stroke();
      });
    });
    this.rainbow = new THREE.Sprite(new THREE.SpriteMaterial({ map: rbTex, transparent: true, depthWrite: false, fog: false, opacity: 0 }));
    this.rainbow.scale.set(260, 260, 1);
    this.group.add(this.rainbow);

    const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(this.meteorPos, 3));
    this.meteor = new THREE.LineSegments(mg, new THREE.LineBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    this.meteor.frustumCulled = false; this.meteor.visible = false;
    this.group.add(this.meteor);

    this.sun.position.set(50, 100, 30);
    scene.add(this.group, this.hemi, this.sun, this.sun.target);
  }

  /** draw the moon for phase p (0 new … 0.5 full … 1) */
  setMoonPhase(p: number) {
    if (Math.abs(p - this.moonPhase) < 0.004) return;
    this.moonPhase = p;
    const s = 128, x = this.moonCanvas.getContext('2d')!;
    x.clearRect(0, 0, s, s);
    const g = x.createRadialGradient(s / 2, s / 2, s * 0.2, s / 2, s / 2, s / 2);
    const glow = 0.12 + 0.3 * (1 - Math.cos(p * Math.PI * 2)) / 2;
    g.addColorStop(0, `rgba(255,248,210,${glow.toFixed(2)})`); g.addColorStop(1, 'rgba(255,248,210,0)');
    x.fillStyle = g; x.fillRect(0, 0, s, s);
    drawMoon(x, s / 2, s / 2, s * 0.22, p, '#FFF4C8', 'rgba(60,72,110,0.35)');
    this.moonTex.needsUpdate = true;
  }

  private updateMeteor(dt: number, clear: boolean) {
    if (this.meteorT > 0) {
      this.meteorT -= dt;
      const u = 1 - this.meteorT / 0.9;
      const head = this.meteorFrom.clone().addScaledVector(this.meteorDir, u * 90);
      const p = this.meteorPos;
      for (let k = 0; k < 3; k++) {
        const tail = head.clone().addScaledVector(this.meteorDir, -26 + k * 6);
        const off = (k - 1) * 0.35;
        p.set([head.x, head.y + off, head.z, tail.x, tail.y + off, tail.z], k * 6);
      }
      this.meteor.geometry.attributes.position.needsUpdate = true;
      (this.meteor.material as THREE.LineBasicMaterial).opacity = Math.sin(Math.min(1, u) * Math.PI) * 0.95;
      if (this.meteorT <= 0) this.meteor.visible = false;
      return;
    }
    if (!clear) return;
    this.meteorWait -= dt * (this.meteorBoost ? 4 : 1);
    if (this.meteorWait > 0) return;
    this.meteorWait = 30 + Math.random() * 50;
    const a = Math.random() * Math.PI * 2;
    this.meteorFrom.set(Math.cos(a) * 220, 170 + Math.random() * 70, Math.sin(a) * 220);
    this.meteorDir.set(-Math.sin(a) + (Math.random() - 0.5) * 0.6, -0.35 - Math.random() * 0.3, Math.cos(a)).normalize();
    this.meteorT = 0.9; this.meteor.visible = true;
    this.onMeteor?.();
  }

  /** daylight 0.15..1 for an hour of the in-game day */
  static daylightAt(h: number, s: Schedule) {
    const night = 0.17;
    if (h < s.fajr || h >= s.isha) return night;
    if (h < s.sunrise) return lerp(night, 0.78, smoothstep(s.fajr, s.sunrise, h));
    if (h < s.sunrise + 1) return lerp(0.78, 1, (h - s.sunrise));
    if (h < s.maghrib - 1) return 1;
    if (h < s.maghrib) return lerp(1, 0.62, h - (s.maghrib - 1));
    return lerp(0.62, night, smoothstep(s.maghrib, s.isha, h));
  }

  update(dt: number, hour: number, s: Schedule, center: THREE.Vector3, biomeDesert: boolean, biomeSnow: boolean, underwater: boolean, fogFar: number) {
    let day = Sky.daylightAt(hour, s);
    this.night = hour >= s.maghrib + 0.3 || hour < s.fajr + 0.3;

    // weather: occasional gentle rain (snow in cold places), never in the desert
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      this.raining = !this.raining && Math.random() < 0.55;
      this.weatherTimer = this.raining ? 70 + Math.random() * 60 : 200 + Math.random() * 220;
      if (!this.raining && this.rainAmount > 0.5 && !this.night) this.rainbowT = 45;
    }
    const want = this.raining && !biomeDesert ? 1 : 0;
    this.rainAmount += (want - this.rainAmount) * Math.min(1, dt * 0.4);
    this.snowy = biomeSnow;
    day *= 1 - this.rainAmount * 0.22;
    this.daylight = day;

    // colours
    const sunsetK = Math.max(1 - Math.abs(hour - s.maghrib + 0.3) / 1.0, 0) ;
    const dawnK = Math.max(1 - Math.abs(hour - s.sunrise) / 1.0, 0);
    const nightK = clamp((0.62 - day) / 0.45, 0, 1);
    const top = SKY.dayTop.clone(), hor = SKY.dayHor.clone();
    top.lerp(SKY.setTop, sunsetK * 0.8).lerp(SKY.dawnTop, dawnK * 0.6).lerp(SKY.nightTop, nightK);
    hor.lerp(SKY.setHor, sunsetK * 0.9).lerp(SKY.dawnHor, dawnK * 0.7).lerp(SKY.nightHor, nightK);
    const grey = new THREE.Color(0x8d9aa6);
    top.lerp(grey.clone().multiplyScalar(day), this.rainAmount * 0.6); hor.lerp(grey.clone().multiplyScalar(Math.max(day, 0.3)), this.rainAmount * 0.6);
    this.domeMat.uniforms.top.value.copy(top);
    this.domeMat.uniforms.hor.value.copy(hor);
    this.horizon.copy(hor);

    // sun travels east → west between syuruq and maghrib; moon at night
    const f = (hour - s.sunrise) / (s.maghrib - s.sunrise);
    const ang = Math.PI * clamp(f, -0.15, 1.15);
    const sunDir = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0.25).normalize();
    const nf = ((hour - s.maghrib + 24) % 24) / ((s.sunrise - s.maghrib + 24) % 24 || 12);
    const mang = Math.PI * clamp(nf, 0, 1);
    const moonDir = new THREE.Vector3(Math.cos(mang), Math.sin(mang) * 0.9 + 0.1, -0.3).normalize();
    this.domeMat.uniforms.sunDir.value.copy(sunDir);
    this.group.position.copy(center);
    this.sunSpr.position.copy(sunDir).multiplyScalar(330);
    this.moonSpr.position.copy(moonDir).multiplyScalar(320);
    this.sunSpr.visible = sunDir.y > -0.1;
    this.moonSpr.visible = this.night || hour < s.sunrise;
    (this.stars.material as THREE.PointsMaterial).opacity = nightK * (1 - this.rainAmount);
    this.stars.rotation.y += dt * 0.004;
    this.updateMeteor(dt, nightK > 0.8 && this.rainAmount < 0.1);

    const rb = this.rainbow.material as THREE.SpriteMaterial;
    if (this.rainbowT > 0) { this.rainbowT -= dt; rb.opacity = Math.min(1, this.rainbowT / 6, (45 - this.rainbowT) / 4) * 0.8; this.rainbow.position.set(-sunDir.x * 300, 40, -sunDir.z * 300 - 80); }
    else rb.opacity = 0;

    // lights for entities
    const tint = new THREE.Color(1, 1, 1).lerp(new THREE.Color(1, 0.8, 0.62), sunsetK * 0.8).lerp(new THREE.Color(0.55, 0.65, 1.0), nightK);
    this.hemi.intensity = 0.35 + day * 1.0;
    this.hemi.color.copy(tint);
    this.sun.intensity = day * 1.3;
    this.sun.position.copy(center).addScaledVector(sunDir.y > 0 ? sunDir : moonDir, 60);
    this.sun.target.position.copy(center);

    // world shader uniforms
    this.u.uDay.value = day;
    this.u.uSkyTint.value.copy(tint);
    if (underwater) { this.u.uFogColor.value.set(0x1e5f8a).multiplyScalar(Math.max(day, 0.3)); this.u.uUnderwater.value = this.diver ? 2 : 1; }
    else { this.u.uFogColor.value.copy(hor).lerp(new THREE.Color(0xe4eaee).multiplyScalar(Math.max(day, 0.35)), this.mist * 0.85); this.u.uUnderwater.value = 0; }
    this.u.uFogNear.value = fogFar * 0.55 * (1 - this.rainAmount * 0.3) * (1 - this.mist * 0.97);
    this.u.uFogFar.value = fogFar * (1 - this.rainAmount * 0.25) * (1 - this.mist * 0.8);

    // clouds follow the player, drift slowly
    this.clouds.position.x = center.x; this.clouds.position.z = center.z;
    this.cloudOff += dt * (this.windy ? 0.02 : 0.004);
    this.cloudTex.offset.set(center.x / 400 + this.cloudOff, -center.z / 400);
    const cm = this.clouds.material as THREE.MeshBasicMaterial;
    cm.color.setRGB(0.4 + day * 0.6, 0.4 + day * 0.6, 0.45 + day * 0.55).lerp(new THREE.Color(1, 0.75, 0.6), sunsetK * 0.6);
    cm.opacity = (0.35 + 0.45 * Math.min(1, day * 1.3)) + this.rainAmount * 0.2;

    // rain / snow particles
    this.rain.visible = this.rainAmount > 0.03;
    if (this.rain.visible) {
      const m = this.rain.material as THREE.PointsMaterial;
      m.opacity = this.rainAmount * (this.snowy ? 0.9 : 0.6);
      m.size = this.snowy ? 0.18 : 0.1;
      m.color.set(this.snowy ? 0xffffff : 0xbcdcff);
      const fall = (this.snowy ? 3 : 18) * dt;
      const p = this.rainPos;
      for (let i = 0; i < p.length; i += 3) {
        p[i + 1] -= fall;
        if (this.snowy) p[i] += Math.sin(performance.now() / 700 + i) * dt * 0.5;
        if (p[i + 1] < -6) { p[i + 1] = 24; p[i] = (Math.random() - 0.5) * 40; p[i + 2] = (Math.random() - 0.5) * 40; }
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
      this.rain.position.set(center.x, center.y, center.z);
    }
  }
}
