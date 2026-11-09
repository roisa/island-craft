# Changelog

All notable changes to Baby Mo Island Craft. V2 work follows the plan in
[`docs/V2_PLAN.md`](docs/V2_PLAN.md). Each entry says what was tested and how.

## V2 — The Living Island (in progress)

### The big race circuit, with coins to add up 🏎️➕

Requested by a parent: a wider, longer and more interesting circuit, with
simple maths: pick up one coin and another, and hear “now you have two”.

- **A bigger circuit** (`TRACK` is now 52 m straights, 14 m bends and
  9 m wide; a lap is about 190 m, was 141 m). It needed more room, so it
  moved to a new, roomy spot (still in the map’s fun places; every world
  has one). The old spot stays reserved, so **no other place moves** in
  existing worlds and the treasure stays where it was.
- **More interesting**: five **rainbow arches** over the back straight,
  a row of **lantern posts** round the east bend, **yellow boost pads**
  on both straights (drive over them to zoom: 1.5× speed for a moment),
  palm trees and flowers in the infield, a longer grandstand, and the
  start gantry with its lights.
- **Coins to add up**: little groups of 1–3 gold coins sit on the track
  in different lanes, so you steer to catch them (a new set each lap,
  about 11 a lap). After each group the sum shows big in gold and is
  said out loud: “🪙 3 + 2 = 5 — 3 plus 2 makes 5. Now you have 5 coins!”
  (in Indonesian: “3 tambah 2 sama dengan 5. Sekarang koinmu 5!”). The
  very first one says “One coin!”. The race bar shows 🪙 too, and the
  coins you collect are added to your prize at the finish.
- **Baby Mo’s sentence of the day** is now a small card above the hotbar
  (🔊, ⭐ I said it!, ✕) instead of a pop-up, so it never stops the game
  or hides other pop-ups (it could block a prayer gathering or the water
  break). Word cards wait while it’s showing; it goes away by itself.
- Tested:
  - Unit tests: the circuit is bigger, coin groups (1–3 coins, always on
    the track, away from the start line), the sums (“3 + 2 = 5” and the
    sentences in both languages), the boost pads; in every test world the
    circuit is built (track and boost pad) with no other place inside it.
  - In the game: the circuit, the coins, picking up 1 and then 2 coins
    shows and says “1 + 2 = 3”.
  - Smoke test on all four devices; layout checks.

### The go-karts wait on the start line 🏎️

Ibra found the race track but not the cars: the karts only appeared after
tapping 🏁 Race!.

- Now the four go-karts (your red one, Baby Mo’s green one, and the two
  racers’ blue and yellow ones) wait on the start line under the start
  lights whenever you’re at the track.
- Walk up to the red kart to get in and start a race (or tap 🏁 Race!
  as before).
- The first time you come to the track, Baby Mo says where the karts are.
- Tested: smoke test on all four devices (the karts are there, walking
  to the red kart starts the race and the parked karts make way for the
  racing ones); unit tests.

### The bedug at prayer time 🥁

Requested by a parent: the sung adhan still sounded odd, so prayer time is
now announced with the bedug, like the big drum at Indonesian masjids.

- At prayer time (and with the 🔊 try button in the grown-ups’ settings,
  now called **Bedug drum at prayer time**), the bedug is beaten in the
  traditional *tabuh bedug* way: three slow, heavy beats, a roll that
  speeds up, then three strong beats to finish (about 14 seconds). The
  toast says “🥁 Dum… dum… dum! It’s time for Asr!”.
- Each beat is made like a real bedug: a deep buffalo-hide boom that
  drops in pitch, with the overtones of a round drum head, the slap of
  the stick, the hollow wooden shell, and the echo of the masjid’s
  veranda. Its knock comes through on phone and tablet speakers too.
- The village bedug you can tap uses the same sound.
- The sung adhan is gone. The on/off setting is the same one, so a
  parent who turned it off keeps it off.
- Tested: a unit test for the beat pattern (slow, faster, strong end);
  the sound rendered to a file and checked (no clipping, the boom near
  59 Hz with its knock above it); in the game at Asr the bedug plays
  with its toast and no errors.

### The adhan: “Allāhu Akbar” four times 🕌

Requested by a parent: the adhan sound should be only “Allāhu Akbar”, four times.

- The adhan at prayer time (and the 🔊 try button in the grown-ups’ settings)
  now sings the opening of the adhan only: **Allāhu Akbar ×4**, in two
  pairs with a breath between them, the last one held a little longer
  (about 17 seconds; it was two before).
- The voice is softer and warmer (the buzzy top is filtered off).
- Tested: unit tests; in the game at Asr time the adhan plays with its
  toast and no errors.

### More English while playing: colours, numbers, wudu, weather, actions, things, Baby Mo’s sentence, greetings 🇬🇧

Requested by a parent (suggestions 1–7 and 9 from the last batch).

- **Colours**: placing coloured wool or a flower shows its colour (“Blue!
  Biru”), at most every 4 minutes per colour.
- **Numbers**: counting things as they come into your bag, from 2 to 10
  (“Three apples!”, “Four eggs!”, “Five logs!”): fruit, dates, eggs,
  fish, logs, stones and pearls. Picking fruit counts it too.
- **Wudu body parts**: each wudu step shows its English word (Hands,
  Mouth, Nose, Face, Arms, Head, Ears, Feet), and Baby Mo says it when
  you tap the step (“Hands! Wash your hands.”).
- **Weather and time of day**: the weather of the day (“It’s sunny!”,
  “It’s windy!”…), “It’s raining!” or “It’s snowing!”, and Good morning
  / afternoon / evening / night as the day goes by.
- **Action words**: Jump!, Swim!, Climb!, Ride!, Dig! when you do them
  (the first five times each, a few minutes apart).
- **English names of things**: the first time something new comes into
  your bag, a card shows its picture with its English and Indonesian
  name.
- **Baby Mo’s sentence of the day**: once a day Baby Mo teaches a short
  sentence (“I am happy.”, “Thank you!”, “Let’s go!”… 20 in all).
  🔊 Listen again; ⭐ I said it! gives 10 coins.
- **Saying hello in English**: Dad, Bu Aminah and Grandpa have a
  🇬🇧 Say hello in English button. They greet you for the time of day
  (“Good morning! How are you?”) and you pick an answer (“I’m fine,
  thank you!”, “I’m happy!”, “I’m hungry!”); they answer back.
  5 coins the first time each day with each of them.
- **My English Words** now has sections for all of these, including
  things with their pictures.
- Tested:
  - Unit tests: counting words, a body word for every wudu step, the
    colour of wool and flowers, the time-of-day greetings, the sentence
    of the day (the same all day, changes each day).
  - Smoke test on all four devices: a colour card, “Four eggs!”, the
    wudu words, the sentence of the day with its coins, and a hello in
    English with Grandpa.

### English words while playing, and the Fruit Orchard 🍎📘

Requested by a parent: more praise words so Ibra learns English while
playing, the names of animals as you pass them, and more kinds of fruit
trees that tell you their names.

- **English word cards** (new `src/game/english.ts`): a small card shows
  the English word in big letters with its Indonesian meaning, and Baby
  Mo says it in English (tap 🔊 to hear it again).
  - **Praise words** (15: Awesome!, Great job!, Well done!, Fantastic!,
    Brilliant!, Amazing!, Excellent!, Super!, Wonderful!, You did it!,
    Keep it up!, Nice work!, Perfect!, Way to go!, Good thinking!) come
    with your stars now and then (at most one every 25 seconds, never the
    same twice in a row).
  - **Animals**: walk close to a chicken, sheep, cow, camel, goat or cat
    and hear its name with a little sentence (“Cow! The cow says moo.”),
    at most every 2 minutes per animal.
  - Cards wait while a menu, a race, tennis, a prayer or the tutorial is
    on, and come at most every 6 seconds.
  - **📘 My English Words** in the Letters tab lists every word you met,
    by animals, fruits and praise; tap one to hear it.
  - Settings: **English word cards** on/off.
- **The Fruit Orchard (Kebun Buah)**, a new place 60–150 blocks from the
  village, in the map’s fun places. Eight named trees along gravel paths
  inside a low hedge: **apple, mango, orange, rambutan** (leafy trees),
  **banana, coconut** (palms), **papaya** (a thin trunk with a small
  crown) and a **watermelon** patch on the ground.
  - Stand by a tree and Baby Mo says “This is a mango tree. Mango!”.
  - Tap a fruit to pick it: you get it, its word card comes up, and it
    grows back after 3 minutes (watermelons give 3 slices).
  - New blocks and food items: mango, banana, orange, coconut, papaya,
    rambutan, watermelon slice, with their own pictures.
- Tested:
  - Unit tests: the word lists; the orchard is in every world (60/60
    seeds checked) with all eight trees carrying their fruit; the tree
    sentences.
  - Smoke test on all four devices: go to the orchard from the map, the
    mango card comes up by the mango tree, pick an orange (you get it,
    the Orange card shows, it grows back), and both words are in My
    English Words.
  - Old worlds keep all their places (the orchard is added last).

### The Tennis Court: play tennis with Baby Mo 🎾

Requested by a parent: a tennis court where Baby Mo plays tennis, and the
player tries some tennis movements too.

- **The Tennis Court (Lapangan Tenis)** is a new place 45–140 blocks from
  the village.
  - A short blue court (16 blocks, so Baby Mo and the ball are easy to
    see from your end) with white lines, and a see-through net between
    posts.
  - Green surrounds, a bench, four lantern posts and a chest.
  - It’s in the map’s fun places.
- **Tennis** (new `src/game/tennis.ts`):
  - Tap **🎾 Play tennis**. You stand at your baseline and Baby Mo at
    his, each with a racket (yours red, his green).
  - **Serve** with ✋ (or a tap on the screen). The ball flies over the
    net, bounces once on Baby Mo’s side, and he swings and sends it
    back.
  - **Hit it back:** you glide sideways to the ball by yourself, so only
    the timing matters. Tap as it reaches you. The window is kind: from
    about half a second before until a moment after. The big TAP! cue
    and the glowing ✋ show when.
  - **Swings:** both you and Baby Mo swing your racket arms.
  - **Rallies:** Baby Mo returns most balls but misses a few more in
    long rallies. The balls get a little faster as a rally goes on.
  - **Scoring:** first to 3 points. At the top: the score and the
    current rally, with **Exit**. The end card shows who won, the
    longest rally and coins (50 for a win, 20 for a good try), and
    **Play again**.
  - The discovery card reminds you that the strong believer is more
    beloved to Allah (HR. Muslim 2664): sport keeps you healthy.
