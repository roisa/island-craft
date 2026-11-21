// Every emoji the game shows is drawn as its Fluent Emoji 3D picture (Microsoft, MIT licence;
// public/emoji/, made by scripts/emoji3d.py), so they look modern and the same on every device.
// The emoji character stays in the page (only its colour is made transparent and the picture is
// drawn behind it), so reading text aloud, copying and tests still see the real character.
import { EMOJI_3D } from './emoji-list';

const RE = /(?:[\u{1F1E6}-\u{1F1FF}]{2})|(?:[©®‼-㊙\u{1F000}-\u{1FAFF}]️?(?:‍[♀-♂⚕⚖✈❤\u{1F000}-\u{1FAFF}]️?)*)/gu;
const key = (e: string) => [...e].filter(c => c !== '️').map(c => c.codePointAt(0)!.toString(16)).join('-');
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION', 'SELECT', 'TITLE', 'CANVAS']);
const BASE = (import.meta.env?.BASE_URL ?? './') + 'emoji/';

function skip(el: Element | null) {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP.has(e.tagName) || e.namespaceURI === 'http://www.w3.org/2000/svg') return true;
    if (e.classList.contains('emo3d') || e.classList.contains('noemo') || e.getAttribute('lang') === 'ar' || e.getAttribute('dir') === 'rtl') return true;
  }
  return false;
}
function wrap(t: Text) {
  const s = t.nodeValue; if (!s || !RE.test(s)) return; RE.lastIndex = 0;
  if (skip(t.parentElement)) return;
  let last = 0, m: RegExpExecArray | null, frag: DocumentFragment | null = null;
  while ((m = RE.exec(s))) {
    const k = key(m[0]); if (!EMOJI_3D.has(k)) continue;
    frag ??= document.createDocumentFragment();
    if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
    const sp = document.createElement('span'); sp.className = 'emo3d'; sp.textContent = m[0];
    sp.style.backgroundImage = `url("${BASE}${k}.webp")`;
    frag.appendChild(sp); last = m.index + m[0].length;
  }
  RE.lastIndex = 0;
  if (!frag) return;
  if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
  t.parentNode?.replaceChild(frag, t);
}
function scan(n: Node) {
  if (n.nodeType === 3) { wrap(n as Text); return; }
  if (n.nodeType !== 1 && n.nodeType !== 11) return;
  if (n.nodeType === 1 && skip(n as Element)) return;
  const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT), list: Text[] = [];
  for (let x = w.nextNode(); x; x = w.nextNode()) list.push(x as Text);
  list.forEach(wrap);
}
/** draw emoji as 3D pictures from now on, everywhere on the page */
export function startEmoji3D() {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  scan(document.body);
  new MutationObserver(ms => {
    for (const m of ms) {
      if (m.type === 'characterData') scan(m.target);
      else m.addedNodes.forEach(scan);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true });
}
