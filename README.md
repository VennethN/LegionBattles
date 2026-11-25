# Legion Battles

![The logo: LEGION in gold over a shield that is half blue and half red, BATTLES on a red ribbon](docs/art/logo.png)

A 2D fantasy autobattler for the browser. You open packs to get cards, field a team of them, and battles start by themselves: your units fight on their own, a win moves you on to the next stage, and you step in to change the team, open packs or go into a dungeon.

Everything on screen is drawn in code as SVG. The sounds and the music are played on recorded instruments and drums from two public-domain libraries, cut down to one small file. There are no bought assets, and the game fetches nothing from the network by itself: only the copy that runs on CrazyGames asks for that portal's SDK.

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
| `npm run build` | Type check, then build to `dist/`. Paths are relative, so `dist/` runs from any subfolder. The build is 4.5 MB, of which the recorded sounds are under half a megabyte. |
| `npm run build:crazygames` | The same, into `dist-crazygames/`: the copy to upload to CrazyGames, which asks for their SDK when it starts. See "CrazyGames". |
| `npm test` | Every test: the simulation, the rules, the data, the line of stages, dungeons and raids, the rewards, the tutorials, the sheets, the bank of recorded sounds, the effects and the music, the build's pictures. |
| `npm run art` | Writes every picture as SVG under `public/assets`, and the manifest. |
| `npm run art:sheet` | The same, then draws the contact sheets into `docs/art` and checks colors and line widths. |
| `npm run art:roster -- [unit, set or role ...] [both] [pose=strike] [zoom=2]` | Draws any of the kit's units to `build/roster.png`, from the source, whether the game has them or not. `-- check` holds every unit in the kit to what a program can see of the style, and `-- list=docs/art/roster.md` writes the cast as a list. |
| `npm run cover` | Draws the game's covers into `docs/covers`: the pictures a portal shows the game by, in the three shapes CrazyGames asks for. |
| `npm run video:film` | Plays the game in a browser on a clock it steps itself and photographs it, for the preview video. Needs `npm run dev`. `sheet` plays the shots small, to choose from. |
| `npm run video:cut` | Cuts the two preview videos from that film and encodes them into `build/video`. Needs ffmpeg. |
| `npm run balance` | Plays 400 skirmishes and says how long they last and who wins. |
| `npm run journey` | Plays new players along the line of stages and says where they stall. |
| `npm run listen` | Writes the music and every effect to sound files in `build/listen`, and prints how loud each is. Needs the dev server running. |
| `npm run samples` | Cuts the bank of recorded sounds again from the two libraries it is made of. Only to change what is in it: see "Remaking the bank of sounds". |

Fourteen scripts play the game in a headless browser. They need the dev server running, and Playwright. Their pictures go to `docs/screens`.

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
node scripts/rewards.mjs
```

```bash
node scripts/tours.mjs
```

```bash
node scripts/settings.mjs
```

```bash
node scripts/listen.mjs
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

```bash
node scripts/hitch.mjs
```

`newplayer.mjs` starts from an empty save, watches the first battle start by itself and presses whatever the tutorial points at until it is over, then lets battles run and presses through whatever tour comes up between them, of which none is the rewards'; with `TOUCH=1` in front it does that on a phone held sideways, with touches only. `tour.mjs` loads a save that is well into the game and visits the map, the units, the forge, the index, the packs and two bosses. `venture.mjs` walks a dungeon floor by floor from the hall of dungeons, and then a raid from the hall of raids. `structures.mjs` stands towers, a barracks and traps on both sides and looks at them in a battle, on the side screens that UNITS and STRUCTURES open and the tabs that lead from one to the other, on the INDEX, and in the shop. `fields.mjs` shows a stage on each of the three fields, with a summoner on two of them. `player.mjs` shows the loading screen with the logo, the level under the coins, the skill tree, the upgrades, and the result of a boss's first fall. `rewards.mjs` claims a day of the calendar, comes back tomorrow for the card of the second day, plays twelve minutes in a moment and claims the pack no shop sells. `tours.mjs` lets every tour start by itself and presses through each, checks that none of them is about the rewards and that their button is lit when one waits, opens the settings and views one again, and then, for a player whose first raid has opened, walks the raids' own tour; it fails if a step points at nothing or does not move on, or if the dungeons' tour points at a raid. `settings.mjs` presses everything on the settings screen and checks that each press does what it says and is kept: the volumes, sound off and on, the three ways of drawing (on a dense screen, so that the canvas changes size), screen shake, and START OVER, which must ask first and keep the settings. `listen.mjs` takes no pictures: it writes the music of each land, a crowded battle's effects and every effect by itself to sound files in `build/listen`, and prints how loud each is, played from the bank and made from oscillators. `screens.mjs` and `touch.mjs` walk a skirmish with a mouse and with touches. `perf.mjs` measures a full battle: script time a frame with the processor slowed, draw calls, where the time goes, and which kind of thing drawn it goes to; `IDLE=1` in front measures the main screen between battles, and `SCREEN=Shop` a screen open over it. `hitch.mjs` looks for the frames that stall between battles: it fights through a few stages on AUTO with the processor slowed and lists every long frame with which of the main screen's own steps took the time. The walks share `scripts/walk.mjs`, which presses a button by what it says, or by the name its screen has marked it with for the tutorials, so that moving a button does not break a walk.

## Play it without installing anything

`.github/workflows/pages.yml` builds the game and publishes it to GitHub Pages on every push. It needs one setting, once: in the repository, Settings, Pages, Source: GitHub Actions. The game is then at `https://<owner>.github.io/LegionBattles/`.

## How the game works

**Cards.** A unit is a card. A card has a tier (Common to Legendary), which says how rare it is in its own set, a grade (F to S), which its pack rolls and which never changes, and a level, which it earns. Grade and level multiply its health and damage. A grade is always shown as its badge, which grows grander as grades rise.

**Every card is its own.** A pack always turns over a card, and a copy of a unit you already hold is another card with its own grade and level. You can field it beside the first (a team can have two Knights) or combine it away.

**Combining.** COMBINE, on a card in UNITS, turns the screen into a forge. The card you chose grows, each card you mark is given up, and the panel says what level that makes before COMBINE asks once. Any card can be given up to any other. A copy of the card's own unit gives twice what another unit does, and a better grade, a rarer unit and a higher level give more. A card gives a fifth less than the experience it holds, so passing levels from card to card makes nothing. A card in the team is kept.