- **Every world has its pond again:** the Fishing Pond was missing in
  about 1 world in 70 (hilly ones, with nothing low enough near the
  village). Places every world must have now try any free dry land a
  little further out as a last resort. This only happens where the place
  would otherwise be missing, so no place in a saved world moves.
- **Tested:**
  - Unit tests: the ball starts and ends at the rackets, bounces past
    the net and clears it; the hit window; Baby Mo’s returns; first to
    3.
  - Smoke:
    - from the map to the court;
    - the 🎾 button;
    - serve, then hitting Baby Mo’s return in the window, which starts
      a rally;
    - Exit puts the rackets away.
  - Screenshots of a rally and a point.
  - Unit tests, the smoke suite on four profiles, and the QA suite.

### The Waterfall Camp: tents and a campfire to grill on 🏕️🔥

Requested by a parent: tents and a campfire to grill fish and meat, near a
river and the waterfall.

- **The Waterfall Camp (Perkemahan Air Terjun)** is a new place, built
  right in front of the Waterfall Valley.
  - A new `near` setting tries spots around the waterfall in turn. In 56
    of 60 test worlds it’s by the waterfall; otherwise it stands on its
    own.
  - **A little stream** runs from the waterfall’s pool past the camp
    (the camp has its own if it stands alone), with a wooden footbridge.
    You can fish in it.
  - **Three tents** (red, blue and green A-frames, open at the front),
    each with a bed inside, so you can sleep there at night.
  - **A campfire** in a ring of stones, with log benches, a pile of
    firewood, lantern posts, and a chest with meat, fish and dates.
- **The campfire** (a new block):
  - It glows at night. Flames, sparks and a little smoke rise from it
    while you’re near (not on low graphics).
  - **Tap it to grill:** it opens the cooking list. It counts as a
    furnace, so grilled fish and steak can be made there with the usual
    cooking game.
  - The discovery card reminds you of the manners of eating: Bismillah
    before, Alhamdulillah after, and share.
- **Fun places in the map** now include the camp.
- **Tested:**
  - Unit tests: the camp stands in front of the waterfall in most
    worlds, with the campfire and water in the stream.
  - Smoke:
    - from the map to the camp;
    - the campfire is there and counts as a furnace;
    - the stream has water;
    - tapping the fire opens cooking.
  - Screenshots of the camp, the tents and stream from above, and the
    campfire at night.
  - Unit tests, the smoke suite on four profiles, and the QA suite.

### The Race Track: go-kart races with Baby Mo 🏎️🏁

Requested by a parent: a racing area where the player and some racers can
drive a fun lap.

- **The Race Track (Sirkuit Balap)** is a new place in every world.
  - The search starts close to the village (80 blocks) and moves out,
    since a place this big needs free room. That’s often 150–250
    blocks away.
  - So it’s one tap away: **✨ Fun places — go there** at the top of the
    map lists the Fishing Pond and the Race Track (and the Camp and
    Tennis Court when they exist). Tapping one takes you there with
    Baby Mo.
  - An oval track (two straights and two bends, 7 blocks wide) with red
    and white kerbs, a red and white tyre wall round the outside (with a
    gap to walk in), and a chequered start line under a gantry with
    start lights.
  - A four-step grandstand with blue seats, and a pit area in the
    middle with a chest.
  - It needs more room than other places, so a new `clear` setting
    keeps other places that far away. Existing places don’t move.
- **The shape** (new `src/game/track.ts`): one shared description of
  the oval for the builder and the race.
  - Each cell is track, kerb, wall or grass.
  - For any point on the track, it gives how far round the lap it is,
    and which way to drive there.
- **Racing** (new `src/game/race.ts`):
  - Tap **🏁 Race!** at the track. Four karts line up behind the start
    line: you (red) and Baby Mo (green) in front, Kak Dina (blue) and
    Bang Rizal (yellow) behind. Then a big 3 · 2 · 1 · GO!
  - Easy to drive: after GO your kart goes by itself, you only steer
    (pull the joystick back to brake). A gentle helper keeps you
    pointing along the track, and you slow down on the grass. The tyre
    wall bounces you back.
  - The others follow the racing line. Anyone far ahead eases off and
    anyone far behind speeds up, so the race stays close.
  - Two laps. At the top: the lap, your place, and the time. **Exit**
    (or ✋) leaves at any time.
  - At the finish: your place and time, your best time, coins (100 /
    60 / 40 / 30), confetti and a cheering Baby Mo. A message about good
    sportsmanship, and **Race again**.
- **Tested:**
  - Unit tests for the track shape: every point on the line and the
    lanes is on the track, the distance round the lap matches the
    point, headings point forward, and the finishing order.
  - A browser check: steering, the countdown, and a whole race to the
    finish.
  - Smoke: the 🏁 button, the countdown, the kart getting round the
    track, then Exit, which removes the karts and frees Baby Mo.
  - Unit tests, the smoke suite on four profiles, and the QA suite.

### Thirst comes much less often 💧

Requested by a parent: the thirsty reminder came too often; about every
20 real minutes is enough.

- **You and Baby Mo get thirsty after about 20 real minutes of busy
  play** (walking, digging, building, swimming), and after about an hour
  of quiet play. Before, it was about 7½ minutes.
- **Baby Mo asks for a drink once** when he gets thirsty, then at most
  every 10 minutes if he’s still thirsty. Before, he asked every 90
  seconds.
- A drink still works the same (a sip brings back 40%), and the gentle
  slow-down only starts when you’re actually thirsty.
- The separate real-life water break (a parent setting, every 20
  minutes by default) is unchanged.
- **Tested:**
  - Unit tests: not thirsty at 19 minutes, thirsty at 20; resting is
    slower; Mo waits at least 10 minutes between asks.
  - The smoke suite on four profiles, and the QA suite.

### The Fishing Pond, near the village 🎣🏞️

Requested by a parent: a pond close to the masjid where villagers also
fish, so fishing is easy for Ibra.

- **The Fishing Pond (Kolam Pancing)** is a new place in every world,
  just past the village’s edge, 42–72 blocks from the middle. The search
  starts on the masjid’s side, north of the village, and only goes
  round to another side if nothing fits there. It’s added last, so
  existing worlds keep their other places and gain the pond.
  - An oval pond two blocks deep, with a sandy rim and reeds and
    flowers.
  - A wooden pier out to the middle, with lanterns where it meets the
    bank.
  - A shady hut with a chest (a fishing rod and two fish), a bench, and
    lantern posts all round for the evening.
- **Villagers fishing** (new `src/game/fishers.ts`):
  - Pak Harun and Raka sit on the pier and Bu Salma on the bank, each
    with a bamboo rod, a line and a red float on the water.
  - Every 9–21 seconds a float dips, someone lifts a fish with a splash
    and says “🐟 Alhamdulillah!”.
  - When you come by, one of them shares a tip, such as “Throw, wait,
    then tap when the float dips”.
  - They’re there in the daytime, and go to the masjid at prayer time
    like everyone else.
- **Easier fishing at the pond:**
  - Fish bite after 1½–4 seconds (instead of the usual wait), and you
    get 1.2 seconds more to tap.
- **Getting there:**
  - **🏞️ To the Fishing Pond** in the fishing guide (🎣❓) takes you
    to the end of the pier, looking out over the water, with Baby Mo.
    If you have no rod, Pak Harun lends you one for keeps, and it’s put
    in your hand.
  - The fishing practice with Baby Mo goes to the pond too, when the
    water is far.
  - The pond is in the discoveries journal, so the golden arrow can
    lead there.
- **Tested:**
  - Unit tests:
    - every world has the pond, 40–110 blocks out, on the masjid side
      in most worlds;
    - from the pier spot there’s water three blocks straight ahead.
  - Smoke:
    - from the guide to the pier;
    - three villagers fishing;
    - a cast, a bite, and a fish caught.
  - Screenshots of the pier with the villagers, and the pond from
    above.
  - Unit tests, the smoke suite on four profiles, and the QA suite.

### Wudu before praying, an adhan at prayer time, and a 2-hour play limit 💧🕌

Requested by a parent: Ibra went straight into the prayer without wudu;
add 90 and 120 minute timers; and a little adhan so prayer time is easy to
notice.

- **Wudu before the prayer:**
  - Standing in your place in the row, or pressing 🤲 Pray together,
    without wudu: Baby Mo says “Wait — wudu first before we pray! 💧”
    and the wudu pop-up opens, titled **Wudu before we pray**. It has
    the picture for each step.
  - Tap the 9 steps in order. The pop-up shows the du’a and closes by
    itself, and the prayer starts.
  - Closed it early, or went to watch the picture guide? Baby Mo asks
    again a few seconds later if you’re still in your place.
  - Wudu made at the village well or fountain beforehand counts too. A
    fresh wudu is asked for each prayer.
  - The Grand Masjid’s two wudu places (the men’s basin by the west
    door, the women’s pool in the courtyard) now open the wudu pop-up
    too.
  - The villagers’ “we’re waiting for you” message now says to make wudu
    first.
- **The adhan at prayer time** (`adhan()` in `src/game/audio.ts`):
  - A short, gentle “Allāhu Akbar, Allāhu Akbar” in the style of the
    adhan, about 8 seconds, with a big “🕌 Allāhu Akbar… It’s time for
    Dhuhr!” message.
  - It’s made in code: a synthesized voice with vowel shaping,
    vibrato, a little melisma and a hall echo. No recording is used.
  - The background music goes quiet while it plays.
  - It plays when a prayer time comes in the game, and with the
    real-time prayer reminders.
  - **For grown-ups:** an **Adhan sound at prayer time** switch with a
    🔊 preview. When it’s off, the old drum and chime play instead.
- **Daily play limit:** now 20, 30, 45, 60, 90 or **120 minutes** (90
  was already there).
- **Tested:**
  - Smoke:
    - standing in the row without wudu opens the wudu pop-up and the
      prayer waits;
    - after the 9 steps, the pop-up closes and the prayer starts.
  - The Grand Masjid smoke step and the QA prayer check now make wudu
    first, since they test other things.
  - The adhan plays without errors in the headless browser. Listening
    to it needs a real device.
  - Unit tests, the smoke suite on four profiles, and the QA suite.

### Fishing practice with Baby Mo 🎣🧸

Requested by a parent: a live practice catch where Baby Mo walks Ibra
through fishing, step by step.

