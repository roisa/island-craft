# QA report — V2 M9

Run with `npm run build && npm run qa` (`tests/smoke/qa.mjs`) against the
production build, 7 November 2026. **90 of 90 checks passed** on five
device profiles.

## What was tested

Every learning and Ramadhan feature, and the layout at each step:

- **Layout checks**, run on every pop-up and book tab:
  - nothing makes the page scroll sideways;
  - pop-ups fit the screen, or scroll;
  - every button in a pop-up is at least 30 px in both directions;
  - every image (including the Arabic letter images) is drawn;
  - the HUD stays on screen.
- The browser console has to stay free of errors for the whole run.

| Check | desktop (1280×760) | iphone (750×342, touch) | iphone-portrait (390×664, touch) | ipad (1080×810, touch) | android (412×839, touch) |
|---|---|---|---|---|---|
| boot and start (Indonesian) | ✅ | ✅ | ✅ | ✅ | ✅ |
| tutorial: say hi with the 👋 button, then skip the rest | ✅ | ✅ | ✅ | ✅ | ✅ |
| hijaiyah letters: card, harakat sounds, gift, treasure at 4 | ✅ | ✅ | ✅ | ✅ | ✅ |
| letter quiz | ✅ | ✅ | ✅ | ✅ | ✅ |
| word builder: spell a whole word | ✅ | ✅ | ✅ | ✅ | ✅ |
| du'a card from a bookshelf | ✅ | ✅ | ✅ | ✅ | ✅ |
| every book tab fits the screen | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ramadhan calendar: open and claim day 1 | ✅ | ✅ | ✅ | ✅ | ✅ |
| prayer times: five times, and changing the method changes them | ✅ | ✅ | ✅ | ✅ | ✅ |
| prayer time in the game: villagers go to the masjid, pray together | ✅ | ✅ | ✅ | ✅ | ✅ |
| Maghrib: iftar picnic on the plaza | ✅ | ✅ | ✅ | ✅ | ✅ |
| bedug drum | ✅ | ✅ | ✅ | ✅ | ✅ |
| bedtime story | ✅ | ✅ | ✅ | ✅ | ✅ |
| water break with the "are you sure?" check | ✅ | ✅ | ✅ | ✅ | ✅ |
| parents: gate with a sum, report and settings | ✅ | ✅ | ✅ | ✅ | ✅ |
| switch language to English and back | ✅ | ✅ | ✅ | ✅ | ✅ |
| HUD fits the screen | ✅ | ✅ | ✅ | ✅ | ✅ |
| no errors in the console | ✅ | ✅ | ✅ | ✅ | ✅ |

## Problems the QA pass found and fixed

| Problem | Where | Fix |
|---|---|---|
| The "?" tiles for letters not found yet had collapsed to **14 px** tall, hard to tap | Letters tab, every profile | They keep a 58 px minimum, and the "?" has a normal line height |
| Small buttons were **29 px** tall on phones ("Back to village", "Photo", map zoom) | Settings and Map tabs, iPhone | Small buttons in pop-ups are at least 36 px; map zoom buttons 40 px |

Everything else passed, including on iPhone portrait, which no earlier test
covered.

## Limits — please read

- **Not real devices or Safari.** The iPhone, iPad and Android profiles are
  Chromium *emulating* those screens (size, pixel ratio, touch, user agent).
  The sandbox has no WebKit and no real phones. Safari-specific behaviour is
  not covered: audio unlock, speech voices, IndexedDB eviction, safe-area
  insets, and performance.
- **Software GPU.** Frame rates measured here are not representative of
  real devices.
- **Please check on real devices.** Open the live game at
  https://roisa.github.io/island-craft/ on an iPhone (Safari), an iPad and an
  Android phone. Try a letter card, the quiz, prayer times, the water break
  and the parents panel, and save, close and reopen the game.

## How to run it

```bash
npm run build
npm run qa                    # all five profiles (about 20 minutes here)
npm run qa -- iphone android  # just some of them
```

The faster `npm run smoke` (boot, move, mine, place, letters, book tabs,
save/reload, V1 save migration, furniture, pet cooldown) runs in CI before
every publish.
