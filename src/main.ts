import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import '@fontsource/scheherazade-new/400.css';
import '@fontsource/scheherazade-new/700.css';
import './style.css';
import * as THREE from 'three';
import { tr, t2, getLang, setLang } from './i18n';
import { buildTextureArray } from './world/atlas';
import { initMesherTables, WorldUniforms } from './world/mesher';
import { Generator, Biome, BIOME_INFO, SEA, VILLAGE_Y, H } from './world/gen';
import { World } from './world/world';
import { B, I, BLOCKS, ITEMS, LETTERS, isBlockId, isLetter, nameOf } from './world/blocks';
import { Player } from './game/player';
import { Input, isTouch } from './game/input';
import { Inventory, Recipe, Station, craft as doCraft } from './game/inventory';
import { Sky, Schedule } from './game/sky';
import { Entities, Npc, Companion, Animal, ANIMAL_NAME } from './game/entities';
import { buildHuman, Rig } from './game/models';
import { FX } from './game/fx';
import { heldModel } from './game/held';
import { SFX, Music, Speech, audioState, haptic } from './game/audio';
import * as Save from './game/save';
import { timesFor, hoursOf, DayTimes, PRAYERS, Prayer, prayerName, fmtTime, loadLocation, saveLocation, Loc, ramadhanStatus, MethodId } from './game/prayer';
import { QUESTS, Stats, newStats, DUAS, CALENDAR } from './content';
import { UI } from './ui';

export interface Settings {
  sfx: boolean; music: boolean; moVoice: boolean; cam: 'first' | 'third'; dist: number; dayMinutes: number; sens: number;
  mode: 'adventure' | 'creative'; avatar: 'boy' | 'girl'; reminders: boolean; method: MethodId;
}
const SAVE_VERSION = 1;
const SPAWN = new THREE.Vector3(0.5, VILLAGE_Y + 1, 3.5);
const MASJID_SPOT = new THREE.Vector3(0.5, VILLAGE_Y + 1, -18.5);
const FOOD = new Set<number>([I.DATES, I.MILK, I.APPLE, I.TAKJIL, I.KOLAK]);

const LOG_LEAF: Record<number, number> = { [B.OAK_LOG]: B.OAK_LEAVES, [B.PINE_LOG]: B.PINE_LEAVES, [B.PALM_LOG]: B.PALM_LEAVES };

interface Sapling { x: number; y: number; z: number; id: number; t: number }

