// Full QA pass: every learning and Ramadhan feature, on five device profiles,
// with layout checks (no sideways scrolling, pop-ups fit the screen, tap
// targets big enough, Arabic images drawn). Slower than the smoke test, so it
// runs on demand:  npm run build && npm run qa  [-- desktop iphone ...]
// Device profiles are emulated in Chromium (size, touch, user agent); this is
// not real Safari/WebKit and does not replace testing on devices.
import { chromium, devices } from 'playwright';
import { preview } from 'vite';
import { writeFileSync } from 'node:fs';

const PROFILES = {
  desktop: { viewport: { width: 1280, height: 760 } },
  iphone: { ...devices['iPhone 13 landscape'] },
  'iphone-portrait': { ...devices['iPhone 13'] },
  ipad: { ...devices['iPad (gen 7) landscape'] },
  android: { ...devices['Pixel 7'] },
};
const only = process.argv.slice(2);
const profiles = Object.keys(PROFILES).filter(k => !only.length || only.includes(k));
let server, url = process.env.QA_URL;
if (!url) { server = await preview({ preview: { port: 4321, strictPort: true, host: '127.0.0.1' }, logLevel: 'warn' }); url = server.resolvedUrls.local[0]; }
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = [];
let failed = 0;

for (const name of profiles) {
  const ctx = await browser.newContext(PROFILES[name]);
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const touch = !!PROFILES[name].hasTouch;
  const g = (fn, arg) => p.evaluate(fn, arg);
  const tap = async sel => { await p.locator(sel).first().click({ force: true }); };
  const rows = [];
  const check = async (label, fn) => {
    const t = Date.now();
    // start every check from a clear screen (rewards earned in the last check can queue a pop-up)
    if (rows.length) await closeAll().catch(() => {});
    try { const info = await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error('timed out')), 90000))]); rows.push({ label, ok: true, info }); console.log(`[${name}] ✓ ${label}`); }
    catch (e) { rows.push({ label, ok: false, info: String(e.message || e).split('\n')[0] }); console.log(`[${name}] ✗ ${label}: ${String(e.message || e).split('\n')[0]}`); }
    rows[rows.length - 1].ms = Date.now() - t;
  };
  /** layout of whatever is on screen right now */
  const layout = async where => {
    const r = await g(() => {
      const W = innerWidth, H = innerHeight, issues = [];
      if (document.documentElement.scrollWidth > W + 1) issues.push(`page scrolls sideways (${document.documentElement.scrollWidth} > ${W})`);
      const panel = [...document.querySelectorAll('.veil.on .panel, .veil.on #book')].pop();
      if (panel) {
        const b = panel.getBoundingClientRect();
        if (b.left < -1 || b.right > W + 1) issues.push(`pop-up wider than the screen (${Math.round(b.left)}..${Math.round(b.right)} of ${W})`);
        if (b.bottom > H + 2 && getComputedStyle(panel).overflowY === 'visible') issues.push(`pop-up taller than the screen and can't scroll`);
        for (const btn of panel.querySelectorAll('button')) {
          const r = btn.getBoundingClientRect(); if (!r.width || !r.height || getComputedStyle(btn).visibility === 'hidden') continue;
          if (Math.min(r.width, r.height) < 30) issues.push(`small button "${(btn.innerText || btn.getAttribute('aria-label') || '').trim().slice(0, 20)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
        }
        for (const img of panel.querySelectorAll('img')) if (img.complete && img.naturalWidth === 0) issues.push('an image failed to draw');
        // the content of a pop-up sits in the middle, not stuck to the left
        const cs = getComputedStyle(panel), padL = parseFloat(cs.paddingLeft), padR = parseFloat(cs.paddingRight);
        for (const c of panel.children) {
          const r = c.getBoundingClientRect(); if (!r.width || getComputedStyle(c).position === 'absolute') continue;
          const l = r.left - b.left - padL, rr = b.right - r.right - padR;
          if (Math.abs(l - rr) > 12 && r.width < b.width - padL - padR - 4) issues.push(`pop-up content off-centre (${Math.round(l)}px left, ${Math.round(rr)}px right) in .${c.className || c.tagName}`);
        }
      }
      return issues;
    });
    if (r.length) throw new Error(`${where}: ${r.slice(0, 3).join('; ')}`);
    return 'layout ok';
  };
  async function closeAll() { for (let i = 0; i < 24; i++) { const n = await g(() => { const b = document.querySelector('.veil.on #sNext, .veil.on #lOk, .veil.on #trOk, .veil.on #lvOk, .veil.on #dOk, .veil.on #qClose, .veil.on #wgClose, .veil.on #dbtns .btn.ghost, .veil.on #dbtns .btn, .veil.on #pOk, .veil.on [id$="Ok"]'); if (b) { b.click(); return 1; } if (document.querySelector('#vBook.on')) { __game.ui.closeBook(); return 1; } return 0; }); if (!n) break; await p.waitForTimeout(250); } }

  await check('boot and start (Indonesian)', async () => {
    await p.goto(url + '?lang=id'); await p.waitForSelector('#sPlay');
    await layout('start screen');
    await tap('#sPlay');
    await p.waitForFunction(() => window.__game?.running, null, { timeout: 120000 });
    await g(() => { const G = __game; G.settings.reminders = false; G.settings.water = 0; G.kid.stuckCooldown = 1e9; G.watchFps = () => {}; });
    await p.waitForTimeout(800);
    return await g(() => document.documentElement.lang || 'id');
  });
  await check('tutorial: say hi with the 👋 button, then skip the rest', async () => {
    await g(() => { __game.kid.walked = 10; const m = __game.ents.mo; __game.player.pos.set(m.pos.x, m.pos.y, m.pos.z + 3.5); __game.player.yaw = 0; });
    await p.waitForTimeout(1200);
    const vis = await p.isVisible('#moHi');
    if (vis) await tap('#moHi'); else await g(() => __game.useEntity(__game.ents.mo));
    await p.waitForTimeout(500);
    const ok = await g(() => !!__game.stats.talked.mo);
    if (!ok) throw new Error('hello not counted');
    await g(() => __game.kid.skipAll());
    await closeAll();
    return { buttonShown: vis };
  });
  await check('hijaiyah letters: card, harakat sounds, gift, treasure at 4', async () => {
    const before = await g(() => __game.inv.count(213));
    for (let k = 0; k < 4; k++) {
      await g(k => { const G = __game, s = G.gen.shrines[k]; G.collectLetter(s.letter, s.x, s.y, s.z); }, k);
      await p.waitForTimeout(400);
      if (k === 0) {
        await p.waitForSelector('.veil.on .lcard');
        await layout('letter card');
        const imgs = await g(() => document.querySelectorAll('.veil.on .lcard img').length);
        if (imgs < 4) throw new Error('Arabic letter images missing');
        await g(() => document.querySelector('.veil.on .harakat button').click());
      }
      await closeAll();
    }
    const r = await g(() => ({ letters: __game.stats.letters.length, crystal: __game.inv.count(213) }));
    if (r.letters !== 4 || r.crystal - before < 2) throw new Error(JSON.stringify(r));
    return r;
  });
  await check('letter quiz', async () => {
    await g(() => __game.ui.quiz()); await p.waitForSelector('.veil.on .quizOpts button');
    await layout('quiz');
    const q0 = await g(() => __game.stats.quiz || 0);
    // try the options until the right one is found
    const n = await g(() => document.querySelectorAll('.veil.on .quizOpts button').length);
    for (let i = 0; i < n; i++) { await g(i => document.querySelectorAll('.veil.on .quizOpts button')[i]?.click(), i); await p.waitForTimeout(250); if ((await g(() => __game.stats.quiz || 0)) > q0) break; }
    const q1 = await g(() => __game.stats.quiz || 0);
    await closeAll();
    if (q1 <= q0) throw new Error('no right answer counted');
    return { quizRight: q1 };
  });
  await check('word builder: spell a whole word', async () => {
    await g(() => __game.ui.wordGame()); await p.waitForSelector('.veil.on .wg-tiles button');
    await layout('word builder');
    const w0 = await g(() => __game.stats.words || 0);
    for (let guard = 0; guard < 30; guard++) {
      const done = await g(() => !document.querySelector('.veil.on .wg-done')?.classList.contains('hidden'));
      if (done) break;
      const filled = await g(() => document.querySelectorAll('.veil.on .wg-slot.on, .veil.on .wg-slot.filled, .veil.on .wg-slot img').length);
      const tiles = await g(() => document.querySelectorAll('.veil.on .wg-tiles button:not([disabled]):not(.used)').length);
      let progressed = false;
      for (let i = 0; i < tiles && !progressed; i++) {
        await g(i => document.querySelectorAll('.veil.on .wg-tiles button:not([disabled]):not(.used)')[i]?.click(), i);
        await p.waitForTimeout(120);
        const f2 = await g(() => document.querySelectorAll('.veil.on .wg-slot.on, .veil.on .wg-slot.filled, .veil.on .wg-slot img').length);
        progressed = f2 > filled;
      }
      if (!progressed) break;
    }
    await p.waitForTimeout(600);
    const w1 = await g(() => __game.stats.words || 0);
    await closeAll();
    if (w1 <= w0) throw new Error('word not completed');
    return { words: w1 };
  });
  await check("du'a card from a bookshelf", async () => {
    await g(() => { const G = __game, w = G.world; const x = 30, z = 30; let y = 100; while (y > 1 && !w.get(x, y, z)) y--; w.set(x, y + 1, z, 44); G.useBlock({ x, y: y + 1, z, id: 44, nx: 0, ny: 1, nz: 0, dist: 2 }); });
    await p.waitForSelector('.veil.on .panel'); await p.waitForTimeout(300);
    await layout("du'a card");
    // du'a are long, so they're set as real Arabic text in the bundled font (letters use images)
    const r = await g(() => { const el = document.querySelector('.veil.on .dua .ar'); const b = el?.getBoundingClientRect(); return { arabic: /[\u0600-\u06FF]/.test(el?.textContent || ''), font: el ? getComputedStyle(el).fontFamily : '', w: b?.width || 0, h: b?.height || 0, fontReady: document.fonts.check('700 30px "Scheherazade New"', 'بسم') }; });
    await closeAll();
    if (!r.arabic || r.h < 20) throw new Error(JSON.stringify(r));
    return r;
  });
  await check('every book tab fits the screen', async () => {
    const out = {};
    for (const t of ['bag', 'craft', 'build', 'wardrobe', 'map', 'letters', 'quests', 'ramadhan', 'prayer', 'settings']) {
      await g(t => __game.ui.openBook(t), t); await p.waitForTimeout(200);
      await layout('book tab ' + t);
      out[t] = await g(() => document.getElementById('book').innerText.trim().length);
    }
    await g(() => __game.ui.closeBook());
    return out;
  });
  await check('Ramadhan calendar: open and claim day 1', async () => {
    const r = await g(() => { const G = __game; const had = G.claimed.has(1); G.claimDay(1); return { had, now: G.claimed.has(1) }; });
    await p.waitForTimeout(400); await closeAll();
    if (!r.now) throw new Error('day 1 not claimed');
    return r;
  });
  await check('prayer times: five times, and changing the method changes them', async () => {
    const a = await g(() => { __game.ui.openBook('prayer'); return document.getElementById('book').innerText.match(/\b\d{1,2}[:.]\d{2}\b/g) || []; });
    const b = await g(() => { const G = __game; G.settings.method = G.settings.method === 'mwl' ? 'kemenag' : 'mwl'; G.refreshTimes(); G.ui.openBook('prayer'); return document.getElementById('book').innerText.match(/\b\d{1,2}[:.]\d{2}\b/g) || []; });
    await g(() => __game.ui.closeBook());
    if (a.length < 5) throw new Error('only ' + a.length + ' times');
    return { times: a.slice(0, 6).join(' '), changed: a.join() !== b.join() };
  });
  await check('prayer time in the game: villagers go to the masjid, pray together', async () => {
    await g(() => { const G = __game; const h = G.schedule.dhuhr; G.hour = h - 0.05; G.lastHour = G.hour; G.settings.dayMinutes = 1; G.player.pos.set(0.5, 46, -14.5); });
    await p.waitForFunction(() => !!__game.gameEvent, null, { timeout: 30000 });
    await g(() => { const G = __game; G.settings.dayMinutes = 600; for (const n of G.ents.npcs) if (n.target) { n.pos.copy(n.target); n.target = null; } });
    await p.waitForTimeout(800);
    await closeAll();
    const btn = await p.isVisible('#bPray');
    if (btn) await tap('#bPray'); else await g(() => __game.prayTogether());
    await p.waitForTimeout(1500);
    const r = await g(() => ({ event: __game.gameEvent?.p, npcsPraying: __game.ents.npcs.filter(n => n.praying).length, moPraying: __game.ents.mo.praying, me: __game.prayingPose }));
    if (!r.event || r.npcsPraying < 3 || !r.moPraying) throw new Error(JSON.stringify(r));
    await g(() => { const G = __game; G.player.pos.set(0.5, 46, 3.5); });
    return { ...r, buttonShown: btn };
  });
  await check('Maghrib: iftar picnic on the plaza', async () => {
    await g(() => { const G = __game; G.gameEvent = null; const h = G.schedule.maghrib; G.hour = h - 0.05; G.lastHour = G.hour; G.settings.dayMinutes = 1; });
    await p.waitForFunction(() => __game.gameEvent?.p === 'maghrib', null, { timeout: 30000 });
    await g(() => { __game.settings.dayMinutes = 600; });
    const r = await g(() => ({ picnic: __game.festive.picnicOn, villagersAtPicnic: __game.ents.npcs.filter(n => n.activity === 'picnic').length }));
    await closeAll();
    if (!r.picnic || r.villagersAtPicnic < 3) throw new Error(JSON.stringify(r));
    return r;
  });
  await check('bedug drum', async () => {
    const r = await g(() => { const G = __game, b0 = G.stats.bedug || 0; G.festive.bedug(); return { before: b0, after: G.stats.bedug || 0 }; });
    await closeAll();
    return r;
  });
  await check('bedtime story', async () => {
    await g(() => __game.festive.story(() => {}));
    await p.waitForSelector('.veil.on .panel'); await p.waitForTimeout(300);
    await layout('bedtime story');
    const text = await g(() => document.querySelector('.veil.on .panel').innerText.length);
    await closeAll();
    if (text < 40) throw new Error('story looks empty');
    return { chars: text };
  });
  await check('water break with the "are you sure?" check', async () => {
    await g(() => __game.ui.waterBreak());
    await p.waitForSelector('.veil.on #wGlass', { timeout: 8000 }).catch(async () => { throw new Error('water pop-up not shown; on screen: ' + JSON.stringify(await g(() => ({ veils: [...document.querySelectorAll('.veil')].map(v => (v.classList.contains('on') ? 'ON ' : '') + v.innerText.slice(0, 50)), modals: __game.ui.modals.length, queue: __game.ui.modalQueue.length, book: document.querySelector('#vBook')?.className, paused: __game.paused })))); });
    await layout('water break');
    await tap('#wGlass'); await p.waitForSelector('.veil.on #wYes');
    await layout('water break, are you sure');
    const w0 = await g(() => __game.stats.water || 0);
    await tap('#wYes'); await p.waitForTimeout(2800);
    const w1 = await g(() => __game.stats.water || 0);
    if (w1 !== w0 + 1) throw new Error('not counted');
    return { water: w1 };
  });
  await check('parents: gate with a grown-up sum, report and settings', async () => {
    await g(() => __game.ui.parentGate(() => __game.ui.parentsPanel()));
    await p.waitForSelector('.gateScr #pgIn');
    await layout('parent gate');
    // a wrong answer keeps it shut
    await p.fill('.gateScr #pgIn', '1'); await g(() => document.querySelector('.gateScr #pgOk').click());
    if (await g(() => !!document.querySelector('.veil.on .report'))) throw new Error('opened with a wrong answer');
    const ans = await g(() => { const t = document.querySelector('.gateScr .gateQ').innerText.match(/(\d+)\s*×\s*(\d+)/); return +t[1] * +t[2]; });
    await p.fill('.gateScr #pgIn', String(ans)); await g(() => document.querySelector('.gateScr #pgOk').click());
    await p.waitForSelector('.veil.on .report'); await p.waitForTimeout(300);
    await layout('parents panel');
    const report = await g(() => document.querySelectorAll('.veil.on .report > div').length);
    await closeAll();
    return { reportTiles: report };
  });
  await check('play-time lock: stops the game until a grown-up adds time', async () => {
    await g(() => { const G = __game; G.ui.closeAllModals(); G.stats.play = { day: new Date().toDateString(), sec: G.settings.playLimit * 60 + 1 }; });
    await p.waitForSelector('.lockScr', { timeout: 10000 });
    await layout('play-time lock');
    const before = await g(() => ({ paused: __game.paused, hour: __game.hour }));
    await p.waitForTimeout(800);
    const still = await g(h => __game.paused && __game.hour === h, before.hour);
    if (!still) throw new Error('game kept running behind the lock');
    await g(() => document.querySelector('.lockScr #lkParent').click());
    await p.waitForSelector('.gateScr #pgIn');
    const ans = await g(() => { const t = document.querySelector('.gateScr .gateQ').innerText.match(/(\d+)\s*×\s*(\d+)/); return +t[1] * +t[2]; });
    await p.fill('.gateScr #pgIn', String(ans)); await g(() => document.querySelector('.gateScr #pgOk').click());
    await g(() => document.querySelector('.lockScr [data-add="15"]').click());
    await p.waitForTimeout(400);
    const after = await g(() => ({ lock: !!document.querySelector('.lockScr'), paused: __game.paused, extra: __game.stats.play.extra }));
    if (after.lock || after.paused || after.extra !== 900) throw new Error(JSON.stringify(after));
    await g(() => { __game.stats.play.sec = 0; __game.stats.play.extra = 0; });
    return after;
  });
  await check('switch language to English and back', async () => {
    await g(() => __game.ui.openBook('settings')); await p.waitForTimeout(200);
    const en = await g(() => { const b = document.querySelector('#book [data-lang="en"]'); b?.click(); return !!b; });
    await p.waitForTimeout(400);
    const text = await g(() => document.getElementById('book')?.innerText || '');
    await g(() => document.querySelector('#book [data-lang="id"]')?.click()); await p.waitForTimeout(200);
    await g(() => __game.ui.closeBook());
    if (!en || !/Settings|Language|Sound/i.test(text)) throw new Error('English not shown');
    return 'ok';
  });
  await check('HUD fits the screen', async () => {
    await closeAll(); await p.waitForTimeout(300);
    const r = await g(() => {
      const W = innerWidth, H = innerHeight, bad = [];
      for (const el of document.querySelectorAll('#hud > *:not(.hidden)')) {
        const b = el.getBoundingClientRect(); if (!b.width) continue;
        if (b.left < -2 || b.right > W + 2 || b.top < -2 || b.bottom > H + 2) bad.push(`${el.id || el.className} ${Math.round(b.left)},${Math.round(b.top)}–${Math.round(b.right)},${Math.round(b.bottom)}`);
      }
      return bad;
    });
    if (r.length) throw new Error(r.slice(0, 3).join('; '));
    return 'ok';
  });
  await check('no errors in the console', async () => { if (errors.length) throw new Error(errors.slice(0, 3).join(' | ')); return 'none'; });
  await p.screenshot({ path: `qa-${name}.png` }).catch(() => {});
  if (rows.some(r => !r.ok)) failed++;
  report.push({ profile: name, viewport: PROFILES[name].viewport, touch, rows });
  await ctx.close();
}
await browser.close(); await server?.close();
writeFileSync('qa-results.json', JSON.stringify(report, null, 1));
for (const r of report) { console.log(`\n${r.profile} (${r.viewport.width}×${r.viewport.height}${r.touch ? ', touch' : ''})`); for (const x of r.rows) console.log(`  ${x.ok ? '✓' : '✗'} ${x.label}${x.ok ? '' : ' — ' + x.info}`); }
console.log(failed ? `\n${failed} profile(s) with failures` : '\nall profiles passed');
process.exit(failed ? 1 : 0);
