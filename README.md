# Legion Battles

![The logo: LEGION in gold over a shield that is half blue and half red, BATTLES on a red ribbon](docs/art/logo.png)

A 2D fantasy autobattler for the browser. You open packs to get cards, field a team of them, and battles start by themselves: your units fight on their own, a win moves you on to the next stage, and you step in to change the team, open packs or go into a dungeon.

Everything on screen is drawn in code as SVG, and every sound is made in code. There are no bought assets and nothing is fetched from the network when the game runs.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open http://127.0.0.1:5173/. Add `?seed=123` to go straight to a skirmish with that seed.

| Command | What it does |
| --- | --- |
| `npm run dev` | The game, with reload on change. |
| `npm run build` | Type check, then build to `dist/`. Paths are relative, so `dist/` runs from any subfolder. The build is 4.5 MB. |
| `npm test` | Every test: the simulation, the rules, the data, the line of stages, dungeons and raids, the sheets, the sounds, the build's pictures. |
| `npm run art` | Writes every picture as SVG under `public/assets`, and the manifest. |
| `npm run art:sheet` | The same, then draws the contact sheets into `docs/art` and checks colors and line widths. |
| `npm run balance` | Plays 400 skirmishes and says how long they last and who wins. |
| `npm run journey` | Plays new players along the line of stages and says where they stall. |

Nine scripts play the game in a headless browser. They need the dev server running, and Playwright. Their pictures go to `docs/screens`.

```bash
node scripts/newplayer.mjs
```

```bash
node scripts/tour.mjs
```

```bash
node scripts/venture.mjs
```

```bash
node scripts/structures.mjs
```

```bash
node scripts/fields.mjs
```

```bash
node scripts/player.mjs
```

```bash
node scripts/screens.mjs
```

```bash
node scripts/touch.mjs
```

```bash
node scripts/perf.mjs
```

`newplayer.mjs` starts from an empty save, watches the first battle start by itself and presses whatever the tutorial points at until it is over; with `TOUCH=1` in front it does that on a phone held sideways, with touches only. `tour.mjs` loads a save that is well into the game and visits the map, the units, the forge, the index, the packs and two bosses. `venture.mjs` walks a dungeon floor by floor and then a raid. `structures.mjs` stands towers, a barracks and traps on both sides and looks at them in a battle, on the two pages of UNITS and the INDEX, and in the shop. `fields.mjs` shows a stage on each of the three fields, with a summoner on two of them. `player.mjs` shows the loading screen with the logo, the level under the coins, the skill tree, the upgrades, and the result of a boss's first fall. `screens.mjs` and `touch.mjs` walk a skirmish with a mouse and with touches. `perf.mjs` measures a full battle: script time a frame with the processor slowed, draw calls, and where the time goes.

## Play it without installing anything

`.github/workflows/pages.yml` builds the game and publishes it to GitHub Pages on every push. It needs one setting, once: in the repository, Settings, Pages, Source: GitHub Actions. The game is then at `https://<owner>.github.io/LegionBattles/`.

## How the game works

**Cards.** A unit is a card. A card has a tier (Common to Legendary), which says how rare it is in its own set, a grade (F to S), which its pack rolls and which never changes, and a level, which it earns. Grade and level multiply its health and damage. A grade is always shown as its badge, which grows grander as grades rise.

**Every card is its own.** A pack always turns over a card, and a copy of a unit you already hold is another card with its own grade and level. You can field it beside the first (a team can have two Knights) or combine it away.

**Combining.** COMBINE, on a card in UNITS, turns the screen into a forge. The card you chose grows, each card you mark is given up, and the panel says what level that makes before COMBINE asks once. Any card can be given up to any other. A copy of the card's own unit gives twice what another unit does, and a better grade, a rarer unit and a higher level give more. A card gives a fifth less than the experience it holds, so passing levels from card to card makes nothing. A card in the team is kept.

