// Full BabyMo Craft: whether it's unlocked, and buying or restoring it in the
// iPhone/iPad app (our own StoreKit plugin, ios/App/App/StoreKitPlugin.swift).
// The website has no purchase: it is the free part.
import { FULL_ID, isFamilyCode } from './game/unlock';

const native = () => typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();
const KEY = 'mocraft-full';
/** the website: unlocked in this browser with the family code */
const FAMILY = 'mocraft-family';

interface StoreKitPlugin {
  product(o: { id: string }): Promise<{ price?: string }>;
  buy(o: { id: string }): Promise<{ owned: boolean; pending?: boolean; unverified?: boolean }>;
  restore(o: { id: string }): Promise<{ owned: boolean }>;
  owned(o: { id: string }): Promise<{ owned: boolean }>;
  addListener(ev: 'owned', fn: (d: { id: string; owned: boolean }) => void): Promise<unknown>;
}
let plugin: Promise<StoreKitPlugin> | null = null;
const TIMEOUT = Symbol('timeout');
/** the answer, or TIMEOUT if it doesn't come in time */
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | typeof TIMEOUT> {
  return Promise.race([p, new Promise<typeof TIMEOUT>(res => setTimeout(() => res(TIMEOUT), ms))]);
}
const kit = () => (plugin ??= import('@capacitor/core').then(({ registerPlugin }) => registerPlugin<StoreKitPlugin>('StoreKit')));

export const store = {
  /** in the app: true once bought (remembered for offline starts); on the website: always false */
  full: false,
  /** the price in the shopper's own currency (e.g. "Rp 49.000"), once the App Store answers */
  price: '' as string,
  canBuy: native,
  listeners: [] as ((full: boolean) => void)[],
  set(v: boolean) {
    if (this.full === v) return;
    this.full = v;
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* private mode */ }
    for (const f of this.listeners) f(v);
  },
  ready: null as Promise<void> | null,
  /** at start: the remembered answer first, then ask the App Store (once; later calls share it) */
  init() { return (this.ready ??= this.load()); },
  /** back in the app (e.g. a parent approved Ask to Buy meanwhile): ask the App Store again */
  async recheck() {
    if (!native()) return;
    try { this.set((await (await kit()).owned({ id: FULL_ID })).owned); } catch { /* offline: keep it */ }
  },
  async load() {
    if (!native()) { try { this.full = localStorage.getItem(FAMILY) === '1'; } catch { /* private mode */ } return; }
    try { this.full = localStorage.getItem(KEY) === '1'; } catch { /* private mode */ }
    try {
      const k = await kit();
      k.addListener('owned', d => { if (d.id === FULL_ID) this.set(d.owned); });
      this.set((await k.owned({ id: FULL_ID })).owned);
      this.price = (await k.product({ id: FULL_ID })).price || '';
    } catch { /* offline or not set up yet: keep the remembered answer */ }
  },
  /** 'owned' | 'pending' (Ask to Buy) | 'cancelled' | 'error' */
  /** what went wrong last time (for the grown-up: e.g. "Product not found") */
  lastError: '' as string,
  async buy(): Promise<'owned' | 'pending' | 'cancelled' | 'error' | 'timeout'> {
    if (!native()) return 'error';
    this.lastError = '';
    try {
      // the App Store sometimes never answers (no internet, or the purchase isn't ready in App Store Connect yet):
      // don't leave the card saying "Talking to the App Store…" for ever
      const pay = (async () => (await kit()).buy({ id: FULL_ID }))();
      const r = await withTimeout(pay, 45000);
      if (r === TIMEOUT) {
        // still waiting (a slow sign-in, adding a card, Face ID…): if it goes through later, it still opens
        pay.then(late => { if (late.owned) this.set(true); }, () => { /* gave up: nothing bought */ });
        return 'timeout';
      }
      if (r.owned) { this.set(true); return 'owned'; }
      return r.pending ? 'pending' : r.unverified ? 'error' : 'cancelled';
    } catch (e) { this.lastError = (e as Error)?.message || String(e); return 'error'; }
  },
  /** the website only: the family code opens Full BabyMo Craft in this browser */
  async redeem(code: string): Promise<boolean> {
    if (native() || !(await isFamilyCode(code))) return false;
    try { localStorage.setItem(FAMILY, '1'); } catch { /* private mode: for this visit only */ }
    this.full = true; for (const f of this.listeners) f(true);
    return true;
  },
  async restore(): Promise<boolean> {
    if (!native()) return false;
    try {
      const r = await withTimeout((async () => (await kit()).restore({ id: FULL_ID }))(), 30000);
      if (r === TIMEOUT) { this.lastError = 'timeout'; return false; }
      this.set(r.owned); return r.owned;
    } catch (e) { this.lastError = (e as Error)?.message || String(e); return false; }
  },
};
