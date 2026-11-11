// Browser smoke test: plays the built game in headless Chromium and checks the
// critical paths. Usage: npm run build && npm run smoke
// Starts `vite preview` itself unless SMOKE_URL is given.
// Device profiles are emulated in Chromium (size, touch, user agent): this is
// not real Safari/WebKit and does not replace testing on devices.
import { chromium, devices } from 'playwright';
import { preview } from 'vite';

const PROFILES = {
  desktop: { viewport: { width: 1280, height: 760 } },
  iphone: { ...devices['iPhone 13 landscape'] },
  ipad: { ...devices['iPad (gen 7) landscape'] },
  android: { ...devices['Pixel 7'] },
};
const only = process.argv.slice(2);
const STEP_LIMIT = +(process.env.SMOKE_STEP_LIMIT || 180000);
const profiles = Object.keys(PROFILES).filter(k => !only.length || only.includes(k));

let server, url = process.env.SMOKE_URL;
if (!url) {
  server = await preview({ preview: { port: 4319, strictPort: true, host: '127.0.0.1' }, logLevel: 'warn' });
  url = server.resolvedUrls.local[0];
}

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
let failed = 0;

async function run(name) {
  const ctx = await browser.newContext(PROFILES[name]);
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const steps = [];
  const step = async (label, fn) => {
    const t = Date.now();
    // every step has a hard limit, and progress is printed live (useful in CI logs)
    const limit = new Promise((_, rej) => setTimeout(() => rej(new Error(`step timed out after ${STEP_LIMIT / 1000}s`)), STEP_LIMIT));
    try { const info = await Promise.race([fn(), limit]); steps.push({ label, ok: true, ms: Date.now() - t, info }); console.log(`[${name}] ✓ ${label} (${Date.now() - t} ms)`); }
    catch (e) { steps.push({ label, ok: false, ms: Date.now() - t, info: String(e.message || e).split('\n')[0] }); console.log(`[${name}] ✗ ${label}: ${String(e.message || e).split('\n')[0]}`); throw e; }
  };
  const g = (fn, arg) => p.evaluate(fn, arg);
  /** wait for the pop-up holding `sel`; any other pop-up queued in front of it (a place just discovered…) is closed */
  const popup = (sel, timeout = 30000) => p.waitForFunction(sel => !!document.querySelector('.veil.on ' + sel) || (__game.ui.modals.filter(m => !m.veil.querySelector(sel)).forEach(m => m.close()), false), sel, { timeout, polling: 200 });
  const touch = !!PROFILES[name].hasTouch;
  try {
    await step('boot', async () => { await p.goto(url + '?lang=id'); await p.waitForSelector('#sPlay', { timeout: 30000 }); });
    await step('start a new world', async () => {
      touch ? await p.tap('#sPlay') : await p.click('#sPlay');
      await p.waitForFunction(() => window.__game?.running, null, { timeout: 120000 });
      await p.waitForTimeout(1500);
      return await g(() => ({ chunks: __game.world.chunks.size, animals: __game.ents.animals.length, npcs: __game.ents.npcs?.length }));
    });
    await step('touch controls shown only on touch devices', async () => {
      const vis = await p.isVisible('#stick');
      if (vis !== touch) throw new Error(`stick visible=${vis}, touch=${touch}`);
    });
    await step('walk', async () => {
      await g(() => { const G = __game; G.ui.closeAllModals?.(); G.player.pos.set(0.5, 47, 3.5); G.player.yaw = 0; G.player.pitch = 0; });
      await p.waitForTimeout(400);
      const a = await g(() => [__game.player.pos.x, __game.player.pos.z]);
      let anim;
      if (touch) {
        const box = await p.locator('#stick').boundingBox();
        const cdp = await ctx.newCDPSession(p);
        const c = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [c] });
        for (let i = 1; i <= 5; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x, y: c.y - i * 10 }] });
        await p.waitForTimeout(1200);
        anim = await g(() => __game.anim.loco);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else { await p.keyboard.down('KeyW'); await p.waitForTimeout(1200); anim = await g(() => __game.anim.loco); await p.keyboard.up('KeyW'); }
      if (anim !== 'walk' && anim !== 'run') throw new Error('avatar animation while walking: ' + anim);
      const b = await g(() => [__game.player.pos.x, __game.player.pos.z]);
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d < 0.5) throw new Error('player did not move: ' + d.toFixed(2));
      return { moved: +d.toFixed(2), anim };
    });
    await step('mine a block (hold mine)', async () => {
      // stand on top of solid ground and look straight down at it
      const spot = await g(() => {
        const G = __game, w = G.world;
        let y = 100; while (y > 1 && !w.get(20, y, 20)) y--;
        w.set(20, y, 20, 2); // dirt: quick to dig with bare hands
        G.player.pos.set(20.5, y + 1.01, 20.5); G.player.vel?.set?.(0, 0, 0); G.player.pitch = -1.5; G.settings.cam = 'first';
        G.inv.sel = 8; G.inv.slots[8] = null;
        return { y, mined: G.stats.mined[2] || 0, have: G.inv.count(2) };
      });
      await p.waitForTimeout(500);
      await g(() => { __game.input.mineHeld = true; });
      await p.waitForFunction(() => __game.anim.action === 'mine', null, { timeout: 5000 });
      await p.waitForFunction(y => __game.world.get(20, y, 20) === 0, spot.y, { timeout: 15000 });
      await g(() => { __game.input.mineHeld = false; });
      await p.waitForTimeout(300);
      const after = await g(() => ({ mined: __game.stats.mined[2] || 0, have: __game.inv.count(2) }));
      if (after.mined !== spot.mined + 1 || after.have < spot.have + 1) throw new Error(JSON.stringify({ spot, after }));
      return after;
    });
    await step('place a block', async () => {
      const r = await g(() => {
        const G = __game, w = G.world;
        const x = 20, z = 23; let y = 100; while (y > 1 && !w.get(x, y, z)) y--;
        G.inv.slots[0] = { id: 20, n: 5 }; G.inv.sel = 0;
        const before = G.stats.placed, had = G.inv.count(20);
        G.useBlock({ x, y, z, id: w.get(x, y, z), nx: 0, ny: 1, nz: 0, dist: 2 });
        return { placed: G.stats.placed - before, block: w.get(x, y + 1, z), used: had - G.inv.count(20) };
      });
      if (r.placed !== 1 || r.block !== 20 || r.used !== 1) throw new Error(JSON.stringify(r));
      return r;
    });
    await step('place, turn and pick up furniture', async () => {
      const r = await g(() => {
        const G = __game, w = G.world, x = 22, z = 26; let y = 100; while (y > 1 && !w.get(x, y, z)) y--;
        G.inv.slots[0] = { id: 231, n: 1 }; G.inv.sel = 0; // a table
        G.useBlock({ x, y, z, id: w.get(x, y, z), nx: 0, ny: 1, nz: 0, dist: 2 });
        const d = G.deco.at(x, y + 1, z); if (!d) return { placed: false };
        const r0 = d.rot; G.turnDeco(d); const turned = d.rot === (r0 + 1) % 4;
        G.pickUpDeco(d);
        return { placed: true, turned, back: G.inv.count(231), gone: !G.deco.at(x, y + 1, z) };
      });
      if (!r.placed || !r.turned || r.back !== 1 || !r.gone) throw new Error(JSON.stringify(r));
      return r;
    });
    await step("Ibra's ideas: toy sword shoos a beetle, cooking game, power hat", async () => {
      const r = await g(() => {
        const G = __game; G.ui.modals.slice().forEach(m => m.close());
        G.inv.slots[2] = { id: 242, n: 1 }; G.inv.sel = 2; // a toy stone sword
        let b = null; for (let k = 0; k < 5 && !b; k++) b = G.bugs.spawn(G.player.pos);
        if (!b) return { bug: 'none spawned' };
        let taps = 0; while (!b.caught && taps < 15) { G.attackCd = 0; G.attackBug(b); taps++; }
        // a furnace to cook at, and an egg
        const w = G.world, x = 21, z = 27; let y = 100; while (y > 1 && !w.get(x, y, z)) y--; w.set(x, y + 1, z, 32);
        G.player.pos.set(x + 1.5, y + 1, z + 0.5); G.inv.add(216, 1);
        return { caught: b.caught, taps, swordXp: G.skillXp('sword'), eggs: G.inv.count(250), started: G.craft(G.findRecipe(250)) };
      });
      if (r.bug || !r.caught || !r.started) throw new Error(JSON.stringify(r));
      // play the three rounds (whatever the timing, the food is made), then take it
      await p.waitForSelector('.veil.on #ckGo');
      for (let k = 0; k < 4; k++) { await g(() => document.querySelector('.veil.on #ckGo')?.click()); await p.waitForTimeout(150); }
      const after = await g(() => { const G = __game; const rods = G.inv.count(244); G.settings.outfit.hat = 'hat_fisher'; G.buildAvatar(); G.wearHat('hat_fisher'); return { friedEggs: G.inv.count(250), cooked: G.stats.cooked, rodGift: G.inv.count(244) - rods }; });
      if (after.friedEggs <= r.eggs || after.cooked < 1 || after.rodGift !== 1) throw new Error(JSON.stringify({ r, after }));
      return { taps: r.taps, ...after };
    });
    await step('new places: pearl cave, telescope star picture, Eid bazaar', async () => {
      // the pearl cave under the reef: standing in its air pocket finds the secret spot
      const r = await g(() => {
        const G = __game; G.ui.closeAllModals();
        const reef = G.gen.landmarks.find(l => l.id === 'reef'), cave = reef.spots[0];
        G.player.pos.set(cave.x, cave.y, cave.z); G.player.vel.set(0, 0, 0);
        return { cave: [cave.x, cave.y, cave.z] };
      });
      for (let i = 0; i < 40; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      await p.waitForFunction(() => __game.stats.spots?.includes('pearl_cave') || (__game.ui.closeAllModals(), false), null, { timeout: 20000, polling: 300 });
      // the telescope: join up the Summer Triangle by tapping its stars
      await g(() => { const G = __game; G.ui.closeAllModals(); G.ui.telescope('stars'); });
      await p.waitForSelector('.veil.on [data-c="triangle"]');
      await g(() => document.querySelector('.veil.on [data-c="triangle"]').click());
      await p.waitForTimeout(150);
      const pts = await g(() => { const cv = document.querySelector('.veil.on #scSky'); cv.scrollIntoView({ block: 'center' }); const b = cv.getBoundingClientRect(); return [[30, 22], [74, 16], [52, 78], [30, 22]].map(([x, y]) => [b.left + (20 + x / 100 * 300) * b.width / 340, b.top + (15 + y / 100 * 200) * b.height / 230]); });
      for (const [x, y] of pts) { touch ? await p.touchscreen.tap(x, y) : await p.mouse.click(x, y); await p.waitForTimeout(120); }
      const cons = await g(() => __game.stats.constellations || []);
      if (!cons.includes('triangle')) throw new Error('star picture not joined: ' + JSON.stringify(cons));
      // the Eid bazaar: open it, take food at the ketupat stall, greet a villager for an Eid envelope
      const e = await g(() => {
        const G = __game; G.ui.closeAllModals(); G.settings.eid = 'on'; G.eid.refresh(); G.stats.eidWelcome = true;
        const s = G.eid.stalls.find(s => s.id === 'food'); G.player.pos.set(s.front.x, s.front.y, s.front.z); G.player.vel.set(0, 0, 0);
        return { open: G.eid.open, food: G.inv.count(253) };
      });
      if (!e.open) throw new Error('bazaar did not open');
      await p.waitForSelector('.veil.on #dbtns button.gold', { timeout: 15000 });
      await g(() => document.querySelector('.veil.on #dbtns button.gold').click());
      const f = await g(() => { const G = __game; G.ui.closeAllModals(); G.inv.slots[G.inv.sel] = null; G.talkNpc(G.ents.npcs.find(n => n.id === 'yusuf')); return { food: G.inv.count(253), angpao: G.inv.count(255) }; });
      if (f.food < e.food + 2 || f.angpao < 1) throw new Error(JSON.stringify({ e, f }));
      await g(() => { const G = __game; G.ui.closeAllModals(); G.settings.eid = 'auto'; G.eid.refresh(); G.player.pos.set(0.5, 47, 3.5); });
      // back home, and wait until the village is loaded again for the steps that follow
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      return { spot: 'pearl_cave', cons, ...f };
    });
    await step('raft ride down the river', async () => {
      const r = await g(() => { const G = __game; G.ui.closeAllModals(); const l = G.gen.landmarks.find(l => l.id === 'river'); G.player.pos.set(l.at.dock[0] + 0.5, l.at.dock[1], l.at.dock[2] + 0.5); G.startRaft(); return { riding: G.fun.riding?.kind, mo: !!G.ents.mo.seat }; });
      if (r.riding !== 'raft' || !r.mo) throw new Error(JSON.stringify(r));
      // slow machines draw few frames a second: wait until it has floated a little (closing any pop-up that pauses the game)
      await p.waitForFunction(() => (__game.fun.riding?.s ?? 0) > 0.5 || (__game.ui.closeAllModals(), false), null, { timeout: 20000, polling: 300 }).catch(() => {});
      const moved = await g(() => __game.fun.riding?.s ?? 0);
      if (!(moved > 0.5)) throw new Error('raft did not move: ' + moved);
      await g(() => { const R = __game.fun.riding; R.s = R.cum[R.cum.length - 1] - 1; });
      await p.waitForFunction(() => !__game.fun.riding || (__game.ui.closeAllModals(), false), null, { timeout: 20000, polling: 300 });
      const end = await g(() => { const G = __game; G.ui.closeAllModals(); const out = { rides: G.stats.raftRides, seat: G.ents.mo.seat }; G.player.pos.set(0.5, 47, 3.5); return out; });
      if (end.rides !== 1 || end.seat) throw new Error(JSON.stringify(end));
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      return { moved: +moved.toFixed(1), ...end };
    });
    await step('rescue a lost animal and feed it at the sanctuary', async () => {
      const lost = await g(() => { const G = __game; G.ui.closeAllModals(); const l = G.sanctuary.lost[0]; G.player.pos.set(l.x + 3, G.gen.column(Math.floor(l.x + 3), Math.floor(l.z)).h + 1, l.z); return l; });
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      await p.waitForFunction(id => [...__game.ents.animals].some(a => __game.sanctuary.owns(a) === id) || (__game.ui.closeAllModals(), false), lost.id, { timeout: 20000, polling: 300 });
      await g(id => { const G = __game; const a = G.ents.animals.find(a => G.sanctuary.owns(a) === id); G.ui.closeAllModals(); G.sanctuary.befriend(a); G.ui.closeAllModals(); const pen = G.gen.landmarks.find(l => l.id === 'sanctuary').at.pen; G.player.pos.set(pen[0], pen[1], pen[2] + 1); }, lost.id);
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      await p.waitForFunction(id => (__game.stats.rescued || []).includes(id) || (__game.ui.closeAllModals(), false), lost.id, { timeout: 20000, polling: 300 });
      const fed = await g(() => { const G = __game; G.ui.closeAllModals(); G.inv.add(217, 1); G.inv.sel = G.inv.slots.findIndex(s => s && s.id === 217); const a = G.ents.animals.find(a => G.sanctuary.isHome(a)); a.petCd = 0; const ok = G.sanctuary.feed(a); G.ui.closeAllModals(); G.inv.sel = Math.max(0, G.inv.slots.findIndex((s, i) => i < 9 && !s)); G.player.pos.set(0.5, 47, 3.5); return { ok, fed: G.stats.fed, rescued: G.stats.rescued }; });
      if (!fed.ok || fed.fed !== 1) throw new Error(JSON.stringify(fed));
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      return fed;
    });
    await step('make and fly a kite', async () => {
      const r = await g(() => {
        const G = __game; G.ui.closeAllModals();
        const w = G.world, x = 3, z = 9; let y = 100; while (y > 1 && !w.get(x, y, z)) y--; w.set(x + 1, y + 1, z, 31); // a workbench
        G.player.pos.set(x + 0.5, y + 1, z + 0.5);
        G.inv.add(200, 2); G.inv.add(46, 2);
        const made = G.craft(G.findRecipe(257));
        const slot = G.inv.slots.findIndex(s => s && s.id === 257); G.inv.sel = slot;
        G.ui.closeAllModals(); G.kites.toggle(257);
        return { made, slot, flying: G.kites.flying };
      });
      if (!r.made || r.slot < 0 || r.flying !== 257) throw new Error(JSON.stringify(r));
      // pop-ups (a level-up after crafting) pause the game: close them while the kite climbs
      await p.waitForFunction(() => __game.kites.h > 1.55 || (__game.ui.closeAllModals(), false), null, { timeout: 20000, polling: 300 }).catch(() => {});
      const h = await g(() => { const G = __game; const out = { flying: G.kites.flying, h: +G.kites.h.toFixed(3) }; G.kites.stop(); G.ui.closeAllModals(); return out; });
      // it climbs from 1.5 towards its height
      if (h.flying !== 257 || !(h.h > 1.55)) throw new Error(JSON.stringify(h));
      return h;
    });
    await step('treasure map: four pieces, then dig up the great treasure', async () => {
      const r = await g(() => {
        const G = __game; G.ui.closeAllModals();
        // the four scrolls, straight from the world generator's stamps
        const found = [];
        for (const list of G.gen.stamps.values()) for (const [x, y, z, id] of list) if (id === 65) found.push([x, y, z]);
        for (const [x, y, z] of found) { G.player.pos.set(x + 0.5, y, z + 1.5); G.world.update(x, z, 40); G.treasure.collect(x, y, z); G.ui.closeAllModals(); }
        return { scrolls: found.length, pieces: G.treasure.pieces.length, complete: G.treasure.complete, arrow: G.exploreTarget };
      });
      if (r.pieces !== 4 || !r.complete || r.arrow !== 'treasure') throw new Error(JSON.stringify(r));
      await g(() => { const G = __game, t = G.gen.treasure; G.player.pos.set(t.x + 1.5, t.y + 4, t.z + 0.5); });
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      const e = await g(() => { const G = __game, t = G.gen.treasure; const was = G.world.get(t.x, t.y, t.z); G.fun.openChest(t.x, t.y, t.z); G.ui.closeAllModals(); const out = { was, great: G.stats.greatTreasure, crown: G.fun.unlocked(G.OUTFITS_FOR_TEST ?? { level: 99, unlock: { test: s => !!s.greatTreasure } }) }; G.player.pos.set(0.5, 47, 3.5); G.exploreTarget = null; return out; });
      if (e.was !== 52 || !e.great || !e.crown) throw new Error(JSON.stringify(e));
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      return { ...r, ...e };
    });
    await step('plant a mangrove seedling in shallow water', async () => {
      await g(() => { const G = __game; G.ui.closeAllModals(); const l = G.gen.landmarks.find(l => l.id === 'mangrove'); const [x, y, z] = l.at.centre; G.player.pos.set(x, y + 1, z); });
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      const r = await g(() => {
        const G = __game; const l = G.gen.landmarks.find(l => l.id === 'mangrove'); const [x, y, z] = l.at.plant;
        G.inv.add(69, 2); G.inv.sel = G.inv.slots.findIndex(s => s && s.id === 69);
        const X = Math.floor(x) + 1, Z = Math.floor(z) + 1;
        const dry = (() => { const before = G.stats.mangroves || 0; G.useBlock({ x: Math.floor(x) - 4, y: y, z: Math.floor(z), id: 20, nx: 0, ny: 1, nz: 0 }); return (G.stats.mangroves || 0) - before; })(); // on the boardwalk: refused
        G.useBlock({ x: X, y: y - 1, z: Z, id: 70, nx: 0, ny: 1, nz: 0 });
        const planted = G.world.get(X, y, Z);
        G.ui.closeAllModals(); G.inv.sel = Math.max(0, G.inv.slots.findIndex((s, i) => i < 9 && !s)); G.player.pos.set(0.5, 47, 3.5);
        return { dry, planted, mangroves: G.stats.mangroves };
      });
      if (r.dry !== 0 || r.planted !== 69 || r.mangroves !== 1) throw new Error(JSON.stringify(r));
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      return r;
    });
    await step('climb the hilltop masjid minaret', async () => {
      await g(() => { const G = __game; G.ui.closeAllModals(); const m = G.gen.landmarks.find(l => l.id === 'hill_masjid'); const s = m.spots[0]; G.player.pos.set(s.x, s.y, s.z); G.player.vel.set(0, 0, 0); });
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      await p.waitForFunction(() => (__game.stats.spots || []).includes('minaret_top') || (__game.ui.closeAllModals(), false), null, { timeout: 20000, polling: 300 });
      const r = await g(() => { const G = __game; G.ui.closeAllModals(); const out = { spot: true, y: Math.round(G.player.pos.y) }; G.player.pos.set(0.5, 47, 3.5); return out; });
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      return r;
    });
    await step('pray together: villagers wait, the prayer starts in your place, coins at the end, then shop', async () => {
      await g(() => { const G = __game; G.ui.closeAllModals(); G.player.pos.set(0.5, 46, -12.5); G.hour = G.schedule.dhuhr - 0.002; G.lastHour = G.hour; });
      await p.waitForFunction(() => !!__game.gameEvent || (__game.ui.closeAllModals(), false), null, { timeout: 30000, polling: 300 });
      const before = await g(() => ({ coins: __game.stats.coins || 0, jamaah: __game.stats.jamaah }));
      // the prayer waits for you
      await p.waitForTimeout(1000);
      if (await g(() => !!__game.jamaah)) throw new Error('started without you');
      // in your place without wudu: the wudu pop-up opens first, and the prayer waits
      await g(() => { const G = __game; G.wuduValid = false; G.ui.closeAllModals(); G.player.pos.set(0.5, 46, -18.5); G.player.vel.set(0, 0, 0); });
      await p.waitForFunction(() => !!document.querySelector('.veil.on .wudu') || (__game.ui.modals.filter(m => !m.veil.querySelector('.wudu')).forEach(m => m.close()), false), null, { timeout: 15000, polling: 200 });
      if (await g(() => !!__game.jamaah)) throw new Error('prayed without wudu');
      for (let k = 0; k < 9; k++) await g(k => document.querySelector(`.veil.on .ws[data-k="${k}"]`).click(), k);
      // wudu done: the pop-up closes by itself and the prayer starts
      await p.waitForFunction(() => !!__game.jamaah || (__game.ui.modals.filter(m => !m.veil.querySelector('.wudu')).forEach(m => m.close()), false), null, { timeout: 20000, polling: 200 });
      const hud = await g(() => document.querySelector('#jmHud').innerText);
      // the row's movement is shown as a Baby Mo picture
      await p.waitForFunction(() => /img\/poses\/s\d/.test(document.querySelector('#jmHud img.on')?.src || ''), null, { timeout: 5000 });
      // skip ahead to the salam, then it finishes by itself
      await g(() => { const j = __game.jamaah; j.i = j.plan.length - 1; j.t = 0; });
      await p.waitForFunction(() => !__game.jamaah || (__game.ui.closeAllModals(), false), null, { timeout: 30000, polling: 300 });
      const after = await g(() => ({ coins: __game.stats.coins || 0, jamaah: __game.stats.jamaah, again: !!__game.jamaah }));
      if (after.jamaah !== before.jamaah + 1 || after.coins < before.coins + 100 || after.again) throw new Error(JSON.stringify({ before, after, hud }));
      // spend some at the village shop
      await g(() => { const G = __game; G.ui.closeAllModals(); G.player.pos.set(0.5, 47, 3.5); G.deeds.maybeExtraChange = () => {}; G.ui.shop(); }); // the random extra-change test has its own check
      await p.waitForSelector('.veil.on .shopRow');
      const dates = await g(() => __game.inv.count(214));
      await g(() => document.querySelector('.veil.on [data-buy="0"]').click());
      const bought = await g(d => ({ dates: __game.inv.count(214) - d, coins: __game.stats.coins }), dates);
      await g(() => __game.ui.closeAllModals());
      if (bought.dates !== 5 || bought.coins !== after.coins - 20) throw new Error(JSON.stringify(bought));
      return { hud, coins: after.coins, shop: bought };
    });
    await step('today’s goals give coins, and finds can be sold', async () => {
      const r = await g(() => {
        const G = __game, s = G.stats; G.ui.closeAllModals();
        const d = s.daily, c0 = s.coins || 0;
        s.petted += 2; s.placed += 10; s.planted += 1; s.gave += 1; s.jamaah += 1; s.ate += 1; s.quiz += 3; s.cooked = (s.cooked || 0) + 1; s.fish = (s.fish || 0) + 1; s.letters.push(27);
        s.mined[14] = (s.mined[14] || 0) + 5; s.mined[3] = (s.mined[3] || 0) + 5;
        G.checkQuests(); G.ui.closeAllModals();
        return { goals: d.goals, done: s.daily.done.length, gained: (s.coins || 0) - c0 };
      });
      if (r.goals.length !== 3 || r.done !== 3 || r.gained < 90) throw new Error(JSON.stringify(r));
      await p.waitForFunction(() => __game.stats.daily.bonus && (__game.ui.closeAllModals(), true), null, { timeout: 10000 });
      await g(() => { const G = __game; G.ui.closeAllModals(); G.player.pos.set(0.5, 47, 3.5); G.inv.add(252, 1); G.ui.shop(); });
      // the shop waits in line behind any pop-up still queued: clear them until it shows
      await p.waitForFunction(() => !!document.querySelector('.veil.on [data-mode="sell"]') || (__game.ui.modals.filter(m => !m.veil.querySelector('.shop')).forEach(m => m.close()), false), null, { timeout: 15000, polling: 200 });
      const sold = await g(() => { const G = __game; const c0 = G.stats.coins; document.querySelector('.veil.on [data-mode="sell"]').click(); document.querySelector('.veil.on [data-sell="252"]').click(); const out = { gained: G.stats.coins - c0, pearls: G.inv.count(252) }; G.ui.closeAllModals(); return out; });
      if (sold.gained !== 40) throw new Error(JSON.stringify(sold));
      return { ...r, sold };
    });
    await step('water bottle: you and Baby Mo get thirsty, drink, and fill it at the well', async () => {
      // Baby Mo hands it over once the tutorial is done and nothing else is showing
      await g(() => { const G = __game; G.stats.tut = 99; G.ui.tutorial(null); });
      await p.waitForFunction(() => __game.inv.count(261) === 1 || (__game.ui.closeAllModals(), false), null, { timeout: 15000, polling: 300 });
      const r = await g(() => {
        const G = __game, h = G.stats.hydr; G.ui.closeAllModals();
        h.me = 100; G.thirst.update(60, true); const drained = 100 - h.me;
        h.me = 10; h.mo = 10; h.sips = 4;
        G.thirst.use(false); G.thirst.giveMo(); G.ui.closeAllModals();
        const after = { me: h.me, mo: h.mo, sips: h.sips, gave: G.stats.amal.total.water };
        G.player.pos.set(8.5, G.player.pos.y, 6.5); h.sips = 0; G.thirst.use(G.nearDrinkingWater());
        const bars = document.querySelector('#twMe').style.height;
        return { drained, after, refilled: h.sips, bars };
      });
      if (!(r.drained > 2) || r.after.me !== 50 || r.after.mo !== 50 || r.after.sips !== 2 || r.after.gave < 1 || r.refilled !== 4) throw new Error(JSON.stringify(r));
      return r;
    });
    await step('fishing practice: Baby Mo coaches each step until the first catch', async () => {
      const seen = [];
      const now = () => g(() => __game.fishCoach.step);
      const dump = () => g(() => { const G = __game, P = G.player.pos; return JSON.stringify({ step: G.fishCoach.step, fish: G.fishing.state, held: G.inv.held()?.id, pos: [P.x.toFixed(1), P.y.toFixed(1), P.z.toFixed(1)], ground: G.player.onGround, water: G.nearFishingWater(), ahead: !!G.waterAhead(), open: G.ui.isOpen(), paused: G.paused }); });
      const until = (what, fn, ms) => p.waitForFunction(fn, null, { timeout: ms, polling: 200 }).catch(async () => { throw new Error(what + ': ' + (await dump()) + ' seen ' + seen.join(',')); });
      // start in the middle of the village, away from the well (its water counts as water too)
      await g(() => { const G = __game; G.ui.closeAllModals(); G.player.pos.set(0.5, 47, 3.5); G.player.vel.set(0, 0, 0); G.inv.remove(244, 9); G.stats.fishPractice = false; G.inv.sel = 0; G.ui.fishGuide(); });
      await p.waitForSelector('.veil.on #fgPractice');
      await g(() => document.querySelector('.veil.on #fgPractice').click());
      await p.waitForFunction(() => __game.fishCoach.step === 'rod' || __game.fishCoach.step === 'water', null, { timeout: 5000 });
      seen.push(await now());
      // the rod's slot glows; tapping it moves on to the water
      const glowed = await g(() => { const b = document.querySelector('#hotbar .slot.coachHi'); if (b) b.click(); else __game.inv.sel = __game.inv.slots.findIndex(s => s && s.id === 244); return !!b || __game.fishCoach.step === 'water'; });
      if (!glowed) throw new Error('the rod’s slot did not glow');
      await p.waitForFunction(() => __game.fishCoach.step === 'water', null, { timeout: 5000 }); seen.push('water');
      // Baby Mo takes you to the beach
      await g(() => { __game.ui.closeAllModals(); __game.fishCoach.toShore(); });
      await p.waitForTimeout(900);
      await p.waitForFunction(() => __game.nearFishingWater() || (__game.world.update(__game.player.pos.x, __game.player.pos.z, 40), __game.ui.closeAllModals(), false), null, { timeout: 15000, polling: 300 }).catch(() => {});
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      await until('at the water', () => __game.fishCoach.step === 'cast' || (__game.ui.closeAllModals(), false), 15000); seen.push('cast');
      // a too-early tap: just throw again
      await g(() => { __game.ui.closeAllModals(); __game.player.pitch = -0.5; __game.fishAction(); });
      await p.waitForTimeout(900);
      await g(() => __game.fishAction());
      const early = await now();
      // throw, wait for the dip, tap
      await g(() => __game.fishAction());
      // (game time is capped per frame, so on a slow software-rendered machine 3½ game seconds can take much longer)
      await until('the bite', () => __game.fishCoach.step === 'bite' || (__game.ui.closeAllModals(), false), 45000); seen.push('bite');
      const fish = await g(() => __game.stats.fish || 0);
      await g(() => __game.fishAction());
      const r = await g(f => ({ done: __game.stats.fishPractice, caught: (__game.stats.fish || 0) - f, step: __game.fishCoach.step, coachOn: document.body.classList.contains('coach-on') }), fish);
      await g(() => { const G = __game; G.ui.closeAllModals(); G.player.pos.set(0.5, 47, 3.5); });
      if (early !== 'cast' || !r.done || r.caught !== 1 || r.coachOn) throw new Error(JSON.stringify({ seen, early, r }));
      return { seen, early, ...r };
    });
    await step('fishing pond: go there from the guide, villagers fishing, a quick bite and a catch', async () => {
      const L = await g(() => { const l = __game.gen.landmarks.find(l => l.id === 'fish_pond'); return l && { x: l.x, z: l.z, spot: l.at.spot }; });
      if (!L) throw new Error('no fishing pond in this world');
      await g(() => { const G = __game; G.ui.closeAllModals(); G.gameEvent = null; G.hour = G.schedule.dhuhr + 1; G.lastHour = G.hour; G.ui.fishGuide(); });
      await p.waitForSelector('.veil.on #fgPond');
      await g(() => document.querySelector('.veil.on #fgPond').click());
      await p.waitForFunction(L => Math.hypot(__game.player.pos.x - L.spot[0], __game.player.pos.z - L.spot[2]) < 1, L, { timeout: 8000 });
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      await p.waitForFunction(() => __game.fishers.count === 3 || (__game.ui.closeAllModals(), false), null, { timeout: 10000, polling: 300 });
      const fish0 = await g(() => __game.stats.fish || 0);
      await g(L => { const G = __game; G.ui.closeAllModals(); G.player.pos.set(...L.spot); G.player.vel.set(0, 0, 0); G.player.yaw = 0; G.player.pitch = -0.4; G.inv.sel = G.inv.slots.findIndex(s => s && s.id === 244); G.fishAction(); }, L);
      const cast = await g(() => __game.fishing.state);
      // (the pond's bite comes after 1½–4 game seconds; slow software rendering stretches that)
      await p.waitForFunction(() => __game.fishing.state === 'bite' || (__game.ui.closeAllModals(), false), null, { timeout: 45000, polling: 150 });
      await g(() => __game.fishAction());
      const r = await g(f => ({ caught: (__game.stats.fish || 0) - f, fishers: __game.fishers.count, near: __game.fishers.near(__game.player.pos) }), fish0);
      await g(() => { const G = __game; G.ui.closeAllModals(); G.player.pos.set(0.5, 47, 3.5); });
      if (cast === 'idle' || r.caught !== 1 || !r.near) throw new Error(JSON.stringify({ cast, ...r }));
      return { cast, ...r };
    });
    await step('race track: the 🏁 button, countdown, driving round the track, and leaving the race', async () => {
      const L = await g(() => { const l = __game.gen.landmarks.find(l => l.id === 'race_track'); return l && { entry: l.at.entry }; });
      if (!L) throw new Error('no race track in this world');
      // straight there from the map's fun places
      await g(() => { const G = __game; G.ui.closeAllModals(); G.ui.openBook('map'); });
      await p.waitForSelector('#vBook.on [data-go="race_track"]');
      await g(() => document.querySelector('#vBook.on [data-go="race_track"]').click());
      await p.waitForFunction(L => Math.hypot(__game.player.pos.x - L.entry[0], __game.player.pos.z - L.entry[2]) < 1, L, { timeout: 8000 });
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      await p.waitForFunction(() => !document.querySelector('#bRace').classList.contains('hidden') || (__game.ui.closeAllModals(), false), null, { timeout: 10000, polling: 300 });
      await g(() => document.querySelector('#bRace').click());
      await p.waitForFunction(() => __game.race.phase === 'go' || (__game.ui.closeAllModals(), false), null, { timeout: 30000, polling: 200 });
      // after GO the kart drives by itself: it gets round the track
      await p.waitForFunction(() => __game.race.total > 25 || (__game.ui.closeAllModals(), false), null, { timeout: 45000, polling: 300 });
      const mid = await g(() => ({ karts: __game.race.karts.length, hud: document.querySelector('#raceHud').innerText.replace(/\s+/g, ' '), moSeat: !!__game.ents.mo.seat }));
      await g(() => document.querySelector('#raceX').click());
      const after = await g(() => ({ active: __game.race.active, karts: __game.race.karts.length, moSeat: !!__game.ents.mo.seat, hud: document.querySelector('#raceHud').classList.contains('hidden') }));
      await g(() => { const G = __game; G.ui.closeAllModals(); G.player.pos.set(0.5, 47, 3.5); });
      if (mid.karts !== 6 || !mid.moSeat || !/Lap|Putaran/.test(mid.hud) || after.active || after.karts || after.moSeat || !after.hud) throw new Error(JSON.stringify({ mid, after }));
      return { mid, after };
    });
    await step('waterfall camp: go there from the map, the campfire grills like a furnace, a stream to fish in', async () => {
      const L = await g(() => { const l = __game.gen.landmarks.find(l => l.id === 'camp'); return l && { entry: l.at.entry, fire: l.at.fire, stream: l.at.stream }; });
      if (!L) throw new Error('no camp in this world');
      await g(() => { const G = __game; G.ui.closeAllModals(); G.ui.openBook('map'); });
      await p.waitForSelector('#vBook.on [data-go="camp"]');
      await g(() => document.querySelector('#vBook.on [data-go="camp"]').click());
      await p.waitForFunction(L => Math.hypot(__game.player.pos.x - L.entry[0], __game.player.pos.z - L.entry[2]) < 1, L, { timeout: 8000 });
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      const r = await g(L => {
        const G = __game, f = L.fire.map(Math.floor), s = L.stream.map(Math.floor);
        G.player.pos.set(L.fire[0] + 2, L.fire[1], L.fire[2] + 1.5);
        return { fire: G.world.get(f[0], f[1], f[2]), stream: G.world.get(s[0], s[1], s[2]), grill: G.stations().has('furnace') };
      }, L);
      // tapping the fire opens cooking
      await g(L => { const G = __game, f = L.fire.map(Math.floor); G.ui.closeAllModals(); G.useBlock({ x: f[0], y: f[1], z: f[2], id: 74, nx: 0, ny: 1, nz: 0 }); }, L);
      const craft = await g(() => document.querySelector('#vBook')?.classList.contains('on') && __game.ui.tab === 'craft');
      await g(() => { const G = __game; G.ui.closeBook(); G.ui.closeAllModals(); G.player.pos.set(0.5, 47, 3.5); });
      if (r.fire !== 74 || r.stream !== 11 || !r.grill || !craft) throw new Error(JSON.stringify({ ...r, craft }));
      return { ...r, craft };
    });
    await step('race track: the go-karts wait on the start line, and walking to the red kart starts a race', async () => {
      const ok = await g(() => !!__game.race);
      if (!ok) throw new Error('no race track in this world');
      await g(() => { const G = __game, k = G.race.myKart(); G.ui.closeAllModals(); G.player.pos.set(k.x, k.y + 0.5, k.z - 8); G.player.vel.set(0, 0, 0); });
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      await p.waitForFunction(() => __game.race.parked.length === 6, null, { timeout: 10000, polling: 200 });
      await g(() => { const G = __game, k = G.race.myKart(); G.ui.closeAllModals(); G.player.pos.set(k.x + 0.3, k.y + 0.3, k.z); G.player.vel.set(0, 0, 0); });
      await p.waitForFunction(() => __game.race.active || (__game.ui.closeAllModals(), false), null, { timeout: 10000, polling: 200 });
      const r = await g(() => ({ active: __game.race.active, parked: __game.race.parked.length, karts: __game.race.karts.length }));
      await g(() => { const G = __game; G.race.quit(); G.ui.closeAllModals(); G.player.pos.set(0.5, 47, 3.5); });
      if (!r.active || r.parked !== 0 || r.karts !== 6) throw new Error(JSON.stringify(r));
      return r;
    });
    await step('tennis: real court; menu; a drill shot, a serve into the box, and a game that can be left', async () => {
      const ok = await g(() => !!__game.gen.landmarks.find(l => l.id === 'tennis'));
      if (!ok) throw new Error('no tennis court in this world');
      await g(() => { const G = __game; G.ui.closeAllModals(); G.ui.openBook('map'); });
      await p.waitForSelector('#vBook.on [data-go="tennis"]');
      await g(() => document.querySelector('#vBook.on [data-go="tennis"]').click());
      await p.waitForTimeout(900);
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      await p.waitForFunction(() => !document.querySelector('#bTennis').classList.contains('hidden') || (__game.ui.closeAllModals(), false), null, { timeout: 10000, polling: 300 });
      // the 🎾 button asks what to play
      await g(() => { __game.ui.closeAllModals(); document.querySelector('#bTennis').click(); });
      // the menu waits in line behind any pop-up still queued (a place just discovered nearby…): clear them until it shows
      await p.waitForFunction(() => document.querySelectorAll('.veil.on #dbtns button').length >= 3 && /tenis|tennis/i.test(document.querySelector('.veil.on .dialog')?.textContent || '') || (__game.ui.modals.filter(m => !/tenis|tennis/i.test(m.veil.textContent || '')).forEach(m => m.close()), false), null, { timeout: 30000, polling: 200 });
      const menu = await g(() => document.querySelectorAll('.veil.on #dbtns button').length);
      // drill: Baby Mo feeds, you hit it back in time
      await g(() => document.querySelector('.veil.on #dbtns button').click());
      const drill = await g(() => ({ active: __game.tennis.active, mode: __game.tennis.mode, mo: !!__game.ents.mo.stand }));
      await p.waitForFunction(() => { const T = __game.tennis; __game.ui.closeAllModals(); return T.state === 'toMe' && (1 - T.t / T.T) * T.T < 0.3; }, null, { timeout: 60000, polling: 30 });
      const hit = await g(() => { const T = __game.tennis, side = T.side; T.swing(); return { good: T.good, state: T.state, side, stroke: T.pose?.kind }; });
      // serve practice: toss, then hit near the top: it goes in
      await g(() => { const T = __game.tennis; T.quit(); __game.ui.closeAllModals(); T.start('serve'); T.swing(); });
      await p.waitForFunction(() => __game.tennis.state === 'toss' && __game.tennis.t > 0.5, null, { timeout: 20000, polling: 10 });
      const serve = await g(() => { const T = __game.tennis; T.swing(); return { state: T.state, call: document.querySelector('#raceMath').textContent, stroke: T.pose?.kind }; });
      // a game: you serve; the score shows; leave with the button
      await g(() => { const T = __game.tennis; T.quit(); __game.ui.closeAllModals(); T.start('match'); });
      const match = await g(() => ({ state: __game.tennis.state, hud: document.querySelector('#tennisT').textContent }));
      await g(() => document.querySelector('#tennisX').click());
      const after = await g(() => ({ active: __game.tennis.active, mo: !!__game.ents.mo.stand, hud: document.querySelector('#tennisHud').classList.contains('hidden') }));
      await g(() => { const G = __game; G.ui.closeAllModals(); G.player.pos.set(0.5, 47, 3.5); });
      const r = { menu, drill, hit, serve, match, after };
      if (menu < 3 || !drill.active || drill.mode !== 'drill' || !drill.mo || hit.good !== 1 || hit.state !== 'toMo' || !['fh', 'bh'].includes(hit.stroke) || serve.state !== 'toMo' || !/In|Masuk/.test(serve.call) || serve.stroke !== 'serve'
        || match.state !== 'serveReady' || !/0 – 0/.test(match.hud) || after.active || after.mo || !after.hud) throw new Error(JSON.stringify(r));
      return r;
    });
    await step('fruit orchard & English words: go there from the map, a tree says its name, pick a fruit, it is in My English Words and grows back', async () => {
      const ok = await g(() => !!__game.gen.landmarks.find(l => l.id === 'orchard'));
      if (!ok) throw new Error('no orchard in this world');
      await g(() => { const G = __game; G.ui.closeAllModals(); G.ui.openBook('map'); });
      await p.waitForSelector('#vBook.on [data-go="orchard"]');
      await g(() => document.querySelector('#vBook.on [data-go="orchard"]').click());
      await p.waitForTimeout(900);
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      // stand by the mango tree: its word card comes up
      await g(() => { const G = __game, t = G.gen.landmarks.find(l => l.id === 'orchard').at.tree_mango; G.ui.closeAllModals(); G.player.pos.set(t[0] + 0.3, t[1], t[2] + 3.2); G.player.vel.set(0, 0, 0); G.english.shownAt = -1e9; });
      await p.waitForFunction(() => document.querySelector('#wordCard .we')?.textContent === 'Mango' && !document.querySelector('#wordCard').classList.contains('hidden') || (__game.ui.closeAllModals(), __game.english.shownAt = -1e9, false), null, { timeout: 20000, polling: 300 });
      // pick an orange: you get one, its word is said, and it grows back later
      const r = await g(() => {
        const G = __game, [tx, ty, tz] = G.gen.landmarks.find(l => l.id === 'orchard').at.tree_orange.map(Math.floor);
        let f = null; for (let dx = -2; dx <= 2 && !f; dx++) for (let dz = -2; dz <= 2 && !f; dz++) for (let dy = 0; dy <= 4; dy++) if (G.world.get(tx + dx, ty + dy, tz + dz) === 77) { f = [tx + dx, ty + dy, tz + dz]; break; }
        if (!f) return { f };
        const had = G.inv.count(264); G.breakBlock(f[0], f[1], f[2], 77);
        const gone = G.world.get(...f) === 0, word = document.querySelector('#wordCard .we')?.textContent;
        G.stats.fruitPicked[G.stats.fruitPicked.length - 1][4] -= 4 * 60000; G.english.scanT = 0; G.english.update(0.1);
        return { f, got: G.inv.count(264) - had, gone, word, back: G.world.get(...f) === 77, mango: G.stats.vocab?.Mango?.n, orange: G.stats.vocab?.Orange?.n };
      });
      await p.waitForTimeout(300);
      await g(() => { __game.ui.closeAllModals(); __game.ui.openBook('letters'); });
      const book = await g(() => [...document.querySelectorAll('#vBook.on .vocab .vw')].filter(e => !e.classList.contains('off')).map(e => e.textContent).join('|'));
      await g(() => { const G = __game; G.ui.closeBook(); G.ui.closeAllModals(); G.player.pos.set(0.5, 47, 3.5); });
      if (!r.f || r.got < 1 || !r.gone || r.word !== 'Orange' || !r.back || !r.mango || !r.orange || !/Orange/.test(book)) throw new Error(JSON.stringify({ r, book }));
      return { ...r, book: book.length };
    });
    await step('English: colours, counting, wudu words, the sentence of the day, saying hello to a villager in English', async () => {
      const card = () => document.querySelector('#wordCard .we')?.textContent;
      const r = await g(() => {
        const G = __game, E = G.english; G.ui.closeAllModals();
        E.shownAt = -1e9; E.seenAt.clear(); E.placed(48); const colour = document.querySelector('#wordCard .we').textContent;
        ((G.stats.vocab ??= {}).Egg ??= { cat: 'thing', n: 1, item: 216 }); E.shownAt = -1e9; E.seenAt.clear(); G.inv.add(216, 4 - G.inv.count(216)); G.collectFx(216, 1); const count = document.querySelector('#wordCard .we').textContent;
        return { colour, count };
      });
      // wudu: each step says its body part
      await g(() => { __game.ui.closeAllModals(); __game.ui.wudu(); });
      await popup('.ws');
      const wudu = await g(() => { const b = document.querySelectorAll('.veil.on .ws'); b[0].click(); b[1].click(); return { tag: b[4].querySelector('.wen')?.textContent, hands: __game.stats.vocab.Hands?.n }; });
      // the sentence of the day: Baby Mo teaches it, "I said it!" gives coins
      await g(() => { const G = __game; G.ui.closeAllModals(); G.stats.phraseDay = ''; G.english.bornAt = -1e9; G.english.scanT = 0; G.english.update(0.1); });
      await p.waitForFunction(() => !document.querySelector('#phraseCard').classList.contains('hidden'), null, { timeout: 10000 });
      const said = await g(() => { const G = __game, c0 = G.stats.coins, open = G.ui.isOpen(); document.querySelector('#phSaid').click(); return { coins: G.stats.coins - c0, day: G.stats.phraseDay === new Date().toDateString(), blocking: open, hidden: document.querySelector('#phraseCard').classList.contains('hidden') }; });
      // hello in English from Grandpa's dialog
      await g(() => { const G = __game; G.ui.closeAllModals(); G.english.chat('Grandpa', '👴', false); });
      await p.waitForFunction(() => !!document.querySelector('.veil.on .phrase'), null, { timeout: 10000 });
      await g(() => document.querySelector('.veil.on #dbtns button').click());
      await p.waitForFunction(() => /Have a nice day/.test(document.querySelector('.veil.on .dialog')?.textContent || ''), null, { timeout: 10000 });
      const chat = await g(() => { const v = __game.stats.vocab; __game.ui.closeAllModals(); return { fine: !!v['I’m fine, thank you!'], back: !!v['Great! Have a nice day!'] }; });
      if (r.colour !== 'Blue' || r.count !== 'Four eggs!' || wudu.tag !== 'Face' || !wudu.hands || said.coins < 10 || !said.day || said.blocking || !said.hidden || !chat.fine || !chat.back) throw new Error(JSON.stringify({ r, wudu, said, chat }));
      return { ...r, wudu, said, chat };
    });
    // the places to play: go there from the map, the place's button shows, and one go works
    const goTo = async (id) => {
      await g(() => { const G = __game; G.ui.closeAllModals(); G.ui.closeBook?.(); });
      await g(id => __game.goPlace(id), id);
      await p.waitForTimeout(900);
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
    };
    const act = (id) => `__game.activities.find(a => a.id === '${id}')`;
    await step('archery: aim, shoot into the target, the points are added up; a good word shows', async () => {
      await goTo('archery');
      await p.waitForFunction(() => !document.querySelector('#bPlay').classList.contains('hidden') || (__game.ui.closeAllModals(), false), null, { timeout: 15000, polling: 300 }).catch(async e => { throw new Error('no 🏹 button: ' + await g(() => { const G = __game, P = G.player.pos, A = G.activities.find(a => a.id === 'archery'); return JSON.stringify({ pos: [P.x, P.y, P.z].map(v => v.toFixed(1)), near: A?.near(P), lane: A?.lane, playing: G.playing?.id, riding: !!G.fun.riding, race: G.race?.active, tennis: G.tennis?.active, paused: G.paused }); })); });
      const btn = await g(() => document.querySelector('#bPlay').textContent);
      await g(() => { __game.ui.closeAllModals(); __game.activities.find(a => a.id === 'archery').start(0); });
      const word = await g(() => document.querySelector('#dzikir .dsay')?.textContent);
      // shoot when the aim is near the middle
      await p.waitForFunction(() => { __game.ui.closeAllModals(); const A = __game.activities.find(a => a.id === 'archery'); if (A.state !== 'aim') return false; const lv = { sway: 0.5, speed: 1.0 }, x = lv.sway * Math.sin(A.t * lv.speed * 1.7), y = lv.sway * 0.75 * Math.sin(A.t * lv.speed * 2.3 + 0.6); if (Math.hypot(x, y) < 0.3) { A.tap(); return true; } return false; }, null, { timeout: 30000, polling: 16 });
      await p.waitForFunction(() => (__game.ui.closeAllModals(), __game.activities.find(a => a.id === 'archery').state !== 'fly'), null, { timeout: 15000 });
      const r = await g(() => { const A = __game.activities.find(a => a.id === 'archery'); const out = { points: A.points, shot: A.shot, math: document.querySelector('#raceMath').textContent }; A.quit(); return out; });
      if (!/Archery|Memanah/.test(btn) || word !== 'Bismillah!' || r.shot !== 1 || r.points < 10 || !/🎯/.test(r.math)) throw new Error(JSON.stringify({ btn, word, r }));
      return { btn, word, ...r };
    });
    await step('big race: a 🏁 join button before the set time (nothing stops the game), and villagers on the grandstand', async () => {
      await g(() => { const G = __game; G.ui.closeAllModals(); G.hour = 9.7; G.lastHour = 9.7; });
      await p.waitForFunction(() => !document.querySelector('#bRaceSoon').classList.contains('hidden'), null, { timeout: 30000, polling: 100 });
      const r = await g(() => ({ btn: document.querySelector('#bRaceSoon').textContent, open: __game.ui.isOpen(), watching: __game.race.watching }));
      // it goes away by itself once the race time has passed
      await g(() => { const G = __game; G.hour = 11.5; });
      await p.waitForFunction(() => document.querySelector('#bRaceSoon').classList.contains('hidden'), null, { timeout: 10000, polling: 100 });
      if (!/10:00/.test(r.btn) || r.open || r.watching < 8) throw new Error(JSON.stringify(r));
      return r;
    });
    await step('sports park: a basket is added up, and a penalty kick at Baby Mo in goal', async () => {
      await goTo('sports');
      await g(() => { __game.ui.closeAllModals(); __game.activities.find(a => a.id === 'basketball').start(); });
      await p.waitForFunction(() => { __game.ui.closeAllModals(); const A = __game.activities.find(a => a.id === 'basketball'); if (A.state !== 'aim') return false; const k = (A.t * 0.8) % 2, pos = k < 1 ? k : 2 - k; if (pos > A.zone[0] + 0.04 && pos < A.zone[1] - 0.04) { A.tap(); return true; } return false; }, null, { timeout: 30000, polling: 16 });
      await p.waitForFunction(() => (__game.ui.closeAllModals(), __game.activities.find(a => a.id === 'basketball').state !== 'fly'), null, { timeout: 15000 });
      const bb = await g(() => { const A = __game.activities.find(a => a.id === 'basketball'); const o = { points: A.points, shot: A.shot, math: document.querySelector('#raceMath').textContent }; A.quit(); return o; });
      await g(() => { __game.ui.closeAllModals(); __game.activities.find(a => a.id === 'soccer').start(); });
      await p.waitForTimeout(300);
      await g(() => __game.activities.find(a => a.id === 'soccer').tap());
      await p.waitForFunction(() => (__game.ui.closeAllModals(), __game.activities.find(a => a.id === 'soccer').state === 'pause'), null, { timeout: 15000 });
      const sc = await g(() => { const A = __game.activities.find(a => a.id === 'soccer'); const o = { kick: A.kick, goals: A.goals, math: document.querySelector('#raceMath').textContent }; A.quit(); return o; });
      if (bb.shot !== 1 || bb.points < 2 || !/🏀/.test(bb.math) || sc.kick !== 1 || !sc.math) throw new Error(JSON.stringify({ bb, sc }));
      return { bb, sc };
    });
    await step('horse farm: find a horse, ride the course, jump a pole', async () => {
      await goTo('horse_farm');
      await g(() => { const G = __game, H = G.activities.find(a => a.id === 'horses'), h = H.horses[0]; G.ui.closeAllModals(); G.player.pos.set(h.x + 1.2, h.obj.position.y, h.z + 1.2); });
      await p.waitForFunction(() => (__game.ui.closeAllModals(), /Ride|Tunggang/.test(document.querySelector('#bPlay').textContent) && !document.querySelector('#bPlay').classList.contains('hidden')), null, { timeout: 15000, polling: 200 });
      await g(() => document.querySelector('#bPlay').click());
      await p.waitForFunction(() => { const H = __game.activities.find(a => a.id === 'horses'), r = H.ride; __game.ui.closeAllModals(); if (!r) return false; const L = 87.7, lap = ((r.s % 1e9)); for (const hd of H.hurdles) { const per = 4 * 9 + 4 * 6 + 4 * Math.PI / 2 * 3, dd = ((hd.s - (r.s % per)) + per) % per; if (dd > 1.4 && dd < 2.8 && !r.jumpT) H.tap(); } return H.clear + H.knocked >= 2; }, null, { timeout: 60000, polling: 30 });
      const r = await g(() => { const H = __game.activities.find(a => a.id === 'horses'); const o = { clear: H.clear, knocked: H.knocked, moSeat: !!__game.ents.mo.seat }; H.quit(); return o; });
      if (r.clear < 1 || !r.moSeat) throw new Error(JSON.stringify(r));
      return r;
    });
    await step('ice rink: rent skates at the booth (the sum shows), glide, and collect a snowflake', async () => {
      await goTo('ice_rink');
      await g(() => { const G = __game; G.ui.closeAllModals(); G.stats.coins = Math.max(G.stats.coins || 0, 100); G.stats.skates = undefined; });
      await p.waitForFunction(() => !document.querySelector('#bPlay').classList.contains('hidden') || (__game.ui.closeAllModals(), false), null, { timeout: 15000, polling: 300 });
      await g(() => { __game.ui.closeAllModals(); document.querySelector('#bPlay').click(); });
      // the booth waits in line behind any pop-up still queued (a place just discovered…): clear them until it shows
      await p.waitForFunction(() => /Loket|Booth/.test(document.querySelector('.veil.on .dialog')?.textContent || '') || (__game.ui.modals.filter(m => !/Loket|Booth/.test(m.veil.textContent || '')).forEach(m => m.close()), false), null, { timeout: 30000, polling: 200 });
      const sum = await g(() => document.querySelector('.veil.on .dialog').textContent.match(/\d+ − 10 = \d+/)?.[0]);
      // (read the coins right around the tap, so a reward arriving meanwhile doesn't count)
      const paid = await g(() => { const c0 = __game.stats.coins; document.querySelector('.veil.on #dbtns button').click(); return c0 - __game.stats.coins; });
      await p.waitForFunction(() => __game.activities.find(a => a.id === 'skating').active || (__game.ui.closeAllModals(), false), null, { timeout: 5000 });
      // push forward (as if holding W / the joystick up) until you're gliding
      await p.waitForFunction(() => { __game.ui.closeAllModals(); __game.input.keys.add('KeyW'); const A = __game.activities.find(a => a.id === 'skating'); return Math.hypot(A.v.x, A.v.z) > 1.5; }, null, { timeout: 20000 }).catch(async () => { throw new Error('no glide: ' + await g(() => { const A = __game.activities.find(a => a.id === 'skating'); return JSON.stringify({ v: A.v, active: A.active, ax: __game.input.axis(), paused: __game.paused, open: __game.ui.isOpen() }); })); });
      await g(() => { __game.input.keys.delete('KeyW'); });
      await g(() => { const A = __game.activities.find(a => a.id === 'skating'), f = A.flakes.find(f => f.visible).position; A.pos.set(f.x, A.pos.y, f.z); A.v.x = 0; A.v.z = 0; });
      await p.waitForFunction(() => (__game.ui.closeAllModals(), __game.activities.find(a => a.id === 'skating').got >= 1), null, { timeout: 10000 });
      const r = await g(paid => { const A = __game.activities.find(a => a.id === 'skating'); const o = { paid, got: A.got, rented: __game.stats.skates === __game.day }; A.quit(); __game.ui.closeAllModals(); __game.player.pos.set(0.5, 47, 3.5); return o; }, paid);
      if (!sum || r.paid !== 10 || r.got < 1 || !r.rented) throw new Error(JSON.stringify({ sum, ...r }));
      return { sum, ...r };
    });
    await step('Iqro journey: after all 28 letters a lesson book appears, the compass points to it, a lesson and its quiz, then the next book', async () => {
      const keep = await g(() => __game.stats.letters.slice());
      await g(() => { const G = __game; G.ui.closeAllModals(); G.stats.letters = Array.from({ length: 28 }, (_, i) => i); G.stats.iqro = undefined; });
      await p.waitForFunction(() => !!__game.iqro.stone || (__game.ui.closeAllModals(), false), null, { timeout: 20000, polling: 200 });
      // (outside prayer time, when the compass points to the masjid first)
      const compass = await g(() => { const G = __game; G.gameEvent = null; G.exploreTarget = null; G.hour = 9; G.lastHour = 9; return G.compass()?.landmark; });
      await g(() => { const G = __game, s = G.iqro.stone; G.player.pos.set(s[0] + 3, s[1], s[2]); });
      await p.waitForTimeout(400);
      await g(() => { const G = __game, s = G.iqro.stone; G.ui.closeAllModals(); G.player.pos.set(s[0], s[1], s[2]); });
      await p.waitForFunction(() => !!document.querySelector('.veil.on .iqro') || (__game.ui.modals.filter(m => !m.veil.querySelector('.iqro')).forEach(m => m.close()), false), null, { timeout: 20000, polling: 200 });
      const sylls = await g(() => document.querySelectorAll('.veil.on .iqGrid .iqS').length);
      await g(() => document.querySelector('.veil.on #iqGo').click());
      // answer the three questions (try each choice until the right one)
      for (let q = 0; q < 3; q++) {
        await popup('.iqO');
        await g(() => new Promise(done => { const tryNext = i => { const b = document.querySelectorAll('.veil.on .iqO')[i]; if (!b) return done(0); b.click(); setTimeout(() => (document.querySelector('.veil.on .iqO.ok') ? done(1) : tryNext(i + 1)), 80); }; tryNext(0); }));
        await p.waitForTimeout(900);
      }
      await popup('#iqDone');
      const c0 = await g(() => __game.stats.coins);
      await g(() => document.querySelector('.veil.on #iqDone').click());
      const r = await g(c0 => ({ step: __game.iqro.step, gained: __game.stats.coins - c0, stone: __game.stats.iqro.stone }), c0);
      await p.waitForFunction(() => !!__game.iqro.stone, null, { timeout: 20000 });
      await g(() => { __game.ui.closeAllModals(); __game.ui.openBook('letters'); });
      const path = await g(() => document.querySelectorAll('#vBook .iqStage').length);
      await g(keep => { const G = __game; G.ui.closeBook(); G.ui.closeAllModals(); G.stats.letters = keep; G.player.pos.set(0.5, 47, 3.5); }, keep);
      if (compass !== '📖' || sylls !== 7 || r.step !== 1 || r.gained < 15 || path !== 5) throw new Error(JSON.stringify({ compass, sylls, ...r, path }));
      return { compass, sylls, ...r, path };
    });
    await step('Iqro in the game: Dad’s exam and certificate, the imam reads a surah you learned, the three Quls at bedtime', async () => {
      const all = await g(() => ({ keep: __game.stats.letters.slice(), iq: __game.stats.iqro }));
      await g(() => { const G = __game; G.ui.closeAllModals(); G.stats.letters = Array.from({ length: 28 }, (_, i) => i); G.stats.iqro = { n: 12, stars: { 29: 3, 31: 2, 32: 3 } }; const e = G.inv.slots.findIndex(s => !s); if (e >= 0) G.inv.sel = e; });
      const dad = await g(() => { const G = __game, n = G.ents.npcs.find(n => n.id === 'ustadz'); G.talkNpc(n); return [...document.querySelectorAll('.veil.on #dbtns button')].map(b => b.textContent).join(' | '); });
      const log = [];
      // Dad's exam button is there; take the exam (once more if a question went wrong, as a child could)
      for (let attempt = 0; attempt < 2 && !(await g(() => __game.stats.iqro?.exams?.includes(2))); attempt++) {
        await g(() => { __game.ui.closeAllModals(); window.__said = ''; __game.iqroExam(2); });
        for (let q = 0; q < 5; q++) {
          await p.waitForFunction(() => !!document.querySelector('.veil.on .iqO') || (__game.ui.modals.filter(m => !m.veil.querySelector('.iqro')).forEach(m => m.close()), false), null, { timeout: 30000, polling: 200 })
            .catch(async () => { throw new Error('no exam question ' + q + ': ' + JSON.stringify({ dad, log, modals: await g(() => __game.ui.modals.map(m => m.veil.textContent.slice(0, 80))) })); });
          // (pick the one that was just read out, first time)
          await p.waitForFunction(() => !!window.__said && [...document.querySelectorAll('.veil.on .iqO')].some(b => b.dataset.ar === window.__said), null, { timeout: 10000, polling: 100 });
          log.push(await g(() => { const bs = [...document.querySelectorAll('.veil.on .iqO')], said = window.__said; bs.find(b => b.dataset.ar === said).click(); window.__said = ''; return said + ':' + bs.map(b => b.dataset.ar).join(',') + ':' + !!document.querySelector('.veil.on .iqO.ok'); }));
          await p.waitForTimeout(900);
        }
        await p.waitForFunction(() => !document.querySelector('.veil.on .iqO'), null, { timeout: 10000 }).catch(() => {});
        log.push('exams:' + JSON.stringify(await g(() => __game.stats.iqro?.exams)));
      }
      await p.waitForFunction(() => !!document.querySelector('.veil.on .cert') || (__game.ui.modals.filter(m => !m.veil.querySelector('.cert')).forEach(m => m.close()), false), null, { timeout: 30000, polling: 200 })
        .catch(async () => { throw new Error('no certificate: ' + JSON.stringify(log) + await g(() => JSON.stringify({ exams: __game.stats.iqro?.exams, modals: __game.ui.modals.map(m => m.veil.textContent.slice(0, 80)) }))); });
      const exam = await g(() => ({ exams: __game.stats.iqro.exams, cert: !!document.querySelector('.veil.on .cert') }));
      await g(() => document.querySelector('.veil.on #cOk').click());
      const imam = await g(() => { const G = __game; G.ui.closeAllModals(); G.jamaah = { step: { pose: 'qiyam', name: ['Berdiri', 'Standing'], rakaat: 1 }, total: 4 }; const r = G.imamReads(); G.jamaah = null; return r; });
      const bed = await g(() => { const G = __game; G.ui.closeAllModals(); G.hour = G.schedule.isha + 0.5; G.sleep(); return document.querySelector('.veil.on #dbtns button')?.textContent; });
      // (open the Quls without going to sleep afterwards, so the night doesn't pass under the next steps)
      const quls = await g(() => { const G = __game; G.ui.closeAllModals(); G.ui.reciteSurahs(G.iqroQuls(), 'test'); return document.querySelectorAll('.veil.on .ayah').length; });
      await g(a => { const G = __game; G.ui.closeAllModals(); G.hour = 9; G.lastHour = 9; G.stats.letters = a.keep; G.stats.iqro = a.iq; }, all);
      if (!/Iqro/.test(dad) || !exam.cert || !exam.exams?.includes(2) || !/Al-Fatihah \+ /.test(imam || '') || !/Qul|surah|surat/i.test(bed || '') || quls !== 15) throw new Error(JSON.stringify({ dad, exam, imam, bed, quls }));
      return { dad, exam, imam, bed, quls };
    });
    await step('Grand Masjid: the 🕌 button at prayer time, go there, pray in the full men’s hall', async () => {
      const L = await g(() => { const l = __game.gen.landmarks.find(l => l.id === 'grand_masjid'); return l && { x: l.x, z: l.z, men: l.at.men }; });
      if (!L) throw new Error('no Grand Masjid in this world');
      const state = () => g(() => { const G = __game, ev = G.gameEvent, P = G.player.pos; return JSON.stringify({ ev: ev && { p: ev.p, prayed: ev.prayed }, btn: !document.querySelector('#bMasjid').classList.contains('hidden'), open: G.ui.isOpen(), book: document.querySelector('#vBook')?.classList.contains('on'), modals: G.ui.modals.length, site: G.siteAt(P)?.id, riding: !!G.fun.riding, jam: !!G.jamaah, pos: [P.x.toFixed(1), P.y.toFixed(1), P.z.toFixed(1)], row: G.sites.find(x => x.id === 'grand')?.row(false).player.toArray(), paused: G.paused, locked: G.ui.locked, speed: G.player.speed }); });
      const wait = (what, fn, arg, ms) => p.waitForFunction(fn, arg, { timeout: ms, polling: 200 }).catch(async e => { throw new Error(what + ': ' + (await state())); });
      // far from any masjid when Asr comes: the 🕌 button and the golden arrow point the way
      await g(() => { const G = __game; G.ui.closeAllModals(); G.player.pos.set(30.5, 70, 30.5); G.player.vel.set(0, 0, 0); G.gameEvent = null; G.hour = G.schedule.asr - 0.002; G.lastHour = G.hour; });
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      await wait('🕌 button', () => !document.querySelector('#bMasjid').classList.contains('hidden') || (__game.ui.closeAllModals(), __game.ui.closeBook(), false), null, 15000);
      const arrow = await g(() => __game.compass()?.masjid === true);
      const why = await g(() => { const G = __game; return JSON.stringify({ ev: G.gameEvent, guide: !!G.masjidGuide, jam: !!G.jamaah, site: G.siteAt(G.player.pos)?.id, c: G.compass() }); });
      // tap it and choose the Grand Masjid
      await g(() => document.querySelector('#bMasjid').click());
      await wait('picker', () => !!document.querySelector('.veil.on #dbtns button') || (__game.ui.closeAllModals(), __game.ui.masjidPicker(), false), null, 15000);
      await g(() => [...document.querySelectorAll('.veil.on #dbtns button')].find(b => /Masjid Raya|Grand Masjid/.test(b.textContent)).click());
      await wait('travel', L => Math.hypot(__game.player.pos.x - L.x, __game.player.pos.z - L.z) < 25, L, 8000);
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      // into your place in the men's row: the prayer starts with a full masjid
      await g(L => { const G = __game; G.ui.closeAllModals(); G.wuduDone(); G.player.pos.set(L.men[0], L.men[1], L.men[2]); G.player.vel.set(0, 0, 0); }, L);
      // (a slow frame on a busy CI machine can drop you through the floor; step back into your place)
      await wait('prayer start', L => { const G = __game, P = G.player.pos; if (G.jamaah) return true; G.ui.closeAllModals(); if (Math.hypot(P.x - L.men[0], P.z - L.men[2]) > 0.5 || Math.abs(P.y - L.men[1]) > 0.5) { P.set(L.men[0], L.men[1], L.men[2]); G.player.vel.set(0, 0, 0); } return false; }, L, 20000);
      const mid = await g(() => ({ site: __game.jamaahSite.id, people: __game.congregation.count, jamaah: __game.stats.jamaah }));
      await g(() => { const j = __game.jamaah; j.i = j.plan.length - 1; j.t = 0; });
      await p.waitForFunction(() => !__game.jamaah || (__game.ui.closeAllModals(), false), null, { timeout: 30000, polling: 300 });
      const after = await g(() => __game.stats.jamaah);
      if (!arrow || mid.site !== 'grand' || mid.people < 15 || after !== mid.jamaah + 1) throw new Error(JSON.stringify({ arrow, why, mid, after }));
      await g(() => { const G = __game; G.ui.closeAllModals(); G.player.pos.set(0.5, 47, 3.5); });
      return { ...mid, after };
    });
    await step('Amal Book: wudu, tasbih, charity box, and a village project gets built', async () => {
      const wudu0 = await g(() => __game.stats.amal?.total.wudu || 0); // (the prayer step already made wudu once)
      await g(() => { const G = __game; G.ui.closeAllModals(); G.player.pos.set(8.5, 46, 11.5); G.useBlock({ x: 8, y: 46, z: 9, id: 4, nx: 0, ny: 0, nz: 1 }); });
      await popup('.wudu');
      for (let k = 0; k < 9; k++) await g(k => document.querySelector(`.veil.on .ws[data-k="${k}"]`).click(), k);
      if (!(await g(() => document.querySelector('.veil.on #wPic img.on')?.src || '')).includes('w10')) throw new Error('no du’a picture after wudu');
      // the picture guide for sholat: ten steps, each with a picture
      await g(() => { __game.ui.closeAllModals(); __game.ui.poseGuide('sholat'); });
      await p.waitForSelector('.veil.on .poseGuide #pgPic img.on');
      const pg = await g(() => { document.querySelector('.veil.on #pgNext').click(); return { n: document.querySelectorAll('.veil.on .pgDots button').length, at: document.querySelector('.veil.on #pgN').textContent }; });
      if (pg.n !== 10 || !pg.at.includes('2')) throw new Error(JSON.stringify(pg));
      await g(() => { __game.ui.closeAllModals(); __game.ui.tasbih(); });
      await p.waitForSelector('.veil.on #tsTap');
      for (let k = 0; k < 33; k++) await g(() => document.querySelector('.veil.on #tsTap').click());
      const r = await g(() => {
        const G = __game; G.ui.closeAllModals(); G.stats.coins = (G.stats.coins || 0) + 50;
        G.player.pos.set(3.5, 46, -10.5); G.deeds.charityBox(); document.querySelector('.veil.on #dbtns button.gold').click(); G.ui.closeAllModals();
        for (let i = 0; i < 20; i++) G.amal('animal');
        G.ui.closeAllModals();
        const t = G.stats.amal.total; return { wudu: t.wudu, dhikr: t.dhikr, sadaqah: t.sadaqah, built: G.stats.projects };
      });
      if (r.wudu !== wudu0 + 1 || r.dhikr !== 1 || r.sadaqah !== 1 || !r.built?.includes('fountain')) throw new Error(JSON.stringify(r));
      await g(() => { __game.player.pos.set(12.5, 46, -2.5); });
      await p.waitForFunction(() => (__game.stats.projectsPlaced || []).includes('fountain') || (__game.ui.closeAllModals(), false), null, { timeout: 15000, polling: 300 });
      const block = await g(() => { const G = __game; G.ui.closeAllModals(); G.player.pos.set(0.5, 47, 3.5); return G.world.get(16, 46, -3); });
      if (block !== 11) throw new Error('fountain not built: ' + block);
      return r;
    });
    await step('boat: the ⛵ button by the shore, a free boat, sailing with Baby Mo', async () => {
      // shore spots from the generator; a landmark may have changed one, so try a few
      const spots = await g(() => { const G = __game, out = []; G.ui.closeAllModals(); for (let r = 20; r < 600 && out.length < 6; r += 3) for (let a = 0; a < 6.28 && out.length < 6; a += 0.1) { const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r); const c = G.gen.column(x, z); if (c.h >= 40 && c.h <= 42 && !G.gen.landmarks.some(l => Math.hypot(l.x - x, l.z - z) < 20) && !out.some(o => Math.hypot(o[0] - x, o[1] - z) < 25)) for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) { const w1 = G.gen.column(x + dx, z + dz), w2 = G.gen.column(x + 2 * dx, z + 2 * dz); if (w1.h < 39 && w2.h < 39 && w1.snow <= 0.55 && w2.snow <= 0.55) { out.push([x, z, c.h]); break; } } } return out; });
      if (!spots.length) return { skipped: 'no shore' };
      let shown = false;
      for (const spot of spots) {
        await g(s => { const G = __game; G.ui.closeAllModals(); G.player.pos.set(s[0] + 0.5, s[2] + 1, s[1] + 0.5); G.player.vel.set(0, 0, 0); }, spot);
        for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
        shown = await p.waitForFunction(() => !document.querySelector('#bBoat').classList.contains('hidden') || (__game.ui.closeAllModals(), false), null, { timeout: 6000, polling: 300 }).then(() => true, () => false);
        if (shown) break;
      }
      if (!shown) throw new Error('the ⛵ button never showed at ' + spots.length + ' shores');
      await g(() => { const G = __game; G.inv.remove(220, G.inv.count(220)); document.querySelector('#bBoat').click(); });
      // the boat gift waits in line behind any pop-up still queued (a place just discovered nearby…): clear them until it shows
      await p.waitForFunction(() => !!document.querySelector('.veil.on #bgOk') || (__game.ui.modals.filter(m => !m.veil.querySelector('#bgOk')).forEach(m => m.close()), false), null, { timeout: 30000, polling: 200 });
      await g(() => document.querySelector('.veil.on #bgOk').click());
      await p.waitForFunction(() => __game.fun.riding?.kind === 'boat', null, { timeout: 10000 });
      const r = await g(() => ({ mo: !!__game.ents.mo.seat, gift: __game.stats.boatGift }));
      // a tap on the world (looking around) must not end the ride: only ✋ gets you off
      await g(() => { __game.input.tapAt = { x: 200, y: 200 }; });
      await p.waitForTimeout(400);
      if (!(await g(() => __game.fun.riding?.kind === 'boat'))) throw new Error('a tap on the world ended the boat ride');
      await g(() => { const G = __game; G.fun.riding.obj.position.set(G.player.pos.x, G.player.pos.y, G.player.pos.z); G.fun.dismount(); if (G.fun.riding) { G.scene.remove(G.fun.riding.obj); G.fun.riding = null; G.ents.mo.seat = null; G.inv.add(220, 1); } G.ui.closeAllModals(); G.player.pos.set(0.5, 47, 3.5); });
      for (let i = 0; i < 60; i++) { const pend = await g(() => __game.world.update(__game.player.pos.x, __game.player.pos.z, 40)); if (pend === 0) break; await p.waitForTimeout(200); }
      const back = await g(() => __game.inv.count(220));
      if (!r.mo || !r.gift || back < 1) throw new Error(JSON.stringify({ r, back }));
      return { ...r, boatInBag: back };
    });
    await step('pet an animal (repeated taps count once)', async () => {
      const r = await g(() => { const G = __game; const a = G.ents.animals.find(a => a.kind !== 'camel' && a !== G.fun.pet && !G.sanctuary.owns(a));
        if (!a) return { skipped: true };
        const s0 = G.stats.petted; for (let i = 0; i < 4; i++) G.useEntity(a); return { kind: a.kind, counted: G.stats.petted - s0 }; });
      if (!r.skipped && r.counted !== 1) throw new Error(JSON.stringify(r));
      return r;
    });
    await step('collect a hijaiyah letter', async () => {
      await p.waitForTimeout(300);
      await g(() => { const G = __game; G.ui.closeAllModals(); const s = G.gen.shrines[0]; G.collectLetter(s.letter, s.x, s.y, s.z); });
      await p.waitForSelector('#lOk', { timeout: 5000 });
      touch ? await p.tap('#lOk') : await p.click('#lOk');
      return { letters: await g(() => __game.stats.letters.length) };
    });
    await step('open every book tab', async () => {
      const tabs = ['bag', 'craft', 'build', 'wardrobe', 'map', 'letters', 'quests', 'ramadhan', 'prayer', 'settings'];
      const out = {};
      for (const t of tabs) {
        await g(t => __game.ui.openBook(t), t);
        await p.waitForTimeout(150);
        const len = await g(() => document.getElementById('book').innerText.trim().length);
        if (len < 20) throw new Error(`tab ${t} looks empty`);
        out[t] = len;
      }
      await g(() => __game.ui.closeBook());
      return out;
    });
    await step('prayer times are shown', async () => {
      await g(() => __game.ui.openBook('prayer'));
      const txt = await g(() => document.getElementById('book').innerText);
      await g(() => __game.ui.closeBook());
      const times = txt.match(/\b\d{1,2}[:.]\d{2}\b/g) || [];
      if (times.length < 5) throw new Error('found only ' + times.length + ' times');
      return { times: times.slice(0, 6).join(' ') };
    });
    await step('save and reload keeps progress', async () => {
      const before = await g(async () => { const G = __game; G.inv.add(213, 3); G.world.set(21, 60, 21, 25); await G.save(); return { seed: G.seed, crystal: G.inv.count(213), letters: G.stats.letters.length }; });
      await p.reload();
      await p.waitForSelector('#sPlay');
      touch ? await p.tap('#sPlay') : await p.click('#sPlay');
      await p.waitForFunction(() => window.__game?.running, null, { timeout: 120000 });
      const after = await g(() => { const G = __game; return { seed: G.seed, crystal: G.inv.count(213), letters: G.stats.letters.length, block: G.world.get(21, 60, 21) }; });
      if (after.seed !== before.seed || after.crystal !== before.crystal || after.letters !== before.letters || after.block !== 25) throw new Error(JSON.stringify({ before, after }));
      return after;
    });
    if (name === 'desktop') {
      const idb = (fn, arg) => p.evaluate(fn, arg);
      // raw IndexedDB helpers that run in the page, independent of the game code
      const KV = `(op, key, val) => new Promise(res => { const r = indexedDB.open('babymo-island-craft', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => { const tx = r.result.transaction('kv', op === 'get' ? 'readonly' : 'readwrite'); const st = tx.objectStore('kv');
          if (op === 'get') { const q = st.get(key); q.onsuccess = () => res(q.result); } else { op === 'put' ? st.put(val, key) : st.delete(key); tx.oncomplete = () => res(true); } }; })`;
      const kv = (op, key, val) => idb(([src, op, key, val]) => (0, eval)(src)(op, key, val), [KV, op, key, val]);
      const restart = async () => {
        await p.reload(); await p.waitForSelector('#sPlay'); await p.click('#sPlay');
        await p.waitForFunction(() => window.__game?.running, null, { timeout: 120000 });
      };
      await step('loads a V1 save (migration)', async () => {
        const v1 = { v: 1, seed: 424242, hour: 18.25, day: 4, lang: 'en',
          player: { x: 3.5, y: 46, z: -7.25, yaw: 1.2, pitch: -0.3, flying: false },
          inv: { slots: [{ id: 213, n: 3 }, null, { id: 20, n: 12 }, ...new Array(33).fill(null)], sel: 2 },
          stats: { letters: [0, 1, 3], mined: { 2: 10 }, talked: { mo: true }, stars: 40, days: [] },
          questsDone: ['hello'], claimed: [1], saplings: [], settings: { sfx: false, music: false, avatar: 'girl', mode: 'adventure', outfitV2: true, outfitV3: true } };
        await kv('put', 'meta', v1); await kv('put', 'edits', { '0,0': [0, 0] }); await kv('del', 'backup');
        await restart();
        const r = await g(() => { const G = __game; return { seed: G.seed, day: G.day, letters: G.stats.letters.length, crystal: G.inv.count(213), quests: [...G.questsDone], avatar: G.settings.avatar }; });
        if (r.seed !== 424242 || r.day !== 4 || r.letters < 3 || r.crystal !== 3 || !r.quests.includes('hello') || r.avatar !== 'girl') throw new Error(JSON.stringify(r));
        await g(() => __game.save());
        const stored = await kv('get', 'meta');
        if (stored.v !== 2 || !stored.savedAt) throw new Error('not re-saved as v2: ' + stored.v);
        const backup = await kv('get', 'backup');
        if (backup?.meta?.seed !== 424242) throw new Error('no session backup');
        return { ...r, storedVersion: stored.v };
      });
      await step('recovers from a damaged save', async () => {
        await kv('put', 'meta', { v: 2, seed: 'broken', hour: 'x' });
        await restart();
        const r = await g(() => ({ seed: __game.seed, toast: document.getElementById('toast').innerText }));
        await p.waitForTimeout(2000);
        const toast = await g(() => document.getElementById('toast').innerText);
        const broken = await kv('get', 'broken');
        if (r.seed !== 424242) throw new Error('did not recover: ' + JSON.stringify(r));
        if (broken?.meta?.seed !== 'broken') throw new Error('broken save was not kept');
        return { seed: r.seed, toast: toast.slice(0, 60) };
      });
      await step('save to file and open it again', async () => {
        const text = await g(() => __game.exportSave());
        const o = JSON.parse(text);
        if (o.format !== 'babymo-island-craft-save' || o.meta.seed !== 424242) throw new Error('bad export');
        const err = await g(() => __game.importSave('nonsense'));
        if (!err) throw new Error('accepted a bad file');
        return { bytes: text.length };
      });
    }
    await step('bedtime: evening and a sleepy Mo, sleep now, goodnight card, a grown-up adds time and Mo wakes', async () => {
      await g(() => { const G = __game; G.ui.closeAllModals(); G.settings.playLimit = 60; G.stats.play = { day: new Date().toDateString(), sec: 60 * 60 - 400 }; });
      await p.waitForFunction(() => __game.bedtime.phase === 1 && !document.querySelector('#bedHud').classList.contains('hidden') || (__game.ui.closeAllModals(), false), null, { timeout: 10000, polling: 200 });
      const coins = await g(() => __game.stats.coins || 0);
      await g(() => { __game.ui.closeAllModals(); document.querySelector('#bedNow').click(); });
      await p.waitForSelector('.veil.on #dbtns button.gold');
      await g(() => document.querySelector('.veil.on #dbtns button.gold').click());
      await p.waitForSelector('.lockScr.night', { timeout: 10000 });
      const night = await g(c => ({ mo: __game.ents.mo.sleeping, slept: __game.stats.play.slept, paused: __game.paused, coins: (__game.stats.coins || 0) - c, dua: !!document.querySelector('.lockScr .nightDua') }), coins);
      if (!night.mo || !night.slept || !night.paused || night.coins < 20 || !night.dua) throw new Error(JSON.stringify(night));
      // a grown-up adds time: Mo wakes up and the day comes back
      await g(() => document.querySelector('.lockScr #lkParent').click());
      await p.waitForSelector('.gateScr #pgIn');
      const ans = await g(() => { const t = document.querySelector('.gateScr .gateQ').innerText.match(/(\d+)\s*×\s*(\d+)/); return +t[1] * +t[2]; });
      await p.fill('.gateScr #pgIn', String(ans)); await g(() => document.querySelector('.gateScr #pgOk').click());
      await g(() => document.querySelector('.lockScr [data-add="15"]').click());
      await p.waitForTimeout(600);
      await g(() => __game.ui.closeAllModals()); // a reward pop-up from earlier play may open once the lock lifts
      await p.waitForTimeout(200);
      const woke = await g(() => ({ lock: !!document.querySelector('.lockScr'), mo: __game.ents.mo.sleeping, slept: __game.stats.play.slept, phase: __game.bedtime.phase, paused: __game.paused }));
      if (woke.lock || woke.mo || woke.slept || woke.paused || woke.phase !== 0) throw new Error(JSON.stringify(woke));
      await g(() => { __game.stats.play.sec = 0; __game.stats.play.extra = 0; });
      return { night, woke };
    });
    await step('a few seconds of play without errors', async () => { await p.waitForTimeout(3000); });
    if (errors.length) throw new Error('errors: ' + errors.slice(0, 5).join(' | '));
  } catch { failed++; }
  results.push({ profile: name, steps, errors });
  await ctx.close();
}

for (const n of profiles) await run(n);
await browser.close();
await server?.close();

for (const r of results) {
  console.log(`\n${r.profile}`);
  for (const s of r.steps) console.log(`  ${s.ok ? '✓' : '✗'} ${s.label} (${s.ms} ms)${s.info ? ' ' + JSON.stringify(s.info) : ''}`);
  for (const e of r.errors) console.log('  ! ' + e);
}
console.log(failed ? `\n${failed} profile(s) failed` : '\nall profiles passed');
process.exit(failed ? 1 : 0);