**UNITS and the INDEX.** UNITS lists only the cards you hold, on two pages: one for units and one for structures. SORT steps through unit, power, grade, level, rarity, health and damage. FILL TEAM fields the strongest team with a mix of roles, and the strongest structures. INDEX, on that screen, is the page of every unit there is, with the same two pages.

**Structures.** A structure is a building or a trap, and it is a card like any other. A building stands where it is put: a Watchtower shoots whoever comes within its reach, a Barracks sends out Militia, a Palisade stands in the way, a War Banner makes those near it fight faster. Nothing mends a building. A trap lies flat with a ring of its side's color round it, is no one's target, and goes off once under the first enemy to step on it. Structures stand in places of their own beside the team: one from stage 8, a second from stage 20, a third from stage 37, so a tower takes no fighter's place. The enemy has them too: each land has a tower, a hall that sends its troops out, and a trap, and they stand in its stages. Only who walks holds the field: a side with nothing left but structures has lost.

**Summoners.** A summoner is a unit that fights little and calls others to its side, as strong as it is: the Herald calls Militia, and each land has one of its own (the Ringleader, the War Drummer, the Skald), which stands in a few of its stages. A summoner calls three in a battle and a hall four, so a long fight does not feed itself.

**Packs.** Every pack holds one card. A pack names its set and the grades it can hand out, and holds everything of its set from the start: nothing in it has to be unlocked. A land's pack turns over one of its structures about one time in five. The Recruit Pack holds people only, and the Builder's Pack, sold from stage 8, holds only the Crownlands' structures; the first one is handed over with the first place to stand a structure.

**The packs screen.** Every pack has a slot of its own, small, laid out as the cards on UNITS are: the three that are no land's along the top, then a row to a land with a slot to each difficulty. Pressing a slot brings that pack up on the right, big: the grades it hands out, a tile for everything it can turn over (a unit you have not met is its outline in the dark, on no tier's color), and how likely each tier is. Pressing a tile says what it is and how likely. OPEN opens one, and the button beside it opens as many as you hold, up to ten. A pack that is not sold yet says what opens it.

**Opening a pack.** The pouch shakes, a light in the color of the best thing inside gathers behind it, and it bursts. One pack: its card rises out of it and turns over, rays turn behind a Rare or better, and its grade is stamped on a moment after. Several: the cards are dealt face down and turned one after another, the rarest last, and a press turns the rest at once.

**Battles.** Your tiles are the left half of the field. Units walk to the nearest enemy, attack on their own rhythm, and use their skill whenever it is ready. Over each unit is its plate: its level on the color of its tier, its health, and its grade. A battle lasts about 20 to 40 seconds.

**The field grows with the stage.** The first world is fought on a field of 8 by 4 tiles, the rest of the first lap on 10 by 5, and every lap after on 12 by 6. The line under the stage's plate says which. Every field is drawn in the same place on the screen: a bigger one has smaller tiles, and everyone on it is drawn smaller. A stage's enemies are written on the first field; on a bigger one they keep their depth behind their front line and are spread over its height. Your team's formation is kept as it would be written on the first field, so it is the same formation on every field, with more room behind and beside it on a bigger one. The first time the line comes to a bigger field, the team forms up again for it. Back on a smaller field (an early stage, a dungeon's first tier), whoever stood beyond it comes in to the nearest free tile for that battle, and the formation you set is not changed.

**Battles start by themselves.** BATTLE counts down two seconds and presses itself. A first win moves on to the next stage. A win at a stage already cleared stays there, so a team left alone earns from a stage it can beat. A loss steps back one stage, and a changed team goes back to the stage it lost at. AUTO stops battles starting by themselves; the count also waits while a screen is open or a unit is being dragged.

**The line of stages.** There is one line of 185 stages, numbered from 1, and a stage's number says how hard it is: enemies grow stronger with it, and so do what a win pays, what it teaches and the price of the pack it drops. A world is a land: World 1 is Thornwood, World 2 Sunscar Dunes, World 3 Frostholt. Each land has minibosses and ends in a boss.

