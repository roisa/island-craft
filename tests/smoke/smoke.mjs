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
    await step('pet an animal (repeated taps count once)', async () => {
      const r = await g(() => { const G = __game; const a = G.ents.animals.find(a => a.kind !== 'camel' && a !== G.fun.pet);
        if (!a) return { skipped: true };
        const s0 = G.stats.petted; for (let i = 0; i < 4; i++) G.useEntity(a); return { kind: a.kind, counted: G.stats.petted - s0 }; });
      if (!r.skipped && r.counted !== 1) throw new Error(JSON.stringify(r));
      return r;
    });
    await step('collect a hijaiyah letter', async () => {
      await g(() => { const G = __game; const s = G.gen.shrines[0]; G.collectLetter(s.letter, s.x, s.y, s.z); });
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