export class Game {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, 1, 0.08, 600);
  uniforms!: WorldUniforms;
  gen!: Generator; world!: World; sky!: Sky; ents!: Entities; fx: FX; player!: Player;
  input: Input; inv = new Inventory(); ui: UI;
  settings: Settings = {
    sfx: true, music: true, moVoice: false, cam: 'third', dist: isTouch ? 4 : 6, dayMinutes: 24, sens: 1,
    mode: 'adventure', avatar: 'boy', reminders: true, method: 'kemenag',
  };
  seed = 0;
  hour = 7.5; day = 1;
  stats: Stats = newStats();
  questsDone = new Set<string>();
  claimed = new Set<number>();
  saplings: Sapling[] = [];
  loc: Loc = loadLocation();
  realTimes!: DayTimes;
  schedule!: Schedule;
  ramadhan = ramadhanStatus();
  running = false; paused = false;
  avatar: Rig | null = null;
  private highlight: THREE.LineSegments;
  private raycaster = new THREE.Raycaster();
  private crack!: THREE.Mesh;
  private heldId = -1; private heldTP: THREE.Object3D | null = null; private heldFP: THREE.Object3D | null = null;
  private viewModel = new THREE.Group();
  private crackTex: THREE.CanvasTexture[] = [];
  private mining: { key: string; t: number; need: number } | null = null;
  private mineAnim = 0;
  private gameEvent: { p: Prayer; until: number; attended: boolean } | null = null;
  private lastHour = 0;
  private remindersShown = new Set<string>();
  private timers = { hud: 0, slow: 0, save: 0, tip: 60, real: 0 };
  private lastJumpTap = 0;
  private iftarDay = -1;
  private dirtySave = false;

  constructor() {
    const canvas = document.getElementById('game') as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.input = new Input(canvas);
    this.fx = new FX(this.scene);
    this.ui = new UI(this);
    const hg = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004));
    this.highlight = new THREE.LineSegments(hg, new THREE.LineBasicMaterial({ color: 0x152230, transparent: true, opacity: 0.55 }));
    this.highlight.visible = false;
    this.scene.add(this.highlight);
    // crack overlay shown on the block being mined (5 stages)
    for (let st = 0; st < 5; st++) {
      const c = document.createElement('canvas'); c.width = c.height = 32;
      const x = c.getContext('2d')!; x.strokeStyle = 'rgba(20,20,20,0.75)'; x.lineWidth = 2; x.lineCap = 'square';
      let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
      for (let k = 0; k <= st * 2 + 1; k++) {
        let px = 16, py = 16; const ang = rnd() * Math.PI * 2;
        x.beginPath(); x.moveTo(px, py);
        for (let j = 0; j < 3 + st; j++) { px += Math.cos(ang + (rnd() - 0.5) * 1.4) * 4; py += Math.sin(ang + (rnd() - 0.5) * 1.4) * 4; x.lineTo(Math.round(px), Math.round(py)); }
        x.stroke();
      }
      const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; this.crackTex.push(t);
    }
    this.crack = new THREE.Mesh(new THREE.BoxGeometry(1.01, 1.01, 1.01), new THREE.MeshBasicMaterial({ map: this.crackTex[0], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.crack.visible = false;
    this.scene.add(this.crack);
    this.scene.add(this.camera);
    this.camera.add(this.viewModel);
    addEventListener('resize', () => this.resize()); this.resize();
    this.inv.onChange = () => { this.ui.refreshHotbar(); this.dirtySave = true; };
    this.input.onKey = code => this.onKey(code);
    this.input.bindTouch(document.getElementById('stick')!, document.getElementById('knob')!, {
      jump: document.getElementById('bJump')!, mine: document.getElementById('bMine')!, use: document.getElementById('bUse')!, down: document.getElementById('bDown')!,
    });
    document.getElementById('bJump')!.addEventListener('touchstart', () => this.jumpTap());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.save(); });
    addEventListener('pagehide', () => this.save());
    Speech.init();
    this.refreshTimes();
  }

  resize() {
    this.renderer.setSize(innerWidth, innerHeight, false);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }

  // ---------- boot ----------
  async boot() {
    const meta = await Save.get<any>('meta');
    if (meta?.settings) Object.assign(this.settings, meta.settings);
    setLang(meta?.lang ?? getLang());
    this.ui.labels();
    this.ui.showStart(!!meta, fresh => this.start(fresh ? null : meta));
    this.loop();
  }

  private async start(meta: any) {
    SFX.warm();
    this.ui.loading(0);
    await new Promise(r => setTimeout(r, 30));
    if (!meta) { await Save.del('meta'); await Save.del('edits'); }
    this.seed = meta?.seed ?? Math.floor(Math.random() * 1e9);
    if (meta) {
      this.hour = meta.hour ?? 7.5; this.day = meta.day ?? 1;
      this.stats = Object.assign(newStats(), meta.stats);
      this.questsDone = new Set(meta.questsDone ?? []);
      this.claimed = new Set(meta.claimed ?? []);
      this.saplings = meta.saplings ?? [];
    }
    // letter blocks are drawn on canvases: make sure the Arabic font is ready first
    try {
      await Promise.race([
        Promise.all([document.fonts.load('700 40px "Scheherazade New"', LETTERS.map(l => l.g).join('')), document.fonts.load('800 12px Nunito', 'ALIF')]),
        new Promise(r => setTimeout(r, 2500)),
      ]);
    } catch { /* fall back to system fonts */ }
    const tex = buildTextureArray();
    initMesherTables();
    this.uniforms = {
      uMap: { value: tex }, uDay: { value: 1 }, uSkyTint: { value: new THREE.Color(1, 1, 1) }, uFogColor: { value: new THREE.Color(0xbfe6f5) },
      uFogNear: { value: 50 }, uFogFar: { value: 90 }, uTime: { value: 0 }, uUnderwater: { value: 0 },
    };
    this.gen = new Generator(this.seed);
    this.world = new World(this.gen, this.uniforms);
    if (meta) this.world.edits = Save.deserializeEdits(await Save.get('edits'));
    this.scene.add(this.world.group);
    this.sky = new Sky(this.scene, this.uniforms);
    this.ents = new Entities(this.scene, this.world, this.seed);
    this.world.onChunkGenerated = c => this.ents.spawnForChunk(c);
    this.world.onChunkUnloaded = c => this.ents.despawnChunk(c);
    this.player = new Player(this.world);
    this.player.onStep = () => SFX.step();
    this.player.onSplash = () => SFX.splash();
    this.player.onLand = () => SFX.hit(true);
    if (meta?.player) {
      const p = meta.player;
      this.player.pos.set(p.x, p.y, p.z); this.player.yaw = p.yaw; this.player.pitch = p.pitch; this.player.flying = !!p.flying;
    } else { this.player.pos.copy(SPAWN); this.player.yaw = 0; }
    this.player.visY = this.player.pos.y;
    if (meta?.inv) this.inv.load(meta.inv);
    else this.starterKit();
    this.applySettings();

    // villagers & Baby Mo
    const G = VILLAGE_Y + 1;
    this.ents.addNpc(new Npc('ustadz', 'Ustadz Hasan', { skin: '#C99272', shirt: 0xf4f4f0, pants: 0xf4f4f0, peci: 0xffffff, beard: '#4a4a4a', robe: true, glasses: true }, new THREE.Vector3(-15.5, G, 17.5), this.world));
    this.ents.addNpc(new Npc('aminah', 'Bu Aminah', { skin: '#E3B38F', shirt: 0xf2a33a, pants: 0x9b59b6, hijab: 0x9b59b6, robe: true, lashes: true, trim: 0xffffff }, new THREE.Vector3(-7.5, G, 10.5), this.world));
    this.ents.addNpc(new Npc('yusuf', 'Kakek Yusuf', { skin: '#D7A27F', shirt: 0x3fa34d, pants: 0x5b4636, peci: 0x222222, beard: '#e8e8e8', hair: 0xdddddd }, new THREE.Vector3(9.5, G, 12.5), this.world));
    this.ents.mo = new Companion(this.world, () => ({ pos: this.player.pos, yaw: this.player.yaw, fp: this.settings.cam === 'first' }));
    this.ents.mo.pos.set(this.player.pos.x + 1.5, this.player.pos.y, this.player.pos.z + 1);
    this.scene.add(this.ents.mo.rig.root);
    this.buildAvatar();

    // pre-generate the area around the player
    const total = 30;
    for (let i = 0; i < 400; i++) {
      const pending = this.world.update(this.player.pos.x, this.player.pos.z, 40);
      this.ui.loading(Math.min(1, (total - Math.min(total, pending)) / total * 0.6 + i / 400 * 0.4));
      await new Promise(r => setTimeout(r, 0));
      if (pending === 0 && i > 3) break;
    }
    // make sure we're not inside a block
    while (this.player.collides(this.player.pos.x, this.player.pos.y, this.player.pos.z) && this.player.pos.y < H) this.player.pos.y += 1;
    this.player.visY = this.player.pos.y;

    const today = new Date().toDateString();
    if (!this.stats.days.includes(today)) this.stats.days.push(today);
    this.ui.loading(null);
    this.ui.showHud(true);
    this.ui.refreshHotbar();
    this.ui.updateHud();
    this.running = true;
    this.lastHour = this.hour;
    Music.setEnabled(this.settings.music);
    if (!meta) {
      setTimeout(() => this.ui.say(tr('Assalamu’alaikum! Aku Baby Mo. Selamat datang di desaku! 🌙', 'Assalamu’alaikum! I’m Baby Mo. Welcome to my village! 🌙'), 'pose-05'), 700);
      setTimeout(() => this.ui.say(tr('Ada 28 huruf hijaiyah tersembunyi di dunia ini. Ikuti kompas emas di atas ya! ✨', 'There are 28 hijaiyah letters hidden in this world. Follow the golden compass at the top! ✨'), 'idea'), 7000);
      setTimeout(() => this.ui.say(isTouch ? tr('Joystick untuk jalan, geser layar untuk melihat. Tahan jari di balok untuk menggali, ketuk untuk memasang!', 'Joystick to walk, swipe to look. Hold your finger on a block to mine it, tap to place!') : tr('Klik layar dulu, lalu WASD untuk jalan dan mouse untuk melihat!', 'Click the screen, then use WASD to walk and the mouse to look!'), 'ok'), 13500);
    } else {
      setTimeout(() => this.ui.say(tr('Assalamu’alaikum, selamat datang kembali! 😊', 'Assalamu’alaikum, welcome back! 😊'), 'pose-05'), 600);
    }
    this.checkQuests(true);
    this.save();
  }

  private starterKit() {
    this.inv.slots.fill(null);
    if (this.settings.mode === 'creative') {
      [B.GRASS, B.PLANKS, B.MARBLE, B.GOLD_TILE, B.MOSAIC, B.GLASS, B.LANTERN, B.BRICK, B.WOOL_RED].forEach((id, i) => (this.inv.slots[i] = { id, n: 64 }));
    } else {
      this.inv.add(I.DATES, 3); this.inv.add(B.LANTERN, 2); this.inv.add(B.PLANKS, 6); this.inv.add(I.APPLE, 2);
    }
    this.inv.sel = 0;
  }

  buildAvatar() {
    if (this.avatar) this.scene.remove(this.avatar.root);
    this.avatar = this.settings.avatar === 'girl'
      ? buildHuman({ skin: '#E8B892', shirt: 0xff8fb3, pants: 0x6b5ca5, hijab: 0x2aa198, robe: true, lashes: true, kid: true, scale: 0.9, trim: 0xf6dd6e })
      : buildHuman({ skin: '#E8B892', shirt: 0x2e8e86, pants: 0x35406b, hair: 0x3a2a1e, peci: 0xf2f2f2, kid: true, scale: 0.9, trim: 0xffffff });
    this.scene.add(this.avatar.root);
    this.heldId = -1;
  }

  applySettings() {
    const s = this.settings;
    audioState.sfx = s.sfx; audioState.music = s.music;
    if (this.running) Music.setEnabled(s.music);
    this.input.sensitivity = s.sens;
    this.inv.creative = s.mode === 'creative';
    if (!this.inv.creative && this.player) this.player.flying = false;
    if (this.world) this.world.radius = s.dist;
    this.camera.far = 600;
    this.ui.refreshHotbar();
    this.saveSoon();
  }

  refreshTimes() {
    const now = new Date();
    this.realTimes = timesFor(this.loc.lat, this.loc.lng, now, this.settings.method);
    // the in-game day uses the same shape. Keep it sane for far-north places.
    const hs = hoursOf(this.realTimes, this.loc.lng);
    const ok = hs.fajr < hs.sunrise && hs.sunrise < hs.dhuhr && hs.dhuhr < hs.asr && hs.asr < hs.maghrib && hs.maghrib < hs.isha;
    this.schedule = ok ? hs : { fajr: 4.6, sunrise: 5.9, dhuhr: 12, asr: 15.2, maghrib: 18, isha: 19.2 };
    this.ramadhan = ramadhanStatus(now);
  }
  setLocation(l: Loc) { this.loc = l; saveLocation(l); this.refreshTimes(); this.remindersShown.clear(); this.saveSoon(); }

  // ---------- helpers for UI ----------
  pause(on: boolean) {
    this.paused = on;
    if (on) { this.input.mineHeld = false; this.input.move.x = this.input.move.y = 0; document.exitPointerLock?.(); }
  }
  toggleCamera() { this.settings.cam = this.settings.cam === 'third' ? 'first' : 'third'; this.saveSoon(); }
  nextGamePrayer(): { p: Prayer; h: number } {
    for (const p of PRAYERS) if (this.schedule[p] > this.hour) return { p, h: this.schedule[p] };
    return { p: 'fajr', h: this.schedule.fajr };
  }
  compass() {
    let best: { rot: number; dist: number } | null = null, bd = Infinity;
    const p = this.player?.pos; if (!p) return null;
    const have = new Set(this.stats.letters);
    for (const s of this.gen.shrines) {
      if (have.has(s.letter)) continue;
      const d = Math.hypot(s.x + 0.5 - p.x, s.z + 0.5 - p.z);
      if (d < bd) {
        bd = d;
        const ta = Math.atan2(s.x + 0.5 - p.x, s.z + 0.5 - p.z);
        const la = Math.atan2(-Math.sin(this.player.yaw), -Math.cos(this.player.yaw));
        best = { rot: -(ta - la), dist: d };
      }
    }
    return best;
  }
  activeQuests() { return QUESTS.filter(q => !this.questsDone.has(q.id)).slice(0, 3); }
  stations(): Set<Station> {
    const s = new Set<Station>(); const p = this.player.pos;
    for (let x = -4; x <= 4; x++) for (let y = -2; y <= 3; y++) for (let z = -4; z <= 4; z++) {
      const id = this.world.get(Math.floor(p.x) + x, Math.floor(p.y) + y, Math.floor(p.z) + z);
      if (id === B.WORKBENCH) s.add('workbench'); else if (id === B.FURNACE) s.add('furnace');
    }
    return s;
  }
  craft(r: Recipe) {
    const ok = doCraft(this.inv, r, this.stations());
    if (ok) {
      SFX.craft(); haptic(10);
      this.stats.crafted[r.out] = (this.stats.crafted[r.out] || 0) + 1;
      this.ui.toast(tr('✨ Berhasil membuat ', '✨ Made ') + t2(nameOf(r.out)) + (r.n > 1 ? ' ×' + r.n : ''));
      this.checkQuests();
    } else SFX.error();
    return ok;
  }
  calendarUnlocked() { return this.ramadhan.inRamadhan ? this.ramadhan.day : Math.min(30, Math.max(1, this.stats.days.length)); }
  claimDay(n: number) {
    if (this.claimed.has(n)) return;
    const c = CALENDAR[n - 1];
    this.claimed.add(n);
    this.inv.add(c.reward[0], c.reward[1]);
    SFX.quest(); this.ents.mo.celebrate = 2;
    this.saveSoon();
  }
  goHome() { this.player.pos.copy(SPAWN); this.player.vel.set(0, 0, 0); this.player.visY = SPAWN.y; this.player.yaw = 0; }
  restBreak() { this.ui.toast(tr('🤲 Selamat sholat! Game dijeda.', '🤲 Enjoy your prayer! The game is paused.'), 4000); this.ui.openBook('prayer'); }
  async newWorld() { await Save.del('meta'); await Save.del('edits'); location.reload(); }
  photo() {
    this.render();
    const url = this.renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url; a.download = 'dunia-baby-mo.png'; a.click();
  }

  // ---------- input ----------
  private onKey(code: string) {
    if (!this.running) return;
    if (code === 'Escape') { if (this.ui.isOpen()) { this.ui.closeModal(); this.ui.closeBook(); } return; }
    if (this.paused) { if (code === 'KeyE') this.ui.closeBook(); return; }
    if (code.startsWith('Digit')) { const n = +code.slice(5); if (n >= 1 && n <= 9) { this.inv.sel = n - 1; this.ui.refreshHotbar(); this.ui.flashHeld(); } }
    if (code === 'KeyE' || code === 'KeyI') this.ui.openBook('bag');
    if (code === 'KeyL' || code === 'KeyB') this.ui.openBook('letters');
    if (code === 'KeyQ') this.ui.openBook('quests');
    if (code === 'KeyM') this.ui.openBook('map');
    if (code === 'KeyR') this.ui.openBook('craft');
    if (code === 'KeyV' || code === 'F5') this.toggleCamera();
    if (code === 'KeyF' && this.inv.creative) this.toggleFly();
    if (code === 'Space') this.jumpTap();
  }
  private jumpTap() {
    const now = performance.now();
    if (this.inv.creative && now - this.lastJumpTap < 300) this.toggleFly();
    this.lastJumpTap = now;
  }
  private toggleFly() {
    this.player.flying = !this.player.flying;
    this.ui.toast(this.player.flying ? tr('🕊️ Terbang! Tahan ⬆️ naik, ⬇️ turun', '🕊️ Flying! Hold ⬆️ up, ⬇️ down') : tr('🚶 Mendarat', '🚶 Landing'));
  }

  // ---------- main loop ----------
  private clock = new THREE.Clock();
  private loop = () => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    if (!this.running) return;
    const t = performance.now() / 1000;
    this.uniforms.uTime.value = t;
    if (!this.paused) this.tick(dt, t);
    this.ents.update(this.paused ? 0 : dt, t, this.player.pos);
    this.fx.update(dt);
    this.updateAvatar(dt, t);
    const biome = this.gen.column(Math.floor(this.player.pos.x), Math.floor(this.player.pos.z));
    const under = this.player.headInWater;
    this.ui.underwater(under);
    this.sky.update(dt, this.hour, this.schedule, this.camera.position, biome.biome === Biome.DESERT, biome.biome === Biome.SNOWY || biome.biome === Biome.MOUNTAIN && this.player.pos.y > SEA + 30, under, (this.settings.dist - 0.6) * 16);
    Music.setNight(this.sky.night);
    this.updateCamera();
    this.render();
  };
  private render() { this.renderer.render(this.scene, this.camera); }

  private tick(dt: number, t: number) {
    const inp = this.input, p = this.player;
    inp.enabled = true;
    p.yaw += inp.lookDX; p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch + inp.lookDY));
    inp.lookDX = inp.lookDY = 0;
    if (inp.wheel) { this.inv.sel = (this.inv.sel + Math.sign(inp.wheel) + 9) % 9; inp.wheel = 0; this.ui.refreshHotbar(); this.ui.flashHeld(); }
    const ax = inp.axis();
    p.step(dt, { fx: ax.fx, fz: ax.fz, jump: inp.jump(), down: inp.down(), sprint: inp.sprinting() });
    this.ui.setFlying(p.flying);
    if (inp.jump() && p.onGround && !p.flying && p.vel.y === 0) { /* handled in physics */ }

    this.world.update(p.pos.x, p.pos.z, 6);

    // aiming: crosshair, or the spot a finger is touching
    const aim = (sx?: number, sy?: number) => {
      let eye = p.eye(), dir = p.look();
      if (sx !== undefined && sy !== undefined) {
        const ndc = new THREE.Vector2(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1);
        this.raycaster.setFromCamera(ndc, this.camera);
        dir = this.raycaster.ray.direction.clone();
        const cp = this.camera.position;
        eye = cp.clone().addScaledVector(dir, Math.max(0, p.eye().sub(cp).dot(dir) - 0.6));
      } else if (this.settings.cam === 'third') {
        // aim along the camera's centre line, starting level with the player
        const cp = this.camera.position;
        const d2 = eye.clone().addScaledVector(dir, 10).sub(cp).normalize();
        eye = cp.clone().addScaledVector(d2, Math.max(0, eye.clone().sub(cp).dot(d2)));
        dir = d2;
      }
      const reach = sx !== undefined ? 6.5 : 5.5;
      const hit = this.world.raycast(eye, dir, reach);
      const ent = this.ents.raycast(eye, dir, reach - 1);
      const entCloser = !!ent && (!hit || eye.distanceTo(ent.pos) < hit.dist + 0.6);
      return { hit, ent, entCloser };
    };
    const ptr = inp.pointer;
    const A = ptr ? aim(ptr.x, ptr.y) : aim();
    const { hit, ent, entCloser } = A;
    if (hit && !entCloser) {
      this.highlight.visible = true;
      this.highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
      this.ui.target(t2(nameOf(hit.id)));
    } else {
      this.highlight.visible = false;
      this.ui.target(ent ? this.entityName(ent) : '');
    }

    // mining (hold the button / mouse, or hold a finger on a block)
    const mining = inp.mineHeld || inp.pointerMine;
    if (mining && hit && !entCloser) this.mineStep(dt, hit);
    else { this.mining = null; this.ui.mineRing(0); this.crack.visible = false; }
    if (mining && entCloser && ent instanceof Animal) { inp.mineHeld = false; inp.pointerMine = false; this.useEntity(ent); }
    // use / place (button, right click, or a quick tap on the world)
    if (inp.takeUse()) {
      if (entCloser && ent) this.useEntity(ent);
      else this.useBlock(hit);
    }
    if (inp.tapAt) {
      const T = aim(inp.tapAt.x, inp.tapAt.y); inp.tapAt = null;
      if (T.entCloser && T.ent) this.useEntity(T.ent);
      else if (T.hit) this.useBlock(T.hit);
    }

    // letters near the player
    for (const s of this.gen.shrines) {
      if (Math.abs(s.x + 0.5 - p.pos.x) < 1.6 && Math.abs(s.z + 0.5 - p.pos.z) < 1.6 && Math.abs(s.y + 0.5 - (p.pos.y + 0.8)) < 2.2) {
        if (!this.stats.letters.includes(s.letter) && this.world.get(s.x, s.y, s.z) === B.LETTER_0 + s.letter) this.collectLetter(s.letter, s.x, s.y, s.z);
      }
    }

    // time of day
    if (this.settings.dayMinutes > 0) this.hour += dt * 24 / (this.settings.dayMinutes * 60);
    else { const n = new Date(); this.hour = n.getHours() + n.getMinutes() / 60 + n.getSeconds() / 3600; }
    if (this.hour >= 24) { this.hour -= 24; this.day++; }
    this.gameTimeEvents();

    // periodic
    this.timers.hud -= dt; this.timers.slow -= dt; this.timers.save -= dt; this.timers.tip -= dt; this.timers.real -= dt;
    if (this.timers.hud <= 0) { this.timers.hud = 0.25; this.ui.updateHud(); }
    if (this.timers.slow <= 0) { this.timers.slow = 1; this.slowChecks(); }
    if (this.timers.save <= 0) { this.timers.save = 20; this.save(); }
    if (this.timers.tip <= 0) { this.timers.tip = 80 + Math.random() * 60; this.moTip(); }
    if (this.timers.real <= 0) { this.timers.real = 15; this.realReminders(); }
    this.mineAnim = Math.max(0, this.mineAnim - dt);
  }

  private entityName(e: unknown) {
    if (e instanceof Animal) return t2(ANIMAL_NAME[e.kind]);
    if (e instanceof Npc) return e.name;
    if (e instanceof Companion) return 'Baby Mo';
    return '';
  }

  private mineStep(dt: number, hit: { x: number; y: number; z: number; id: number }) {
    const key = hit.x + ',' + hit.y + ',' + hit.z;
    const def = BLOCKS[hit.id];
    if (!def || def.hardness === Infinity) { this.ui.mineRing(0); return; }
    if (isLetter(hit.id)) {
      const sh = this.gen.shrines.find(s => s.x === hit.x && s.y === hit.y && s.z === hit.z);
      if (sh && !this.stats.letters.includes(sh.letter)) { this.collectLetter(sh.letter, hit.x, hit.y, hit.z); return; }
    }
    if (!this.mining || this.mining.key !== key) {
      const tool = this.inv.toolSpeed(def.tool, 0);
      if (def.tier && !this.inv.creative && tool.tier < def.tier) {
        if (!this.mining || this.mining.key !== key) {
          const need = [tr('beliung kayu', 'a wooden pickaxe'), tr('beliung batu', 'a stone pickaxe'), tr('beliung besi', 'an iron pickaxe')][def.tier - 1];
          this.ui.toast(tr(`⛏️ Butuh ${need} untuk menggali ini`, `⛏️ You need ${need} to mine this`));
          SFX.error();
        }
        this.mining = { key, t: 0, need: Infinity };
        return;
      }
      const need = this.inv.creative ? 0.18 : Math.max(0.12, def.hardness * 0.55 / tool.speed);
      this.mining = { key, t: 0, need };
    }
    if (this.mining.need === Infinity) return;
    this.mining.t += dt;
    this.mineAnim = 0.25;
    if (Math.floor(this.mining.t / 0.22) !== Math.floor((this.mining.t - dt) / 0.22)) SFX.hit(def.hardness < 0.5);
    const prog = this.mining.t / this.mining.need;
    this.ui.mineRing(prog);
    this.crack.visible = true;
    this.crack.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
    (this.crack.material as THREE.MeshBasicMaterial).map = this.crackTex[Math.min(4, Math.floor(prog * 5))];
    if (this.mining.t >= this.mining.need) { this.breakBlock(hit.x, hit.y, hit.z, hit.id); this.mining = null; this.ui.mineRing(0); this.crack.visible = false; }
  }

  private breakBlock(x: number, y: number, z: number, id: number) {
    const def = BLOCKS[id]!;
    const w = this.world;
    // water flows into the hole if it touches water
    const nearWater = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]].some(([a, b, c]) => w.get(x + a, y + b, z + c) === B.WATER);
    w.set(x, y, z, nearWater ? B.WATER : B.AIR);
    // plants / torches resting on top drop too
    const above = w.get(x, y + 1, z);
    if (BLOCKS[above]?.render === 'cross') { w.set(x, y + 1, z, B.AIR); this.give(BLOCKS[above]!.drops ? BLOCKS[above]!.drops!(Math.random()) : [[above, 1]]); }
    const drops = this.inv.creative ? [] : def.drops ? def.drops(Math.random()) : [[id, 1]] as [number, number][];
    this.give(drops);
    this.fx.debris(x + 0.5, y + 0.5, z + 0.5, def.color);
    SFX.breakBlock(); haptic(8);
    this.dirtySave = true;
    this.saplings = this.saplings.filter(s => !(s.x === x && s.y === y && s.z === z));
    if (LOG_LEAF[id]) this.fellTree(x, y, z, id);
  }

  /** Chopping the trunk of a real tree brings the logs above down too, then its leaves drift away. */
  private fellTree(x: number, y: number, z: number, log: number) {
    const w = this.world, leaf = LOG_LEAF[log];
    const logs: [number, number, number][] = [];
    const seen = new Set<string>();
    const q: [number, number, number][] = [[x, y + 1, z]];
    while (q.length && logs.length < 16) {
      const [a, b, c] = q.shift()!;
      const k = a + ',' + b + ',' + c;
      if (seen.has(k) || b < y || Math.abs(a - x) > 2 || Math.abs(c - z) > 2) continue;
      seen.add(k);
      if (w.get(a, b, c) !== log) continue;
      logs.push([a, b, c]);
      q.push([a, b + 1, c], [a + 1, b, c], [a - 1, b, c], [a, b, c + 1], [a, b, c - 1]);
    }
    const top = logs.length ? Math.max(...logs.map(l => l[1])) : y;
    // only natural-looking trees (leaves around the top) fall; posts and houses stay put
    let leafy = false;
    for (let a = -2; a <= 2 && !leafy; a++) for (let c = -2; c <= 2 && !leafy; c++) for (let b = 0; b <= 2; b++) if (w.get(x + a, top + b, z + c) === leaf) { leafy = true; break; }
    if (!leafy) return;
    const creative = this.inv.creative;
    logs.forEach(([a, b, c], i) => setTimeout(() => {
      if (w.get(a, b, c) !== log) return;
      w.set(a, b, c, B.AIR);
      this.fx.debris(a + 0.5, b + 0.5, c + 0.5, BLOCKS[log]!.color, 4);
      if (!creative) this.give([[log, 1]]);
      if (i % 2 === 0) SFX.breakBlock();
    }, 90 * (i + 1)));
    // leaves that no longer touch a trunk drift away and drop their gifts
    setTimeout(() => {
      const isLog = (id: number) => id === B.OAK_LOG || id === B.PINE_LOG || id === B.PALM_LOG;
      const gone: [number, number, number][] = [];
      for (let a = x - 4; a <= x + 4; a++) for (let c = z - 4; c <= z + 4; c++) for (let b = top - 6; b <= top + 3; b++) {
        if (w.get(a, b, c) !== leaf) continue;
        let near = false;
        for (let da = -2; da <= 2 && !near; da++) for (let dc = -2; dc <= 2 && !near; dc++) for (let db = -2; db <= 1; db++) if (isLog(w.get(a + da, b + db, c + dc))) { near = true; break; }
        if (!near) gone.push([a, b, c]);
      }
      gone.sort(() => Math.random() - 0.5).forEach(([a, b, c], i) => setTimeout(() => {
        if (w.get(a, b, c) !== leaf) return;
        w.set(a, b, c, B.AIR);
        if (i % 3 === 0) this.fx.debris(a + 0.5, b + 0.5, c + 0.5, BLOCKS[leaf]!.color, 3);
        if (!creative) { const d = BLOCKS[leaf]!.drops!(Math.random()); if (d.length) this.give(d); }
      }, 40 * i));
    }, 90 * (logs.length + 2));
  }

  private give(drops: [number, number][]) {
    for (const [d, n] of drops) {
      this.inv.add(d, n);
      this.stats.mined[d] = (this.stats.mined[d] || 0) + n;
      this.ui.pickup(d, n);
    }
    if (drops.length) SFX.pickup();
    this.checkQuests();
  }

  private useBlock(hit: ReturnType<World['raycast']>) {
    const held = this.inv.held();
    if (hit) {
      // interactive blocks
      if (hit.id === B.BED) { this.sleep(); return; }
      if (hit.id === B.WORKBENCH || hit.id === B.FURNACE) { this.ui.openBook('craft'); return; }
      if (hit.id === B.BOOKSHELF) { const ks = Object.keys(DUAS); const d = DUAS[ks[Math.floor(Math.random() * ks.length)]]; this.ui.duaCard(d, tr('📚 Doa sehari-hari', '📚 Daily du’a')); return; }
      if (isLetter(hit.id) && !(held && isBlockId(held.id))) { this.ui.letterCard(hit.id - B.LETTER_0, false); return; }
    }
    if (held && FOOD.has(held.id)) { this.eat(); return; }
    if (!hit || !held || !isBlockId(held.id)) { if (!hit && !held) return; if (held && !isBlockId(held.id) && !FOOD.has(held.id)) this.ui.toast(tr('Pegang balok untuk dipasang 🧱', 'Hold a block to place it 🧱')); return; }
    const x = hit.x + hit.nx, y = hit.y + hit.ny, z = hit.z + hit.nz;
    const cur = this.world.get(x, y, z);
    if (cur !== B.AIR && cur !== B.WATER && cur !== B.TALL_GRASS) return;
    const def = BLOCKS[held.id]!;
    if (def.solid && this.player.occupies(x, y, z)) return;
    if (y <= 0 || y >= H - 1) return;
    if (def.render === 'cross') {
      const below = this.world.get(x, y - 1, z);
      if (!BLOCKS[below]?.solid) { this.ui.toast(tr('Harus di atas balok padat', 'Needs a solid block below')); return; }
      if ((held.id === B.SAPLING || held.id === B.PALM_SAPLING || held.id === B.PINE_SAPLING)) {
        if (![B.GRASS, B.DIRT, B.SNOW_GRASS, B.SAND].includes(below)) { this.ui.toast(tr('Tanam bibit di tanah atau rumput ya 🌱', 'Plant saplings on dirt or grass 🌱')); return; }
        this.saplings.push({ x, y, z, id: held.id, t: 0 });
        this.stats.planted++;
        this.ui.say(tr('Masya Allah, pohonnya nanti tumbuh! Menanam pohon itu sedekah 🌱', 'Masha Allah, it will grow into a tree! Planting trees is a good deed 🌱'), 'ok');
      }
    }
    this.world.set(x, y, z, held.id);
    this.inv.useHeld();
    this.stats.placed++;
    this.stats.placedIds[held.id] = (this.stats.placedIds[held.id] || 0) + 1;
    SFX.place(); haptic(6);
    this.mineAnim = 0.2;
    this.checkQuests();
  }

  private useEntity(e: unknown) {
    const held = this.inv.held();
    if (e instanceof Companion) {
      this.stats.talked.mo = true;
      e.celebrate = 1.2; SFX.pet();
      this.fx.hearts(e.pos.x, e.pos.y + 1.8, e.pos.z, 2);
      if (held && FOOD.has(held.id)) { this.giveFood(e.pos); this.ui.say(tr('Terima kasih! Kamu baik sekali 💚 Berbagi itu indah.', 'Thank you! You are so kind 💚 Sharing is beautiful.'), 'ok'); }
      else this.ui.say(this.moLine(), 'pose-05');
      this.checkQuests();
      return;
    }
    if (e instanceof Npc) { this.talkNpc(e); return; }
    if (e instanceof Animal) {
      e.hop = 0.5; e.target = null; e.wait = 2;
      this.fx.hearts(e.pos.x, e.pos.y + e.rig.height, e.pos.z, 3);
      SFX.pet(); haptic(10);
      this.stats.petted++;
      if (e.cooldown <= 0) {
        if (e.kind === 'cow' || e.kind === 'camel' || e.kind === 'goat') { this.inv.add(I.MILK, 1); this.stats.milk++; e.cooldown = 60; this.ui.toast(tr(`🥛 ${t2(ANIMAL_NAME[e.kind])} memberi susu. Terima kasih!`, `🥛 The ${t2(ANIMAL_NAME[e.kind]).toLowerCase()} shared some milk. Thank you!`)); }
        else if (e.kind === 'chicken') { this.inv.add(I.EGG, 1); this.stats.eggs++; e.cooldown = 45; this.ui.toast(tr('🥚 Ayam memberi telur!', '🥚 The chicken laid an egg!')); }
        else if (e.kind === 'sheep' && !e.sheared) { this.inv.add(B.WOOL_WHITE, 2); this.stats.wool += 2; e.sheared = true; e.cooldown = 120; setTimeout(() => (e.sheared = false), 120000); this.ui.toast(tr('🐑 Domba berbagi wol lembut!', '🐑 The sheep shared soft wool!')); }
        else this.ui.toast(tr('💕 Meong~ Kucing senang dielus!', '💕 Meow~ The cat loves being petted!'));
      } else this.ui.toast(tr(`💕 ${t2(ANIMAL_NAME[e.kind])} senang disayang!`, `💕 The ${t2(ANIMAL_NAME[e.kind]).toLowerCase()} is happy!`));
      this.checkQuests();
    }
  }
  private giveFood(at: THREE.Vector3) {
    this.inv.useHeld(); this.stats.gave++;
    this.fx.hearts(at.x, at.y + 2, at.z, 5); SFX.quest();
    this.checkQuests();
  }

  private talkNpc(n: Npc) {
    n.lookAt(this.player.pos); n.waving = true; setTimeout(() => (n.waving = false), 1500);
    this.stats.talked[n.id] = true;
    const held = this.inv.held();
    const food = held && FOOD.has(held.id);
    const face = n.id === 'ustadz' ? '👳' : n.id === 'aminah' ? '🧕' : '👴';
    if (food) {
      const gift = [B.MOSAIC, B.GOLD_TILE, B.LANTERN, B.WOOL_PURPLE][Math.floor(Math.random() * 4)];
      this.giveFood(n.pos);
      this.inv.add(gift, 2);
      this.ui.dialog({ face, who: n.name, text: tr(`Masya Allah, terima kasih ya! Semoga Allah membalas kebaikanmu. 🤲<br>Ini hadiah kecil untukmu: <b>${t2(nameOf(gift))} ×2</b>`, `Masha Allah, thank you! May Allah reward your kindness. 🤲<br>Here's a small gift: <b>${t2(nameOf(gift))} ×2</b>`) });
      return;
    }
    if (n.id === 'ustadz') {
      const k = this.stats.letters.length;
      this.ui.dialog({
        face, who: n.name,
        text: k === 0 ? tr('Wa’alaikumussalam! Di dunia ini ada <b>28 huruf hijaiyah</b> yang bersinar di kuil-kuil kecil. Ikuti kompas emas, dan dengarkan bunyi setiap huruf ya.', 'Wa’alaikumussalam! There are <b>28 hijaiyah letters</b> glowing in little shrines around this world. Follow the golden compass and listen to each letter’s sound.')
          : k < 28 ? tr(`Masya Allah, kamu sudah menemukan <b>${k} huruf</b>! Mau latihan tebak huruf bersama Ustadz?`, `Masha Allah, you have found <b>${k} letters</b>! Want to practise a letter quiz with me?`)
            : tr('Subhanallah! Semua 28 huruf sudah kamu temukan. Teruslah belajar sampai bisa membaca Al-Qur’an ya!', 'Subhanallah! You found all 28 letters. Keep learning until you can read the Qur’an!'),
        buttons: [
          ...(k >= 3 ? [{ label: '🎯 ' + tr('Tebak huruf', 'Letter quiz'), cls: 'gold', fn: () => this.ui.quiz() }] : []),
          { label: '📖 ' + tr('Buku huruf', 'Letter book'), cls: 'ghost', fn: () => this.ui.openBook('letters') },
          { label: tr('Terima kasih, Ustadz', 'Thank you, Ustadz') },
        ],
      });
    } else if (n.id === 'aminah') {
      this.ui.dialog({
        face, who: n.name,
        text: tr('Assalamu’alaikum, Nak! Ibu sedang menyiapkan takjil untuk tetangga. Rasulullah SAW suka berbuka dengan <b>kurma</b>. Resep takjil: <b>3 kurma + 1 susu</b>. Kurma ada di pohon kurma, susu dari sapi atau unta yang disayang. Kalau mau berbagi, bawa makanan ke sini ya! 🍽️',
          'Assalamu’alaikum, dear! I’m preparing iftar snacks for the neighbours. The Prophet (peace be upon him) liked to break his fast with <b>dates</b>. Recipe: <b>3 dates + 1 milk</b>. Dates grow on date palms, and cows or camels share milk when you’re kind. If you’d like to share, bring some food here! 🍽️'),
      });
    } else {
      const np = this.nextGamePrayer();
      this.ui.dialog({
        face, who: n.name,
        text: tr(`Lihat matahari, Nak. <b>Subuh</b> saat fajar, <b>Dzuhur</b> saat matahari tinggi, <b>Ashar</b> sore hari, <b>Maghrib</b> saat matahari terbenam, dan <b>Isya</b> saat malam. Sekarang pukul ${this.fmtGame(this.hour)}, sholat berikutnya <b>${prayerName(np.p)}</b> pukul ${this.fmtGame(np.h)}.<br>Kakek juga suka menanam pohon — bibit yang kamu tanam akan tumbuh besar! 🌱`,
          `Look at the sun, child. <b>Fajr</b> is at dawn, <b>Dhuhr</b> when the sun is high, <b>Asr</b> in the afternoon, <b>Maghrib</b> at sunset and <b>Isha</b> at night. It’s ${this.fmtGame(this.hour)} now; next is <b>${prayerName(np.p)}</b> at ${this.fmtGame(np.h)}.<br>I love planting trees too — saplings you plant will grow tall! 🌱`),
        buttons: [{ label: '🕌 ' + tr('Jadwal sholat asli', 'Real prayer times'), cls: 'ghost', fn: () => this.ui.openBook('prayer') }, { label: tr('Terima kasih, Kek', 'Thank you, Grandpa') }],
      });
    }
    this.checkQuests();
  }
  private fmtGame(h: number) { const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60); return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); }

  private eat() {
    const held = this.inv.held()!;
    const s = this.schedule, h = this.hour;
    this.inv.useHeld();
    this.stats.ate++;
    SFX.pickup(); this.fx.hearts(this.player.pos.x, this.player.pos.y + 1.8, this.player.pos.z, 2);
    const isIftar = h >= s.maghrib && h < s.maghrib + 1.5;
    const isSahur = h >= s.fajr - 2 && h < s.fajr;
    if (isIftar) {
      this.stats.iftar++;
      if (this.iftarDay !== this.day) { this.iftarDay = this.day; this.ui.duaCard(DUAS.iftar, tr('🌇 Doa berbuka puasa', '🌇 Du’a for breaking the fast')); }
      this.ui.toast(tr('🌙 Selamat berbuka! Alhamdulillah', '🌙 Happy iftar! Alhamdulillah'));
    } else if (isSahur) {
      this.stats.sahur++;
      this.ui.toast(tr('🍚 Sahur yang berkah! Bismillah', '🍚 A blessed suhoor! Bismillah'));
    } else this.ui.toast(tr(`😋 Bismillah… ${t2(nameOf(held.id))} enak! Alhamdulillah`, `😋 Bismillah… yummy ${t2(nameOf(held.id))}! Alhamdulillah`));
    this.checkQuests();
  }

  private sleep() {
    const s = this.schedule, h = this.hour;
    const night = h >= s.isha - 0.5 || h < s.fajr - 0.5;
    if (!night) { this.ui.toast(tr('🛏️ Kasur dipakai saat malam (setelah Isya)', '🛏️ Beds are for night time (after Isha)')); return; }
    this.ui.duaCard(DUAS.sleep, tr('🌜 Doa sebelum tidur', '🌜 Du’a before sleeping'), () => {
      this.ui.sleepFade(true);
      setTimeout(() => {
        if (this.hour > s.fajr) this.day++;
        this.hour = s.fajr + 0.05; this.lastHour = this.hour;
        this.stats.slept++;
        this.ui.sleepFade(false);
        this.ui.duaCard(DUAS.wake, tr('🌅 Doa bangun tidur', '🌅 Du’a after waking up'));
        this.checkQuests();
      }, 1500);
    });
  }

  private collectLetter(i: number, x: number, y: number, z: number) {
    if (this.stats.letters.includes(i)) return;
    this.stats.letters.push(i);
    this.world.set(x, y, z, B.AIR);
    this.inv.add(B.LETTER_0 + i, 1);
    SFX.letter(); haptic([15, 40, 15]);
    this.fx.sparkle(x + 0.5, y + 0.5, z + 0.5, 30, 0xffd874, 3);
    this.ents.mo.celebrate = 2.5;
    this.ui.letterCard(i, true);
    if (this.stats.letters.length === 28) {
      SFX.fanfare(); this.fx.fireworks(this.player.pos.x, this.player.pos.y + 3, this.player.pos.z);
      setTimeout(() => this.ui.say(tr('Subhanallah! Kamu menemukan SEMUA 28 huruf hijaiyah! 🏆', 'Subhanallah! You found ALL 28 hijaiyah letters! 🏆'), 'alright', 7000), 800);
    }
    this.checkQuests();
    this.save();
  }

  checkQuests(silent = false) {
    for (const q of QUESTS) {
      if (this.questsDone.has(q.id)) continue;
      const [a, b] = q.goal(this.stats);
      if (a >= b) {
        this.questsDone.add(q.id);
        if (silent) continue;
        for (const [id, n] of q.reward) this.inv.add(id, n);
        SFX.quest(); haptic([10, 30, 10]);
        this.ents.mo.celebrate = 2;
        this.fx.sparkle(this.player.pos.x, this.player.pos.y + 2, this.player.pos.z, 20, 0x9bf29a, 2.5);
        const rw = q.reward.map(([id, n]) => `${t2(nameOf(id))} ×${n}`).join(', ');
        this.ui.toast(`${q.sticker} ${tr('Misi selesai', 'Quest done')}: ${t2(q.title)}! 🎁 ${rw}`, 4200);
        this.dirtySave = true;
      }
    }
  }

  // ---------- time-of-day events in the game world ----------
  private crossed(h: number) {
    const a = this.lastHour, b = this.hour;
    return a <= b ? h > a && h <= b : h > a || h <= b;
  }
  private gameTimeEvents() {
    const s = this.schedule;
    for (const p of PRAYERS) {
      if (this.crossed(s[p])) {
        this.gameEvent = { p, until: (s[p] + 0.9) % 24, attended: false };
        this.stats.prayersSeen++;
        SFX.chime();
        for (const n of this.ents.npcs) n.goPray(true, MASJID_SPOT.clone().add(new THREE.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 3)));
        const lines: Record<Prayer, [string, string]> = {
          fajr: ['Sudah Subuh! Langit mulai terang. Warga berangkat ke masjid 🕌', 'It’s Fajr! The sky is getting lighter. The villagers are heading to the masjid 🕌'],
          dhuhr: ['Waktunya Dzuhur — matahari sedang tinggi ☀️ Yuk ikut ke masjid!', 'Dhuhr time — the sun is high ☀️ Let’s go to the masjid!'],
          asr: ['Sudah Ashar 🌤️ Bayangan mulai panjang. Ayo sholat berjamaah!', 'It’s Asr 🌤️ Shadows are getting longer. Let’s pray together!'],
          maghrib: ['Matahari terbenam — waktunya Maghrib & berbuka puasa! 🌇 Makan kurma yuk!', 'The sun has set — time for Maghrib and iftar! 🌇 Let’s eat some dates!'],
          isha: ['Sudah Isya 🌙 Setelah sholat Isya, ada tarawih di bulan Ramadhan.', 'It’s Isha 🌙 In Ramadan, tarawih prayer comes after Isha.'],
        };
        this.ui.say(tr(lines[p][0], lines[p][1]), p === 'maghrib' ? 'alright' : 'idea', 7000);
      }
    }
    if (this.crossed((s.fajr - 1.2 + 24) % 24)) this.ui.say(tr('Psst… sebentar lagi Subuh. Ayo makan sahur! 🍚', 'Psst… Fajr is coming soon. Time for suhoor! 🍚'), 'idea', 6000);
    if (this.gameEvent) {
      const ev = this.gameEvent;
      const p = this.player.pos;
      if (!ev.attended && p.x > -6 && p.x < 7 && p.z > -26 && p.z < -13 && Math.abs(p.y - (VILLAGE_Y + 1)) < 3) {
        ev.attended = true; this.stats.jamaah++;
        SFX.quest();
        this.ui.say(tr(`Alhamdulillah, kita sholat ${prayerName(ev.p)} berjamaah! Pahalanya 27 kali lipat 🤲`, `Alhamdulillah, we prayed ${prayerName(ev.p)} together! Praying in congregation brings 27 times the reward 🤲`), 'alright', 6000);
        this.checkQuests();
      }
      if (this.crossed(ev.until)) { for (const n of this.ents.npcs) n.goPray(false, n.home); this.gameEvent = null; }
    }
    this.lastHour = this.hour;
  }

  private realReminders() {
    if (!this.settings.reminders) return;
    const now = new Date();
    if (now.getDate() !== this.realTimes.fajr.getDate()) this.refreshTimes();
    for (const p of PRAYERS) {
      const t = this.realTimes[p];
      const k = now.toDateString() + p;
      const diff = (+now - +t) / 60000;
      if (diff >= 0 && diff < 10 && !this.remindersShown.has(k)) {
        this.remindersShown.add(k);
        if (!this.ui.isOpen()) { SFX.chime(); this.ui.reminder(prayerName(p), fmtTime(t, this.loc.lng), this.loc.name); }
        return;
      }
    }
  }

  private slowChecks() {
    const p = this.player.pos;
    const col = this.gen.column(Math.floor(p.x), Math.floor(p.z));
    const bn = Biome[col.biome];
    if (!this.stats.biomes.includes(bn)) {
      this.stats.biomes.push(bn);
      const info = BIOME_INFO[col.biome];
      if (this.stats.biomes.length > 1) {
        this.ui.toast(`${info.icon} ${tr('Tempat baru', 'New place')}: ${tr(info.id, info.en)}!`, 3500);
        const say: Partial<Record<Biome, [string, string]>> = {
          [Biome.DESERT]: ['Gurun kurma! Unta bisa berjalan jauh tanpa banyak minum lho 🐪', 'A date desert! Camels can walk far without drinking much 🐪'],
          [Biome.SNOWY]: ['Brrr, dingin! Salju itu putih bersih ya ❄️', 'Brrr, it’s cold! Snow is so clean and white ❄️'],
          [Biome.FOREST]: ['Hutan yang sejuk. Pohon memberi kita udara segar 🌳', 'A cool forest. Trees give us fresh air 🌳'],
          [Biome.MOUNTAIN]: ['Gunungnya tinggi sekali! Ayo daki pelan-pelan ⛰️', 'What a tall mountain! Let’s climb slowly ⛰️'],
          [Biome.OCEAN]: ['Laut yang luas! Ciptaan Allah sungguh indah 🌊', 'Such a wide sea! Allah’s creation is beautiful 🌊'],
          [Biome.BEACH]: ['Pantai! Dengar suara ombak? 🏖️', 'A beach! Can you hear the waves? 🏖️'],
        };
        const l = say[col.biome]; if (l) this.ui.say(tr(l[0], l[1]), 'ok');
      }
    }
    this.stats.maxY = Math.max(this.stats.maxY, Math.floor(p.y));
    this.stats.minY = Math.min(this.stats.minY, Math.floor(p.y));
    // saplings grow
    for (const s of [...this.saplings]) {
      s.t += 1;
      if (s.t > 100 && this.world.isLoaded(s.x, s.z) && this.world.get(s.x, s.y, s.z) === s.id) { this.growTree(s); this.saplings.splice(this.saplings.indexOf(s), 1); }
    }
    this.checkQuests();
    if (this.dirtySave && this.timers.save > 5) this.timers.save = 5;
  }

  private growTree(s: Sapling) {
    const w = this.world, { x, y, z } = s;
    const put = (a: number, b: number, c: number, id: number) => { const cur = w.get(a, b, c); if (cur === B.AIR || cur === B.TALL_GRASS || (a === x && b === y && c === z)) w.set(a, b, c, id); };
    if (s.id === B.PALM_SAPLING) {
      for (let i = 0; i < 5; i++) put(x, y + i, z, B.PALM_LOG);
      const t = y + 5; put(x, t, z, B.PALM_LEAVES);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { put(x + dx, t, z + dz, B.PALM_LEAVES); put(x + dx * 2, t, z + dz * 2, B.PALM_LEAVES); put(x + dx * 3, t - 1, z + dz * 3, B.PALM_LEAVES); }
    } else if (s.id === B.PINE_SAPLING) {
      for (let i = 0; i < 6; i++) put(x, y + i, z, B.PINE_LOG);
      for (let l = 0; l < 4; l++) { const r = l % 2 ? 1 : 2; for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (Math.abs(dx) + Math.abs(dz) <= r) put(x + dx, y + 2 + l, z + dz, B.PINE_LEAVES); }
      put(x, y + 6, z, B.PINE_LEAVES);
    } else {
      for (let i = 0; i < 4; i++) put(x, y + i, z, B.OAK_LOG);
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 2; dy <= 5; dy++) {
        const r = dy >= 4 ? 1 : 2;
        if (Math.abs(dx) <= r && Math.abs(dz) <= r && !(Math.abs(dx) === r && Math.abs(dz) === r && dy === 5)) put(x + dx, y + dy, z + dz, B.OAK_LEAVES);
      }
    }
    this.fx.sparkle(x + 0.5, y + 2, z + 0.5, 16, 0x9bf29a, 2);
    if (Math.hypot(x - this.player.pos.x, z - this.player.pos.z) < 30) this.ui.say(tr('Lihat! Pohon yang kamu tanam sudah tumbuh! 🌳', 'Look! The tree you planted has grown! 🌳'), 'alright');
  }

  private moLine(): string {
    const lines: [string, string][] = [];
    const c = this.compass();
    if (c) lines.push([`Huruf terdekat ada ${Math.round(c.dist)} meter lagi. Ikuti panah emas! ✨`, `The nearest letter is ${Math.round(c.dist)} metres away. Follow the golden arrow! ✨`]);
    const q = this.activeQuests()[0];
    if (q) lines.push([`Misi kita: ${q.title[0]}. ${q.desc[0]}`, `Our quest: ${q.title[1]}. ${q.desc[1]}`]);
    const np = this.nextGamePrayer();
    lines.push([`Sholat berikutnya di dunia kita: ${prayerName(np.p)} pukul ${this.fmtGame(np.h)} 🕌`, `Next prayer in our world: ${prayerName(np.p)} at ${this.fmtGame(np.h)} 🕌`]);
    lines.push(['Aku senang main bersamamu! 💚', 'I love playing with you! 💚']);
    const l = lines[Math.floor(Math.random() * lines.length)];
    return tr(l[0], l[1]);
  }
  private moTip() {
    if (this.ui.isOpen()) return;
    const tips: [string, string][] = [
      ['Jangan lupa ucapkan Bismillah sebelum mulai ya 🤲', 'Remember to say Bismillah before you start 🤲'],
      ['Tahukah kamu? Senyum itu sedekah 😊', 'Did you know? A smile is a charity 😊'],
      ['Coba bangun rumah atau masjid kecil, yuk! 🕌', 'Let’s try building a little house or masjid! 🕌'],
      ['Lentera Ramadhan bisa dibuat dari kaca, obor, dan tongkat 🏮', 'Ramadan lanterns are made from glass, a torch and sticks 🏮'],
      ['Hewan-hewan senang kalau kita sayangi 🐑', 'Animals are happy when we are kind to them 🐑'],
      ['Gua itu gelap. Bawa obor supaya terang! 🔦', 'Caves are dark. Bring torches to light the way! 🔦'],
      ['Main game boleh, tapi jangan lupa istirahat & minum ya 💧', 'Playing is fun, but remember to rest and drink water 💧'],
    ];
    if (this.sky.night) tips.push(['Lihat bulan sabit di langit! Bulan baru menandai awal bulan Hijriah 🌙', 'Look at the crescent moon! A new moon marks the start of a Hijri month 🌙']);
    if (this.sky.raining) tips.push(['Hujan turun! Saat hujan adalah waktu yang baik untuk berdoa 🌧️', 'It’s raining! Rain is a good time to make du’a 🌧️']);
    const t = tips[Math.floor(Math.random() * tips.length)];
    this.ui.say(tr(t[0], t[1]), 'idea');
  }

  // ---------- camera & avatar ----------
  private updateCamera() {
    const p = this.player, eye = p.eye(), dir = p.look();
    if (this.settings.cam === 'first') {
      this.camera.position.copy(eye);
    } else {
      // over-the-shoulder camera that slides in when something is behind you
      const right = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
      const back = dir.clone().multiplyScalar(-1);
      const want = 4.6;
      const at = (s: number) => eye.clone().addScaledVector(back, s).addScaledVector(right, 0.55 * s / want).add(new THREE.Vector3(0, 0.55 * s / want, 0));
      let d = want;
      for (let s = 0.3; s <= want; s += 0.15) {
        const q = at(s);
        if (this.world.solidAt(Math.floor(q.x), Math.floor(q.y), Math.floor(q.z))) { d = Math.max(0.3, s - 0.35); break; }
      }
      this.camera.position.copy(at(d));
    }
    this.camera.lookAt(eye.clone().addScaledVector(dir, 10));
  }
  private updateAvatar(dt: number, t: number) {
    const a = this.avatar; if (!a) return;
    a.root.visible = this.settings.cam === 'third';
    const p = this.player;
    a.root.position.set(p.pos.x, p.visY, p.pos.z);
    a.root.rotation.y = p.yaw + Math.PI;
    const moving = p.speed > 0.5 && (p.onGround || p.inWater);
    const sw = moving ? Math.sin(t * 10) * 0.7 * Math.min(1, p.speed / 4) : 0;
    a.legs[0].rotation.x = sw; a.legs[1].rotation.x = -sw;
    if (a.armL) a.armL.rotation.x = -sw * 0.8;
    if (a.armR) a.armR.rotation.x = this.mineAnim > 0 ? -1.6 + Math.sin(t * 22) * 0.6 : sw * 0.8;
    a.head.rotation.x = -p.pitch * 0.5;
    if (p.flying) { a.legs[0].rotation.x = 0.2; a.legs[1].rotation.x = 0.2; }
    if (a.blink) { const ph = t % 4.6; a.blink(ph < 0.13); }
    this.updateHeld(t, sw);
  }

  /** item in hand: on the avatar's right hand, and in front of the camera in first person */
  private updateHeld(t: number, sw: number) {
    const id = this.inv.held()?.id ?? -1;
    if (id !== this.heldId) {
      this.heldId = id;
      if (this.heldTP) this.heldTP.removeFromParent();
      if (this.heldFP) this.heldFP.removeFromParent();
      this.heldTP = this.heldFP = null;
      if (id > 0) {
        this.heldTP = heldModel(id); this.avatar?.hand?.add(this.heldTP);
        this.heldTP.rotation.set(-0.6, 0.6, 0);
        this.heldFP = heldModel(id); this.viewModel.add(this.heldFP);
        this.heldFP.scale.multiplyScalar(0.9);
        this.heldFP.rotation.set(0.25, -0.55, 0.05);
      }
    }
    const fp = this.settings.cam === 'first';
    this.viewModel.visible = fp && !this.paused;
    const swing = this.mineAnim > 0 ? Math.sin(t * 22) * 0.35 : 0;
    const bob = Math.sin(t * 9) * 0.02 * Math.min(1, this.player.speed / 4) + sw * 0;
    this.viewModel.position.set(0.5, -0.42 + bob, -0.95);
    this.viewModel.rotation.set(swing, swing * 0.4, 0);
  }

  // ---------- saving ----------
  saveSoon() { this.dirtySave = true; this.timers.save = Math.min(this.timers.save, 2); }
  async save() {
    if (!this.running) return;
    this.dirtySave = false;
    const p = this.player;
    await Save.put('meta', {
      v: SAVE_VERSION, seed: this.seed, hour: this.hour, day: this.day, lang: getLang(),
      player: { x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw, pitch: p.pitch, flying: p.flying },
      inv: this.inv.toJSON(), stats: this.stats, questsDone: [...this.questsDone], claimed: [...this.claimed],
      saplings: this.saplings, settings: this.settings,
    });
    await Save.put('edits', Save.serializeEdits(this.world.edits));
  }
}

const game = new Game();
(window as any).__game = game;
game.boot();
