# Changelog

All notable changes to Baby Mo Island Craft. V2 work follows the plan in
[`docs/V2_PLAN.md`](docs/V2_PLAN.md). Each entry says what was tested and how.

## V2 — The Living Island (in progress)

### Feedback batch: water break, saying hi, letter rewards, praying together

Requested after playing V2 M4.

- **Water break with proof**
  - Every 20 minutes of play (parents can set 15, 20, 30 or 45 minutes, or
    turn it off), Baby Mo brings a glass of water. The child is asked to drink
    a real glass and then tap the glass on screen.
  - An **"Are you sure you drank it?"** check comes first, with "Yes, I drank
    it!" and "Not yet, I'll go get it". Only "Yes" counts.
  - Then the glass tips and empties, three gulps play and a happy "ahh", and
    Baby Mo and the player's avatar both drink in the game world. Baby Mo
    holds a real glass that empties as he sips.
  - The reward (+3 stars) comes after the drink, so a level-up can't
    interrupt it. "Remind me in 5 minutes" is offered.
  - The daily-limit rest screen has the same drink button.
  - Glasses drunk are counted in the parents' report.
- **Saying hi to Baby Mo is easy to find**
  - A big bouncing **👋 Hi!** button floats over Baby Mo's head until you've
    greeted him once. Tapping it says hi.
  - A left click or tap-and-hold on Baby Mo or a villager now greets them
    too; before, only right-click or the Use button did.
  - The tutorial text points to the button.
  - The tutorial card has a **Skip ›** button, so no step can keep it on
    screen for the rest of the game.
- **A reward for every hijaiyah letter**
  - Each letter gives a small gift (dates, lanterns, apples, gold tiles,
    takjil…). The gift flies from the shrine into the bag and is shown on
    the letter card.
  - The card also shows the way to the next treasure chest, e.g.
    "●●●○ 1 more letter → 🗝️ treasure chest!".
  - Every 4 letters (4, 8, … 28) a **treasure chest** opens with something
    special: crystals, a stone pickaxe and torches, lanterns, a boat, an iron
    pickaxe and more. It comes with extra stars, a fanfare and confetti.
- **Praying together**
  - The jama'ah is now a proper row: Ayah Ibrahim leads in front as imam,
    with Bu Aminah, Kakek Yusuf, a place for you and **Baby Mo** behind him.
  - When you're in the masjid at prayer time, Baby Mo walks to his place and
    prays: standing, bowing, prostrating and sitting, in time with the
    villagers.
  - A **🤲 Pray together** button appears near the masjid at prayer time. It
    puts Adam or Ais next to Baby Mo, facing the qibla, and Adam or Ais copy
    the movements.
  - While praying together, the camera sits just behind the row so you see
    yourself and Baby Mo side by side. The tutorial card and crosshair hide.
    Walking away gives your own camera back.
- Tests: 3 unit tests for letter rewards; 7 animator actions including the
  new *drink*. Checked in game on the iPhone profile:
  - Hi button visible and greeting completes the tutorial step; Skip
    advances.
  - Letter 1 gave 3 dates; letter 4 opened the chest (+2 crystals).
  - Water: the "are you sure" check appears; "Not yet" counts nothing;
    "Yes" counts 1 and both Baby Mo and the player drink.
  - Praying together: button shown, camera moved, and Baby Mo, the player
    and all three villagers pray.

### M4 · Interaction quality

- **Materials** (`src/game/materials.ts`): every block now belongs to one of
  17 materials: wood, stone, ore, dirt, grass, sand, gravel, snow, ice,
  glass, leaves, plant, wool, metal, clay, water and the magic hijaiyah
  letters. The material decides the particles and the sounds.
- **Material sounds**, still synthesized with no audio files:
  - Each material has its own hit, break, place and footstep sound: a
    knock for wood, a click for stone, crunchy snow, rustling leaves,
    tinkling glass, a bell for gold and a chime for letters.
  - Footsteps follow the ground under you.
  - Pitch varies a little so repeated hits don't sound mechanical, and each
    sound has a minimum gap so many drops at once don't pile up.
