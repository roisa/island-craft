// Playing full screen: on iPhone/iPad the game is added to the Home Screen
// (Safari: Share → Add to Home Screen) and then opens with no browser bars.
// Android Chrome can install it with one tap; other browsers get the
// Fullscreen button. Also registers the offline helper (sw.js) in builds.

let deferred: any = null; // Android/desktop Chrome's install prompt, kept for our own button
addEventListener('beforeinstallprompt', (e: Event) => { e.preventDefault(); deferred = e; onChange?.(); });
addEventListener('appinstalled', () => { deferred = null; onChange?.(); });
let onChange: (() => void) | null = null;
export const onInstallChange = (f: () => void) => { onChange = f; };

/** already running as an installed app (Home Screen / full screen)? */
export const isInstalled = () =>
  (navigator as any).standalone === true || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches;
/** iPhone or iPad (iPadOS reports itself as a Mac with touch) */
export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const canPrompt = () => !!deferred;
export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const r = await deferred.userChoice.catch(() => null);
  deferred = null; onChange?.();
  return r?.outcome === 'accepted';
}
export const canFullscreen = () => !!document.fullscreenEnabled && !isIOS();
export function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.({ navigationUI: 'hide' } as FullscreenOptions).catch(() => {});
}
/** the hint can be closed for good */
export const hintDismissed = () => { try { return localStorage.getItem('bm_install_hint') === 'no'; } catch { return false; } };
export const dismissHint = () => { try { localStorage.setItem('bm_install_hint', 'no'); } catch { /* private mode */ } };

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
