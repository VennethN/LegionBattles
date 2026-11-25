# Boss Hunters

A boss hunting game for the browser. A contract names a monster; a hunter goes to its lair with what they chose to bring, sets their camp while it sleeps, and wakes it. Then it is one great enemy against one hunter and their few helpers. `docs/design.md` is what the game is to be; `docs/journal.md` is how far it has got.

## How it plays

- **The lodge.** The board shows the monsters that can be hunted, each at up to three marks of difficulty. The muster is who goes (a hunter), what the horn will call (reinforcements) and what will be built (buildings), within the lodge's supply. The ledger is what coin buys: more supply, a second call, a sturdier building.
- **Camp.** In the lair the monster sleeps. The hunter walks; a building's button (or its number) sets it down a step in front of them. Nothing is built near the monster or once it wakes. WAKE IT, or walking into its red ring, begins the hunt.
- **The hunt.** The hunter is steered and strikes by themselves at what is in reach. The player's part is where to stand and when to use what there is: ROLL (Space), the hunter's two abilities (Q and E), and the horn (R and F). A phone has the same as buttons, and a stick wherever a finger is put down.
- **The monster shows everything before it does it.** Red on the ground is where a blow will land, and it fills as its time runs out. After an attack it is open (a gold ring): blows then fill its stagger, and when that is full it breaks, lies down for a few seconds and takes twice as much. Its health is in three parts, and at each it changes: a new round of attacks.
- **The end.** It falls: coin, twice for a first fall at a mark; the first fall of all gives its trophy, which opens a hunter and things to bring, and can be worn. The hunter falls: a little coin for each part got through, and the hunt can be tried again at once.

A new player is put straight into the Sexton's lair with a muster already made.

## What is in it

| | |
| --- | --- |
| Hunters | Marta Voss the Lychwarden (halberd; Brace, Reap), Jory Pell the Snaresman (crossbow; Jaw Trap, Tar Flask), Agnes Thorn the Lamplighter (Flare, Street Lamp), Old Brask the Kennelman (boar spear and two hounds; Set On, Heel) |
| Monsters | The Sexton (lines of the spade, graves the dead get up from, a lantern that burns all round him), The Antlered King (charges that a stone or a barricade stops, thorns, a herd that runs the field in lanes) |
| Reinforcements | Pikemen, Crossbowmen, Sappers |
| Buildings | Barricade, Watchfire, Bell Post, Ballista |
| To come | Four more monsters stand on the board as dark bills |

## Where things are

| | |
| --- | --- |
| `src/game/content.ts` | Everything there is, as tables: hunters, abilities, monsters and every attack with its shapes, helpers, reinforcements, buildings, the marks |
| `src/game/hunt.ts` | A hunt: pure, stepped at a fixed rate, seeded, and telling what happened as events |
| `src/game/lodge.ts` | Between hunts: the save, the board, the muster within supply, what coin buys, what a hunt pays |
| `src/game/bot.ts` | A player made of rules, for the measure and the scripts |
| `src/view/pictures.ts` | Which picture stands for what. The figures are stand-ins from the Legion art kit; the game's own style is being drawn in `VennethN/game-assets` and comes in through this table |
| `src/view/scenes` | Boot, the lodge, the lair, the HUD over it, the result |
| `src/view/light` | The light of a lair: a filter on its camera, lights that follow things, what shines by itself, and a second camera for what must stay sharp (the tells above all) |
| `src/art` | The Legion art kit, as it came from Lastander |
| `scripts` | The art build, the walk, the smoke, the film, the measure |

How an attack is written: an entry in a monster's `attacks` with the seconds its tell shows, the seconds it is open afterwards, its harm, and its `shapes` (`line`, `cone`, `ring`, `marks`, `lanes`), each of which may come `after` a delay. `summon` raises helpers where marks land, `charge` has the monster run its line, `root` holds the hunter. A monster's three `parts` are each a round of attack names, used in order; `mark`, `far` and `near` on an attack say when it is passed over. An ability is an entry in `ABILITIES` with a `kind` that names its rule in `hunt.ts` and that rule's numbers.

## Commands

| | |
| --- | --- |
| `npm run dev` | The game at http://127.0.0.1:5180/ |
| `npm run check` | Type check, tests, build: all three before a commit |
| `npm run art` | Writes the pictures the game shows, from the kit, to `public/assets` |
| `npm run pace` | The measure: hunts played by the bot. `--runs=16`, `--monster=`, `--hunter=`, `--mark=`, `--why`, `--things`, `--careless` |
| `npm run walk` | Pictures of every state to `build/walk`. States: `first lodge camp hunt tells states result pause`. `--size=frame,small,full,phone-wide,phone-tall` |
| `npm run smoke` | Plays the game through its own buttons and keys, with the mouse and by touch |
| `npm run film` | Films a hunt frame by frame to `build/film` |
| `npm run build:crazygames` | The copy for CrazyGames |

`?res=1` on the address draws at one canvas pixel to a window pixel.

## The measure

With the bot as a careful player (it sees a tell after a quarter of a second and misses one in fourteen), 16 hunts each, with pikemen, a barricade and a watchfire, on 25 November 2026:

| Monster | Mark | Marta | Jory | Agnes | Brask |
| --- | --- | --- | --- | --- | --- |
| The Sexton | 1 | 100%, 3:00 | 100%, 4:14 | 81%, 3:59 | 100%, 3:45 |
| The Sexton | 2 | 38%, 3:23 | 63%, 5:23 | 0% | 0% |
| The Sexton | 3 | 0% | 13%, 5:48 | 0% | 0% |
| The Antlered King | 1 | 100%, 3:12 | 100%, 4:38 | 88%, 5:06 | 100%, 3:58 |
| The Antlered King | 2 | 100%, 3:47 | 81%, 5:39 | 75%, 6:21 | 100%, 5:01 |
| The Antlered King | 3 | 75%, 4:40 | 88%, 6:50 | 13%, 8:01 | 94%, 6:17 |

Hunts won, and how long a won hunt took. The aim was: the first mark nearly always, the second about half the time, the third seldom, in three to six minutes. The Sexton is there. **The Antlered King is too easy at his second and third marks**, most of all for Marta and Brask, and Agnes is the weakest hunter against both: these are the next numbers to set. What kills: the risen and the lantern (the Sexton), thorns and the herd (the King).

What each thing brought is worth, by itself, at the second mark (8 hunts each, so only big differences mean anything): against the Sexton with Marta, nothing wins 25%, crossbowmen 63%, pikemen 50%, two ballistae 100% in half the time; sappers, the bell post, barricades and the watchfire made no difference the measure can see. Against the King nothing brought changed whether the bot won. The bot does not use a bell or a fire as a player would, so this measures the bot as much as the things.

## Not yet looked at

- **Nobody has played it.** Everything was seen in pictures taken by scripts, with the bot steering, in a headless browser that draws in software.
- **The figures are stand-ins** from the Legion kit (a tall guard for Marta, a gravedigger drawn big for the Sexton, a stag for the King). The look is not this game's yet.
- **Speed** on a real graphics card and on a phone.
- **Sound**: the sounds are Lastander's, picked by name for each thing that happens. Nobody has listened.
- **The pictures of the walk at `full` and `phone-wide`**, and the film in motion.
- Whether the tells can be read fast enough by a person at the second and third marks: the bot's quarter second is a guess at a person.
