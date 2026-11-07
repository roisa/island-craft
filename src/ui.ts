// All DOM UI: HUD, the tabbed book (bag & crafting, letters, quests, Ramadhan,
// prayer times, settings), dialogs, du'a and letter cards, start & loading screens.
import type { Game } from './main';
import { tr, t2, getLang, setLang } from './i18n';
import { iconURL } from './world/atlas';
import { B, LETTERS, nameOf, ITEMS, isBlockId } from './world/blocks';
import { RECIPES, canCraft, STATION_NAME, creativeCatalog } from './game/inventory';
import { QUESTS, CALENDAR, DUAS, Dua, WORDS, Word, LOAD_TIPS } from './content';
import { PRAYERS, PRAYER_ICON, prayerName, fmtTime, fmtHour, CITIES, METHODS, HIJRI_MONTHS, MethodId } from './game/prayer';
import { SFX, playLetter, Speech } from './game/audio';
import { BIOME_INFO } from './world/gen';
import { levelOf, starsFor } from './game/kid';
import { BLUEPRINTS, blueprintCost, OUTFITS, type Blueprint } from './game/fun';
import type { T2 } from './i18n';
import { ic, tile, COLORS as C } from './icons';
import { arImg } from './arabic';
const PICON: Record<string, string> = { fajr: 'sunrise', dhuhr: 'sun', asr: 'cloudsun', maghrib: 'sunset', isha: 'moon' };
import { isTouch } from './game/input';