- **New `src/game/fishcoach.ts`.** Baby Mo coaches on the card at the
  bottom of the screen (“Step 3 of 6”), and reads each step aloud. A step
  only moves on once you’ve done it:
  1. **Hold the rod:** the rod’s box in the bar at the bottom glows. If
     you don’t have a rod, Baby Mo gives you one (yours to keep), and
     puts it in the bar if it was only in the bag.
  2. **Go to the water:** a trail of golden sparkles leads to the
     nearest sea, river or pond. If none is close, Baby Mo offers to take
     you to the beach.
  3. **Throw:** “Look at the water, then tap ✋ Use” (on a computer,
     right-click), and the ✋ button glows.
  4. **Wait:** “Watch the red float. Don’t tap yet!”
  5. **Tap now:** when the float dips, the card says NOW!, next to the
     big TAP! cue.
  6. **Caught it!** Confetti, Baby Mo cheers, and +50 coins: “You’re a
     real fisher now. Remember: throw, wait, then tap when the float
     dips.”
- **Forgiving:**
  - The practice fish bites after 3½ seconds and stays on for 3.2
    seconds (more time than a beginner normally gets).
  - Tapping too early just says “Oops, too early, let’s throw again”.
  - A fish that gets away just means waiting for the next one.
- **Starting it:**
  - **🧸 Practise with Baby Mo** in the fishing guide (🎣❓) starts it
    any time.
  - The first time, **Let’s go fishing!** starts it too.
  - **Skip** on the card stops it.
  - The guide’s two buttons now sit right under the title, so they’re
    always in view on a phone held sideways.
- **Less clutter:** during practice, the ⛵ and 🎣❓ buttons are hidden so
  they don’t cover the card.
- **Taken to real open water:**
  - The trip to the beach skips frozen shores. Where it’s snowy, the sea
    surface is ice.
  - Once the ground has loaded, Baby Mo steps you right to the water’s
    edge, facing the water, so the first throw lands on water.
- **Pets hop the fence:**
  - A following animal stuck at a fence or wall while you’re outside now
    hops over to you after a moment.
  - Since the last fix, followers no longer walk through walls, so a
    rescued animal could get stuck at the sanctuary fence.
  - Inside buildings and upstairs they still wait for you.
- **Smoke tests:**
  - The boat step skips frozen shores too, and looks further for one.
  - The bedtime step closes a leftover reward pop-up before checking
    the game has started again.
- **Tested:**
  - Unit tests: the steps go in order, an early tap goes back to
    throwing, a fish that gets away goes back to waiting, and the
    practice fish is more forgiving.
  - Smoke: the whole practice, from the guide, the glowing rod slot and
    the trip to the beach, through an early tap and the first catch.
  - Screenshots of every step on an 844×390 phone.
  - The unit tests, the smoke suite on four profiles, and the QA suite.

### The Grand Masjid, the way to the masjid, and masjid lights 🕌✨

Requested by a parent: an easy way for Ibra to get to the nearest masjid on
time from anywhere, a light that shows where a masjid is, and a bigger
masjid where more people pray, with separate places for men and women.

- **The Grand Masjid (Masjid Raya)**, a new landmark 58–130 blocks from
  the village, in every world. It's added last, so existing worlds keep
  all their other places and gain the new masjid.
  - **Men’s hall in front:** green and red rows, the mihrab and a
    minbar, under a big golden dome you can look up into from inside.
    Men’s doors are on both sides, with a long wudu basin by the west
    door.
  - **Women’s hall behind** a wooden screen with a white curtain, all
    across the hall: purple and blue rows, a small dome, its own door at
    the back, and its own wudu place in the courtyard behind a little
    screen.
  - **Outside:** two minarets with balconies and lanterns, a courtyard
    with a fountain, flowers and date palms, and a treasure chest.
  - Walking into each hall shows a short card about it: straight rows
    (HR. Bukhari 723), and why women have their own hall (as in the
    Prophet’s ﷺ masjid).
- **It fills up at prayer time** (new `src/game/masjids.ts`):
  - An imam, two rows of men (some boys) in caps and robes, and two rows
    of women in white and pastel mukena. That's 37 people, or 19 on low
    graphics.
  - Some sit and wait until the prayer starts. Everyone prays the same
    movements together, then sits for dhikr afterwards.
  - Your place in the row glows. Boys join the men’s row (Baby Mo next
    to them); girls (Ais) join the women’s row.
  - Praying there counts like the village masjid: ×27 in the Amal Book,
    100 coins, steps to the masjid.
  - The village masjid works as before. The prayer checks now work for
    any masjid (“sites”), not only the village one.
- **Getting to the masjid on time:**
  - **🕌 To the masjid button:** a pulsing gold button appears while a
    prayer is waiting and you’re not in a masjid. It lists both masjids
    with distances:
    - **Take me there:** a quick fade, with Baby Mo, to the right door
      (men’s side door for boys, women’s door for girls). Off the boat
      or camel first.
    - **Show me the way:** a trail of little golden lights on the ground
      leads you there.
  - **The golden arrow** points to the nearest masjid during prayer time
    (🕌 and the distance), then goes back to letters.
  - **Prayer tab:** a **Go to a masjid** button, any time.
- **Masjid lights:**
  - A golden beam of light rises over each masjid.
  - It pulses brightly while a prayer is waiting, glows softly at night,
    and is off during the day.
  - A glowing crescent-and-star marker floats above the dome during
    prayer time, visible from far away.
- **Pets follow you onto raised places again.**
  - The “you’re up in a building” check from the last fix now compares
    your height with the ground just around you, not the natural ground.
  - Animals follow you onto raised places such as the sanctuary pen and
    the Grand Masjid platform, but still wait below towers and upper
    floors.
  - Found by a smoke test that sometimes failed.
- **Tested:**
  - Unit tests:
    - every world has the Grand Masjid near the village;
    - the women’s hall is behind the men’s, with the screen and curtain
      across the whole hall;
    - boys and girls have different doors and places;
    - the rows leave your place and Baby Mo’s free;
    - the arrow picks the nearest masjid.
  - Smoke:
    - far away at Asr, the 🕌 button and the arrow appear;
    - choosing the Grand Masjid takes you there;
    - standing in your place starts the prayer with a full masjid, and
      finishing it counts.
  - Screenshots: the button and picker, the door, inside both halls, the
    whole row in ruku’, a view from above, and the beams and crescents
    from far away at evening.
  - The unit tests, the smoke suite on four profiles, and the QA suite.

### Fixes: animals stay outside, no rain indoors, the boat stays put 🐱🐪⛵🌧️

Reported by a parent after Ibra played.

- **Pets followed you up to the 3rd floor.**
  - Before: a following pet teleported to you whenever you were 6+
    blocks higher, and walked straight through walls when blocked.
  - Now pets (and animals you're bringing to the sanctuary) wait
    outside while you're indoors (anywhere with a roof: a house, the
    masjid, a cave) or up in a building (more than 3½ blocks above the
    ground). They catch up when you come back out.
  - Pets no longer pass through walls. They still swim after you.
- **The camel walked into the masjid.**
  - A camel you ride stops at any doorway with a roof over it. A
    message says camels wait outside: get off with ✋ and go in.
  - Animals wandering on their own no longer step indoors either.
- **Rain, snow and blossom petals inside the masjid.**
  - Each raindrop, snowflake and petal is checked against the roof
    above it, so they stop at roofs (and under trees) and never fall
    inside. You can still see the rain outside through doors and
    windows.
  - New `world.roofed(x, y, z)` (is there a roof above this spot?) is
    shared by all of these fixes.
- **The boat disappeared when Ibra used it.**
  - Cause: while riding, any quick tap on the world ended the ride. On
    a tablet, tapping to look around right after launching put the boat
    straight back in the bag, with no message.
  - Now only the ✋ Use button gets you off. Getting off says the boat
    is back in your bag, and to tap ⛵ at the water to sail again.
- **Tested:**
  - A browser check:
    - the pet stays outside while you're in the masjid hall;
    - it stays at the bottom while you stand on a 9-block tower, then
      rejoins you when you come down;
    - a ridden camel stops at the masjid door;
    - no rain inside the masjid.
  - The smoke boat step now taps the world while sailing and checks the
    ride goes on.
  - Unit tests, the smoke suite on four profiles, and the QA suite.

### Bedtime instead of a sudden stop 🌙😴

Requested by a parent: Ibra was sad when time ran out in the middle of
building his house. Now you and Baby Mo get sleepy and go to bed, so the
end of play feels like a natural goodnight.

- **New `src/game/bedtime.ts`.** This only happens when a daily play
  limit is set.
  - **10 minutes before the limit:**
    - Evening light falls slowly over the island.
    - Baby Mo yawns (head back, eyes shut) and says: “It’s getting late
      and I’m sleepy. Let’s finish our building, it’s nearly bedtime!”
    - A pill at the top counts down: **🌙 Bedtime in 7 min**, with a
      **😴 Sleep now** button.
  - **5 minutes before:** Mo reminds you that your house is always saved
    and you’ll carry on tomorrow. Going to bed on time gets a reward. He
    yawns more often.
  - **Sleep now** (after a “Ready for bed?” check):
    - +20 coins and 3 stars for going to bed on time.
    - Today’s play ends there.
  - **At bedtime:**
    - Baby Mo sits down beside you, facing the camera, closes his eyes
      and nods off with little Zzz sparkles.
    - The goodnight card sits to the side (landscape) or at the top
      (portrait), so you can watch him sleep.
    - It says your house and everything you built is saved, and shows
      the du’a before sleeping (Bismika Allahumma amutu wa ahya), which
      counts in the Amal Book.
  - **In the middle of building:** if you placed a block in the last 45
    seconds, Baby Mo waits 2 more minutes so you can finish the last
    part, once a day.
  - **Grown-ups:** the card keeps the grown-up gate. Adding time wakes
    Baby Mo and brings the daylight back.
- **The older “Time for a break” card** is still there for other callers;
  bedtime uses the new goodnight card.
- **Tested:**
  - Unit tests for the bedtime phases and the evening light.
  - A smoke step: evening and countdown, Sleep now, the goodnight card
    with Mo asleep and the game paused, then a grown-up adds time and Mo
    wakes.
  - Screenshots on desktop and an 844×390 phone.
  - The QA play-time lock check, the smoke suite on four profiles, and
    the QA suite.

### A water bottle: you and Baby Mo need to drink 💧