**UNITS, STRUCTURES and the INDEX.** UNITS and STRUCTURES are two buttons on the main screen, and each says on its corner how many stand of how many may, in red when a place is free and a card could take it. Each opens a side screen, on which the two are tabs, so one press leads from one to the other: the cards you hold on the left, and your half of the field on the right with the enemy put away, so a change to the team is seen on the field as it is made. A card's panel says its role beside its tier and its set. SORT steps through unit, power, grade, level, rarity, health and damage. FILL TEAM fields the strongest team with a mix of roles, and the strongest structures. INDEX, on that screen, is the page of every unit there is.

**Structures.** A structure is a building or a trap, and it is a card like any other. A building stands where it is put: a Watchtower shoots whoever comes within its reach, a Barracks sends out Militia, a Palisade stands in the way, a War Banner makes those near it fight faster. Nothing mends a building. A trap lies flat with a ring of its side's color round it, is no one's target, and goes off once under the first enemy to step on it. Structures stand in places of their own beside the team: one from the start, a second from stage 20, a third from stage 37, so a tower takes no fighter's place. The enemy has them too: each land has a tower, a hall that sends its troops out, and a trap, and they stand in its stages. A side has lost when every unit and every building of its own is down, so a tower left standing has to be brought down too. A trap holds nothing.

**Summoners.** A summoner is a unit that fights little and calls others to its side, as strong as it is: the Herald calls Militia, and each land has one of its own (the Ringleader, the War Drummer, the Skald), which stands in a few of its stages. A summoner calls three in a battle and a hall four, so a long fight does not feed itself.

**Packs.** Every pack holds one card. A pack names its set and the grades it can hand out, and holds everything of its set from the start: nothing in it has to be unlocked. A land's pack turns over one of its structures about one time in five. The Recruit Pack holds people only, and the Builder's Pack holds only the Crownlands' structures; both are sold from the start.

**The packs screen.** Every pack has a slot of its own, small, laid out as the cards on UNITS are: the four that are no land's along the top (the last of them the Faithful Pack, which is given and never sold), then a row to a land with a slot to each difficulty. Pressing a slot brings that pack up on the right, big: the grades it hands out, a tile for everything it can turn over (a unit you have not met is its outline in the dark, on no tier's color), and how likely each tier is. Pressing a tile says what it is and how likely. OPEN opens one, and the button beside it opens as many as you hold, up to ten. A pack that is not sold yet says what opens it.

**Opening a pack.** The pouch shakes, a light in the color of the best thing inside gathers behind it, and it bursts. One pack: its card rises out of it and turns over, rays turn behind a Rare or better, and its grade is stamped on a moment after. Several: the cards are dealt face down and turned one after another, the rarest last, and a press turns the rest at once.

**Battles.** Your tiles are the left half of the field. Units walk to the nearest enemy, attack on their own rhythm, and use their skill whenever it is ready. Over each unit is its plate: its level on the color of its tier, its health as a bar with the number on it, and its grade. The plates are up before the battle too, on both sides. A status on a unit is an icon over its plate with motes rising from the unit, and what it takes is a number in the status's own color, so poison is not read as mending. Press an enemy for a card that says what it is, which stays until something else is pressed; between battles, press one of your own to open its card in UNITS. A battle is won when every unit and every building of the other side is down. A battle lasts about 20 to 40 seconds.

