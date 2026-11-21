// The unlock in the app, with a pretend App Store: a purchase that goes through after the card
// stopped waiting still opens everything; a restore that times out is told apart from "nothing bought".
import { describe, it, expect, vi } from 'vitest';

const ls = new Map<string, string>();
(globalThis as any).window = { Capacitor: { isNativePlatform: () => true } };
(globalThis as any).localStorage = { getItem: (k: string) => ls.get(k) ?? null, setItem: (k: string, v: string) => void ls.set(k, v) };

let pay: (v: { owned: boolean }) => void = () => {};
const fake = {
  product: async () => ({ price: 'Rp 49.000' }),
  buy: () => new Promise<{ owned: boolean }>(res => { pay = res; }),
  restore: () => new Promise<{ owned: boolean }>(() => {}), // never answers
  owned: async () => ({ owned: false }),
  addListener: async () => ({}),
};
vi.mock('@capacitor/core', () => ({ registerPlugin: () => fake }));

describe('store in the app', () => {
  it('a slow purchase (after the 45 s wait) still unlocks, and tells the card', async () => {
    const { store } = await import('../../src/store');
    await store.init(); // (the app connects to the App Store at start-up, before any purchase)
    vi.useFakeTimers();
    const heard: boolean[] = [];
    store.listeners.push(v => heard.push(v));
    const r = store.buy();
    await vi.advanceTimersByTimeAsync(45001);
    expect(await r).toBe('timeout');
    expect(store.full).toBe(false);
    vi.useRealTimers();
    pay({ owned: true }); // the parent finally finished Face ID
    await vi.waitFor(() => expect(store.full).toBe(true));
    expect(heard).toEqual([true]);
  });
  it('a restore that never answers says "timeout", not "nothing bought"', async () => {
    const { store } = await import('../../src/store');
    await store.init();
    vi.useFakeTimers();
    const r = store.restore();
    await vi.advanceTimersByTimeAsync(30001);
    expect(await r).toBe(false);
    expect(store.lastError).toBe('timeout');
    vi.useRealTimers();
  });
});
