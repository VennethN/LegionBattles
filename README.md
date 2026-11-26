# Lastander

A hero survival game for the browser. You choose a hero, who has a name, a weapon of their own, a quirk and one great move, and a companion to go with them, and the waves come. You steer; what you carry strikes by itself. Between waves you level and trade in the camp. You hold out for as long as you can.

It is being reworked: `docs/design.md` says into what, and `docs/journal.md` how far that has come.

It is the third game drawn with the Legion art (after Legion Battles, an auto battler, and Legion Idle), and uses the same kit: every picture is drawn in code as SVG, nothing has a face, and its cast is the kit's.

It was made in one sitting, in a cloud session with no screen and no sound. The end of this file says what nobody has looked at yet.

## How it plays

- **Move.** WASD or the arrow keys, or hold the mouse or a finger down anywhere and drag: that is a stick wherever it was put down. P pauses.
- **The skill.** Kills fill the Fury bar. When it is full the hero's skill can be cast: by the space bar, the other button of the mouse, or its button in the corner under a thumb. It comes about twice a wave early and three or four times late. On a player's first run it casts itself when there is a crowd for it; from the second run on it is the player's to cast, and the game says so once (AUTO, in the pause panel, turns it back). Every skill asks for something: where to stand, which way to face, or when.
- **A wave** lasts twenty seconds at first and thirty-five by the sixtieth, a boss's until it falls (forty-eight at the most). Enemies are marked on the ground a moment before they stand there, and come from every side. Stay alive until the clock runs out and whoever is left leaves the field. Coins still on the ground then come to you, but count for half: fetching them in time is worth doing.
- **What you carry** strikes whoever is nearest and in reach, each thing in its own time. A hero has a weapon of their own, which nobody else can have: it takes no weapon slot, is never sold, grows a tier by itself at levels 5, 10 and 15, and learns a rule at each (three to a weapon; the camp shows them when the weapon is pressed). Besides it there are twenty-nine weapons to buy and six slots to carry them in.
- **Weapon types.** Every weapon is of one type or two: Blade, Polearm, Blunt, Bow, Thrown, Fire, Frost, Holy, Poison, Arcane. Holding two, three and four of a type gives that type's set bonus, more at each step. The hero's own weapon counts. The camp says what is held of each, and pressed, what that gives and what one more would. `docs/design.md` has the table.
- **Coins** are left by the fallen. They are what the camp takes, and they are experience too.
- **The camp**, between waves. For every level made, one of four things to raise; now and then one of them is a bond with a companion who is along, three steps each. Then four wares: weapons and things. Two weapons of a kind and a tier can be joined into one of the next tier, up to the fourth. A ware can be locked, to be there next time. Other wares can be asked for, at a price that rises.
- **Enemies** do different things, and each warns of it. Some walk at you. Some keep off and shoot what can be stepped out of. Some stop, turn and charge down a line shown on the ground. Some run in and burst in a ring shown on the ground. Some call others up, and some drum the rest on faster.
- **A hundred waves** in ten lands of ten: Thornwood, Blackwater Mire, the Sunscar Dunes, Frostholt, the Salt Coast, the Deep Mines, the Endless Steppe, the Hollow Court, the Clockwork City and the Ashen Forge. Each has its own ground, its own enemies and its own boss on its tenth wave, and an elite champion on its fifth. Beat the boss and the wave is won at once. It leaves a pack, which holds a thing for nothing, and a relic to choose. The later lands bring new ways of fighting: blows that fall on marked ground, enemies who ward or heal the others, who get up once, who split, who circle as they shoot; and their bosses each have a way of their own (mud, a broadside, a cave-in, three charges, a crowd spurred on, the fallen raised, a hammer's ring). `docs/design.md` has the table.
- **The road.** Out of the camp there are two roads to the next wave, each with a risk and a reward, and one is taken. No road is free: the plain wave is not on offer. Twenty-six roads: six that come anywhere (the Horde, Champions, Forced March, Toll Road, the Duel, the Wounded) and two that are each land's own. `docs/design.md` has what each risks and pays. A boss's wave has one road. On wave 3 of every run a lone champion walks in, and killing it drops a relic.
- **Relics.** Twenty-six, each one of a kind, each bending a rule and saying exactly how: enemies that die burning set nearby enemies on fire, every 4th hit of your own weapon hits twice, once per wave a killing blow leaves you at 1 HP, every 8 s lightning strikes the toughest enemy, 1 in 8 enemies you kill fights for you, deal 2x damage and take 2x. A boss leaves one of three to choose, so do the champion of wave 3 and the roads that pay one, and now and then the last of the shop's items is one, at a high price. A run holds as many as it finds, and the camp shows them.
- **After the hundredth wave** the same hundred come round again, far harder each time. How many waves a hero came through is the score. A full run is about forty minutes of fighting as the computer player plays it, and is kept at every camp, so it is played over several sittings.
- **Heroes.** Ten, each with a name, of whom one, Wren Fallowmere the archer, is unlocked at the start; Bram is unlocked by finishing a run, and the rest by feats. Each has a weapon of their own, numbers of their own, a passive that is played, and a skill. Bram Oakenhold raises his shield when he stands still, and it blocks shots from the front. Wren Fallowmere deals more damage every second nothing hits her. Orrin Quillon's staff copies the last weapon he bought. Fenn Two-Coins flips a coin for an item once per camp, and deals more damage the more coins he holds. Burning enemies near Old Nan Cinderwick never stop burning, and burn hotter each time she lights them again. Isaura Vane readies a 2.5x thrust by riding in a straight line. Hroth deals more damage and heals on kills below 33% HP, and survives a killing blow once per land. Brother Aldous Bell brings one companion more. Ysolde Rimeheart freezes slowed enemies by hitting them again. Maren Dawnguard's hammer leaves holy ground. `docs/design.md` has them all in the game's own words, with their skills and what their weapons learn. The rest are unlocked by clearing a wave, beating a boss, collecting coins in one run, kills over all runs, or runs finished.
- **Companions.** Sixteen. Biscuit the war hound is along from the start. They go in slots: one at the start, and one more each time the best wave ever cleared passes 10, 25, 40, 60 and 80, six at the most. The more there are, the less each one is (each has 1/sqrt of what one alone would have), so six are about two and a half times one. A companion is unlocked by clearing a wave, by a quest, by a hidden quest of which only a riddle is told, or found: from some wave on, a cage may stand on the field with it inside, and breaking it unlocks it for good. Each fights by itself and has a passive of its own (`docs/design.md` has them all). A companion has HP: downed, it sits out for a few seconds and recovers, and it is whole again at each camp. It grows with the hero's level.
- **The Hold** is what is kept between runs, behind THE HOLD on the list of heroes. What grows there is **each hero's mastery**: every run pays the hero who played it when it ends, whatever became of it, for each wave come through, each boss beaten, the win, each quest done in it, and a fifth more for every vow it was sworn under. Each hero has a track of twelve levels, each unlocking something for them alone: stat steps, more damage from their skill, Fury that fills faster, a second and a third passive of their own, the second way of their own weapon, a relic to start every run with, a title, and two picks of one of two that can be changed at any time. There is no renown and no board any more: mastery is the one thing gathered.
- **The armory.** A first run is offered twelve of the weapons, sixteen of the wares and ten of the relics. The rest come in nine crates, each a theme (the Fletcher's is bows, the Chandler's is everything that burns). A crate is unlocked by its own quest (hold three bows in one run, and the Fletcher's is unlocked). A crate's contents are shown first, "???" for what has never been met. A run keeps the armory it began with.
- **Vows.** A first win opens the first three, and more open as runs are won under them: eight in all, sworn in any mix in the Hold before a run. They come quicker; the camp costs more; the fallen leave no hearts; a champion walks in every wave from the third; one hand fewer; every wave by night; no rest between waves; a captain that falls gets up once. A hero's badge is the vows their best win was sworn under.
- **Quests** (deeds in the code). Besides the ones that unlock heroes, companions and crates there are twenty-nine that pay mastery once each. `nextDeeds` names the nearest not yet done, for the end of a run; a hidden one is never named.
- **The Daily Road.** One run a day with a hero, a companion and a seed that are the same for everyone, from the date: the whole armory, one slot, no mastery, no vow. How far it went and how long it was fought are kept.
- **The Chronicle** remembers every hero, companion, enemy, weapon, ware, relic and road that has been met, with a count for each (slain, runs, times taken). The rest are "???".
- **A run left in its camp** is kept: shut the page there and it can be carried on.

A new player lands in the field at once, as Wren with Biscuit, with the keys shown. The list of heroes comes after the first fall.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open `http://127.0.0.1:5175/`.

```bash
npm run check
```

That is the type check, every test and a build. All three have to pass before a commit.

| Command | What it does |
| --- | --- |
| `npm test` | The tests: a wave's rules, a run and the camp, the save, the art, the sounds, the portal. A few seconds. |
| `npm run art` | Writes every picture the game uses to `public/assets`, and the manifest. Run it after changing anything under `src/art`, or a hero, an enemy, a weapon or a ware in `src/game/data.ts`. |
| `npm run art:sheet` | Draws the contact sheets to `docs/art` and fails on a color off the palette or a line of the wrong width. Look at them after drawing anything. |
| `npm run art:roster -- [unit, set or role ...]` | Draws any of the kit's 202 units to `build/roster.png`. `-- check` holds every one to the style. |
| `npm run pace -- [--runs=12] [--hero=bram] [--band=biscuit,pip] [--friends] [--waves=40] [--brief] [--why]` | Plays runs with a plain computer player and says how many come through each wave, with how much health, how many coins and kills, how much of the wave the band was on its feet, and how many moves were let loose. `--band` names who goes along; `--friends` plays one hero alone and with each companion in turn; `--brief` is one line to a hero; `--why` says who hurt the hero on each wave; `--nomove`, `--noquirk` and `--nogrow` take a part of the hero away, to find what it is worth. The numbers in `src/game` are set by it. |
| `npm run walk [state ...] [--size=frame,small,full,phone-wide,phone-tall]` | With `npm run dev` running: pictures of every state of the game to `build/walk`, at a portal's frame sizes and on a phone. |
| `npm run smoke` | With `npm run dev` running: plays the game through its own buttons, with keys and mouse and then by touch, and fails if a press does not do what it says. |
| `npm run film` | With `npm run dev` running: films the game frame by frame to `build/film`, and says how to make a clip of it. It is how the game is seen moving where there is no screen. |
| `npm run light [scene ...] [--mode=full,low,off] [--size=907x510] [--film=6]` | With `npm run dev` running: pictures of the field under its light at each hour of each land, to `build/light`. `--mode=off` is the field with no light, to set beside them. `--film` films a scene. |
| `npm run cover` | Draws the three covers a portal asks for to `docs/covers`. |
| `npm run build:crazygames` | The copy to upload to CrazyGames, into `dist-crazygames`. `npm run package:crazygames` zips it to `build/lastander-crazygames.zip`. |

## Where things are

| Path | What is there |
| --- | --- |
| `src/game/data.ts` | Every number but the heroes' and companions': weapons, wares, what a level can raise, enemies, waves, prices. Each says what it is for. |
| `src/game/heroes.ts` | The ten heroes: who each is, the weapon that is theirs alone, and the numbers of every quirk and every move. |
| `src/game/companions.ts` | The eight companions, the numbers of each one's quirk, and what every companion shares. |
| `src/game/world.ts` | One wave as it is fought, with no screen: the hero with their quirk and their move, the companions steering themselves, the enemies, what flies, what lies on the ground. The same seed and the same steering give the same wave. |
| `src/game/kinds.ts` | The kinds of weapon and the numbers of each one's gift. |
| `src/game/relics.ts` | The relics, and the numbers of each. |
| `src/game/road.ts` | The omens, and the numbers of the road and of each. |
| `src/game/run.ts` | A run: who goes on it, what a wave leaves it with, levels and bonds, relics won and chosen, the camp's wares, buying, joining, selling, and the roads out of it. |
| `src/game/holdData.ts` | The Hold's lists: the crates and their quests, the vows, the quests and what each pays. `REF` at its top is every name of another list it leans on. |
| `src/game/mastery.ts` | Each hero's mastery track: what a run pays, the mastery each level needs, the heroes' second and third passives and their numbers, and each hero's own steps, relic and title. |
| `src/game/hold.ts` | The Hold's rules, as functions on a save: what a run pays, mastery and its tracks, the slots and how each companion is unlocked, what the armory has shut, what a run begins with, vows and quests, the day's road, the Codex. `record` in `state.ts` hands every wave and every run's end to it. |
| `src/game/stats.ts` | What a hero is, as numbers, and how lines of them add up. |
| `src/game/state.ts`, `storage.ts` | What is kept between visits, and where. |
| `src/game/bot.ts` | The plain computer player the pace report and the tests use. The game never does. |
| `src/art` | The art kit and everything drawn with it. `holdout.ts` is this game's own: the weapons as pictures, the wares, the marks of the stats, the arena's ground. |
| `src/view/scenes` | `BootScene` loads. `ArenaScene` is the field. `HudScene` lies over it and takes the steering. `CampScene` is the camp, `RoadScene` the choice of a relic and of a road, `TitleScene` the list of heroes, `ResultScene` the end of a run. `AssetsScene` loads pictures while the game runs. |
| `src/view/art` | The art's runtime: `Sheet` packs pictures onto one texture, `Figure` moves a figure's parts by the rig. |
| `src/view/light` | The light laid over the field: the hours, the lights, what burns, the air, and the shaders. See "The light" below. |
| `src/view/RoadField.ts` | What a road and a relic put on the field: the wagon, the cage, the shrine, a champion's ring, the risen. |
| `src/view/config.ts` | How the screen is fitted to a window. |
| `src/view/input.ts` | The keys and the stick. |
| `src/audio` | The sounds and the music, which are the first game's. `public/assets/audio/CREDITS.txt` names where the recordings came from and is shipped with the game. |
| `src/platform` | The portal: CrazyGames' SDK for the save, the player's name and ads. |
| `scripts` | `art`, `sheet` and `roster` are the kit's. `art.game.ts` says what this game shows of the kit. The rest are this game's. |

## How it is put together

**The wave is pure.** `World` is stepped sixty times a second with which way the hero is steered, and knows nothing of the screen. The field shows what it finds there and plays what it is told has happened (a blow, a fall, a burst). That is what lets a test fight a wave and the pace report play a thousand.

**The horde is one picture each.** A hero and a boss are figures moved part by part by the kit's rig. An enemy of the horde is two whole pictures, a step and standing, changed in turn: there can be a hundred of them on the field. The art build writes those pictures (`stills` in `scripts/art.game.ts`), which the kit's build could not do before this game.

**What a hero carries is drawn beside them.** Each weapon is the kit's own drawing of it, by itself, with the hand that holds it. The hero's own picture has a bare hand in place of what it held.

**Everything on the field is on one sheet**, 2048 by 4096, and a field's pictures are brought onto it together as the wave begins. A test packs it as the game does and fails when a field no longer fits.

**The screen has no fixed shape.** A wide window is 600 of the layout's units high, a tall one 600 wide. That is fewer than the sister games have, so that the smallest words are still eleven pixels tall in the smallest frame a portal shows a game in (821 by 462). The arena lies down in a wide window and stands on end in a tall one.

## Heroes on the field

`src/view/Deeds.ts` shows what makes a hero that hero, and who stands with them. The wave says what happens; this draws it, with the light where the light is on and plainly where it is off.

- **Their own weapon is in their hand.** The world marks one slot as the hero's own (`slot.own`). The figure draws its blow back when that slot has two tenths of a second left (`WINDUP` in `ArenaScene.ts`) and someone is in reach, so the blow lands when the wave says it does, and it faces what it strikes. What is bought floats on a wide ring (`slotPlace` in `world.ts`), small, and dim while it waits.
- **The figure** (`src/view/art/Figure.ts`) has cloth on a spring pulled by how it moves, a lean into its run, its weight coming down behind a blow, a brace behind a shield (`brace`), and lying down to get up again (`down`).
- **A move** holds the wave for a breath (`Deeds.hold`), names itself across the field and has its own look. Fury is the bar under the hero's health; the button in the corner turns gold and beats when it is full.
- **A quirk** has its name and a bar under the level in the HUD, read from `world.trait`, and a sign on the hero.
- **Companions** are named as they come on, show a bar when hurt, lie grey and counted when down.
- **The Hold** (`TitleScene.ts`) is the title: the chosen hero big in their own light, the rest a row, the band's places as cards. Its tabs show each hero's mastery track, the companions and their slots, the quests and the Codex.

Look at it with `npm run walk -- moves quirks down title` (`MOVES=bram,nan` for some of the moves only).

## The light

The figures and the ground are drawn flat, in the kit's style. The game lays light over them when it shows the field (`src/view/light`):

- **Every wave has an hour, and none of them is noon.** A land is come into at the golden hour and its captain is met at night. `hours.ts` has each hour: the sky's cool light that falls everywhere, the sun's warm light that falls where nothing is in its way, how much of the field is in shade, and how long and dark a shadow is. Nothing else decides how a wave is lit.
- **Sun and shade.** Shade drifts over the field in long patches drawn out the way the light goes. In the sun the ground is warm and bright; in the shade it has only the sky's light. That, and not a tint, is what makes the field look lit.
- **Every figure throws a shadow** (`Shadows.ts`) the way the light goes, long at dusk. One of the horde's is its own picture laid down dark; a figure moved part by part has one long soft shape. Shadows are things on the ground: they are there with the light off too.
- **Things give light.** The hero carries a lantern's worth, more the darker it is, and a little even by day. A torch, a brazier, a bolt of fire or frost, an enemy's shot, a burst, a burning enemy, a captain, a cloud of venom, a heart on the ground: each brightens the ground and the figures round it. A frame has sixteen lights; the hero's first, then the strongest.
- **What shines is drawn as light.** A bolt of the band's is a thin bright streak with a tail that cools behind it; an enemy's is round and red and keeps its drawn picture inside its glow. A flame is many small tongues, white where they lie thick; a blast throws sparks and leaves smoke. They are the kit's two pictures of light (`fx/glow`, `fx/flame`), colored and added (`Glow.ts`).
- **A lens.** What is lit past white glows. The rim is darkened, the color graded and its contrast steepened, and there is a little grain. It puts nothing out of focus: the far and near ground are soft because the ground's own picture, made small, is laid over the top and bottom of the view (`FieldLight.ground`), and everything that stands on it is drawn after and stays sharp.
- **Red stays red.** Whatever is red in the picture keeps a plain light as bright as the day's at every hour: an enemy is found by its red.
- **The air.** Pollen by day and fireflies by night in the meadow, sand on the wind and embers in the desert, snow in the snow.
- **What has to be read stays sharp.** The numbers over the field, the hero's health and the red warnings of what an enemy is about to do are drawn by a second camera that has no light on it.

How it is made: the field's camera has one filter (`StageFilter.ts`) of four small programs (`shaders.ts`). The first multiplies the picture by the hour and the lights. What shines by itself is drawn apart, half the size, and added after, so that night does not dim a flame. The second and third take what glows and blur it at a sixteenth of the size. The fourth is the lens. That is two passes over the whole picture and five small ones.

The player can turn it to LOW (the hour, the shade and the lights, without the glow, the soft ground or the grain) or OFF (the field as it is drawn, with its shadows), in the pause panel and behind the cog on the title. The choice is kept on the machine under `lastander-light`, beside the save and not in it. The game takes it down a step by itself when frames stay slow for four seconds, until the player has chosen.

The renderer is set to bind two textures (`maxTextures: 2` in `main.ts`): the filter reads the picture and one more beside it. With one, the second is silently not bound and reads as black.

## Adding to it

**A hero.** An entry in `HEROES` in `src/game/heroes.ts`: who they are, the kit's unit that draws them, their numbers, and what opens them; a weapon of their own in `SIGNATURES`; a quirk (a name in `Quirk`, its numbers in `QUIRKS`, its lines in `world.ts`, what the screen can read of it in `World.trait`); and a move (a line in `MOVES`, its case in `deed` in `world.ts`). A test for each, in `tests/heroes.test.ts`. Then `npm run art`, and `npm run pace -- --hero=<id>`, with `--nomove` and `--noquirk` to see what each part is worth.

**A companion.** An entry in `COMPANIONS` in `src/game/companions.ts` with the kit's unit that draws it, the way it fights (`Does`, a case in `actAs` in `world.ts`), its quirk (`AllyQuirk`, its numbers in `ALLY_QUIRKS`) and the feat that opens it. A test in `tests/band.test.ts`. Then `npm run art`, and `npm run pace -- --friends`.

**A weapon.** A line in `WEAPONS` with its kinds, and its drawing in `ARMS` in `src/art/holdout.ts`, which is one of the kit's eighty. A test fails until both are there, and another if it is a weapon there is already by another name.

**A kind of weapon.** A name in `Kind` and a line in `KINDS` in `src/game/kinds.ts`, its numbers in `GIFTS`, what it does in `giftsOf` (how weapons work, which `world.ts` applies) or `giftLine` (a plain stat), and at least four weapons of it. A test in `tests/kinds.test.ts`.

**A relic.** A line in `RELICS` in `src/game/relics.ts`, its numbers in `RELIC`, its rule where it acts (`this.has('<id>')` in `world.ts`, `hasRelic` in `run.ts`), a picture named `r-<id>` in `src/art/holdout.ts`, what the plain player thinks of it in `RELIC_WANT` in `bot.ts`, and a test in `tests/relics.test.ts`.

**An omen.** A name in `Omen` and a line in `OMENS` in `src/game/road.ts`, its numbers in `ROAD`, what it does to the wave in `omened` or `signs` in `world.ts`, its prize in `endWave` in `run.ts`, its picture and color in `RoadScene.ts`, what the plain player thinks of it in `ROAD_WANT`, and a test in `tests/road.test.ts`. A thing it puts on the field is shown by `src/view/RoadField.ts`.

**A ware.** A line in `ITEMS`, and its picture's name in `src/view/icons.ts`.

**An enemy.** A line in `ENEMIES` with the way it fights, and its name in the waves it comes on (`MIXES`). Any unit in `docs/art/roster.md` can be one.

**A thing that gives light.** A weapon that burns or glows gets its element in `WEAPON_LIGHT` in `src/view/light/hours.ts`; a hero's own light a line in `HERO_LIGHT`. Anything else is a call to `light` or `flash` in `FieldLight.ts`, which reads the wave as the field's screen does. Look at it with `npm run light`, by day and by night: a light that is right at night is a white blot at noon.

**A way of fighting.** A name in `Ai`, its case in `think` and `loose` in `world.ts`, its warning in `warn` in `ArenaScene.ts`, and a test.

## The pace

`npm run pace` is how the numbers were set. Its player steers away from what would hurt and toward what lies about, a fifth of a second late and never quite true, lets the move loose when there is a crowd for it, stands as Bram and keeps moving as Isaura, and buys what it can afford with no plan but a liking for a kind of weapon it holds already. It takes the roads with prizes while it comes out of a wave with more than half its health and the quiet road when it does not, stands in a shrine's ring, goes for a cage and a wagon, and takes the relic it thinks is worth most.

As last measured (round 11, after bringing the heroes level under vows), with 24 runs to a hero, Biscuit along and every level of the hero's mastery (`--mastery=all`). "Half" is the wave half the runs came through; the mean is beside it.

| Hero | No vows: half | No vows: mean | Three vows: half | Three vows: mean |
| --- | --- | --- | --- | --- |
| Wren Fallowmere | 36 | 35.6 | 26 | 28.9 |
| Bram Oakenhold | 26 | 32.8 | 24 | 20.3 |
| Orrin Quillon | 18 | 32.5 | 18 | 21.8 |
| Fenn Two-Coins | 110 | 67.0 | 9 | 36.3 |
| Old Nan Cinderwick | 29 | 34.3 | 27 | 27.5 |
| Isaura Vane | 25 | 34.8 | 19 | 24.1 |
| Hroth | 27 | 46.8 | 18 | 32.5 |
| Brother Aldous Bell | 22 | 25.0 | 18 | 16.7 |
| Ysolde Rimeheart | 19 | 26.6 | 18 | 20.1 |
| Maren Dawnguard | 26 | 33.5 | 19 | 23.6 |

A first run (Wren with Biscuit, the first armory, no mastery: `--first --pool=start`): half 8, mean 12.6. "Three vows" are the first three: Double Time, Lean Coffers, Bare Fields. A run is bimodal: one that gets through the first walls (the bosses at waves 10, 20 and 30) runs on far, so the half snaps to a boss wave and moves a long way for a small change. Fenn is the most bimodal: about half his runs fall by wave 10 and the rest run very long, so his half is 9 or 60-plus by the luck of a few runs; read his mean. `docs/journal.md`, Round 11, has what was changed and why.

The figures of the rounds before, with twenty waves and the board, are in the journal and no longer hold.

## For a portal

- It lands in play: a new player is in the field on the first frame after loading, and anyone else is one press away.
- It fits any frame with no bars, and was looked at in 907 by 510, 821 by 462, 1920 by 1080 and on a phone both ways.
- Keys are read by where they are on the keyboard, so the same four steer on a keyboard laid out another way. Escape is not used. The arrow keys, the space bar and the wheel do not scroll the page it is in.
- It has no full screen button of its own, no links out, and nothing in it but its own drawings and the recorded sounds it credits.
- The build is about 4.6 MB, as the sum of its files, and a test fails it over 4.8 MB.
- On CrazyGames it keeps the save with the player's account, says when play starts and stops, and may show something between waves. Its code for that is the first game's.

## Not yet looked at

This was built in a cloud session with no screen and no sound.

- Nobody has played it. Every picture of it was taken in a headless browser on a clock stepped by a script, and the clip was made of those pictures. How it feels to steer, whether a wave is too long or the first minute too slow, is not known.
- Nobody has heard it. The sounds and the music are the first game's, which its owner has heard. Which sound plays when is new here and was chosen by reading: a crowded wave may be too loud or too busy.
- The difficulty was set with a computer player. Whether a person's first run ends on the third wave or the tenth, nobody knows.
- How fast it runs on a real device is not known. A hundred enemies are a hundred sprites and their numbers, which the headless browser's software drawing says nothing about.
- Touch was tried only as a headless browser makes it: a finger dragged, a button tapped. Two fingers at once were not.
- The CrazyGames copy has not been run on their page. Its code is the first game's, which has.
- The hero's movement was made smooth by reasoning and by a script, not by eyes: `npm run glide` holds the drawing to the walk's own speed at frames of every length, and a strip of stills shows the walk, the turn and the stop. Nobody has yet steered it on a real screen since the change. The owner, who called it clanky, is the one to say.
- The new walk (legs passing, in place of a hop) was seen as a strip of stills of one hero. The four-legged companions walk by the same rule and were not looked at walking.
- Every word the screens show was rewritten in plain game terms. What the rules' own data says (a passive's and a skill's lines, relics, roads, the stats' names) still reads the old way until the rules agent's rewrite is merged, so a screen can mix the two for now.
- The golden hour, the drifting shade, the shadows, the soft ground, the hero's blue ring, the stirred ground where enemies come up and the bolder warnings were all set from stills taken in a headless browser. Whether the shade drifting over the field is pleasant or distracting in motion, and whether a hundred shadows cost frames on a real device, is not known.
- The rule that keeps companions off the hero pushes one that fights up close out to a room's edge: whether that looks like stepping aside or like sliding has not been seen moving.
- The interface's new pieces (the framed panel, the ribbon, the HUD's plate) were looked at at a portal's frame, the small frame and on a phone upright in stills. A button's lift under a pointer and a screen's coming in were not seen at all: a still does not show them.
- The plate at the foot of the screen that teaches (how to move, what red means, that being reached hurts) was seen once, with the first of those on it.
- The light has only been seen in a headless browser, which draws it in software, a few frames a second. How fast it runs on a real graphics card, a school laptop's or a phone's, is not known, and neither is whether the step down for slow frames comes at the right time: it has never been set off. The code that changes the light during a wave was tried by pressing the button (`npm run walk light`).
- The light has hardly been seen moving. Three scenes were filmed for four seconds each and looked at as strips of frames; fire, trails and the flicker of lights were tuned from stills. `docs/light` has six of the stills and one wave with the light off and on.
- A full screen (1920 by 1080) under the light was looked at once, at dusk in the meadow. A phone on its side was not looked at.
- Three of the ten bosses (the Warlord, the Colossus, the Jarl) are only told from another by their picture and their numbers; the other seven have a way of their own, tested and played by the computer only.
- The named heroes, their moves and quirks and the companions have their proper showing now (`src/view/Deeds.ts`), and it was looked at only in stills: all ten moves a few frames in and half a second in at a portal's frame; Bram set, Wren untouched, Isaura at speed and Hroth hurt; a companion down; the Hold at three sizes. Nobody has seen any of it move: whether a blow drawn back two tenths of a second before it lands reads as a swing, whether cloth swings or jitters, and whether the breath a move holds the wave for feels like weight or like a stutter, are all unknown. Each companion's own moment (Biscuit's coin, Pip's flare, Mossback's ring, Quill's mark, Greta's roar, Tam's banner, Thistle's stampede) was written and never caught in a picture.
- Whether a passive is fun to play is not known. All ten were only ever played by the computer, which holds a line for Isaura's Tilt but does not ride through a crowd, loses Wren's Unseen to stray shots, and flips Fenn's coin for anything that costs 30 or more. Maren is too strong by about four waves for that player, and Hroth a little.
- A companion's worth was measured with twenty-four runs to a companion and two heroes, which tells a companion worth nothing from one worth three waves and little finer than that.
- The road, the relics and the kinds of weapon are rules that were tested and measured, and shown only plainly. What was looked at, at a portal's frame, at the small frame and on a phone held upright: the roads as cards (two and three), a relic's three cards, the camp with relics, kinds and a relic among its wares, the card of the kinds, and one picture each of the shrine, the cage broken open, the wagon under guard, a champion with its ring, and the night. What was not: a wagon getting away, a burning champion's blaze, lightning from the Stormglass, the slain getting up, a shot splitting, or any other relic going off. Nobody has pressed any of it but a script. Since then the road and a relic's choice come up into place with a sound, champions stand in a light of their own kind, and nothing else about those screens was changed.
- Whether the roads are a real choice is not known. The computer picks by a fixed liking for each; whether a person feels a forced march is worth a relic, or finds the shrine's eleven seconds dull, has to be played. The two snow roads were taken five times in the last measure of them.
- Night is darker than it was (dark with pools of light, not a grey haze), and a night march darker still with the hero's light small. Both were set from numbers and one look at a desert night; whether an enemy is still easy to find at the edge of a night march has to be judged on a real screen. With the light off a night march is the flat veil it was.
- Bram's gate is a palisade of stakes that rises and sinks, and a lane of the Burning Field is a red band with a hard edge and a fill that runs along it before it burns. The duel, the champion of wave 3 and a blocked shot are a banner and a spark. These were looked at only as stills at a portal's frame, if at all (round 7 in the journal says which). The coin flip is a FLIP button on an item, and the own weapon's rules are a card behind its name in the camp.
- The Hold's screen (mastery tracks, the companions and their slots, quests, the Codex) was made to work with the new rules and has not been looked at since: no picture of it was taken in this round.
- Mastery, the slots and the vows were measured with a computer player, with few runs (`docs/journal.md`, Round 8). It never changes a pick on a track, never empties a slot, and plays Bram and Isaura poorly, so what a track is worth to a person is not known. None of the twenty new passives, the eight new companions or a found cage has been seen on a screen.
- The second way of each hero's own weapon (ten rules, picked at level 5 of the hero's track) has a test each and has never been played: the computer player always picks the first.
- A captain getting up under Second Wind, a champion walking in under Champions Abroad, the hero left standing by the Second Breath, and a wave begun hurt under Open Wounds tell the screens with events and state (`second`, `champion`, `breath`, the hero's health as the wave begins), and no screen shows the first or the third of those yet. A run's vows are not shown during the run.
- The day's road takes its day from the player's own clock, in the time the world's clocks are set by. Nothing stops a player who changes their clock.
- The game's text was rewritten in plain game language and nobody has looked at it on a screen: the stat names are longer than they were ("Ranged Damage", "Attack Speed"), and a camp column or a card made for the old words may not fit them. The screens' own words (`src/view`) are another copy's work and still say wares, hands and captain in places.
- A first run's smaller armory makes that run a little stronger, not weaker, by under a wave: with fewer weapons to draw from, twins to join and weapons of one kind come more often. Whether a person finds a first run with twelve weapons too thin, nobody knows.
- The result pays out mastery line by line, counted in one after another, with the three nearest quests and how far along each is, and says a new companion slot or a new mastery level when the run unlocked one. The new lines were not seen in a picture.
- The Hold's HEROES tab draws a hero's mastery track as a path of twelve medallions, and its COMPANIONS tab the six slots over every companion. Both were looked at in stills at a portal's frame, the small frame and on a phone upright; pressing them has been done only by the smoke. A companion found in a cage is seen behind its bars and leaps out when it breaks: that was not seen in a picture.
- A save from before the road keeps everything but a run that was left in its camp.
- A save from before mastery (version 4) keeps its heroes, companions, bests, crates and Codex, and what it had spent on the board and held in renown becomes mastery for the hero it played most. It loses a run left in a camp. Tried by a test, not on a real player's save.
- A save from before the heroes had names keeps its bests and who was open, and loses a run that was left in its camp.
- Past the hundredth wave the game is the same hundred waves again, harder. Nobody but the computer has played past the first land. The seven new lands each have hours of light of their own and their own retelling of one of the three themes (a key, a mode, a pace, a voice and a drum); each land's first wave and its boss were looked at once in a still picture, and nobody has heard the retold themes.
- The build is about 4.6 MB. To get there from just under 5 MB, the build rounds the figures' and the grounds' path numbers to whole units (a test holds that no point drifts more than half a unit), writes the manifest without spaces, and ships only the woff2 fonts. One figure and one hero's head were compared drawn before and after, side by side at twice their size in the game, and looked the same; the rest were not compared one by one.
- The hero is drawn bigger than those who come at them (0.64 of a figure's canvas to their 0.46), and what can hurt them is the same small circle at their feet. Whether that feels fair or feels like being missed by blows that looked to land has not been played.
- Rings on the ground (clouds, burning ground, the red rings an enemy warns with) were drawn about twice as wide as they reach, and are drawn at their true width now. They are still drawn flatter than they are (0.62 of their height), as everything on the ground is, so what reaches up and down the screen reaches a little further than it looks.
- This game added three things to the art kit (whole pictures at a pose in the art build and on the sheet, a bare hand on a figure, two letters for the logo). They are here and not yet in the copy of the art skill that the other two games carry.
- Every choice between waves now shows its numbers before and after, made by the rules on a copy of the run (`src/game/preview.ts`): a level's card, a ware's card (a weapon's damage, hits a second and damage a second for this hero, how it compares with the same weapon held, the set bonus it moves; an item's stats now and after), and the stats the last choice changed are lit in the camp's list. Seen in stills at a portal's frame, the small frame and a phone upright. Nothing answers a hover or a long press yet: everything a card says is on it. A relic says its rule in one line, without an example.
- The camp at dusk (the band round a fire behind the camp, road, relic and level screens) was looked at in stills at a portal's frame and on a phone upright. The fire's flicker and its flames were not seen moving. A band of three round the fire was looked at in a still at the small frame, and sits further out than one or two; a band of six was not looked at. Whether the field through the veil helps or makes the camp's words harder to read has to be judged on a real screen.
- SWAP on a shop card and the swap list with SELL beside each weapon were looked at in stills at a portal's frame and the small frame. Nobody has pressed SWAP or SELL there but a script. A relic made of two was looked at in stills: the choice that says it will form, the camp after it formed and its card. Nobody has watched one form while playing.
- Tier V weapons (the fifth forms) and each land's two items were looked at in stills at the small frame and a portal's frame: the camp, a tier V card, a tier IV card that says its tier V, a land's item on offer and in hand, and a fight with a tier V sword. The gold glint where a rule goes off was not seen moving, and of the ten kinds of rule only what the tests hold is known: nobody has watched a pull, a stun or a chain on the field. Master's Temper was never taken on a screen. A phone was not looked at for any of these.
- Damage numbers that add up per enemy and the see-through enemies in front of the hero were looked at in stills of a horde in four late lands. Whether the numbers read well moving is not known.
- The effects are made of shapes now (`src/view/Shapes.ts`, `src/art/fxShapes.ts`; `docs/journal.md`, Round 12). They were looked at only in stills at a portal's frame: a horde, a boss wave, the ten moves and, close up, a lane warning, blows in three lands, a level and the kinds of lasting ground. Nobody has seen them move, on a phone, with the light set to LOW or OFF, a boss arriving or falling, or a crit's hold. Whether the cap on effects (220, 140 or 110 at once, lower on a slow machine) is ever reached in a real horde is not known.
