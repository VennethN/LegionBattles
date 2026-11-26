# Boss Hunters

A boss hunting game for the browser. A contract names a boss; a hunter goes to its lair with what they chose to bring, sets their camp while it sleeps, and wakes it. Then it is one great enemy against one hunter and their few helpers. `docs/design.md` is what the game is to be; `docs/journal.md` is how far it has got.

## How it plays

- **The lodge.** After the first three hunts the board holds posted contracts: four at a time, drawn by the save's own dice, each a boss at a difficulty with things that make it unlike the last hunt of it (a variant such as Quick, Armored, Giant or Blighted; more minions), tasks besides the kill that pay more (Fast Kill, Careful, Break It, No Camp, Markers, Villagers, The Cart, No One Falls), and how many hunters it takes (1 to 4). A contract taken comes off when its hunt ends and a new one goes up; every five hunts the whole board is posted again; NEW POSTINGS does it for free once between hunts. A boss whose first trophy is not taken always has a plain contract on the board. Before that, the board shows the monsters that can be hunted, each at up to three marks of difficulty. The muster is who goes (a hunter), what the horn will call (reinforcements) and what will be built (buildings), within the lodge's supply. The ledger is what coin buys: more supply, a second call, a sturdier building.
- **Camp.** In the lair the boss sleeps. The hunter walks; a building's button (or its number) sets it down a step in front of them. Nothing is built near the boss or once it wakes. WAKE BOSS, or walking into its red ring, begins the hunt.
- **The hunt.** The hunter is steered and attacks when the player attacks (J or K held, or the mouse or a finger held down on the field without dragging). A press is a blow that winds up and then lands; pressed again before the chain runs out, the next blow of the hunter's own chain (Marta: a wide cleave, then a thrust; Jory: a shot, then a shot and a long reload, or held, a heavy bolt cranked and loosed; Agnes: a jab, then a swing that leaves fire; Amos: three thrusts, Bull joining the third). Held, the chain goes on by itself. A blow cannot be dodged out of while it winds up (0.14 to 0.3 seconds); its recovery can. With AUTO ATTACK on (the pause panel; on unless turned off) the hunter also strikes by themselves whatever is in reach while attack is not pressed, but never while standing in a warning; a press overrides it, and auto waits a second after attack is let go. The rest is as before: DODGE (Space), the two skills (Q and E), and the horn (R and F).
- **A party.** A contract may take two, three or four hunters: the player and partners steered by the hunt's own brain (the bot's, as a partner: it reads the warnings, dodges, presses in the openings, uses its skills, keeps out of the player's way, goes round the boss to its own side, and helps the fallen up). The partners are the player's own unlocked hunters first, then hands for hire (a Sellsword and a Bowman, weaker, who take 20% of the coin each). A hunter at no health is down, not dead: standing by them for 2.8 seconds helps them up with 35% of their health. The hunt is lost only when everyone is down. The boss turns on the party (most often the nearest, sometimes the one who hurt it most, now and then the farthest), has more health, a bigger stagger and less rest between attacks for each hunter more, and with three or more has attacks it never uses alone (Wide Sweep, Wide Gore) and splits some of its marks between two of them.
- **The monster shows everything before it does it.** Red on the ground is where a blow will land, and it fills as its time runs out. After an attack it is open (a gold ring): blows then fill its stagger, and when that is full it breaks, lies down for a few seconds and takes twice as much. Its health is in three parts, and at each it changes: a new round of attacks.
- **The end.** It falls: coin, twice for a first fall at a mark; the first fall of all gives its trophy, which opens a hunter and things to bring, and can be worn. The hunter falls: a little coin for each part got through, and the hunt can be tried again at once.

- **What is said.** The hunter and the boss say short lines as things happen: a hunter's reason to be there, the boss's story in pieces, a spearman's shout. A line hangs by whoever says it for two or three seconds and never stops the hunt, asks for a press, or covers a warning or the hunter (where it would, it is dropped). LINES in the pause panel turns them off. The lines are a table in `src/game/talk.ts`.

**The first run.** A new player sees the title and presses PLAY. The first hunt is a lesson: Marta against the Gravedigger, no camp, nothing brought, a slower boss with two attacks and then a third, and seven steps that the hunt waits on, one thing taught at a time on a plate at the foot of the screen (move; step out of the red; dodge; strike by going close; Block; Sweep; fill the stagger). Time slows the first time a warning is shown. Nothing takes her under 40% of her health while steps are left. The bot wins it in a little over a minute; a new player will take two or three. Then the lodge, where each of the next two hunts brings one new thing: a Barricade and the camp to set it in, then Spearmen and the horn. After that the team is whatever the supply carries, and the shop opens.

