// All DOM UI: HUD, the tabbed book (bag & crafting, letters, quests, Ramadhan,
// prayer times, settings), dialogs, du'a and letter cards, start & loading screens.
import type { Game } from './main';
import { tr, t2, getLang, setLang } from './i18n';
import { iconURL } from './world/atlas';
import { B, LETTERS, nameOf, ITEMS, isBlockId } from './world/blocks';
import { RECIPES, canCraft, STATION_NAME, creativeCatalog } from './game/inventory';
import { QUESTS, CALENDAR, DUAS, Dua } from './content';
import { PRAYERS, PRAYER_ICON, prayerName, fmtTime, fmtHour, CITIES, METHODS, HIJRI_MONTHS, MethodId } from './game/prayer';
import { SFX, playLetter, Speech } from './game/audio';
import { BIOME_INFO } from './world/gen';
import { levelOf, starsFor } from './game/kid';
import { BLUEPRINTS, blueprintCost, OUTFITS, type Blueprint } from './game/fun';
import type { T2 } from './i18n';
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
    <button class="ibtn pill" id="bMenu" aria-label="Menu">☰</button>
    <button class="pill" id="compass"><span id="compassArrow">▲</span><span id="compassText"></span></button>
    <button class="pill" id="stars"><span class="st">⭐</span><span class="sv"><b id="starN">0</b><small id="starLv"></small><i class="sbar"><i id="starBar"></i></i></span></button>
    <button class="pill" id="clock"><b id="clockT">--:--</b><small id="clockP"></small></button>
  </div>
  <div class="pill" id="bubble"><img src="img/baby-mo-idea.webp" alt=""><div><div class="who">BABY MO</div><div class="txt" id="bubbleTxt"></div></div><button class="say" id="bubbleSay" aria-label="Listen">🔊</button></div>
  <div id="tut" class="pill hidden"><span class="ti" id="tutIcon"></span><div class="tt"><small id="tutN"></small><b id="tutTxt"></b></div><button class="say" id="tutSay" aria-label="Listen">🔊</button></div>
  <div class="pill" id="quest"></div>
  <div id="sideBtns">
    <button class="ibtn pill" id="bHome" aria-label="Home">🏠</button>
    <button class="ibtn pill" id="bBag" aria-label="Bag">🎒</button>
    <button class="ibtn pill" id="bCraft" aria-label="Craft">🔨</button>
    <button class="ibtn pill" id="bLetters" aria-label="Letters">📖</button>
    <button class="ibtn pill" id="bCam" aria-label="Camera">👁️</button>
  </div>
  <div id="crosshair"></div>
  <svg id="mineRing" viewBox="0 0 46 46"><circle cx="23" cy="23" r="19" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="5"/><circle id="mineArc" cx="23" cy="23" r="19" fill="none" stroke="#FFD874" stroke-width="5" stroke-linecap="round" stroke-dasharray="119.4" stroke-dashoffset="119.4" transform="rotate(-90 23 23)"/></svg>
  <div id="target"></div>
  <div id="heldName"></div>
  <div id="hotbarWrap"><div id="hotbar" class="pill"></div></div>
  <div id="desktopHint"></div>
  <div id="stick"><div id="knob"></div></div>
  <div id="actions">
    <button class="abtn pill" id="bJump">⬆️<span></span></button>
    <button class="abtn pill" id="bMine">⛏️<span></span></button>
    <button class="abtn pill" id="bUse">✋<span></span></button>
    <button class="abtn pill hidden" id="bDown">⬇️</button>
  </div>