**Difficulties.** Every world has five: Normal, Hard, Expert, Master, Nightmare. The line runs through the three worlds on Normal (stages 1 to 37), then through all three on Hard (38 to 74), and so on, so every stage of every world on every difficulty has its place on the one scale. A world opens on a difficulty when you have beaten it on the difficulty before, and beaten the world before it on this one. Following the line, each opens in its turn. What the rule adds is that Thornwood on Hard opens as soon as the Warlord falls on Normal, before the other two worlds are beaten: its stages are numbered from 38, which says how far ahead that is. Stages won ahead of the line are kept, and counted when the line comes to them. Places in the team, places for structures, dungeons and raids open by how far the line itself is cleared, in order.

**The map.** The main screen shows only the stage you are on, under the banner of its world, which says its difficulty on a chip in that difficulty's color. Pressing it opens the map of that world: a painted land with a road from stage to stage, a camp at each, a watchtower where a miniboss waits and a stronghold for the boss. Press an open stage to go there. A row of the five difficulties stands under the heading: an open one turns the map to it, and a shut one says what must be beaten to open it. The arrows turn to the worlds on either side on the same difficulty, if they are open.

**After a battle.** The result says what was won as pictures of the things: the coins, each kind of pack that dropped, the experience. Then the cards that made a level, as the units they are, each with its new level. Then your own level and what the battle added to it. Then whatever the win opened.

**Your level, the skill tree, and upgrades.** A battle teaches you what it teaches each card that fought, won or lost. Each level is a skill point. The tree has four branches from one root: War (harder blows), Guard (more health), Craft (stronger structures) and Fortune (more coins, faster learning, more packs dropped, cheaper packs). It has 51 ranks and a player who walks the whole line earns about 35 points, so it is a choice; every point can be taken back, for nothing. Coins also buy five upgrades, each level dearer than the last: Whetstones, Rations, Seasoned Timber, Ledgers and Tutors. Your level stands under your coins on the main screen, with a red mark when there is a point to spend or an upgrade the coins will pay for, and pressing it opens both.

**The team** starts at four and grows at stages 5, 10, 22 and 37, up to eight units, with up to three structures beside them.

**Dungeons.** A dungeon is a run of floors fought one after another with one roster: your team and two reserves. Nothing heals between floors and the fallen stay fallen, so the camp between floors shows what each card has left, and pressing a card sends it in or rests it. A floor lost ends the run. Only clearing the last floor pays: coins and two of the land's pack one lap better than the line is dropping there.

**Raids.** A raid is one long battle against a land's lord, grown huge, who calls up more of his own for as long as he stands. Every win pays, more than a dungeon, and it can be fought again at once.

There is one dungeon and one raid to a land. The dungeons open at stages 10, 22 and 37 and the raids at 22, 37 and 47. Each has the five difficulties too, each opened by clearing the one before. DUNGEONS, on the main screen, opens their hall.

**The tutorial.** A new player is shown the first battle, a pack, the team and the stage's plate. Which step is up is worked out from the save, so a reload in the middle carries on.

**What you have not met is dark.** A unit you have never held or beaten is a black outline named "???". So is a pack that is not sold yet, and a dungeon or raid that is not open. A stage that is not open is a lock on the map.

**Skirmish.** SKIRMISH on the map, or `?seed=N` in the address, plays the first four units against four random enemies. The same seed and the same placement always give the same battle.

Press `D` in a battle for the debug overlay: tiles, ranges, targets, frame rate, and how full the art sheet is.

## Where things are

