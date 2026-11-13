// A friendly "try again" screen for when the game can't start or the 3D view is lost (e.g. iOS frees
// the graphics memory while the app is in the background). Plain DOM, so it works even if the game didn't load.
import { tr } from './i18n';

let shown = false;
export function showFatal(kind: 'start' | 'gl', err?: unknown) {
  if (err) console.error('[fatal]', kind, err);
  if (shown) return; shown = true;
  const el = document.createElement('div');
  el.id = 'fatal';
  el.setAttribute('role', 'alertdialog');
  el.innerHTML = `<div class="fatalBox"><img src="img/baby-mo-pose-05.webp" alt="">
    <h2>${kind === 'gl' ? tr('Pulau sedang istirahat sebentar', 'The island took a little nap') : tr('Ups, permainan belum bisa dimulai', 'Oops, the game couldn’t start')}</h2>
    <p>${kind === 'gl' ? tr('Progresmu sudah tersimpan. Ketuk untuk lanjut bermain.', 'Your progress is saved. Tap to keep playing.') : tr('Tidak apa-apa, progresmu aman. Coba lagi ya.', 'Don’t worry, your progress is safe. Let’s try again.')}</p>
    <button class="btn big gold" id="fatalGo">${tr('Coba lagi', 'Try again')}</button></div>`;
  document.body.appendChild(el);
  el.querySelector<HTMLElement>('#fatalGo')!.onclick = () => location.reload();
}
