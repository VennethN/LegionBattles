# Lastander

A hero survival game for the browser. You choose a hero, who has a name, a weapon of their own, a quirk and one great move, and a companion to go with them, and the waves come. You steer; what you carry strikes by itself. Between waves you level and trade in the camp. You hold out for as long as you can.

It is being reworked: `docs/design.md` says into what, and `docs/journal.md` how far that has come.

It is the third game drawn with the Legion art (after Legion Battles, an auto battler, and Legion Idle), and uses the same kit: every picture is drawn in code as SVG, nothing has a face, and its cast is the kit's.

It was made in one sitting, in a cloud session with no screen and no sound. The end of this file says what nobody has looked at yet.

## How it plays

- **Move.** WASD or the arrow keys, or hold the mouse or a finger down anywhere and drag: that is a stick wherever it was put down. P pauses.
- **The skill.** Kills fill the Fury bar. When it is full the hero's skill can be cast: by the space bar, the other button of the mouse, or its button in the corner under a thumb. It comes about twice a wave early and three or four times late. On a player's first run it casts itself when there is a crowd for it; from the second run on it is the player's to cast, and the game says so once (AUTO, in the pause panel, turns it back). Every skill asks for something: where to stand, which way to face, or when.
- **A wave** lasts from twenty to forty-five seconds, a boss's up to a minute. Enemies are marked on the ground a moment before they stand there, and come from every side. Stay alive until the clock runs out and whoever is left leaves the field. Coins still on the ground then come to you, but count for half: fetching them in time is worth doing.
- **What you carry** strikes whoever is nearest and in reach, each thing in its own time. A hero has a weapon of their own, which nobody else can have: it takes no weapon slot, is never sold, grows a tier by itself at levels 5, 10 and 15, and learns a rule at each (three to a weapon; the camp shows them when the weapon is pressed). Besides it there are twenty-nine weapons to buy and six slots to carry them in.
- **Weapon types.** Every weapon is of one type or two: Blade, Polearm, Blunt, Bow, Thrown, Fire, Frost, Holy, Poison, Arcane. Holding two, three and four of a type gives that type's set bonus, more at each step. The hero's own weapon counts. The camp says what is held of each, and pressed, what that gives and what one more would. `docs/design.md` has the table.
- **Coins** are left by the fallen. They are what the camp takes, and they are experience too.
- **The camp**, between waves. For every level made, one of four things to raise; now and then one of them is a bond with a companion who is along, three steps each. Then four wares: weapons and things. Two weapons of a kind and a tier can be joined into one of the next tier, up to the fourth. A ware can be locked, to be there next time. Other wares can be asked for, at a price that rises.
- **Enemies** do different things, and each warns of it. Some walk at you. Some keep off and shoot what can be stepped out of. Some stop, turn and charge down a line shown on the ground. Some run in and burst in a ring shown on the ground. Some call others up, and some drum the rest on faster.
- **A boss** leads the seventh, the fourteenth and the twentieth wave. Beat it and the wave is won at once. It leaves a pack, which holds a thing for nothing, and a relic to choose.
- **The road.** Out of the camp there are two roads to the next wave, each with a risk and a reward, and one is taken. No road is free: the plain wave is not on offer. Twelve roads: six that come anywhere (the Horde, Champions, Forced March, Toll Road, the Duel, the Wounded) and two that are each land's own (the Stray and the Grove Shrine in the meadow, the Pay Caravan and the Burning Field in the desert, the Long Night and the Blizzard in the snow). `docs/design.md` has what each risks and pays. A boss's wave has one road. On wave 3 of every run a lone champion walks in, and killing it drops a relic. A player's first run has one road out of its first camp: the Stray's, with Biscuit in the cage.
- **Relics.** Twenty-six, each one of a kind, each bending a rule and saying exactly how: enemies that die burning set nearby enemies on fire, every 4th hit of your own weapon hits twice, once per wave a killing blow leaves you at 1 HP, every 8 s lightning strikes the toughest enemy, 1 in 8 enemies you kill fights for you, deal 2x damage and take 2x. A boss leaves one of three to choose, so do the champion of wave 3 and the roads that pay one, and now and then the last of the shop's items is one, at a high price. A run holds as many as it finds, and the camp shows them.
- **After the twentieth wave** the same twenty come round again, far harder each time. How many waves a hero came through is the score.
- **Heroes.** Ten, each with a name, of whom two are unlocked at the start. Each has a weapon of their own, numbers of their own, a passive that is played, and a skill. Bram Oakenhold raises his shield when he stands still, and it blocks shots from the front. Wren Fallowmere deals more damage every second nothing hits her. Orrin Quillon's staff copies the last weapon he bought. Fenn Two-Coins flips a coin for an item once per camp, and deals more damage the more coins he holds. Burning enemies near Old Nan Cinderwick never stop burning, and burn hotter each time she lights them again. Isaura Vane readies a 2.5x thrust by riding in a straight line. Hroth deals more damage and heals on kills below 33% HP, and survives a killing blow once per land. Brother Aldous Bell brings one companion more. Ysolde Rimeheart freezes slowed enemies by hitting them again. Maren Dawnguard's hammer leaves holy ground. `docs/design.md` has them all in the game's own words, with their skills and what their weapons learn. The rest are unlocked by clearing a wave, beating a boss, collecting coins in one run, kills over all runs, or runs finished.
- **Companions.** Eight, unlocked as the heroes are; the first, Biscuit the war hound, is met in a cage on a first run's second wave and stays. One goes on a run (two once the second slot has been bought in the Hold; Aldous brings one more). Each fights by itself and has a passive of its own: Biscuit fetches coins, Pip the wisp stuns when you are hit, enemies attack Mossback the turtle instead, Quill the eagle hunts those who shoot, Greta the bear roars, Ember the salamander leaves fire where it runs, everyone attacks faster by Tam's banner and once per run he revives you, and Thistle the stag charges through the enemy. A companion has HP: downed, it sits out for a few seconds and recovers, and it is whole again at each camp. It grows with the hero's level.
- **The Hold** is what is kept between runs, behind THE HOLD on the list of heroes. Every run pays **renown** when it ends, whatever became of it: for each wave come through, each captain beaten, the win, each deed done for the first time, and a fifth more for every vow it was sworn under. Renown buys places on the board, a hero or a companion whose deed has not been done (the deed is the cheaper way), the second place in the band, and crates for the armory.
- **The armory.** A first run is offered twelve of the weapons, sixteen of the wares and ten of the relics. The rest come in nine crates, each a theme (the Fletcher's is bows, the Chandler's is everything that burns). A crate is opened by its own deed (hold three bows in one run, and the Fletcher's is open) or bought with renown, each dearer than the last. A crate's contents are shown first, "???" for what has never been met. A run keeps the armory it began with.
- **The board.** Lasting upgrades bought with renown, thirty-three of them on four branches, each making every later run stronger: the hero (health, armor, speed of foot; harm, speed of striking, fury; and, dear, one getting-up a run), the band (companions' health and harm, and how soon one gets up), the purse (coins to begin with, free looks at other wares, marks that strike a ware from the table for the rest of a run) and fortune (luck, experience, reach, a third road, a second look at a relic's choice). A place is opened by the one before it and costs more than it. TAKE BACK gives all the renown back to spend another way.
- **Vows.** A first win opens the first three, and more open as runs are won under them: eight in all, sworn in any mix in the Hold before a run. They come quicker; the camp costs more; the fallen leave no hearts; a champion walks in every wave from the third; one hand fewer; every wave by night; no rest between waves; a captain that falls gets up once. A hero's badge is the vows their best win was sworn under.
- **Oaths.** Each hero has three, done as that hero: a win gives them a new title; a win with at least 1 vow gives them a relic to begin every run with; and one about their passive unlocks the second way of their own weapon, a rule to choose in place of one of the three it learns (RULE 1 or RULE 2 beside the hero in the Hold). Five of those are counted as the run is played: Tilt kills, kills in Grave Debt, burns stacked to their max, coin flips won, forms the staff took.
- **Deeds.** Besides the ones that open heroes, companions and crates there are twenty-eight that pay renown once each. `nextDeeds` names the nearest not yet done, for the end of a run.
- **The Daily Road.** One run a day with a hero, a companion and a seed that are the same for everyone, from the date: the whole armory, nothing from the board, no vow. How far it went and how long it was fought are kept.
- **The Chronicle** remembers every hero, companion, enemy, weapon, ware, relic and road that has been met, with a count for each (slain, runs, times taken). The rest are "???".
- **A run left in its camp** is kept: shut the page there and it can be carried on.

A new player lands in the field at once, as Bram, with the keys shown. Biscuit is in a cage on the second wave. The list of heroes comes after the first fall.

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
| `src/game/holdData.ts` | The Hold's lists and numbers: what renown is paid for, the prices of heroes, companions and the second place, the crates and their deeds, the board, the vows, the deeds, the heroes' oaths. `REF` at its top is every name of another list it leans on. |
| `src/game/hold.ts` | The Hold's rules, as functions on a save: what a run pays, buying, what the armory has shut, what a run begins with, vows, deeds and oaths, the day's road, the Chronicle. `record` in `state.ts` hands every wave and every run's end to it. |
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
- **The Hold** (`TitleScene.ts`) is the title: the chosen hero big in their own light, the rest a row, the band's places as cards. Renown and what it opens are still to come and have room there.

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

As last measured (round 6, after the Hold was merged), with thirty-two runs to a hero, alone, each stopped at the twenty-sixth wave. "Mean" is the mean of the waves cleared with every run stopped at the twentieth. The first three columns are a new player's game, nothing bought and the armory's first twelve weapons (`--pool=start`); the last two are with the whole board and the whole armory (`--board=all`):

| Hero | Half cleared | Mean of the written 20 | Won, of 32 | Whole board: mean of 20 | Whole board: won, of 32 |
| --- | --- | --- | --- | --- | --- |
| Bram Oakenhold | 11 | 11.3 | 2 | 18.8 | 20 |
| Wren Fallowmere | 10 | 8.8 | 0 | 17.2 | 9 |
| Orrin Quillon | 11 | 11.5 | 2 | 18.7 | 23 |
| Fenn Two-Coins | 12 | 13.5 | 8 | 19.3 | 28 |
| Old Nan Cinderwick | 12 | 12.5 | 2 | 19.2 | 21 |
| Isaura Vane | 10 | 8.8 | 0 | 17.4 | 9 |
| Hroth | 13 | 14.3 | 7 | 19.4 | 27 |
| Brother Aldous Bell | 11 | 10.3 | 0 | 19.2 | 21 |
| Ysolde Rimeheart | 12 | 12.8 | 7 | 19.7 | 28 |
| Maren Dawnguard | 17 | 15.4 | 7 | 19.6 | 26 |

With nothing bought about one run in nine wins the twentieth wave, and a run that clears all twenty is twelve to thirteen minutes of fighting. Nine heroes have half their runs through wave 10 to 13, with Bram in the middle. Maren is too strong by four waves and Hroth is at the top of the band: both want a trim that has not been made. Wren and Isaura never won for this player, which loses Wren's Unseen to every stray shot and only holds a line for Isaura's Tilt; what a person makes of them is not known. With the whole board two runs in three are won: that is what the vows are for.

How the roads went, as Bram over forty runs, before the Hold was merged (they were not taken again after):

| Road | Times taken | Cleared | Reward had, of those |
| --- | --- | --- | --- |
| The Horde | 54 | 78% | 100% |
| Champions | 35 | 74% | 100% |
| Forced March | 30 | 100% | 100% |
| Toll Road | 28 | 96% | 100% |
| The Duel | 34 | 91% | 100% |
| The Wounded | 34 | 82% | 100% |
| The Stray | 39 | 100% | 77% |
| The Grove Shrine | 62 | 98% | 93% |
| Pay Caravan | 14 | 93% | 92% |
| Burning Field | 20 | 85% | 100% |
| The Long Night | 2 | 100% | 100% |
| Blizzard | 3 | 67% | 100% |

Within a land no road is taken much more than twice as often as another. Few of Bram's runs reach the snow, so its two roads are barely measured. A forced march is cleared every time because its cost falls on the wave after it.

The figures below this line are older than round 6: they were taken before the roads were given costs and the late enemies were eased, and say what a companion and the Hold were worth then.

What a companion is worth, with twenty-four runs each, as the mean of the written 20 beside the hero alone:

| With | Bram (9.1 alone) | Wren (11.0 alone) |
| --- | --- | --- |
| Biscuit | 12.0 | 11.4 |
| Pip | 11.7 | 12.2 |
| Mossback | 11.3 | 12.8 |
| Quill | 11.0 | 13.3 |
| Greta | 12.0 | 13.7 |
| Ember | 12.6 | 13.0 |
| Tam | 12.2 | 12.3 |
| Thistle | 13.1 | 13.9 |

A companion is worth two to three waves, more to Bram, who is the weakest alone, than to Wren. That is a little more than it was before the enemies were made to grow again: a companion's blows grow with the hero's level whatever the hero has found. A stray is one more of them, which is why a run takes in only one.

Thirty-two runs are not many, and that player is not a person. A person plans what to buy, which it does not, and sees less of the field at once than it does. Two measures of the same thing with other dice differ by a wave or more: a difference smaller than that between two heroes or two companions says nothing.

What the Hold changes was measured the same way, twenty-four runs each for Bram, Wren, Orrin and Isaura alone (`--pool=start`, `--board=all`, `--vows=N` or `--vows=march,wind`). The mean of the written twenty, over the four:

| What the run began with | Mean of 20 | Won, of 96 |
| --- | --- | --- |
| Nothing bought, a first run's armory | 12.1 | 10 |
| The whole board, the whole armory | 18.1 | 55 |
| The same under three vows | 16.1 | 28 |
| Under five vows | 15.3 | 26 |
| Under all eight | 12.8 | 12 |

The board is meant to be felt, and the enemies are not made stronger to take it back: with all of it the plain player wins more than half its runs alone and three in four with two companions. The vows are what bring it back. `npm run pace -- --career` plays a whole career from a new save: everything was open and the board full after 79, 67 and 62 runs, the second place in the band after the first or second, something bought after about two runs in three of the first thirty, and after a first run that does most of the opening deeds of skill at once, someone new every two to four runs until the twenty-second.

## For a portal

- It lands in play: a new player is in the field on the first frame after loading, and anyone else is one press away.
- It fits any frame with no bars, and was looked at in 907 by 510, 821 by 462, 1920 by 1080 and on a phone both ways.
- Keys are read by where they are on the keyboard, so the same four steer on a keyboard laid out another way. Escape is not used. The arrow keys, the space bar and the wheel do not scroll the page it is in.
- It has no full screen button of its own, no links out, and nothing in it but its own drawings and the recorded sounds it credits.
- The build is 3.7 MB, as the sum of its files.
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
- A boss is only told from another by its picture and its numbers: all three fight the same way.
- The named heroes, their moves and quirks and the companions have their proper showing now (`src/view/Deeds.ts`), and it was looked at only in stills: all ten moves a few frames in and half a second in at a portal's frame; Bram set, Wren untouched, Isaura at speed and Hroth hurt; a companion down; the Hold at three sizes. Nobody has seen any of it move: whether a blow drawn back two tenths of a second before it lands reads as a swing, whether cloth swings or jitters, and whether the breath a move holds the wave for feels like weight or like a stutter, are all unknown. Each companion's own moment (Biscuit's coin, Pip's flare, Mossback's ring, Quill's mark, Greta's roar, Tam's banner, Thistle's stampede) was written and never caught in a picture.
- Whether a passive is fun to play is not known. All ten were only ever played by the computer, which holds a line for Isaura's Tilt but does not ride through a crowd, loses Wren's Unseen to stray shots, and flips Fenn's coin for anything that costs 30 or more. Maren is too strong by about four waves for that player, and Hroth a little.
- A companion's worth was measured with twenty-four runs to a companion and two heroes, which tells a companion worth nothing from one worth three waves and little finer than that.
- The road, the relics and the kinds of weapon are rules that were tested and measured, and shown only plainly. What was looked at, at a portal's frame, at the small frame and on a phone held upright: the roads as cards (two and three), a relic's three cards, the camp with relics, kinds and a relic among its wares, the card of the kinds, and one picture each of the shrine, the cage broken open, the wagon under guard, a champion with its ring, and the night. What was not: a wagon getting away, a burning champion's blaze, lightning from the Stormglass, the slain getting up, a shot splitting, or any other relic going off. Nobody has pressed any of it but a script. Since then the road and a relic's choice come up into place with a sound, champions stand in a light of their own kind, and nothing else about those screens was changed.
- Whether the roads are a real choice is not known. The computer picks by a fixed liking for each; whether a person feels a forced march is worth a relic, or finds the shrine's eleven seconds dull, has to be played. The two snow roads were taken five times in the last measure of them.
- Night is darker than it was (dark with pools of light, not a grey haze), and a night march darker still with the hero's light small. Both were set from numbers and one look at a desert night; whether an enemy is still easy to find at the edge of a night march has to be judged on a real screen. With the light off a night march is the flat veil it was.
- The walls of Bram's gate, the lanes of the Burning Field, the duel, the champion of wave 3 and a blocked shot are shown as plainly as lets them be read (a bar, a band on the ground, a banner, a spark), and none of that was looked at in a picture after it was made. The coin flip is a FLIP button on an item, and the own weapon's rules are a card behind its name in the camp.
- The Hold's screen is the plainest that works and has been seen only in pictures, at 821 by 462 and on a phone held upright. Nobody has bought anything in it but a script. The board is a list with pages there, though it has a column and a row for every place so that a screen can draw it as a tree. The Chronicle has not been looked at with everything met.
- The board, the vows and the oaths were measured with a computer player. It does not mind quicker enemies and never uses a mark or a second look, so what those are worth to a person is not known. A hero's starting relic was not measured by itself, and one vow at a time only for two heroes.
- The second way of each hero's own weapon (ten rules, one an oath unlocks for each hero) has a test each and has never been played: the computer player never chooses one, so what each is worth beside the rule it replaces is not known. The Hold shows the choice only as RULE 1 or RULE 2.
- A captain getting up under Second Wind, a champion walking in under Champions Abroad, the hero left standing by the Second Breath, and a wave begun hurt under Open Wounds tell the screens with events and state (`second`, `champion`, `breath`, the hero's health as the wave begins), and no screen shows the first or the third of those yet. A run's vows are not shown during the run.
- The day's road takes its day from the player's own clock, in the time the world's clocks are set by. Nothing stops a player who changes their clock.
- The game's text was rewritten in plain game language and nobody has looked at it on a screen: the stat names are longer than they were ("Ranged Damage", "Attack Speed"), and a camp column or a card made for the old words may not fit them. The screens' own words (`src/view`) are another copy's work and still say wares, hands and captain in places.
- A first run's smaller armory makes that run a little stronger, not weaker, by under a wave: with fewer weapons to draw from, twins to join and weapons of one kind come more often. Whether a person finds a first run with twelve weapons too thin, nobody knows.
- The tally of what a run paid and the nearest deeds not yet done are kept and can be asked for (`save.tally`, `nextDeeds`). The result screen does not show them yet.
- A save from before the road keeps everything but a run that was left in its camp.
- A save from before the heroes had names keeps its bests and who was open, and loses a run that was left in its camp.
- Past the twentieth wave the game is the same twenty waves again, harder. It has not been played that far by anyone but the computer.
- The build is 3.8 MB in bytes and 1.2 MB zipped. `du -sh dist` says 4.7 MB, because it counts whole disk blocks for three hundred small pictures: measure with `du -sb dist`.
- The hero is drawn bigger than those who come at them (0.64 of a figure's canvas to their 0.46), and what can hurt them is the same small circle at their feet. Whether that feels fair or feels like being missed by blows that looked to land has not been played.
- Rings on the ground (clouds, burning ground, the red rings an enemy warns with) were drawn about twice as wide as they reach, and are drawn at their true width now. They are still drawn flatter than they are (0.62 of their height), as everything on the ground is, so what reaches up and down the screen reaches a little further than it looks.
- This game added three things to the art kit (whole pictures at a pose in the art build and on the sheet, a bare hand on a figure, two letters for the logo). They are here and not yet in the copy of the art skill that the other two games carry.