| Folder | What is in it |
| --- | --- |
| `src/sim` | The battle. Pure TypeScript, no Phaser. Fixed 50 ms steps, a seeded generator, events for the view. `field.ts` is the field: its size, and where a team written on the first field stands on a bigger one. |
| `src/data` | The numbers: units (structures and summoners among them), the lands and their stages, the laps, the fields, the line of stages, packs, dungeons and raids. |
| `src/game` | The rules around the battles: cards and combining, sorting, packs, progress and which worlds are open, the run of battles, dungeons and raids, the player's level, tree and upgrades, the bonuses those give, the tutorial, the save. Pure TypeScript. |
| `src/art` | The art, as code. `kit/` is the palette and the reusable parts, `units/` is one file to a unit, `scenery.ts` and `backdrop.ts` are the painted scenes. |
| `src/audio` | The sounds, as code. |
| `src/view` | Phaser: the scenes, the board, the unit rig, effects, the interface. |
| `src/platform` | The ads interface a portal's SDK will plug into. It does nothing yet. |
| `scripts` | Art generation, contact sheets, balance and journey reports, browser walks. |
| `tests` | Vitest. |
| `art/overrides` | Hand-edited SVGs that take the place of generated ones. |
| `docs/art`, `docs/screens` | The contact sheets and the screenshots. |

## Tuning

**A unit's numbers** are in `src/data/units.ts`. They are written at the strength of the first set; a set's `power` multiplies them, which is how later lands outdo earlier ones. After a change:

```bash
npm run balance
```

That prints the spread of skirmish lengths (84% fall between 15 and 30 seconds) and a table of every unit against every other.

**A stage** is one line in `src/data/lands.ts`: who stands where, and the grade and level they stand at the first time the line comes through. **The line** is built from the lands in `src/data/stages.ts`: after the first lap, a troop's strength climbs from a step above the first lap's last boss to `TOP` at stage 185, and each stage's grade and level are worked out from that. **A lap** (`src/data/laps.ts`) says the fewest enemies a stage fields and how much of a land's `weight` counts. That count is of what a stage is worth, not of heads: a tent or a summoner counts as the four it calls, a boss as three, a trap as none (`fieldedWorth` in `stages.ts`). **The fields** are in `src/data/fields.ts`, with which world is fought on which. After changing any of these, a pack, what a win pays, or anything a player's growth depends on:

```bash
npm run journey 12 --worlds=15 --losses
```

It plays twelve new players along the line by the game's own rules and prints, for each world, how many battles it took, how many were lost, how long a battle lasts, and how strong the team was when the boss fell. `--losses` lists the stages that beat players most often, which is where the walls are. Without `--worlds` it plays the first three. `--bare` plays players who spend no skill points and buy no upgrades, to see what those are worth. As tuned on 24 November 2026, all of twenty-four finish the line: half of them in under about 350 battles, the slowest in 782.

| World | Stages | Field | Battles, half took under | Lost | A battle |
| --- | --- | --- | --- | --- | --- |
| Thornwood, Normal | 1 to 10 | 8 by 4 | 14 | 22% | 21 s |
| Sunscar Dunes, Normal | 11 to 22 | 10 by 5 | 51 | 41% | 24 s |
| Frostholt, Normal | 23 to 37 | 10 by 5 | 31 | 27% | 32 s |
| The three on Hard | 38 to 74 | 12 by 6 | 14, 14, 19 | 22%, 15%, 17% | 29 s |
| The three on Expert | 75 to 111 | 12 by 6 | 16, 14, 19 | 35%, 32%, 14% | 32 s |
| The three on Master | 112 to 148 | 12 by 6 | 10, 18, 15 | 21%, 24%, 3% | 30 s |
| The three on Nightmare | 149 to 185 | 12 by 6 | 12, 14, 15 | 53%, 40%, 9% | 34 s |

The simulated players are plain. They follow the line and never try a difficulty ahead of it. They buy the dearest pack on sale, combine every copy into the best card of its unit and every idle card into their team, and press FILL TEAM. They spend each skill point as it comes, on what makes the team fight better first and on Fortune last, and buy any upgrade that costs no more than the dearest pack on sale. They never arrange their team by hand, so nothing here says what good placement of a tower or a trap is worth. Read what half of them took before the average: one player in twenty-four took 334 battles over Thornwood on Nightmare, which is the nearest thing to a wall, and Frostholt on Master is a soft spot.

