import * as THREE from 'three';
// All DOM UI: HUD, the tabbed book (bag & crafting, letters, quests, Ramadhan,
// prayer times, settings), dialogs, du'a and letter cards, start & loading screens.
import type { Game } from './main';
import { tr, t2, getLang, setLang } from './i18n';
import { iconURL } from './world/atlas';
import { B, I, LETTERS, nameOf, ITEMS, isBlockId } from './world/blocks';
import { RECIPES, canCraft, STATION_NAME, creativeCatalog, type Recipe } from './game/inventory';
import { SKILLS, skillLevel, toNext, MAX_LEVEL, cookZone, cookQuality, markerAt, type Skill } from './game/skills';
import { QUESTS, CALENDAR, DUAS, Dua, WORDS, Word, LOAD_TIPS, type Treasure, letterReward } from './content';
import { PRAYERS, PRAYER_ICON, prayerName, fmtTime, fmtHour, CITIES, METHODS, HIJRI_MONTHS, MethodId, hijri } from './game/prayer';
import { SFX, playLetter, Speech, haptic, adhan, playAyah } from './game/audio';
import { MARK_INFO, choices, lessons, STAGES, type Lesson, type Syll } from './game/iqro';
import { learnedSurahs } from './game/iqroquest';
import { BIOME_INFO } from './world/gen';
import type { Landmark, Spot } from './world/landmarks';
import { adultSum } from './game/gate';
import { DEEDS, type Deed } from './game/amal';
import { WUDU } from './game/deeds';
import { LOW, SIPS } from './game/thirst';
import { PRAISE, ANIMAL_WORDS, FRUIT_WORDS, COLOR_WORDS, NUMBER_WORDS, BODY_WORDS, WEATHER_WORDS, ACTION_WORDS, PHRASES, GREETS, REPLIES, type Word as EWord } from './game/english';
const ALL_WORDS = () => [...PRAISE, ...Object.values(ANIMAL_WORDS), ...Object.values(FRUIT_WORDS), ...Object.values(COLOR_WORDS), ...NUMBER_WORDS, ...BODY_WORDS.filter((w): w is EWord => !!w), ...Object.values(WEATHER_WORDS), ...Object.values(ACTION_WORDS), ...PHRASES, ...Object.values(GREETS), ...REPLIES.flatMap(r => [r.me, r.back])];
import { WUDU_GUIDE, SHOLAT_GUIDE, poseFrames, type GuideStep } from './game/tutorials';
import { GOALS, GOAL_COINS, ALL_BONUS, progress } from './game/daily';
import { moonPhase, moonAge, moonLit, phaseIndex, daysToNewMoon, drawMoon, PHASES, CONSTELLATIONS } from './game/moon';
import { levelOf, starsFor } from './game/kid';
import { BLUEPRINTS, blueprintCost, OUTFITS, PERK_HATS, type Blueprint } from './game/fun';
import { guessLook, toCss, type Look } from './game/photo';
import { shareFile } from './native';
import { store } from './store';
import { LOCKED } from './game/unlock';
import { isNativeApp, isInstalled, isIOS, canPrompt, promptInstall, canFullscreen, toggleFullscreen, hintDismissed, dismissHint, onInstallChange } from './install';
import type { T2 } from './i18n';
import { ic, tile, COLORS as C } from './icons';
import { arImg } from './arabic';
const PICON: Record<string, string> = { fajr: 'sunrise', dhuhr: 'sun', asr: 'cloudsun', maghrib: 'sunset', isha: 'moon' };
import { isTouch } from './game/input';

const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const h = (html: string) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild as HTMLElement; };
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** what the village shop sells: [item, how many, price in coins] */
const SHOP: [number, number, number][] = [
  [I.DATES, 5, 20], [I.MILK, 2, 30], [B.SAPLING, 2, 20], [B.WOOL_RED, 4, 30], [B.WOOL_BLUE, 4, 30], [B.WOOL_YELLOW, 4, 30],
  [B.LANTERN, 3, 50], [I.FISHING_ROD, 1, 80], [I.PRAYER_MAT, 1, 100], [B.MANGROVE_SEEDLING, 2, 40], [I.KITE_RED, 1, 120], [I.FIREWORK, 3, 60], [I.BOAT, 1, 150],
];

/** what Bu Aminah buys: [item, coins for one] — every find has a use */
const SELL: [number, number][] = [
  [I.GOLDEN_FISH, 100], [I.PEARL, 40], [I.GOLD_INGOT, 30], [I.CRYSTAL, 25], [I.BIG_FISH, 15], [I.SMALL_FISH, 6],
  [I.IRON_INGOT, 10], [I.EGG, 4], [I.MILK, 5], [B.WOOL_WHITE, 3], [I.APPLE, 3], [I.DATES, 2], [B.OBSIDIAN, 12],
];

export type Tab = 'bag' | 'craft' | 'build' | 'wardrobe' | 'map' | 'letters' | 'quests' | 'amal' | 'ramadhan' | 'prayer' | 'settings';
interface Btn { label: string; cls?: string; fn?: () => void; keep?: boolean }

export class UI {
  root = $('#ui');
  private toastT = 0; private bubbleT = 0; private heldT = 0;
  tab: Tab = 'bag';
  private pickSlot = -1;
  private modalStack = 0;

  constructor(private g: Game) {
    if (!isTouch) document.body.classList.add('desktop');
    this.root.innerHTML = `
<div id="hud" class="hidden">
  <div id="topbar">
    <button class="ibtn pill" id="bMenu" aria-label="Menu">${ic('menu')}</button>
    <button class="pill" id="compass"><span id="compassArrow">${ic('arrow')}</span><span id="compassText"></span></button>
    <button class="pill" id="stars"><span class="st">${ic('star')}</span><span class="sv"><b id="starN">0</b><small id="starLv"></small><i class="sbar"><i id="starBar"></i></i></span></button>
    <button class="pill" id="coins" aria-label="Coins"><span class="ci">${ic('coin')}</span><b id="coinN">0</b></button>
    <button class="pill" id="thirst" aria-label="${tr('Minum', 'Water')}"><span class="twd">💧</span><span class="tw"><i class="tb"><i id="twMe"></i></i><small>${tr('Aku', 'Me')}</small></span><span class="tw"><i class="tb"><i id="twMo"></i></i><small>Mo</small></span></button>
    <button class="pill" id="clock"><b id="clockT">--:--</b><small id="clockP"></small></button>
  </div>
  <div id="jmHud" class="pill hidden"></div>
  <div id="raceHud" class="pill hidden"><span id="raceT"></span><button class="btn small ghost" id="raceX">${tr('Keluar', 'Exit')}</button></div>
  <div id="raceCount" class="hidden"></div>
  <div id="raceMath" class="hidden"></div>
  <div id="phraseCard" class="pill hidden"><img src="img/baby-mo-idea.webp" alt=""><div><small class="pt"></small><b class="pe"></b><small class="pid"></small></div><button class="say" id="phSay" aria-label="Listen">${ic('speaker')}</button><button class="btn small gold" id="phSaid">⭐ <span></span></button><button class="phx" id="phX" aria-label="Close">✕</button></div>
  <div id="wordCard" class="pill hidden"><span class="wi"></span><div><b class="we"></b><small class="wid"></small></div><button class="say" id="wordSay" aria-label="Listen">${ic('speaker')}</button></div>
  <div id="actHud" class="pill hidden"><span id="actT"></span><button class="btn small ghost" id="actX">${tr('Keluar', 'Exit')}</button></div>
  <div id="meter" class="hidden"><div class="mz"></div><div class="mk"></div><small id="meterL"></small></div>
  <div id="dzikir" class="pill hidden"><b class="dar" lang="ar" dir="rtl"></b><div><b class="dsay"></b><small class="dmean"></small></div></div>
  <div id="tennisHud" class="pill hidden"><span id="tennisT"></span><button class="btn small ghost" id="tennisX">${tr('Keluar', 'Exit')}</button></div>
  <div id="bedHud" class="pill hidden"><span id="bedT"></span><button class="btn small gold" id="bedNow">😴 ${tr('Tidur sekarang', 'Sleep now')}</button></div>
  <div class="pill" id="bubble"><img src="img/baby-mo-idea.webp" alt=""><div><div class="who">BABY MO</div><div class="txt" id="bubbleTxt"></div></div><button class="say" id="bubbleSay" aria-label="Listen">${ic('speaker')}</button></div>
  <div id="tut" class="pill hidden"><span class="ti" id="tutIcon"></span><div class="tt"><small id="tutN"></small><b id="tutTxt"></b></div><button class="say" id="tutSay" aria-label="Listen">${ic('speaker')}</button><button class="skip" id="tutSkip">${tr('Lewati', 'Skip')} ›</button></div>
  <button id="moHi" class="hidden" aria-label="Say hi">👋 <span>${tr('Hai!', 'Hi!')}</span></button>
  <div class="pill" id="quest"></div>
  <div id="sideBtns">
    <button class="ibtn pill" id="bHome" aria-label="Home">${ic('home')}</button>
    <button class="ibtn pill" id="bBag" aria-label="Bag">${ic('bag')}</button>
    <button class="ibtn pill" id="bLetters" aria-label="Letters">${ic('book')}</button>
    <button class="ibtn pill" id="bCam" aria-label="Camera">${ic('eye')}</button>
  </div>
  <div id="crosshair"></div>
  <svg id="mineRing" viewBox="0 0 46 46"><circle cx="23" cy="23" r="19" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="5"/><circle id="mineArc" cx="23" cy="23" r="19" fill="none" stroke="#FFD874" stroke-width="5" stroke-linecap="round" stroke-dasharray="119.4" stroke-dashoffset="119.4" transform="rotate(-90 23 23)"/></svg>
  <div id="target"></div>
  <div id="heldName"></div>
  <div id="hotbarWrap"><div id="hotbar" class="pill"></div></div>
  <button class="pill hidden" id="bUndo">${ic('undo')} <span></span></button>
  <button class="pill hidden" id="bRot" aria-label="Rotate">${ic('rotate')}</button>
  <div id="waterBtns"><button class="pill hidden" id="bMasjid" aria-label="${tr('Ke masjid', 'Go to the masjid')}"><span class="mi">🕌</span><span>${tr('Ke masjid', 'To the masjid')}</span></button><button class="pill hidden" id="bTennis" aria-label="${tr('Main tenis', 'Play tennis')}"><span class="mi">🎾</span><span>${tr('Main tenis', 'Play tennis')}</span></button><button class="pill hidden" id="bRaceSoon" aria-label="Big race"><span class="mi">🏁</span><span class="pl"></span></button><button class="pill hidden" id="bPlay" aria-label="Play"><span class="mi"></span><span class="pl"></span></button><button class="pill hidden" id="bRace" aria-label="${tr('Balapan', 'Race')}"><span class="mi">🏁</span><span>${tr('Balapan!', 'Race!')}</span></button><button class="pill hidden" id="bBoat" aria-label="Boat">${ic('boat')}<span></span></button><button class="pill hidden" id="bFishHelp" aria-label="How to fish">${ic('fish')}<b>${ic('question')}</b></button></div>
  <button class="pill hidden" id="bStroke" aria-label="Swimming stroke">${ic('swim')}<span class="sn"></span><span class="si"></span></button>
  <div id="fishCue" class="hidden">${tr('KETUK!', 'TAP!')} <small>👆</small></div>
  <button class="pill hidden" id="bPray">🤲 <span>${tr('Sholat bersama', 'Pray together')}</span></button>
  <div id="desktopHint"></div>
  <div id="stick"><div id="knob"></div></div>
  <div id="actions">
    <button class="abtn pill" id="bJump">${ic('up')}<span></span></button>
    <button class="abtn pill" id="bMine">${ic('pickaxe')}<span></span></button>
    <button class="abtn pill" id="bUse">${ic('hand')}<span></span></button>
    <button class="abtn pill hidden" id="bDown">${ic('down')}</button>
  </div>
</div>
<div id="underwater"></div>
<div id="sleepFade"></div>
<div id="dusk"></div>
<div id="toast"></div>
<div id="pickups"></div>
<div id="starPops"></div>
<div id="confetti"></div>
<div id="planBar" class="pill hidden"><div class="pb-t"><b id="pbName"></b><small id="pbState"></small><div id="pbMats"></div></div><button class="btn small ghost" id="pbRot">${ic('rotate')}</button><button class="btn small gold" id="pbBuild">${ic('check')} <span></span></button><button class="btn small ghost" id="pbCancel">${ic('xmark')}</button></div>
<div class="veil" id="vBook"><div class="panel" id="book"></div></div>
<div id="loading" class="hidden"><div class="box"><img src="img/baby-mo-pose-01.webp" alt=""><b id="loadTxt"></b><div class="bar"><i id="loadBar"></i></div><p id="loadTip"></p></div></div>
<div id="start" class="hidden"><div class="panel" id="startPanel"></div></div>`;
    this.labels();
    $('#bMenu').onclick = () => this.openBook('settings');
    $('#bBag').onclick = () => this.openBook('bag');
    $('#bHome').onclick = () => this.dialog({ face: '🏠', who: tr('Pulang', 'Go home'), text: tr('Mau pulang ke desa Baby Mo?', 'Go back to Baby Mo’s village?'), speak: true, buttons: [{ label: ic('home') + tr('Ya, pulang!', 'Yes, take me home!'), cls: 'gold', fn: () => g.goHome(true) }, { label: ic('up') + tr('Naik ke permukaan', 'Just go up to the surface'), fn: () => g.kid.rescueUp() }, { label: tr('Tidak', 'No'), cls: 'ghost' }] });
    $('#stars').onclick = () => this.openBook('quests');
    $('#coins').onclick = () => this.shop();
    $('#thirst').onclick = () => this.waterCard();
    $('#bMasjid').onclick = () => this.masjidPicker();
    $('#bRace').onclick = () => { SFX.click(); this.g.race?.start(); };
    $('#raceX').onclick = () => { SFX.click(); this.g.race?.quit(); };
    $('#wordSay').onclick = () => { const w = this.wordNow; if (w) Speech.talk(w.say ?? w.en, 'en', true, 0); };
    $('#bTennis').onclick = () => { SFX.click(); if (this.g.can('tennis')) this.g.tennis?.menu(); };
    $('#tennisX').onclick = () => { SFX.click(); this.g.tennis?.quit(); };
    $('#bedNow').onclick = () => this.dialog({
      face: 'img/baby-mo-ok.webp', img: true, who: 'Baby Mo',
      text: tr('Sudah siap tidur? Permainan hari ini selesai dan rumahmu tersimpan. Besok kita lanjutkan ya! 🌙', 'Ready for bed? Today’s game ends here and your house is saved. We’ll carry on tomorrow! 🌙'),
      buttons: [{ label: '😴 ' + tr('Ya, tidur', 'Yes, bedtime'), cls: 'gold', fn: () => g.bedtime.sleepNow() }, { label: tr('Sebentar lagi', 'In a little while'), cls: 'ghost' }],
    });
    $('#bFishHelp').onclick = () => this.fishGuide();
    $('#bStroke').onclick = () => this.g.nextStroke();
    $('#bBoat').onclick = () => { if (this.g.inv.count(I.BOAT) > 0) this.g.fun.launchBoat(); else this.boatGuide(); };
    $('#bUndo').onclick = () => g.doUndo();
    $('#pbRot').onclick = () => g.fun.rotatePlan();
    $('#pbBuild').onclick = () => g.fun.build();
    $('#pbCancel').onclick = () => g.fun.cancelPlan();
    $('#bubbleSay').onclick = () => Speech.talk($('#bubbleTxt').textContent || '', getLang(), true, 1);
    $('#tutSay').onclick = () => Speech.talk($('#tutTxt').textContent || '', getLang(), true, 1);
    $('#tutSkip').onclick = () => { SFX.click(); if (this.g.fishCoach?.active) this.g.fishCoach.stop(); else this.g.kid.skipStep(); };
    $('#moHi').onclick = e => { e.stopPropagation(); this.g.useEntity(this.g.ents.mo); };
    $('#bPray').onclick = e => { e.stopPropagation(); this.g.prayTogether(); };
    $('#bRot').onclick = e => { e.stopPropagation(); this.g.rotatePlacement(); const b = e.currentTarget as HTMLElement; b.classList.remove('spin'); void b.offsetWidth; b.classList.add('spin'); };
    $('#bLetters').onclick = () => this.openBook('letters');
    $('#bCam').onclick = () => g.toggleCamera();
    $('#quest').onclick = () => this.openBook('quests');
    $('#clock').onclick = () => this.openBook('prayer');
    $('#compass').onclick = () => this.openBook('map');
    $('#vBook').addEventListener('click', e => { if (e.target === $('#vBook')) this.closeBook(); });
  }

  labels() {
    $('#bJump span').textContent = tr('LOMPAT', 'JUMP');
    $('#bMine span').textContent = tr('GALI', 'MINE');
    $('#bUndo span').textContent = tr('Batal pasang', 'Undo');
    $('#bUse span').textContent = tr('PAKAI', 'USE');
    $('#desktopHint').textContent = tr('WASD jalan · Spasi lompat · Klik kiri gali · Klik kanan pakai/pasang · E tas · R buat · M peta · V kamera',
      'WASD move · Space jump · Left click mine · Right click use/place · E bag · R craft · M map · V camera');
  }

  // ---------- small HUD helpers ----------
  private queued: [string, number][] = [];
  toast(msg: string, ms = 2400) {
    if (this.modals.length) { this.queued.push([msg, ms]); return; }
    this.showToast(msg, ms);
  }
  flushToasts() {
    let d = 300;
    for (const [m, ms] of this.queued.splice(0)) { setTimeout(() => this.showToast(m, ms), d); d += ms + 300; }
  }
  private showToast(msg: string, ms: number) {
    if (this.modals.length) { this.queued.push([msg, ms]); return; }
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(this.toastT); this.toastT = window.setTimeout(() => t.classList.remove('on'), ms);
  }
  say(text: string, pose: 'idea' | 'ok' | 'alright' | 'pose-05' = 'idea', ms?: number) {
    ms = ms ?? Math.min(7000, 2600 + text.length * 45);
    $<HTMLImageElement>('#bubble img').src = `img/baby-mo-${pose}.webp`;
    $('#bubbleTxt').textContent = text;
    $('#bubble').classList.add('on');
    clearTimeout(this.bubbleT); this.bubbleT = window.setTimeout(() => $('#bubble').classList.remove('on'), ms);
    if (this.g.settings.moVoice && !this.modals.length) Speech.talk(text, getLang());
  }
  speak(text: string, force = false) { Speech.talk(text, getLang(), force, 1); }
  stopSpeech() { Speech.stop(1); }
  showUndo(on: boolean) { $('#bUndo').classList.toggle('hidden', !on); }
  showHud(on: boolean) { $('#hud').classList.toggle('hidden', !on); }
  setFlying(on: boolean) { $('#bDown').classList.toggle('hidden', !on); }
  underwater(on: boolean) { $('#underwater').style.display = on ? 'block' : 'none'; }
  sleepFade(on: boolean) { $('#sleepFade').style.opacity = on ? '1' : '0'; }
  mineRing(p: number) {
    $('#mineRing').classList.toggle('on', p > 0);
    $('#mineArc').setAttribute('stroke-dashoffset', String(119.4 * (1 - Math.min(1, p))));
  }
  target(text: string) { const t = $('#target'); if (t.textContent !== text) t.textContent = text; }

