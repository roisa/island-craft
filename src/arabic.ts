// Arabic glyphs drawn on a canvas and centred by their real ink box
// (letter + dots + harakat), so every letter sits exactly in the middle of
// its tile instead of on a shared text baseline (where ب floats high,
// د sits low and kasrah marks collide with the label below).
const cache = new Map<string, string>();
const FONT = '"Scheherazade New","Noto Naskh Arabic","Amiri","Traditional Arabic",serif';

export interface ArOpts { size: number; w: number; h: number; color?: string; pad?: number }

/** returns an <img> of `text`, ink-centred in a w×h box (CSS px) */
export function arImg(text: string, o: ArOpts, cls = '') {
  const color = o.color ?? '#12261F';
  const key = [text, o.size, o.w, o.h, color].join('|');
  let url = cache.get(key);
  if (!url) {
    const dpr = Math.min(3, Math.max(2, devicePixelRatio || 1));
    const c = document.createElement('canvas');
    c.width = Math.round(o.w * dpr); c.height = Math.round(o.h * dpr);
    const x = c.getContext('2d')!;
    x.scale(dpr, dpr);
    const pad = o.pad ?? 4;
    let size = o.size;
    x.direction = 'rtl'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    x.font = `700 ${size}px ${FONT}`;
    let m = x.measureText(text);
    let iw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight, ih = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    // only shrink when it doesn't fit, so letters keep a consistent size
    const k = Math.min(1, (o.w - pad * 2) / iw, (o.h - pad * 2) / ih);
    if (k < 1) {
      size *= k; x.font = `700 ${size}px ${FONT}`; m = x.measureText(text);
      iw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight; ih = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    }
    x.fillStyle = color;
    x.fillText(text, (o.w - iw) / 2 + m.actualBoundingBoxLeft, (o.h - ih) / 2 + m.actualBoundingBoxAscent);
    url = c.toDataURL();
    cache.set(key, url);
  }
  const alt = text.replace(/"/g, '');
  return `<img class="arimg ${cls}" src="${url}" width="${o.w}" height="${o.h}" alt="${alt}" lang="ar" draggable="false">`;
}
