# Boss Hunters

A boss hunting game for the browser. A contract names a boss; a hunter goes to its lair with what they chose to bring, sets their camp while it sleeps, and wakes it. Then it is one great enemy against one hunter and their few helpers. `docs/design.md` is what the game is to be; `docs/journal.md` is how far it has got.

## How it plays

- **The lodge.** The board shows the monsters that can be hunted, each at up to three marks of difficulty. The muster is who goes (a hunter), what the horn will call (reinforcements) and what will be built (buildings), within the lodge's supply. The ledger is what coin buys: more supply, a second call, a sturdier building.
- **Camp.** In the lair the boss sleeps. The hunter walks; a building's button (or its number) sets it down a step in front of them. Nothing is built near the boss or once it wakes. WAKE BOSS, or walking into its red ring, begins the hunt.
- **The hunt.** The hunter is steered and strikes by themselves at what is in reach. The player's part is where to stand and when to use what there is: DODGE (Space), the hunter's two skills (Q and E), and the horn (R and F). A phone has the same as buttons, and a stick wherever a finger is put down.
- **The monster shows everything before it does it.** Red on the ground is where a blow will land, and it fills as its time runs out. After an attack it is open (a gold ring): blows then fill its stagger, and when that is full it breaks, lies down for a few seconds and takes twice as much. Its health is in three parts, and at each it changes: a new round of attacks.
- **The end.** It falls: coin, twice for a first fall at a mark; the first fall of all gives its trophy, which opens a hunter and things to bring, and can be worn. The hunter falls: a little coin for each part got through, and the hunt can be tried again at once.

- **What is said.** The hunter and the boss say short lines as things happen: a hunter's reason to be there, the boss's story in pieces, a spearman's shout. A line hangs by whoever says it for two or three seconds and never stops the hunt, asks for a press, or covers a warning or the hunter (where it would, it is dropped). LINES in the pause panel turns them off. The lines are a table in `src/game/talk.ts`.

**The first run.** A new player sees the title and presses PLAY. The first hunt is a lesson: Marta against the Gravedigger, no camp, nothing brought, a slower boss with two attacks and then a third, and seven steps that the hunt waits on, one thing taught at a time on a plate at the foot of the screen (move; step out of the red; dodge; strike by going close; Block; Sweep; fill the stagger). Time slows the first time a warning is shown. Nothing takes her under 40% of her health while steps are left. The bot wins it in a little over a minute; a new player will take two or three. Then the lodge, where each of the next two hunts brings one new thing: a Barricade and the camp to set it in, then Spearmen and the horn. After that the team is whatever the supply carries, and the shop opens.

## What is in it

| | |
| --- | --- |
| Hunters | Marta Voss the Warden (halberd; Block, Sweep), Jory Pell the Poacher (crossbow; Trap, Tar), Agnes Thorn the Lamplighter (Flare, Lamp), Old Brask the Dog Handler (boar spear and two dogs; Dogs Attack, Call Back) |
| Bosses | The Gravedigger (lines of the spade, graves the dead get up from, a lantern that burns all round him), The Antlered King (charges that a stone or a barricade stops, thorns, a herd that runs the field in lanes) |
| Reinforcements | Spearmen, Crossbowmen, Bombers |
| Buildings | Barricade, Campfire, Bell, Ballista |
| To come | Four more bosses stand on the board as dark bills |
| Music | A tune for the lodge, near silence in a lair before its boss wakes, and a piece for each boss that grows with each phase of its health, with moments of its own for the waking, the stagger breaking and a fall (`src/audio/music.ts`; `node scripts/music.mjs` renders it to files) |

## Where things are

| | |
| --- | --- |
| `src/game/content.ts` | Everything there is, as tables: hunters, abilities, monsters and every attack with its shapes, helpers, reinforcements, buildings, the marks |
| `src/game/hunt.ts` | A hunt: pure, stepped at a fixed rate, seeded, and telling what happened as events |
| `src/game/lodge.ts` | Between hunts: the save, the board, the muster within supply, what coin buys, what a hunt pays |
| `src/game/bot.ts` | A player made of rules, for the measure and the scripts |
| `src/game/talk.ts` | What is said in a hunt: the lines, who says them when, and the rules that keep them from crowding or covering anything |
| `src/view/pictures.ts` | Which picture stands for what: the game's own Grim style (`src/grim`, copied from `VennethN/game-assets`), and a dark shape for what is not drawn yet |
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
| The Gravedigger | 1 | 100%, 3:00 | 100%, 4:28 | 88%, 3:15 | 88%, 4:04 |
| The Gravedigger | 2 | 44%, 3:24 | 56%, 5:26 | 38%, 4:17 | 0% |
| The Gravedigger | 3 | 0% | 25%, 6:07 | 0% | 0% |
| The Antlered King | 1 | 100%, 3:24 | 100%, 4:46 | 100%, 4:58 | 94%, 5:06 |
| The Antlered King | 2 | 88%, 4:12 | 88%, 5:59 | 38%, 6:05 | 94%, 5:56 |
| The Antlered King | 3 | 69%, 4:54 | 50%, 7:04 | 19%, 7:13 | 44%, 6:55 |

Hunts won, and how long a won hunt took. The aim was: the first mark nearly always, the second about half the time, the third seldom, in three to six minutes. The Gravedigger is there, but for Brask, who cannot win his second mark. **The Antlered King is still too easy at his second and third marks** for everyone but Agnes: he was made harder three times in this round (more health, harder to break, quicker, heavier blows) and is the next number to set. What kills: the risen, the lantern and being buried (the Gravedigger); thorns, the herd and the charge (the King).

What each thing brought is worth, by itself, at the second mark, 16 hunts each. Two measures with other dice differ by about fifteen points, so only bigger differences mean anything:

| Brought alone | Sexton, Marta | Sexton, Jory | King, Marta | King, Jory |
| --- | --- | --- | --- | --- |
| nothing | 44% | 69% | 63% | 69% |
| Pikemen | 38% | 88% | 75% | 94% |
| Crossbowmen | 50% | 69% | 69% | 88% |
| Sappers | 44% | 81% | 100% | 100% |
| Barricade x2 | 38% | 88% | 94% | 94% |
| Watchfire x2 | 13% | 50% | 100% | 88% |
| Bell Post x2 | 19% | 69% | 81% | 81% |
| Ballista x2 | 100% | 50% | 81% | 88% |

Against the King everything helps, sappers and barricades most. Against the Gravedigger two ballistae win it for Marta in two thirds of the time, and pikemen and barricades help Jory. A watchfire or a bell post against the Gravedigger made the bot do worse: it does not use them as a player would and they are in its way, so that measures the bot as much as the things.

## Not yet looked at

- **Nobody has played it.** Everything was seen in pictures taken by scripts, with the bot steering, in a headless browser that draws in software.
- **The figures in motion.** Each attack's wind-up, strike and recovery, the flinches and the stagger break were made bigger after the owner asked for clearer, exaggerated animation; they were seen in one film of a hunt against the Gravedigger, as strips of frames, and not by a person.
- **Speed** on a real graphics card and on a phone.
- **The music and sounds** were written for this game by rule and measured, not heard. The bank has no long low brass, no choir or organ and no real wind, so horns are short calls and wind is shaped noise.
- **The lines on a phone**, and how often they come in a real hunt: seen in two pictures at 907x510 only.
- **The pictures of the walk at `full` and `phone-wide`**, and the film in motion.
- Whether the tells can be read fast enough by a person at the second and third marks: the bot's quarter second is a guess at a person.