const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const h = (html: string) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild as HTMLElement; };
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export type Tab = 'bag' | 'craft' | 'build' | 'wardrobe' | 'map' | 'letters' | 'quests' | 'ramadhan' | 'prayer' | 'settings';
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
    <button class="pill" id="clock"><b id="clockT">--:--</b><small id="clockP"></small></button>
  </div>
  <div class="pill" id="bubble"><img src="img/baby-mo-idea.webp" alt=""><div><div class="who">BABY MO</div><div class="txt" id="bubbleTxt"></div></div><button class="say" id="bubbleSay" aria-label="Listen">${ic('speaker')}</button></div>
  <div id="tut" class="pill hidden"><span class="ti" id="tutIcon"></span><div class="tt"><small id="tutN"></small><b id="tutTxt"></b></div><button class="say" id="tutSay" aria-label="Listen">${ic('speaker')}</button></div>
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
<div id="toast"></div>
<div id="pickups"></div>
<div id="starPops"></div>
<div id="confetti"></div>
<div id="planBar" class="pill hidden"><div class="pb-t"><b id="pbName"></b><small id="pbState"></small></div><button class="btn small ghost" id="pbRot">${ic('rotate')}</button><button class="btn small gold" id="pbBuild">${ic('check')} <span></span></button><button class="btn small ghost" id="pbCancel">${ic('xmark')}</button></div>
<div class="veil" id="vBook"><div class="panel" id="book"></div></div>
<div id="loading" class="hidden"><div class="box"><img src="img/baby-mo-pose-01.webp" alt=""><b id="loadTxt"></b><div class="bar"><i id="loadBar"></i></div><p id="loadTip"></p></div></div>
<div id="start" class="hidden"><div class="panel" id="startPanel"></div></div>`;
    this.labels();
    $('#bMenu').onclick = () => this.openBook('settings');
    $('#bBag').onclick = () => this.openBook('bag');
    $('#bHome').onclick = () => this.dialog({ face: '🏠', who: tr('Pulang', 'Go home'), text: tr('Mau pulang ke desa Baby Mo?', 'Go back to Baby Mo’s village?'), speak: true, buttons: [{ label: ic('home') + tr('Ya, pulang!', 'Yes, take me home!'), cls: 'gold', fn: () => g.goHome(true) }, { label: ic('up') + tr('Naik ke permukaan', 'Just go up to the surface'), fn: () => g.kid.rescueUp() }, { label: tr('Tidak', 'No'), cls: 'ghost' }] });
    $('#stars').onclick = () => this.openBook('quests');
    $('#bUndo').onclick = () => g.doUndo();
    $('#pbRot').onclick = () => g.fun.rotatePlan();
    $('#pbBuild').onclick = () => g.fun.build();
    $('#pbCancel').onclick = () => g.fun.cancelPlan();
    $('#bubbleSay').onclick = () => Speech.talk($('#bubbleTxt').textContent || '', getLang(), true, 1);
    $('#tutSay').onclick = () => Speech.talk($('#tutTxt').textContent || '', getLang(), true, 1);
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
    // clock + next in-game prayer
    $('#clockT').innerHTML = ic('clock') + fmtHour(g.hour);
    const np = g.nextGamePrayer();
    const rs = g.ramadhan;
    const ram = rs.inRamadhan ? tr(`🌙 Ramadhan hari ${rs.day}`, `🌙 Ramadan day ${rs.day}`) : '';
    $('#clockP').innerHTML = `${ic(PICON[np.p])} ${prayerName(np.p)} ${fmtHour(np.h)}` + (ram ? ' · ' + ram : '');
    // compass
    const c = g.compass();
    if (c) {
      $('#compassArrow').style.transform = `rotate(${c.rot}rad)`;
      $('#compassText').innerHTML = `<b>${g.stats.letters.length}/28</b> · ${Math.round(c.dist)} m<small>${tr('Ikuti panah emas ✨', 'Follow the golden arrow ✨')}</small>`;
    } else {
      $('#compassArrow').style.transform = '';
      $('#compassText').innerHTML = `🏆 28/28<small>${tr('Semua huruf ditemukan!', 'All letters found!')}</small>`;
    }
    // quest tracker
    const q = g.kid?.tutorialActive() ? undefined : g.activeQuests()[0];
    const qe = $('#quest');
    if (q) {
      const [a, b] = q.goal(g.stats);
      const html = `<div class="qt">${q.icon} ${esc(t2(q.title))}</div><div class="qd">${esc(t2(q.desc))}</div><div class="bar"><i style="width:${Math.round(a / b * 100)}%"></i></div>`;
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
      ['bag', 'bag', tr('Tas', 'Bag')], ['craft', 'hammer', tr('Buat', 'Craft')], ['build', 'blueprint', tr('Rancang', 'Blueprints')], ['wardrobe', 'shirt', tr('Baju', 'Outfits')], ['map', 'map', tr('Peta', 'Map')], ['letters', 'book', tr('Huruf', 'Letters')], ['quests', 'star', tr('Misi', 'Quests')],
      ['ramadhan', 'moon', tr('Ramadhan', 'Ramadan')], ['prayer', 'mosque', tr('Sholat', 'Prayer')], ['settings', 'gear', tr('Atur', 'Settings')],
    ];
    const el = $('#book');
    el.innerHTML = `<button class="x" id="bx" aria-label="Close">${ic('xmark')}</button><div class="tabs">${tabs.map(([k, i, l]) => `<button class="tab ${k === this.tab ? 'on' : ''}" data-t="${k}">${ic(i)}<span>${l}</span></button>`).join('')}</div><div id="tabBody"></div>`;
    $('#bx', el).onclick = () => this.closeBook();
    el.querySelectorAll<HTMLElement>('.tab').forEach(b => (b.onclick = () => { this.tab = b.dataset.t as Tab; this.renderBook(); SFX.click(); }));
    const body = $('#tabBody', el);
    ({ bag: () => this.bag(body), craft: () => this.craftTab(body), build: () => this.buildTab(body), wardrobe: () => this.wardrobeTab(body), map: () => this.mapTab(body), letters: () => this.letters(body), quests: () => this.quests(body), ramadhan: () => this.ramadhanTab(body), prayer: () => this.prayer(body), settings: () => this.settingsTab(body) })[this.tab]();
  }

  private slotHTML(i: number) {
    const s = this.g.inv.slots[i];
    return `<button class="slot ${i === this.pickSlot ? 'pick' : ''} ${i === this.g.inv.sel ? 'sel' : ''}" data-i="${i}">${s ? `<img src="${iconURL(s.id)}" alt=""><b>${this.g.inv.creative ? '' : s.n > 1 ? s.n : ''}</b>` : ''}</button>`;
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
      <button class="btn small" id="toCraft">${ic('hammer')} ${tr('Buat barang', 'Craft things')}</button>`;
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
    const slots: [string, string][] = [[girl ? 'hijab' : 'hat', girl ? tr('🧕 Hijab', '🧕 Hijab') : tr('🧢 Topi', '🧢 Hats')], ['shirt', tr('👕 Baju', '👕 Shirts')], ['cape', tr('🦸 Jubah', '🦸 Capes')]];
    body.innerHTML = `<p>${tr('Naik level untuk membuka baju baru! ⭐', 'Level up to unlock new outfits! ⭐')}</p>` + slots.map(([slot, label]) => `<h3>${label}</h3><div class="wardrobe">${OUTFITS.filter(i => i.slot === slot).map(i => {
      const on = (o as any)[slot] === i.id, open = g.fun.unlocked(i);
      return `<button class="wd ${on ? 'on' : ''} ${open ? '' : 'locked'}" data-id="${i.id}" data-slot="${slot}"><span class="e">${open ? i.icon : '🔒'}</span><span>${esc(t2(i.name))}</span>${open ? '' : `<small>Level ${i.level}</small>`}</button>`;
    }).join('')}</div>`).join('');
    body.querySelectorAll<HTMLElement>('.wd').forEach(b => (b.onclick = () => {
      const item = OUTFITS.find(i => i.id === b.dataset.id)!;
      if (!g.fun.unlocked(item)) { SFX.error(); this.toast(tr(`Terbuka di Level ${item.level} ⭐`, `Unlocks at level ${item.level} ⭐`)); return; }
      (o as any)[b.dataset.slot!] = item.id; SFX.pickup(); g.buildAvatar(); g.saveSoon(); this.renderBook();
    }));
  }

  // ---------- blueprint placing bar ----------
  planBar(bp: Blueprint | null) {
    const el = $('#planBar');
    el.classList.toggle('hidden', !bp);
    $('#tut').classList.toggle('hidden', !!bp || !this.g.kid.tutorialActive());
    if (bp) { $('#pbName').textContent = bp.icon + ' ' + t2(bp.name); $('#pbBuild span').textContent = tr('Bangun', 'Build'); }
  }
  planState(ok: boolean) {
    const t = ok ? tr('Tempatnya pas! Ketuk ✔', 'Looks good! Tap ✔') : tr('Terhalang — geser sedikit', 'Blocked — move a little');
    const e = $('#pbState'); if (e.textContent !== t) e.textContent = t;
    $('#planBar').classList.toggle('bad', !ok);
  }

  private mapZoom = 1;
  private mapTab(body: HTMLElement) {
    const g = this.g;
    const zooms = [96, 200, 400];
    body.innerHTML = `<div class="row" style="margin-bottom:8px">${zooms.map((z, i) => `<button class="btn ghost small ${i === this.mapZoom ? 'gold' : ''}" data-z="${i}">${z * 2} m</button>`).join('')}</div>
      <div class="mapWrap"><canvas id="mapC" width="400" height="400"></canvas></div>
      <p style="margin-top:6px;font-size:12.5px">${tr('▲ = kamu · 🕌 = desa · ✨ = huruf belum ditemukan · ✓ = sudah ditemukan', '▲ = you · 🕌 = village · ✨ = letter not found yet · ✓ = found')}</p>`;
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
  }

  private quests(body: HTMLElement) {
    const g = this.g;
    const active = g.activeQuests();
    body.innerHTML = `<p>${tr('Misi itu santai — kerjakan kapan saja kamu mau 😊', 'Quests are relaxed — do them whenever you like 😊')}</p><h3>${tr('Sedang dikerjakan', 'In progress')}</h3>${active.map(q => {
      const [a, b] = q.goal(g.stats);
      return `<div class="qcard"><div class="ic">${q.icon}</div><div class="tx"><b>${esc(t2(q.title))} <span style="color:var(--green-d)">${a}/${b}</span></b><small>${esc(t2(q.desc))}</small></div></div>`;
    }).join('') || `<p>${tr('Semua misi selesai! Masya Allah!', 'All quests done! Masha Allah!')}</p>`}
      <h3>${tr('Stiker kebaikan', 'Good-deed stickers')} (${g.questsDone.size}/${QUESTS.length})</h3>
      <div class="stickers">${QUESTS.map(q => `<span class="${g.questsDone.has(q.id) ? '' : 'off'}" title="${esc(t2(q.title))}">${q.sticker}</span>`).join('')}</div>
      <h3>${tr('Catatan petualangan', 'Adventure log')}</h3>
      <p>🔤 ${g.stats.letters.length}/28 · 🧱 ${g.stats.placed} · 💕 ${g.stats.petted} · 🤲 ${g.stats.gave} · 🕌 ${g.stats.jamaah} · 🌇 ${g.stats.iftar}<br>🧭 ${g.stats.biomes.map(b => (BIOME_INFO as any)[['OCEAN', 'BEACH', 'MEADOW', 'FOREST', 'DESERT', 'SNOWY', 'MOUNTAIN', 'VILLAGE'].indexOf(b)]?.icon ?? '').join(' ')}</p>`;
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
      <p style="margin-top:10px;font-size:11.5px">${tr('Tanggal Hijriah dihitung dengan kalender Umm al-Qura; awal Ramadhan di tempatmu bisa berbeda 1 hari sesuai keputusan pemerintah/ulama.', 'Hijri dates use the Umm al-Qura calendar; the start of Ramadan where you live may differ by a day.')}</p>`;
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
      <h3>${tr('Di dalam game', 'Inside the game')}</h3>
      <p>${tr('Matahari di dunia Baby Mo mengikuti jadwal di atas: fajar saat Subuh, terbenam saat Maghrib. Saat waktu sholat tiba di game, warga desa berjalan ke masjid — kamu boleh ikut!', 'The sun in Baby Mo’s world follows this schedule: dawn at Fajr, sunset at Maghrib. When it is prayer time in the game, villagers walk to the masjid — you can join them!')}</p>
      <p style="font-size:11.5px;margin-top:6px">${tr('Waktu dihitung otomatis di perangkat, dan bisa berbeda beberapa menit dari jadwal masjid setempat.', 'Times are calculated on the device and may differ a few minutes from your local masjid.')}</p>`;
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
      <div class="set"><span>${tile('globe', C.blue)}${tr('Bahasa', 'Language')}</span>${this.langSeg()}</div>
      <div class="set"><span>${tile('camera', C.gray)}${tr('Kamera', 'Camera')}</span><select id="sCam"><option value="third" ${s.cam === 'third' ? 'selected' : ''}>${tr('Orang ketiga', 'Third person')}</option><option value="first" ${s.cam === 'first' ? 'selected' : ''}>${tr('Orang pertama', 'First person')}</option></select></div>
      <div class="set"><span>${tile('eye', C.teal)}${tr('Jarak pandang', 'View distance')}</span><select id="sDist">${[3, 4, 5, 6, 8].map(n => `<option value="${n}" ${s.dist === n ? 'selected' : ''}>${n * 16} m</option>`).join('')}</select></div>
      <div class="set"><span>${tile('sun', C.orange)}${tr('Panjang 1 hari di game', 'Length of a game day')}</span><select id="sDay">${[12, 24, 48].map(n => `<option value="${n}" ${s.dayMinutes === n ? 'selected' : ''}>${n} ${tr('menit', 'min')}</option>`).join('')}<option value="0" ${s.dayMinutes === 0 ? 'selected' : ''}>${tr('Ikuti jam asli', 'Follow the real clock')}</option></select></div>
      <div class="set"><span>${tile('hand', C.pink)}${tr('Kepekaan geser', 'Look sensitivity')}</span><input type="range" id="sSens" min="0.4" max="2" step="0.1" value="${s.sens}"></div>
      <div class="set"><span>${tile('game', C.purple)}${tr('Mode', 'Mode')}</span><select id="sMode"><option value="adventure" ${s.mode === 'adventure' ? 'selected' : ''}>${tr('Petualangan', 'Adventure')}</option><option value="creative" ${s.mode === 'creative' ? 'selected' : ''}>${tr('Kreatif (balok tak terbatas, terbang)', 'Creative (unlimited blocks, fly)')}</option></select></div>
      <div class="row"><button class="btn ghost small" id="bHome">${ic('home')} ${tr('Pulang ke desa', 'Back to village')}</button><button class="btn ghost small" id="bShot">${ic('camera')} ${tr('Foto', 'Photo')}</button></div>
      <a class="btn ghost small" href="https://play.babymo.id/" id="bHub">${ic('back')} ${tr('Game Baby Mo lainnya', 'More Baby Mo games')}</a>
      <button class="btn small" id="bResume">${ic('play')} ${tr('Lanjut main', 'Continue')}</button>
      <button class="btn ghost small" id="bParents">${ic('family')} ${tr('Untuk orang tua', 'For parents')} ${ic('lock')}</button>`;
    const flip = (id: string, k: 'sfx' | 'music' | 'moVoice') => ($('#' + id, body).onclick = () => { s[k] = !s[k]; g.applySettings(); this.renderBook(); });
    flip('tSfx', 'sfx'); flip('tMusic', 'music'); flip('tVoice', 'moVoice');
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
  parentGate(ok: () => void) {
    const a = 6 + Math.floor(Math.random() * 4), b = 5 + Math.floor(Math.random() * 4), ans = a + b;
    const opts = [ans, ans + 2, ans - 3].sort(() => Math.random() - 0.5);
    const { el, close } = this.modal(`<div style="text-align:center"><h2>${ic('family')} ${tr('Khusus orang tua', 'Grown-ups only')}</h2><p>${tr('Berapa', 'What is')} <b style="font-size:22px">${a} + ${b}</b>?</p><div class="row" id="pg">${opts.map(o => `<button class="btn ghost" data-v="${o}">${o}</button>`).join('')}</div><button class="btn small ghost" id="pgX">${tr('Batal', 'Cancel')}</button></div>`, undefined, { now: true });
    el.querySelectorAll<HTMLElement>('#pg button').forEach(bt => (bt.onclick = () => { close(); if (+bt.dataset.v! === ans) setTimeout(ok, 30); else this.toast(tr('Jawaban kurang tepat', 'Not quite right')); }));
    $('#pgX', el).onclick = () => close();
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
      </div>
      ${learned ? `<p style="margin-top:6px">${tr('Huruf yang sudah dikenal', 'Letters met so far')}: <span class="arrow-row">${st.letters.slice().sort((a, b) => a - b).map(i => arImg(LETTERS[i].g, { size: 24, w: 30, h: 34 })).join('')}</span></p>` : ''}
      <h3>${ic('gear')} ${tr('Pengaturan', 'Settings')}</h3>
      <div class="set"><span>${tile('timer', C.orange)}${tr('Batas main per hari', 'Daily play limit')}</span><select id="pLim">${[0, 20, 30, 45, 60, 90].map(n => `<option value="${n}" ${s.playLimit === n ? 'selected' : ''}>${n ? n + ' ' + tr('menit', 'min') : tr('Tanpa batas', 'No limit')}</option>`).join('')}</select></div>
      <div class="set"><span>${tile('shield', C.green)}${tr('Lindungi bangunan desa', 'Protect village buildings')}</span><button class="toggle ${s.protectVillage ? 'on' : ''}" id="pProt"></button></div>
      <div class="set"><span>${tile('leaf', C.mint)}${tr('Grafik ringan (HP lama)', 'Light graphics (older phones)')}</span><button class="toggle ${s.lowGfx ? 'on' : ''}" id="pLow"></button></div>
      <div class="set"><span>${tile('bell', C.red)}${tr('Pengingat sholat (waktu asli)', 'Prayer reminders (real time)')}</span><button class="toggle ${s.reminders ? 'on' : ''}" id="pRem"></button></div>
      <p style="margin-top:8px;font-size:13px">${tr('Tidak ada iklan, pembelian, atau chat. Progres disimpan di perangkat ini. Tidak ada kalah atau tantangan waktu.', 'No ads, purchases or chat. Progress is stored on this device. There is no losing and no timers.')}</p>
      <button class="btn ghost small" id="pNew">${ic('globe')} ${tr('Buat dunia baru (hapus dunia ini)', 'New world (deletes this one)')}</button>
      <button class="btn small" id="pOk">${tr('Selesai', 'Done')}</button>`);
    const tog = (id: string, k: 'protectVillage' | 'lowGfx' | 'reminders') => ($('#' + id, el).onclick = e => { s[k] = !s[k]; (e.currentTarget as HTMLElement).classList.toggle('on', s[k]); g.applySettings(); });
    tog('pProt', 'protectVillage'); tog('pLow', 'lowGfx'); tog('pRem', 'reminders');
    $<HTMLSelectElement>('#pLim', el).onchange = e => { s.playLimit = +(e.target as HTMLSelectElement).value; g.applySettings(); };
    $('#pOk', el).onclick = () => close();
    $('#pNew', el).onclick = () => { close(); setTimeout(() => this.dialog({ face: '🌍', who: tr('Dunia baru', 'New world'), text: tr('Yakin? Dunia, barang, dan progres sekarang akan dihapus.', 'Are you sure? The current world, items and progress will be deleted.'), speak: false, buttons: [{ label: tr('Ya, buat baru', 'Yes, start over'), cls: 'gold', fn: () => g.newWorld() }, { label: tr('Batal', 'Cancel'), cls: 'ghost' }] }), 30); };
  }
  restScreen() {
    const g = this.g;
    const { el } = this.modal(`<div style="text-align:center"><img src="img/baby-mo-pose-01.webp" style="width:110px" alt=""><h2>😴 ${tr('Waktunya istirahat!', 'Time for a break!')}</h2>
      <p>${tr('Kamu sudah bermain cukup lama hari ini. Baby Mo juga mau istirahat. Yuk minum air, gerakkan badan, atau bantu ayah & ibu. Sampai jumpa besok! 💚', 'You’ve played for a good while today. Baby Mo needs a rest too. Drink some water, stretch, or help mum and dad. See you tomorrow! 💚')}</p>
      <button class="btn ghost small" id="rsMore">${ic('family')} ${tr('Orang tua: tambah 15 menit', 'Parents: add 15 minutes')}</button></div>`, undefined, { now: true, onShow: () => { if (g.settings.moVoice) Speech.talk(tr('Waktunya istirahat! Sampai jumpa besok!', 'Time for a break! See you tomorrow!'), getLang()); } });
    $('#rsMore', el).onclick = () => this.parentGate(() => { if (g.stats.play) g.stats.play.sec -= 15 * 60; this.closeModal(); });
  }

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

  duaCard(d: Dua, title: string, then?: () => void) {
    const { el, close } = this.modal(`<div class="dua"><h2>${esc(title)}</h2><div class="ar" lang="ar" dir="rtl">${d.ar}</div><div class="lat">${esc(d.lat)}</div><div class="mean">“${esc(t2(d.mean))}”</div>${d.src ? `<div class="src">${esc(d.src)}</div>` : ''}<div class="row"><button class="btn ghost" id="dSay">${ic('speaker')} ${tr('Dengar', 'Listen')}</button><button class="btn" id="dOk">${tr('Aamiin 🤲', 'Ameen 🤲')}</button></div></div>`, then);
    $('#dSay', el).onclick = () => Speech.say(d.ar, d.lat);
    $('#dOk', el).onclick = () => close();
  }

  letterCard(i: number, isNew: boolean) {
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
        done = true; b.classList.add('right'); SFX.letter(); g.stats.quiz++; g.kid.reward('quiz'); this.confetti(14); g.checkQuests();
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
  showStart(meta: any, onPlay: (fresh: boolean) => void) {
    const s = this.g.settings;
    const hasSave = !!meta;
    const el = $('#startPanel');
    let full = !hasSave;
    const go = (fresh: boolean) => { $('#start').classList.add('hidden'); onPlay(fresh); };
    const render = () => {
      const st = meta?.stats;
      const name = s.avatar === 'girl' ? 'Aisyah' : 'Ibra';
      const back = hasSave && !full ? `<div class="welcome">${tr(`Assalamu’alaikum, ${name}! 👋`, `Assalamu’alaikum, ${name}! 👋`)}</div>
        <div class="chips center"><span class="chip on">⭐ Level ${levelOf(st?.stars || 0)}</span><span class="chip on">🔤 ${(st?.letters || []).length}/28</span>${st?.pet ? `<span class="chip on">🐾 ${esc(st.pet.name)}</span>` : ''}</div>
        <button class="btn big" id="sPlay">${ic('play')} ${tr('Lanjut main!', 'Keep playing!')}</button>
        <div class="row"><button class="btn ghost small" id="sMore">${ic('gear')} ${tr('Ganti tokoh / mode', 'Change hero / mode')}</button><button class="btn ghost small" id="sNew">${ic('globe')} ${tr('Dunia baru', 'New world')} ${ic('lock')}</button></div>` : '';
      el.innerHTML = `${this.langSeg()}<img class="logo" src="img/baby-mo-pose-05.webp" alt="Baby Mo"><h1>${tr('Dunia Baby Mo', 'Baby Mo’s World')}</h1>` + (back || `
        <div class="sub">${tr('Jelajahi hutan, gurun kurma, bukit salju & gua. Bangun masjidmu, temukan 28 huruf hijaiyah, dan sambut Ramadhan! 🌙', 'Explore forests, date deserts, snowy hills & caves. Build your masjid, find 28 hijaiyah letters and welcome Ramadan! 🌙')}</div>
        <div class="choice" id="cAv"><button data-v="boy" class="${s.avatar === 'boy' ? 'on' : ''}"><span class="e">👦</span>Ibra</button><button data-v="girl" class="${s.avatar === 'girl' ? 'on' : ''}"><span class="e">👧</span>Aisyah</button></div>
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
    };
    render();
    $('#start').classList.remove('hidden');
  }
}