</div>
<div id="underwater"></div>
<div id="sleepFade"></div>
<div id="toast"></div>
<div id="pickups"></div>
<div id="starPops"></div>
<div id="confetti"></div>
<div id="planBar" class="pill hidden"><div class="pb-t"><b id="pbName"></b><small id="pbState"></small></div><button class="btn small ghost" id="pbRot">🔄</button><button class="btn small gold" id="pbBuild">✔ <span></span></button><button class="btn small ghost" id="pbCancel">✖</button></div>
<div class="veil" id="vBook"><div class="panel" id="book"></div></div>
<div class="veil" id="vModal"><div class="panel" id="modal"></div></div>
<div id="loading" class="hidden"><div class="box"><img src="img/baby-mo-pose-01.webp" alt=""><b id="loadTxt"></b><div class="bar"><i id="loadBar"></i></div></div></div>
<div id="start" class="hidden"><div class="panel" id="startPanel"></div></div>`;
    this.labels();
    $('#bMenu').onclick = () => this.openBook('settings');
    $('#bBag').onclick = () => this.openBook('bag');
    $('#bHome').onclick = () => this.dialog({ face: '🏠', who: tr('Pulang', 'Go home'), text: tr('Mau pulang ke desa Baby Mo?', 'Go back to Baby Mo’s village?'), speak: true, buttons: [{ label: tr('🏠 Ya, pulang!', '🏠 Yes, take me home!'), cls: 'gold', fn: () => g.goHome(true) }, { label: tr('⬆️ Naik ke permukaan', '⬆️ Just go up to the surface'), fn: () => g.kid.rescueUp() }, { label: tr('Tidak', 'No'), cls: 'ghost' }] });
    $('#stars').onclick = () => this.openBook('quests');
    $('#pbRot').onclick = () => g.fun.rotatePlan();
    $('#pbBuild').onclick = () => g.fun.build();
    $('#pbCancel').onclick = () => g.fun.cancelPlan();
    $('#bubbleSay').onclick = () => Speech.talk($('#bubbleTxt').textContent || '', getLang(), true);
    $('#tutSay').onclick = () => Speech.talk($('#tutTxt').textContent || '', getLang(), true);
    $('#bCraft').onclick = () => this.openBook('craft');
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
    $('#bUse span').textContent = tr('PAKAI', 'USE');
    $('#desktopHint').textContent = tr('WASD jalan · Spasi lompat · Klik kiri gali · Klik kanan pakai/pasang · E tas · R buat · M peta · V kamera',
      'WASD move · Space jump · Left click mine · Right click use/place · E bag · R craft · M map · V camera');
  }

  // ---------- small HUD helpers ----------
  private queued: [string, number][] = [];
  toast(msg: string, ms = 2400) {
    if ($('#vModal').classList.contains('on')) { this.queued.push([msg, ms]); return; }
    this.showToast(msg, ms);
  }
  flushToasts() {
    let d = 300;
    for (const [m, ms] of this.queued.splice(0)) { setTimeout(() => this.showToast(m, ms), d); d += ms + 300; }
  }
  private showToast(msg: string, ms: number) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(this.toastT); this.toastT = window.setTimeout(() => t.classList.remove('on'), ms);
  }
  say(text: string, pose: 'idea' | 'ok' | 'alright' | 'pose-05' = 'idea', ms = 5200) {
    $<HTMLImageElement>('#bubble img').src = `img/baby-mo-${pose}.webp`;
    $('#bubbleTxt').textContent = text;
    $('#bubble').classList.add('on');
    clearTimeout(this.bubbleT); this.bubbleT = window.setTimeout(() => $('#bubble').classList.remove('on'), ms);
    if (this.g.settings.moVoice) Speech.talk(text, getLang());
  }
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
    if (!st) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    $('#tutIcon').textContent = st.icon;
    $('#tutN').textContent = tr(`Langkah ${st.n} dari ${st.of}`, `Step ${st.n} of ${st.of}`);
    $('#tutTxt').textContent = st.text;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    if (st.hint) { const t = document.querySelector(st.hint); if (t && getComputedStyle(t).display !== 'none') t.classList.add('pulse'); }
    if (this.g.settings.moVoice) setTimeout(() => Speech.talk(st.text, getLang()), 400);
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
    this.confetti(80);
    const { el, close } = this.modal(`<div class="lvup"><div class="burst">⭐</div><div class="lvn">LEVEL ${lv}!</div><h2>${esc(t2(title))}</h2>
      <p>${tr('Hebat sekali! Ini hadiah untukmu:', 'Awesome! Here are your presents:')}</p>
      <div class="gifts">${gifts.map(([id, n]) => `<span><img src="${iconURL(id)}" alt="">×${n}</span>`).join('')}</div>
      ${(() => { const girl = this.g.settings.avatar === 'girl'; const nw = OUTFITS.filter(i => i.level === lv && (girl ? i.slot !== 'hat' : i.slot !== 'hijab')); return nw.length ? `<p><b>${tr('Baju baru terbuka:', 'New outfits unlocked:')}</b> ${nw.map(i => i.icon + ' ' + esc(t2(i.name))).join(', ')} — ${tr('lihat di 👕 Baju', 'see 👕 Outfits')}</p>` : ''; })()}
      <button class="btn gold" id="lvOk">${tr('Yeay! 🎉', 'Yay! 🎉')}</button></div>`);
    $('#lvOk', el).onclick = () => close();
    if (this.g.settings.moVoice) Speech.talk(tr(`Hebat! Kamu naik ke level ${lv}!`, `Amazing! You reached level ${lv}!`), getLang());
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
    $('#clockT').textContent = '🕐 ' + fmtHour(g.hour);
    const np = g.nextGamePrayer();
    const rs = g.ramadhan;
    const ram = rs.inRamadhan ? tr(`🌙 Ramadhan hari ${rs.day}`, `🌙 Ramadan day ${rs.day}`) : '';
    $('#clockP').textContent = `${PRAYER_ICON[np.p]} ${prayerName(np.p)} ${fmtHour(np.h)}` + (ram ? ' · ' + ram : '');
    // compass
    const c = g.compass();
    if (c) {
      $('#compassArrow').style.transform = `rotate(${c.rot}rad)`;
      $('#compassText').innerHTML = `${tr('Huruf', 'Letter')} ${g.stats.letters.length}/28 · ${Math.round(c.dist)} m<small>${tr('Ikuti panah emas ✨', 'Follow the golden arrow ✨')}</small>`;
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
  isOpen() { return $('#vBook').classList.contains('on') || $('#vModal').classList.contains('on') || !$('#start').classList.contains('hidden'); }
  openBook(tab: Tab = this.tab) {
    this.tab = tab; this.pickSlot = -1;
    $('#vBook').classList.add('on');
    this.g.pause(true);
    this.renderBook();
    SFX.click();
  }
  closeBook() {
    $('#vBook').classList.remove('on');
    if (!$('#vModal').classList.contains('on')) { this.g.pause(false); this.flushToasts(); }
  }
  renderBook() {
    const tabs: [Tab, string][] = [
      ['bag', tr('🎒 Tas', '🎒 Bag')], ['craft', tr('🔨 Buat', '🔨 Craft')], ['build', tr('🏗️ Rancang', '🏗️ Blueprints')], ['wardrobe', tr('👕 Baju', '👕 Outfits')], ['map', tr('🗺️ Peta', '🗺️ Map')], ['letters', tr('📖 Huruf', '📖 Letters')], ['quests', tr('⭐ Misi', '⭐ Quests')],
      ['ramadhan', tr('🌙 Ramadhan', '🌙 Ramadan')], ['prayer', tr('🕌 Sholat', '🕌 Prayer')], ['settings', tr('⚙️ Atur', '⚙️ Settings')],
    ];
    const el = $('#book');
    el.innerHTML = `<button class="x" id="bx">✕</button><div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${k === this.tab ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}</div><div id="tabBody"></div>`;
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
      <button class="btn small" id="toCraft">🔨 ${tr('Buat barang', 'Craft things')}</button>`;
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
      <div class="lgrid" style="margin-top:10px">${LETTERS.map((L, i) => have.has(i) ? `<button class="lcell" data-l="${i}"><span class="g" lang="ar" dir="rtl">${L.g}</span><span class="l">${L.name}</span></button>` : `<button class="lcell locked" data-l="${i}"><span class="g">?</span></button>`).join('')}</div>
      <div class="row"><button class="btn gold" id="bQuiz" ${have.size < 3 ? 'disabled style="opacity:.5"' : ''}>🎯 ${tr('Tebak Huruf', 'Letter Quiz')}</button></div>
      ${have.size < 3 ? `<p style="text-align:center;margin-top:6px">${tr('Temukan 3 huruf untuk membuka kuis.', 'Find 3 letters to unlock the quiz.')}</p>` : ''}`;
    body.querySelectorAll<HTMLElement>('[data-l]').forEach(b => (b.onclick = () => {
      const i = +b.dataset.l!;
      if (!have.has(i)) { this.toast(tr('Belum ditemukan — ikuti kompas emas!', 'Not found yet — follow the golden compass!')); SFX.error(); return; }
      this.letterCard(i, false);
    }));
    const q = $('#bQuiz', body); if (have.size >= 3) q.onclick = () => this.quiz();
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
      <div class="ptable" style="margin-top:8px">${PRAYERS.map(p => `<div class="prow ${p === next ? 'next' : ''}"><span class="ic">${PRAYER_ICON[p]}</span><span class="nm">${prayerName(p)}</span><span class="tm">${fmtTime(t[p], g.loc.lng)}</span></div>`).join('')}</div>
      ${next ? `<p style="margin-top:8px;text-align:center">${tr('Sholat berikutnya', 'Next prayer')}: <b>${prayerName(next)}</b> · ${tr('sekitar', 'in about')} ${Math.max(1, Math.round((+t[next] - +now) / 60000))} ${tr('menit lagi', 'minutes')}</p>` : ''}
      <div class="set"><span>📍 ${tr('Kota', 'City')}</span><select id="selCity"><option value="">${esc(g.loc.name)}</option>${CITIES.map((c, i) => `<option value="${i}">${c.i} ${c.n}</option>`).join('')}<option value="gps">📡 ${tr('Pakai lokasiku', 'Use my location')}</option></select></div>
      <div class="set"><span>🧮 ${tr('Metode', 'Method')}</span><select id="selMethod">${METHODS.map(m => `<option value="${m.id}" ${m.id === g.settings.method ? 'selected' : ''}>${t2(m.label)}</option>`).join('')}</select></div>
      <div class="set"><span>🔔 ${tr('Pengingat sholat (waktu asli)', 'Prayer reminders (real time)')}</span><button class="toggle ${g.settings.reminders ? 'on' : ''}" id="tRem"></button></div>
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
      ${tog('tSfx', s.sfx, tr('🔊 Efek suara', '🔊 Sound effects'))}
      ${tog('tMusic', s.music, tr('🎵 Musik', '🎵 Music'))}
      ${tog('tVoice', s.moVoice, tr('🗣️ Baby Mo membacakan teks (suara HP)', '🗣️ Baby Mo reads text aloud (device voice)'))}
      <div class="set"><span>🌐 ${tr('Bahasa', 'Language')}</span>${this.langSeg()}</div>
      <div class="set"><span>👁️ ${tr('Kamera', 'Camera')}</span><select id="sCam"><option value="third" ${s.cam === 'third' ? 'selected' : ''}>${tr('Orang ketiga', 'Third person')}</option><option value="first" ${s.cam === 'first' ? 'selected' : ''}>${tr('Orang pertama', 'First person')}</option></select></div>
      <div class="set"><span>🗺️ ${tr('Jarak pandang', 'View distance')}</span><select id="sDist">${[3, 4, 5, 6, 8].map(n => `<option value="${n}" ${s.dist === n ? 'selected' : ''}>${n * 16} m</option>`).join('')}</select></div>
      <div class="set"><span>🕐 ${tr('Panjang 1 hari di game', 'Length of a game day')}</span><select id="sDay">${[12, 24, 48].map(n => `<option value="${n}" ${s.dayMinutes === n ? 'selected' : ''}>${n} ${tr('menit', 'min')}</option>`).join('')}<option value="0" ${s.dayMinutes === 0 ? 'selected' : ''}>${tr('Ikuti jam asli', 'Follow the real clock')}</option></select></div>
      <div class="set"><span>🖐️ ${tr('Kepekaan geser', 'Look sensitivity')}</span><input type="range" id="sSens" min="0.4" max="2" step="0.1" value="${s.sens}"></div>
      <div class="set"><span>🎮 ${tr('Mode', 'Mode')}</span><select id="sMode"><option value="adventure" ${s.mode === 'adventure' ? 'selected' : ''}>${tr('Petualangan', 'Adventure')}</option><option value="creative" ${s.mode === 'creative' ? 'selected' : ''}>${tr('Kreatif (balok tak terbatas, terbang)', 'Creative (unlimited blocks, fly)')}</option></select></div>
      <div class="row"><button class="btn ghost small" id="bHome">🏠 ${tr('Pulang ke desa', 'Back to village')}</button><button class="btn ghost small" id="bShot">📸 ${tr('Foto', 'Photo')}</button></div>
      <a class="btn ghost small" href="https://play.babymo.id/" id="bHub">⬅️ ${tr('Game Baby Mo lainnya', 'More Baby Mo games')}</a>
      <button class="btn small" id="bResume">▶️ ${tr('Lanjut main', 'Continue')}</button>
      <details style="margin-top:14px"><summary style="font-weight:900;cursor:pointer">👨‍👩‍👧 ${tr('Untuk orang tua', 'For parents')}</summary>
        <p style="margin-top:6px">${tr('Tidak ada iklan, tidak ada pembelian, tidak ada chat. Progres disimpan di perangkat ini. Game ini tidak punya tantangan waktu atau kalah — anak bebas menjelajah. Pengingat sholat memakai jam asli dan bisa dimatikan.', 'No ads, no purchases, no chat. Progress is stored on this device. There are no timers or losing — children explore freely. Prayer reminders use the real clock and can be turned off.')}</p>
        <div class="set"><span>🕌 ${tr('Lindungi bangunan desa', 'Protect village buildings')}</span><button class="toggle ${s.protectVillage ? 'on' : ''}" id="tProt"></button></div>
        <button class="btn ghost small" id="bNew">🌍 ${tr('Buat dunia baru (hapus dunia ini)', 'New world (deletes this one)')}</button>
      </details>`;
    const flip = (id: string, k: 'sfx' | 'music' | 'moVoice' | 'protectVillage') => ($('#' + id, body).onclick = () => { s[k] = !s[k]; g.applySettings(); this.renderBook(); });
    flip('tSfx', 'sfx'); flip('tMusic', 'music'); flip('tVoice', 'moVoice'); flip('tProt', 'protectVillage');
    this.bindLangSeg(body, () => { this.refreshHotbar(); this.updateHud(); this.renderBook(); g.saveSoon(); });
    $<HTMLSelectElement>('#sCam', body).onchange = e => { s.cam = (e.target as HTMLSelectElement).value as 'first' | 'third'; g.applySettings(); };
    $<HTMLSelectElement>('#sDist', body).onchange = e => { s.dist = +(e.target as HTMLSelectElement).value; g.applySettings(); };
    $<HTMLSelectElement>('#sDay', body).onchange = e => { s.dayMinutes = +(e.target as HTMLSelectElement).value; g.applySettings(); };
    $<HTMLInputElement>('#sSens', body).oninput = e => { s.sens = +(e.target as HTMLInputElement).value; g.applySettings(); };
    $<HTMLSelectElement>('#sMode', body).onchange = e => { s.mode = (e.target as HTMLSelectElement).value as 'adventure' | 'creative'; g.applySettings(); this.refreshHotbar(); };
    $('#bHome', body).onclick = () => { g.goHome(); this.closeBook(); };
    $('#bShot', body).onclick = () => { this.closeBook(); setTimeout(() => g.photo(), 120); };
    $('#bResume', body).onclick = () => this.closeBook();
    $('#bNew', body).onclick = () => this.dialog({ face: '🌍', who: tr('Dunia baru', 'New world'), text: tr('Yakin? Dunia, barang, dan progres sekarang akan dihapus.', 'Are you sure? The current world, items and progress will be deleted.'), buttons: [{ label: tr('Ya, buat baru', 'Yes, start over'), cls: 'gold', fn: () => g.newWorld() }, { label: tr('Batal', 'Cancel'), cls: 'ghost' }] });
  }

  // ---------- modals ----------
  modal(html: string, onClose?: () => void) {
    const v = $('#vModal'), m = $('#modal');
    m.innerHTML = html;
    v.classList.add('on'); this.modalStack++;
    this.g.pause(true);
    const close = () => {
      v.classList.remove('on');
      if (!$('#vBook').classList.contains('on')) { this.g.pause(false); this.flushToasts(); }
      onClose?.();
    };
    (m as any)._close = close;
    return { el: m, close };
  }
  closeModal() { const m = $('#modal') as any; if ($('#vModal').classList.contains('on')) m._close?.(); }

  dialog(o: { face: string; who: string; text: string; buttons?: Btn[]; img?: boolean; speak?: boolean }) {
    const btns = o.buttons ?? [{ label: tr('Oke!', 'Okay!') }];
    const { el, close } = this.modal(`<div class="dialog">${o.img ? `<img class="face" src="${o.face}" alt="">` : `<div class="face">${o.face}</div>`}<div style="flex:1"><div class="who">${esc(o.who)}</div><div class="say" id="dTxt">${o.text}</div></div><button class="say" id="dSpeak" aria-label="Listen">🔊</button></div><div id="dbtns"></div>`, () => Speech.stop());
    const plain = () => ($('#dTxt', el).textContent || '');
    $('#dSpeak', el).onclick = () => Speech.talk(plain(), getLang(), true);
    if (o.speak !== false && this.g.settings.moVoice) setTimeout(() => Speech.talk(plain(), getLang()), 150);
    const wrap = $('#dbtns', el);
    for (const b of btns) {
      const e = h(`<button class="btn ${b.cls ?? ''}">${b.label}</button>`);
      e.onclick = () => { SFX.click(); if (!b.keep) close(); b.fn?.(); };
      wrap.appendChild(e);
    }
  }

  duaCard(d: Dua, title: string, then?: () => void) {
    const { el, close } = this.modal(`<div class="dua"><h2>${esc(title)}</h2><div class="ar" lang="ar" dir="rtl">${d.ar}</div><div class="lat">${esc(d.lat)}</div><div class="mean">“${esc(t2(d.mean))}”</div>${d.src ? `<div class="src">${esc(d.src)}</div>` : ''}<div class="row"><button class="btn ghost" id="dSay">🔊 ${tr('Dengar', 'Listen')}</button><button class="btn" id="dOk">${tr('Aamiin 🤲', 'Ameen 🤲')}</button></div></div>`, then);
    $('#dSay', el).onclick = () => Speech.say(d.ar, d.lat);
    $('#dOk', el).onclick = () => close();
  }

  letterCard(i: number, isNew: boolean) {
    const L = LETTERS[i];
    const marks: [string, string, string][] = [['َ', 'a', 'Fathah'], ['ِ', 'i', 'Kasrah'], ['ُ', 'u', 'Dhammah']];
    const base = i === 0 ? 'ا' : L.g;
    const lat = (v: string) => (i === 0 ? v : L.lat === "'" ? "'" + v : L.lat + v);
    const { el, close } = this.modal(`<div class="lcard">
      <div class="lc-left">
        ${isNew ? `<div class="lnew">✨ ${tr('HURUF BARU DITEMUKAN!', 'NEW LETTER FOUND!')} (${this.g.stats.letters.length}/28)</div>` : ''}
        <div class="bigLetter" lang="ar" dir="rtl">${L.g}</div>
        <h2 class="lname">${esc(L.name)}</h2><div class="arname" lang="ar" dir="rtl">${L.ar}</div>
      </div>
      <div class="lc-right">
        <p>${tr('Ketuk untuk mendengar bunyinya dengan harakat:', 'Tap to hear it with vowel marks:')}</p>
        <div class="harakat">${marks.map(([m, v, n], k) => `<button data-k="${k}"><span class="hg" lang="ar" dir="rtl">${i === 0 ? ['أَ', 'إِ', 'أُ'][k] : base + m}</span><small>${lat(v)}</small><small class="hn">${n}</small></button>`).join('')}</div>
        <div class="row"><button class="btn ghost" id="lSay">🔊 ${esc(L.name)}</button><button class="btn" id="lOk">${isNew ? tr('Alhamdulillah! ✨', 'Alhamdulillah! ✨') : tr('Tutup', 'Close')}</button></div>
      </div></div>`);
    const sayName = () => playLetter(i, L.ar, L.name);
    sayName();
    $('#lSay', el).onclick = sayName;
    el.querySelectorAll<HTMLElement>('[data-k]').forEach(b => (b.onclick = () => {
      const k = +b.dataset.k!;
      const ar = i === 0 ? ['أَ', 'إِ', 'أُ'][k] : base + marks[k][0];
      playLetter(i, ar, lat(marks[k][1]), '-' + 'aiu'[k]);
    }));
    $('#lOk', el).onclick = () => close();
  }

  quiz() {
    const g = this.g, have = g.stats.letters;
    const ans = have[Math.floor(Math.random() * have.length)];
    const pool = new Set<number>([ans]);
    while (pool.size < 3) pool.add(Math.floor(Math.random() * 28));
    const opts = [...pool].sort(() => Math.random() - 0.5);
    const L = LETTERS[ans];
    const { el, close } = this.modal(`<div style="text-align:center"><h2>🎯 ${tr('Tebak Huruf', 'Letter Quiz')}</h2><p>${tr('Dengarkan, lalu ketuk huruf yang benar!', 'Listen, then tap the right letter!')}</p>
      <button class="btn gold" id="qSay">🔊 ${tr('Dengar lagi', 'Listen again')}</button>
      <div class="quizOpts">${opts.map(o => `<button data-o="${o}"><span lang="ar" dir="rtl">${LETTERS[o].g}</span></button>`).join('')}</div>
      <p style="margin-top:8px">${tr('Benar', 'Correct')}: ${g.stats.quiz}</p>
      <div class="row"><button class="btn ghost" id="qClose">${tr('Selesai', 'Done')}</button></div></div>`);
    const say = () => playLetter(ans, L.ar, L.name);
    setTimeout(say, 250);
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
  loading(p: number | null, text = '') {
    const l = $('#loading');
    if (p === null) { l.classList.add('hidden'); return; }
    l.classList.remove('hidden');
    $('#loadTxt').textContent = text || tr('Menyiapkan dunia Baby Mo…', 'Preparing Baby Mo’s world…');
    $('#loadBar').style.width = Math.round(p * 100) + '%';
  }
  showStart(hasSave: boolean, onPlay: (fresh: boolean) => void) {
    const s = this.g.settings;
    const el = $('#startPanel');
    const render = () => {
      el.innerHTML = `${this.langSeg()}<img class="logo" src="img/baby-mo-pose-05.webp" alt="Baby Mo"><h1>${tr('Dunia Baby Mo', 'Baby Mo’s World')}</h1>
        <div class="sub">${tr('Jelajahi hutan, gurun kurma, bukit salju & gua. Bangun masjidmu, temukan 28 huruf hijaiyah, dan sambut Ramadhan! 🌙', 'Explore forests, date deserts, snowy hills & caves. Build your masjid, find 28 hijaiyah letters and welcome Ramadan! 🌙')}</div>
        <div class="choice" id="cAv"><button data-v="boy" class="${s.avatar === 'boy' ? 'on' : ''}"><span class="e">👦</span>Ibra</button><button data-v="girl" class="${s.avatar === 'girl' ? 'on' : ''}"><span class="e">👧</span>Aisyah</button></div>
        <div class="choice" id="cMode"><button data-v="adventure" class="${s.mode === 'adventure' ? 'on' : ''}"><span class="e">🧭</span>${tr('Petualangan', 'Adventure')}<small>${tr('kumpulkan & buat barang', 'gather & craft')}</small></button><button data-v="creative" class="${s.mode === 'creative' ? 'on' : ''}"><span class="e">🧱</span>${tr('Kreatif', 'Creative')}<small>${tr('balok bebas & terbang', 'free blocks & flying')}</small></button></div>
        <button class="btn" id="sPlay">${hasSave ? tr('▶️ Lanjutkan petualangan', '▶️ Continue adventure') : tr('▶️ Mulai bermain', '▶️ Start playing')}</button>
        ${hasSave ? `<button class="btn ghost small" id="sNew">🌍 ${tr('Dunia baru', 'New world')}</button>` : ''}`;
      el.querySelectorAll<HTMLElement>('#cAv button').forEach(b => (b.onclick = () => { s.avatar = b.dataset.v as 'boy' | 'girl'; render(); }));
      el.querySelectorAll<HTMLElement>('#cMode button').forEach(b => (b.onclick = () => { s.mode = b.dataset.v as 'adventure' | 'creative'; render(); }));
      $('#sPlay', el).onclick = () => { $('#start').classList.add('hidden'); onPlay(false); };
      const n = $('#sNew', el); if (n) n.onclick = () => { $('#start').classList.add('hidden'); onPlay(true); };
      this.bindLangSeg(el, render);
    };
    render();
    $('#start').classList.remove('hidden');
  }
}

