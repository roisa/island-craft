# BabyMo Craft

A standalone voxel-adventure app for iOS (and the web), spun out from the
Baby Mo family of apps. Two worlds, one save-free-to-explore loop: walk,
mine, build, and discover.

- **Pulau Hijaiyah** — explore a voxel island, mine blocks, build with
  Lego-style pieces, and find 28 hidden hijaiyah letters.
- **Hutan Ajaib** — a second world unlocked after finding 5 letters: a
  violet magic forest where Ibra wields a wand and defeats 8 friendly
  crystal golems (no health loss, no fail state — just a fun challenge).

Built with [Capacitor](https://capacitorjs.com/) wrapping plain HTML/JS/
Three.js game files — no build step for the web content itself.

## Project layout

```
www/                   the actual app content (served as-is, no bundler)
  index.html            world-select landing screen
  babymo-hijaiyah.html   world 1
  babymo-hutan-ajaib.html world 2
  sw.js                 offline support (service worker)
  fonts/, baby-mo-poses/ shared assets the two worlds depend on
ios/                    Capacitor-generated Xcode project
capacitor.config.json    appId id.babymo.craft, appName "BabyMo Craft"
```

## Developing

Open `www/index.html` with any static file server (e.g.
`npx serve www` or `python3 -m http.server --directory www`) to iterate
on the web content directly in a browser — no Xcode needed for that part.

## Building for iOS

Requires a Mac with Xcode installed.

```bash
npm install
npx cap sync ios      # copies www/ into ios/App/App/public
open ios/App/App.xcodeproj
```

Then in Xcode: pick a Simulator or your own device as the run target,
set Signing & Capabilities → Team (a free Apple ID works for Simulator
and your own device), and press ▶ Run.

Whenever you change anything under `www/`, re-run `npx cap sync ios`
before building again — Xcode builds from the copied `ios/App/App/public`
folder, not `www/` directly.

The app icon and launch screen currently in `ios/App/App/Assets.xcassets`
are placeholders (a simple voxel-cube mark) — swap in real art by
replacing `AppIcon.appiconset/AppIcon-512@2x.png` (1024×1024, no
transparency) and the three `Splash.imageset/splash-2732x2732*.png`
files, keeping the same filenames and pixel dimensions.