- **Hit feedback:** each strike while mining plays the material's knock,
  sends a few chips flying off the face you're hitting, gives the crack box
  a small jolt and a short vibration on phones.
- **Breaking:** the block bursts into pieces in its own colours. Leaves and
  snow drift down slowly, stone drops fast, and pieces shrink away instead of
  popping out.
- **Items fly into your bag:**
  - Each drop's icon pops out of the block and arcs to the player, one after
    another for a burst.
  - The bag counter, the hotbar bounce and a rising "pop" note play on
    arrival.
  - Items are put in the bag immediately, so nothing can be lost to the
    animation.
  - This covers mining, felled trees, falling leaves, and milk, eggs and
    wool from animals.
- **Placing:** a material sound and a small dust puff around the block's base.
- **Crafting:** the result's hotbar slot bounces, the avatar does the build
  motion and sparkles appear in front of you.
- **Animal reactions:**
  - Animals notice you: a standing animal turns its head to look at you
    when you're within 5 blocks.
  - Sprinting past an animal, or breaking a block right next to it, makes
    it scurry a few blocks away with a little hop and its voice: cluck,
    baa, moo, meow.
  - Pets, ridden animals and camels don't get startled. Each animal waits
    4 seconds before it can be startled again.
  - Petted animals do a happy hop and nod.
- **Cooldowns (fixes reward spamming):**
  - Tapping the same animal again within 1.5 s shows one heart but gives no
    extra star or petting count. Before, every tap gave a star.
  - Baby Mo answers one tap at a time (0.9 s), unless you're giving him
    food.
- Light graphics mode skips the flying icons and halves particles, as before.
  Particles are capped at 400.
- Tests: 5 unit tests for materials. The smoke test checks that four quick
  pets count once. Checked in game:
  - 3 chips while hitting, a 14-piece break burst, the icon in flight with
    the bag notice shown only on arrival, and a 6-piece placement puff.
  - The egg flies from the chicken.
  - A chicken flees a sprint, and an animal is startled by a block breaking
    next to it.
  - A cow turns its head 0.89 rad toward the player.
  - All 17 material sounds and 6 animal voices play with no errors.

### M3 · Animation system

- **New animator** (`src/game/animator.ts`) for every humanoid: the player's
  avatar, Baby Mo and the villagers. It has two layers.
  - **Locomotion:** idle (breathing, looking around), walk, run (with a
    forward lean), jump, fall, land (a short crouch on landing), swim
    (breaststroke with flutter kicks), ride and fly. Every state change is
    cross-faded.
  - **Actions on top:**
    - *mine*: an overhead strike, shown while the mine button is held.
    - *chop*: a sideways swing with a body twist. It plays automatically
      when the target is a tree trunk.
    - *build*: a reach forward when a block is placed.
    - *collect*: a scoop when items are picked up away from mining, e.g.
      milk, eggs, chests and gifts.
    - *wave*: villagers waving.
    - *celebrate*: a hop with both arms up. It plays for a new letter, a
      level-up and a finished blueprint.

    Actions mask the upper body, so the character can chop while walking.
    Celebrate takes over the whole body.
- **No foot sliding:** the walk and run cycles advance with the distance
  actually travelled.
- **Smooth transitions:** a cross-fade always starts from the pose currently
  on screen, so an interrupted fade (jump straight into fall) can't snap.
  The unit tests found that snap in the first version.
- **Bending at the hip:** leaning (run, collect, swim) pivots at the hip, the
  same way the prayer poses do. The feet stay planted, and a test checks
  this.
- **Prayer poses unchanged:** villagers' jama'ah, the picnic sitting pose and
  the player praying in the masjid still override the animator, as before.
- **Honest scope:** the characters are rigid jointed blocks, not skinned
  meshes. The clips are parametric pose functions, not keyframe files.
