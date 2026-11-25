// The app icon: blocky Baby Mo (art/reference/baby-mo-run.png) over "Mo Craft" on the teal sky, as the
// Baby Mo app's icons are laid out. Writes the web icons (public/img) and the iOS icon.
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
.mo { position: absolute; left: 50%; top: 5%; width: 86%; height: 63%; transform: translateX(-50%); overflow: hidden;
  -webkit-mask-image: linear-gradient(180deg, #000 78%, transparent 100%); mask-image: linear-gradient(180deg, #000 78%, transparent 100%); }
.mo img { position: absolute; width: 84%; left: 6%; top: 0; filter: drop-shadow(0 ${size * .02}px ${size * .025}px rgba(0, 60, 50, .35)); }
.t { position: absolute; left: 0; right: 0; bottom: 6%; text-align: center; font: 900 ${size * .155}px/1 N; letter-spacing: -.01em; color: #fff;
  -webkit-text-stroke: ${size * .028}px #1FC63A; paint-order: stroke fill; text-shadow: 0 ${size * .016}px 0 #F7931E, 0 ${size * .03}px ${size * .02}px rgba(0, 70, 40, .35); white-space: nowrap; }
</style></head><body><div class="bg"></div><div class="glow"></div>
<span class="spark" style="left:8%;top:62%">✦</span><span class="spark" style="right:8%;top:64%">✦</span><span class="spark" style="left:12%;top:58%;font-size:${size * .02}px">✦</span><span class="spark" style="right:13%;top:59%;font-size:${size * .02}px">✦</span>
<div class="box"><div class="mo"><img src="${mo}"></div><div class="t">Mo Craft</div></div></body></html>`;
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