  /** a little bounce on the hotbar slot holding this item (or the bag button when it went to the backpack) */
  bumpSlot(id: number) {
    const i = this.g.inv.slots.findIndex((sl, k) => k < 9 && sl?.id === id);
    const el = i >= 0 ? $('#hotbar').children[i] as HTMLElement | undefined : document.getElementById('bBag') ?? undefined;
    if (!el) return;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }
  refreshHotbar() {
    const inv = this.g.inv, el = $('#hotbar');
    if (el.children.length !== 9) {
      el.innerHTML = '';
      for (let i = 0; i < 9; i++) {
        const s = h(`<button class="slot"><img alt=""><b></b></button>`);
        s.onclick = () => { inv.sel = i; this.refreshHotbar(); this.flashHeld(); };
        el.appendChild(s);
      }
    }
    for (let i = 0; i < 9; i++) {
      const s = el.children[i] as HTMLElement, sl = inv.slots[i];
      s.classList.toggle('sel', i === inv.sel);
      const img = s.querySelector('img')!, b = s.querySelector('b')!;
      const src = sl ? iconURL(sl.id) : '';
      if (img.getAttribute('src') !== src) { if (src) img.setAttribute('src', src); else img.removeAttribute('src'); }
      img.style.visibility = sl ? 'visible' : 'hidden';
      b.textContent = sl && (sl.n > 1 || inv.creative) ? (inv.creative ? '∞' : String(sl.n)) : '';
    }
  }
  // ---------- kid-friendly feedback ----------
  tutorial(st: { icon: string; text: string; n: number; of: number; hint?: string } | null) {
    document.querySelectorAll('.pulse').forEach(e => e.classList.remove('pulse'));
    const el = $('#tut');
    if (!st) { el.classList.add('hidden'); document.body.classList.remove('tut-on'); return; }
    el.classList.remove('hidden'); document.body.classList.add('tut-on');
    $('#tutIcon').textContent = st.icon;
    $('#tutN').textContent = tr(`Langkah ${st.n} dari ${st.of}`, `Step ${st.n} of ${st.of}`);
    $('#tutTxt').textContent = st.text;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    if (st.hint) { const t = document.querySelector(st.hint); if (t && getComputedStyle(t).display !== 'none') t.classList.add('pulse'); }
    if (this.g.settings.moVoice) setTimeout(() => { if (!this.modals.length) Speech.talk(st.text, getLang()); }, 400);
  }
  /** the big 👋 button floating over Baby Mo until you've said hi once */
  private hiV = new THREE.Vector3();
  /** the rotate button: shown while holding furniture, a turnable block, or planning a blueprint */
  showRotate(on: boolean) { const b = $('#bRot'); if (b.classList.contains('hidden') === on) b.classList.toggle('hidden', !on); }
  /** the "Pray together" button shows near the masjid at prayer time */
  updatePray() {
    const show = this.g.canPrayTogether() && !this.g.prayingTogether && !this.modals.length;
    $('#bPray').classList.toggle('hidden', !show);
  }
  updateMoHi() {
    const g = this.g, el = $('#moHi'), mo = g.ents?.mo;
    let show = !!mo && !g.stats.talked.mo && !this.modals.length && !g.paused;
    if (show) {
      const v = this.hiV.set(mo.pos.x, mo.pos.y + mo.rig.height + 0.55, mo.pos.z);
      show = v.distanceTo(g.player.pos) < 14;
      v.project(g.camera);
      show &&= v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95;
      if (show) { el.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; el.style.top = ((1 - v.y) / 2 * innerHeight) + 'px'; }
    }
    el.classList.toggle('hidden', !show);
  }
  starPop(n: number) {
    const el = h(`<div class="spop">+${n} ⭐</div>`);
    $('#starPops').appendChild(el);
    setTimeout(() => el.remove(), 1400);
    const s = $('#stars'); s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump');
    this.updateStars();
  }
  updateStars() {
    const st = this.g.stats.stars || 0, lv = levelOf(st);
    const a = starsFor(lv), b = starsFor(lv + 1);
    $('#starN').textContent = String(st);
    $('#starLv').textContent = tr(`Level ${lv}`, `Level ${lv}`);
    $('#starBar').style.width = Math.round((st - a) / (b - a) * 100) + '%';
  }
  confetti(n = 30) {
    const box = $('#confetti');
    const colors = ['#FFD874', '#FF6F91', '#8FD3EC', '#7FC8A9', '#B388FF', '#3FD08C', '#FF9F4D'];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('i');
      c.style.left = (10 + Math.random() * 80) + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = (Math.random() * 0.3) + 's';
      c.style.setProperty('--dx', ((Math.random() - 0.5) * 40) + 'vw');
      c.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
      box.appendChild(c);
      setTimeout(() => c.remove(), 2400);
    }
  }
  /** gift for this letter + how many more until the next treasure chest */
  private letterRewardStrip(r: ReturnType<typeof letterReward>) {
    const n = this.g.stats.letters.length;
    const prevAt = r.next ? r.next.at - 4 : 24;
    const dots = r.treasure ? '' : r.next ? Array.from({ length: 4 }, (_, k) => `<i class="${prevAt + k + 1 <= n ? 'on' : ''}"></i>`).join('') : '';
    const gift = `<span class="lgift"><img src="${iconURL(r.gift[0])}" alt="">+${r.gift[1]} ${esc(t2(nameOf(r.gift[0])))}</span>`;
    const next = r.treasure
      ? `<b class="lnext">${r.treasure.icon} ${tr('Peti harta terbuka!', 'Treasure chest unlocked!')}</b>`
      : r.next ? `<span class="lnext"><span class="ldots">${dots}</span>${r.toNext === 1 ? tr(`1 huruf lagi → ${r.next.icon} peti harta!`, `1 more letter → ${r.next.icon} treasure chest!`) : tr(`${r.toNext} huruf lagi → ${r.next.icon} peti harta`, `${r.toNext} more letters → ${r.next.icon} treasure chest`)}</span>` : '';
    return `<div class="lreward">${gift}${next}</div>`;
  }
  /** you found a landmark: its name, a fun fact and a nudge to look for its treasure */
  discovery(l: Landmark, n: number, of: number) {
    const { el, close } = this.modal(`<div class="lvup discovery"><div class="burst">${l.icon}</div><div class="lvn">${tr('PENEMUAN BARU!', 'NEW DISCOVERY!')}</div><h2>${esc(t2(l.name))}</h2>
      <p class="dfact">💡 ${esc(t2(l.fact))}</p>
      <p>${tr('Ada 🎁 peti harta tersembunyi di sekitar sini. Coba cari!', 'There’s a 🎁 treasure chest hidden around here. Can you find it?')}</p>
      <p><b>🧭 ${n}/${of}</b> ${tr('tempat istimewa ditemukan', 'special places found')}</p>
      <button class="btn gold" id="dOk">${tr('Subhanallah! ✨', 'Subhanallah! ✨')}</button></div>`, undefined, { onShow: () => { this.confetti(60); if (this.g.settings.moVoice) Speech.talk(t2(l.name) + '. ' + t2(l.fact), getLang(), false, 1); } });
    $('#dOk', el).onclick = () => close();
  }
  // ---------- fishing, explained for a seven-year-old ----------
  /** the 🎣? button: shown by the water or while holding a rod */
  showFishHelp(on: boolean) { $('#bFishHelp').classList.toggle('hidden', !on || this.modals.length > 0); }
  /** the swimming-style button, shown while swimming */
  showStroke(on: boolean, changed = false) {
    const b = $('#bStroke');
    b.classList.toggle('hidden', !on || this.modals.length > 0);
    if (!on) return;
    const st = this.g.settings.stroke ?? 'free';
    const names: Record<string, [string, string, string]> = { free: ['🏊', 'Gaya bebas', 'Freestyle'], breast: ['🐸', 'Gaya dada', 'Breaststroke'], dog: ['🐶', 'Gaya anjing', 'Doggy paddle'], back: ['🙃', 'Gaya punggung', 'Backstroke'] };
    const [ic2, id, en] = names[st];
    const txt = tr(id, en);
    if (b.querySelector('.sn')!.textContent !== txt) { b.querySelector('.si')!.textContent = ic2; b.querySelector('.sn')!.textContent = txt; }
    if (changed) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); this.toast(`${ic2} ${txt}!`, 1200); }
  }
  private wordNow: import('./game/english').Word | null = null; private wordT = 0;
  /** a little English word card: the word, big, its Indonesian meaning, and 🔊 to hear it again */
  /** Baby Mo's sentence of the day: a small card that doesn't stop the game; null hides it */
  phraseCard(w: import('./game/english').Word | null, said?: () => void) {
    const el = $('#phraseCard');
    clearTimeout(this.phraseT);
    if (!w) { el.classList.add('hidden'); return; }
    el.querySelector('.pt')!.textContent = tr('Kalimat Bahasa Inggris hari ini', 'Today’s English sentence');
    el.querySelector('.pe')!.textContent = `${w.icon} ${w.en}`;
    el.querySelector('.pid')!.textContent = w.id;
    el.querySelector('#phSaid span')!.textContent = tr('Aku sudah bilang!', 'I said it!');
    const talk = () => Speech.talk(w.en, 'en', true, 1);
    $('#phSay').onclick = talk;
    $('#phSaid').onclick = () => { SFX.click(); el.classList.add('hidden'); said?.(); };
    $('#phX').onclick = () => { SFX.click(); el.classList.add('hidden'); };
    el.classList.remove('hidden', 'pop'); void (el as HTMLElement).offsetWidth; el.classList.add('pop');
    this.phraseT = window.setTimeout(() => el.classList.add('hidden'), 25000);
  }
  private phraseT = 0;
  /** the sentence card is showing (word cards wait) */
  phraseShown() { return !$('#phraseCard').classList.contains('hidden'); }
  wordCard(w: import('./game/english').Word) {
    const el = $('#wordCard');
    this.wordNow = w;
    const wi = el.querySelector('.wi')!;
    if (w.item !== undefined) wi.innerHTML = `<img src="${iconURL(w.item)}" alt="">`; else wi.textContent = w.icon;
    el.querySelector('.we')!.textContent = w.en;
    el.querySelector('.wid')!.textContent = w.id;
    el.classList.remove('hidden', 'pop'); void (el as HTMLElement).offsetWidth; el.classList.add('pop');
    clearTimeout(this.wordT); this.wordT = window.setTimeout(() => el.classList.add('hidden'), 4200);
  }
  /** the button for the place you're at (🏹 archery, 🏀 basketball, 🐴 riding, ⛸️ skating…); null hides it */
  private playKey = '';
  showPlay(b: { icon: string; label: string; fn: () => void } | null) {
    const el = $('#bPlay'), key = b ? b.icon + b.label : '';
    if (key === this.playKey) return;
    this.playKey = key;
    if (!b) { el.classList.add('hidden'); return; }
    el.querySelector('.mi')!.textContent = b.icon; el.querySelector('.pl')!.textContent = b.label;
    (el as HTMLElement).onclick = () => { SFX.click(); b.fn(); };
    el.classList.remove('hidden');
  }
  /** the big race is coming: a button to go and join it (it never stops the game); null hides it */
  raceSoon(label: string | null, fn?: () => void) {
    const el = $('#bRaceSoon');
    if (!label) { el.classList.add('hidden'); return; }
    el.querySelector('.pl')!.textContent = label;
    (el as HTMLElement).onclick = () => { SFX.click(); el.classList.add('hidden'); fn?.(); };
    el.classList.remove('hidden');
  }
  /** the bar at the top while playing (score, tries) with an Exit button; null hides it */
  private actShown = '';
  actHud(txt: string | null, exit?: () => void) {
    const el = $('#actHud');
    if (!txt) { el.classList.add('hidden'); this.actShown = ''; return; }
    if (txt !== this.actShown) { this.actShown = txt; $('#actT').innerHTML = txt; }
    if (exit) ($('#actX') as HTMLElement).onclick = () => { SFX.click(); exit(); };
    el.classList.remove('hidden');
  }
  /** a timing bar: the marker moves; tap when it's in the green part. null hides it */
  meter(m: { pos: number; zone: [number, number]; label?: string } | null) {
    const el = $('#meter');
    if (!m) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const z = el.querySelector<HTMLElement>('.mz')!, k = el.querySelector<HTMLElement>('.mk')!;
    z.style.left = (m.zone[0] * 100).toFixed(1) + '%'; z.style.width = ((m.zone[1] - m.zone[0]) * 100).toFixed(1) + '%';
    k.style.left = (m.pos * 100).toFixed(1) + '%';
    $('#meterL').textContent = m.label ?? '';
  }
  /** a good word for the moment (Alhamdulillah, Masya Allah…) with what it means */
  dzikir(ar: string, say: string, mean: string) {
    const el = $('#dzikir');
    el.querySelector('.dar')!.textContent = ar; el.querySelector('.dsay')!.textContent = say; el.querySelector('.dmean')!.textContent = mean;
    el.classList.remove('hidden', 'pop'); void (el as HTMLElement).offsetWidth; el.classList.add('pop');
    clearTimeout(this.dzT); this.dzT = window.setTimeout(() => el.classList.add('hidden'), 3800);
  }
  private dzT = 0;
  /** the 🎾 button at the tennis court */
  showTennis(on: boolean) { const b = $('#bTennis'); if (b.classList.contains('hidden') === on) b.classList.toggle('hidden', !on); }
  private tennisShown = '';
  /** the score while playing tennis; null hides it */
  tennisHud(txt: string | null) {
    const el = $('#tennisHud');
    if (!txt) { el.classList.add('hidden'); $('#raceMath').classList.add('hidden'); this.tennisShown = ''; return; }
    if (txt !== this.tennisShown) { this.tennisShown = txt; $('#tennisT').innerHTML = txt; }
    el.classList.remove('hidden');
  }
  /** the 🏁 button at the race track */
  showRace(on: boolean) { const b = $('#bRace'); if (b.classList.contains('hidden') === on) b.classList.toggle('hidden', !on); }
  private raceShown = '';
  /** lap, place and time while racing; null hides it */
  /** the sum for the coins you just picked up in a race, big in the middle for a moment */
  raceMath(text: string) {
    const el = $('#raceMath');
    el.textContent = text; el.classList.remove('hidden', 'pop'); void (el as HTMLElement).offsetWidth; el.classList.add('pop');
    clearTimeout(this.mathT); this.mathT = window.setTimeout(() => el.classList.add('hidden'), 2600);
  }
  private mathT = 0;
  raceHud(r: { lap: number; laps: number; place: number; of: number; time: number; coins?: number } | null) {
    const el = $('#raceHud');
    if (!r) { el.classList.add('hidden'); $('#raceMath').classList.add('hidden'); this.raceShown = ''; return; }
    const nth = getLang() === 'id' ? `ke-${r.place}` : ['1st', '2nd', '3rd', '4th', '5th', '6th'][r.place - 1];
    const txt = `🏁 ${tr('Putaran', 'Lap')} ${r.lap}/${r.laps} · <b>${nth}</b> / ${r.of} · 🪙 ${r.coins ?? 0} · ⏱️ ${r.time.toFixed(1)}`;
    if (txt !== this.raceShown) { this.raceShown = txt; $('#raceT').innerHTML = txt; }
    el.classList.remove('hidden');
  }
  /** the big 3 · 2 · 1 · GO! */
  raceCount(t: string | null) {
    const el = $('#raceCount');
    if (!t) { el.classList.add('hidden'); return; }
    if (el.textContent !== t) { el.textContent = t; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    el.classList.remove('hidden');
  }
  /** the 🕌 button: shown while a prayer is waiting and you're not in a masjid */
  showMasjidBtn(on: boolean) { const b = $('#bMasjid'); if (b.classList.contains('hidden') === on) b.classList.toggle('hidden', !on); }
  /** which masjid, and how: go there now, or follow the golden arrow and a trail of light */
  masjidPicker() {
    const g = this.g, p = g.player.pos, ev = g.gameEvent;
    const list = g.sites.map(s => ({ s, d: Math.round(Math.hypot(s.spot.x - p.x, s.spot.z - p.z)) })).sort((a, b) => a.d - b.d);
    this.dialog({
      face: '🕌', who: tr('Ke masjid', 'To the masjid'),
      text: ev && !ev.prayed
        ? tr(`Sudah masuk waktu <b>${prayerName(ev.p)}</b>! Yuk ke masjid supaya bisa sholat berjamaah tepat waktu. Mau ke masjid mana?`, `It’s <b>${prayerName(ev.p)}</b> time! Let’s get to the masjid so we can pray together on time. Which masjid?`)
        : tr('Mau ke masjid mana? Masjid yang bercahaya ✨ adalah tempat sholat berjamaah.', 'Which masjid would you like to go to? The glowing ones ✨ are where we pray together.'),
      buttons: [
        ...list.map(({ s, d }, i) => ({ label: `✨ ${t2(s.name)} · ${d} m`, cls: i === 0 ? 'gold' : '', fn: () => g.goToMasjid(s) })),
        { label: '👣 ' + tr('Tunjukkan jalannya', 'Show me the way'), fn: () => g.guideTo(list[0].s) },
        { label: tr('Nanti', 'Later'), cls: 'ghost' },
      ],
    });
  }
  /** the ⛵ button by the shore: sail if you have a boat, otherwise how to get one */
  showBoat(on: boolean) {
    const b = $('#bBoat'), has = this.g.inv.count(I.BOAT) > 0;
    b.classList.toggle('hidden', !on || this.modals.length > 0);
    const t = has ? tr('Berlayar', 'Sail') : tr('Perahu', 'Boat');
    const sp = b.querySelector('span')!; if (sp.textContent !== t) { sp.textContent = t; b.classList.toggle('q', !has); }
  }
  boatGuide() {
    const g = this.g, first = !g.stats.boatGift;
    const step = (n: number, icon: string, text: string) => `<div class="fgStep"><span class="fgN">${n}</span><span class="fgI">${icon}</span><p>${text}</p></div>`;
    const { el, close } = this.modal(`<div class="fishGuide"><h2>⛵ ${tr('Naik perahu', 'Going by boat')}</h2>
      ${first ? `<div class="fgGift">🎁 ${tr('<b>Kakek Yusuf membuatkanmu sebuah perahu!</b> Sudah ada di tasmu.', '<b>Grandpa Yusuf made you a boat!</b> It’s in your bag.')}</div>` : step(1, '🪵', tr('Buat <b>perahu</b> di meja kerja dari <b>5 papan kayu</b>, atau beli di toko Bu Aminah.', 'Make a <b>boat</b> at a workbench from <b>5 planks</b>, or buy one at Bu Aminah’s shop.'))}
      ${step(2, '🌊', tr('Pergi ke <b>pinggir laut, danau atau sungai</b>, lalu ketuk tombol <b>⛵ Berlayar</b>.', 'Go to the <b>edge of the sea, a lake or a river</b>, then tap <b>⛵ Sail</b>.'))}
      ${step(3, '🕹️', tr('<b>Gerakkan</b> seperti berjalan untuk mendayung. Baby Mo ikut naik!', '<b>Move</b> like walking to row. Baby Mo comes along!'))}
      ${step(4, '🏝️', tr('Dekati <b>daratan</b> dan ketuk <b>✋ Pakai</b> untuk turun. Perahunya kembali ke tasmu.', 'Get close to <b>land</b> and tap <b>✋ Use</b> to get off. The boat goes back into your bag.'))}
      <p class="fgTip">💡 ${tr('Berlayarlah ke Pulau Gunung Api 🌋 atau Taman Karang 🪸!', 'Sail to Volcano Island 🌋 or the Coral Reef 🪸!')}</p>
      <button class="btn gold" id="bgOk">${tr('Ayo berlayar! ⛵', 'Let’s sail! ⛵')}</button></div>`);
    if (first) { g.stats.boatGift = true; g.inv.add(I.BOAT, 1); this.pickup(I.BOAT, 1); SFX.quest(); g.saveSoon(); }
    $('#bgOk', el).onclick = () => { close(); if (g.inv.count(I.BOAT) > 0) setTimeout(() => g.fun.launchBoat(), 80); };
  }
  /** a big "TAP!" by the Use button while a fish bites */
  fishCue(on: boolean) { $('#fishCue').classList.toggle('hidden', !on); $('#bUse').classList.toggle('glow', on); }
  fishGuide() {
    const g = this.g, hasRod = g.inv.count(I.FISHING_ROD) > 0;
    const step = (n: number, icon: string, text: string) => `<div class="fgStep"><span class="fgN">${n}</span><span class="fgI">${icon}</span><p>${text}</p></div>`;
    const { el, close } = this.modal(`<div class="fishGuide"><h2>🎣 ${tr('Cara memancing', 'How to fish')}</h2>
      <div class="row fgBtns"><button class="btn gold" id="fgPractice">🧸 ${tr('Latihan bersama Baby Mo', 'Practise with Baby Mo')}</button>${g.fishers ? `<button class="btn" id="fgPond">🏞️ ${tr('Ke Kolam Pancing', 'To the Fishing Pond')}</button>` : ''}<button class="btn ghost" id="fgOk">${tr('Ayo memancing! 🎣', 'Let’s go fishing! 🎣')}</button></div>
      ${step(1, '🎣', hasRod ? tr('Kamu sudah punya <b>pancingan</b>! 👍', 'You have a <b>fishing rod</b>! 👍') : tr('Buat <b>pancingan</b> di meja kerja: <b>3 tongkat + 1 wol putih</b>. Atau beli di toko Bu Aminah.', 'Make a <b>fishing rod</b> at a workbench: <b>3 sticks + 1 white wool</b>. Or buy one at Bu Aminah’s shop.'))}
      ${step(2, '✋', tr('<b>Pegang</b> pancingannya: ketuk kotaknya di bawah layar.', '<b>Hold</b> the rod: tap its box at the bottom of the screen.'))}
      ${step(3, '🌊', tr('Berdiri di <b>pinggir air</b>, lihat ke air, lalu ketuk tombol <b>✋ Pakai</b>. Pelampung merah terbang ke air!', 'Stand at the <b>edge of the water</b>, look at the water, then tap <b>✋ Use</b>. The red float flies into the water!'))}
      ${step(4, '⏳', tr('<b>Tunggu</b> dengan sabar… pelampungnya bergoyang pelan.', '<b>Wait</b> patiently… the float bobs gently.'))}
      ${step(5, '❗', tr('Saat pelampung <b>tenggelam</b> dan muncul <b>KETUK!</b>, cepat ketuk <b>✋ Pakai</b>!', 'When the float <b>dips down</b> and you see <b>TAP!</b>, quickly tap <b>✋ Use</b>!'))}
      ${step(6, '🐟', tr('Dapat ikan! Kecil, besar, atau <b>ikan emas</b> ✨. Masak di tungku, atau jual ke Bu Aminah.', 'You caught a fish! Small, big, or a <b>golden fish</b> ✨. Cook it at a furnace, or sell it to Bu Aminah.'))}
      <p class="fgTip">💡 ${tr('Terlalu cepat? Tidak apa-apa, coba lagi! Topi Pemancing 🎣 membuat ikan lebih cepat menggigit.', 'Too early? That’s OK, just try again! The Fishing Hat 🎣 makes fish bite sooner.')}</p>
      </div>`, undefined, { onShow: () => { if (g.settings.moVoice) Speech.talk(tr('Cara memancing. Pegang pancingan, berdiri di pinggir air, ketuk pakai. Tunggu sampai pelampung tenggelam, lalu cepat ketuk lagi!', 'How to fish. Hold the rod, stand at the edge of the water and tap Use. Wait until the float dips, then quickly tap again!'), getLang(), false, 1); } });
    // the first time, "Let's go fishing" starts the practice too
    $('#fgOk', el).onclick = () => { close(); if (!g.stats.fishPractice) setTimeout(() => g.fishCoach.start(), 300); };
    $('#fgPractice', el).onclick = () => { close(); setTimeout(() => g.fishCoach.start(), 300); };
    el.querySelector<HTMLElement>('#fgPond')?.addEventListener('click', () => { close(); setTimeout(() => g.goToPond(), 200); });
    g.stats.fishGuide = true;
  }

  // ---------- the Amal Book ----------
  private amalQ: { d: Deed; first: boolean }[] = []; private amalBusy = false;
  /** a small "✨ Praying together ×27" chip; the first time, a card with what Rasulullah ﷺ said */
  amalPop(d: Deed, first: boolean) {
    // the first time: a card with the hadith, shown after whatever the deed itself opens (the letter card, a dialog…)
    if (first) { setTimeout(() => this.amalCard(d), 60); return; }
    if (this.amalQ.length < 4) this.amalQ.push({ d, first });
    if (!this.amalBusy) this.nextAmal();
  }
  private amalCard(d: Deed) {
    {
      const { el, close } = this.modal(`<div class="amalCard"><div class="burst">${d.icon}</div><div class="lvn">${tr('AMAL BARU DI BUKU!', 'A NEW GOOD DEED!')}</div><h2>${esc(t2(d.name))}${d.times ? ` <span class="amx">×${d.times}</span>` : ''}</h2>
        <p class="hadith">“${esc(t2(d.hadith))}”</p><p class="src">${esc(d.src)}</p>
        <p class="note">${tr('Pahala yang sebenarnya ada di sisi Allah. Buku Amal membantu kita ingat betapa Allah menyukai kebaikan. 💛', 'The real reward is with Allah. The Amal Book helps us remember how much He loves good deeds. 💛')}</p>
        <button class="btn gold" id="amOk">${tr('Masya Allah! ✨', 'Masha Allah! ✨')}</button></div>`, undefined, { onShow: () => { SFX.chime(); if (this.g.settings.moVoice) Speech.talk(t2(d.hadith), getLang(), false, 1); } });
      $('#amOk', el).onclick = () => close();
    }
  }
  private nextAmal() {
    const it = this.amalQ.shift(); if (!it) { this.amalBusy = false; return; }
    this.amalBusy = true;
    const el = document.createElement('div'); el.className = 'amalChip';
    el.innerHTML = `✨ ${it.d.icon} ${esc(t2(it.d.name))}${it.d.times ? ` <b>×${it.d.times}</b>` : ''}`;
    document.body.appendChild(el); SFX.pop(6);
    setTimeout(() => { el.remove(); this.nextAmal(); }, 1900);
  }
  /** a tasbih: tap 33 times */
  tasbih() {
    const g = this.g, N = 33;
    let n = 0;
    const { el, close } = this.modal(`<div class="tasbih"><h2>📿 ${tr('Tasbih', 'Tasbih')}</h2>
      <p class="ar" lang="ar" dir="rtl">سُبْحَانَ اللّٰهِ وَبِحَمْدِهِ</p><p class="lat">Subhanallahi wa bihamdihi</p>
      <button class="tsb" id="tsTap"><b id="tsN">0</b><small>/ ${N}</small></button>
      <div class="beads" id="tsBeads">${Array.from({ length: N }, () => '<i></i>').join('')}</div>
      <p id="tsMsg">${tr('Ketuk butirnya sambil mengucap dzikir 🤍', 'Tap the bead as you say it 🤍')}</p>
      <button class="btn ghost small" id="tsX">${tr('Tutup', 'Close')}</button></div>`);
    const beads = el.querySelectorAll<HTMLElement>('#tsBeads i');
    $('#tsTap', el).onclick = () => {
      if (n >= N) return;
      beads[n].classList.add('on'); n++;
      $('#tsN', el).textContent = String(n); SFX.pop(n % 8); haptic(6);
      if (n === N) { SFX.chime(); this.confetti(30); $('#tsMsg', el).innerHTML = tr('Masya Allah! “Dua kalimat ringan di lisan, berat di timbangan.” 🤍', 'Masha Allah! “Light on the tongue, heavy on the scale.” 🤍'); g.amal('dhikr'); g.checkQuests(); }
    };
    $('#tsX', el).onclick = () => close();
  }
  /**
   * wudu, step by step: Baby Mo stands in a little pool of water with drops falling; the big water button
   * (or the glowing step) does the step, with a splash each tap; steps done 3 times take 3 splashes.
   * Before praying it closes by itself when done, then the prayer starts.
   */
  wudu(forPrayer = false, then?: () => void) {
    const g = this.g;
    let i = 0, count = 0;
    const drops = Array.from({ length: 9 }, (_, k) => `<i style="--x:${8 + ((k * 37) % 84)}%;--d:${(k * 0.23) % 1.6}s;--s:${0.7 + ((k * 13) % 5) / 10}"></i>`).join('');
    const { el, close } = this.modal(`<div class="wudu w2"><h2>💧 ${forPrayer ? tr('Wudhu dulu sebelum sholat', 'Wudu before we pray') : tr('Berwudhu', 'Making wudu')}</h2>
      <div class="wBody"><div class="wStage" id="wStage"><div class="wCaustic"></div><div class="wRain">${drops}</div>
        <div class="pgFrames wMo" id="wPic"></div><div class="wPool"></div><div class="wSplash" id="wSplash"></div></div>
      <div class="wSide"><div class="pgN" id="wN"></div><h3 id="wName"></h3><p id="wSay"></p>
        <button class="wTap" id="wTap" aria-label="${tr('Basuh', 'Wash')}"><span class="wIc" id="wIc"></span><b id="wTapL"></b></button>
        <div class="wCnt" id="wCnt"></div></div></div>
      <div class="wsteps">${WUDU.map((w, k) => `<button class="ws" data-k="${k}" aria-label="${esc(t2(w.name))}"><span>${w.icon}</span>${g.settings.english !== false && BODY_WORDS[k] ? `<em class="wen">${BODY_WORDS[k]!.en}</em>` : ''}</button>`).join('')}</div>
      <p id="wMsg">${tr('Ketuk tombol air untuk membasuh 💧', 'Tap the water button to wash 💧')}</p>
      <div class="row"><button class="btn ghost small" id="wGuide">▶️ ${tr('Lihat caranya', 'Watch how')}</button><button class="btn ghost small" id="wX">${tr('Tutup', 'Close')}</button></div></div>`);
    const btns = el.querySelectorAll<HTMLElement>('.ws');
    const pic = this.frames($('#wPic', el));
    const stage = $('#wStage', el), splashBox = $('#wSplash', el);
    const mark = () => {
      btns.forEach((b, k) => { b.classList.toggle('done', k < i); b.classList.toggle('next', k === i); });
      const st = WUDU_GUIDE[Math.min(i, WUDU_GUIDE.length - 1)];
      pic.set(st.frames); $('#wSay', el).textContent = t2(st.say);
      const w = WUDU[Math.min(i, WUDU.length - 1)];
      $('#wN', el).textContent = i < WUDU.length ? `${tr('Langkah', 'Step')} ${i + 1} / ${WUDU.length}` : tr('Selesai', 'Done');
      $('#wName', el).textContent = i < WUDU.length ? t2(w.name) : t2(st.name);
      $('#wIc', el).textContent = i < WUDU.length ? w.icon : '🤲';
      $('#wTapL', el).textContent = i >= WUDU.length ? tr('Selesai!', 'Done!') : w.times > 1 ? tr(`Basuh ${w.times}×`, `Wash ${w.times}×`) : tr('Ketuk!', 'Tap!');
      $('#wCnt', el).innerHTML = i < WUDU.length && w.times > 1 ? Array.from({ length: w.times }, (_, k) => `<i class="${k < count ? 'on' : ''}"></i>`).join('') : '';
      el.querySelector('.wTap')!.classList.toggle('fin', i >= WUDU.length);
    };
    /** water bursts out from Baby Mo, a ring spreads on the pool, Mo bobs */
    const splash = (big = false) => {
      for (let k = 0; k < (big ? 18 : 11); k++) {
        const d = document.createElement('i');
        d.style.setProperty('--a', `${(k / (big ? 18 : 11)) * 360 + Math.random() * 20}deg`);
        d.style.setProperty('--r', `${(big ? 90 : 60) + Math.random() * 40}px`);
        splashBox.appendChild(d); setTimeout(() => d.remove(), 800);
      }
      const ring = document.createElement('b'); splashBox.appendChild(ring); setTimeout(() => ring.remove(), 900);
      stage.classList.remove('bump'); void stage.offsetWidth; stage.classList.add('bump');
    };
    mark();
    const tap = () => {
      if (i >= WUDU.length) return;
      const w = WUDU[i];
      if (count === 0) g.english?.wuduStep(i);
      count++; SFX.splash(); haptic(8); splash();
      if (count >= w.times) {
        i++; count = 0; SFX.pop(i); g.fx.sparkle(g.player.pos.x, g.player.pos.y + 1.2, g.player.pos.z, 4, 0x8fd3ec, 1);
        $('#wMsg', el).textContent = i < WUDU.length ? tr('Bagus! Langkah berikutnya ✨', 'Well done! Next step ✨') : '';
      }
      mark();
      if (i === WUDU.length) {
        g.stats.wudu = (g.stats.wudu || 0) + 1; SFX.chime(); this.confetti(30); splash(true);
        g.wuduDone();
        if (forPrayer) setTimeout(() => { pic.stop(); close(); if (then) setTimeout(then, 250); }, 2600);
        $('#wMsg', el).innerHTML = tr('Wudhu selesai! Doa: <b>Asyhadu an laa ilaaha illallah…</b> Sekarang kamu siap sholat 🤲', 'Wudu done! Say: <b>Ash-hadu an laa ilaaha illallah…</b> Now you’re ready to pray 🤲');
        g.amal('wudu'); g.checkQuests();
      }
    };
    $('#wTap', el).onclick = tap;
    stage.onclick = tap;
    btns.forEach(b => (b.onclick = () => {
      const k = +b.dataset.k!;
      if (k !== i) { if (k > i) { SFX.error(); $('#wMsg', el).textContent = tr('Urutannya dari yang bersinar ya ✨', 'Follow the order: the glowing one ✨'); } return; }
      tap();
    }));
    const notDone = () => { if (forPrayer && i < WUDU.length) g.wuduLater(); };
    $('#wX', el).onclick = () => { pic.stop(); close(); notDone(); };
    $('#wGuide', el).onclick = () => { pic.stop(); close(); notDone(); setTimeout(() => this.poseGuide('wudu'), 30); };
  }
  /** a picture that flips through its frames like a little cartoon, with a soft crossfade */
  private frames(box: HTMLElement, ms = 900) {
    box.innerHTML = '<img alt=""><img alt="">';
    const im = box.querySelectorAll('img');
    let list: string[] = [], k = 0, top = 0;
    const show = (src: string) => { top ^= 1; im[top].src = src; im[top].classList.add('on'); im[top ^ 1].classList.remove('on'); };
    const timer = setInterval(() => { if (!box.isConnected) { clearInterval(timer); return; } if (list.length > 1) { k = (k + 1) % list.length; show(list[k]); } }, ms);
    return {
      set(f: string[]) { if (f.join() === list.join()) return; list = f; k = 0; show(f[0]); },
      stop() { clearInterval(timer); },
    };
  }
  /** the picture guide: Baby Mo shows each step of wudu or sholat, one at a time */
  poseGuide(kind: 'wudu' | 'sholat') {
    const steps: GuideStep[] = kind === 'wudu' ? WUDU_GUIDE : SHOLAT_GUIDE;
    const title = kind === 'wudu' ? `💧 ${tr('Cara berwudhu', 'How to make wudu')}` : `🕌 ${tr('Cara sholat', 'How to pray')}`;
    let i = 0, playing = true, stepT = 0;
    const { el, close } = this.modal(`<div class="poseGuide"><h2>${title}</h2>
      <div class="pgBody"><div class="pgStage"><div class="pgHalo"></div><div class="pgSpark"><i></i><i></i><i></i><i></i></div><div class="pgFrames big" id="pgPic"></div><div class="pgFloor"></div></div><div class="pgInfo">
      <div class="pgN" id="pgN"></div><h3 id="pgName"></h3><p id="pgSay"></p>
      <div class="pgDots">${steps.map((_, k) => `<button data-k="${k}" aria-label="${k + 1}"></button>`).join('')}</div>
      <div class="row"><button class="btn ghost small" id="pgPrev" aria-label="Back">◀</button><button class="btn small gold" id="pgPlay"></button><button class="btn ghost small" id="pgNext" aria-label="Next">▶</button><button class="btn ghost small" id="pgSpeak" aria-label="Listen">${ic('speaker')}</button></div>
      <button class="btn ghost small" id="pgX">${tr('Tutup', 'Close')}</button></div></div></div>`, () => { pic.stop(); clearInterval(auto); Speech.stop(1); });
    const pic = this.frames($('#pgPic', el));
    const say = () => { if (this.g.settings.moVoice) Speech.talk(t2(steps[i].name) + '. ' + t2(steps[i].say), getLang(), true, 1); };
    const show = (n: number, talk = true) => {
      i = (n + steps.length) % steps.length; stepT = 0;
      const s = steps[i];
      pic.set(s.frames);
      $('#pgN', el).textContent = `${tr('Langkah', 'Step')} ${i + 1} / ${steps.length}`;
      $('#pgName', el).textContent = t2(s.name); $('#pgSay', el).textContent = t2(s.say);
      el.querySelectorAll<HTMLElement>('.pgDots button').forEach((b, k) => b.classList.toggle('on', k === i));
      if (talk) say();
    };
    const playBtn = () => { $('#pgPlay', el).textContent = playing ? '⏸ ' + tr('Jeda', 'Pause') : '▶️ ' + tr('Putar', 'Play'); };
    // each step stays long enough to read it aloud, then the next one comes
    const auto = setInterval(() => { if (!el.isConnected) { clearInterval(auto); return; } if (!playing) return; stepT += 0.5; if (stepT >= 7) { if (i === steps.length - 1) { playing = false; playBtn(); this.g.amal('learn'); return; } show(i + 1); } }, 500);
    $('#pgPrev', el).onclick = () => { SFX.click(); show(i - 1); };
    $('#pgNext', el).onclick = () => { SFX.click(); show(i + 1); };
    $('#pgPlay', el).onclick = () => { playing = !playing; if (playing && i === steps.length - 1) show(0); playBtn(); SFX.click(); };
    $('#pgSpeak', el).onclick = () => say();
    el.querySelectorAll<HTMLElement>('.pgDots button').forEach(b => (b.onclick = () => { SFX.click(); show(+b.dataset.k!); }));
    $('#pgX', el).onclick = () => close();
    playBtn(); show(0, false);
    setTimeout(say, 300);
  }
  private amalTab(body: HTMLElement) {
    const g = this.g, log = g.stats.amal, total = (id: string) => log?.total[id] || 0, today = (id: string) => (log && log.day === new Date().toDateString() ? log.today[id] || 0 : 0);
    const all = DEEDS.reduce((a, d) => a + total(d.id), 0), allToday = DEEDS.reduce((a, d) => a + today(d.id), 0);
    body.innerHTML = `<div class="amalHead"><b>📖 ${tr('Buku Amal Kebaikan', 'My Good Deeds Book')}</b><small>${tr(`Hari ini <b>${allToday}</b> kebaikan · semuanya <b>${all}</b>`, `Today <b>${allToday}</b> good deeds · all together <b>${all}</b>`)}</small></div>
      <div class="row amalBtns"><button class="btn small gold" id="amTasbih">📿 ${tr('Tasbih', 'Tasbih')}</button><button class="btn small ghost" id="amWudu">💧 ${tr('Cara wudhu', 'How to make wudu')}</button><button class="btn small ghost" id="amSholat">🕌 ${tr('Cara sholat', 'How to pray')}</button></div>
      ${g.projects ? g.projects.html() : ''}
      <div class="amalList">${DEEDS.map(d => { const n = total(d.id); return `<div class="amalRow ${n ? '' : 'off'}"><div class="ic">${n ? d.icon : '❔'}</div><div class="tx"><b>${esc(t2(d.name))}${d.times ? ` <span class="amx">×${d.times}</span>` : ''} <span class="amn">${n ? `${today(d.id)} ${tr('hari ini', 'today')} · ${n}` : tr('belum', 'not yet')}</span></b><small>“${esc(t2(d.hadith))}” <i>${esc(d.src)}</i></small></div></div>`; }).join('')}</div>
      <p class="tip">💡 ${tr('Kebaikan lain: wudhu di sumur desa, singkirkan batu di jalan, sedekah di kotak masjid, tersenyum pada Baby Mo, doa sebelum tidur, dan jujur saat berbelanja.', 'More good deeds: make wudu at the village well, clear stones from the path, give at the masjid’s charity box, smile at Baby Mo, say the du’a before sleeping, and be honest when shopping.')}</p>
      <p class="note">${tr('Pahala yang sebenarnya ada di sisi Allah. Buku ini membantu kita ingat betapa Allah menyukai kebaikan. Yang paling penting: niat karena Allah. 💛', 'The real reward is with Allah. This book helps us remember how much He loves good deeds. What matters most is doing them for Allah. 💛')}</p>`;
    $('#amTasbih', body).onclick = () => this.tasbih();
    $('#amWudu', body).onclick = () => this.poseGuide('wudu');
    $('#amSholat', body).onclick = () => this.poseGuide('sholat');
  }

  // ---------- coins & the village shop ----------
  private coinShown = 0; private coinRaf = 0;
  /** the coin counter in the top bar; counts up to the new total */
  updateCoins() {
    const want = this.g.stats.coins || 0, el = $('#coinN');
    cancelAnimationFrame(this.coinRaf);
    const from = this.coinShown, t0 = performance.now(), dur = Math.min(1600, 300 + Math.abs(want - from) * 8);
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      this.coinShown = Math.round(from + (want - from) * (1 - Math.pow(1 - k, 3)));
      el.textContent = this.coinShown.toLocaleString(getLang() === 'id' ? 'id-ID' : 'en-US');
      if (k < 1) this.coinRaf = requestAnimationFrame(step); else this.coinRaf = 0;
    };
    step();
  }
  /** a big "+100 🪙" that floats up, with the sum shown */
  private coinBusyUntil = 0;
  coinPop(n: number, from: number) {
    // one at a time: a second reward waits for the first to finish
    const now = performance.now(), wait = Math.max(0, this.coinBusyUntil - now);
    this.coinBusyUntil = now + wait + 1500;
    if (wait > 0) { setTimeout(() => this.coinPop(n, from), wait); this.coinBusyUntil -= 1500; return; }
    const el = document.createElement('div');
    el.className = 'coinPop';
    el.innerHTML = `<b>+${n} 🪙</b><small>${from.toLocaleString()} + ${n} = ${(from + n).toLocaleString()}</small>`;
    document.body.appendChild(el);
    SFX.pop(3); setTimeout(() => SFX.pop(5), 120);
    setTimeout(() => el.remove(), 2600);
    const c = $('#coins'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
  }
  /** the prayer together: which rakaat and which movement */
  private duskShown = -1; private bedShown = '';
  /** the evening light before bedtime (0 day … 1 night) */
  dusk(k: number) {
    const v = Math.round(k * 50) / 50;
    if (v === this.duskShown) return;
    this.duskShown = v; $('#dusk').style.opacity = String(v);
  }
  /** "🌙 Bedtime in 7 min" with a Sleep now button; null hides it */
  bedHud(rem: number | null) {
    const el = $('#bedHud');
    if (rem === null || this.g.jamaah) { if (this.bedShown) { this.bedShown = ''; el.classList.add('hidden'); } return; }
    const m = Math.max(1, Math.ceil(rem / 60)), txt = tr(`🌙 Tidur ${m} menit lagi`, `🌙 Bedtime in ${m} min`);
    if (txt === this.bedShown) return;
    this.bedShown = txt; $('#bedT').textContent = txt; el.classList.remove('hidden');
  }
  private thirstShown = '';
  /** the two little water bars in the top bar: you and Baby Mo */
  thirstHud(h: { me: number; mo: number }) {
    const key = Math.round(h.me) + ':' + Math.round(h.mo);
    if (key === this.thirstShown) return;
    this.thirstShown = key;
    const me = $('#twMe'), mo = $('#twMo');
    me.style.height = Math.max(4, h.me) + '%'; mo.style.height = Math.max(4, h.mo) + '%';
    me.classList.toggle('low', h.me < LOW); mo.classList.toggle('low', h.mo < LOW);
    $('#thirst').classList.toggle('low', h.me < LOW || h.mo < LOW);
  }
  /** tap the water bars: how thirsty everyone is, with a drink right there */
  waterCard() {
    const g = this.g, h = g.thirst.h, pct = (n: number) => Math.round(n) + '%';
    const has = g.inv.count(I.BOTTLE) > 0;
    this.dialog({
      face: 'img/baby-mo-ok.webp', img: true, who: tr('Botol air', 'Water bottle'),
      text: tr(`💧 Kamu: <b>${pct(h.me)}</b> · Baby Mo: <b>${pct(h.mo)}</b><br>Botol: <b>${h.sips} / ${SIPS} teguk</b>${h.sips ? '' : ' — isi di laut, sungai atau sumur desa'}<br><small>Bekerja dan berenang bikin haus. Jangan lupa minum, juga di dunia nyata! 😊</small>`,
        `💧 You: <b>${pct(h.me)}</b> · Baby Mo: <b>${pct(h.mo)}</b><br>Bottle: <b>${h.sips} / ${SIPS} sips</b>${h.sips ? '' : ' — fill it at the sea, a river or the village well'}<br><small>Working and swimming make you thirsty. Remember to drink in real life too! 😊</small>`),
      buttons: has ? [
        ...(g.nearDrinkingWater() && h.sips < SIPS ? [{ label: '🫙 ' + tr('Isi botol', 'Fill the bottle'), cls: 'gold', fn: () => g.thirst.use(true) }] : []),
        ...(h.sips ? [{ label: '😋 ' + tr('Aku minum', 'I’ll drink'), cls: 'gold', fn: () => g.thirst.use(false) }, { label: '🧸 ' + tr('Beri Mo minum', 'Give Mo a drink'), fn: () => g.thirst.giveMo() }] : []),
        { label: tr('Nanti', 'Later'), cls: 'ghost' },
      ] : [{ label: 'OK', cls: 'gold' }],
    });
  }
  private jmPic: ReturnType<UI['frames']> | null = null; private jmTxt = '';
  jamaahHud(j: { step: { name: T2; rakaat: number; pose: import('./game/models').PrayerPose; head?: number }; total: number; joined: boolean } | null, reads?: string | null) {
    const el = $('#jmHud');
    if (!j) { if (!el.classList.contains('hidden')) { el.classList.add('hidden'); this.jmPic?.stop(); this.jmPic = null; el.innerHTML = ''; this.jmTxt = ''; } return; }
    if (!this.jmPic) { el.innerHTML = '<div class="pgFrames jm"></div><span class="jmT"></span>'; this.jmPic = this.frames($('.pgFrames', el), 700); }
    this.jmPic.set(poseFrames(j.step.pose, j.step.name.join(' '), j.step.head ?? 0));
    const txt = `🤲 ${tr('Rakaat', 'Rakaat')} ${j.step.rakaat}/${j.total} · <b>${esc(t2(j.step.name))}</b>${reads ? ` · 📖 ${esc(reads)}` : ''}${j.joined ? '' : ' · ' + tr('kamu keluar barisan', 'you left the row')}`;
    if (this.jmTxt !== txt) { this.jmTxt = txt; $('.jmT', el).innerHTML = txt; }
    el.classList.remove('hidden');
  }
  /** Bu Aminah's village shop: spend coins, and see the sum each time */
  shop() {
    const g = this.g;
    const near = Math.hypot(g.player.pos.x, g.player.pos.z) < 40;
    if (!near) { this.toast(tr('🛒 Toko ada di warung Bu Aminah di desa. Ketuk 🏠 untuk pulang!', '🛒 The shop is at Bu Aminah’s stall in the village. Tap 🏠 to go home!'), 4000); return; }
    const { el, close } = this.modal(`<div class="shop"><h2>🛒 ${tr('Toko Desa', 'Village Shop')}</h2><div class="scTabs"><button class="btn small gold" data-mode="buy">🛍️ ${tr('Beli', 'Buy')}</button><button class="btn small ghost" data-mode="sell">💰 ${tr('Jual', 'Sell')}</button></div><p class="shopHave"></p><div class="shopList"></div><button class="btn ghost small" id="shX">${tr('Tutup', 'Close')}</button></div>`);
    let mode: 'buy' | 'sell' = 'buy';
    el.querySelectorAll<HTMLElement>('[data-mode]').forEach(b => (b.onclick = () => { mode = b.dataset.mode as 'buy' | 'sell'; el.querySelectorAll<HTMLElement>('[data-mode]').forEach(x => { x.classList.toggle('gold', x === b); x.classList.toggle('ghost', x !== b); }); SFX.click(); render(); }));
    const renderSell = () => {
      const have = g.stats.coins || 0, fmt = (n: number) => n.toLocaleString();
      el.querySelector<HTMLElement>('.shopHave')!.innerHTML = `${tr('Koinmu', 'Your coins')}: <b>🪙 ${fmt(have)}</b> · ${tr('Bu Aminah membeli hasil kerjamu', 'Bu Aminah buys what you gather')}`;
      const rows = SELL.filter(([id]) => g.inv.count(id) > 0);
      el.querySelector<HTMLElement>('.shopList')!.innerHTML = rows.length ? rows.map(([id, price]) => `<div class="shopRow"><img src="${iconURL(id)}" alt=""><div><b>${esc(t2(nameOf(id)))} <small>×${g.inv.count(id)}</small></b><small>${fmt(have)} + ${price} = ${fmt(have + price)}</small></div><button class="btn small gold" data-sell="${id}">+🪙 ${price}</button></div>`).join('')
        : `<p>${tr('Belum ada yang bisa dijual. Ikan, mutiara, kristal, telur, susu, wol dan emas bisa dijual di sini!', 'Nothing to sell yet. Fish, pearls, crystals, eggs, milk, wool and gold can be sold here!')}</p>`;
      el.querySelectorAll<HTMLElement>('[data-sell]').forEach(b => (b.onclick = () => {
        const id = +b.dataset.sell!, price = SELL.find(([i]) => i === id)![1];
        if (!g.inv.remove(id, 1)) return;
        g.addCoins(price, from => this.coinPop(price, from)); g.stats.sold = (g.stats.sold || 0) + 1; g.saveSoon(); render();
      }));
    };
    const render = () => {
      if (mode === 'sell') return renderSell();
      const have = g.stats.coins || 0, fmt = (n: number) => n.toLocaleString();
      el.querySelector<HTMLElement>('.shopHave')!.innerHTML = `${tr('Koinmu', 'Your coins')}: <b>🪙 ${fmt(have)}</b>`;
      el.querySelector<HTMLElement>('.shopList')!.innerHTML = SHOP.map(([id, n, price], i) => `<div class="shopRow ${have >= price ? '' : 'poor'}"><img src="${iconURL(id)}" alt=""><div><b>${esc(t2(nameOf(id)))}${n > 1 ? ' ×' + n : ''}</b><small>${have >= price ? `${fmt(have)} − ${price} = ${fmt(have - price)}` : tr(`Kurang ${fmt(price - have)} koin`, `${fmt(price - have)} more coins needed`)}</small></div><button class="btn small ${have >= price ? 'gold' : 'ghost'}" data-buy="${i}">🪙 ${price}</button></div>`).join('');
      el.querySelectorAll<HTMLElement>('[data-buy]').forEach(b => (b.onclick = () => {
        const [id, n, price] = SHOP[+b.dataset.buy!];
        if (!g.spendCoins(price)) { SFX.error(); this.toast(tr('Koinnya belum cukup. Sholat berjamaah dan selesaikan misi untuk dapat koin!', 'Not enough coins yet. Pray together and finish quests to earn coins!')); return; }
        g.inv.add(id, n); this.pickup(id, n); SFX.pickup();
        g.stats.bought = (g.stats.bought || 0) + 1;
        g.checkQuests(); render();
        g.deeds.maybeExtraChange();
      }));
    };
    render();
    $('#shX', el).onclick = () => close();
  }

  /** a piece of the treasure map */
  mapPiece(complete: boolean) {
    const g = this.g;
    const { el, close } = this.modal(`<div class="lvup treasure"><div class="burst">🗺️</div><div class="lvn">${complete ? tr('PETA LENGKAP!', 'THE MAP IS WHOLE!') : tr('POTONGAN PETA!', 'A MAP PIECE!')}</div>
      <h2>${tr(`Potongan ${g.treasure.pieces.length} dari 4`, `Piece ${g.treasure.pieces.length} of 4`)}</h2>
      <canvas class="tmc" width="200" height="200"></canvas>
      <p>${complete ? tr('Lihat tanda ❌! Harta karun besar terkubur di sana. Panah emas akan menunjukkan jalannya.', 'Look at the ❌! The great treasure is buried there. The golden arrow will show the way.') : tr('Cari potongan lainnya di tempat-tempat istimewa.', 'Look for the other pieces at the special places.')}</p>
      <button class="btn gold" id="mpOk">${complete ? tr('Ayo berburu harta! 🧭', 'Let’s go treasure hunting! 🧭') : tr('Hebat! ✨', 'Great! ✨')}</button></div>`, undefined, { onShow: () => this.confetti(complete ? 80 : 40) });
    g.treasure.draw(el.querySelector('canvas')!);
    $('#mpOk', el).onclick = () => close();
  }
  greatTreasure(gifts: [number, number][]) {
    const { el, close } = this.modal(`<div class="lvup treasure"><div class="burst">👑</div><div class="lvn">${tr('HARTA KARUN BESAR!', 'THE GREAT TREASURE!')}</div><h2>${tr('Kamu menemukannya!', 'You found it!')}</h2>
      <div class="gifts">${gifts.map(([id, n]) => `<span><img src="${iconURL(id)}" alt="">×${n}</span>`).join('')}</div>
      <p>${tr('Dan sebuah <b>Mahkota Pemburu Harta</b> 👑 — pakai di 👕 Baju! Harta paling berharga adalah ilmu dan kebaikan yang kita bagi. 💛', 'And a <b>Treasure Hunter’s Crown</b> 👑 — wear it in 👕 Outfits! The best treasure is the knowledge and kindness we share. 💛')}</p>
      <button class="btn gold" id="gtOk">${tr('Alhamdulillah! 🎉', 'Alhamdulillah! 🎉')}</button></div>`, undefined, { onShow: () => { this.confetti(120); SFX.fanfare(); } });
    $('#gtOk', el).onclick = () => close();
  }

  /** a secret spot inside a landmark */
  spotFound(sp: Spot) {
    const { el, close } = this.modal(`<div class="lvup discovery"><div class="burst">${sp.icon}</div><div class="lvn">${tr('TEMPAT RAHASIA!', 'SECRET PLACE!')}</div><h2>${esc(t2(sp.name))}</h2>
      <p class="dfact">✨ ${esc(t2(sp.fact))}</p>
      <button class="btn gold" id="spOk">${tr('Masya Allah! ✨', 'Masha Allah! ✨')}</button></div>`, undefined, { onShow: () => { this.confetti(60); if (this.g.settings.moVoice) Speech.talk(t2(sp.name) + '. ' + t2(sp.fact), getLang(), false, 1); } });
    $('#spOk', el).onclick = () => close();
  }

  /** the telescope on Stargazing Hill: tonight's real moon, and star pictures to join up */
  telescope(tab: 'moon' | 'stars' = 'moon') {
    const g = this.g;
    const { el, close } = this.modal(`<div class="scope"><h2>🔭 ${tr('Teropong Bintang', 'The Telescope')}</h2>
      <div class="scTabs"><button class="btn small ${tab === 'moon' ? 'gold' : 'ghost'}" data-t="moon">🌙 ${tr('Bulan malam ini', 'Tonight’s moon')}</button><button class="btn small ${tab === 'stars' ? 'gold' : 'ghost'}" data-t="stars">✨ ${tr('Gambar bintang', 'Star pictures')}</button></div>
      <div id="scBody"></div>
      <div class="row"><button class="btn ghost small" id="scX">${tr('Tutup', 'Close')}</button></div></div>`, undefined, { onShow: () => SFX.twinkle() });
    $('#scX', el).onclick = () => close();
    el.querySelectorAll<HTMLElement>('[data-t]').forEach(b => (b.onclick = () => { close(); setTimeout(() => this.telescope(b.dataset.t as 'moon' | 'stars'), 60); }));
    const body = $('#scBody', el);
    if (tab === 'moon') {
      const now = new Date(), p = moonPhase(now), idx = phaseIndex(p), age = moonAge(now), lit = Math.round(moonLit(now) * 100);
      const h = hijri(now), hj = h ? `${h.day} ${t2(HIJRI_MONTHS[h.month - 1])} ${h.year} H` : '';
      const toNew = Math.max(1, Math.round(daysToNewMoon(now)));
      const next = h ? (h.month === 8 ? tr(' Bulan Hijriah berikutnya adalah <b>Ramadhan</b>! 🌙', ' The next Hijri month is <b>Ramadan</b>! 🌙') : h.month === 9 ? tr(' Bulan berikutnya <b>Syawal</b> — hari raya Idul Fitri! 🎉', ' The next month is <b>Shawwal</b> — Eid al-Fitr! 🎉') : '') : '';
      body.innerHTML = `<div class="moonBox"><canvas id="scMoon" width="200" height="200"></canvas>
        <div><b class="mName">${PHASES[idx].icon} ${esc(t2(PHASES[idx].name))}</b>
        <small>${tr(`Umur bulan ${Math.floor(age)} hari · ${lit}% bersinar`, `The moon is ${Math.floor(age)} days old · ${lit}% lit`)}</small>
        ${hj ? `<small>📅 ${tr('Hari ini', 'Today is')} <b>${hj}</b></small>` : ''}</div></div>
        <div class="phases">${PHASES.map((ph, i) => `<span class="${i === idx ? 'on' : ''}" title="${esc(t2(ph.name))}">${ph.icon}</span>`).join('')}</div>
        <p>${tr('Setiap bulan Hijriah dimulai saat <b>hilal</b> — bulan sabit tipis pertama — terlihat setelah matahari terbenam. Rasulullah ﷺ bersabda: “Berpuasalah karena melihatnya, dan berbukalah (berhari raya) karena melihatnya.” (HR. Bukhari & Muslim)', 'Each Hijri month begins when the <b>hilal</b> — the first thin crescent — is seen after sunset. The Prophet ﷺ said: “Fast when you see it, and end the fast when you see it.” (Bukhari & Muslim)')}</p>
        <p>${tr(`Bulan baru berikutnya sekitar <b>${toNew} hari</b> lagi. Satu atau dua hari setelahnya, lihatlah ke barat saat Maghrib untuk mencari hilal!`, `The next new moon is in about <b>${toNew} days</b>. A day or two later, look west at Maghrib to spot the hilal!`)}${next}</p>`;
      const cv = $<HTMLCanvasElement>('#scMoon', body), x = cv.getContext('2d')!;
      x.fillStyle = '#0B1736'; x.fillRect(0, 0, 200, 200);
      for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${(0.3 + Math.random() * 0.6).toFixed(2)})`; x.fillRect(Math.random() * 200, Math.random() * 200, 1.5, 1.5); }
      drawMoon(x, 100, 100, 70, p, '#FFF4C8', 'rgba(70,82,120,0.6)');
      return;
    }
    const done = (g.stats.constellations ??= []);
    body.innerHTML = `<p class="scVerse">${tr('“Dialah yang menjadikan bintang-bintang bagimu, agar kamu menjadikannya petunjuk dalam kegelapan di darat dan di laut.” (QS Al-An’am: 97)', '“It is He who made the stars for you, so you can find your way by them in the darkness of land and sea.” (Al-An’am 6:97)')}</p>
      <div class="cons">${CONSTELLATIONS.map(c => `<button class="btn small ${done.includes(c.id) ? 'ghost' : 'gold'}" data-c="${c.id}">${c.icon} ${esc(t2(c.name))}${done.includes(c.id) ? ' ✓' : ''}</button>`).join('')}</div>
      <canvas id="scSky" width="340" height="230"></canvas><p id="scTip">${tr('Pilih gambar bintang, lalu ketuk bintang yang berkedip satu per satu.', 'Pick a star picture, then tap the twinkling star, one after another.')}</p>`;
    const cv = $<HTMLCanvasElement>('#scSky', body), x = cv.getContext('2d')!, tip = $('#scTip', body);
    const W = 340, Hh = 230, bg: [number, number, number][] = Array.from({ length: 70 }, () => [Math.random() * W, Math.random() * Hh, Math.random()]);
    let cur: (typeof CONSTELLATIONS)[number] | null = null, step = 0, raf = 0;
    const sx = (v: number) => 20 + v / 100 * (W - 40), sy = (v: number) => 15 + v / 100 * (Hh - 30);
    const draw = () => {
      const t = performance.now() / 1000;
      x.fillStyle = '#0B1736'; x.fillRect(0, 0, W, Hh);
      for (const [a, b, c] of bg) { x.fillStyle = `rgba(255,255,255,${(0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2 + c * 9))).toFixed(2)})`; x.fillRect(a, b, 1.4, 1.4); }
      if (cur) {
        x.strokeStyle = '#FFD874'; x.lineWidth = 2.5; x.beginPath();
        for (let i = 0; i < step; i++) { const s0 = cur.stars[cur.path[i]]; if (i === 0) x.moveTo(sx(s0.x), sy(s0.y)); else x.lineTo(sx(s0.x), sy(s0.y)); }
        x.stroke();
        cur.stars.forEach((st, i) => {
          const r = st.big ? 5 : 3.6;
          x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(sx(st.x), sy(st.y), r, 0, Math.PI * 2); x.fill();
          const nextI = step < cur!.path.length ? cur!.path[step] : -1;
          if (i === nextI) { x.strokeStyle = `rgba(255,216,116,${(0.5 + 0.5 * Math.sin(t * 6)).toFixed(2)})`; x.lineWidth = 3; x.beginPath(); x.arc(sx(st.x), sy(st.y), 13, 0, Math.PI * 2); x.stroke(); }
          if (cur!.path.slice(0, step).includes(i)) { x.fillStyle = '#FFE9A0'; x.font = '11px system-ui'; x.fillText(st.name, sx(st.x) + 7, sy(st.y) - 7); }
        });
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    const stop = new MutationObserver(() => { if (!el.isConnected) { cancelAnimationFrame(raf); stop.disconnect(); } });
    stop.observe(document.body, { childList: true, subtree: true });
    body.querySelectorAll<HTMLElement>('[data-c]').forEach(b => (b.onclick = () => {
      cur = CONSTELLATIONS.find(c => c.id === b.dataset.c)!; step = 0; SFX.click();
      cv.scrollIntoView({ block: 'center' });
      tip.innerHTML = `${cur.icon} <b>${esc(t2(cur.name))}</b> — ${tr('ketuk bintang yang berkedip', 'tap the twinkling star')}`;
    }));
    cv.onpointerdown = e => {
      if (!cur || step >= cur.path.length) return;
      const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) * W / r.width, py = (e.clientY - r.top) * Hh / r.height;
      const want = cur.stars[cur.path[step]];
      if (Math.hypot(px - sx(want.x), py - sy(want.y)) > 26) { SFX.error(); return; }
      step++; SFX.pop(step);
      if (step < cur.path.length) return;
      const first = !done.includes(cur.id);
      if (first) { done.push(cur.id); g.kid.reward('quiz', 4); g.amal('learn'); g.checkQuests(); g.saveSoon(); }
      SFX.fanfare(); this.confetti(40);
      tip.innerHTML = `⭐ <b>${esc(t2(cur.name))}</b>! ${esc(t2(cur.fact))}`;
      const btn = body.querySelector<HTMLElement>(`[data-c="${cur.id}"]`); if (btn) { btn.classList.remove('gold'); btn.classList.add('ghost'); if (!btn.textContent!.includes('✓')) btn.textContent += ' ✓'; }
    };
  }

  /** a treasure chest opens every 4 letters */
  treasure(t: Treasure) {
    const { el, close } = this.modal(`<div class="lvup treasure"><div class="burst">${t.icon}</div><div class="lvn">${tr('PETI HARTA!', 'TREASURE!')}</div><h2>${esc(t2(t.title))}</h2>
      <p>${tr(`Kamu sudah menemukan ${t.at} huruf hijaiyah. Masya Allah! Ini isinya:`, `You have found ${t.at} hijaiyah letters. Masha Allah! Look inside:`)}</p>
      <div class="gifts">${t.gifts.map(([id, n]) => `<span><img src="${iconURL(id)}" alt="">×${n} <small>${esc(t2(nameOf(id)))}</small></span>`).join('')}</div>
      ${t.at < 28 ? `<p>${tr(`Peti berikutnya di huruf ke-${t.at + 4}. Terus cari ya!`, `The next chest is at letter ${t.at + 4}. Keep looking!`)}</p>` : ''}
      <button class="btn gold" id="trOk">${tr('Alhamdulillah! 🎉', 'Alhamdulillah! 🎉')}</button></div>`, undefined, { onShow: () => { this.confetti(90); SFX.fanfare(); if (this.g.settings.moVoice) Speech.talk(tr('Wah, peti harta! Hebat sekali!', 'Wow, a treasure chest! Amazing!'), getLang()); } });
    $('#trOk', el).onclick = () => close();
  }
  levelUp(lv: number, title: T2, gifts: [number, number][]) {
    const { el, close } = this.modal(`<div class="lvup"><div class="burst">⭐</div><div class="lvn">LEVEL ${lv}!</div><h2>${esc(t2(title))}</h2>
      <p>${tr('Hebat sekali! Ini hadiah untukmu:', 'Awesome! Here are your presents:')}</p>
      <div class="gifts">${gifts.map(([id, n]) => `<span><img src="${iconURL(id)}" alt="">×${n}</span>`).join('')}</div>
      ${(() => { const girl = this.g.settings.avatar === 'girl'; const nw = OUTFITS.filter(i => i.level === lv && (girl ? i.slot !== 'hat' : i.slot !== 'hijab')); return nw.length ? `<p><b>${tr('Baju baru terbuka:', 'New outfits unlocked:')}</b> ${nw.map(i => i.icon + ' ' + esc(t2(i.name))).join(', ')} — ${tr('lihat di 👕 Baju', 'see 👕 Outfits')}</p>` : ''; })()}
      <button class="btn gold" id="lvOk">${tr('Yeay! 🎉', 'Yay! 🎉')}</button></div>`, undefined, { onShow: () => { this.confetti(80); if (this.g.settings.moVoice) Speech.talk(tr(`Hebat! Kamu naik ke level ${lv}!`, `Amazing! You reached level ${lv}!`), getLang()); } });
    $('#lvOk', el).onclick = () => close();
  }

  /** "+2 🌴 Dates" pop-ups stacking in the corner; repeats of the same item merge. */
  private pick = new Map<number, { el: HTMLElement; n: number; t: number }>();
  pickup(id: number, n: number) {
    const box = $('#pickups');
    let p = this.pick.get(id);
    if (p && p.el.isConnected) { p.n += n; clearTimeout(p.t); }
    else {
      const el = h(`<div class="pk"><img src="${iconURL(id)}" alt=""><span></span></div>`);
      box.appendChild(el);
      while (box.children.length > 4) box.firstElementChild!.remove();
      p = { el, n, t: 0 }; this.pick.set(id, p);
    }
    const P = p;
    P.el.querySelector('span')!.textContent = `+${P.n} ${t2(nameOf(id))}`;
    P.el.classList.remove('bump'); void P.el.offsetWidth; P.el.classList.add('bump');
    P.t = window.setTimeout(() => { P.el.classList.add('out'); setTimeout(() => P.el.remove(), 400); this.pick.delete(id); }, 1800);
  }
  flashHeld() {
    const s = this.g.inv.held(), el = $('#heldName');
    el.textContent = s ? t2(nameOf(s.id)) : tr('Tangan kosong', 'Empty hand');
    el.classList.add('on'); clearTimeout(this.heldT); this.heldT = window.setTimeout(() => el.classList.remove('on'), 1500);
  }

  updateHud() {
    const g = this.g;
    this.updateStars();
    if (this.coinShown !== (g.stats.coins || 0) && !this.coinRaf) this.updateCoins();
    // clock + next in-game prayer
    $('#clockT').innerHTML = ic('clock') + fmtHour(g.hour) + (g.weather ? ` <span class="wx" title="${esc(t2(g.weather.info.name))}">${g.weather.info.icon}</span>` : '');
    const np = g.nextGamePrayer();
    const rs = g.ramadhan;
    const ram = rs.inRamadhan ? tr(`🌙 Ramadhan hari ${rs.day}`, `🌙 Ramadan day ${rs.day}`) : '';
    $('#clockP').innerHTML = `${ic(PICON[np.p])} ${prayerName(np.p)} ${fmtHour(np.h)}` + (ram ? ' · ' + ram : '');
    // compass
    const c = g.compass();
    if (c) {
      $('#compassArrow').style.transform = `rotate(${c.rot}rad)`;
      $('#compassText').innerHTML = c.landmark
        ? `<b>${c.landmark}</b> · ${Math.round(c.dist)} m<small>${tr('Menuju tempat istimewa 🧭', 'Heading to a special place 🧭')}</small>`
        : `<b>${g.stats.letters.length}/28</b> · ${Math.round(c.dist)} m<small>${tr('Ikuti panah emas ✨', 'Follow the golden arrow ✨')}</small>`;
    } else {
      $('#compassArrow').style.transform = '';
      $('#compassText').innerHTML = `🏆 28/28<small>${tr('Semua huruf ditemukan!', 'All letters found!')}</small>`;
    }
    // quest tracker
    const q = g.kid?.tutorialActive() ? undefined : g.activeQuests()[0];
    const qe = $('#quest');
    if (q) {
      const [a, b] = q.goal(g.stats);
      const d = g.stats.daily;
      const today = d && d.goals.length ? `<div class="qday">${tr('Hari ini', 'Today')} ${d.goals.map(id => `<span class="${d.done.includes(id) ? 'ok' : ''}">${GOALS.find(x => x.id === id)!.icon}</span>`).join('')} <b>${d.done.length}/3</b></div>` : '';
      const html = `${today}<div class="qt">${q.icon} ${esc(t2(q.title))}</div><div class="qd">${esc(t2(q.desc))}</div><div class="bar"><i style="width:${Math.round(a / b * 100)}%"></i></div>`;
      if (qe.dataset.h !== html) { qe.innerHTML = html; qe.dataset.h = html; }
      qe.classList.remove('hidden');
    } else qe.classList.add('hidden');
  }

  // ---------- book ----------
  isOpen() { return $('#vBook').classList.contains('on') || this.modals.length > 0 || !$('#start').classList.contains('hidden'); }
  openBook(tab: Tab = this.tab) {
    this.tab = tab; this.pickSlot = -1;
    $('#vBook').classList.add('on');
    this.g.pause(true);
    this.renderBook();
    SFX.click();
  }
  closeBook() {
    $('#vBook').classList.remove('on');
    if (!this.modals.length) { this.g.pause(false); this.flushToasts(); }
  }
  renderBook() {
    const tabs: [Tab, string, string][] = [
      ['bag', 'bag', tr('Tas', 'Bag')], ['craft', 'hammer', tr('Buat', 'Craft')], ['build', 'blueprint', tr('Rancang', 'Blueprints')], ['wardrobe', 'shirt', tr('Baju', 'Outfits')], ['map', 'map', tr('Peta', 'Map')], ['letters', 'book', tr('Huruf', 'Letters')], ['quests', 'star', tr('Misi', 'Quests')], ['amal', 'sparkles', tr('Amal', 'Good deeds')],
      ['ramadhan', 'moon', tr('Ramadhan', 'Ramadan')], ['prayer', 'mosque', tr('Sholat', 'Prayer')], ['settings', 'gear', tr('Atur', 'Settings')],
    ];
    const el = $('#book');
    el.innerHTML = `<button class="x" id="bx" aria-label="Close">${ic('xmark')}</button><div class="tabs">${tabs.map(([k, i, l]) => `<button class="tab ${k === this.tab ? 'on' : ''}" data-t="${k}">${ic(i)}<span>${l}</span></button>`).join('')}</div><div id="tabBody"></div>`;
    $('#bx', el).onclick = () => this.closeBook();
    el.querySelectorAll<HTMLElement>('.tab').forEach(b => (b.onclick = () => { this.tab = b.dataset.t as Tab; this.renderBook(); SFX.click(); }));
    const body = $('#tabBody', el);
    ({ bag: () => this.bag(body), craft: () => this.craftTab(body), build: () => this.buildTab(body), wardrobe: () => this.wardrobeTab(body), map: () => this.mapTab(body), letters: () => this.letters(body), quests: () => this.quests(body), amal: () => this.amalTab(body), ramadhan: () => this.ramadhanTab(body), prayer: () => this.prayer(body), settings: () => this.settingsTab(body) })[this.tab]();
  }

  private slotHTML(i: number) {
    const s = this.g.inv.slots[i];
    return `<button class="slot ${i === this.pickSlot ? 'pick' : ''} ${i === this.g.inv.sel ? 'sel' : ''}" data-i="${i}">${s ? `<img src="${iconURL(s.id)}" alt=""><b>${this.g.inv.creative ? '' : s.n > 1 ? s.n : ''}</b>` : ''}</button>`;
  }
  /**
   * Make my look from a photo: pick a picture (or take one), the game guesses
   * hair, skin, shirt and trouser colours, and you can fix any of them by
   * tapping a colour, then tapping the photo. The photo stays on this device
   * and is not saved — only the four colours are.
   */
  photoLook() {
    const g = this.g;
    let look: Look | null = g.settings.look ? { ...g.settings.look } : null;
    let pick: keyof Look = 'shirt';
    const names: Record<keyof Look, [string, string]> = { hair: ['Rambut', 'Hair'], skin: ['Kulit', 'Skin'], shirt: ['Baju', 'Shirt'], pants: ['Celana', 'Trousers'] };
    const { el, close } = this.modal(`<div class="photoLook"><h2>📷 ${tr('Tampilanku dari foto', 'My look from a photo')}</h2>
      <p class="plNote">🔒 ${tr('Fotonya tidak dikirim dan tidak disimpan. Hanya warnanya yang dipakai.', 'The photo is not sent anywhere and not saved. Only its colours are used.')}</p>
      <div class="plRow"><canvas id="plC" width="160" height="200"></canvas><div class="plSw">${(Object.keys(names) as (keyof Look)[]).map(k => `<button class="sw" data-k="${k}"><i></i>${tr(names[k][0], names[k][1])}</button>`).join('')}<small>${tr('Ketuk warna, lalu ketuk fotonya untuk mengganti.', 'Tap a colour, then tap the photo to change it.')}</small></div></div>
      <input type="file" id="plFile" accept="image/*" hidden>
      <div class="row"><button class="btn ghost" id="plPick">🖼️ ${tr('Pilih foto', 'Choose a photo')}</button><button class="btn gold" id="plUse" disabled>✨ ${tr('Pakai tampilan ini', 'Use this look')}</button></div>
      <button class="btn small ghost" id="plX">${tr('Batal', 'Cancel')}</button></div>`);
    const c = $<HTMLCanvasElement>('#plC', el), x = c.getContext('2d', { willReadFrequently: true })!;
    x.fillStyle = '#eef3f8'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#9aa6b2'; x.font = '700 14px Nunito, sans-serif'; x.textAlign = 'center'; x.fillText('📷', 80, 96); x.fillText(tr('belum ada foto', 'no photo yet'), 80, 120);
    const paint = () => {
      el.querySelectorAll<HTMLElement>('.sw').forEach(b => { const k = b.dataset.k as keyof Look; (b.querySelector('i') as HTMLElement).style.background = look ? toCss(look[k]) : '#ddd'; b.classList.toggle('on', k === pick); });
      $<HTMLButtonElement>('#plUse', el).disabled = !look;
    };
    paint();
    el.querySelectorAll<HTMLElement>('.sw').forEach(b => (b.onclick = () => { pick = b.dataset.k as keyof Look; SFX.click(); paint(); }));
    const file = $<HTMLInputElement>('#plFile', el);
    $('#plPick', el).onclick = () => file.click();
    file.onchange = () => {
      const f = file.files?.[0]; if (!f) return;
      const img = new Image(), url = URL.createObjectURL(f);
      img.onload = () => {
        // fit the photo into the little canvas, then read its colours
        const s = Math.min(c.width / img.width, c.height / img.height), w = img.width * s, h = img.height * s;
        x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
        URL.revokeObjectURL(url);
        const d = x.getImageData((c.width - w) / 2, (c.height - h) / 2, Math.max(1, Math.floor(w)), Math.max(1, Math.floor(h)));
        look = guessLook(d.data, d.width, d.height);
        SFX.pickup(); paint();
      };
      img.src = url;
    };
    c.onclick = e => {
      if (!look) return;
      const r = c.getBoundingClientRect(), px = x.getImageData(Math.floor((e.clientX - r.left) / r.width * c.width), Math.floor((e.clientY - r.top) / r.height * c.height), 1, 1).data;
      look[pick] = (px[0] << 16) | (px[1] << 8) | px[2]; SFX.click(); paint();
    };
    $('#plUse', el).onclick = () => { if (!look) return; g.settings.look = look; g.buildAvatar(); g.saveSoon(); SFX.quest(); close(); this.toast(tr('✨ Tampilan baru dipakai!', '✨ Your new look is on!')); if ($('#vBook').classList.contains('on')) this.renderBook(); };
    $('#plX', el).onclick = () => close();
  }
  /** one skill: icon, name, level and a bar to the next level */
  private skillRow(sk: Skill) {
    const xp = this.g.skillXp(sk), lv = skillLevel(xp), left = toNext(xp);
    const info: Record<Skill, [string, string, string, string, string]> = {
      sword: ['⚔️', 'Pedang', 'Sword', 'Usir kumbang nakal', 'Shoo naughty beetles'],
      fishing: ['🎣', 'Memancing', 'Fishing', 'Pancing ikan di air', 'Catch fish in water'],
      cooking: ['🍳', 'Memasak', 'Cooking', 'Masak di tungku', 'Cook at a furnace'],
      climbing: ['🌳', 'Memanjat', 'Climbing', 'Panjat ke puncak pohon', 'Climb to treetops'],
    };
    const [icon, id, en, hid, hen] = info[sk];
    const frac = lv >= MAX_LEVEL ? 1 : 1 - left / Math.max(1, left + (xp - [0, 8, 24, 50, 90][lv - 1]));
    return `<div class="skill"><span class="si">${icon}</span><div><b>${tr(id, en)} <small>Lv ${lv}${lv >= MAX_LEVEL ? ' ⭐' : ''}</small></b><div class="sbar"><i style="width:${Math.round(frac * 100)}%"></i></div><small>${lv >= MAX_LEVEL ? tr('Level tertinggi!', 'Top level!') : tr(hid, hen)}</small></div></div>`;
  }
  /**
   * Cooking game: a marker slides along a bar; tap when it's in the green
   * zone. Three rounds. The food is always made — a perfect cook makes one more.
   */
  cookGame(r: Recipe, done: (q: 'perfect' | 'good' | 'crispy') => void) {
    const g = this.g, zone = cookZone(g.skillLv('cooking'), g.hasHat('hat_chef'));
    const ROUNDS = 3; let round = 0, hits = 0, t0 = performance.now(), centre = 0.3 + Math.random() * 0.4, raf = 0, finished = false;
    const name = t2(nameOf(r.out));
    const { el, close } = this.modal(`<div class="cook"><h2>🍳 ${tr('Memasak', 'Cooking')}: ${esc(name)}</h2>
      <div class="cookPan"><img src="${iconURL(r.ins[0][0])}" alt="" id="ckFood"></div>
      <p id="ckTip">${tr('Ketuk <b>Balik!</b> saat penanda ada di zona hijau', 'Tap <b>Flip!</b> when the marker is in the green zone')}</p>
      <div class="cookBar"><span class="zone" id="ckZone"></span><span class="mark" id="ckMark"></span></div>
      <div class="cookDots">${Array.from({ length: ROUNDS }, (_, i) => `<i data-r="${i}"></i>`).join('')}</div>
      <div class="row"><button class="btn gold big" id="ckGo">🍳 ${tr('Balik!', 'Flip!')}</button></div></div>`, () => cancelAnimationFrame(raf), { onShow: () => { SFX.breakMat('sand'); } });
    const zoneEl = $('#ckZone', el), mark = $('#ckMark', el), go = $<HTMLButtonElement>('#ckGo', el), tip = $('#ckTip', el), food = $<HTMLImageElement>('#ckFood', el);
    const place = () => { zoneEl.style.left = ((centre - zone / 2) * 100) + '%'; zoneEl.style.width = (zone * 100) + '%'; };
    place();
    const tick = () => { const m = markerAt((performance.now() - t0) / 1000, round); mark.style.left = (m * 100) + '%'; raf = requestAnimationFrame(tick); };
    tick();
    go.onclick = () => {
      if (finished) { close(); done(cookQuality(hits, ROUNDS)); return; }
      const m = markerAt((performance.now() - t0) / 1000, round);
      const ok = Math.abs(m - centre) <= zone / 2;
      if (ok) { hits++; SFX.breakMat('sand'); SFX.pop(round + 2); } else SFX.error();
      el.querySelector<HTMLElement>(`[data-r="${round}"]`)!.className = ok ? 'ok' : 'no';
      food.classList.remove('flip'); void food.offsetWidth; food.classList.add('flip');
      round++;
      if (round < ROUNDS) { centre = 0.25 + Math.random() * 0.5; place(); t0 = performance.now(); tip.innerHTML = ok ? tr('Pas sekali! 👍 Lagi…', 'Just right! 👍 Again…') : tr('Hampir! Coba lagi…', 'Almost! Try again…'); return; }
      finished = true; cancelAnimationFrame(raf);
      const q = cookQuality(hits, ROUNDS);
      food.src = iconURL(r.out);
      tip.innerHTML = q === 'perfect' ? tr(`⭐ Sempurna! Kamu dapat <b>${name}</b> tambahan!`, `⭐ Perfect! You get an extra <b>${esc(name)}</b>!`) : q === 'good' ? tr(`😋 Enak! <b>${esc(name)}</b> sudah matang.`, `😋 Yummy! Your <b>${esc(name)}</b> is ready.`) : tr(`🔥 Agak gosong, tapi tetap enak! Latihan lagi ya.`, `🔥 A bit crispy, but still tasty! Keep practising.`);
      go.innerHTML = tr('Bismillah, ambil! 😋', 'Bismillah, take it! 😋');
      if (q === 'perfect') { SFX.fanfare(); this.confetti(40); } else SFX.quest();
    };
  }
  private bag(body: HTMLElement) {
    const g = this.g, inv = g.inv;
    const st = g.stations();
    const chip = (k: 'workbench' | 'furnace') => `<span class="chip ${st.has(k) ? 'on' : ''}">${st.has(k) ? '✓' : '✗'} ${t2(STATION_NAME[k])}</span>`;
    body.innerHTML = `
      <p>${tr('Ketuk dua kotak untuk menukar isinya. Baris atas = hotbar.', 'Tap two slots to swap them. Top row = hotbar.')}</p>
      <div class="grid" id="invGrid" style="margin-top:8px">${Array.from({ length: 9 }, (_, i) => this.slotHTML(i)).join('')}</div>
      <div class="grid" style="margin-top:6px">${Array.from({ length: 27 }, (_, i) => this.slotHTML(i + 9)).join('')}</div>
      ${inv.creative ? `<h3>${tr('🧱 Semua balok (Mode Kreatif)', '🧱 All blocks (Creative)')}</h3><p>${tr('Ketuk untuk menaruh di kotak hotbar yang dipilih.', 'Tap to put it in the selected hotbar slot.')}</p><div class="grid" id="cat">${creativeCatalog().map(id => `<button class="slot" data-c="${id}"><img src="${iconURL(id)}" alt="" title="${esc(t2(nameOf(id)))}"></button>`).join('')}</div>` : ''}
      <button class="btn small" id="toCraft">${ic('hammer')} ${tr('Buat barang', 'Craft things')}</button>
      <h3>🏅 ${tr('Keahlianku', 'My skills')}</h3>
      <div class="skills">${SKILLS.map(sk => this.skillRow(sk)).join('')}</div>`;
    body.querySelectorAll<HTMLElement>('[data-i]').forEach(b => (b.onclick = () => {
      const i = +b.dataset.i!;
      if (this.pickSlot < 0) { this.pickSlot = i; if (i < 9) inv.sel = i; }
      else { if (this.pickSlot !== i) inv.swap(this.pickSlot, i); this.pickSlot = -1; }
      SFX.click(); this.renderBook(); this.refreshHotbar();
    }));
    body.querySelectorAll<HTMLElement>('[data-c]').forEach(b => (b.onclick = () => {
      inv.slots[inv.sel] = { id: +b.dataset.c!, n: 64 }; inv.onChange?.(); SFX.pickup(); this.refreshHotbar(); this.renderBook();
    }));
    $('#toCraft', body).onclick = () => { this.tab = 'craft'; this.renderBook(); };
  }

  private craftTab(body: HTMLElement) {
    const g = this.g, inv = g.inv;
    const st = g.stations();
    const chip = (k: 'workbench' | 'furnace') => `<span class="chip ${st.has(k) ? 'on' : ''}">${st.has(k) ? '✓' : '✗'} ${t2(STATION_NAME[k])}</span>`;
    body.innerHTML = `<p>${tr('Barang hijau bisa dibuat sekarang. Beberapa resep perlu meja kerja atau tungku di dekatmu.', 'Green items can be made now. Some recipes need a workbench or furnace nearby.')}</p>
      <div class="chips" style="margin-top:8px">${chip('workbench')}${chip('furnace')}</div>
      <div class="recipes" id="recipes"></div>`;
    const list = $('#recipes', body);
    const sorted = [...RECIPES].sort((a, b) => Number(canCraft(inv, b, st)) - Number(canCraft(inv, a, st)));
    for (const r of sorted) {
      const ok = canCraft(inv, r, st);
      const row = h(`<div class="recipe ${ok ? 'ok' : ''}"><img src="${iconURL(r.out)}" alt=""><div class="nm">${esc(t2(nameOf(r.out)))}${r.n > 1 ? ' ×' + r.n : ''}<small>${r.at ? '📍 ' + t2(STATION_NAME[r.at]) : tr('Di mana saja', 'Anywhere')}</small><div class="ins">${r.ins.map(([id, n]) => `<span class="${inv.count(id) >= n ? '' : 'miss'}"><img src="${iconURL(id)}" alt="">${n}</span>`).join('')}</div></div><button ${ok ? '' : 'disabled'}>${tr('Buat', 'Make')}</button></div>`);
      row.querySelector('button')!.onclick = () => { if (g.craft(r)) this.renderBook(); };
      list.appendChild(row);
    }
  }

  private buildTab(body: HTMLElement) {
    const g = this.g;
    body.innerHTML = `<p>${tr('Pilih rancangan, lalu lihat bayangan hijaunya di depanmu. Ketuk ✔ untuk membangun — balok-baloknya tersusun sendiri!', 'Pick a blueprint and see its green outline in front of you. Tap ✔ to build — the blocks put themselves together!')}</p><div class="bps" id="bps"></div>`;
    const list = $('#bps', body);
    for (const bp of BLUEPRINTS) {
      const cost = blueprintCost(bp), miss = g.fun.missing(bp);
      const row = h(`<div class="recipe ${miss.length ? '' : 'ok'}"><div class="bpi">${bp.icon}</div><div class="nm">${esc(t2(bp.name))}<small>${esc(t2(bp.desc))}</small><div class="ins">${g.inv.creative ? `<span>${tr('Gratis (Kreatif)', 'Free (Creative)')}</span>` : cost.map(([id, n]) => `<span class="${g.inv.count(id) >= n ? '' : 'miss'}"><img src="${iconURL(id)}" alt="">${n}</span>`).join('')}</div></div><button>${tr('Pilih', 'Choose')}</button></div>`);
      row.querySelector('button')!.onclick = () => { this.closeBook(); g.fun.startPlan(bp); };
      list.appendChild(row);
    }
  }
  private wardrobeTab(body: HTMLElement) {
    const g = this.g, girl = g.settings.avatar === 'girl';
    const o = g.settings.outfit!;
    // girls wear a hijab, and can put a hat with a power on top of it
    const slots: [string, string, (i: typeof OUTFITS[number]) => boolean][] = girl
      ? [['hijab', tr('🧕 Hijab', '🧕 Hijab'), i => i.slot === 'hijab'], ['hat', tr('🎩 Topi ajaib', '🎩 Power hats'), i => i.slot === 'hat' && (PERK_HATS.has(i.id) || i.id === 'none')], ['shirt', tr('👕 Baju', '👕 Shirts'), i => i.slot === 'shirt'], ['cape', tr('🦸 Jubah', '🦸 Capes'), i => i.slot === 'cape']]
      : [['hat', tr('🧢 Topi (yang ✨ punya kekuatan)', '🧢 Hats (✨ ones have powers)'), i => i.slot === 'hat'], ['shirt', tr('👕 Baju', '👕 Shirts'), i => i.slot === 'shirt'], ['cape', tr('🦸 Jubah', '🦸 Capes'), i => i.slot === 'cape']];
    body.innerHTML = `<p>${tr('Naik level untuk membuka baju baru! ⭐', 'Level up to unlock new outfits! ⭐')}</p>
      <button class="btn small gold" id="wdPhoto">📷 ${tr('Buat tampilanku dari foto', 'Make my look from a photo')}</button>${g.settings.look ? ` <button class="btn small ghost" id="wdPhotoOff">${tr('Kembali ke warna biasa', 'Back to normal colours')}</button>` : ''}`
      + slots.map(([slot, label, f]) => `<h3>${label}</h3><div class="wardrobe">${OUTFITS.filter(f).map(i => {
      const on = (o as any)[slot] === i.id, open = g.fun.unlocked(i);
      return `<button class="wd ${on ? 'on' : ''} ${open ? '' : 'locked'} ${i.perk ? 'perk' : ''}" data-id="${i.id}" data-slot="${slot}"><span class="e">${open ? i.icon : '🔒'}</span><span>${esc(t2(i.name))}</span>${open ? (i.perk ? `<small class="perkTxt">✨ ${esc(t2(i.perk))}</small>` : '') : `<small>${i.unlock ? (i.level < 99 ? `Level ${i.level} · ` : '') + esc(t2(i.unlock.how)) : `Level ${i.level}`}</small>`}</button>`;
    }).join('')}</div>`).join('');
    $('#wdPhoto', body).onclick = () => this.photoLook();
    const off = body.querySelector<HTMLElement>('#wdPhotoOff'); if (off) off.onclick = () => { delete g.settings.look; g.buildAvatar(); g.saveSoon(); this.renderBook(); };
    body.querySelectorAll<HTMLElement>('.wd').forEach(b => (b.onclick = () => {
      const item = OUTFITS.find(i => i.id === b.dataset.id)!;
      if (!g.fun.unlocked(item)) { SFX.error(); this.toast(item.unlock && item.level >= 99 ? '🔒 ' + t2(item.unlock.how) : item.unlock ? tr(`Terbuka di Level ${item.level} ⭐ atau: ${t2(item.unlock.how)}`, `Unlocks at level ${item.level} ⭐ or: ${t2(item.unlock.how)}`) : tr(`Terbuka di Level ${item.level} ⭐`, `Unlocks at level ${item.level} ⭐`)); return; }
      (o as any)[b.dataset.slot!] = item.id; SFX.pickup(); g.buildAvatar(); g.saveSoon(); this.renderBook();
      if (item.slot === 'hat') g.wearHat(item.id);
    }));
  }

  // ---------- blueprint placing bar ----------
  planBar(bp: Blueprint | null) {
    const el = $('#planBar');
    el.classList.toggle('hidden', !bp);
    $('#tut').classList.toggle('hidden', !!bp || !this.g.kid.tutorialActive());
    if (bp) { $('#pbName').textContent = bp.icon + ' ' + t2(bp.name); $('#pbBuild span').textContent = tr('Bangun', 'Build'); }
  }
  /** blueprint status: where it's blocked and why, and which materials you have */
  planState(ok: boolean, info?: { blocked: number; why: 'village' | 'you' | 'things' | null; missing: [number, number][]; cost: [number, number][] }) {
    const why = info?.why;
    const t = ok
      ? (info?.missing.length ? tr('Tempatnya pas, tapi bahannya kurang', 'Good spot, but you need more materials') : tr('Tempatnya pas! Ketuk ✔', 'Looks good! Tap ✔'))
      : why === 'village' ? tr('Terlalu dekat bangunan desa — geser ya', 'Too close to the village buildings — move a bit')
      : why === 'you' ? tr('Kamu berdiri di dalamnya — mundur sedikit', 'You’re standing in it — step back a little')
      : tr(`${info?.blocked ?? ''} kotak merah terhalang — geser sedikit`, `${info?.blocked ?? ''} red blocks are in the way — move a little`);
    const e = $('#pbState'); if (e.textContent !== t) e.textContent = t;
    $('#planBar').classList.toggle('bad', !ok);
    if (info) {
      const inv = this.g.inv;
      const html = info.cost.map(([id, n]) => { const have = inv.count(id), enough = have >= n; return `<span class="${enough ? 'ok' : 'no'}"><img src="${iconURL(id)}" alt="">${Math.min(have, n)}/${n}</span>`; }).join('');
      const m = $('#pbMats'); if (m.innerHTML !== html) m.innerHTML = html;
    }
  }
  /** a progress bar while a blueprint builds itself */
  buildProgress(frac: number | null, bp: Blueprint) {
    let el = document.getElementById('buildProg');
    if (frac === null) { el?.classList.add('done'); setTimeout(() => el?.remove(), 600); return; }
    if (!el) { el = h(`<div id="buildProg" class="pill"><b></b><div class="bpbar"><i></i></div></div>`); $('#hud').appendChild(el); }
    el.querySelector('b')!.textContent = `${bp.icon} ${tr('Membangun', 'Building')} ${t2(bp.name)}… ${Math.round(frac * 100)}%`;
    (el.querySelector('.bpbar i') as HTMLElement).style.width = (frac * 100).toFixed(0) + '%';
  }

  private mapZoom = 1;
  private mapTab(body: HTMLElement) {
    const g = this.g;
    const zooms = [96, 200, 400];
    const fun = g.funPlaces();
    body.innerHTML = `${fun.length ? `<h3>✨ ${tr('Tempat seru — langsung ke sana', 'Fun places — go there')}</h3><div class="row funGo">${fun.map(l => `<button class="btn small" data-go="${l.id}">${l.icon} ${esc(t2(l.name))}${g.full || !LOCKED.has(l.id) ? '' : ' 🔒'}</button>`).join('')}</div>` : ''}<div class="row" style="margin-bottom:8px">${zooms.map((z, i) => `<button class="btn ghost small ${i === this.mapZoom ? 'gold' : ''}" data-z="${i}">${z * 2} m</button>`).join('')}</div>
      <div class="mapWrap"><canvas id="mapC" width="400" height="400"></canvas></div>
      <p style="margin-top:6px;font-size:12.5px">${tr('▲ = kamu · 🕌 = desa · ✨ = huruf belum ditemukan · ✓ = sudah ditemukan', '▲ = you · 🕌 = village · ✨ = letter not found yet · ✓ = found')}</p>
      <h3>🧭 ${tr('Jurnal Penjelajah', 'Explorer’s Journal')} <small>(${(g.stats.discovered || []).length}/${g.gen.landmarks.length})</small></h3>
      <div class="journal">${g.gen.landmarks.map(l => { const f = (g.stats.discovered || []).includes(l.id); return `<div class="jr ${f ? 'found' : ''}"><span class="ji">${f ? l.icon : '❔'}</span><div><b>${f ? esc(t2(l.name)) : tr('Belum ditemukan', 'Not found yet')}</b><small>${esc(t2(f ? l.fact : l.hint))}</small></div>${f ? '<span class="jok">✓</span>' : `<button class="btn small ${g.exploreTarget === l.id ? 'gold' : 'ghost'}" data-follow="${l.id}">🧭 ${g.exploreTarget === l.id ? tr('Diikuti', 'Following') : tr('Tunjukkan arah', 'Show the way')}</button>`}</div>`; }).join('')}</div>`;
    body.querySelectorAll<HTMLElement>('[data-go]').forEach(b => (b.onclick = () => { SFX.click(); this.closeBook(); setTimeout(() => g.goPlace(b.dataset.go!), 80); }));
    body.querySelectorAll<HTMLElement>('[data-follow]').forEach(b => (b.onclick = () => { const id = b.dataset.follow!; g.exploreTarget = g.exploreTarget === id ? null : id; SFX.click(); this.renderBook(); }));
    // the treasure map: one quarter for each piece found
    const tm = h(`<div class="tmap"><h3>🗺️ ${tr('Peta Harta Karun', 'Treasure Map')} <small>(${g.treasure.pieces.length}/4)</small></h3>
      <canvas width="240" height="240"></canvas>
      <p>${g.stats.greatTreasure ? tr('Harta karun besar sudah kamu temukan! 👑', 'You found the great treasure! 👑') : g.treasure.complete ? tr('Peta lengkap! Pergi ke tanda ❌ dan gali ke bawah di tengahnya.', 'The map is whole! Go to the ❌ and dig straight down in the middle.') : tr('Potongan peta tersimpan di Mercusuar, Perkemahan Oasis, Rumah Salju dan Reruntuhan Perpustakaan.', 'Map pieces are kept at the Lighthouse, Oasis Camp, Igloo and Library Ruins.')}</p>
      ${g.treasure.complete && !g.stats.greatTreasure ? `<button class="btn small ${g.exploreTarget === 'treasure' ? 'gold' : 'ghost'}" id="tmGo">🧭 ${tr('Tunjukkan arah ke ❌', 'Show the way to the ❌')}</button>` : ''}</div>`);
    body.prepend(tm);
    g.treasure.draw(tm.querySelector('canvas')!);
    const go = tm.querySelector<HTMLElement>('#tmGo'); if (go) go.onclick = () => { g.exploreTarget = g.exploreTarget === 'treasure' ? null : 'treasure'; SFX.click(); this.renderBook(); };
    body.querySelectorAll<HTMLElement>('[data-z]').forEach(b => (b.onclick = () => { this.mapZoom = +b.dataset.z!; this.renderBook(); }));
    const c = $<HTMLCanvasElement>('#mapC', body), x = c.getContext('2d')!;
    const R = zooms[this.mapZoom], N = 100, step = (R * 2) / N, px = c.width / N;
    const P = g.player.pos;
    const BC = ['#3b8fd1', '#e8d7a2', '#7fcf5a', '#3f9a45', '#e6c77d', '#eef4fb', '#9aa1a8', '#8fd36a'];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const wx = Math.floor(P.x - R + i * step), wz = Math.floor(P.z - R + j * step);
      const col = g.gen.column(wx, wz);
      let color = BC[col.biome];
      if (col.h < 40) color = col.h < 34 ? '#2f74b3' : '#4aa3e0';
      else if (col.biome === 6 && col.h > 85) color = '#f4f8ff';
      x.fillStyle = color; x.fillRect(i * px, j * px, px + 0.5, px + 0.5);
      const sh = Math.max(-0.25, Math.min(0.25, (col.h - 46) / 120));
      x.fillStyle = sh > 0 ? `rgba(255,255,255,${sh})` : `rgba(0,0,0,${-sh})`;
      x.fillRect(i * px, j * px, px + 0.5, px + 0.5);
    }
    const toC = (wx: number, wz: number) => [(wx - P.x + R) / (R * 2) * c.width, (wz - P.z + R) / (R * 2) * c.height];
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const inside = (a: number, b: number) => a > 8 && b > 8 && a < c.width - 8 && b < c.height - 8;
    const have = new Set(g.stats.letters);
    for (const s of g.gen.shrines) {
      const [a, b] = toC(s.x, s.z); if (!inside(a, b)) continue;
      x.font = '900 16px Nunito, sans-serif';
      if (have.has(s.letter)) { x.fillStyle = '#1FA971'; x.beginPath(); x.arc(a, b, 8, 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillText('✓', a, b + 1); }
      else { x.font = '18px sans-serif'; x.fillText('✨', a, b); }
    }
    const [va, vb] = toC(0, -18); if (inside(va, vb)) { x.font = '22px sans-serif'; x.fillText('🕌', va, vb); }
    // landmarks you've found (and the one you're following, as a "?")
    for (const l of g.gen.landmarks) {
      const found = (g.stats.discovered || []).includes(l.id);
      if (!found && g.exploreTarget !== l.id) continue;
      const [la, lb] = toC(l.x, l.z); if (!inside(la, lb)) continue;
      x.font = '20px sans-serif'; x.fillText(found ? l.icon : '❓', la, lb);
    }
    // you
    x.save(); x.translate(c.width / 2, c.height / 2); x.rotate(-g.player.yaw);
    x.fillStyle = '#E4423A'; x.strokeStyle = '#fff'; x.lineWidth = 2.5;
    x.beginPath(); x.moveTo(0, -11); x.lineTo(8, 9); x.lineTo(0, 4); x.lineTo(-8, 9); x.closePath(); x.fill(); x.stroke(); x.restore();
    x.font = '900 13px Nunito, sans-serif'; x.fillStyle = 'rgba(21,34,48,.75)'; x.fillText(tr('U', 'N'), c.width / 2, 12);
  }

  private letters(body: HTMLElement) {
    const g = this.g, have = new Set(g.stats.letters);
    body.innerHTML = `<p>${tr(`Kamu sudah menemukan <b>${have.size}</b> dari 28 huruf. Ketuk huruf untuk mendengarnya.`, `You found <b>${have.size}</b> of 28 letters. Tap a letter to hear it.`)}</p>
      <div class="lgrid" style="margin-top:10px">${LETTERS.map((L, i) => have.has(i) ? `<button class="lcell" data-l="${i}"><span class="g">${arImg(L.g, { size: 34, w: 56, h: 52 })}</span><span class="l">${L.name}</span></button>` : `<button class="lcell locked" data-l="${i}"><span class="g">?</span></button>`).join('')}</div>
      <div class="row"><button class="btn gold" id="bQuiz" ${have.size < 3 ? 'disabled style="opacity:.5"' : ''}>${ic('sparkles')} ${tr('Tebak Huruf', 'Letter Quiz')}</button><button class="btn" id="bWords">${ic('blueprint')} ${tr('Susun Kata', 'Word Builder')}</button></div>
      ${have.size < 3 ? `<p style="text-align:center;margin-top:6px">${tr('Temukan 3 huruf untuk membuka kuis.', 'Find 3 letters to unlock the quiz.')}</p>` : ''}`;
    body.querySelectorAll<HTMLElement>('[data-l]').forEach(b => (b.onclick = () => {
      const i = +b.dataset.l!;
      if (!have.has(i)) { this.toast(tr('Belum ditemukan — ikuti kompas emas!', 'Not found yet — follow the golden compass!')); SFX.error(); return; }
      this.letterCard(i, false);
    }));
    const q = $('#bQuiz', body); if (have.size >= 3) q.onclick = () => this.quiz();
    $('#bWords', body).onclick = () => this.wordGame();
    // the Iqro journey: where you are, and lessons you've done to practise again
    {
      const all = lessons(), iq = g.stats.iqro, n = iq?.n ?? 0, stars = iq?.stars ?? {}, open = g.stats.letters.length >= 28;
      const rowsH = [{ n: 1, icon: STAGES[0].icon, name: STAGES[0].name, from: -1, len: 0 }, ...STAGES.slice(1).map(st => ({ ...st, from: all.findIndex(l => l.stage === st.n), len: all.filter(l => l.stage === st.n).length }))].map(st => {
        const doneN = st.n === 1 ? g.stats.letters.length : Math.max(0, Math.min(st.len, n - st.from));
        const of = st.n === 1 ? 28 : st.len, cls = doneN >= of ? 'done' : (st.n === 1 || (open && n >= st.from)) ? 'now' : '';
        const re = st.n > 1 ? Array.from({ length: doneN }, (_, k) => `<button data-l="${st.from + k}">${k + 1}${stars[st.from + k] ? '⭐'.repeat(stars[st.from + k]) : ''}</button>`).join('') : '';
        return `<div class="iqStage ${cls}"><span class="si">${st.icon}</span><div><b>Iqro ${st.n} · ${esc(t2(st.name))}</b> <small>${doneN}/${of}</small><div class="bar"><i style="width:${Math.round((doneN / of) * 100)}%"></i></div>${re ? `<div class="iqRe">${re}</div>` : ''}</div><span>${doneN >= of ? '✅' : cls === 'now' ? '📍' : '🔒'}</span></div>`;
      }).join('');
      const box = h(`<div class="iqroPath"><h3>📖 ${tr('Perjalanan Iqro', 'The Iqro journey')}</h3><p>${open ? (n < all.length ? tr('Ikuti kompas emas ke buku pelajaran berikutnya 📖. Ketuk nomor pelajaran untuk berlatih lagi.', 'Follow the golden compass to the next lesson book 📖. Tap a lesson number to practise it again.') : tr('Kamu sudah tamat! Buku ulangan terus muncul — teruslah berlatih.', 'You finished! Review books keep appearing — keep practising.')) : tr('Temukan semua 28 huruf dulu, lalu perjalanan Iqro dimulai: harakat, tanwin, membaca kata, sampai surat pendek!', 'Find all 28 letters first, then the Iqro journey begins: vowel marks, tanwin, reading words, all the way to short surahs!')}</p><div class="iqPath">${rowsH}</div></div>`);
      body.appendChild(box);
      box.querySelectorAll<HTMLElement>('[data-l]').forEach(b => (b.onclick = () => { SFX.click(); g.iqro.open(true, +b.dataset.l!); }));
    }
    // the English words met while playing, to hear again
    const v = g.stats.vocab || {};
    const all = ALL_WORDS();
    const things: EWord[] = Object.entries(v).filter(([, e]) => e.cat === 'thing' && e.item !== undefined).map(([en, e]) => ({ en, id: e.id ?? '', icon: '', cat: 'thing', item: e.item }));
    const met = [...all.filter(w => v[w.en]), ...things];
    const CATS: [EWord['cat'], string][] = [['animal', tr('🐾 Hewan', '🐾 Animals')], ['fruit', tr('🍎 Buah', '🍎 Fruits')], ['color', tr('🎨 Warna', '🎨 Colours')], ['number', tr('🔢 Angka', '🔢 Numbers')], ['body', tr('💧 Anggota wudhu', '💧 Body (wudu)')], ['weather', tr('🌤️ Cuaca & waktu', '🌤️ Weather & time')], ['action', tr('🏃 Gerakan', '🏃 Actions')], ['thing', tr('🎒 Benda', '🎒 Things')], ['phrase', tr('💬 Kalimat Baby Mo', '💬 Baby Mo’s sentences')], ['greet', tr('👋 Menyapa', '👋 Greetings')], ['praise', tr('🌟 Kata pujian', '🌟 Praise words')]];
    const chip = (w: EWord) => `<button class="vw" data-w="${esc(w.en)}"><span>${w.item !== undefined ? `<img src="${iconURL(w.item)}" alt="">` : w.icon}</span><b>${esc(w.en)}</b><small>${esc(w.id)}</small></button>`;
    const box = h(`<div class="vocab"><h3>📘 ${tr('Kata Bahasa Inggrisku', 'My English Words')} <small>(${met.length})</small></h3>
      ${met.length ? CATS.map(([cat, label]) => { const ws = met.filter(w => w.cat === cat); return ws.length ? `<p class="vcat">${label}</p><div class="vwords">${ws.map(chip).join('')}</div>` : ''; }).join('') : `<p>${tr('Jalan-jalan ke dekat hewan atau pohon buah, dan lakukan hal-hal hebat — kata-kata Bahasa Inggris akan muncul di sini! 🔊', 'Walk near animals and fruit trees, and do great things — English words will appear here! 🔊')}</p>`}</div>`);
    body.appendChild(box);
    box.querySelectorAll<HTMLElement>('[data-w]').forEach(b => (b.onclick = () => { const w = [...all, ...things].find(x => x.en === b.dataset.w); if (w) Speech.talk(w.say ?? w.en, 'en', true, 0); SFX.click(); }));
  }

  private quests(body: HTMLElement) {
    const g = this.g;
    const active = g.activeQuests();
    const dl = g.stats.daily;
    const todayHtml = dl ? `<h3>📅 ${tr('Target hari ini', 'Today’s goals')} <small>(${dl.done.length}/3 · ${tr(`🪙 ${GOAL_COINS} tiap target, bonus ${ALL_BONUS}`, `🪙 ${GOAL_COINS} each, ${ALL_BONUS} bonus for all`)})</small></h3>${dl.goals.map(id => {
      const gl = GOALS.find(x => x.id === id)!, a = progress(dl, g.stats, id), done = dl.done.includes(id);
      return `<div class="qcard ${done ? 'done' : ''}"><div class="ic">${gl.icon}</div><div class="tx"><b>${esc(t2(gl.name))} <span style="color:var(--green-d)">${done ? '✓' : a + '/' + gl.need}</span></b><div class="bar"><i style="width:${Math.round(a / gl.need * 100)}%"></i></div></div></div>`;
    }).join('')}` : '';
    body.innerHTML = `${todayHtml}<p>${tr('Misi itu santai — kerjakan kapan saja kamu mau 😊', 'Quests are relaxed — do them whenever you like 😊')}</p><h3>${tr('Sedang dikerjakan', 'In progress')}</h3>${active.map(q => {
      const [a, b] = q.goal(g.stats);
      return `<div class="qcard"><div class="ic">${q.icon}</div><div class="tx"><b>${esc(t2(q.title))} <span style="color:var(--green-d)">${a}/${b}</span></b><small>${esc(t2(q.desc))}</small></div></div>`;
    }).join('') || `<p>${tr('Semua misi selesai! Masya Allah!', 'All quests done! Masha Allah!')}</p>`}
      <h3>${tr('Stiker kebaikan', 'Good-deed stickers')} (${g.questsDone.size}/${QUESTS.length})</h3>
      <div class="stickers">${QUESTS.map(q => `<span class="${g.questsDone.has(q.id) ? '' : 'off'}" title="${esc(t2(q.title))}">${q.sticker}</span>`).join('')}</div>
      <h3>${tr('Catatan petualangan', 'Adventure log')}</h3>
      <p>🔤 ${g.stats.letters.length}/28 · 🧱 ${g.stats.placed} · 💕 ${g.stats.petted} · 🤲 ${g.stats.gave} · 🕌 ${g.stats.jamaah} · 🌇 ${g.stats.iftar}<br>🧭 ${g.stats.biomes.map(b => (BIOME_INFO as any)[['OCEAN', 'BEACH', 'MEADOW', 'FOREST', 'DESERT', 'SNOWY', 'MOUNTAIN', 'VILLAGE'].indexOf(b)]?.icon ?? '').join(' ')}</p>
      <h3>🐾 ${tr('Sahabat hewan', 'Animal friends')} <small>(${(g.stats.rescued || []).length}/${g.sanctuary.lost.length})</small></h3>
      ${g.sanctuary.lost.map(l => { const home = (g.stats.rescued || []).includes(l.id), fol = g.sanctuary.following().includes(l.id);
        return `<div class="qcard"><div class="ic">${home || fol ? l.icon : '❔'}</div><div class="tx"><b>${home || fol ? esc(l.name) : tr('Hewan yang tersesat', 'A lost animal')}</b><small>${home ? tr('Tinggal di 🏡 Rumah Hewan. Bawa apel atau kurma untuk memberinya makan!', 'Lives at the 🏡 Animal Sanctuary. Bring apples or dates to feed it!') : fol ? tr('Sedang mengikutimu ke Rumah Hewan', 'Following you to the sanctuary') : tr('Menunggu ditolong di suatu tempat…', 'Waiting for help somewhere…')}</small></div>${!home && !fol ? `<button class="btn small ${g.exploreTarget === 'lost:' + l.id ? 'gold' : 'ghost'}" data-lost="${l.id}">🧭</button>` : ''}</div>`; }).join('')}`;
    body.querySelectorAll<HTMLElement>('[data-lost]').forEach(b => (b.onclick = () => { g.exploreTarget = 'lost:' + b.dataset.lost; SFX.click(); this.closeBook?.(); this.toast(tr('🧭 Ikuti panah emas untuk menemukan hewan yang tersesat', '🧭 Follow the golden arrow to find the lost animal')); }));
  }

  private ramadhanTab(body: HTMLElement) {
    const g = this.g, rs = g.ramadhan;
    const unlocked = g.calendarUnlocked();
    const today = rs.inRamadhan ? rs.day : unlocked;
    const hj = rs.hijri ? `${rs.hijri.day} ${t2(HIJRI_MONTHS[rs.hijri.month - 1])} ${rs.hijri.year} H` : '';
    body.innerHTML = `<p>${rs.inRamadhan
      ? tr(`Hari ini <b>${hj}</b>. Selamat menjalankan ibadah puasa! Setiap hari ada kartu kebaikan baru.`, `Today is <b>${hj}</b>. Have a blessed Ramadan! A new good-deed card opens every day.`)
      : tr(`Hari ini ${hj}. Ramadhan tiba sekitar <b>${rs.daysUntil}</b> hari lagi. Sambil menunggu, setiap hari kamu bermain membuka satu kartu kebaikan.`, `Today is ${hj}. Ramadan begins in about <b>${rs.daysUntil}</b> days. Until then, each day you play opens one good-deed card.`)}</p>
      <div class="cal" style="margin-top:10px">${CALENDAR.map((c, i) => {
      const n = i + 1, open = n <= unlocked, cl = g.claimed.has(n);
      return `<button class="day ${open ? 'open' : ''} ${cl ? 'claimed' : ''} ${n === today ? 'today' : ''}" data-d="${n}"><span class="n">${n}</span><span class="i">${open ? c.icon : '🔒'}</span></button>`;
    }).join('')}</div><div id="dayCard"></div>
      <div class="qcard" style="margin-top:10px"><div class="ic">🎉</div><div class="tx"><b>${tr('Bazar Lebaran', 'Eid bazaar')}</b><small>${g.eid.open ? tr('Sudah buka di desa! Ikuti jalan ke selatan dari alun-alun.', 'Open now in the village! Follow the path south of the plaza.') : rs.inRamadhan ? tr('Buka di hari-hari terakhir Ramadhan (mulai hari ke-28).', 'Opens in the last days of Ramadan (from day 28).') : tr(`Buka saat kalender sampai hari ke-28 (${Math.min(unlocked, 28)}/28). Setiap hari bermain membuka satu hari.`, `Opens when the calendar reaches day 28 (${Math.min(unlocked, 28)}/28). Each day you play opens one more.`)}</small></div></div>
      <div class="qcard"><div class="ic">🔭</div><div class="tx"><b>${tr('Lihat bulan malam ini', 'See tonight’s moon')}</b><small>${tr('Teropong di Bukit Bintang menunjukkan bulan yang asli malam ini, dan kapan hilal muncul.', 'The telescope on Stargazing Hill shows the real moon tonight, and when the hilal will appear.')}</small></div><button class="btn small ghost" id="calMoon">🌙</button></div>
      <p style="margin-top:10px;font-size:11.5px">${tr('Tanggal Hijriah dihitung dengan kalender Umm al-Qura; awal Ramadhan di tempatmu bisa berbeda 1 hari sesuai keputusan pemerintah/ulama.', 'Hijri dates use the Umm al-Qura calendar; the start of Ramadan where you live may differ by a day.')}</p>`;
    $('#calMoon', body).onclick = () => this.telescope('moon');
    const show = (n: number) => {
      const c = CALENDAR[n - 1], cl = g.claimed.has(n);
      const dc = $('#dayCard', body);
      dc.innerHTML = `<div class="daycard"><div class="i">${c.icon}</div><b>${tr('Hari', 'Day')} ${n}: ${esc(t2(c.title))}</b><p style="color:var(--ink)">${esc(t2(c.tip))}</p>
        <button class="btn ${cl ? 'ghost' : 'gold'}" id="claim" ${cl ? 'disabled' : ''}><img src="${iconURL(c.reward[0])}" style="width:22px;vertical-align:middle;image-rendering:pixelated"> ${cl ? tr('Hadiah sudah diambil ✓', 'Gift collected ✓') : tr(`Ambil hadiah: ${t2(nameOf(c.reward[0]))} ×${c.reward[1]}`, `Collect gift: ${t2(nameOf(c.reward[0]))} ×${c.reward[1]}`)}</button></div>`;
      if (!cl) $('#claim', dc).onclick = () => { g.claimDay(n); this.renderBook(); setTimeout(() => show(n)); };
    };
    body.querySelectorAll<HTMLElement>('[data-d]').forEach(b => (b.onclick = () => {
      const n = +b.dataset.d!;
      if (n > unlocked) { this.toast(tr('Kartu ini belum terbuka. Sabar ya 😊', 'This card is not open yet. Be patient 😊')); return; }
      show(n); SFX.click();
    }));
    if (today >= 1 && today <= 30) show(Math.min(today, unlocked));
  }

  private prayer(body: HTMLElement) {
    const g = this.g, t = g.realTimes, now = new Date();
    const next = PRAYERS.find(p => t[p] > now);
    body.innerHTML = `<p>${tr(`Jadwal sholat hari ini di <b>${esc(g.loc.name)}</b>:`, `Today's prayer times in <b>${esc(g.loc.name)}</b>:`)}</p>
      <div class="ptable" style="margin-top:8px">${PRAYERS.map(p => `<div class="prow ${p === next ? 'next' : ''}"><span class="pic">${ic(PICON[p])}</span><span class="nm">${prayerName(p)}</span><span class="tm">${fmtTime(t[p], g.loc.lng)}</span></div>`).join('')}</div>
      ${next ? `<p style="margin-top:8px;text-align:center">${tr('Sholat berikutnya', 'Next prayer')}: <b>${prayerName(next)}</b> · ${tr('sekitar', 'in about')} ${Math.max(1, Math.round((+t[next] - +now) / 60000))} ${tr('menit lagi', 'minutes')}</p>` : ''}
      <div class="set"><span>${tile('map', C.red)}${tr('Kota', 'City')}</span><select id="selCity"><option value="">${esc(g.loc.name)}</option>${CITIES.map((c, i) => `<option value="${i}">${c.i} ${c.n}</option>`).join('')}<option value="gps">${ic('map')} ${tr('Pakai lokasiku', 'Use my location')}</option></select></div>
      <div class="set"><span>${tile('clock', C.indigo)}${tr('Metode', 'Method')}</span><select id="selMethod">${METHODS.map(m => `<option value="${m.id}" ${m.id === g.settings.method ? 'selected' : ''}>${t2(m.label)}</option>`).join('')}</select></div>
      <div class="set"><span>${tile('bell', C.red)}${tr('Pengingat sholat (waktu asli)', 'Prayer reminders (real time)')}</span><button class="toggle ${g.settings.reminders ? 'on' : ''}" id="tRem"></button></div>
      <div class="row amalBtns"><button class="btn small gold" id="prGo">🕌 ${tr('Ke masjid', 'Go to a masjid')}</button><button class="btn small ghost" id="prSholat">🕌 ${tr('Cara sholat', 'How to pray')}</button><button class="btn small ghost" id="prWudu">💧 ${tr('Cara wudhu', 'How to make wudu')}</button></div>
      <h3>${tr('Di dalam game', 'Inside the game')}</h3>
      <p>${tr('Matahari di dunia Baby Mo mengikuti jadwal di atas: fajar saat Subuh, terbenam saat Maghrib. Saat waktu sholat tiba di game, warga desa berjalan ke masjid — kamu boleh ikut!', 'The sun in Baby Mo’s world follows this schedule: dawn at Fajr, sunset at Maghrib. When it is prayer time in the game, villagers walk to the masjid — you can join them!')}</p>
      <p style="font-size:11.5px;margin-top:6px">${tr('Waktu dihitung otomatis di perangkat, dan bisa berbeda beberapa menit dari jadwal masjid setempat.', 'Times are calculated on the device and may differ a few minutes from your local masjid.')}</p>`;
    $('#prSholat', body).onclick = () => this.poseGuide('sholat');
    $('#prGo', body).onclick = () => { this.closeBook(); setTimeout(() => this.masjidPicker(), 50); };
    $('#prWudu', body).onclick = () => this.poseGuide('wudu');
    $<HTMLSelectElement>('#selCity', body).onchange = e => {
      const v = (e.target as HTMLSelectElement).value;
      if (v === 'gps') {
        navigator.geolocation?.getCurrentPosition(p => { g.setLocation({ name: tr('Lokasiku', 'My location'), lat: p.coords.latitude, lng: p.coords.longitude }); this.renderBook(); },
          () => this.toast(tr('Lokasi tidak bisa dipakai. Pilih kota saja ya.', 'Location unavailable. Please pick a city.')), { timeout: 8000 });
      } else if (v) { const c = CITIES[+v]; g.setLocation({ name: c.n, lat: c.lat, lng: c.lng }); this.renderBook(); }
    };
    $<HTMLSelectElement>('#selMethod', body).onchange = e => { g.settings.method = (e.target as HTMLSelectElement).value as MethodId; g.refreshTimes(); g.saveSoon(); this.renderBook(); };
    $('#tRem', body).onclick = () => { g.settings.reminders = !g.settings.reminders; g.saveSoon(); this.renderBook(); };
  }

  private settingsTab(body: HTMLElement) {
    const g = this.g, s = g.settings;
    const tog = (id: string, on: boolean, label: string) => `<div class="set"><span>${label}</span><button class="toggle ${on ? 'on' : ''}" id="${id}"></button></div>`;
    body.innerHTML = `
      ${tog('tSfx', s.sfx, tile('speaker', C.pink) + tr('Efek suara', 'Sound effects'))}
      ${tog('tMusic', s.music, tile('music', C.red) + tr('Musik', 'Music'))}
      ${tog('tVoice', s.moVoice, tile('bubble', C.green) + tr('Baby Mo membacakan teks', 'Baby Mo reads text aloud'))}
      ${tog('tEnglish', s.english !== false, tile('globe', C.teal) + tr('Kartu kata Bahasa Inggris', 'English word cards'))}
      ${tog('tGuide', s.guide !== false, tile('arrow', C.indigo) + tr('Panah penunjuk misi', 'Guide arrow to the mission'))}
      <div class="set"><span>${tile('globe', C.blue)}${tr('Bahasa', 'Language')}</span>${this.langSeg()}</div>
      <div class="set"><span>${tile('camera', C.gray)}${tr('Kamera', 'Camera')}</span><select id="sCam"><option value="third" ${s.cam === 'third' ? 'selected' : ''}>${tr('Orang ketiga', 'Third person')}</option><option value="first" ${s.cam === 'first' ? 'selected' : ''}>${tr('Orang pertama', 'First person')}</option></select></div>
      <div class="set"><span>${tile('eye', C.teal)}${tr('Jarak pandang', 'View distance')}</span><select id="sDist">${[3, 4, 5, 6, 8].map(n => `<option value="${n}" ${s.dist === n ? 'selected' : ''}>${n * 16} m</option>`).join('')}</select></div>
      <div class="set"><span>${tile('sun', C.orange)}${tr('Panjang 1 hari di game', 'Length of a game day')}</span><select id="sDay">${[12, 24, 48].map(n => `<option value="${n}" ${s.dayMinutes === n ? 'selected' : ''}>${n} ${tr('menit', 'min')}</option>`).join('')}<option value="0" ${s.dayMinutes === 0 ? 'selected' : ''}>${tr('Ikuti jam asli', 'Follow the real clock')}</option></select></div>
      <div class="set"><span>${tile('hand', C.pink)}${tr('Kepekaan geser', 'Look sensitivity')}</span><input type="range" id="sSens" min="0.4" max="2" step="0.1" value="${s.sens}"></div>
      <div class="set"><span>${tile('game', C.purple)}${tr('Mode', 'Mode')}</span><select id="sMode"><option value="adventure" ${s.mode === 'adventure' ? 'selected' : ''}>${tr('Petualangan', 'Adventure')}</option><option value="creative" ${s.mode === 'creative' ? 'selected' : ''}>${tr('Kreatif (balok tak terbatas, terbang)', 'Creative (unlimited blocks, fly)')}</option></select></div>
      <div class="row"><button class="btn ghost small" id="bHome">${ic('home')} ${tr('Pulang ke desa', 'Back to village')}</button><button class="btn ghost small" id="bShot">${ic('camera')} ${tr('Foto', 'Photo')}</button></div>
      ${isNativeApp() ? '' : `<a class="btn ghost small" href="https://play.babymo.id/" id="bHub">${ic('back')} ${tr('Game Baby Mo lainnya', 'More Baby Mo games')}</a>`}
      <button class="btn small" id="bResume">${ic('play')} ${tr('Lanjut main', 'Continue')}</button>
      <button class="btn ghost small" id="bParents">${ic('family')} ${tr('Untuk orang tua', 'For parents')} ${ic('lock')}</button>`;
    const flip = (id: string, k: 'sfx' | 'music' | 'moVoice') => ($('#' + id, body).onclick = () => { s[k] = !s[k]; g.applySettings(); this.renderBook(); });
    flip('tSfx', 'sfx'); flip('tMusic', 'music'); flip('tVoice', 'moVoice');
    $('#tEnglish', body).onclick = () => { s.english = s.english === false; SFX.click(); g.saveSoon(); this.renderBook(); };
    $('#tGuide', body).onclick = () => { s.guide = s.guide === false; SFX.click(); g.saveSoon(); this.renderBook(); };
    $('#bParents', body).onclick = () => this.parentGate(() => this.parentsPanel());
    this.bindLangSeg(body, () => { this.refreshHotbar(); this.updateHud(); this.renderBook(); g.saveSoon(); });
    $<HTMLSelectElement>('#sCam', body).onchange = e => { s.cam = (e.target as HTMLSelectElement).value as 'first' | 'third'; g.applySettings(); };
    $<HTMLSelectElement>('#sDist', body).onchange = e => { s.dist = +(e.target as HTMLSelectElement).value; g.applySettings(); };
    $<HTMLSelectElement>('#sDay', body).onchange = e => { s.dayMinutes = +(e.target as HTMLSelectElement).value; g.applySettings(); };
    $<HTMLInputElement>('#sSens', body).oninput = e => { s.sens = +(e.target as HTMLInputElement).value; g.applySettings(); };
    $<HTMLSelectElement>('#sMode', body).onchange = e => { s.mode = (e.target as HTMLSelectElement).value as 'adventure' | 'creative'; g.applySettings(); this.refreshHotbar(); };
    $('#bHome', body).onclick = () => { g.goHome(); this.closeBook(); };
    $('#bShot', body).onclick = () => { this.closeBook(); setTimeout(() => g.photo(), 120); };
    $('#bResume', body).onclick = () => this.closeBook();
  }

  // ---------- parents ----------
  /** a simple grown-up check: tap the right answer to an addition */
  /**
   * Grown-ups only: a sum a young child can't do in their head (e.g. 17 × 8),
   * typed in, with no answers to pick from. Shown on top of everything,
   * including the play-time lock.
   */
  /**
   * Full Mo Craft: what it opens and, in the app, a purchase behind the grown-up check (with Restore).
   * On the website: the full game is in the iPhone/iPad app.
   */
  unlock(what = '') {
    const g = this.g, app = store.canBuy();
    const why: Record<string, [string, string]> = {
      letter: ['Huruf ke-8 sampai ke-28 ada di Mo Craft Lengkap.', 'Letters 8 to 28 are in Full Mo Craft.'],
      iqro: ['Perjalanan Iqro ada di Mo Craft Lengkap.', 'The Iqro journey is in Full Mo Craft.'],
      exam: ['Ujian Iqro dari Ayah ada di Mo Craft Lengkap.', 'Dad’s Iqro exams are in Full Mo Craft.'],
    };
    const [wid, wen] = why[what] ?? ['Tempat ini ada di Mo Craft Lengkap.', 'This place is in Full Mo Craft.'];
    const price = store.price ? ` · ${esc(store.price)}` : '';
    const { el, close } = this.modal(`<div class="unlockCard"><div class="ulHero">🏝️🔓</div>
      <h2>${tr('Buka seluruh pulau!', 'Open the whole island!')}</h2>
      <p class="ulWhy">${tr(wid, wen)} ${tr('Minta izin ayah atau ibu ya 😊', 'Ask a grown-up 😊')}</p>
      <ul class="ulList">
        <li>🔤 ${tr('Semua 28 huruf hijaiyah', 'All 28 hijaiyah letters')}</li>
        <li>📖 ${tr('Perjalanan Iqro sampai surat pendek, ujian dan sertifikat', 'The Iqro journey up to short surahs, exams and certificates')}</li>
        <li>🎾 🏹 🏀 🐴 ⛸️ ${tr('Tenis, memanah, basket & penalti, berkuda, seluncur es', 'Tennis, archery, basketball & penalties, horse riding, ice skating')}</li>
      </ul>
      <p class="ulNote">${tr('Sekali bayar · tanpa iklan · tanpa langganan', 'One payment · no ads · no subscription')}</p>
      ${app ? `<div class="row"><button class="btn gold" id="ulBuy">🔓 ${tr('Untuk orang tua: buka', 'Grown-ups: unlock')}${price}</button></div>
        <div class="row"><button class="btn ghost small" id="ulRestore">${tr('Pulihkan pembelian', 'Restore purchase')}</button><button class="btn ghost small" id="ulX">${tr('Nanti saja', 'Not now')}</button></div>`
      : `<p class="ulNote">${tr('Mo Craft Lengkap ada di aplikasi iPhone & iPad (segera di App Store).', 'Full Mo Craft is in the iPhone & iPad app (coming soon on the App Store).')}</p>
        <div class="row"><button class="btn gold" id="ulX">${tr('Oke', 'OK')}</button></div>`}
      <p class="ulMsg" id="ulMsg"></p></div>`);
    const msg = el.querySelector<HTMLElement>('#ulMsg')!;
    el.querySelector<HTMLElement>('#ulX')!.onclick = () => { SFX.click(); close(); };
    const done = () => { close(); SFX.fanfare(); this.confetti(60); this.say(tr('Alhamdulillah! Seluruh pulau sudah terbuka. Ayo jelajahi! 🏝️', 'Alhamdulillah! The whole island is open now. Let’s explore! 🏝️'), 'alright', 6000); };
    el.querySelector<HTMLElement>('#ulBuy')?.addEventListener('click', () => this.parentGate(async () => {
      msg.textContent = tr('Menghubungi App Store…', 'Talking to the App Store…');
      const r = await store.buy();
      if (r === 'owned') done();
      else msg.textContent = r === 'pending' ? tr('Menunggu persetujuan orang tua (Ask to Buy). Pulau terbuka begitu disetujui.', 'Waiting for a parent’s approval (Ask to Buy). The island opens as soon as it’s approved.')
        : r === 'cancelled' ? '' : tr('Belum bisa terhubung ke App Store. Coba lagi nanti ya.', 'Couldn’t reach the App Store. Please try again later.');
    }));
    el.querySelector<HTMLElement>('#ulRestore')?.addEventListener('click', async () => {
      msg.textContent = tr('Memeriksa pembelian…', 'Checking purchases…');
      if (await store.restore()) done(); else msg.textContent = tr('Belum ada pembelian Mo Craft Lengkap di akun ini.', 'No Full Mo Craft purchase found on this account.');
    });
    void g;
  }
  parentGate(ok: () => void, onCancel?: () => void) {
    const { a, b, ans } = adultSum();
    const wrap = document.createElement('div');
    wrap.className = 'gateScr';
    wrap.innerHTML = `<div class="gateBox"><h2>${ic('family')} ${tr('Khusus orang tua', 'Grown-ups only')}</h2>
      <p>${tr('Berapa hasil', 'What is')} <b class="gateQ">${a} × ${b}</b>?</p>
      <input id="pgIn" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="4" aria-label="answer">
      <p class="gateMsg" id="pgMsg"></p>
      <div class="row"><button class="btn gold" id="pgOk">${tr('Lanjut', 'Continue')}</button><button class="btn ghost" id="pgX">${tr('Batal', 'Cancel')}</button></div></div>`;
    document.body.appendChild(wrap);
    const inp = wrap.querySelector<HTMLInputElement>('#pgIn')!, msg = wrap.querySelector<HTMLElement>('#pgMsg')!;
    let tries = 0;
    const done = () => wrap.remove();
    const check = () => {
      if (+inp.value.trim() === ans) { done(); setTimeout(ok, 30); return; }
      tries++; inp.value = ''; SFX.error();
      msg.textContent = tries >= 3 ? tr('Minta bantuan ayah atau ibu ya 😊', 'Please ask a grown-up 😊') : tr('Jawaban kurang tepat', 'Not quite right');
      if (tries >= 3) { done(); onCancel?.(); }
    };
    wrap.querySelector<HTMLElement>('#pgOk')!.onclick = check;
    inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') check(); };
    wrap.querySelector<HTMLElement>('#pgX')!.onclick = () => { done(); onCancel?.(); };
    setTimeout(() => inp.focus(), 50);
  }
  parentsPanel() {
    const g = this.g, s = g.settings, st = g.stats;
    const mins = (sec?: number) => Math.round((sec || 0) / 60);
    const lv = levelOf(st.stars || 0);
    const learned = st.letters.slice().sort((a, b) => a - b).map(i => LETTERS[i].g).join(' ');
    const { el, close } = this.modal(`<h2>${ic('family')} ${tr('Untuk orang tua', 'For parents')}</h2>
      <h3>📊 ${tr('Laporan belajar', 'Learning report')}</h3>
      <div class="report">
        <div><b>${st.letters.length}/28</b><small>${tr('huruf ditemukan', 'letters found')}</small></div>
        <div><b>${st.quiz || 0}</b><small>${tr('tebak huruf benar', 'quiz answers right')}</small></div>
        <div><b>${st.words || 0}</b><small>${tr('kata disusun', 'words built')}</small></div>
        <div><b>${st.gave + st.planted + st.jamaah + st.iftar}</b><small>${tr('kebaikan (berbagi, menanam, berjamaah, berbuka)', 'good deeds (sharing, planting, praying together, iftar)')}</small></div>
        <div><b>${st.days.length}</b><small>${tr('hari bermain', 'days played')}</small></div>
        <div><b>${mins(st.play?.sec)} / ${mins(st.playTotal)}</b><small>${tr('menit hari ini / total', 'minutes today / total')}</small></div>
        <div><b>Lv ${lv}</b><small>⭐ ${st.stars || 0}</small></div>
        <div><b>${g.questsDone.size}</b><small>${tr('misi selesai', 'quests done')}</small></div>
        <div><b>💧 ${st.water || 0}</b><small>${tr('gelas air saat istirahat minum', 'glasses of water at water breaks')}</small></div>
        <div><b>📖 ${Math.min(st.iqro?.n ?? 0, lessons().length)}/${lessons().length}</b><small>${tr('pelajaran Iqro', 'Iqro lessons')}${st.iqro?.exams?.length ? ` · 🎓 ${st.iqro.exams.map(e => 'Iqro ' + e).join(', ')}` : ''}</small></div>
        <div><b>${learnedSurahs(st.iqro?.stars).length}/6</b><small>${tr('surat pendek', 'short surahs')}${learnedSurahs(st.iqro?.stars).length ? ': ' + learnedSurahs(st.iqro?.stars).map(x => x.name).join(', ') : ''}</small></div>
      </div>
      ${learned ? `<p style="margin-top:6px">${tr('Huruf yang sudah dikenal', 'Letters met so far')}: <span class="arrow-row">${st.letters.slice().sort((a, b) => a - b).map(i => arImg(LETTERS[i].g, { size: 24, w: 30, h: 34 })).join('')}</span></p>` : ''}
      <h3>${ic('gear')} ${tr('Pengaturan', 'Settings')}</h3>
      <div class="set"><span>${tile('timer', C.orange)}${tr('Batas main per hari', 'Daily play limit')}</span><select id="pLim">${[0, 20, 30, 45, 60, 90, 120].map(n => `<option value="${n}" ${s.playLimit === n ? 'selected' : ''}>${n ? n + ' ' + tr('menit', 'min') : tr('Tanpa batas', 'No limit')}</option>`).join('')}</select></div>
      <div class="set"><span>${tile('bell', C.green)}${tr('Suara bedug saat waktu sholat', 'Bedug drum at prayer time')}</span><button class="btn ghost small" id="pAdhanTry">🔊</button><button class="toggle ${s.adhan !== false ? 'on' : ''}" id="pAdhan"></button></div>
      <div class="set"><span>${tile('drop', C.blue)}${tr('Pengingat minum air', 'Water break reminder')}</span><select id="pWater">${[0, 15, 20, 30, 45].map(n => `<option value="${n}" ${(s.water ?? 20) === n ? 'selected' : ''}>${n ? tr(`tiap ${n} menit`, `every ${n} min`) : tr('Mati', 'Off')}</option>`).join('')}</select></div>
      <div class="set"><span>${tile('shield', C.green)}${tr('Lindungi bangunan desa', 'Protect village buildings')}</span><button class="toggle ${s.protectVillage ? 'on' : ''}" id="pProt"></button></div>
      <div class="set"><span>${tile('leaf', C.mint)}${tr('Grafik ringan (HP lama)', 'Light graphics (older phones)')}</span><button class="toggle ${s.lowGfx ? 'on' : ''}" id="pLow"></button></div>
      <div class="set"><span>${tile('bell', C.red)}${tr('Pengingat sholat (waktu asli)', 'Prayer reminders (real time)')}</span><button class="toggle ${s.reminders ? 'on' : ''}" id="pRem"></button></div>
      <div class="set"><span>${tile('leaf', C.green)}${tr('Kumbang nakal saat senja (tidak bisa melukai)', 'Naughty beetles at dusk (can’t hurt)')}</span><button class="toggle ${s.beetles !== false ? 'on' : ''}" id="pBug"></button></div>
      <div class="set"><span>${tile('moon', C.purple)}${tr('Bazar Lebaran di desa', 'Eid bazaar in the village')}</span><select id="pEid">${([['auto', tr('Ikuti kalender', 'By the calendar')], ['on', tr('Buka sekarang', 'Open now')], ['off', tr('Tutup', 'Closed')]] as const).map(([v, l]) => `<option value="${v}" ${(s.eid ?? 'auto') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <p style="margin-top:8px;font-size:13px">${tr('Tidak ada iklan, pembelian, atau chat. Progres disimpan di perangkat ini. Tidak ada kalah atau tantangan waktu.', 'No ads, purchases or chat. Progress is stored on this device. There is no losing and no timers.')}</p>
      <h3>💾 ${tr('Simpanan', 'Saved game')}</h3>
      <p style="font-size:13px">${tr('Simpan cadangan ke file agar progres aman, atau pindahkan ke perangkat lain.', 'Keep a backup file so progress is safe, or move it to another device.')}</p>
      <h3>🏝️ ${tr('Mo Craft Lengkap', 'Full Mo Craft')}</h3>
      <div class="row">${g.full ? `<span class="chipOk">✓ ${tr('Sudah terbuka', 'Unlocked')}</span>` : `<button class="btn gold small" id="pFull">🔓 ${tr('Buka seluruh pulau', 'Open the whole island')}</button>`}${store.canBuy() ? `<button class="btn ghost small" id="pRestore">${tr('Pulihkan pembelian', 'Restore purchase')}</button>` : ''}</div>
      ${!store.canBuy() && !g.full ? `<div class="row famRow"><input id="pFam" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="20" placeholder="${tr('Kode keluarga', 'Family code')}" aria-label="${tr('Kode keluarga', 'Family code')}"><button class="btn ghost small" id="pFamGo">${tr('Pakai kode', 'Use code')}</button></div>` : ''}
      <div class="row"><button class="btn ghost small" id="pExp">${ic('down')} ${tr('Simpan ke file', 'Save to a file')}</button><button class="btn ghost small" id="pImp">${ic('up')} ${tr('Buka file simpanan', 'Open a save file')}</button></div>
      <button class="btn ghost small hidden" id="pPrev">${ic('undo')} ${tr('Kembalikan dunia sebelumnya', 'Bring back the previous world')}</button>
      <input type="file" id="pFile" accept=".json,application/json" hidden>
      <button class="btn ghost small" id="pNew">${ic('globe')} ${tr('Buat dunia baru (hapus dunia ini)', 'New world (deletes this one)')}</button>
      <button class="btn small" id="pOk">${tr('Selesai', 'Done')}</button>`, undefined, { now: true }); // a grown-up just passed the check: show it now, ahead of any queued pop-up
    const tog = (id: string, k: 'protectVillage' | 'lowGfx' | 'reminders') => ($('#' + id, el).onclick = e => { s[k] = !s[k]; (e.currentTarget as HTMLElement).classList.toggle('on', s[k]); g.applySettings(); });
    tog('pProt', 'protectVillage'); tog('pLow', 'lowGfx'); tog('pRem', 'reminders');
    $('#pBug', el).onclick = e => { s.beetles = s.beetles === false; (e.currentTarget as HTMLElement).classList.toggle('on', s.beetles !== false); g.saveSoon(); };
    $<HTMLSelectElement>('#pEid', el).onchange = e => { s.eid = (e.target as HTMLSelectElement).value as 'auto' | 'on' | 'off'; g.eid.refresh(); g.saveSoon(); };
    $<HTMLSelectElement>('#pLim', el).onchange = e => { s.playLimit = +(e.target as HTMLSelectElement).value; g.applySettings(); };
    const adh = $('#pAdhan', el); adh.onclick = () => { s.adhan = s.adhan === false; adh.classList.toggle('on', s.adhan !== false); SFX.click(); g.saveSoon(); if (s.adhan) adhan(); };
    $('#pAdhanTry', el).onclick = () => adhan();
    $<HTMLSelectElement>('#pWater', el).onchange = e => { s.water = +(e.target as HTMLSelectElement).value; g.applySettings(); };
    $('#pOk', el).onclick = () => close();
    el.querySelector<HTMLElement>('#pFull')?.addEventListener('click', () => { close(); this.unlock(); });
    const fam = el.querySelector<HTMLInputElement>('#pFam');
    if (fam) {
      fam.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') el.querySelector<HTMLElement>('#pFamGo')!.click(); };
      el.querySelector<HTMLElement>('#pFamGo')!.onclick = async () => {
        if (await store.redeem(fam.value)) { SFX.fanfare(); this.confetti(60); this.toast(tr('✓ Mo Craft Lengkap terbuka di browser ini', '✓ Full Mo Craft is open in this browser')); close(); this.parentsPanel(); }
        else { SFX.error(); fam.value = ''; this.toast(tr('Kode belum tepat', 'That code isn’t right')); }
      };
    }
    el.querySelector<HTMLElement>('#pRestore')?.addEventListener('click', async () => { const ok = await store.restore(); this.toast(ok ? tr('✓ Mo Craft Lengkap dipulihkan', '✓ Full Mo Craft restored') : tr('Belum ada pembelian di akun ini', 'No purchase found on this account')); if (ok) { close(); this.parentsPanel(); } });
    $('#pExp', el).onclick = async () => {
      const ok = await shareFile(`baby-mo-island-craft-${new Date().toISOString().slice(0, 10)}.json`, await g.exportSave(), 'application/json');
      if (ok) this.toast(tr('💾 File simpanan dibuat', '💾 Save file created'));
    };
    const file = $<HTMLInputElement>('#pFile', el);
    $('#pImp', el).onclick = () => file.click();
    file.onchange = async () => {
      const f = file.files?.[0]; if (!f) return;
      const err = await g.importSave(await f.text());
      if (err) this.toast(tr('😕 File ini bukan simpanan Baby Mo Island Craft', '😕 This is not a Baby Mo Island Craft save file'), 4000);
    };
    g.hasPrevious().then(has => { if (!has) return; const b = $('#pPrev', el); b.classList.remove('hidden');
      b.onclick = () => { close(); setTimeout(() => this.dialog({ face: '🌍', who: tr('Dunia sebelumnya', 'Previous world'), text: tr('Kembalikan dunia sebelum “Dunia baru”? Dunia sekarang akan disimpan sebagai gantinya.', 'Bring back the world from before “New world”? The current world is kept in its place.'), speak: false, buttons: [{ label: tr('Ya, kembalikan', 'Yes, bring it back'), cls: 'gold', fn: () => { g.restorePrevious(); } }, { label: tr('Batal', 'Cancel'), cls: 'ghost' }] }), 30); };
    });
    $('#pNew', el).onclick = () => { close(); setTimeout(() => this.dialog({ face: '🌍', who: tr('Dunia baru', 'New world'), text: tr('Yakin? Dunia, barang, dan progres sekarang akan dihapus.', 'Are you sure? The current world, items and progress will be deleted.'), speak: false, buttons: [{ label: tr('Ya, buat baru', 'Yes, start over'), cls: 'gold', fn: () => g.newWorld() }, { label: tr('Batal', 'Cancel'), cls: 'ghost' }] }), 30); };
  }
  /**
   * Water break: Baby Mo brings a glass of water. The child goes and drinks a
   * real glass, then taps the glass; an "are you sure?" check comes first, and
   * only then the glass empties with gulps (and Baby Mo drinks in the world).
   */
  waterBreak(fromRest = false) {
    const g = this.g;
    const glass = `<button class="wglass" id="wGlass" aria-label="${tr('Gelas air', 'Glass of water')}"><svg viewBox="0 0 80 110" aria-hidden="true">
        <defs><clipPath id="wcl"><path d="M14 10 L66 10 L59 100 Q58 104 54 104 L26 104 Q22 104 21 100 Z"/></clipPath></defs>
        <g clip-path="url(#wcl)"><rect id="wLevel" x="0" y="26" width="80" height="84" fill="#5bb8e8"/><rect x="0" y="26" width="80" height="6" fill="#8fd3ec" id="wTop"/></g>
        <path d="M14 10 L66 10 L59 100 Q58 104 54 104 L26 104 Q22 104 21 100 Z" fill="none" stroke="#9fc7dd" stroke-width="4" stroke-linejoin="round"/>
        <path d="M22 18 L25 92" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/></svg>
      <span>${tr('Ketuk kalau sudah minum', 'Tap when you’ve had a drink')}</span></button>`;
    const { el, close } = this.modal(`<div class="water"><div class="wrow"><img src="img/baby-mo-ok.webp" alt="" class="wmo">${glass}</div>
      <h2 id="wTitle">💧 ${tr('Waktunya minum air!', 'Water break!')}</h2>
      <p id="wText">${tr('Baby Mo haus! Yuk ambil segelas air putih dan minum sampai habis. Kalau sudah, ketuk gelasnya.', 'Baby Mo is thirsty! Go get a glass of water and drink it all up. When you’re done, tap the glass.')}</p>
      <div class="row" id="wBtns">${fromRest ? '' : `<button class="btn ghost small" id="wLater">${tr('Ingatkan 5 menit lagi', 'Remind me in 5 minutes')}</button>`}</div></div>`,
      undefined, { now: fromRest, onShow: () => { SFX.pour(); if (g.settings.moVoice) Speech.talk(tr('Waktunya minum air! Ambil segelas air putih ya.', 'Water break! Go and get a glass of water.'), getLang(), false, 1); } });
    const title = $('#wTitle', el), text = $('#wText', el), btns = $('#wBtns', el);
    const later = el.querySelector<HTMLElement>('#wLater');
    if (later) later.onclick = () => { g.snoozeWater(); close(); };
    const ask = () => {
      SFX.click();
      title.textContent = tr('🤔 Kamu yakin sudah minum?', '🤔 Are you sure you drank it?');
      text.textContent = tr('Jujur ya! Allah Maha Melihat 😊 Sudah minum segelas air sampai habis?', 'Be honest! 😊 Did you really drink a whole glass of water?');
      btns.innerHTML = `<button class="btn gold" id="wYes">💧 ${tr('Ya, sudah minum!', 'Yes, I drank it!')}</button><button class="btn ghost" id="wNo">${tr('Belum, aku ambil dulu', 'Not yet, I’ll go get it')}</button>`;
      if (g.settings.moVoice) Speech.talk(tr('Kamu yakin sudah minum?', 'Are you sure you drank it?'), getLang(), true, 1);
      $('#wYes', el).onclick = drink;
      $('#wNo', el).onclick = () => {
        SFX.click();
        title.textContent = tr('👍 Oke, Baby Mo tunggu ya!', '👍 Okay, Baby Mo will wait!');
        text.textContent = tr('Ambil segelas air putih, minum pelan-pelan, lalu ketuk gelasnya lagi.', 'Get a glass of water, drink it slowly, then tap the glass again.');
        btns.innerHTML = '';
      };
    };
    let done = false;
    const drink = () => {
      if (done) return; done = true;
      btns.innerHTML = '';
      title.textContent = tr('😋 Glek… glek… glek…', '😋 Gulp… gulp… gulp…');
      text.textContent = tr('Alhamdulillah! Segar sekali!', 'Alhamdulillah! So refreshing!');
      el.querySelector('.water')!.classList.add('drinking');
      SFX.gulp(); this.confetti(30);
      setTimeout(() => { close(); g.drankWater(); }, 2300);
    };
    $('#wGlass', el).onclick = () => { if (!done) ask(); };
  }
  /**
   * Play time is up for today: the game stops behind a full-screen card that
   * can't be closed. Only a grown-up (with the sum above) can add more time.
   */
  lockScreen(night = true, early = false) {
    const g = this.g;
    if (document.querySelector('.lockScr')) return;
    this.closeAllModals(); this.closeBook();
    g.pause(true);
    const mins = Math.round((g.stats.play?.sec || 0) / 60);
    const lock = document.createElement('div');
    lock.className = 'lockScr' + (night ? ' night' : '');
    lock.innerHTML = (night ? `<div class="lockBox"><div class="zzz" aria-hidden="true"><i>z</i><i>z</i><i>Z</i></div>
      <h2>🌙 ${tr('Selamat tidur!', 'Goodnight!')}</h2>
      <p>${early ? tr('Masya Allah, kamu tidur tepat waktu! ⭐ +20 koin.', 'Masha Allah, you went to bed on time! ⭐ +20 coins.') + '<br>' : ''}${tr(`Baby Mo sudah tidur nyenyak 😴 Kamu bermain <b>${mins} menit</b> hari ini. <b>Rumahmu dan semua bangunanmu sudah tersimpan</b> — besok kita lanjutkan membangun!`, `Baby Mo is fast asleep 😴 You played for <b>${mins} minutes</b> today. <b>Your house and everything you built is saved</b> — we’ll carry on building tomorrow!`)}</p>
      <div class="nightDua"><div class="ar" lang="ar" dir="rtl">بِاسْمِكَ اللّٰهُمَّ أَمُوْتُ وَأَحْيَا</div><small>Bismika Allahumma amutu wa ahya — ${tr('doa sebelum tidur', 'the du’a before sleeping')}</small></div>
      <p class="lockSaved">💾 ${tr('Permainanmu sudah tersimpan.', 'Your game is saved.')}</p>` : `<div class="lockBox"><img src="img/baby-mo-pose-01.webp" alt="">
      <h2>😴 ${tr('Waktunya istirahat!', 'Time for a break!')}</h2>
      <p>${tr(`Kamu sudah bermain <b>${mins} menit</b> hari ini. Baby Mo juga mau istirahat. Yuk minum air, gerakkan badan, atau bantu ayah & ibu. Sampai jumpa besok! 💚`, `You’ve played for <b>${mins} minutes</b> today. Baby Mo needs a rest too. Drink some water, stretch, or help mum and dad. See you tomorrow! 💚`)}</p>
      <p class="lockSaved">💾 ${tr('Permainanmu sudah tersimpan.', 'Your game is saved.')}</p>`) + `
      <button class="btn ghost small" id="lkParent">${ic('family')} ${tr('Untuk orang tua', 'For grown-ups')}</button>
      <div class="lockMore hidden" id="lkMore"><p>${tr('Tambah waktu bermain hari ini:', 'Add play time for today:')}</p>
        <div class="row"><button class="btn small" data-add="15">+15 ${tr('menit', 'min')}</button><button class="btn small" data-add="30">+30 ${tr('menit', 'min')}</button><button class="btn small" data-add="60">+60 ${tr('menit', 'min')}</button></div></div></div>`;
    document.body.appendChild(lock);
    if (g.settings.moVoice) Speech.talk(night ? tr('Selamat tidur! Rumahmu sudah tersimpan. Sampai jumpa besok!', 'Goodnight! Your house is saved. See you tomorrow!') : tr('Waktunya istirahat! Sampai jumpa besok!', 'Time for a break! See you tomorrow!'), getLang());
    g.save();
    lock.querySelector<HTMLElement>('#lkParent')!.onclick = () => this.parentGate(() => {
      lock.querySelector('#lkMore')!.classList.remove('hidden');
      lock.querySelector('#lkParent')!.classList.add('hidden');
    });
    lock.querySelectorAll<HTMLElement>('[data-add]').forEach(b => (b.onclick = () => {
      const add = +b.dataset.add! * 60, pl = g.stats.play;
      if (pl) { pl.extra = (pl.extra || 0) + add; pl.slept = false; pl.sec = Math.min(pl.sec, g.settings.playLimit * 60 + pl.extra); }
      lock.remove(); g.pause(false); g.bedtime.reset(); g.saveSoon();
      this.toast(tr(`⏱️ Tambah ${b.dataset.add} menit. Selamat bermain!`, `⏱️ ${b.dataset.add} more minutes. Have fun!`));
    }));
  }
  get locked() { return !!document.querySelector('.lockScr'); }

  // ---------- modals ----------
  /**
   * Pop-ups take turns: if one is already showing, a new one waits in line
   * until it closes (so a level-up never covers a letter card). `now` shows it
   * on top immediately (used for a parent check opened from another pop-up).
   */
  private modals: { veil: HTMLElement; close: () => void }[] = [];
  private modalQueue: { veil: HTMLElement; close: () => void; onShow?: () => void }[] = [];
  modal(html: string, onClose?: () => void, opts: { now?: boolean; onShow?: () => void } = {}) {
    const veil = h(`<div class="veil"><div class="panel">${html}</div></div>`);
    const el = veil.firstElementChild as HTMLElement;
    let closed = false;
    const close = () => {
      if (closed) return; closed = true;
      veil.remove();
      const i = this.modals.findIndex(m => m.veil === veil); if (i >= 0) this.modals.splice(i, 1);
      const q = this.modalQueue.findIndex(m => m.veil === veil); if (q >= 0) this.modalQueue.splice(q, 1);
      onClose?.();
      if (!this.modals.length && this.modalQueue.length) setTimeout(() => this.showNextModal(), 220);
      else if (!this.modals.length && !$('#vBook').classList.contains('on')) { this.g.pause(false); this.flushToasts(); }
    };
    const entry = { veil, close, onShow: opts.onShow };
    if (this.modals.length && !opts.now) this.modalQueue.push(entry);
    else this.presentModal(entry);
    return { el, close };
  }
  private presentModal(m: { veil: HTMLElement; close: () => void; onShow?: () => void }) {
    m.veil.style.zIndex = String(20 + this.modals.length * 2);
    $('#toast').classList.remove('on');
    document.body.appendChild(m.veil);
    m.veil.classList.add('on');
    this.modals.push(m);
    this.g.pause(true);
    // run after the caller has finished wiring up the pop-up
    if (m.onShow) queueMicrotask(m.onShow);
  }
  private showNextModal() {
    if (this.modals.length) return;
    const m = this.modalQueue.shift();
    if (m) this.presentModal(m);
  }
  closeModal() { this.modals[this.modals.length - 1]?.close(); }
  closeAllModals() { this.modalQueue.length = 0; while (this.modals.length) this.modals[this.modals.length - 1].close(); }

  dialog(o: { face: string; who: string; text: string; buttons?: Btn[]; img?: boolean; speak?: boolean }) {
    const btns = o.buttons ?? [{ label: tr('Oke!', 'Okay!') }];
    const { el, close } = this.modal(`<div class="dialog">${o.img ? `<img class="face" src="${o.face}" alt="">` : `<div class="face">${o.face}</div>`}<div style="flex:1"><div class="who">${esc(o.who)}</div><div class="say" id="dTxt">${o.text}</div></div><button class="say" id="dSpeak" aria-label="Listen">🔊</button></div><div id="dbtns"></div>`, () => Speech.stop(1), { onShow: () => { if (o.speak !== false && this.g.settings.moVoice) setTimeout(() => Speech.talk(plain(), getLang(), false, 1), 150); } });
    const plain = () => ($('#dTxt', el).textContent || '');
    $('#dSpeak', el).onclick = () => Speech.talk(plain(), getLang(), true, 1);
    const wrap = $('#dbtns', el);
    for (const b of btns) {
      const e = h(`<button class="btn ${b.cls ?? ''}">${b.label}</button>`);
      e.onclick = () => { SFX.click(); if (!b.keep) close(); b.fn?.(); };
      wrap.appendChild(e);
    }
  }

  /**
   * An Iqro lesson. Syllables: listen to each, then 3 listening questions. Words: read each syllable
   * in turn (right to left), hear the whole word and its meaning, then 3 questions. Surahs: read and
   * hear each ayah, recite them all with Baby Mo, then put the ayat in order. `done` gets 1–3 stars.
   */
  iqroLesson(L: Lesson, title: string, done: (stars: number) => void, closed: () => void) {
    let finished = false;
    const { el, close } = this.modal(`<div class="iqro"><h2>${title}</h2><div id="iqBody"></div><div class="row"><button class="btn ghost small" id="iqX">${tr('Tutup', 'Close')}</button></div></div>`, () => { Speech.stop(2); if (!finished) closed(); });
    const body = $('#iqBody', el);
    $('#iqX', el).onclick = () => close();
    const say = (x: Syll | { ar: string; lat: string }) => Speech.say(x.ar, x.lat.replace(/-/g, ''));
    const big = (ar: string, size = 46, w = 84, hgt = 76) => arImg(ar, { size, w, h: hgt });
    const finish = (stars: number) => {
      finished = true; SFX.fanfare(); this.confetti(30 + stars * 10);
      body.innerHTML = `<div class="iqEnd"><div class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><p>${stars === 3 ? tr('Sempurna! Masya Allah!', 'Perfect! Masha Allah!') : stars === 2 ? tr('Bagus sekali! Alhamdulillah', 'Very good! Alhamdulillah') : tr('Terus berlatih ya, Insya Allah makin lancar!', 'Keep practising, Insha Allah it gets easier!')}</p><button class="btn gold" id="iqDone">${tr('Selesai', 'Done')} ✓</button></div>`;
      $('#iqDone', el).onclick = () => { close(); done(stars); };
    };
    /** three listening questions: hear it, pick it */
    const quiz = <T,>(pool: T[], ar: (x: T) => string, play: (x: T) => void, show: (x: T) => string) => {
      let q = 0, right = 0, miss = false;
      const order = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
      const ask = () => {
        if (q >= order.length) { finish(Math.max(1, right)); return; }
        const want = order[q], opts = choices(pool, want, Math.random); miss = false;
        body.innerHTML = `<p class="iqQ">${tr('Dengarkan, lalu pilih yang benar', 'Listen, then pick the right one')} (${q + 1}/${order.length})</p>
          <button class="btn gold iqHear" id="iqHear">🔊 ${tr('Dengar', 'Listen')}</button>
          <div class="iqOpts">${opts.map((o, k) => `<button class="iqO" data-k="${k}" data-ar="${esc(ar(o))}">${show(o)}</button>`).join('')}</div>`;
        $('#iqHear', el).onclick = () => play(want);
        setTimeout(() => play(want), 350);
        el.querySelectorAll<HTMLElement>('.iqO').forEach(b => (b.onclick = () => {
          const o = opts[+b.dataset.k!];
          if (ar(o) === ar(want)) { b.classList.add('ok'); SFX.chime(); if (!miss) right++; q++; setTimeout(ask, 750); }
          else { b.classList.add('no'); SFX.error(); miss = true; setTimeout(() => b.classList.remove('no'), 500); play(want); }
        }));
      };
      ask();
    };
    if (L.kind === 'syll') {
      const info = MARK_INFO[L.mark];
      const heard = new Set<number>();
      body.innerHTML = `<p class="iqHow"><b>${info.name}</b> — ${t2(info.how)}</p><p class="iqTip">${tr('Ketuk setiap huruf untuk mendengar bacaannya:', 'Tap each one to hear how it’s read:')}</p>
        <div class="iqGrid" dir="rtl">${L.items.map((x, k) => `<button class="iqS" data-k="${k}">${big(x.ar)}<small>${x.lat}</small></button>`).join('')}</div>
        <button class="btn gold" id="iqGo">${tr('Lanjut ke kuis', 'On to the quiz')} ▶</button>`;
      el.querySelectorAll<HTMLElement>('.iqS').forEach(b => (b.onclick = () => { const x = L.items[+b.dataset.k!]; heard.add(+b.dataset.k!); b.classList.add('heard'); say(x); }));
      $('#iqGo', el).onclick = () => quiz(L.items, x => x.ar, say, x => big(x.ar, 40, 76, 68));
    } else if (L.kind === 'word') {
      let w = 0;
      const showWord = () => {
        if (w >= L.words.length) { quiz(L.words, x => x.ar, x => say({ ar: x.ar, lat: x.lat }), x => big(x.ar, 38, 120, 66)); return; }
        const word = L.words[w]; let next = 0;
        body.innerHTML = `<p class="iqTip">${tr('Baca satu per satu dari kanan: ketuk yang bersinar', 'Read one at a time from the right: tap the glowing one')} (${w + 1}/${L.words.length})</p>
          <div class="iqParts" dir="rtl">${word.parts.map((x, k) => `<button class="iqS${k === 0 ? ' next' : ''}" data-k="${k}">${big(x.ar, 40, 70, 66)}<small>${x.lat}</small></button>`).join('')}</div>
          <div class="iqWord hidden" id="iqWord"><div class="wIcon">${word.icon}</div><button class="iqWhole" id="iqWhole">${big(word.ar, 52, 190, 84)}</button><p><b>${word.lat.replace(/-/g, '')}</b> = ${t2(word.mean)}</p><button class="btn gold" id="iqNext">${tr('Kata berikutnya', 'Next word')} ▶</button></div>`;
        const parts = el.querySelectorAll<HTMLElement>('.iqParts .iqS');
        parts.forEach(b => (b.onclick = () => {
          const k = +b.dataset.k!;
          say(word.parts[k]);
          if (k !== next) return;
          b.classList.remove('next'); b.classList.add('heard'); next++;
          if (next < parts.length) parts[next].classList.add('next');
          else setTimeout(() => { $('#iqWord', el).classList.remove('hidden'); say({ ar: word.ar, lat: word.lat }); }, 700);
        }));
        $('#iqWhole', el).onclick = () => say({ ar: word.ar, lat: word.lat });
        $('#iqNext', el).onclick = () => { w++; showWord(); };
      };
      showWord();
    } else {
      const S = L.surah;
      let timer = 0;
      const rows = () => el.querySelectorAll<HTMLElement>('.ayah');
      body.innerHTML = `<p class="iqHow"><b>${tr('Surat', 'Surah')} ${S.name}</b> — ${t2(S.mean)}</p>
        <div class="ayat">${S.ayat.map((a, k) => `<button class="ayah" data-k="${k}"><span class="an">${k + 1}</span><span class="ar" lang="ar" dir="rtl">${a.ar}</span><small class="lat">${a.lat}</small><small class="mean">${t2(a.mean)}</small></button>`).join('')}</div>
        <div class="row"><button class="btn" id="iqAll">🎙️ ${tr('Baca bersama Baby Mo', 'Recite with Baby Mo')}</button><button class="btn gold" id="iqGo">${tr('Susun ayatnya', 'Put the ayat in order')} ▶</button></div>`;
      rows().forEach(r => (r.onclick = () => { const k = +r.dataset.k!; playAyah(S.id, k + 1, S.ayat[k].ar, S.ayat[k].lat); }));
      $('#iqAll', el).onclick = () => {
        clearTimeout(timer);
        const go = (k: number) => {
          rows().forEach((r, j) => r.classList.toggle('on', j === k));
          if (k >= S.ayat.length || !el.isConnected) return;
          playAyah(S.id, k + 1, S.ayat[k].ar, S.ayat[k].lat);
          timer = window.setTimeout(() => go(k + 1), 1400 + S.ayat[k].lat.length * 85);
        };
        go(0);
      };
      $('#iqGo', el).onclick = () => {
        clearTimeout(timer); Speech.stop(2);
        // the order game: tap the ayat from the first to the last
        let next = 0, miss = 0;
        const order = S.ayat.map((_, k) => k).sort(() => Math.random() - 0.5);
        body.innerHTML = `<p class="iqQ">${tr('Ketuk ayatnya dari yang pertama sampai terakhir', 'Tap the ayat from the first to the last')}</p><div class="ayat">${order.map(k => `<button class="ayah solo" data-k="${k}"><span class="ar" lang="ar" dir="rtl">${S.ayat[k].ar}</span></button>`).join('')}</div>`;
        rows().forEach(r => (r.onclick = () => {
          const k = +r.dataset.k!;
          if (r.classList.contains('ok')) return;
          if (k === next) {
            r.classList.add('ok'); r.classList.remove('solo'); r.insertAdjacentHTML('afterbegin', `<span class="an">${k + 1}</span>`); playAyah(S.id, k + 1, S.ayat[k].ar, S.ayat[k].lat); next++;
            if (next === S.ayat.length) setTimeout(() => finish(miss === 0 ? 3 : miss <= 2 ? 2 : 1), 900);
          } else { miss++; r.classList.add('no'); SFX.error(); setTimeout(() => r.classList.remove('no'), 500); }
        }));
      };
    }
  }

  /** Dad's Iqro exam for a stage: 5 listening questions; `done` gets how many were right first time */
  iqroExam(stage: number, pool: { ar: string; lat: string }[], done: (right: number) => void) {
    let q = 0, right = 0, miss = false, finished = false;
    const order = [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
    const wide = stage >= 4;
    const { el, close } = this.modal(`<div class="iqro"><h2>📝 ${tr('Ujian Iqro', 'Iqro exam')} ${stage}</h2><p class="iqHow">${tr('Ayah menguji bacaanmu. Dengarkan, lalu pilih yang benar. Benar 4 dari 5 untuk lulus!', 'Dad tests your reading. Listen, then pick the right one. Get 4 of 5 right to pass!')}</p><div id="iqBody"></div><div class="row"><button class="btn ghost small" id="iqX">${tr('Nanti saja', 'Later')}</button></div></div>`, () => { Speech.stop(2); if (!finished) done(-1); });
    const body = $('#iqBody', el);
    $('#iqX', el).onclick = () => close();
    const show = (x: { ar: string }) => wide ? `<span class="ar exa" lang="ar" dir="rtl">${x.ar}</span>` : arImg(x.ar, { size: 40, w: 76, h: 68 });
    const ask = () => {
      if (q >= order.length) { finished = true; close(); done(right); return; }
      const want = order[q], opts = choices(pool, want, Math.random); miss = false;
      body.innerHTML = `<p class="iqQ">${tr('Soal', 'Question')} ${q + 1}/${order.length}</p><button class="btn gold iqHear" id="iqHear">🔊 ${tr('Dengar', 'Listen')}</button>
        <div class="iqOpts${wide ? ' col' : ''}">${opts.map((o, k) => `<button class="iqO" data-k="${k}" data-ar="${esc(o.ar)}">${show(o)}</button>`).join('')}</div>`;
      const play = () => Speech.say(want.ar, want.lat);
      $('#iqHear', el).onclick = play; setTimeout(play, 350);
      el.querySelectorAll<HTMLElement>('.iqO').forEach(b => (b.onclick = () => {
        const o = opts[+b.dataset.k!];
        if (o.ar === want.ar) { b.classList.add('ok'); SFX.chime(); if (!miss) right++; q++; setTimeout(ask, 700); }
        else { b.classList.add('no'); SFX.error(); miss = true; setTimeout(() => b.classList.remove('no'), 500); play(); }
      }));
    };
    ask();
  }
  /** the certificate for passing a stage of the Iqro journey */
  iqroCertificate(stage: number, name: string, rename?: (n: string) => void) {
    SFX.fanfare(); this.confetti(90);
    this.modal(`<div class="cert"><div class="cTop">🎓</div><h2>${tr('Syahadah', 'Certificate')}</h2><p>${tr('Diberikan kepada', 'Awarded to')}</p><div class="cName" id="cName" contenteditable="true" spellcheck="false">${esc(name)}</div><small>${tr('(ketuk untuk menulis namamu)', '(tap to write your name)')}</small>
      <p>${tr(`telah lulus <b>Iqro ${stage}</b> dalam perjalanan Iqro Baby Mo.`, `for passing <b>Iqro ${stage}</b> on Baby Mo’s Iqro journey.`)}</p>
      <p class="ar" lang="ar" dir="rtl">بَارَكَ اللّٰهُ فِيكَ</p><small>Barakallahu fik — ${tr('semoga Allah memberkahimu', 'may Allah bless you')}</small>
      <div class="cSign">Ayah Ibrahim ✍️</div><button class="btn gold" id="cOk">${tr('Alhamdulillah', 'Alhamdulillah')} 🤲</button></div>`).el.querySelector<HTMLElement>('#cOk')!.onclick = () => { const n = (document.querySelector('#cName')?.textContent || '').trim().slice(0, 24); if (n) rename?.(n); this.closeAllModals(); };
  }
  /** recite surahs you have learned (at bedtime: the three Quls), ayah by ayah with Baby Mo */
  reciteSurahs(list: import('./game/iqro').Surah[], title: string, then?: () => void) {
    let timer = 0;
    const { el, close } = this.modal(`<div class="iqro"><h2>${title}</h2><div class="ayat">${list.map(S => `<p class="sname">${tr('Surat', 'Surah')} ${S.name}</p>${S.ayat.map((a, k) => `<button class="ayah" data-s="${S.id}" data-k="${k}"><span class="an">${k + 1}</span><span class="ar" lang="ar" dir="rtl">${a.ar}</span><small class="lat">${a.lat}</small><small class="mean">${t2(a.mean)}</small></button>`).join('')}`).join('')}</div>
      <div class="row"><button class="btn" id="rcAll">🎙️ ${tr('Baca semua bersama Baby Mo', 'Recite them all with Baby Mo')}</button><button class="btn gold" id="rcOk">${tr('Selesai', 'Done')} ✓</button></div></div>`, () => { clearTimeout(timer); Speech.stop(2); then?.(); });
    const rows = [...el.querySelectorAll<HTMLElement>('.ayah')];
    const of = (r: HTMLElement) => { const S = list.find(x => x.id === r.dataset.s)!, k = +r.dataset.k!; return { S, k, a: S.ayat[k] }; };
    rows.forEach(r => (r.onclick = () => { const { S, k, a } = of(r); playAyah(S.id, k + 1, a.ar, a.lat); }));
    $('#rcAll', el).onclick = () => {
      clearTimeout(timer);
      const go = (i: number) => {
        rows.forEach((r, j) => r.classList.toggle('on', j === i));
        if (i >= rows.length || !el.isConnected) return;
        const { S, k, a } = of(rows[i]); rows[i].scrollIntoView({ block: 'nearest' });
        playAyah(S.id, k + 1, a.ar, a.lat);
        timer = window.setTimeout(() => go(i + 1), 1400 + a.lat.length * 85);
      };
      go(0);
    };
    $('#rcOk', el).onclick = () => close();
  }

  duaCard(d: Dua, title: string, then?: () => void) {
    const { el, close } = this.modal(`<div class="dua"><h2>${esc(title)}</h2><div class="ar" lang="ar" dir="rtl">${d.ar}</div><div class="lat">${esc(d.lat)}</div><div class="mean">“${esc(t2(d.mean))}”</div>${d.src ? `<div class="src">${esc(d.src)}</div>` : ''}<div class="row"><button class="btn ghost" id="dSay">${ic('speaker')} ${tr('Dengar', 'Listen')}</button><button class="btn" id="dOk">${tr('Aamiin 🤲', 'Ameen 🤲')}</button></div></div>`, then);
    $('#dSay', el).onclick = () => Speech.say(d.ar, d.lat);
    $('#dOk', el).onclick = () => close();
  }

  letterCard(i: number, isNew: boolean, reward?: ReturnType<typeof letterReward>) {
    const L = LETTERS[i];
    const sayName = () => playLetter(i, L.ar, L.name);
    const marks: [string, string, string][] = [['َ', 'a', 'Fathah'], ['ِ', 'i', 'Kasrah'], ['ُ', 'u', 'Dhammah']];
    const base = i === 0 ? 'ا' : L.g;
    const lat = (v: string) => (i === 0 ? v : L.lat === "'" ? "'" + v : L.lat + v);
    const { el, close } = this.modal(`<div class="lcard">
      <div class="lc-left">
        ${isNew ? `<div class="lnew">✨ ${tr('HURUF BARU DITEMUKAN!', 'NEW LETTER FOUND!')} (${this.g.stats.letters.length}/28)</div>` : ''}
        <div class="bigLetter">${arImg(L.g, { size: 110, w: 170, h: 150 })}</div>
        <h2 class="lname">${esc(L.name)}</h2><div class="arname">${arImg(L.ar, { size: 34, w: 140, h: 52, color: '#0B8A4A' })}</div>
      </div>
      <div class="lc-right">
        ${isNew && reward ? this.letterRewardStrip(reward) : ''}
        <p>${tr('Ketuk untuk mendengar bunyinya dengan harakat:', 'Tap to hear it with vowel marks:')}</p>
        <div class="harakat">${marks.map(([m, v, n], k) => `<button data-k="${k}"><span class="hg">${arImg(i === 0 ? ['أَ', 'إِ', 'أُ'][k] : base + m, { size: 46, w: 76, h: 76 })}</span><small>${lat(v)}</small><small class="hn">${n}</small></button>`).join('')}</div>
        ${i === 0 ? '' : `<details class="adv"><summary>${tr('⭐ Lanjutan: bacaan panjang & tanwin', '⭐ More: long vowels & tanwin')}</summary>
          <div class="harakat small">${[[L.g + 'َا', lat('aa'), tr('panjang a', 'long a')], [L.g + 'ِي', lat('ii'), tr('panjang i', 'long i')], [L.g + 'ُو', lat('uu'), tr('panjang u', 'long u')]].map(([a, b, n]) => `<button data-ar="${a}" data-lat="${b}"><span class="hg">${arImg(a, { size: 38, w: 70, h: 64 })}</span><small>${b}</small><small class="hn">${n}</small></button>`).join('')}</div>
          <div class="harakat small">${[[L.g + 'ً', lat('an'), 'tanwin'], [L.g + 'ٍ', lat('in'), 'tanwin'], [L.g + 'ٌ', lat('un'), 'tanwin']].map(([a, b, n]) => `<button data-ar="${a}" data-lat="${b}"><span class="hg">${arImg(a, { size: 38, w: 70, h: 64 })}</span><small>${b}</small><small class="hn">${n}</small></button>`).join('')}</div>
        </details>`}
        <div class="row"><button class="btn ghost" id="lSay">${ic('speaker')} ${esc(L.name)}</button><button class="btn" id="lOk">${isNew ? tr('Alhamdulillah! ✨', 'Alhamdulillah! ✨') : tr('Tutup', 'Close')}</button></div>
      </div></div>`, () => Speech.stop(2), { onShow: () => setTimeout(sayName, 150) });
    $('#lSay', el).onclick = sayName;
    el.querySelectorAll<HTMLElement>('[data-k]').forEach(b => (b.onclick = () => {
      const k = +b.dataset.k!;
      const ar = i === 0 ? ['أَ', 'إِ', 'أُ'][k] : base + marks[k][0];
      playLetter(i, ar, lat(marks[k][1]), '-' + 'aiu'[k]);
    }));
    el.querySelectorAll<HTMLElement>('[data-ar]').forEach(b => (b.onclick = () => Speech.say(b.dataset.ar!, b.dataset.lat!)));
    $('#lOk', el).onclick = () => close();
  }

  quiz() {
    const g = this.g, have = g.stats.letters;
    const ans = have[Math.floor(Math.random() * have.length)];
    const pool = new Set<number>([ans]);
    while (pool.size < 3) pool.add(Math.floor(Math.random() * 28));
    const opts = [...pool].sort(() => Math.random() - 0.5);
    const L = LETTERS[ans];
    const say = () => playLetter(ans, L.ar, L.name);
    const { el, close } = this.modal(`<div style="text-align:center"><h2>${ic('sparkles')} ${tr('Tebak Huruf', 'Letter Quiz')}</h2><p>${tr('Dengarkan, lalu ketuk huruf yang benar!', 'Listen, then tap the right letter!')}</p>
      <button class="btn gold" id="qSay">${ic('speaker')} ${tr('Dengar lagi', 'Listen again')}</button>
      <div class="quizOpts">${opts.map(o => `<button data-o="${o}">${arImg(LETTERS[o].g, { size: 56, w: 90, h: 90 })}</button>`).join('')}</div>
      <p style="margin-top:8px">${tr('Benar', 'Correct')}: ${g.stats.quiz}</p>
      <div class="row"><button class="btn ghost" id="qClose">${tr('Selesai', 'Done')}</button></div></div>`, undefined, { onShow: () => setTimeout(say, 250) });
    $('#qSay', el).onclick = say;
    $('#qClose', el).onclick = () => close();
    let done = false;
    el.querySelectorAll<HTMLElement>('[data-o]').forEach(b => (b.onclick = () => {
      if (done) return;
      const o = +b.dataset.o!;
      if (o === ans) {
        done = true; b.classList.add('right'); SFX.letter(); g.stats.quiz++; g.kid.reward('quiz'); g.amal('learn'); this.confetti(14); g.checkQuests();
        this.toast(tr(`Benar! Itu huruf ${L.name} ⭐`, `Correct! That's ${L.name} ⭐`));
        setTimeout(() => { close(); this.quiz(); }, 1100);
      } else { b.classList.add('wrong'); SFX.error(); this.toast(tr('Hampir! Coba lagi ya 😊', 'Almost! Try again 😊')); }
    }));
  }

  private lastWord = -1;
  wordGame() {
    const g = this.g, have = new Set(g.stats.letters);
    const avail = WORDS.map((w, i) => ({ w, i })).filter(({ w, i }) => i === 0 || w.letters.every(l => have.has(l)));
    const pool = avail.length > 1 ? avail.filter(a => a.i !== this.lastWord) : avail;
    const { w, i: wi } = pool[Math.floor(Math.random() * pool.length)];
    this.lastWord = wi;
    const extra: number[] = [];
    const cands = [...have].filter(l => !w.letters.includes(l));
    while (extra.length < 2 && cands.length) extra.push(cands.splice(Math.floor(Math.random() * cands.length), 1)[0]);
    while (extra.length < 2) { const r = Math.floor(Math.random() * 28); if (!w.letters.includes(r) && !extra.includes(r)) extra.push(r); }
    const tiles = [...w.letters, ...extra].map((l, k) => ({ l, k })).sort(() => Math.random() - 0.5);
    const locked = WORDS.length - avail.length;
    const { el, close } = this.modal(`<div class="wg"><h2>${ic('book')} ${tr('Susun Kata', 'Word Builder')}</h2>
      <div class="wg-pic">${w.icon}</div><p><b>${esc(t2(w.mean))}</b> · ${tr('baca', 'read')}: <i>${esc(w.lat)}</i></p>
      <p style="font-size:13px">${tr('Ketuk huruf sesuai urutan, mulai dari <b>kanan</b> ➡️⬅️', 'Tap the letters in order, starting from the <b>right</b> ➡️⬅️')}</p>
      <div class="wg-slots" dir="rtl">${w.letters.map(() => '<span class="wg-slot"></span>').join('')}</div>
      <div class="wg-done hidden">${arImg(w.voweled, { size: 70, w: 280, h: 110, color: '#0B8A4A' })}</div>
      <div class="wg-tiles">${tiles.map(t => `<button data-l="${t.l}">${arImg(LETTERS[t.l].g, { size: 34, w: 54, h: 56 })}</button>`).join('')}</div>
      ${locked ? `<p style="font-size:12.5px">${tr(`Temukan lebih banyak huruf untuk membuka ${locked} kata lagi ✨`, `Find more letters to unlock ${locked} more words ✨`)}</p>` : ''}
      <div class="row"><button class="btn ghost" id="wgSay">${ic('speaker')} ${tr('Dengar', 'Listen')}</button><button class="btn ghost" id="wgClose">${tr('Selesai', 'Done')}</button><button class="btn gold hidden" id="wgNext">${tr('Kata berikutnya ▶', 'Next word ▶')}</button></div></div>`);
    let pos = 0;
    const slots = el.querySelectorAll<HTMLElement>('.wg-slot');
    $('#wgSay', el).onclick = () => Speech.say(w.voweled, w.lat);
    $('#wgClose', el).onclick = () => close();
    $('#wgNext', el).onclick = () => { close(); setTimeout(() => this.wordGame(), 50); };
    el.querySelectorAll<HTMLElement>('.wg-tiles button').forEach(b => (b.onclick = () => {
      if (pos >= w.letters.length || b.classList.contains('used')) return;
      const l = +b.dataset.l!;
      if (l === w.letters[pos]) {
        slots[pos].innerHTML = arImg(LETTERS[l].g, { size: 34, w: 56, h: 64 }); slots[pos].classList.add('ok'); b.classList.add('used'); pos++; SFX.click();
        if (pos === w.letters.length) {
          SFX.letter(); this.confetti(40);
          $('.wg-slots', el).classList.add('hidden'); $('.wg-done', el).classList.remove('hidden');
          $('#wgNext', el).classList.remove('hidden');
          setTimeout(() => Speech.say(w.voweled, w.lat), 300);
          g.stats.words = (g.stats.words || 0) + 1; g.kid.reward('quiz', 3); g.checkQuests();
        }
      } else { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); SFX.error(); }
    }));
  }

  reminder(prayer: string, time: string, city: string) {
    this.dialog({
      face: 'img/baby-mo-ok.webp', img: true, who: 'Baby Mo',
      text: tr(`Sekarang sudah masuk waktu <b>${prayer}</b> (${time}) di ${esc(city)} 🕌<br>Yuk istirahat sebentar, ambil wudhu, dan sholat bersama keluarga. Game-nya menunggu kok!`,
        `It's now time for <b>${prayer}</b> (${time}) in ${esc(city)} 🕌<br>Let's take a little break, make wudhu and pray with the family. The game will wait for you!`),
      buttons: [{ label: tr('🤲 Oke, aku sholat dulu', '🤲 Okay, I’ll go pray'), cls: 'gold', fn: () => this.g.restBreak() }, { label: tr('Sebentar lagi', 'In a moment'), cls: 'ghost' }],
    });
  }

  // ---------- language ----------
  langSeg() {
    const l = getLang();
    return `<div class="langSeg" role="radiogroup" aria-label="Language / Bahasa"><button data-lang="id" class="${l === 'id' ? 'on' : ''}" role="radio" aria-checked="${l === 'id'}">🇮🇩 Bahasa Indonesia</button><button data-lang="en" class="${l === 'en' ? 'on' : ''}" role="radio" aria-checked="${l === 'en'}">🇬🇧 English</button></div>`;
  }
  bindLangSeg(root: HTMLElement, after: () => void) {
    root.querySelectorAll<HTMLElement>('.langSeg button').forEach(b => (b.onclick = () => {
      setLang(b.dataset.lang as 'id' | 'en'); SFX.click(); this.labels(); after();
    }));
  }

  // ---------- start / loading ----------
  private tipT = 0;
  loading(p: number | null, text = '') {
    const l = $('#loading');
    if (p === null) { l.classList.add('hidden'); clearInterval(this.tipT); this.tipT = 0; return; }
    if (l.classList.contains('hidden')) {
      l.classList.remove('hidden');
      let k = Math.floor(Math.random() * LOAD_TIPS.length);
      const show = () => { $('#loadTip').textContent = '💡 ' + t2(LOAD_TIPS[k++ % LOAD_TIPS.length]); };
      show(); this.tipT = window.setInterval(show, 3500);
    }
    $('#loadTxt').textContent = text || tr('Menyiapkan dunia Baby Mo…', 'Preparing Baby Mo’s world…');
    $('#loadBar').style.width = Math.round(p * 100) + '%';
  }
  /** how to play full screen: Home Screen steps on iPhone/iPad, an install button on Android, or a fullscreen button */
  private installHint(el: HTMLElement, render: () => void) {
    if (isInstalled()) return;
    let html = '';
    if (isIOS() && !hintDismissed()) {
      const share = `<svg class="shareIc" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 10H16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
      html = `<div class="installCard"><button class="x" id="instX" aria-label="${tr('Tutup', 'Close')}">✕</button>
        <b>📲 ${tr('Main layar penuh, tanpa bar browser', 'Play full screen, no browser bars')}</b>
        <ol><li>${tr(`Ketuk ${share} <b>Bagikan</b> di Safari`, `Tap ${share} <b>Share</b> in Safari`)}</li><li>${tr('Pilih <b>Tambah ke Layar Utama</b>', 'Choose <b>Add to Home Screen</b>')}</li><li>${tr('Buka <b>Baby Mo</b> dari layar utama 🎉', 'Open <b>Baby Mo</b> from your Home Screen 🎉')}</li></ol>
        <small>${tr('Progres tetap tersimpan. Pakai Safari ya (bukan Chrome) di iPhone.', 'Your progress is kept. Use Safari (not Chrome) on iPhone.')}</small></div>`;
    } else if (canPrompt()) {
      html = `<button class="btn ghost small installBtn" id="instGo">📲 ${tr('Pasang sebagai aplikasi (layar penuh)', 'Install as an app (full screen)')}</button>`;
    } else if (canFullscreen()) {
      html = `<button class="btn ghost small installBtn" id="instFull">⛶ ${tr('Layar penuh', 'Full screen')}</button>`;
    }
    if (!html) return;
    el.insertAdjacentHTML('beforeend', html);
    el.querySelector<HTMLElement>('#instX')?.addEventListener('click', () => { dismissHint(); render(); });
    el.querySelector<HTMLElement>('#instGo')?.addEventListener('click', async () => { await promptInstall(); render(); });
    el.querySelector<HTMLElement>('#instFull')?.addEventListener('click', () => toggleFullscreen());
  }
  showStart(meta: any, onPlay: (fresh: boolean) => void) {
    const s = this.g.settings;
    const hasSave = !!meta;
    const el = $('#startPanel');
    let full = !hasSave;
    const go = (fresh: boolean) => { $('#start').classList.add('hidden'); onPlay(fresh); };
    const render = () => {
      const st = meta?.stats;
      const name = s.avatar === 'girl' ? 'Baby Ais' : 'Adam';
      const back = hasSave && !full ? `<div class="welcome">${tr(`Assalamu’alaikum, ${name}! 👋`, `Assalamu’alaikum, ${name}! 👋`)}</div>
        <div class="chips center"><span class="chip on">⭐ Level ${levelOf(st?.stars || 0)}</span><span class="chip on">🔤 ${(st?.letters || []).length}/28</span>${st?.pet ? `<span class="chip on">🐾 ${esc(st.pet.name)}</span>` : ''}</div>
        <button class="btn big" id="sPlay">${ic('play')} ${tr('Lanjut main!', 'Keep playing!')}</button>
        <div class="row"><button class="btn ghost small" id="sMore">${ic('gear')} ${tr('Ganti tokoh / mode', 'Change hero / mode')}</button><button class="btn ghost small" id="sNew">${ic('globe')} ${tr('Dunia baru', 'New world')} ${ic('lock')}</button></div>` : '';
      el.innerHTML = `${this.langSeg()}<img class="logo ${hasSave && !full ? 'round' : ''}" src="${hasSave && !full ? (s.avatar === 'girl' ? 'img/ais-face.webp' : 'img/adam-face.webp') : 'img/baby-mo-pose-05.webp'}" alt=""><h1>${tr('Dunia Baby Mo', 'Baby Mo’s World')}</h1>` + (back || `
        <div class="sub">${tr('Jelajahi hutan, gurun kurma, bukit salju & gua. Bangun masjidmu, temukan 28 huruf hijaiyah, dan sambut Ramadhan! 🌙', 'Explore forests, date deserts, snowy hills & caves. Build your masjid, find 28 hijaiyah letters and welcome Ramadan! 🌙')}</div>
        <div class="choice" id="cAv"><button data-v="boy" class="${s.avatar === 'boy' ? 'on' : ''}"><img class="av" src="img/adam-face.webp" alt="">Adam</button><button data-v="girl" class="${s.avatar === 'girl' ? 'on' : ''}"><img class="av" src="img/ais-face.webp" alt="">Baby Ais</button></div>
        <div class="choice" id="cMode"><button data-v="adventure" class="${s.mode === 'adventure' ? 'on' : ''}"><span class="e">🧭</span>${tr('Petualangan', 'Adventure')}<small>${tr('kumpulkan & buat barang', 'gather & craft')}</small></button><button data-v="creative" class="${s.mode === 'creative' ? 'on' : ''}"><span class="e">🧱</span>${tr('Kreatif', 'Creative')}<small>${tr('balok bebas & terbang', 'free blocks & flying')}</small></button></div>
        <button class="btn big" id="sPlay">${hasSave ? ic('play') + tr('Lanjutkan petualangan', 'Continue adventure') : ic('play') + tr('Mulai bermain', 'Start playing')}</button>
        ${hasSave ? `<button class="btn ghost small" id="sNew">${ic('globe')} ${tr('Dunia baru', 'New world')} ${ic('lock')}</button>` : ''}`);
      el.querySelectorAll<HTMLElement>('#cAv button').forEach(b => (b.onclick = () => { s.avatar = b.dataset.v as 'boy' | 'girl'; s.outfit = undefined; render(); }));
      el.querySelectorAll<HTMLElement>('#cMode button').forEach(b => (b.onclick = () => { s.mode = b.dataset.v as 'adventure' | 'creative'; render(); }));
      $('#sPlay', el).onclick = () => go(false);
      const m = el.querySelector<HTMLElement>('#sMore'); if (m) m.onclick = () => { full = true; render(); };
      // starting over deletes everything, so only a grown-up can do it
      const n = el.querySelector<HTMLElement>('#sNew'); if (n) n.onclick = () => this.parentGate(() => go(true));
      this.bindLangSeg(el, render);
      this.installHint(el, render);
    };
    onInstallChange(() => render());
    render();
    $('#start').classList.remove('hidden');
  }
}

