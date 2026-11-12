# Baby Mo Island Craft on iPhone and iPad (Xcode)

The iOS app is the same game as the website, wrapped in a native app with
[Capacitor](https://capacitorjs.com). The `ios/` folder is a ready Xcode
project; you build and sign it on a Mac.

## What you need

- A **Mac** with **Xcode 16 or newer** (free from the Mac App Store).
- **Node.js 20 or newer** on the Mac (from nodejs.org).
- An **Apple ID**. That is enough to put the app on your own iPhone or iPad
  for 7 days at a time. To keep it installed, share it with TestFlight, or
  publish it on the App Store, join the **Apple Developer Program**
  (US$99 a year).

## 1. Get the project and build the game (once, and after every change)

```bash
git clone https://github.com/roisa/island-craft.git
cd island-craft
git checkout claude/determined-cerf-sqxs7i   # until it is merged
npm install
npm run ios          # builds the game and copies it into the Xcode project
npm run ios:open     # opens ios/App/App.xcodeproj in Xcode
```

`npm run ios` must be run again after any change to the game, before you
build in Xcode (it copies the new game into `ios/App/App/public`).

## 2. Run it on your iPhone or iPad

1. In Xcode, click **App** in the left list, then the **App** target, then
   **Signing & Capabilities**.
2. Tick **Automatically manage signing** and choose your **Team** (your
   Apple ID: add it in Xcode → Settings → Accounts if it isn't listed).
3. Change **Bundle Identifier** to something of your own, for example
   `com.yourname.babymo` (it must be unique). Also put the same id in
   `capacitor.config.ts` (`appId`) so they stay in step.
4. Plug in the iPhone/iPad (or pick a Simulator) in the device menu at the
   top, and press **▶ Run**.
5. The first time on a real device: on the iPhone open
   **Settings → General → VPN & Device Management**, tap your Apple ID and
   **Trust**. Also turn on **Developer Mode** if iOS asks
   (Settings → Privacy & Security → Developer Mode).

## 3. Share with family (TestFlight) or publish (App Store)

1. Xcode: choose **Any iOS Device (arm64)** as the destination, then
   **Product → Archive**.
2. In the Organizer window: **Distribute App → App Store Connect → Upload**.
3. In [App Store Connect](https://appstoreconnect.apple.com) create the app
   (same Bundle ID), add testers under **TestFlight**, or fill in the store
   page and **Submit for Review**.

For the store page you will need: screenshots (6.7" iPhone and 13" iPad),
a description, a privacy policy URL (a simple page saying the game collects
no personal data is enough, if that stays true), the age rating, and the
category (**Games → Family / Educational**; you can also choose the
**Kids** category: the game already has a grown-up gate for the settings).

## What is already set up

- App name on the Home Screen: **Baby Mo**; the icon and a sky-blue launch
  screen with Baby Mo.
- Full screen, no status bar; portrait and landscape; iPad full screen.
- The permission messages iOS requires (location for prayer times; camera
  and photos for matching the avatar's colours), in Indonesian and English.
- No offline service worker or “Add to Home Screen” hint inside the app, and
  no links out of the app (Apple's Kids rules).
- Saves stay on the device as on the website (IndexedDB inside the app).

## Good to know

- **The icon** (Baby Mo with “Mo Craft”) is made at 1024×1024 from the
  full-size Baby Mo logo: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
  (no transparency). The website icons and the launch screen use the same art.
- **Recitation and letter sounds**: the app uses the device voice. Recorded
  files can be added in `public/audio/` (see the CHANGELOG) and are
  included in the app at the next `npm run ios`.
- **Photo** (Settings) and **Save to a file** (parent area) open the iOS share
  sheet in the app, so you can save to Photos or Files or AirDrop them. Building,
  letters, quests and rewards give a gentle tap (haptics).
- If Xcode shows a package error, use **File → Packages → Reset Package
  Caches**, then build again.
