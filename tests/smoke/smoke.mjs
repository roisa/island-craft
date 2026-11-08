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
      await g(() => { const G = __game; G.player.pos.set(0.5, 46, -18.5); G.player.vel.set(0, 0, 0); });
      await p.waitForFunction(() => !!__game.jamaah || (__game.ui.closeAllModals(), false), null, { timeout: 20000, polling: 200 });
      const hud = await g(() => document.querySelector('#jmHud').innerText);
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
    await step('Amal Book: wudu, tasbih, charity box, and a village project gets built', async () => {
      await g(() => { const G = __game; G.ui.closeAllModals(); G.player.pos.set(8.5, 46, 11.5); G.useBlock({ x: 8, y: 46, z: 9, id: 4, nx: 0, ny: 0, nz: 1 }); });
      await p.waitForSelector('.veil.on .wudu');
      for (let k = 0; k < 9; k++) await g(k => document.querySelector(`.veil.on .ws[data-k="${k}"]`).click(), k);
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
      if (r.wudu !== 1 || r.dhikr !== 1 || r.sadaqah !== 1 || !r.built?.includes('fountain')) throw new Error(JSON.stringify(r));
      await g(() => { __game.player.pos.set(12.5, 46, -2.5); });
      await p.waitForFunction(() => (__game.stats.projectsPlaced || []).includes('fountain') || (__game.ui.closeAllModals(), false), null, { timeout: 15000, polling: 300 });
      const block = await g(() => { const G = __game; G.ui.closeAllModals(); G.player.pos.set(0.5, 47, 3.5); return G.world.get(16, 46, -3); });
      if (block !== 11) throw new Error('fountain not built: ' + block);
      return r;
    });
    await step('boat: the ⛵ button by the shore, a free boat, sailing with Baby Mo', async () => {
      // shore spots from the generator; a landmark may have changed one, so try a few
      const spots = await g(() => { const G = __game, out = []; G.ui.closeAllModals(); for (let r = 20; r < 400 && out.length < 6; r += 3) for (let a = 0; a < 6.28 && out.length < 6; a += 0.1) { const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r); const c = G.gen.column(x, z); if (c.h >= 40 && c.h <= 42 && !G.gen.landmarks.some(l => Math.hypot(l.x - x, l.z - z) < 20) && !out.some(o => Math.hypot(o[0] - x, o[1] - z) < 25)) for (const [dx, dz] of [[3, 0], [-3, 0], [0, 3], [0, -3]]) { if (G.gen.column(x + dx, z + dz).h < 39 && G.gen.column(x + 2 * dx, z + 2 * dz).h < 39) { out.push([x, z, c.h]); break; } } } return out; });
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
      await p.waitForSelector('.veil.on #bgOk');
      await g(() => document.querySelector('.veil.on #bgOk').click());
      await p.waitForFunction(() => __game.fun.riding?.kind === 'boat', null, { timeout: 10000 });
      const r = await g(() => ({ mo: !!__game.ents.mo.seat, gift: __game.stats.boatGift }));
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