**The line was weighed three times on that day.** Structures, summoners and bigger fields made it shorter in battles than it had been (half of twelve players took under about 730 before them) and its battles longer (they were 20 to 28 seconds). Then the player's own level, tree and upgrades made everything they field about a third stronger by the end, and the last stage of all was raised from 7 to 9 (`TOP` in `stages.ts`) to keep the later difficulties a fight.

**A structure or a summoner in a stage** is strong for what it is. The first tries stood a tent beside each land's boss, and the Colossus then beat simulated players a hundred times each; a tent that called without end made one stage of Thornwood a wall on every later difficulty. So no boss has a hall beside it, every caller has an end to whom it calls (`total` on `summons`), and a difficulty counts a caller as four. Measure after adding one.

**The player's level, the skill tree and the upgrades** are in `src/data/player.ts`: how much experience a level takes, each node of the tree (its effect, what a rank gives, what it needs), each upgrade (what a level gives, what the first costs, how fast the price grows). **Every bonus is added up in one place**, `src/game/bonuses.ts`: a source is one entry in `SOURCES`, and the fights, the pay, the experience, the drops and the price of packs all ask `bonus(save, effect)`. A new source of bonuses is one entry there and nothing else.

**Grades, levels and tiers** are in `src/game/rarity.ts`. **Combining** is in `src/game/cards.ts`. **Team size and drop chance** are in `src/game/rules.ts`. **Packs** are in `src/data/packs.ts`. **Dungeons and raids** are in `src/data/expeditions.ts`, and what they pay at the top of `src/game/expeditions.ts`. Nobody has measured how hard each tier of a dungeon or a raid is for the team a player has when it opens: they stand a little above the land's own boss on that lap, and that is all.

## Adding things

**A structure.** A unit with `kind: 'building'` and `still: true`, or `kind: 'trap'` and a `trap` (what sets it off, how wide it strikes, what it leaves). A building can shoot (a `range` and a `projectile`), call troops (`summons`), or keep a status on those near it (`aura`). Its art has a shadow and a body and no weapon (`src/art/units/structures.ts`). A land's own goes into a few of its stages and comes out of its pack. **A summoner** is a unit with `summons`: who it calls, how often, how many at once, and how many in all.

**A field.** An entry in `FIELDS` in `src/data/fields.ts`, as much wider than tall as the others, and a rule in `fieldOfWorld` for which worlds are fought on it. `npm run art` paints its tiles for every kind of land. Nothing else names a field's size: the battle, the rules and the board all take it from the stage.

**A unit.** Add its numbers to `src/data/units.ts` and its art to `src/art/units` (see `ART_GUIDE.md`). Run `npm run art:sheet` and look at the sheets. Run `npm test`: it fails if a unit has numbers and no art, or art and no numbers, or if the sheets the game packs its art onto are full.

**A land.** Add an entry to `LANDS` in `src/data/lands.ts` with a `weight`, a set to `SETS` and its units in `units.ts`, and a pack in `packs.ts` with a look in `src/art/packs.ts`. If its kind of ground is new, add its colors to `src/art/board.ts`, its scenery to `src/art/scenery.ts` and its look to `LOOKS` in `src/art/backdrop.ts`, and an emblem to `src/art/icons.ts`. The line grows by itself: every lap gets the new land's stages. The tests hold a land to the rules: 10 to 25 stages, never fewer than the land before and never more than 5 more; one boss, at the end; a miniboss before it; only its own set's units. Then run the journey report and set the grades, levels and weight by what it says.

**A dungeon or a raid.** An entry in `src/data/expeditions.ts`: its land, the stage it opens at, and its floors written as stages are, or its lord, his guard and who he calls up. The tests go through every floor of every dungeon and every raid.

