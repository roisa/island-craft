import { describe, it, expect } from 'vitest';
import { loadMeta, cleanEdits, chooseSave, SAVE_VERSION } from '../../src/game/persist';

// The exact shape the V1 game (commit 8ebfc83) wrote to IndexedDB "meta".
const v1 = () => ({
  v: 1, seed: 123456, hour: 18.25, day: 4, lang: 'id',
  player: { x: 3.5, y: 46, z: -7.25, yaw: 1.2, pitch: -0.3, flying: false },
  inv: { slots: [{ id: 213, n: 3 }, null, { id: 20, n: 12 }, ...new Array(33).fill(null)], sel: 2 },
  stats: { letters: [0, 1, 3], mined: { 3: 10 }, talked: { mo: true }, stars: 40, days: ['Sat Nov 07 2026'] },
  questsDone: ['hello', 'wood'], claimed: [1, 2],
  saplings: [{ x: 4, y: 46, z: 5, t: 30, kind: 'oak' }],
  settings: { sfx: true, music: false, avatar: 'girl', mode: 'adventure', outfitV2: true, outfitV3: true },
});

describe('loading a V1 save', () => {
  it('migrates to the current version without losing anything', () => {
    const r = loadMeta(v1());
    expect(r.from).toBe(1);
    expect(r.repaired).toEqual([]);
    const m = r.meta!;
    expect(m.v).toBe(SAVE_VERSION);
    const o = v1();
    for (const k of ['seed', 'hour', 'day', 'lang', 'player', 'inv', 'stats', 'questsDone', 'claimed', 'saplings', 'settings'] as const) expect((m as any)[k], k).toEqual((o as any)[k]);
    expect(m.savedAt).toBe(0); expect(m.saves).toBe(0);
  });
  it('treats a save without a version field as V1', () => {
    const o: any = v1(); delete o.v;
    expect(loadMeta(o).meta?.v).toBe(SAVE_VERSION);
  });
  it('loads a current-version save unchanged', () => {
    const first = loadMeta(v1()).meta!;
    const again = loadMeta(JSON.parse(JSON.stringify({ ...first, savedAt: 5, saves: 9 })));
    expect(again.meta).toEqual({ ...first, savedAt: 5, saves: 9 });
    expect(again.from).toBe(SAVE_VERSION);
  });
});

describe('repairing a damaged save', () => {
  it('fixes bad numbers and drops a broken player position', () => {
    const o: any = { ...v1(), hour: NaN, day: -2, player: { x: 'a', y: 46, z: 0 } };
    const r = loadMeta(o);
    expect(r.meta!.hour).toBe(7.5); expect(r.meta!.day).toBe(1); expect(r.meta!.player).toBeUndefined();
    expect(r.repaired).toEqual(expect.arrayContaining(['hour', 'day', 'player']));
  });
  it('cleans bad inventory slots but keeps the good ones', () => {
    const o: any = v1(); o.inv.slots[1] = { id: 'x' }; o.inv.slots[2] = { id: 20, n: -1 }; o.inv.sel = 99;
    const m = loadMeta(o).meta!;
    expect(m.inv!.slots![0]).toEqual({ id: 213, n: 3 });
    expect(m.inv!.slots![1]).toBeNull(); expect(m.inv!.slots![2]).toBeNull(); expect(m.inv!.sel).toBe(0);
  });
  it('replaces wrong-typed lists and settings', () => {
    const o: any = { ...v1(), questsDone: 'oops', claimed: [1, 'x', 3], saplings: 7, settings: null };
    const m = loadMeta(o).meta!;
    expect(m.questsDone).toEqual([]); expect(m.claimed).toEqual([1, 3]); expect(m.saplings).toEqual([]); expect(m.settings).toEqual({});
  });
  it('refuses saves it cannot use', () => {
    expect(loadMeta(undefined).meta).toBeNull(); expect(loadMeta(undefined).error).toBeUndefined();
    expect(loadMeta('garbage').error).toBeTruthy();
    expect(loadMeta({ v: 1, hour: 3 }).error).toMatch(/seed/);
    expect(loadMeta({ ...v1(), v: SAVE_VERSION + 1 }).error).toMatch(/newer/);
  });
});

describe('edits', () => {
  const CELLS = 16 * 16 * 112;
  it('keeps good pairs and drops bad ones', () => {
    const { edits, dropped } = cleanEdits({ '0,0': [5, 1, 300, 52], '-3,7': [1, 2, 3], 'bad key': [1, 1], '2,2': [CELLS, 1, 4, 999, 6, 3] }, CELLS);
    expect(edits).toEqual({ '0,0': [5, 1, 300, 52], '-3,7': [1, 2], '2,2': [6, 3] });
    expect(dropped).toBe(4);
  });
  it('treats missing edits as none', () => { expect(cleanEdits(undefined, CELLS)).toEqual({ edits: {}, dropped: 0 }); });
});

describe('choosing what to load', () => {
  const backup = { meta: { ...v1(), seed: 99 }, edits: {}, at: 1 };
  it('prefers the main save', () => { expect(chooseSave(v1(), backup)).toMatchObject({ source: 'main', meta: { seed: 123456 } }); });
  it('falls back to the backup when the main save is broken', () => {
    const r = chooseSave({ v: 2, seed: 'nope' }, backup);
    expect(r.source).toBe('backup'); expect(r.meta!.seed).toBe(99); expect(r.error).toBeTruthy();
  });
  it('does not bring the backup back for a brand-new player', () => { expect(chooseSave(undefined, backup).source).toBe('none'); });
  it('reports none when both are unusable', () => { expect(chooseSave('x', 'y').source).toBe('none'); });
});

describe('save files for parents', () => {
  const CELLS = 16 * 16 * 112;
  it('round-trips a V1 save through a file', async () => {
    const { makeExport, parseExport } = await import('../../src/game/persist');
    const r = parseExport(makeExport(v1(), { '0,0': [1, 2] }), CELLS);
    expect('error' in r).toBe(false);
    if (!('error' in r)) { expect(r.meta.seed).toBe(123456); expect(r.meta.v).toBe(SAVE_VERSION); expect(r.edits).toEqual({ '0,0': [1, 2] }); }
  });
  it('rejects files that are not saves', async () => {
    const { parseExport } = await import('../../src/game/persist');
    expect(parseExport('{}', CELLS)).toHaveProperty('error');
    expect(parseExport('not json', CELLS)).toHaveProperty('error');
    expect(parseExport(JSON.stringify({ format: 'babymo-island-craft-save', meta: { v: 1 } }), CELLS)).toHaveProperty('error');
  });
});