- **Cost:** 1.6 µs per character per frame, measured in Node.
- Tests: 13 unit tests covering state transitions, a normal hop vs a real
  fall, joint continuity across every transition, distance-locked cadence,
  masks, one-shot and looping actions, and hip pivoting. The smoke test now
  checks the avatar is in the walk or run state while walking, and in the
  mine action while digging. Checked in game: walking, jumping, chopping the
  village palm, swimming in a pool, villagers praying in the masjid and
  waving.

### M2 · Save v2

- **Versioned saves with migrations** (`src/game/persist.ts`). The save is now
  version 2. Version 1 saves (and older ones with no version field) are
  migrated on load; nothing is renamed or dropped. Adding a later version
  is one migration function.
- **Repair instead of loss.** On load, bad values are fixed one field at a
  time: a broken clock, day, player position, inventory slot, quest list or
  settings object. The rest of the save is kept. Bad block-edit entries are
  dropped one by one.
- **Atomic writes.** World info (`meta`) and block edits (`edits`) are
  written in one IndexedDB transaction, so they can no longer get out of
  step if the tab closes mid-save. A failed write is retried at the next
  save tick.
- **Automatic backup and recovery.** At the start of each session the loaded
  save is copied to `backup`. If the main save can't be read, the game loads
  the backup and tells the player. The unreadable save is kept under
  `broken`, never thrown away.
- **Persistent storage.** The game asks the browser to keep its storage
  (`navigator.storage.persist()`). This lowers the risk of Safari or Chrome
  clearing it.
- **Parents panel → Saved game:**
  - *Save to a file* downloads the whole save as JSON.
  - *Open a save file* restores one, on any device.
  - *Bring back the previous world* appears after "New world" and swaps the
    old world back in, keeping the current one in its place.
- **Fixed a V1 bug:** "New world" deleted the save and reloaded, but the
  page-hide save handler could write the old world straight back. The game
  now stops before deleting.
- Tests: 15 unit tests for migration, repair, edit cleaning, backup choice and
  save files, using the exact V1 save shape. The smoke test covers save
  and reload in the browser on all four profiles.

### M1 · QA foundation

- **Unit tests** (`npm test`, vitest, `tests/unit/`):
  - World generation is deterministic per seed.
  - Every seed gets the village and all 28 letter shrines, with the first
    four in the village.
  - Only known block ids are generated.
  - Inventory stacking, removing, swapping, saving and creative mode.
  - Every recipe uses real items, and the station rules hold.
  - Quests have real rewards and progress maths.
  - Each word-game word is spelled with exactly the letters it lists.
  - The Ramadhan calendar has 30 days.
  - Du'a cards are complete.
  - Prayer times come in the right order for every city and method.
  - Hijri date and Ramadhan countdown are correct.
  - Stars and levels maths.
  - Block-edit serialisation.
- **Browser smoke test** (`npm run smoke`, `tests/smoke/smoke.mjs`). It plays
  the built game in headless Chromium on four profiles: desktop, iPhone 13,
  iPad and Pixel 7. Steps:
  1. Boot and start a world.
  2. Check touch controls appear only on touch devices.
  3. Walk with the keyboard, or with the on-screen stick by real touch events.
  4. Dig a block by holding mine.
  5. Place a block.
  6. Collect a letter.
  7. Open all ten book tabs.
  8. Check prayer times are shown.
  9. Save, reload and check the progress kept.
  10. Play a few seconds with no console errors.
- **Publishing is gated.** The GitHub Pages workflow runs the unit tests,
  the build and the smoke test before it publishes. A failing check leaves
  the live game as it was.
- The stars-and-levels maths moved from `kid.ts` to `levels.ts`, so it can be
  tested without a browser. `kid.ts` re-exports it, and behaviour is
  unchanged.
- `docs/V2_PLAN.md` holds the audit, the baseline numbers and the milestone
  plan.

## V1

The first complete game: voxel world with eight biomes, Baby Mo, Adam and
Ais, Ayah Ibrahim, 28 hijaiyah letter shrines, quests, crafting,
blueprints, pets, the Ramadhan calendar and village, prayer times, du'a,
bedtime stories, the parents panel and bilingual ID/EN. See the git
history up to commit `8ebfc83`.