**A skill.** A skill is data on a unit: a kind (`strike`, `cleave`, `blast`, `volley`, `drain`, `mend`, `boon`, `hex`), a cooldown, and the kind's numbers. A new kind is a case in `useSkill` in `src/sim/battle.ts`, with a test.

**A sound.** A recipe in `src/audio/sfx.ts`: a few tones and bursts of noise. The test builds every one.

## Regenerating art, and editing it by hand

```bash
npm run art
```

writes the logo and its mark (`logo/`), `public/assets/units/<team>/<unit>/<part>.svg` for both teams, a whole-unit `full.svg` for the menus, the effects, the icons, the packs, the grade badges, the painted ground of a battle in each kind of land (`board/`), the tiles of each field on each kind of land (`tiles/`), the map of each land (`maps/`), and `public/assets/manifest.json`, which lists each unit's parts in draw order with their pivots.

To change a picture by hand, copy it to the same path under `art/overrides` and edit it there, in Inkscape or anything else. For example `art/overrides/units/blue/knight/head.svg` replaces `public/assets/units/blue/knight/head.svg`. The dev server serves your file straight away. `npm run art` never writes under `art/overrides`; run it after adding or changing an override so that the manifest measures your file, and a build copies overrides over the generated files.

Every part of a unit is drawn on the same 192 by 192 canvas with the feet at (96, 180), so stacking the parts at one place assembles the unit. A unit's file has 40 px of page round that canvas, because a long spear held level reaches past it: keep an override on the same page (`viewBox="-40 -40 272 272"`). The art build fails on a part that reaches the edge of the page.

The files in the repository are written to be read: every shape has an id that says what it is. A build makes its own copies small (unused ids gone, spaces gone), which is a third of their size. A test draws both and compares every pixel.

## How it is built

**Determinism.** The simulation's only randomness is a seeded generator, and its only arithmetic is addition, subtraction, multiplication, division and square roots, which every engine rounds alike. The tests run battles twice and compare every event. The line of stages is worked out with the same arithmetic, so every machine has the same line.

**Animation.** A unit is a rig of sprites, one to a part. Every movement is a pose, a set of offsets for the parts, blended in and out from the battle's own clock (`src/view/UnitView.ts`, `src/art/poses.ts`). A blow's swing is timed from the simulation's `attackStart` event to arrive on its `impact` event, at any speed. The contact sheet draws every unit at the far end of every pose with the same code the game uses.

**One sheet, and two pictures under it.** Every unit part, effect and icon is rasterized at 2x by Phaser's loader, cut to its own corners and packed onto one canvas texture (`src/view/Sheet.ts`). The ground of a battle is one painted picture the size of the screen (`src/view/Scenes.ts`), loaded when its land is come to, and the tiles of the field are a second picture laid over its slab, one to a field; one of each is held at a time. The game holds itself to one texture a batch (`maxTextures: 1` in `src/main.ts`). The last stage of all, with eleven of the player's pieces on the biggest field and as many against them, is about 37 draw calls a frame, most of them the interface's text. The whole units for the cards are on a sheet of their own, which is 2048 by 2560 since the structures came.

**A field on the screen.** `FieldLayout` in `src/view/layout.ts` is a field's tiles and its zoom: 1 on the first field, two thirds on the biggest. Units, shots and effects are drawn at that zoom. A unit's plate shrinks less than the unit does, as it is read.

**Frame rate.** The canvas is not multisampled on a dense screen, the faster of two graphics chips is asked for, and the board is not drawn while a screen is open over it. The game watches its own frames: when most of them are slower than 45 a second for four seconds, it draws at half a step less resolution from then on and remembers that for the next visit. `?res=2` in the address fixes the resolution.

**Sharpness.** The game is laid out on 1280 by 720. On a dense screen the canvas is up to twice that and the cameras zoom to match (`src/view/config.ts`).

**Nothing allocated per frame.** Effects, damage numbers and shots come from pools. Damage numbers, and the level and grade on a unit's plate, are bitmap text from characters drawn once at start.

