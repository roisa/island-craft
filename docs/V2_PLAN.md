# Baby Mo Island Craft — Version 2 "The Living Island" plan

This is the working plan for V2. It starts from an audit of the V1 source
(commit `8ebfc83`) and splits the work into milestones that can each be
tested on their own. Each milestone lands as its own commit(s) on the
feature branch, with a `CHANGELOG.md` entry. Nothing is pushed to `main`.

## 1. Audit of V1

### Size and shape

| Area | Files | Notes |
|---|---|---|
| Game loop, systems glue | `src/main.ts` (~1140 lines) | One `Game` class owns mining, placing, NPC talk, prayer events, camera, avatar animation, saving |
| UI | `src/ui.ts` (~800), `src/style.css` | DOM overlay, modal queue, book tabs, parents panel |
| World | `src/world/*` | Seeded simplex terrain, 8 biomes, caves, ores, stamped village, 28 letter shrines, chunk mesher with AO and light |
| Characters | `src/game/blocky.ts`, `models.ts`, `entities.ts` | Rigid box rigs (root/body/head/arms/legs), animation is procedural maths in `Entity.sync` and `Game.updateAvatar` |
| Kid systems | `kid.ts`, `fun.ts`, `festive.ts`, `content.ts` | Tutorial, stars and levels, outfits, blueprints, pets, chests, boat and camel, Ramadhan village, quests, calendar, du'a, words |
| Save | `src/game/save.ts` | IndexedDB key/value: `meta` (v:1) and `edits` |

### Baseline measurements

Headless Chromium + SwiftShader (software GPU), desktop 1100×680, fresh
world, after load. The FPS is not meaningful on a software GPU; the other
numbers are.

| Metric | Value |
|---|---|
| Load to playable | 2104 ms |
| Draw calls | 1525 |
| Triangles | 31,926 |
| Geometries in memory | 347 |
| Textures | 15 |
| Chunks loaded | 69 |
| Terrain generation | 2.97 ms / chunk |
| Meshing | 2.29 ms / chunk |
| JS heap | 42.1 MB |
| `meta` save size | 1158 bytes |
| Animals spawned | 28 |
| Console errors | none |

### Findings

1. **No automated tests.** Every check so far was a hand-written Playwright
   script in a scratch folder. Nothing guards the published game.
2. **Every push to a `claude/**` branch publishes the game**, with only a
   type check and build in front of it. A logic bug reaches players.
3. **Save has no migrations and no recovery.** `meta` and `edits` are written
   in two separate transactions, so a tab closed between them leaves them out
   of step. A corrupt or partly written `meta` loses the game. Settings flags
   such as `outfitV2`/`outfitV3` are ad-hoc migrations. Safari may evict
   site storage that is not marked persistent.
4. **Draw calls are high (1525)** for a small scene. The cause is characters:
   every bevelled box is 3 meshes, and a character has 10-20 boxes. Animals
   and NPCs multiply it. This matters most on phones.
5. **Animation is procedural** (sin-wave limb swings), with no states for
   jump, fall, land, swim, chop or celebrate and no blending between them.
   It is spread over `entities.ts` and `main.ts`.
6. **Generation and meshing run on the main thread** under a per-frame
   budget. That is acceptable at the current numbers (about 5 ms per chunk)
   but causes hitches when walking fast.
7. **NPCs mostly stand still** outside prayer and picnic times; animals
   wander at random and do not react to the player.
8. **Placement has no preview**, no rotation, and blueprints only show a
   ghost.

## 2. Milestones

Each milestone ends with: the type check, unit tests and the smoke test
passing; a changelog entry; a commit; and a push to the feature branch.

| # | Milestone | What "done" means |
|---|---|---|
| M1 | **QA foundation** | `npm test` (vitest unit tests for world generation, inventory and crafting, quests, stars/levels, words, prayer times, save serialisation); `npm run smoke` (Playwright: boot, start, move, mine, place, open the book tabs, save and reload, no console errors) on desktop and phone profiles; the Pages workflow runs both and publishes only if they pass |
| M2 | **Save v2** | Versioned schema with migrations from v1; one atomic transaction for `meta` + `edits`; validation and repair of bad values; a rolling backup and automatic recovery; persistent-storage request; tests that load real v1 saves |
| M3 | **Animation system** | One animator per character with named states (idle, walk, run, jump, fall, land, swim, mine, chop, collect, build, celebrate, plus the existing prayer poses) and smooth cross-fades. Used by the player, Baby Mo, NPCs. The rigs are rigid jointed parts (no skinned mesh), driven by keyframed clips |
| M4 | **Interaction quality** | Per-material hit particles and sounds, chop vs mine motions, item pickup that flies to the player, craft and place feedback, animal reactions, cooldowns |
| M5 | **Living world** | NPC day routines (walk between home, market, masjid), idle behaviours, greetings when the player is near, animals that graze, flee gently, sleep at night; pet tricks; ambient birds, butterflies, fireflies |
| M6 | **Building** | Placement preview, rotation of directional blocks, grid snapping for blueprints, new furniture and decorations, clearer blueprint progress |
| M7 | **Exploration** | Handcrafted landmarks placed in the generated world, hidden spots, treasure trails, discoveries recorded in the map |
| M8 | **Performance** | Merge character meshes to cut draw calls, smarter chunk budget or a worker, geometry and texture disposal, reliable touch input |
| M9 | **QA pass** | The smoke suite on desktop, iPhone, iPad and Android profiles; a check that letters, quiz, word game, prayer times, Ramadhan calendar, du'a and picnic still work |

### Testing limits (stated up front)

The sandbox has only Chromium. iPhone Safari, iPad and Android are tested by
**device emulation in Chromium** (screen size, touch, user agent), not on real
devices or WebKit. Real-device checks on the published site are still needed
and are listed in the test report for each milestone.

## 3. Rules followed

- Work in small milestones and test each one.
- Do not remove working features without approval.
- No fake functionality: a feature is only listed when it works in the game.
- Old saves keep loading.
- A changelog entry for each milestone.
- Separate commits per milestone; no pushes to `main`.
- The published game is only replaced by builds that pass the tests.