## What is in it

| | |
| --- | --- |
| Hunters | Marta Voss the Warden (halberd; Block, Sweep), Jory Pell the Poacher (crossbow; Trap, Tar), Agnes Thorn the Lamplighter (Flare, Lamp), Old Amos the Drover (goad-spear and Bull, his mastiff; Set Bull On, Call Back); and, opened by the later bosses' trophies, Greta Hale the Smith (forge hammer; Forge Strike, Anvil), Ned Rook the Miner (pick; Powder Keg, Cave-in), Ida Marsh the Ferrywoman (ferry pole; Shove, Lantern Wake), Silas Grey the Butcher (cleaver and hook; Hook, Hack). Hired hands, the Sellsword and the Bowman, fill a party's empty places |
| Bosses | The Gravedigger (lines of the spade, graves the dead get up from, a lantern that burns all round him), The Antlered King (charges that a stone or a barricade stops, thorns, a herd that runs the field in lanes), and after them, one at a time: the Spinner (webs that hold, egg sacs that hatch until broken, a drop from the dark where the ground is marked), the Bell Abbot (rings with a safe band between them, monks who mend him, shallows that slow), the Furnace (must be cooled with water to be hurt; its heat is a bar under its stagger, and it vents when full), the Mirror King (reflections in mirrors on the field; only the true one is hurt; a mirror broken takes its reflection) |
| Reinforcements | Spearmen, Crossbowmen, Bombers |
| Buildings | Barricade, Campfire, Bell, Ballista |
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
| `src/view/vfx` | What a blow does beyond the figures: sparks, blood, chips and dust thrown (`Bits.ts`), cracks and furrows left on the ground (`Decals.ts`), the screen knocked and flashed (`Feel.ts`), the warnings drawn as marked ground (`Tells.ts`), the lair breathing (fog, leaves, embers, crows), all of it set off from the hunt's events in `Vfx.ts`; the shapes are drawn once onto the sheet (`shapes.ts`) |
| `src/art` | The Legion art kit, as it came from Lastander |
| `scripts` | The art build, the walk, the smoke, the film, the measure |

How an attack is written: an entry in a monster's `attacks` with the seconds its tell shows, the seconds it is open afterwards, its harm, and its `shapes` (`line`, `cone`, `ring`, `marks`, `lanes`), each of which may come `after` a delay. `summon` raises helpers where marks land, `charge` has the monster run its line, `root` holds the hunter. A monster's three `parts` are each a round of attack names, used in order; `mark`, `far` and `near` on an attack say when it is passed over. An ability is an entry in `ABILITIES` with a `kind` that names its rule in `hunt.ts` and that rule's numbers.

## Commands