**The field grows with the stage.** The first world is fought on a field of 8 by 4 tiles, the rest of the first lap on 10 by 5, and every lap after on 12 by 6. Every field is drawn in the same place on the screen: a bigger one has smaller tiles, and everyone on it is drawn smaller. A stage's enemies are written on the first field; on a bigger one they keep their depth behind their front line and are spread over its height. Your team's formation is kept as it would be written on the first field, so it is the same formation on every field, with more room behind and beside it on a bigger one. The first time the line comes to a bigger field, the team forms up again for it. Back on a smaller field (an early stage, a dungeon's first tier), whoever stood beyond it comes in to the nearest free tile for that battle, and the formation you set is not changed.

**Battles start by themselves.** BATTLE counts down two seconds and presses itself. A first win moves on to the next stage. A win at a stage already cleared stays there, so a team left alone earns from a stage it can beat. A loss steps back one stage, and a changed team goes back to the stage it lost at. AUTO stops battles starting by themselves; the count also waits while a screen is open or a unit is being dragged.

**A battle has the screen to itself.** While one is fought, and while its result is up, every way into another screen is put away: UNITS, STRUCTURES, PACKS, DUNGEONS, RAIDS, your level, the rewards and the settings. What stays is the battle's own: STOP, which gives it up and opens nothing, AUTO, and the speed. The stage's banner stays as a heading and opens nothing. A tap on anyone on the field, yours or theirs, says who they are.

**The line of stages.** There is one line of 185 stages, and a stage's place on it says how hard it is: enemies grow stronger along it, and so do what a win pays, what it teaches and the price of the pack it drops. A world is a land: World 1 is Thornwood, World 2 Sunscar Dunes, World 3 Frostholt. Each land has minibosses and ends in a boss. A stage is shown by its number in its own difficulty, from 1: the line's 38th stage is stage 1 on Hard.

**Difficulties.** Every world has five: Normal, Hard, Expert, Master, Nightmare. The line runs through the three worlds on Normal (its first 37 stages), then through all three on Hard (its next 37), and so on, so every stage of every world on every difficulty has its place on the one scale. A world opens on a difficulty when you have beaten it on the difficulty before, and beaten the world before it on this one. Following the line, each opens in its turn. What the rule adds is that Thornwood on Hard opens as soon as the Warlord falls on Normal, before the other two worlds are beaten: its first stage is the line's 38th, which is how far ahead that is. Stages won ahead of the line are kept, and counted when the line comes to them. Places in the team, places for structures, dungeons and raids open by how far the line itself is cleared, in order.

**The map.** The main screen shows only the stage you are on, under the banner of its world, which says its difficulty on a chip in that difficulty's color. Pressing it opens the map of that world: a painted land with a road from stage to stage, a camp at each, a watchtower where a miniboss waits and a stronghold for the boss. Press an open stage to go there. A row of the five difficulties stands under the heading: an open one turns the map to it, and a shut one says what must be beaten to open it. The arrows turn to the worlds on either side on the same difficulty, if they are open.

**After a battle.** The result says what was won as pictures of the things: the coins, each kind of pack that dropped, the experience. Then the cards that made a level, as the units they are, each with its new level. Then your own level and what the battle added to it. Then whatever the win opened. It goes on by itself after a few seconds, and a press anywhere on it, or on CONTINUE, goes on at once. The next stage is standing the moment the result goes: its art is brought in while the result is read.

**Your level, the skill tree, and upgrades.** A battle teaches you what it teaches each card that fought, won or lost. Each level is a skill point. The tree has four branches from one root: War (harder blows), Guard (more health), Craft (stronger structures) and Fortune (more coins, faster learning, more packs dropped, cheaper packs). It has 51 ranks and a player who walks the whole line earns about 35 points, so it is a choice; every point can be taken back, for nothing. Coins also buy five upgrades, each level dearer than the last: Whetstones, Rations, Seasoned Timber, Ledgers and Tutors. Your level stands under your coins on the main screen, with a red mark when there is a point to spend or an upgrade the coins will pay for, and pressing it opens both.

**The team.** A new player has an Archer, a Knight, a Cleric and a Watchtower: one who shoots, one who stands in front, one who mends, and a structure. There are four places for units from the start and more at stages 5, 10, 22 and 37, up to eight, with up to three structures beside them. A unit dragged to another tile stays there.

**Dungeons.** A dungeon is a run of floors fought one after another with one roster: your team and two reserves. Nothing heals between floors and the fallen stay fallen, so the camp between floors shows what each card has left, and pressing a card sends it in or rests it. A floor lost ends the run. Only clearing the last floor pays: coins and two of the land's pack one lap better than the line is dropping there.

**Raids.** A raid is one long battle against a land's lord, grown huge, who calls up more of his own for as long as he stands. Every win pays, more than a dungeon, and it can be fought again at once.

There is one dungeon and one raid to a land. The dungeons open at stages 10, 22 and 37 and the raids at 22, 37 and 47. Each has the five difficulties too, each opened by clearing the one before. DUNGEONS and RAIDS, at the top left of the main screen, each open a hall of their own; RAIDS is not there until the first raid is open.

**Rewards.** The rewards' button is under your level on the main screen and opens two tracks. With nothing to claim it is a quiet plate that says how many minutes it is to the next gift. With something to claim it is gold and bigger, it breathes, light turns behind a gift that shakes, and it says CLAIM! and how many wait. No tutorial speaks of the rewards: the button is left to do that. The daily calendar has seven days: one is claimed each day you come back, by your own clock. It is not a streak, so a day missed loses nothing. Its second day gives the Lamplighter and its seventh the Honor Guard, two cards no pack holds. After the seventh it goes round again, and those two come a grade better each time. The other track is the time played today: 2, 5, 10, 20 and 30 minutes each give something, and ten minutes gives the Faithful Pack, which no shop sells. The time is counted only while the game is on the screen, and it starts again each day, with its rewards. Coins and packs given are sized to where you stand: so many wins' worth of coins, and the pack of the land your line has come to.

**The Faithful.** A set of six that only the rewards give: the Beekeeper, the Gravedigger, the Bell Ringer and the Blacksmith out of the Faithful Pack, and the Lamplighter and the Honor Guard from the calendar. They are townsfolk, not soldiers, sized between the second land's units and the third's. The Faithful Pack has one slot in the shop, dark until you have been given one, and its grades rise with the difficulty your line has come to, as a land's pack's do.

**Tutorials.** A new player is shown the first battle, a pack, the team, the structure and the stage's plate, a line of words at a time. Which step is up is worked out from the save, so a reload in the middle carries on. After it there are tours, a few short notes each: the packs, dungeons, raids, skill points and upgrades. A tour starts by itself the first time its part of the game matters (coins enough for a pack or an upgrade, a level made, a dungeon or a raid open), and never straight after another: two battles are fought between them. A tour ends on the screen it led to, with everything there free to be pressed, and every step has SKIP. The settings list every tour, and any of them can be viewed again there; one you have not come to yet is dark.

**Screens.** A menu opens as a window over the field and leaves a border of the field showing round it, so it is plain what it was opened over. The units screen is a side screen instead, as it changes what stands on the field.

**Settings.** The gear on the main screen. Sound on or off, a volume each for the music and for the effects, how the game is drawn (AUTO picks for the screen and draws plainer if frames come slowly, SHARP keeps the screen's own sharpness, FAST draws plainer), whether the screen shakes when something rare is turned over, the list of tutorials, and START OVER, which asks once and keeps only the settings.

**Music.** Each land has a theme of its own, sixteen bars long, played on recorded instruments: Thornwood a dance on a flute, the Sunscar Dunes a slower tune on an oboe over hand drums, Frostholt a harp with small bells over its long notes. Under each, cellos hold the chord and a bass is plucked. While the team is being set out it is calm. When a battle starts the same bars go on with drums under them and a flute an octave over the tune, and when it ends they fall away again.

**What you have not met is dark.** A unit you have never held or beaten is a black outline named "???". So is a pack that is not sold yet, a pack or a card of the rewards that you have never been given, a dungeon or raid that is not open, and a tutorial for something you have not come to. A stage that is not open is a lock on the map.

**Skirmish.** `?seed=N` in the address plays the first four units against four random enemies. The same seed and the same placement always give the same battle. It is for testing, and no button leads to it.

Press `D` in a battle for the debug overlay: tiles, ranges, targets, frame rate, and how full the art sheet is.

## Where things are

| Folder | What is in it |
| --- | --- |
| `src/sim` | The battle. Pure TypeScript, no Phaser. Fixed 50 ms steps, a seeded generator, events for the view. `field.ts` is the field: its size, and where a team written on the first field stands on a bigger one. |
| `src/data` | The numbers: units (structures, summoners and the Faithful among them), the lands and their stages, the laps, the fields, the line of stages, packs, dungeons and raids, the rewards. |
| `src/game` | The rules around the battles: cards and combining, sorting, packs, progress and which worlds are open, the run of battles, dungeons and raids, the player's level, tree and upgrades, the bonuses those give, the rewards, the tutorials, the save. Pure TypeScript. |
| `src/art` | The art, as code. `kit/` is the palette and the reusable parts, `units/` is the cast, `scenery.ts` and `backdrop.ts` are the painted scenes. The kit draws 202 units in sixteen sets (soldiers, townsfolk, beasts, riders, golems, siege engines, buildings, traps), of which this game has 47: `docs/art/roster.md` lists every one, with its set, its role and how it is read. The art build writes only the ones the game's data names. |
| `src/audio` | The sounds and the music. `bank.ts` reads the bank of recorded sounds (`public/assets/audio/bank.bin`), `sfx.ts` is the effects and the mix they and the music share, `music.ts` is the themes and what plays them. |
| `src/view` | Phaser: the scenes, the board, the unit rig, effects, the interface. |
| `src/platform` | What a portal gives the game and asks of it. `ads.ts` is the calls the game makes (loading, play, ads, a cheer); `crazygames.ts` sends them to CrazyGames' SDK and keeps the save in its data module; `portal.ts` decides whether there is a portal at all. |
| `scripts` | Art generation, contact sheets, the bank of sounds, balance and journey reports, browser walks. |
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

It plays twelve new players along the line by the game's own rules and prints, for each world, how many battles it took, how many were lost, how long a battle lasts, and how strong the team was when the boss fell. `--losses` lists the stages that beat players most often, which is where the walls are. Without `--worlds` it plays the first three. `--bare` plays players who spend no skill points and buy no upgrades, to see what those are worth. A player who gives up at a wall is named at the end, with the team they stood there with, who held the stage, what they had left to spend and how one more battle there went; `--player=4` plays only that one again, in a few seconds. As last measured on 24 November 2026, after the starting team became an Archer, a Knight, a Cleric and a Watchtower and a battle came to need every building down: twenty-three of twenty-four finish the line, half of them in under about 290 battles, the slowest in 911. One stalled at the Colossus on Expert, which the run before those two changes did not show.

| World | Stages | Field | Battles, half took under | Lost | A battle |
| --- | --- | --- | --- | --- | --- |
| Thornwood, Normal | 1 to 10 | 8 by 4 | 14 | 19% | 23 s |
| Sunscar Dunes, Normal | 11 to 22 | 10 by 5 | 54 | 43% | 26 s |
| Frostholt, Normal | 23 to 37 | 10 by 5 | 35 | 27% | 32 s |
| The three on Hard | 38 to 74 | 12 by 6 | 12, 12, 17 | 28%, 12%, 17% | 32 s |
| The three on Expert | 75 to 111 | 12 by 6 | 15, 12, 17 | 33%, 8%, 12% | 34 s |
| The three on Master | 112 to 148 | 12 by 6 | 10, 12, 15 | 10%, 13%, 2% | 32 s |
| The three on Nightmare | 149 to 185 | 12 by 6 | 10, 12, 15 | 60%, 24%, 17% | 37 s |

The simulated players are plain. They follow the line and never try a difficulty ahead of it. They buy the dearest pack on sale, combine every copy into the best card of its unit and every idle card into their team, and press FILL TEAM. They spend each skill point as it comes, on what makes the team fight better first and on Fortune last, and buy any upgrade that costs no more than the dearest pack on sale. They never arrange their team by hand, so nothing here says what good placement of a tower or a trap is worth. Read what half of them took before the average: one player in twenty-four took 473 battles over Thornwood on Nightmare and one never passed the Colossus on Expert, which are the nearest things to walls, and Frostholt on Master is a soft spot. The stage lost most often is the Long Stair, the tenth of the Sunscar Dunes on Normal: twelve or thirteen times a player. The table's stages are places on the line, not the numbers a player is shown.

**The one who stalled** says something about the second half of the line. Their eight cards were all at the level cap, 20, at grades A and B, so no battle could teach them more, and they had spent every coin on packs and upgrades. Stood before the Colossus on Expert forty times, that team won none; with its three B cards made A it won five, with everything at S all forty, and with a Colossus of their own in a support's place twenty-eight. The other twenty-three lost there once in ten battles. So from about the middle of the line a team grows only by better grades, by the tree and by upgrades, and a player whose packs have not been kind can be held at a boss until one is. A real player has ways out that the simulated ones do not use: a dungeon's or a raid's packs are a lap better than the line's, and a team can be chosen and set out by hand. Whether those are enough has not been tried.

**The line was weighed three times on that day.** Structures, summoners and bigger fields made it shorter in battles than it had been (half of twelve players took under about 730 before them) and its battles longer (they were 20 to 28 seconds). Then the player's own level, tree and upgrades made everything they field about a third stronger by the end, and the last stage of all was raised from 7 to 9 (`TOP` in `stages.ts`) to keep the later difficulties a fight.

**A structure or a summoner in a stage** is strong for what it is. The first tries stood a tent beside each land's boss, and the Colossus then beat simulated players a hundred times each; a tent that called without end made one stage of Thornwood a wall on every later difficulty. So no boss has a hall beside it, every caller has an end to whom it calls (`total` on `summons`), and a difficulty counts a caller as four. Measure after adding one.

**The player's level, the skill tree and the upgrades** are in `src/data/player.ts`: how much experience a level takes, each node of the tree (its effect, what a rank gives, what it needs), each upgrade (what a level gives, what the first costs, how fast the price grows). **Every bonus is added up in one place**, `src/game/bonuses.ts`: a source is one entry in `SOURCES`, and the fights, the pay, the experience, the drops and the price of packs all ask `bonus(save, effect)`. A new source of bonuses is one entry there and nothing else.

**Grades, levels and tiers** are in `src/game/rarity.ts`. **Combining** is in `src/game/cards.ts`. **Team size and drop chance** are in `src/game/rules.ts`. **Packs** are in `src/data/packs.ts`. **Dungeons and raids** are in `src/data/expeditions.ts`, and what they pay at the top of `src/game/expeditions.ts`. Nobody has measured how hard each tier of a dungeon or a raid is for the team a player has when it opens: they stand a little above the land's own boss on that lap, and that is all.

**The rewards** are in `src/data/rewards.ts`: what each day of the calendar gives and what each step of the playtime track gives, at how many minutes. Coins are written as wins' worth and a land's pack as `land`, so neither has to be changed when the line is. The rules are in `src/game/rewards.ts`, and they are told the day and never ask for it, so the tests turn the calendar's pages. In the game, `?days=2` in the address moves the clock two days on, and `addDays(1)` in the console does it while playing.

**The tutorials** are in `src/game/tutorial.ts`. `TOURS` is data: each tour's name, when it starts by itself, and its steps, each a screen, the name of what it points at there, and a line of words. `TOUR_GAP` is how many battles are fought between two of them.

**The music** is in `src/audio/music.ts`: a theme is a scale, a chord for each of sixteen bars, and a tune written in the steps of that scale, eight slots to a bar. A test holds each tune to its chords. **The mix** is at the top of `src/audio/sfx.ts`. How loud an effect is in it is its `level`, and how loud the band is `BAND` in `music.ts`; both were set by measuring. After a change, `npm run listen` writes it all to sound files and prints the levels. As last measured, at the volumes a new player has: the music by itself is 20 to 22 decibels under full scale, a crowded battle over it 16 under with its loudest peak 3 under, and with both volumes all the way up the peak is 2 under. Nothing clips.

## Adding things

**A structure.** A unit with `kind: 'building'` and `still: true`, or `kind: 'trap'` and a `trap` (what sets it off, how wide it strikes, what it leaves). A building can shoot (a `range` and a `projectile`), call troops (`summons`), or keep a status on those near it (`aura`). Its art has a shadow and a body and no weapon (`src/art/units/structures.ts`). A land's own goes into a few of its stages and comes out of its pack. **A summoner** is a unit with `summons`: who it calls, how often, how many at once, and how many in all.

**A field.** An entry in `FIELDS` in `src/data/fields.ts`, as much wider than tall as the others, and a rule in `fieldOfWorld` for which worlds are fought on it. `npm run art` paints its tiles for every kind of land. Nothing else names a field's size: the battle, the rules and the board all take it from the stage.

**A unit.** Look in `docs/art/roster.md` first: 155 units are drawn that the game does not have yet, and `npm run art:roster -- <set>` shows any of them. For one of those, add its numbers to `src/data/units.ts` under its id, and `npm run art` writes its pictures. For one nobody has drawn, add its art to `src/art/units` as well (see `ART_GUIDE.md`). Run `npm run art:sheet` and look at the sheets. Run `npm test`: it fails if a unit has numbers and no art, if anything in the kit breaks the style, or if the sheets the game packs its art onto are full. Each unit written adds about ten kilobytes to the build, which has to stay under 5 MB.

**A land.** Add an entry to `LANDS` in `src/data/lands.ts` with a `weight`, a set to `SETS` and its units in `units.ts` (ten sets in `docs/art/roster.md` were drawn to be lands: each has its troops, a captain and a boss, and most a beast, an engine, buildings and traps), and a pack in `packs.ts` with a look in `src/art/packs.ts`. If its kind of ground is new, add its colors to `src/art/board.ts`, its scenery to `src/art/scenery.ts` and its look to `LOOKS` in `src/art/backdrop.ts`, and an emblem to `src/art/icons.ts`. The line grows by itself: every lap gets the new land's stages. The tests hold a land to the rules: 10 to 25 stages, never fewer than the land before and never more than 5 more; one boss, at the end; a miniboss before it; only its own set's units. Then run the journey report and set the grades, levels and weight by what it says.

**A dungeon or a raid.** An entry in `src/data/expeditions.ts`: its land, the stage it opens at, and its floors written as stages are, or its lord, his guard and who he calls up. The tests go through every floor of every dungeon and every raid.

**A skill.** A skill is data on a unit: a kind (`strike`, `cleave`, `blast`, `volley`, `drain`, `mend`, `boon`, `hex`), a cooldown, and the kind's numbers. A new kind is a case in `useSkill` in `src/sim/battle.ts`, with a test.

**A sound.** A recipe in `src/audio/sfx.ts`: `hits`, the recorded sounds it is played on (which, how loud beside the others, how fast, when), a `level` for the whole of it in the mix, and the tones and bursts of noise it is made of where the bank is missing. One of a battle's small sounds says `crowd`, so that it is dropped when the air is full, and one that repeats says `vary`. The tests play every one both ways, and `npm run listen` says how loud it came out. **A recording** is a line in `scripts/samples.mjs`; a test fails on a sound in the bank that nothing plays.

**A tour.** An entry in `TOURS` in `src/game/tutorial.ts`. It starts on the main screen with a step that is pressed, leads into one screen at the most, and if its last step asks for CLOSE the player is back on the field when it ends. What a step points at must be marked on its screen by that name (`guide.mark('name', ...)`): a test reads the screens' own files and fails on a name that is not there. `node scripts/tours.mjs` then walks it in the game.

**A reward.** A line in `DAILY` or `PLAYTIME` in `src/data/rewards.ts`. A card given by name is a unit with `prize: true`, which keeps it out of every pack.

**A theme.** An entry in `THEMES` in `src/audio/music.ts`, under the name of the kind of ground it is for. Its `voice` says what plays the tune, and its `kit` what each of its drums is struck on. The test fails on a note that lands on a strong beat and is not in the chord under it, and on a note played far from where its instrument was recorded.

## Regenerating art, and editing it by hand

```bash
npm run art
```

writes the logo and its mark (`logo/`), `public/assets/units/<team>/<unit>/<part>.svg` for both teams, a whole-unit `full.svg` for the menus, the effects, the icons, the packs, the grade badges, the painted ground of a battle in each kind of land (`board/`), the tiles of each field on each kind of land (`tiles/`), the map of each land (`maps/`), and `public/assets/manifest.json`, which lists each unit's parts in draw order with their pivots.

To change a picture by hand, copy it to the same path under `art/overrides` and edit it there, in Inkscape or anything else. For example `art/overrides/units/blue/knight/head.svg` replaces `public/assets/units/blue/knight/head.svg`. The dev server serves your file straight away. `npm run art` never writes under `art/overrides`; run it after adding or changing an override so that the manifest measures your file, and a build copies overrides over the generated files.

Every part of a unit is drawn on the same 192 by 192 canvas with the feet at (96, 180), so stacking the parts at one place assembles the unit. A unit's file has 40 px of page round that canvas, because a long spear held level reaches past it: keep an override on the same page (`viewBox="-40 -40 272 272"`). The art build fails on a part that reaches the edge of the page.

The files in the repository are written to be read: every shape has an id that says what it is. A build makes its own copies small (unused ids gone, spaces gone), which is a third of their size. A test draws both and compares every pixel.

The covers (`npm run cover`) are put together from the same files, so a hand-edited unit or pack shows on them too.

## The art as a skill, and the game made with it

The way this game is drawn is packaged as a skill for Claude, in `.claude/skills/legion-art`: the rules of the look, the kit that draws it with the whole cast, the build and the contact sheets, the Phaser runtime that shows it, and how to make covers. Its install script copies all of that into an empty project, and one small file there says what the new game shows. Start with its `SKILL.md`.

It has been used once. **Legion Idle** is an idle game drawn with the same art, made from the skill: a legion in ranks on a painted road, heroes hired and leveled, a camp, abilities, rebirth. For now it lives beside this game in this repository, on the branch `claude/legion-idle-k1epdv`, which shares no files with this one. What that game added to the kit (a tighter packer, a ground with a road through it, a general build, more icons) is in the skill here too.

**The cast is shared.** After both games were made, 155 more units were drawn for whichever of them wants one: 96 soldiers and townsfolk in ten new sets and more of the Crownlands, thirteen beasts, five riders, three golems, nine siege engines, twenty buildings and nine traps. They are in this game's `src/art` and in Legion Idle's, the same files, and in the skill. Neither game uses one yet: giving a unit numbers, a land or a card is a change to the game and was not part of drawing it. What this game has taken of the kit is the cast and what draws it (`src/art/units`, `src/art/kit`, the three new movements in `src/art/poses.ts`, `scripts/roster.ts`). Its `scripts/art.ts` and `scripts/sheet.ts` are still its own, and `node .claude/skills/legion-art/scripts/sync.mjs . --check` lists where it and the kit differ.

## Remaking the bank of sounds

The bank is kept in the repository, so nothing has to be done to build the game. To change what is in it, get the two libraries it is cut from (they are not kept here: the orchestra alone is hundreds of megabytes), and then:

```bash
VSCO=/path/to/VSCO-2-CE KENNEY=/path/to/kenney_interface_sounds npm run samples
```

`scripts/samples.mjs` lists every sound: the recording it is cut from, how long it is kept, how it fades and how small it is written. It needs ffmpeg. `build/samples` gets each sound as a file of its own, to listen to. Afterwards run `npm test`, which fails on a sound nothing plays or a sound played that is not there, and `npm run listen`.

## How it is built

**Determinism.** The simulation's only randomness is a seeded generator, and its only arithmetic is addition, subtraction, multiplication, division and square roots, which every engine rounds alike. The tests run battles twice and compare every event. The line of stages is worked out with the same arithmetic, so every machine has the same line.

**Animation.** A unit is a rig of sprites, one to a part. Every movement is a pose, a set of offsets for the parts, blended in and out from the battle's own clock (`src/view/UnitView.ts`, `src/art/poses.ts`). A blow's swing is timed from the simulation's `attackStart` event to arrive on its `impact` event, at any speed. The contact sheet draws every unit at the far end of every pose with the same code the game uses.

**One sheet, and two pictures under it.** Every unit part, effect and icon is rasterized at 2x by Phaser's loader, cut to its own corners and packed onto one canvas texture (`src/view/Sheet.ts`). The ground of a battle is one painted picture the size of the screen (`src/view/Scenes.ts`), loaded when its land is come to, and the tiles of the field are a second picture laid over its slab, one to a field; one of each is held at a time. The game holds itself to one texture a batch (`maxTextures: 1` in `src/main.ts`). The last stage of all, with eleven of the player's pieces on the biggest field and as many against them, is about 48 draw calls a frame, most of them the interface's text and what stands on the plates. The whole units for the cards are on a sheet of their own, which is 2048 by 3584 since the Faithful came.

**A field on the screen.** `FieldLayout` in `src/view/layout.ts` is a field's tiles and its zoom: 1 on the first field, two thirds on the biggest. Units, shots and effects are drawn at that zoom. A unit's plate shrinks less than the unit does, as it is read.

**Frame rate.** The canvas is not multisampled on a dense screen, the faster of two graphics chips is asked for, and the board is not drawn while a screen is open over it. What does not change is not drawn again: a button's slab, a pill, a card's tile, a lit tile of the field are each a picture made once (`src/view/ui/bake.ts`). As drawings they were cut into triangles again every frame, which between battles was two thirds of a frame's script. The game watches its own frames: when most of them are slower than 45 a second for four seconds, it draws at half a step less resolution from then on and remembers that for the next visit. `?res=2` in the address fixes the resolution.

**Sharpness.** The game is laid out on 1280 by 720. On a dense screen the canvas is up to twice that and the cameras zoom to match (`src/view/config.ts`).

**Nothing allocated per frame.** Effects, damage numbers and shots come from pools. Damage numbers, and the level and grade on a unit's plate, are bitmap text from characters drawn once at start.

**Sound.** The game has one audio file, `public/assets/audio/bank.bin`, 446 KB: 69 recorded sounds as small MP3s laid end to end, with a list of their names at its head. They are cut by `scripts/samples.mjs` from two libraries that are in the public domain (CC0): VS Chamber Orchestra Community Edition, an orchestra recorded a note at a time with its drums, bells and cymbals, and Kenney's Interface Sounds. `public/assets/audio/CREDITS.txt` credits both. An instrument is a few of its notes, and the notes between are the nearest one played faster or slower. `src/audio/sfx.ts` plays each effect on a few of those sounds, and `src/audio/music.ts` writes the music down a note at a time on the same instruments, a third of a second ahead of the clock, so there is no recording of the music itself and a theme costs a few lines. The bank comes in with the rest of the game's files and is read in about a tenth of a second while the game goes on. Until it is in, and on a device that cannot read it, the same effects and notes are made from oscillators and filtered noise, as all of them once were. Both go through one mix: a volume each, then a limiter on the way out, so a battle of twenty units cannot clip. Three things keep a big fight from being a roar: the same sound is not started twice in a moment, one of a battle's small sounds is dropped when seven have begun in a tenth of a second, and each is turned down a little by how many are already in the air. A sound that repeats is never quite the same pitch twice running. The music turns down for a moment under a fanfare. A browser makes no sound until the page has been touched, so the first sound follows the first press, and a page that is hidden makes none.

**Tutorials on the screen.** `src/view/ui/Guide.ts` draws whatever step is up: a shade with a hole round what the step points at, a ring, and a bubble. A screen marks its things by name and asks the guide to look again when something changes. A step that asks for a press lets the press through the hole to whatever is under it, and moves the tour on when it is let go.

**The save** is one JSON object (`src/game/state.ts`), kept in the browser's local storage, or on CrazyGames in that portal's keeping (`src/game/storage.ts`, and "CrazyGames" below). It is at its fourth version, and each of the three before it is carried over when it is loaded: one card to a unit became cards of their own, and worlds with difficulties became the line. What has been added since needed no new version: a save without stages cleared ahead of the line, a player's level, a tree or upgrades is read as having none. A team's tiles are kept as the first field would write them: column 3 is the front line, and a bigger field has columns behind 0, written -1 and -2, and rows beside 0 to 3, written -1 and 4. So a save from before the fields grew needs no change. A run of a dungeon is not saved: leaving the game in the middle of one gives it up. If storage is blocked, the game plays and forgets.

**Portals.** `src/platform/ads.ts` is the interface the game speaks to a portal through: `interstitial()`, `rewardedAd()`, `gameplayStart()`, `gameplayStop()`, `loadingDone()` and `happy()`. Off a portal it is an implementation that does nothing. The game calls loading, play and the cheer in the right places already; it asks for no ad anywhere yet. Another portal is one new class and a line in `src/platform/portal.ts`.

## CrazyGames

### What to upload

```bash
npm run package:crazygames
```

builds the copy for the portal into `dist-crazygames/` and zips it to `build/legion-battles-crazygames.zip` (it needs the `zip` command; without it, `npm run build:crazygames` makes the folder alone). Four things go to the Developer Portal:

1. **The game's files**: everything inside `dist-crazygames/`, with `index.html` at the top and the `assets` and `bundle` folders beside it. That is 691 files and 4.6 MB (1.7 MB zipped), against the portal's limits of 1500 files and 20 MB for a game shown on phones. Every path in it is relative. **The portal does not take the zip.** Dropped in, it answers "Archive files are not supported, please drag and drop the files directly in the upload zone" (seen on 24 November 2026). The zip is only a way to carry the files to the computer the upload is made from: unzip it there, open the folder, select what is inside (`index.html`, `assets` and `bundle`) and drag those three into the upload area, not the folder that holds them, so that `index.html` is at the top.
2. **Three covers**, from `docs/covers`: `cover-landscape.png` (1920 by 1080), `cover-portrait.png` (800 by 1200), `cover-square.png` (800 by 800).
3. **Two preview videos**: `preview-landscape.mp4` (1920 by 1080) and `preview-portrait.mp4` (1080 by 1620). They are made into `build/video` and are not kept in the repository. See "The preview video" below.
4. **The form.** Game type HTML5, played in landscape, with mouse and with touch. Progress save: **"Yes, using the Data Module from the CrazyGames SDK"**; without it the module is off and the save stays in the browser. **"The game supports CrazyGames muting audio through SDK"**: yes. No ads are asked for by the game, no in-game purchases, no multiplayer, no chat, and it gathers nothing about the player beyond what the SDK does.

Words for the form, to change as you like. They carry no counts (of stages, lands, difficulties or units), by the owner's word of 24 November 2026: "DO NOT PUT ANY FIXED NUMBER, ITS GOING TO GET UPDATED".

> **Description.** Open packs, build your legion and watch it fight. Legion Battles is an autobattler: you field a team of cards, battles start by themselves, and every win moves you on along a long line of stages through different lands and rising difficulties. Collect units, towers and traps, combine copies to level them up, spend skill points, and take on dungeons and raid bosses. Come back each day for a reward.
>
> **Controls.** Mouse or touch. Drag your units to arrange them. Press BATTLE to fight, or leave AUTO on and battles start by themselves. Tap anyone on the field to see who they are.

After uploading, the portal's preview runs the game as CrazyGames will and checks it against their requirements. That is the first time it will have run on the portal: see "Not yet looked at".

### What the build does there

The copy made for the portal differs from the plain build in one thing: it asks for CrazyGames' SDK (HTML5, v3) when it starts. The plain build asks for it only on a page of crazygames.com, or with `?portal=crazygames` in the address.

What the game does with it (`src/platform/crazygames.ts`):

- **The save is kept in the SDK's data module.** For a guest that is the browser, as before. For a player signed in to CrazyGames it is their account, on every device, and when a guest signs in the SDK takes their save up or gives them the one their account already had; the game reads the save again at that moment and makes the main screen again from it. A save made before the game used the module is copied into it once. If the module refuses, the browser's storage keeps the save for that visit, so a setting missed on the portal costs the cloud and not the save. The save is about a kilobyte for a new player and grows with the cards held; the module holds a megabyte.
- **The player's name** on the portal heads the player's screen. A guest has none.
- **The portal's mute comes first.** When CrazyGames says the audio is to be off, the game is silent whatever its own settings say, and it listens for that switch being thrown.
- **The portal is told** when loading starts and stops, when a battle starts and stops, and of a boss's first fall, which it may cheer.
- Ads: the calls are wired (`interstitial()`, `rewardedAd()`, with the game silent while one plays), and the game makes neither of them anywhere yet.

The two boxes of the form named above, the progress save and the mute, are the ones that have to match this.

The form also asks for three covers, and they are in `docs/covers`: `cover-landscape.png` (1920 by 1080), `cover-portrait.png` (800 by 1200) and `cover-square.png` (800 by 800). They are one picture laid out three times, drawn by `scripts/cover.ts` from the game's own art: a battle about to be joined. Two armies stand on a field, the player's blue from the left and the enemy's red from the right as on the title's shield, some seventy figures on the wide cover and fifty on the others: towers, halls and banners at the back with a keep far off behind each, rank on rank of soldiers, and in front, big, a Knight and the Warlord with their blades pointed at each other. Over the road between them hang three cards, in the light that goes up from the three packs at the front. The title is small, at the top, and is the brightest thing on the cover: it stands in a light of its own, with a bright edge and its gold polished. Every figure has light laid over it from the middle of the picture and shade on its far side, the near ones have a bright edge, the cards and packs a streak of light across them, and stars sit on the blades. The ground is a walked-on field, not a green floor: it rolls back in bands, a road of trodden earth runs through it, each side's color lies over its half, and it has fences, logs, stumps, rocks, mushrooms and flowers. The covers carry no words but the title and no border, which the portal asks; that is why a card on a cover has no name and no grade on it. `npm run cover` draws them again after the art has changed (`npm run cover landscape` for one), and the layouts at the foot of the script say who stands where. `npm run cover poses` draws the leaders one by one with their weapons up, to `build/covers/poses.png`: how a weapon is held on a cover (`READY` in the script) is set by looking at that.

To try it before uploading, run the dev server and open `http://127.0.0.1:5173/?portal=crazygames`. On localhost the SDK runs in a local mode: it logs each call to the console, keeps the data module in the browser, and answers as a signed-in player called User1. `&user_response=logged_out` makes that a guest and `&muteAudio=true` throws the mute. That is how it was tried here, against the SDK itself at version 3.8.0; `tests/portal.test.ts` holds the same things against a stand-in.

### The preview video

The portal plays a short video when a player rests on the game's cover, and asks for it in two shapes: landscape, 1080p in 16:9, and portrait, 1080p in 2:3. Both are 18.8 seconds long, without sound, and both are made from the game itself by two scripts, into `build/video`. Nothing there is kept in the repository, the videos among it: they are 14 and 9 MB, and are made again whenever the game changes, in about half an hour.

```bash
npm run dev                                          # the game, for the film to be made of
npm run video:film                                   # plays the shots and photographs them: build/video/frames
npm run cover -- portrait width=1080 out=build/video # the cover the portrait video opens on, at its size
npm run video:cut                                    # cuts and encodes both videos: build/video/preview-*.mp4
```

1. **Film** (`scripts/video.ts`). The game is played for real in a browser, by a player well into it whose save is made with the game's own rules. The page's clock stands still and the script moves it one frame of the game at a time, photographing every second frame at 2880 by 1620. So a picture of the film is a thirtieth of a second of the game however slowly the machine draws, and a film made twice is the same film. A shot is a save and a few lines that say what the player presses. `npm run video:film sheet` plays the shots small and lays a picture of every half second side by side (`build/video/sheets`): that is how the part of a battle to film is chosen.
2. **Cut** (`scripts/videocut.ts`). The plan at the foot of the script says which frames of which shot follow which, and where the camera is: a window on the game's screen that may move and close in while a clip plays. The landscape video's window is never smaller than 853 by 480, at which the film is shown pixel for pixel. The portrait video's is a slice of the screen at its full height, 480 wide, that follows the fighting: **it has no bars**, as the wide picture shrunk into a tall frame would. `npm run video:cut frames=0,120,300` draws those frames alone, to look at before the whole is cut.

What the portal asks of a preview, and how it is kept: it opens on the cover; nothing is sped up (the game runs at its 1x); there is no black screen, bar or title card, no pointer, no words but the game's own, and no sound. Its length is to be 15 to 20 seconds.

The shots, in the order the cut shows them: the cover, for half a second, which melts into the Warlord's stage in Thornwood, from the whole screen in to the fighting; six Expert Dunes Packs opened at one press, the Sandstone Colossus turned over last (the pack roller is set to the state that deals that hand, found by trying states with the game's own `openPacks`); the screen of units, and FILL TEAM setting the legion out; the Colossus's stage in the Sunscar Dunes; and the Jarl's stage in Frostholt: the lines meeting, the Jarl's fall, and the result with what the win paid. Each battle's player holds the same legion at a grade and level tried against that stage with the game's own battle rules, so that the fight is long, close and won. A new shot is a few lines in `SHOTS` (video.ts) and a clip in `PLAN` (videocut.ts).

## Left out of what the Roblox game has

Dungeons and raids are modelled on the owner's Roblox autobattler, and are smaller than its: a raid is fought on the field of its tier with the same team, not on a field of its own with three times the team; no unit raises the fallen; and a dungeon's enemies are its land's own units, not a set met nowhere else, so its prize is a better pack of that land and not a pack of its own. No structure takes more than one tile.

## Not yet looked at

- The preview videos were looked at as still pictures: sheets of a frame every half second, and single frames up close, of both shapes. Nobody has watched them play, so whether a cut jars or a camera moves too fast is not known. They have not been uploaded, and that the portal takes 1080 by 1620 for its portrait video is read from its documentation.
- The game is laid out for a wide screen. On a phone held upright it is a strip across the middle with the page's dark ground over and under it. On CrazyGames the submission says which way a game is played, and the site asks a player to turn the phone: the answer there is to be landscape only. On any other site nothing asks them to.
- The game has only been run in a headless Chromium with a software renderer. It has not been played on a real phone or a real graphics chip. What was measured is the script side (28 ms a frame in the last stage's battle with the processor slowed four times, with eleven of the player's pieces on the biggest field, where a battle of sixteen units took 17; a quarter of that unslowed; the software renderer's own work is in it) and the draw calls (about 48, up from 37 since the plates carry the health as a number and a status has an icon). What a real chip does with it nobody has seen, and the changes made for the frame rate are the usual ones, not ones measured on a device.
- The CrazyGames SDK has been run only in its local mode, on localhost. Nothing has been uploaded: the game has not been through the portal's preview or its checks, and a real account's save moving between two devices, a guest signing in halfway through a visit, and the portal's own mute button have each been tried against a stand-in and never against the portal.
- CrazyGames lists the sizes its frames come in, down to 821 by 462 on a desktop and 800 by 450 on a phone. The game is laid out on 1280 by 720 and scaled to fit, so there its smallest words (the health on a plate, the line under the stage) are about 8 px tall. The main screen was looked at once at 821 by 462 and reads; no other screen was.
- What the optimization pass gained was measured as script time with the processor slowed four times, in a browser that draws in software. A frame's script on the main screen between battles went from 42 ms to 9, on the packs screen from 55 to 21, on the player's from 47 to 15, on the units' from 30 to 13, and the frame a battle ends in from about 80 to under 40. What a phone's graphics chip makes of it nobody has seen. Bringing a new enemy's art onto the sheet is still one upload of the whole sheet: it now happens while the result is read, not as the next stage stands, and a press on the result in its first second can still meet it.
- The rewards' button was looked at in still pictures. That it breathes, turns and shakes is in the code and has not been watched.
- At the last battle of a land the screen is made again for the next land. Its painted ground is asked for while the result is read, so it should be at hand, but there the next stage is not there in the same frame as elsewhere.
- Nobody has listened to the sounds or to the music where they were put together. The recordings are of real instruments, and each was checked by measuring: that it is at the pitch its name says (the worst is a third of a semitone off, on one plucked bass note), where it starts, and how loud it is. The tests check that every effect is played on recordings the bank has, that no note is played far from where its instrument was recorded, and that every note of a tune that lands on a strong beat is in the chord under it; `npm run listen` has measured how loud everything is and that nothing clips. Which recording suits which effect was chosen by what each is, how long it is and how bright, not by ear: whether a blow, a spell or a click sounds right is for someone who can hear it to say. The three themes were written by the rules of harmony by something that cannot hear them.
- The rewards, the settings and the tours were looked at in screenshots at 1280 by 720 and walked with a mouse by scripts; the first tutorial and the tour that follows it were also walked with touches on a phone's screen. The settings and the other tours were not tried with a touch. The volume's pips are 24 units wide on the 1280 layout, narrower on a phone; the buttons to either side of them are there for that.
- The graphics setting changes the canvas while the game runs. A script does that in the headless browser and checks the canvas's size each time; whether it is smooth on a real phone is not known, and the canvas is multisampled or not as it was when the page opened, until the next visit.
- The clock the rewards go by is the player's own. Setting it back claims nothing, but setting it forward claims tomorrow's day today: nothing stops that, as there is no server.
- Five tours over a new player's first quarter of an hour may be many. They are spaced two battles apart and each can be skipped; how it feels has not been tried on a person.
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
- The 155 units drawn after the game was finished are in the kit and not in the game. Each was looked at on a sheet, standing still and at the far end of its blow, in blue and many in red. None has been seen walking, struck or falling, on a board at the size the game shows it, on a card, or beside the first cast in a battle. The three movements written for them (a beast's bite, an engine's lob, a ram) have been seen only as their two end poses. A rider and a siege tower stand taller than anything in the first cast, and whether a plate over one stays on the screen in the back row has not been tried.
