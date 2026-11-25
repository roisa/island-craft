// The app icon: blocky Baby Mo (art/reference/baby-mo-run.png), waving as he walks, on the teal sky,
// with no text (the app's name shows under the icon anyway). Writes the web icons (public/img) and the iOS icon.
//   node tools/icon/make-icon.mjs            (needs a built dist/ for the Nunito font)
import { chromium } from 'playwright';
import fs from 'fs';
const font = fs.readdirSync('dist/assets').find(f => /^nunito-latin-900-normal-.*\.woff2$/.test(f));
if (!font) throw new Error('build first (npm run build): the Nunito font comes from dist/assets');
const b64 = f => fs.readFileSync(f).toString('base64');
const mo = 'data:image/png;base64,' + b64('art/reference/baby-mo-run.png');
const page = (size, safe) => `<!doctype html><html><head><style>
@font-face { font-family: N; src: url(data:font/woff2;base64,${b64('dist/assets/' + font)}) format('woff2'); font-weight: 900; }
html, body { margin: 0; width: ${size}px; height: ${size}px; overflow: hidden; }
.bg { position: absolute; inset: 0; background: radial-gradient(120% 80% at 50% 0%, #9BE0F4 0%, #8DD8F0 18%, #56C0B1 62%, #1FA972 100%); }
.glow { position: absolute; left: 50%; top: 40%; width: 78%; height: 62%; transform: translate(-50%, -50%); border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255,255,255,.55), rgba(255,255,255,0)); }
.spark { position: absolute; color: #fff; font: 900 ${size * .035}px N; opacity: .9; }
.box { position: absolute; inset: ${safe * size}px; }
/* Mo: his head and shoulders, waving */
.mo { position: absolute; left: 50%; top: 4%; height: 92%; transform: translateX(-50%); }
.mo img { height: 100%; width: auto; display: block; filter: drop-shadow(0 ${size * .025}px ${size * .03}px rgba(0, 60, 50, .35)); }
</style></head><body><div class="bg"></div><div class="glow"></div>
<span class="spark" style="left:9%;top:20%">✦</span><span class="spark" style="right:9%;top:30%">✦</span><span class="spark" style="left:14%;top:70%;font-size:${size * .022}px">✦</span><span class="spark" style="right:12%;top:76%;font-size:${size * .022}px">✦</span>
<div class="box"><div class="mo"><img src="${mo}"></div></div></body></html>`;
const b = await chromium.launch();
const shot = async (size, safe, out) => {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  await p.setContent(page(size, safe)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
  await p.screenshot({ path: out, type: 'png' }); await p.close(); console.log(out);
};
await shot(1024, 0, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
await shot(512, 0, 'public/img/icon-512.png');
await shot(192, 0, 'public/img/icon-192.png');
await shot(180, 0, 'public/img/icon-180.png');
// Android crops a maskable icon to a circle: keep everything inside the middle 80%
await shot(512, 0.1, 'public/img/icon-maskable-512.png');
await b.close();