| | |
| --- | --- |
| `npm run dev` | The game at http://127.0.0.1:5180/ |
| `npm run check` | Type check, tests, build: all three before a commit |
| `npm run art` | Writes the pictures the game shows, from the kit, to `public/assets` |
| `npm run pace` | The measure: hunts played by the bot. `--runs=16`, `--monster=`, `--hunter=`, `--mark=`, `--why`, `--things`, `--careless`, `--auto` (the player's hunter strikes by auto attack alone) |
| `npm run walk` | Pictures of every state to `build/walk`. States: `first lodge camp hunt tells states result pause`. `--size=frame,small,full,phone-wide,phone-tall` |
| `npm run smoke` | Plays the game through its own buttons and keys, with the mouse and by touch |
| `npm run film` | Films a hunt frame by frame to `build/film` |
| `npm run vfx` | Films the effects, each moment as a strip, to `build/vfx`: `blows slam break fall charge hurt skills rest lab tells`, a size such as `390x844`, and `LIGHT=off` for the field without its light. Wants a served build (`URL=`) |
| `npm run build:crazygames` | The copy for CrazyGames |

`?res=1` on the address draws at one canvas pixel to a window pixel.

## The measure

With the bot as a careful player (it sees a tell after a quarter of a second and misses one in fourteen), 16 hunts each, with pikemen, a barricade and a watchfire, on 25 November 2026:

| Monster | Mark | Marta | Jory | Agnes | Amos |
| --- | --- | --- | --- | --- | --- |
| The Gravedigger | 1 | 100%, 3:00 | 100%, 4:28 | 88%, 3:15 | 88%, 4:04 |
| The Gravedigger | 2 | 44%, 3:24 | 56%, 5:26 | 38%, 4:17 | 0% |
| The Gravedigger | 3 | 0% | 25%, 6:07 | 0% | 0% |
| The Antlered King | 1 | 100%, 3:24 | 100%, 4:46 | 100%, 4:58 | 94%, 5:06 |
| The Antlered King | 2 | 88%, 4:12 | 88%, 5:59 | 38%, 6:05 | 94%, 5:56 |
| The Antlered King | 3 | 69%, 4:54 | 50%, 7:04 | 19%, 7:13 | 44%, 6:55 |

Hunts won, and how long a won hunt took. The aim was: the first mark nearly always, the second about half the time, the third seldom, in three to six minutes. The Gravedigger is there, but for Amos (then Brask), who could not win his second mark. **The Antlered King is still too easy at his second and third marks** for everyone but Agnes: he was made harder three times in this round (more health, harder to break, quicker, heavier blows) and is the next number to set. What kills: the risen, the lantern and being buried (the Gravedigger); thorns, the herd and the charge (the King).

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
- **The effects** (`src/view/vfx`) were seen as strips of frames in the headless browser, set off by hand and in bot-played hunts, at 907x510 and on a phone upright: not by a person, not moving at speed on a real screen, and not on a slow phone. How many bits are alive at once is held under a most (260, 140 or 90 by the light's setting), but their cost on a real phone was not measured. The cracks of light on a boss, the crows and the fog are faint in the dark lairs and were judged from stills.
- **The marked ground of the warnings** (`Tells.ts`) was seen held still at three moments of its time for every kind, and in two films; nobody has read one at speed.
- Whether the tells can be read fast enough by a person at the second and third marks: the bot's quarter second is a guess at a person.
- **The four later hunters and bosses in a real hunt.** The Spinner, the Abbot, the Furnace and the Mirror King, and Greta, Ned, Ida and Silas, were measured by the bot and seen in pictures of each boss waking and of each of their attacks' warnings; nobody has played them. The Furnace's heat bar and what it says were seen in pictures only. Their lairs are dressed from the kit's pieces and were seen in those same pictures.
- **The inn with ten people.** The room is wider than the screen and is dragged sideways; it was seen at 907x510 and on a phone upright, never dragged by a hand. Greta, Ned, Ida and Silas stand in poses made from their parts: the kit has no sitting or leaning yet.
- **The contract screen and the camp's cards** were seen in pictures at 907x510, 821x462 and on a phone upright; picking up a card and setting it down was done by the walk script with a mouse, never by a finger.
- **Partners on screen.** Their plates, the help ring and the target mark are drawn; whether partners read as helpful, get in the way, or stand on the player is unknown.
- **How attacking by hand feels.** With a mouse the left button attacks toward the pointer, with a faint wedge at the hunter's feet; on touch a big ATTACK button aims itself when tapped and the way it is dragged when held. Whether a wind-up of a fifth to a third of a second feels heavy or sluggish, nobody has felt.
- **Auto attack** was tested as a rule and measured with the bot, which then only walks, dodges and uses skills (`npm run pace -- --auto`). Whether a second's wait after letting go of attack is too long or too short, and whether a player notices that auto stops striking in the red, nobody has felt. The AUTO mark on the ATTACK button was seen in pictures only.
- **Ranks, trinkets, the week's contract and chains** were tested as rules and measured with the bot; their screens were seen in pictures only, and nobody has played a week or a chain through.
- **Old Amos and Bull, the ranks' looks and the trinkets' pictures** are the artist's sixth pass. They were seen in pictures of the inn, a hunter's page, the record and a party hunt at 907x510 and on a phone held sideways. A hunter dressed at each of the five ranks was seen on the artist's sheet, not in the game; the rank-up moment on the record was seen once, still, never moving.
- **The inn's kit pieces.** The kit draws a hearth, a bar, a stair, a door and a window of its own. They were compared with the room drawn in code and not used: the drawn ones are lit by the room's own glow and stand at its size, and the kit's are a first pass (the artist's words). The table, the benches, the block, the forge corner, the rack and the barrels are the kit's.
- **The outline over a covered hunter, the task marks and the arrows at the screen's edge** were seen in a few pictures, not in motion.
- **Partners as people.** They were measured by the bot playing with them, not watched: whether they read as helpful, get in the way, or stand on the player is unknown.
