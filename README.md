# Legion Holdout

A hero survival game for the browser. You choose a hero, who has a name, a weapon of their own, a quirk and one great move, and a companion to go with them, and the waves come. You steer; what you carry strikes by itself. Between waves you level and trade in the camp. You hold out for as long as you can.

It is being reworked: `docs/design.md` says into what, and `docs/journal.md` how far that has come.

It is the third game drawn with the Legion art (after Legion Battles, an auto battler, and Legion Idle), and uses the same kit: every picture is drawn in code as SVG, nothing has a face, and its cast is the kit's.

It was made in one sitting, in a cloud session with no screen and no sound. The end of this file says what nobody has looked at yet.

## How it plays

- **Move.** WASD or the arrow keys, or hold the mouse or a finger down anywhere and drag: that is a stick wherever it was put down. P pauses.
- **The move.** Kills fill a bar. When it is full the hero's one great deed is let loose: by the space bar, the other button of the mouse, or its button in the corner under a thumb. For a new player it goes off by itself when it is full and there is a crowd for it (AUTO MOVE, in the pause panel).
- **A wave** lasts from twenty seconds to a minute. Enemies are marked on the ground a moment before they stand there, and come from every side. Stay alive until the clock runs out and whoever is left leaves the field. Every coin on the ground comes to you then.
- **What you carry** strikes whoever is nearest and in reach, each thing in its own time. A hero has a weapon of their own, which nobody else can have: it takes no hand, is never sold, and grows a tier by itself at levels 5, 10 and 15. Besides it there are twenty-nine weapons to buy and six hands to carry them in.
- **Kinds of weapon.** Every weapon is of one kind or two: Blade, Pole, Blunt, Bow, Thrown, Fire, Frost, Holy, Venom, Arcane. Holding two, three and four of a kind gives that kind's gift, more at each step: blades find the gap more often, poles reach further, blunt things stun for longer, bows are quicker, thrown things skip on, fire burns longer, cold slows more, holy things mend, venom's clouds grow, the arcane is more learned. The hero's own weapon counts. The camp says what is held of each, and pressed, what that gives and what one more would.
- **Coins** are left by the fallen. They are what the camp takes, and they are experience too.
- **The camp**, between waves. For every level made, one of four things to raise; now and then one of them is a bond with a companion who is along, three steps each. Then four wares: weapons and things. Two weapons of a kind and a tier can be joined into one of the next tier, up to the fourth. A ware can be locked, to be there next time. Other wares can be asked for, at a price that rises.
- **Enemies** do different things, and each warns of it. Some walk at you. Some keep off and shoot what can be stepped out of. Some stop, turn and charge down a line shown on the ground. Some run in and burst in a ring shown on the ground. Some call others up, and some drum the rest on faster.
- **A boss** leads the seventh, the fourteenth and the twentieth wave. Beat it and the wave is won at once. It leaves a pack, which holds a thing for nothing, and a relic to choose.
- **The road.** Out of the camp there are two roads to the next wave, each with an omen and a prize, and one is taken. The quiet road is the wave as it is. The horde is half as many again, each a little weaker, for half as much experience again. Champions is fewer of the rest and three champions among them, each far stronger and quick, armored or burning, for a relic. A night march is dark and faster, for a relic. The pay wagon crosses the field under guard, and broken open it spills its chest. The shrine blesses whoever stands in its ring for eight seconds in all: a choice as for a level. The stray is a caged companion, who fights beside the band for the rest of the run once the cage is broken, one a run. A captain's wave has one road.
- **Relics.** Twenty-six, each one of a kind, each bending a rule: what dies burning sets its neighbors alight, every tenth blow lands twice, the first blow that would kill leaves one health, lightning strikes the strongest every eight seconds, one in eight of the slain gets up on your side, double harm dealt and double taken. A captain leaves one of three to choose, so do the champions' road and the night march, and now and then the last of the camp's wares is one, at a high price. A run holds as many as it finds, and the camp shows them.
- **After the twentieth wave** the same twenty come round again, far harder each time. How many waves a hero came through is the score.
- **Heroes.** Ten, each with a name, of whom two are open at the start. Each has a weapon of their own, numbers of their own, a quirk that asks to be played round, and a move. Bram Oakenhold sets his shield when he stands still. Wren Fallowmere hits harder every second nothing touches her. Every third spell of Orrin Quillon's is cast twice. Fenn Two-Coins hits harder the more coins he holds. What dies burning by Old Nan Cinderwick bursts and lights its neighbors. Isaura Vane hits harder the longer she keeps moving. Hroth gets up once from a killing blow. Brother Aldous Bell brings one companion more. What Ysolde Rimeheart has slowed, struck again, freezes. Maren Dawnguard's hammer leaves holy ground. `docs/design.md` has them all, with their moves. The rest are opened by feats: coming through a wave, beating a boss, gathering coins in one run, felling enemies over all runs. One who is not open is a dark shape with no name, and what opens them is said.
- **Companions.** Eight, opened by feats as the heroes are; the first, Biscuit the war hound, comes when the first run ends. One goes on a run (two once the second place has been bought in the Hold; Aldous brings one more). Each fights by itself and has a quirk of its own: Biscuit fetches coins, Pip the wisp flashes when the hero is struck, enemies go for Mossback the turtle, Quill the eagle hunts those who shoot, Greta the bear roars, Ember the salamander leaves fire where it runs, everyone strikes faster by Tam's banner and once in a run he gets a fallen hero up, and Thistle the stag charges through the line. A companion has health: struck down, it sits out for a few seconds and gets up, and it is whole again at each camp. It grows with the hero's level.
- **The Hold** is what is kept between runs, behind THE HOLD on the list of heroes. Every run pays **renown** when it ends, whatever became of it: for each wave come through, each captain beaten, the win, each deed done for the first time, and a fifth more for every vow it was sworn under. Renown buys places on the board, a hero or a companion whose deed has not been done (the deed is the cheaper way), the second place in the band, and crates for the armory.
- **The armory.** A first run is offered twelve of the weapons, sixteen of the wares and ten of the relics. The rest come in nine crates, each a theme (the Fletcher's is bows, the Chandler's is everything that burns). A crate is opened by its own deed (hold three bows in one run, and the Fletcher's is open) or bought with renown, each dearer than the last. A crate's contents are shown first, "???" for what has never been met. A run keeps the armory it began with.
- **The board.** Lasting upgrades bought with renown, thirty-three of them on four branches, each making every later run stronger: the hero (health, armor, speed of foot; harm, speed of striking, fury; and, dear, one getting-up a run), the band (companions' health and harm, and how soon one gets up), the purse (coins to begin with, free looks at other wares, marks that strike a ware from the table for the rest of a run) and fortune (luck, experience, reach, a third road, a second look at a relic's choice). A place is opened by the one before it and costs more than it. TAKE BACK gives all the renown back to spend another way.
- **Vows.** A first win opens the first three, and more open as runs are won under them: eight in all, sworn in any mix in the Hold before a run. They come quicker; the camp costs more; the fallen leave no hearts; a champion walks in every wave from the third; one hand fewer; every wave by night; no rest between waves; a captain that falls gets up once. A hero's badge is the vows their best win was sworn under.
- **Oaths.** Each hero has three, done as that hero: a win gives them a new name; a win under a vow gives them a relic to begin every run with; a deed about their quirk opens a second rule for their own weapon (the choice is kept and given to the run; the second rules themselves come with the heroes' weapons, from another round of work).
- **Deeds.** Besides the ones that open heroes, companions and crates there are twenty-eight that pay renown once each. `nextDeeds` names the nearest not yet done, for the end of a run.
- **The Daily Road.** One run a day with a hero, a companion and a seed that are the same for everyone, from the date: the whole armory, nothing from the board, no vow. How far it went and how long it was fought are kept.
- **The Chronicle** remembers every hero, companion, enemy, weapon, ware, relic and road that has been met, with a count for each (slain, runs, times taken). The rest are "???".
- **A run left in its camp** is kept: shut the page there and it can be carried on.

A new player lands in the field at once, as Bram, with the keys shown. The list of heroes comes after the first fall, and Biscuit with it.

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
| `npm run cover` | Draws the three covers a portal asks for to `docs/covers`. |
| `npm run build:crazygames` | The copy to upload to CrazyGames, into `dist-crazygames`. `npm run package:crazygames` zips it to `build/legion-holdout-crazygames.zip`. |

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

## Adding to it

**A hero.** An entry in `HEROES` in `src/game/heroes.ts`: who they are, the kit's unit that draws them, their numbers, and what opens them; a weapon of their own in `SIGNATURES`; a quirk (a name in `Quirk`, its numbers in `QUIRKS`, its lines in `world.ts`, what the screen can read of it in `World.trait`); and a move (a line in `MOVES`, its case in `deed` in `world.ts`). A test for each, in `tests/heroes.test.ts`. Then `npm run art`, and `npm run pace -- --hero=<id>`, with `--nomove` and `--noquirk` to see what each part is worth.

**A companion.** An entry in `COMPANIONS` in `src/game/companions.ts` with the kit's unit that draws it, the way it fights (`Does`, a case in `actAs` in `world.ts`), its quirk (`AllyQuirk`, its numbers in `ALLY_QUIRKS`) and the feat that opens it. A test in `tests/band.test.ts`. Then `npm run art`, and `npm run pace -- --friends`.

**A weapon.** A line in `WEAPONS` with its kinds, and its drawing in `ARMS` in `src/art/holdout.ts`, which is one of the kit's eighty. A test fails until both are there, and another if it is a weapon there is already by another name.

**A kind of weapon.** A name in `Kind` and a line in `KINDS` in `src/game/kinds.ts`, its numbers in `GIFTS`, what it does in `giftsOf` (how weapons work, which `world.ts` applies) or `giftLine` (a plain stat), and at least four weapons of it. A test in `tests/kinds.test.ts`.

**A relic.** A line in `RELICS` in `src/game/relics.ts`, its numbers in `RELIC`, its rule where it acts (`this.has('<id>')` in `world.ts`, `hasRelic` in `run.ts`), a picture named `r-<id>` in `src/art/holdout.ts`, what the plain player thinks of it in `RELIC_WANT` in `bot.ts`, and a test in `tests/relics.test.ts`.

**An omen.** A name in `Omen` and a line in `OMENS` in `src/game/road.ts`, its numbers in `ROAD`, what it does to the wave in `omened` or `signs` in `world.ts`, its prize in `endWave` in `run.ts`, its picture and color in `RoadScene.ts`, what the plain player thinks of it in `ROAD_WANT`, and a test in `tests/road.test.ts`. A thing it puts on the field is shown by `src/view/RoadField.ts`.

**A ware.** A line in `ITEMS`, and its picture's name in `src/view/icons.ts`.

**An enemy.** A line in `ENEMIES` with the way it fights, and its name in the waves it comes on (`MIXES`). Any unit in `docs/art/roster.md` can be one.

**A way of fighting.** A name in `Ai`, its case in `think` and `loose` in `world.ts`, its warning in `warn` in `ArenaScene.ts`, and a test.

## The pace

`npm run pace` is how the numbers were set. Its player steers away from what would hurt and toward what lies about, a fifth of a second late and never quite true, lets the move loose when there is a crowd for it, stands as Bram and keeps moving as Isaura, and buys what it can afford with no plan but a liking for a kind of weapon it holds already. It takes the roads with prizes while it comes out of a wave with more than half its health and the quiet road when it does not, stands in a shrine's ring, goes for a cage and a wagon, and takes the relic it thinks is worth most.

As last measured, with thirty-two runs to a hero, alone, each stopped at the twenty-sixth wave. "Mean" is the mean of the waves come through with every run stopped at the twentieth:

| Hero | Half come through | Mean of the written 20 | Fewest | Won, of 32 |
| --- | --- | --- | --- | --- |
| Bram Oakenhold | 10 | 9.7 | 3 | 0 |
| Wren Fallowmere | 11 | 11.4 | 3 | 0 |
| Orrin Quillon | 11 | 12.0 | 5 | 3 |
| Fenn Two-Coins | 11 | 10.0 | 3 | 4 |
| Old Nan Cinderwick | 11 | 10.1 | 3 | 1 |
| Isaura Vane | 11 | 12.3 | 7 | 3 |
| Hroth | 11 | 12.1 | 4 | 6 |
| Brother Aldous Bell | 10 | 10.7 | 4 | 2 |
| Ysolde Rimeheart | 11 | 12.0 | 3 | 5 |
| Maren Dawnguard | 11 | 12.5 | 7 | 2 |

Half of each hero's runs come through ten or eleven waves, and about one run in twelve wins the twentieth. Before the road, relics and kinds of weapon were in, the same waves let half of Wren's runs through thirty-one: a hero has far more now by the middle of a run, and the enemies were made to grow again from the fourth wave (their health) and the seventh (their harm), with the first waves left as they were. Runs used to end at two walls, the twelfth wave and the eighteenth; those were lowered, and they now end all along the way.

What each new thing is worth to the plain player, as Orrin, thirty-two runs each, in the mean of the written 20:

| As Orrin | Mean of the written 20 |
| --- | --- |
| With everything | 12.0 |
| Kept to the quiet road | 9.5 |
| With no relic doing anything | 11.2 |
| With no gift from the kinds | 11.9 |

The roads are worth the most by far: a blessing is a level's choice, a stray is a companion, a wagon is a camp's worth of coins. Relics come late and to runs that are already going well, so taking them all away costs little. The gifts of the kinds are worth less than the dice move, to this player: it leans toward a kind it holds but does not give up a better weapon for one, as a person building for a gift would.

How the roads went, over all ten heroes:

| Road | Times taken | Come through | Prize had, of those |
| --- | --- | --- | --- |
| Quiet road | 123 | 75% | 100% |
| The horde | 502 | 94% | 100% |
| Champions | 595 | 80% | 100% |
| Night march | 280 | 93% | 100% |
| Pay wagon | 638 | 92% | 86% |
| The shrine | 941 | 96% | 96% |
| The stray | 267 | 99% | 97% |

Champions are the road that ends runs, as they are meant to be. The quiet road looks worse than it is: the plain player takes it only when it is already hurt.

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
- A boss is only told from another by its picture and its numbers: all three fight the same way.
- The named heroes, their quirks and moves, and the companions are rules that were tested and measured, and shown only plainly: a hero's own weapon still floats beside them with the rest, a move is a ring and a line of words, a companion is its figure and nothing more, and what a quirk is doing is not shown on the screen at all. The proper screens for all of it are the next piece of work. What was looked at: the list of heroes with the companion's button at the small frame and on a phone, and a wave with a band at a portal's frame.
- Whether a quirk is fun to play round is not known: Bram's standing still, Isaura's never stopping and Wren's not being touched were only ever played by the computer.
- A companion's worth was measured with twenty-four runs to a companion and two heroes, which tells a companion worth nothing from one worth three waves and little finer than that.
- The road, the relics and the kinds of weapon are rules that were tested and measured, and shown only plainly. What was looked at, at a portal's frame, at the small frame and on a phone held upright: the roads as cards (two and three), a relic's three cards, the camp with relics, kinds and a relic among its wares, the card of the kinds, and one picture each of the shrine, the cage broken open, the wagon under guard, a champion with its ring, and the night. What was not: a wagon getting away, a burning champion's blaze, lightning from the Stormglass, the slain getting up, a shot splitting, or any other relic going off. Nobody has pressed any of it but a script.
- Whether the roads are a real choice is not known. The computer always takes a prize while it is hale; whether a person feels the champions' road is worth a relic, or finds the shrine's eight seconds dull, has to be played.
- The night march is a flat dark veil over the field, until the light that is being made for the field takes it over.
- The Hold's screen is the plainest that works and has been seen only in pictures, at 821 by 462 and on a phone held upright. Nobody has bought anything in it but a script. The board is a list with pages there, though it has a column and a row for every place so that a screen can draw it as a tree. The Chronicle has not been looked at with everything met.
- The board, the vows and the oaths were measured with a computer player. It does not mind quicker enemies and never uses a mark or a second look, so what those are worth to a person is not known. A hero's starting relic was not measured by itself, and one vow at a time only for two heroes.
- The second rule for a hero's own weapon, which an oath opens, is a choice that is kept and given to the run and changes nothing yet: the rules themselves are being written in another copy.
- A captain getting up under Second Wind, a champion walking in under Champions Abroad, the hero left standing by the Second Breath, and a wave begun hurt under Open Wounds tell the screens with events and state (`second`, `champion`, `breath`, the hero's health as the wave begins), and no screen shows the first or the third of those yet. A run's vows are not shown during the run.
- The day's road takes its day from the player's own clock, in the time the world's clocks are set by. Nothing stops a player who changes their clock.
- A first run's smaller armory makes that run a little stronger, not weaker, by under a wave: with fewer weapons to draw from, twins to join and weapons of one kind come more often. Whether a person finds a first run with twelve weapons too thin, nobody knows.
- The tally of what a run paid and the nearest deeds not yet done are kept and can be asked for (`save.tally`, `nextDeeds`). The result screen does not show them yet.
- A save from before the road keeps everything but a run that was left in its camp.
- A save from before the heroes had names keeps its bests and who was open, and loses a run that was left in its camp.
- Past the twentieth wave the game is the same twenty waves again, harder. It has not been played that far by anyone but the computer.
- This game added three things to the art kit (whole pictures at a pose in the art build and on the sheet, a bare hand on a figure, two letters for the logo). They are here and not yet in the copy of the art skill that the other two games carry.