Requested by a parent: a water bottle, and the player and Baby Mo need to
drink to keep playing and working.

- **New `src/game/thirst.ts`:**
  - Your water level and Baby Mo’s drop while you work: walking, digging,
    building or swimming. From full to empty takes about 10 minutes of
    busy play, or 30 while resting. Nothing drops while a pop-up is open,
    the game is paused, or you are praying together.
- **The water bottle** (a new item):
  - Baby Mo gives you one the first time, and a new one if it’s ever
    gone. It holds 4 sips.
  - Hold it and tap **Use** to drink. A sip brings back 40%, with a
    reminder of the sunnah: Bismillah, sit, right hand, three breaths.
    This counts as Bismillah in the Amal Book.
  - Hold it and tap **Baby Mo** to give him a drink. He drinks from a
    glass and thanks you.
  - **Fill it** by using it near the sea, a river, a pond or the village
    well.
- **A new good deed in the Amal Book: Giving water.** “Sa’d asked which
  charity is best. The Prophet ﷺ answered: ‘Water.’” (HR. Abu Dawud
  1679). It helps build the village’s kindness projects.
- **Two little water bars in the top bar** (Me and Mo):
  - They turn orange and pulse when someone is thirsty.
  - Tap them to see the levels and sips, with **I’ll drink**, **Give Mo
    a drink** and **Fill the bottle** right there.
- **Kept gentle:**
  - When you’re thirsty you only walk and dig a little slower (at worst
    80% speed). Nothing is lost.
  - Baby Mo says once when you look thirsty. When he is thirsty himself,
    he asks for a drink every 90 seconds, with little water drops over
    his head.
- **The real-life water break** (drinking a real glass) fills you, Baby
  Mo and the bottle back to full.
- **Old saves:** the water levels start full the first time the game
  loads.
- **Tested:**
  - Unit tests: draining, sips, the gentle slow-down, the item and the
    deed.
  - Smoke: drinking, giving Mo a drink, the deed, and refilling at the
    well.
  - A screenshot of the water bars and Baby Mo drinking.
  - The unit tests, the smoke suite on four profiles, and the QA suite.

### Picture guides for wudu and sholat 🧒💧🕌

Requested by a parent, with the Baby Mo pose renders from their Drive
(wudu and sholat folders) to use as a picture tutorial.

- **The pictures:** 37 poses, cropped and resized to 360×360 WebP
  (about 600 KB in all), in `public/img/poses/`. Steps with several
  pictures play them in a loop with a soft crossfade, like a little
  cartoon.
- **New `src/game/tutorials.ts`:** a short sentence a child can follow, in
  Indonesian and English, for each of 10 wudu steps and 10 sholat steps
  (intention, takbir, standing, ruku’, sujud, the first and final
  sitting, salam right and left, du’a).
- **Picture guide pop-up:**
  - Step counter and dots, ◀ ▶ buttons, and play/pause. Each step stays
    about 7 seconds.
  - Baby Mo’s voice reads each step aloud, and 🔊 repeats it.
  - Watching to the end counts as seeking knowledge in the Amal Book.
- **Where to find it:**
  - **How to pray** and **How to make wudu** in the Amal Book and on the
    Prayer tab.
  - **Watch how** in the wudu pop-up.
- **The wudu pop-up at the well** now shows the picture for the glowing
  step, and the du’a picture when you finish.
- **Praying together:** the prayer pill shows the picture of what the row
  is doing right now: takbir, standing, ruku’, sujud, sitting, or salam to
  the right and left.
- **Short landscape phones:** the picture sits beside the words, so
  nothing needs scrolling.
- **Tested:**
  - Smoke checks that the prayer pill shows a pose picture, the du’a
    picture appears after wudu, and the sholat guide has 10 steps and
    moves on with ▶.
  - Screenshots on desktop and an 844×390 phone.
  - 146 unit tests, the smoke suite on four profiles, and the QA suite.

### Steadier smoke tests on slow CI machines

- **The problem:** three publish runs failed on GitHub's slower runners.
  None was a game bug; each was a smoke step that assumed the machine was
  fast.
  - **Selling a pearl** clicked the shop while a celebration pop-up was
    still queued in front of it. The step now waits for the shop and
    closes anything ahead of it.
  - **The raft ride** checked after a fixed 1.5 s; at a few frames a second
    the raft had only moved 0.39. The step now waits up to 20 s for it to
    move, closing any pop-up that pauses the game.
  - **The boat** step tried only one shore. It was already fixed in the
    swimming change (several shores, and water found from a higher
    bank).
- **Tested:** the full smoke suite on four profiles.

### An iOS look for buttons, sheets and icons 📱

Requested by a parent: icons and buttons like the latest iOS.

- **A new `src/ios.css`** is loaded last, so it restyles everything without
  changing any layout.
- **Font:** the iPhone's rounded system font (SF Pro Rounded) on Apple
  devices, falling back to Nunito elsewhere.
- **Buttons:** flat capsules in iOS system colours with a gentle press
  (scale and dim) instead of the old chunky 3D ledge.
  - The main action is system blue; the reward or celebrate action is a
    warm gold.
  - Secondary buttons are grey fill with blue text.
- **Glass bars and round buttons:** translucent with blur and a light top
  edge, like iOS control bars.
- **Sheets (pop-ups):** large 34 px corners, a frosted background, a grey
  grabber at the top, and a softer dimmed backdrop.
- **New line icons** in the game's own iOS-style set (drawn for the game,
  not Apple's): boat, fish, question mark, swimmer, coin, cart and heart.
  The coin counter, ⛵ boat, 🎣 fishing help and swim-stroke buttons now
  use them instead of emoji.
- **Toasts** are dark glass capsules; the good-deed chip is a light glass
  capsule; rows, number badges and the ×27 badge use iOS shapes and
  colours; the grown-ups answer box is an iOS text field.
- **Tested:** screenshots of the HUD, a dialog, the shop and the settings
  on an iPhone-sized screen; the smoke suite on 4 profiles and QA on 5
  (button sizes, centring and fit all still pass).

### Swimming that looks and feels natural, with four strokes 🏊

Requested for Ibra: a more natural swimming motion and more styles.

- **You float now.** The main reason swimming looked odd: water had no
  buoyancy, so you sank and walked along the bottom unless you held jump.
  - Now you rise gently to the surface and stay there with your head just
    above the water.
  - **⬇️ dives** (the ⬇️ button now shows while swimming; C or Ctrl on a
    keyboard). Jump still climbs out onto the shore.
- **Treading water** when you stop: upright, hands sculling, legs
  treading, a gentle bob.
- **Four strokes**, chosen with a new stroke button that shows while
  swimming. Each tap tries the next one:
  - 🏊 **Freestyle** (front crawl), the fastest: arms reach, pull and swing
    over one after the other, with a flutter kick. The body rolls and the
    head turns to breathe.
  - 🐸 **Breaststroke:** a wide pull and glide with a frog kick, the head
    lifting to breathe.
  - 🐶 **Doggy paddle**, the slowest and cosiest: quick little paws, head
    well up.
  - 🙃 **Backstroke:** on your back, face up, arms circling backwards.
- **Underwater:** a streamlined dive with wide arm pulls and a dolphin
  kick.
- **Splashes** come off your kicks at the surface.
- **Switching** between strokes, treading and diving cross-fades smoothly.
- **New quest:** super swimmer (try all four strokes).
- **The ⛵ and 🎣? buttons** now also find the water from a higher bank (up
  to 4 blocks down).
- **Tested:**
  - Unit tests: treading when still, swimming when moving, and no joint
    snapping across all strokes and diving. This test caught a bug where
    changing speed made the arms flicker; stroke timing now builds up
    smoothly.
  - Screenshots of each stroke and treading water.
  - The smoke suite on four profiles; its boat step now tries several
    shores.
  - QA on five profiles.

### A real boat for the sea, lakes and rivers ⛵

Requested by Ibra: he was curious about a boat.

- **A ⛵ button** appears whenever you stand at the water's edge.
  - With a boat in your bag it says **Sail** and launches the boat on
    the nearest open water, facing out from the shore.
  - Without one it shows **?** and a short "Going by boat" guide.
  - The first time, Kakek Yusuf gives you a boat so you can try at once.
  - You can still make a boat (5 planks at the workbench) or buy one, and
    using it while held still works.
- **The boat is rebuilt:** a hull with a pointed bow, two benches, a mast
  with a green-and-white striped sail and a little flag, and oars at the
  sides.
- **Sailing:**
  - Move like walking to row; the oars row while you move.
  - The boat turns smoothly towards where you're going and rocks gently.
    The sail leans with the speed, and a wake trails behind.
  - You sit at the back and **Baby Mo sits at the front**.
  - The camera sits further back on a boat so you can see the sail.
- **Getting off:** tap ✋ near land; the boat goes back into your bag.
- **Fixed:** the boat recipe was listed under "decorations"; it is now a
  tool.
- **Tested:**
  - Screenshots on an iPhone-sized landscape screen of the button, the
    guide, rowing, and sailing to Volcano Island.
  - A smoke step on four profiles: finds a shore, the button appears, the
    free boat and guide, sailing with Baby Mo seated, and the boat back in
    the bag after landing.
  - QA on five profiles.

### A fishing guide for young players 🎣?

Requested for Ibra: "he wants to try fishing but isn't sure how".

- **A 🎣? button** appears whenever you stand by water or hold a fishing
  rod. It sits above the action buttons, or beside them on a phone in
  landscape so it never covers Jump.
- **It opens "How to fish":** six numbered picture steps in short
  sentences.
  1. Get a rod (3 sticks + 1 white wool at a workbench, or Bu Aminah's
     shop).
  2. Hold it.
  3. Stand at the water's edge and tap ✋ Use.
  4. Wait.
  5. When the float dips and **TAP!** appears, tap ✋ Use quickly.
  6. You get a small, big or golden fish to cook or sell.
- **Friendly extras:** a tip that being too early is OK and that the
  Fishing Hat helps. Baby Mo reads the steps aloud if voice is on.
- **The guide opens by itself** the first time you hold a rod.
- **While a fish bites:** a big bouncing **TAP! 👆** appears and the ✋ Use
  button glows yellow. Both go away when you reel in, the fish escapes,
  or you put the rod away.
- **Tested:** screenshots on an iPhone-sized landscape screen (button,
  guide and the TAP! cue); the smoke suite on 4 profiles and QA on 5.

### Pop-ups centred

Reported by a parent: pop-up content sat a little to the left.