**Sound.** `src/audio/sfx.ts` builds each sound from oscillators and filtered noise when it is asked for. A browser makes no sound until the page has been touched, so the first sound follows the first press. The speaker button mutes, and the choice is saved.

**The save** is one JSON object in the browser's local storage (`src/game/state.ts`, `src/game/storage.ts`). It is at its fourth version, and each of the three before it is carried over when it is loaded: one card to a unit became cards of their own, and worlds with difficulties became the line. What has been added since needed no new version: a save without stages cleared ahead of the line, a player's level, a tree or upgrades is read as having none. A team's tiles are kept as the first field would write them: column 3 is the front line, and a bigger field has columns behind 0, written -1 and -2, and rows beside 0 to 3, written -1 and 4. So a save from before the fields grew needs no change. A run of a dungeon is not saved: leaving the game in the middle of one gives it up. If storage is blocked, the game plays and forgets.

**Ads.** `src/platform/ads.ts` is an interface with `interstitial()`, `rewardedAd()`, `gameplayStart()`, `gameplayStop()` and `loadingDone()`, and an implementation that does nothing. The game already calls them in the right places. A portal's SDK is one new class and one call to `setAds`.

## Left out of what the Roblox game has

Dungeons and raids are modelled on the owner's Roblox autobattler, and are smaller than its: a raid is fought on the field of its tier with the same team, not on a field of its own with three times the team; no unit raises the fallen; and a dungeon's enemies are its land's own units, not a set met nowhere else, so its prize is a better pack of that land and not a pack of its own. No structure takes more than one tile.

## Not yet looked at

- The game has only been run in a headless Chromium with a software renderer. It has not been played on a real phone or a real graphics chip. What was measured is the script side (about 5 ms a frame in the last stage's battle on this machine, with eleven of the player's pieces on the biggest field; 25 ms with the processor slowed four times, where a battle of sixteen units took 17; both with the software renderer's own work in them) and the draw calls (about 37). What a real chip does with it nobody has seen, and the changes made for the frame rate are the usual ones, not ones measured on a device.
- Nobody has listened to the sounds. They are built and they play without error, and a test checks each is short and not silent. Whether they sound good is unknown.
- The dungeons and raids were walked once each in the browser at their first tier with a strong team. How hard each tier is for a real player's team is not measured, and it has moved: their enemies stand on bigger fields now, and the team brings its structures.
- The line was tuned with simulated players who are cruder than people, who never place a tower or a trap by hand, and who spend their skill points on fighting first. A real player who puts every point in Fortune will find the later difficulties harder than the table says; one who plays a difficulty ahead of the line is measured by nothing.
- The logo is a first version. It has been looked at on a green ground, on the dark of a menu, on the loading screen, and as a mark down to 32 pixels, where it is a blue and red blot and little more.
- The new screens (packs, skills, upgrades, the result) were looked at in screenshots at 1280 by 720 and walked with a mouse. None was tried with a touch, and the result's fullest case, a boss's first fall, fills the board from top to bottom.
- Opening ten packs was watched in still pictures, not in motion: whether its pace feels right, and whether its sounds pile up, nobody has seen or heard.
- The bigger fields have been seen only in screenshots at 1280 by 720. On the field of 12 by 6 a unit is two thirds the size it is on the first, and its plate three quarters: whether the level and the grade on it can still be read on a phone, nobody has looked.
- A trap is hidden by whoever stands on the tile in front of it, but for the ring round it. Whether the ring is enough to find one's own trap when arranging a team is a judgment from screenshots.
- Dragging a unit on the two bigger fields was not tried with a touch: the tiles there are 96 and 80 units wide on the 1280 layout, smaller on a phone.
- With more than one texture in a batch, the software renderer drew half of some sprites. One texture a batch avoids it. Whether real graphics chips show the same was not tested.
- A unit that faces left is its picture mirrored, so its light comes from the top right instead of the top left.
