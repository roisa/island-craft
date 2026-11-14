// The unlock on the website: the family code flag is read once, and there is nothing to buy.
import { describe, it, expect, beforeEach } from 'vitest';

const ls = new Map<string, string>();
(globalThis as any).window = {};
(globalThis as any).localStorage = { getItem: (k: string) => ls.get(k) ?? null, setItem: (k: string, v: string) => void ls.set(k, v) };

describe('store on the website', () => {
  beforeEach(() => ls.clear());
  it('starts locked, and init can be called many times (it runs once)', async () => {
    const { store } = await import('../../src/store');
    const a = store.init(), b = store.init();
    expect(a).toBe(b);
    await a;
    expect(store.full).toBe(false);
    expect(store.canBuy()).toBe(false);
    expect(await store.buy()).toBe('error');
    await store.recheck(); // no App Store on the web: nothing changes
    expect(store.full).toBe(false);
  });
  it('a wrong family code does not unlock', async () => {
    const { store } = await import('../../src/store');
    expect(await store.redeem('MO-0000-0000')).toBe(false);
    expect(ls.get('mocraft-family')).toBeUndefined();
  });
});