- **The cause:** the shop, telescope, tasbih, wudu and hadith cards have a
  maximum width, but nothing centred them inside their panel. Their
  content sat 18 px from the left edge and 102 px from the right.
  - They are now centred, and so are the shop's title and coin line.
- **The book's tab bar** kept room for the ✕ only on its right, so the
  tabs looked shifted left. It now has the same space on both sides and
  centres its tabs. Narrow phones still scroll the tabs from the left.
- **A new QA check** measures every pop-up and fails if its content is
  more than 12 px off-centre. It runs on all five profiles and passes.

### New good deeds to do in the village 🤲

All of these are recorded in the Amal Book and help the village projects.

- **💧 Wudu** at the village well (or the fountain once it's built).
  - Tap the steps in order: intention and bismillah, hands ×3, mouth ×3,
    nose ×3, face ×3, arms to the elbows ×3, head, ears, feet to the
    ankles ×3.
  - The next step glows; tapping out of order shows a gentle hint.
  - At the end, the shahada du'a and "now you're ready to pray".
  - Also under "How to make wudu" in the Amal Book.
- **📿 Tasbih:** tap 33 beads while saying "Subhanallahi wa bihamdihi",
  with the hadith "light on the tongue, heavy on the scale".
- **🪨 Clear the path:** now and then a stone falls on a village path (at
  most two at a time). Clearing it is sadaqah (Bukhari 2989, Muslim
  1009).
- **💰 The masjid's charity box** (by the masjid door): give 10, 50 or 100
  coins.
  - With no coins: "a smile and helping others are charity too".
  - It quotes "charity never makes your wealth less" (Muslim 2588).
- **🤝 Honesty:** after buying, Bu Aminah sometimes gives 10 coins too much
  change. Giving it back is an honesty deed. Keeping it just gets a gentle
  word, never a punishment.
- **😊 Smiling:** your first hello to Baby Mo each day.
- **🌙 Du'a before sleeping** counts when you sleep in a bed.
- **🕌 Jumu'ah:** on a real Friday, the first visit to the masjid has a
  short talk for children (one of six lessons, rotating each week).
- The Amal Book page lists where to find these.
- **Tested:**
  - Screenshots of wudu, the tasbih, a path stone, the charity box and the
    honesty choice.
  - A smoke step on four profiles: wudu, a full tasbih, a gift to the
    charity box, and finishing the fountain project, which is then built
    in the world.
  - QA on five profiles.
  - The prayer-and-shop smoke step now turns off the random extra-change
    event, which has its own check.

### The Amal Book 📖 and village projects (sadaqah jariyah) 🏗️

Requested by a parent: link the game to Islamic values. For example,
praying together is worth 27 times more.

- **A new "Good deeds" tab: the Amal Book.**
  - 17 kinds of good deed, each with what Rasulullah ﷺ (or the Qur'an)
    said about it and the source.
  - The numbers come from the hadith itself and are shown as his words,
    not as a score:
    - **×27** for praying together (Bukhari 645, Muslim 650);
    - **×10** for each letter of the Qur'an (Tirmidhi 2910).
  - The page shows today's and all-time counts.
  - A note on the page and on each card: *"The real reward is with Allah.
    This book helps us remember how much He loves good deeds. What
    matters most is doing them for Allah."*
- **Deeds already in the game now count:**
  - praying together;
  - walking to the masjid at prayer time (counted when you arrive, with
    "each step raises you a degree");
  - bismillah when eating;
  - finding a letter of the Qur'an;
  - the letter quiz and star pictures (seeking knowledge);
  - planting;
  - petting, feeding and rescuing animals;
  - sharing food, iftar together, and salam to each villager once a day.
- **When you do a deed:**
  - A small "✨ 🕌 Praying together ×27" chip appears.
  - The first time, a card shows the hadith, after anything the deed
    itself shows (such as the letter card). Baby Mo reads it aloud if
    voice is on.
- **Village projects (sadaqah jariyah):** so the book has something to
  grow, good deeds build things for the whole village.
  - ⛲ **A water fountain for everyone:** 20 deeds of kindness and
    sharing, with the story of Sa'd ibn 'Ubadah's well.
  - 🏫 **The village madrasah:** 15 deeds of learning.
  - 🌳 **The masjid garden:** 15 deeds of worship.
  - Each project has a progress bar in the book.
  - When one is complete: a celebration, +150 coins, and the hadith "when
    a person dies their deeds end except three…" (Muslim 1631).
  - It is then built in the village and saved with the world.
  - The villagers start using it: Ayah Ibrahim teaches in the madrasah;
    Kakek Yusuf waters at the fountain and sits in the garden.
- **Coin pop-ups** now appear by the coin counter, so they don't cover
  cards.
- **Book tabs** are at least 34 px tall now that there are eleven.
- **Tested:**
  - Unit tests: every deed has both languages, a source and a project;
    ×27 and ×10 are set; the log counts per day and in total and spots a
    new deed; the projects fit inside the village and don't overlap.
  - Screenshots of the hadith card, the chip, the book and the built
    fountain.
  - The smoke suite on 4 profiles and QA on 5 (QA caught the letter card
    waiting behind a hadith card, and the tab size).

### A reason for everything, and a rewarding 5–10 minutes 📅

- **Audit: every item now has a use.**
  - A check of every item against recipes, food, tools, decorations and
    "Use" actions found two things you could collect but not use:
    - golden fish had no use at all;
    - pearls only mattered while the Eid bazaar was open.
  - The village shop now has a **Sell** tab. Bu Aminah buys what you
    gather: golden fish 100, pearl 40, gold 30, crystal 25, big fish 15,
    obsidian 12, iron 10, small fish 6, and milk, eggs, wool, apples and
    dates.
  - Each row shows the sum, such as "590 + 100 = 690".
- **Today's three goals:** three small goals each real day, each doable in
  a few minutes.
  - The pool: pet 2 animals, collect 5 logs, dig 5 stones, place 10
    blocks, plant a sapling, give food, pray together, catch a fish, cook,
    find a letter, eat, or answer 3 letter-quiz questions.
  - Only what is done today counts.
  - **+30 coins** for each goal and a **+100 bonus** for all three, with a
    celebration and "come back tomorrow".
  - The corner tracker shows "Today 💕🌱✨ 1/3"; the quests tab lists the
    goals with progress bars.
  - The letter goal is left out once all 28 letters are found.
- **Fixed:**
  - The parents panel now opens at once after the grown-ups check, even
    when another pop-up is waiting.
  - The kite smoke step was too strict: CI failed on Android while the
    kite was just starting to climb. It now checks that the kite rose
    above where it started.
- **Tested:**
  - A unit test for the goals: three different ones, stable per day,
    today's progress only.
  - A smoke step on four profiles: all three goals, coins and bonus,
    selling a pearl.
  - Screenshots of the goals, the tracker and the Sell tab.
  - The QA suite on five profiles.

### Animals look right again 🐪🐄🐑🐐🐔🐱

Reported by a parent: "the camel looks weird".

- **The real cause, for every animal:** the draw-call optimisation in M8
  merged each animal's boxes into one mesh. For a box with a single
  material it kept only one of the box's six face groups. From most
  angles the camel showed only its legs, and cows, sheep and hens lost
  their heads or sides.
  - The merge now keeps every face.
  - A new unit test checks that three merged boxes keep all 108 vertices
    and their full extent.
- **The camel is rebuilt:**
  - A round body with a lighter belly and one big hump in steps.
  - A neck that reaches forward from the chest and then up.
  - A head with a soft muzzle, nostrils, sleepy eyelids and ears.
  - Long legs with knobbly knees and wide feet, and a tail.
  - A red riding blanket.
  - When you ride, you sit on the blanket in front of the hump, not inside
    it.
- **Small details for the others:**
  - Cow: ears, a tail with a tuft and an udder.
  - Sheep: a nose and a fluffy tail (it is sheared with the wool).
  - Goat: floppy ears and a perky tail.
  - Hen: tail feathers.
- **Tested:**
  - Front and side screenshots of all six animals before and after.
  - All unit tests, and the smoke suite on four profiles, including
    riding.

### Praying together, properly 🤲 — and coins 🪙

Requested by a parent: the prayer was over by the time the child arrived,
and they wanted a big-number reward for praying.

- **The villagers wait for you.** At prayer time they walk to the masjid
  and wait in the row, standing.
  - They wait until shortly before the next prayer (up to 3 game hours),
    and a little longer if you are close to the masjid.
  - A glowing ring marks your place in the row.
- **The prayer starts when you are in your place.** Stand still on the
  ring, or tap 🤲 Pray together.
  - Ayah Ibrahim leads; the villagers, Baby Mo and you move as one.
  - The real number of rakaat: Fajr 2, Maghrib 3, the others 4. Each
    rakaat is shortened to about 12 seconds; a whole prayer takes under a
    minute.
  - Each rakaat has standing, ruku', i'tidal, two sujud with sitting
    between, and the first tashahhud after the 2nd rakaat. It ends with
    the final tashahhud and salam to the right, then to the left.
  - A pill shows "Rakaat 2/4 · Bowing".
  - Game time waits while you pray, so the next prayer can't cut it short.
  - Walking out of the row lets the villagers finish without you.
- **At the salam:** "Taqabbalallahu minna wa minkum", the jama'ah count,
  stars, and **+100 coins**.
- **Coins 🪙:**
  - A new counter in the top bar counts up to the new total.
  - Each reward floats up as a big "+100" with the sum written out, such
    as "250 + 100 = 350".
  - Finishing any quest gives +50.
  - Two rewards at once take turns instead of overlapping.
- **Village shop** (Bu Aminah, or tap the coin counter in the village):
  dates, milk, saplings, wool, lanterns, a fishing rod, a prayer mat,
  mangrove seedlings, a kite, fireworks and a boat.
  - Every item shows the sum "you have 340, 340 − 50 = 290", or how many
    more coins you need.
- **Fixed while testing:**
  - The "time waits" change briefly made the clock jump to the real time.
  - A second prayer started on its own right after the salam.
  - The time freeze now only holds while you are in the row.
  - The prayer pill wrapped badly on phones in portrait.
- **Tested:**
  - Unit tests: the rakaat count and sujud per prayer, salam on both
    sides, under 70 seconds, and the row moving through to the end.
  - A smoke step on all four profiles: no start without you, the start
    in your place, +100 coins and the count at the end, no restart, and a
    purchase.
  - The QA suite.

### Play-time lock with a grown-ups check 🔒

Requested by a parent: one hour of play by default, then the game stops
until an adult continues it.

- **Daily play limit** is now 1 hour by default.
  - Older saves that never chose a limit get 1 hour once.
  - Parents can still choose 20–90 minutes or no limit in the parents
    panel.
- **Before the end:** a reminder at 5 minutes and a toast at 1 minute.
- **When time is up:** a full-screen card that can't be closed stops the
  game.
  - It shows how long was played and says the game is saved.
  - It stays after a reload, because play time is counted per day and
    saved.
  - The game stays paused behind it even if another pop-up opens or
    closes.
- **Only a grown-up can continue:** "For grown-ups" asks a multiplication
  such as 17 × 8 (12–19 × 6–9, answers 72–171).
  - The answer is typed in, with no choices to guess from.
  - After 3 wrong tries it asks to fetch a grown-up.
  - Then they can add 15, 30 or 60 minutes for today.
- **The same harder check** now protects the parents panel and "new
  world". It used to be a simple sum like 7 + 6 with three buttons, which
  a young child could answer.
- **Tested:**
  - A unit test for the sum range.
  - QA on desktop, iPhone landscape and portrait, iPad and Android: a
    wrong answer keeps the panel shut; the lock appears and keeps the game
    paused; the right answer and "+15" unlock it.
  - The smoke suite.

### The Hilltop Masjid 🕌

- **A new landmark** on a high hill: a white marble masjid on a terrace.
  - **Prayer hall:** green and red prayer rows, a mosaic mihrab, windows,
    lanterns and a golden dome.
  - **Courtyard:** a little wudu fountain and flowers.
  - **Minaret:** a hollow tower with a staircase winding round a pillar,
    one block per step, up to a balcony with a rail, lanterns and a golden
    cap.
- **Secret spot:** the top of the minaret, with a lesson on the adhan and
  Bilal ibn Rabah, the first muadhin.
- **The discovery card** gives the hadith about building a masjid for
  Allah (Bukhari & Muslim).
- **New quest:** up the minaret.
- **Tested:**
  - Unit tests on 4 seeds: the doorways, all 13 steps with headroom, and
    the balcony.
  - A smoke step reaches the top on all four profiles.
  - The full QA suite passes.

### Weather of the day 🌤️

- **Every game day has its own weather,** the same for the same world and
  day. Rain still comes and goes on its own.
  - ☀️ **Sunny** (most days).
  - 🌫️ **Misty morning:** whitish fog from dawn until a couple of hours
    after sunrise, then it lifts.
  - 💨 **Windy:** clouds race and kites fly higher (wind now drives the
    kite height).
  - 🌸 **Blossom day:** pink petals drift down around you outdoors in the
    daytime (not in deserts, snow or at sea).
- **The weather icon** shows next to the clock, and Baby Mo says what kind
  of day it is when a new day starts. A misty morning comes with a little
  lesson: mist is a cloud near the ground.
- **Tested:** a unit test that the weather is stable per day and that all
  four kinds turn up, with sunny the most common; screenshot checks of
  mist and petals; the smoke suite on desktop and Android.

### Night glow 🍄

- **Glowing mushrooms** grow in forests, a couple per forest chunk. They
  give off light and stand out at night.
  - They only take spots that were empty, so no tree or flower moves in
    existing worlds.
  - The first time you are near one at night, Baby Mo explains
    bioluminescence.
- **Night sounds outdoors:** soft cricket chirps, and an owl's hoo-hoo in
  forests now and then. They stay quiet underground and follow the sound
  setting.
- **Tested:** a unit test that forest chunks get a few mushrooms (not a
  carpet) and that they give light; a screenshot check; the smoke suite on
  desktop and iPhone.

### Mangrove Swamp 🌿

- **A new landmark** at the coast (or a lagoon where there is no beach):
  shallow water one block deep over mud, with dry mud banks.
- **Mangrove trees** stand on arching roots in the water, with short trunks
  and wide canopies.
- **A boardwalk** with lanterns crosses to a platform with a chest
  (seedlings, a fish, lanterns), next to an open planting spot.
- **Crabs** scuttle sideways along the boardwalk, and fireflies glow over
  the swamp at night.
- **New blocks:** mangrove log, leaves (sometimes drop a seedling), roots
  and seedling (both live in water), and mud.
- **Planting:**
  - Mangrove seedlings go only in shallow water on mud or sand.
  - Elsewhere a friendly message explains this, and other plants can no
    longer be placed into water by mistake. Sea plants still can.
  - A planted seedling grows into a mangrove tree like other saplings.
- **The discovery card** explains that Indonesia has the largest mangrove
  forests in the world, how they protect the coast, and that people are
  caretakers (khalifah) of the earth.
- **New quest:** coast keeper (plant 3 mangroves).
- **Tested:**
  - Unit tests on 4 seeds: roots, logs, the platform, the planting spot.
  - Every one of 150 seeds gets a swamp.
  - A smoke step on all four profiles refuses a seedling on the boardwalk
    and plants one in the water.
  - The letter smoke step now closes pending pop-ups first.

### Treasure map 🗺️ and the great treasure

- **Four map pieces** wait as scrolls in the Lighthouse (top platform), the
  Oasis Camp tent, the Igloo and the Library Ruins.
  - Each place gets just one extra block; nothing moves in existing
    worlds.
- **Tap a scroll** to pick up its piece. A card shows the hand-drawn map,
  with one quarter revealed for each piece found.
- **With all four,** the map shows a red ❌ and a dotted line from the
  village, and the golden arrow points there.
- **The ❌ on the ground:** a ring of stones around a red wool X, placed
  far from the village and clear of every other place and the river.
- **The great treasure** is buried 3 blocks under the middle of the X.
  - Standing on the X, Baby Mo tells you to dig straight down.
  - The chest holds gold, crystals, pearls, gold tiles and the new
    **Treasure Hunter's Crown** 👑, which sparkles as you walk.
- **The 🧭 Map tab** shows the treasure map with your position and a "show
  the way to the ❌" button.
- **New quest:** the treasure map.
- **Tested:**
  - Unit tests on 4 seeds: four scrolls, each in its place, and a chest
    under the X, away from other places.
  - A smoke step on all four profiles collects the four pieces and opens
    the great chest.
  - The saved-positions test confirms no older place moved.

### Kites 🪁 (layang-layang)

- **Three kites** (red, blue and yellow), each made at the workbench from 2
  sticks + 2 wool.
- **Flying one:** hold it and tap 👆 Use to let it fly; tap again to reel it
  in. It has a diamond face, a string to your hand and a fluttering tail
  of bows.
- **Height:** the kite climbs higher the higher you stand (beach about 6
  blocks, a tall hill 13+), and higher still with more wind. Wind will be
  driven by the weather of the day in a later step.
- **It is put away** when you change what you hold, ride or swim. It needs
  open sky.
- **The first flight:** Baby Mo talks about kite flying in Indonesia.
- **New quest:** a kite up high (fly it really high on a hill).
- **Tested:** a unit test for the height rules and recipes; a smoke step
  on all four profiles makes a kite at a workbench and flies it.

### Animal Sanctuary 🏡 and lost animals

- **A new landmark:** a fenced pen two blocks high with a gate, a shelter
  with hay, a water trough, a food trough and a chest.
- **Five lost animals** wait around the world, in the same places for the
  same world: Kapas the lamb, Belang the cat, Kiki the goat, Pipit the hen
  and Mochi the cow. Each carries a 🥺 "Lost" tag.
- **Rescuing one:**
  - Tap a lost animal: it says it is lost and follows you, and the golden
    arrow points to the sanctuary.
  - Walk it into the pen: a welcome-home celebration, and it lives there
    from then on (it wanders only inside the pen).
- **Feeding:** tap a rescued animal while holding an apple, dates or milk.
- **Animal friends list** in the quests page:
  - Shows who is home, who is following you and who is still lost.
  - A 🧭 button points the arrow at a lost animal.
- **New quest:** animal helper (rescue 3).
- **Fixed:** a following friend, such as your pet, now catches up even
  after a long jump such as the 🏠 home button. Animals more than 90 blocks
  away used to stop updating, so a follower was left behind.
- **Tested:**
  - Unit tests: the fence, the gate, and five lost spots on dry land away
    from other places, the same for the same seed.
  - A smoke step on all four profiles rescues an animal and feeds it.

### Raft River 🛶

- **A new landmark:** a winding river traced through low ground, from a
  pond inland down to the sea.
  - It ends in a lake when there is no beach in reach.
  - Every world gets one: checked on 300 seeds.
- **The route is planned before anything is built,** so it avoids the
  village, the letter shrines and the other places.
- **The banks** are terraced grass with flowers, and lanterns stand along
  the way.
- **The dock** at the source has a raft block and a chest (fish, a fishing
  rod and lanterns).
- **Tap the raft** and it floats down the whole river by itself.
  - Baby Mo sits on the raft behind you, with little splashes at the
    sides.
  - Tap ✋ to hop off any time; at the end you step onto the bank.
- **New quest:** down the river.
- **Tested:**
  - Unit tests on 4 seeds: water along the whole path, the raft at the
    dock.
  - A smoke step that rides the raft, checks it moves, Baby Mo is seated,
    and the ride ends and counts.
  - The saved-positions test confirms no older place moved.

### Volcano Island 🌋

- A new landmark far out at sea (12 in total), reached by boat.
  - In a world with no deep sea in reach, it stands on low land instead.
- **The island:** a sandy beach, grassy lower slopes and a dark basalt
  cone.
- **The crater:** glowing warm magma rock, with a step to climb back out.
- **Getting up:** a stone path climbs the south side one block at a time.
- **Smoke** rises from the crater and can be seen from far away; steam
  rises from two warm springs.
- **New blocks:** basalt, warm magma rock (glows; not mineable, never
  hurts) and obsidian (iron pickaxe).
- **Secret spot:** inside the crater.
- **Chest:** obsidian, crystals and gold.
- **New quest:** volcano explorer.
- **Old worlds keep their places:** a new test with saved positions of
  every landmark for 8 seeds makes sure new places never move the ones a
  saved world already has.
- **Tested:** unit tests for the crater, the path (never more than one
  block up per step), the springs and the chest; the desktop smoke suite;
  a screenshot check of the island, path and crater.

### New places: Waterfall Valley, Coral Reef, Stargazing Hill and the Eid bazaar

Three new landmarks in every world (11 in total), placed by the same seed
rules as the others, plus a market that opens in the village for Eid.

- **Waterfall Valley** 🏞️ (forest, meadow or mountains)
  - A cliff with a river on top that falls into a pool. There is spray at
    its foot and a soft rushing sound when you are close.
  - A rainbow over the pool on sunny afternoons (after Dhuhr, before
    Maghrib, not raining).
  - **Secret cave behind the waterfall:** swim through the falling water to
    find a room with crystal walls and a treasure chest.
- **Coral Reef** 🪸 (shallow sea or a beach lagoon)
  - Pink, orange and purple coral, seagrass, coral fans and clams.
  - A school of fish and two sea turtles swim around the reef.
  - Clams give a **pearl** about half the time.
  - **Pearl Cave:** dive down a hole in the sea floor and through a short
    tunnel, then come up into an air pocket with a dry ledge and a chest.
  - New sea plants keep the water around them whole, and you swim through
    them (`aquatic` blocks in the mesher and the player).
- **Diving Mask** 🤿, a new power hat
  - Unlocks at level 4, or as soon as you find the reef.
  - With it you swim almost as fast as you walk and see about twice as far
    underwater.
  - It comes with 2 lanterns for the cave.
- **Stargazing Hill** 🔭 (desert or meadow)
  - A round hill with a telescope; tapping the telescope opens two pages.
  - **Tonight's moon:** the real phase for today's date (worked out from
    the length of a lunar month, accurate to about half a day). It shows
    how much of the moon is lit and the Hijri date, and explains the hilal
    with the hadith "fast when you see it". It also gives the days until
    the next new moon.
  - **Star pictures:** tap the twinkling stars to join up the Summer
    Triangle, Orion (Al-Jabbar) and the Big Dipper (Banāt Na‘sh). Each one
    explains the Arabic origin of its star names.
  - The moon in the sky now shows the real phase too. Shooting stars cross
    clear night skies, and they come more often over the hill.
- **Eid bazaar** 🎉 in the village
  - A welcome gate with a "Selamat Hari Raya / Eid Mubarak" banner and
    ketupat, a red carpet, and umbul-umbul flags.
  - **Four stalls:**
    - Ketupat & opor, free once a day ("take two: one to share").
    - Eid cakes: nastar for eggs or dates.
    - Fireworks for a pearl or apples.
    - Eid clothes: two new outfits for pearls.
  - A welcome card explains Eid prayer, forgiving each other and zakat
    al-fitr, and shows the takbir in Arabic with its meaning.
  - **Villagers** answer "Minal ‘aidin wal faizin" and give an **Eid
    envelope** once a day; opening it gives a small gift.
  - **Fireworks** over the village at night, and ones you can launch
    yourself.
  - **When it opens:**
    - On the real last days of Ramadhan (from the 28th) and the first week
      of Syawal.
    - Outside Ramadhan, when the game calendar reaches day 28.
    - Parents can choose "open now" or "closed" in the parents panel.
  - The Ramadhan tab shows how close the bazaar is and links to tonight's
    moon.
- **New quests:** the waterfall's secret, pearl diver and little astronomer.
- **Old saves:** the new places are added to existing worlds. The 8 older
  landmarks keep their positions, because each landmark uses the same
  random stream as before.
- **Tested:**
  - 15 new unit tests: the waterfall's water column and cave, the reef's
    coral, clams and air pocket, the telescope block, and moon phases on
    known new and full moon dates. They also check when the bazaar opens.
  - A new smoke step on desktop, iPhone, iPad and Android finds the Pearl
    Cave, joins a star picture by tapping, takes food at a stall and gets
    an Eid envelope.
  - All 110 unit tests, the smoke suite and the QA suite pass.
- **Fixed while testing:**
  - The telescope's star canvas was below the fold on an iPhone in
    landscape. It now has a compact layout and scrolls into view.
  - Eid fireworks were switched off completely in light-graphics mode; now
    they come less often instead.
  - The bazaar was first placed over a village palm tree and a letter
    shrine, so it moved to a lane east of the south path.

### Full-screen app on phones (Add to Home Screen)

So the browser bars do not cover the game on iPhone and other phones.

- **Installable app**
  - `public/manifest.webmanifest`: full-screen display, green theme,
    Baby Mo icons (192, 512 and a maskable icon).
  - Apple meta tags in `index.html`: full screen from the Home Screen,
    a see-through status bar and a 180px touch icon.
- **Offline cache** (`public/sw.js`)
  - Pages load from the network first, with the cache as a fallback.
  - Game files come from the cache first, so an installed game opens fast
    and still works without internet.
  - Old caches are cleared when a new version arrives.
- **Start screen help** (`src/install.ts`, `ui.ts`)
  - On iPhone/iPad Safari: a card that shows the steps (Share, then
    "Add to Home Screen"). It can be closed and stays closed.
  - On Android/Chrome: an "Install as app" button.
  - On a computer: a "Full screen" button.
  - Nothing is shown once the game is already opened as an app.
- **Tested:** 95 unit tests; the smoke suite on desktop, iPhone, iPad and
  Android profiles. In iPhone emulation the card shows, the manifest loads,
  the icon is served and the service worker registers. Not tested on a
  real iPhone, because the sandbox only has Chromium.

### Ibra's ideas (after playtesting)

Requested by Ibra after playing. Each idea is fitted to a young player and to
the game's "no losing" design.

- **Toy swords that get stronger**
  - Wooden, stone and iron toy swords, made at the workbench.
  - Each tap is stronger with a better sword, and the **sword skill** levels
    up as you use it (+15% per level, up to level 5).
- **Naughty beetles** (`src/game/bugs.ts`), a gentle "enemy":
  - **Small green beetles, big red ones, and a rare golden Beetle King**
    come out at dusk and at night, and in forests by day. Never in the
    village.
  - They wander, come over to you and give you a little bump.
  - They can't hurt you, and there's nothing to lose.
  - Tap them (bare hands work, a sword works better) and they pop in
    sparkles and **fly home**, leaving coal, sticks, dates, crystals or (for
    the King) gold.
  - Baby Mo explains: "we shoo them gently — we never hurt animals".
  - Parents can turn beetles off.
- **Fishing** (`src/game/fishing.ts`):
  - Craft a rod (sticks + wool) and aim at water.
  - **Use** casts the float. Wait for the nibbles, and when it dips ("❗
    Something's biting!") tap to reel in.
  - Catches: small fish, big fish, a rare **golden fish** or a little
    treasure.
  - Tapping early just pulls the float back, and a missed bite just means
    waiting for the next.
  - **Fishing skill:** bites come sooner, there's more time to tap and
    golden fish appear more often.
- **Cooking** at the furnace is now a little game:
  - A marker slides along a bar; tap **Flip!** when it's in the green zone,
    three rounds.
  - **Perfect** gives an extra portion; anything else still makes the food
    ("a bit crispy, but still tasty!").
  - New dishes: grilled fish, fried egg, steak.
  - **Halal meat** comes from Bu Aminah at the market (3 dates), so nobody
    harms the friendly village animals.
  - **Cooking skill** widens the green zone.
- **Tree climbing:**
  - Keep walking into a trunk to climb it, hand over hand. You push up
    through the leaves and hop over onto the top of the canopy.
  - The first time on each treetop: fruit (apples, dates, or sticks and a
    pine sapling) and **climbing skill**.
  - Sometimes a bird's nest, with a short lesson: the Prophet ﷺ taught us
    not to take baby birds from their mother.
- **Hats with powers.** Four new hats, and the Explorer hat. **Adam and Ais
  can both wear them** (on Ais they sit over the hijab). The first time you
  wear one, its matching item comes with it:
  - 👒 **Farmer's straw hat:** saplings grow 2× faster (+3 saplings).
  - 🎣 **Fishing hat:** quicker bites, golden fish twice as likely (+ a
    fishing rod).
  - ⛑️ **Miner's helmet:** a warm head lamp in caves and at night, and 35%
    faster digging (+8 torches).
  - 👨‍🍳 **Chef's hat:** a wider green zone when cooking (+2 eggs and halal
    meat).
- **My look from a photo** (Wardrobe → 📷):
  - Pick a photo, or take one on a phone. The game finds the main colours
    and guesses hair, skin, shirt and trousers. Tap a colour, then tap the
    photo, to change any of them.
  - **The photo is not sent anywhere and not saved**; only the four colours
    are kept.
  - "Back to normal colours" undoes it.
- **My skills** in the Bag: sword, fishing, cooking and climbing, each with
  its level and a bar to the next.
- **New quests:** shoo 5 beetles, go fishing, little chef (cook 3 times),
  climb a tree.
- Tests:
  - 7 unit tests for skills (levels, sword power, fishing odds, cooking
    zone and quality) and photo colours (a test picture's hair, skin, shirt
    and trousers come out right).
  - The smoke test shoos a beetle with a toy sword, plays the cooking game
    and wears the fishing hat, on all four profiles.
  - Checked in game:
    - a big beetle shooed in 4 taps;
    - a cast, a bite and a catch;
    - a perfect cook giving 2 grilled fish;
    - a 7-block climb onto a canopy rewarded;
    - all four hat gifts;
    - the head lamp turning on;
    - the photo colours read correctly.

### M9 · QA pass

- **New full QA suite** (`npm run qa`, `tests/smoke/qa.mjs`). It runs on
  five profiles: desktop, iPhone landscape, **iPhone portrait**, iPad and
  Android, and goes through:
  - boot, and the say-hi tutorial step with its 👋 button;
  - hijaiyah letters: card, harakat sounds, gift, and the treasure at 4;
  - letter quiz, and spelling a whole word in the word builder;
  - du'a card;
  - all ten book tabs;
  - Ramadhan calendar;
  - prayer times, including that changing the method changes them;
  - prayer time in the game: villagers go to the masjid and you pray
    together with Baby Mo;
  - the Maghrib iftar picnic, bedug and bedtime story;
  - the water break with its "are you sure?" check;
  - the parents gate and panel;
  - switching language, the HUD fitting the screen, and no console errors.
- **Layout checks at every step:** no sideways scrolling, pop-ups fit the
  screen, buttons at least 30 px, images drawn.
- **Result:** all checks pass on all five profiles. Full table in
  `docs/QA_REPORT.md`.
- **Found and fixed:**
  - The "?" tiles for letters not yet found had collapsed to 14 px tall on
    every device.
  - Small buttons were only 29 px tall on phones ("Back to village",
    "Photo", map zoom).
- **Honest limits:** device profiles are emulated in Chromium. Real
  iPhone/iPad Safari and Android still need a hand check (list in the
  report).

### M8 · Performance

Measured in headless Chromium with a software GPU, desktop 1100×680, a new
world after loading (the same script as the V1 baseline in `docs/V2_PLAN.md`).

| | Before M8 | After M8 |
|---|---|---|
| Draw calls per frame | 1509 | **209** (−86%) |
| Scene objects drawn | 1119 | 386 |
| Geometries in memory | 333 | 115 |
| Triangles | 33,072 | 30,542 |
| Load to playable | 2369 ms | 2085 ms |

- **Characters are merged** (`src/game/merge.ts`):
  - After a character or animal is built, all the little bevelled boxes in
    each moving part (body, head, each arm and leg, the hand) are baked into
    **one mesh per material** for that part.
  - A villager went from 109 meshes to 7; Baby Mo and the player from about
    115 to 7. Animals from about 10 to 6.
  - The joints are untouched, so walking, actions, prayer poses, held items,
    hats and capes all work as before. The animation gallery renders the
    same.
  - Blinking now swaps the face picture on the one face material, so it
    keeps working after merging.
  - Sheep wool stays its own part (it shrinks when sheared).
- **No more memory build-up while exploring:**
  - Animals in an unloaded chunk now have their geometry and name-tag
    textures freed. Before, every animal ever spawned stayed in GPU memory.
  - Measured over 12 jumps to far parts of the world: geometries stay at
    144 and the JS heap at about 21 MB.
- **Fix:** a camel you're riding (or an animal following you) used to
  vanish from under you when its home chunk unloaded. It now comes along.
- **Smoother world loading:**
  - The chunk mesher reuses one scratch buffer instead of allocating about
    37 KB per chunk, which means less garbage collection on phones.
  - On a slow frame (under 30 fps) the game loads half as much world that
    frame, so moving stays smooth.
- **Touch input can't get stuck:**
  - When the app goes to the background, the window loses focus or a
    pop-up opens mid-touch, every key, button, joystick and finger is
    released.
  - iOS can swallow the "touch ended" event at those moments, which could
    leave the child walking or mining on their own.
- Tests: 4 unit tests for merging. They check the same shape in world
  space, one draw call per material per joint, that joints and kept parts
  still move, and that the face material survives. Checked in game:
  - The measurements above.
  - Blinking swaps after merging, and a hat and cape still attach.
  - A ridden camel is kept when its chunk unloads, while another animal
    there is removed and freed.
  - The village morning screenshot looks the same as before.

### M7 · Exploration

- **Eight handcrafted landmarks** (`src/world/landmarks.ts`), placed in
  every world. Each one is put in a fitting biome, 60–320 blocks from the
  village, away from the letter shrines and from each other:
  - 🗼 **Lighthouse** on a beach: red-and-white stripes, a spiral stair
    round the outside, a lantern room on top.
  - 🏕️ **Oasis Camp** in the desert: a striped tent, a pool, date palms and
    a camp stove.
  - ⛰️ **Mountain Lookout** on a high peak: a wooden platform, lanterns and
    a flag.
  - 🏛️ **Library Ruins** in the forest: broken walls, marble pillars, a
    mosaic floor and old bookshelves.
  - ⛄ **The Igloo** in the snow: a round snow house with a bed and a
    lantern.
  - 🌷 **The Secret Garden**: a ring of flowers in a meadow hides a stair
    down to a glowing underground garden with crystals.
  - 🌴 **The Date Farm**: rows of date palms, a fence and a farmer's hut.
  - ☁️ **The Sky Island**: a floating island with a tree, reached by a
    spiral of stepping stones (one block up each hop).
- **Treasure in every landmark:** each hides a treasure chest (one-time
  loot, as before).
- **Discoveries:** the first time you come close you get a **"New
  discovery!"** card.
  - It has a short fun fact, e.g. the Lighthouse's stars-as-guides (An-Nahl
    16:16) or the Lookout's "Allahu Akbar going up, Subhanallah going down".
  - It nudges you to find the treasure and shows "n/8 special places
    found".
  - Stars, fireworks, and Baby Mo and you celebrate.
- **Explorer's Journal** on the 🗺️ Map tab:
  - Found places show their icon, name and fact, and appear on the map.
  - Places not found yet show a gentle clue ("Where the sand meets the sea
    stands a tall striped tower").
  - **🧭 Show the way** makes the golden compass point to that place, with
    its icon and distance and a ❓ on the map. Tap again to go back to
    letters.
- **New quests:** "True explorer" (find 3) and "Every special place"
  (find all 8).
- **Older saves:** the landmarks come from their own random stream, so
  letter shrines and the rest of each world stay exactly where they were.
  In an older save the landmarks also appear in places already explored;
  anything the player built there stays on top.
- **For teacher review:** the fun facts are in `landmarks.ts`, next to the
  other religious wording (see the note in `content.ts`).
- Tests: 4 unit tests over five seeds. They check that all 8 landmarks are
  placed and deterministic, the distances from the village, shrines and
  each other, that each has a chest, and that texts exist in both
  languages. Checked in game:
  - Every landmark was screenshotted in a generated world.
  - Walking into the Oasis showed its discovery card and recorded it.
  - "Show the way" turned the compass to 🗼 with its distance.

### M6 · Building

- **Placement preview:** while you hold a block and aim, a see-through copy
  shows exactly where it will go. It is tinted in the block's colour, or
  red when it can't go there: something in the way, a protected village
  building, or you standing in that spot.
- **Blocks that face a way:**
  - The furnace, treasure chest and other blocks with a distinct front now
    face *you* when placed. Before, they always faced south.
  - The **rotate button** (or **T** on a keyboard) turns the next one a
    quarter. The preview shows a gold arrow for the front.
  - Facing is stored per block, saved with the game and drawn by the mesher.
- **Furniture & decorations** (`src/game/deco.ts`): 11 new items made at the
  workbench:
  - **Prayer mat** (sajadah), **table**, **chair**, **floor cushion**,
    **potted plant**, **standing lamp** (glowing shade), **bowl of dates**,
    **ketupat decoration**, **rug**, **book stand** (rehal) with an open
    book, and a **glowing crescent**.
  - Each has a pixel icon, a 3D model and a recipe from things the game
    already gives you.
  - They sit on top of any block, facing you, with a see-through preview
    first. The rotate button / T turns the next one.
  - **Aim at one to select it:** a gold outline shows, with "tap = turn,
    hold = pick up".
  - **Use / tap** turns it a quarter. **Hold Mine** picks it back up into
    the bag.
  - Breaking the block under one gives it back. Blocks can't be placed
    into a furniture cell.
  - Saved with the game, and included in backups and save files. Old
    saves load with none.
  - A new quest, **Decorate your home** (place 3), gives a lamp and
    cushions.
- **Blueprint feedback:**
  - Only the cells that are actually in the way turn red; the rest stay
    green.
  - The plan bar says *why*: "Too close to the village buildings", "You're
    standing in it — step back", or "3 red blocks are in the way".
  - It lists every material as have/need chips (green when you have enough,
    red when not), and says "Good spot, but you need more materials".
  - While a blueprint builds itself, a progress bar shows, e.g. "🏠
    Building Little House… 73%".
- Fix: the ketupat recipe uses a palm sapling (palm leaves never drop as an
  item, so a leaves recipe could not be made).
- Tests: 4 unit tests for furniture. They check that every decoration is an
  item with a model that fits its cell and a recipe, that it faces the
  player, place/turn/raycast/remove, and the save cleaning. The smoke test
  places, turns and picks up a table on all four profiles. Checked in
  game:
  - All 11 decorations placed through the normal Use path, and the
    preview shows while holding one.
  - A furnace placed from the east faces east, and with one rotate it faces
    the next way.
  - Near the masjid the blueprint shows red cells, "Too close to the
    village buildings" and 0/12, 6/66… chips. On open grass: "Good spot,
    but you need more materials", then with materials "Looks good!" and
    "Building Little House… 73%".
  - Decorations (10) and block facing (2) survive save and reload.

### M5 · Living world

- **Villagers have days** (`src/game/routines.ts`). Each villager walks
  between real places in the village by the game clock:
  - **Ayah Ibrahim:** at his door in the morning, chatting on the plaza,
    reading by the masjid porch, visiting the market, tending the flower bed.
  - **Bu Aminah:** selling at the market stall, fetching water at the well,
    chatting on the plaza in the evening.
  - **Kakek Yusuf:** at the well early, sitting on the plaza, reading at the
    porch, chatting, then in the garden.
  - Prayer times and the iftar picnic still come first. After the prayer
    everyone picks their day up again.
- **What they do there:**
  - Reading: holding a book and turning pages.
  - Fetching water and gardening: bending down now and then.
  - Sitting on the plaza.
  - Chatting: friends at the same place face each other and pop little
    bubbles (💬 😊 👍).
- **Greetings:** walk up to a villager and they turn to you, wave, chime
  and say something fitting in a speech bubble ("Fresh dates! Want some?
  🌴", "Aren't the flowers pretty? 🌷"). Each villager greets you at most
  once every 40 s.
- **Night:** from an hour after Isha until Fajr the villagers go home and
  doze by their beds (eyes closed, 💤).
- **Animals:**
  - **They graze**: heads down to the grass. Chickens peck.
  - **They sleep at night**: settled low, head tucked, slow breathing.
    Pets stay awake and follow you.
  - **Your pet spins** with joy when you pet it.
- **Ambient life** (`src/game/ambient.ts`), each kind one draw call:
  - Butterflies in six colours flutter around flowers and tall grass by day.
  - Small flocks of birds glide overhead now and then.
  - Fireflies glow and blink around you at night.
  - Nothing appears in rain, underground or underwater. Light graphics mode
    turns ambient life off.
- The "Say hi to Baby Mo" quest text now points to the 👋 Hi! button.
- New animator action: *read*.
- Tests: 5 unit tests for routines. They check that day plans cover 0–24
  with no gaps, that everyone sleeps from an hour after Isha until Fajr,
  the places and the greetings. Checked in game:
  - At 09:00 Ayah is on the plaza chatting, Bu Aminah is selling at the
    market and Kakek Yusuf is sitting on the plaza.
  - Walking up to Bu Aminah gives a wave and a bubble.
  - By day there were 2 butterflies and a flock of 5 birds.
  - At 22:00 all three villagers sleep by their beds, 38 of 40 animals
    sleep, and 16 fireflies are out.

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
