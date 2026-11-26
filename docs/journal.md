# The journal of Boss Hunters

The newest round is at the top. Each round says what was built, who looked at it and what they said, and what was decided next. `docs/design.md` is what the game is to be.

## Round 8, easier, for a web portal

The owner: "lets make the difficulty a bit easier, i dont mean dark souls difficulty, since this will be on crazygames page". Aimed at a casual player: the first difficulty won by the bot 90% or more, the second 70 to 85%, the third 50 to 65%, and a hunt of one to three minutes at the first.

What changed, all in content.ts:

- **The difficulties** (`MARKS`): Difficulty 1 is gentler than before (the boss has 80% of its health, hits for 90%, and its warnings last 5% longer); Difficulty 2 is about what Difficulty 1 was in damage, with its health back to the base; Difficulty 3 keeps its steps above that but far less steep (health 1.22 and damage 1.3 times the base, where they were 1.4 and 1.45; warnings 80% as long, where they were 74%; the walk between blows 72%, where it was 66%).
- **Fewer and slower helpers.** The risen: 4 at once, not 6, slower, and their own warning 0.6 s, not 0.5; More Graves opens 4 graves, not 5. Spiderlings: 3 at once, not 4, slower, warning 0.6 s.
- **Bury** warns for 0.95 s, not 0.8, its marks come a little further apart, and each hits for 14, not 16.

Every attack still has its warning, and the warnings are only longer. Measured with `npm run pace -- --table --runs=24` (24 hunts a contract, the eight hunters in turn, the bot, the first muster). Won, the average length of a won hunt, and the hunter's health left at the end of a won hunt:

| Contract | Before | After | After, auto attack alone |
| --- | --- | --- | --- |
| Gravedigger 1 | 96%, 2:38, 63% | 100%, 2:02, 83% | 100%, 2:16, 74% |
| Gravedigger 2 | 71%, 2:55, 35% | 100%, 2:46, 55% | 83%, 3:13, 56% |
| Gravedigger 3 | 4%, 3:07, 9% | 54%, 3:29, 25% | 50%, 3:52, 23% |
| Antlered King 1 | 100%, 4:29, 63% | 100%, 3:26, 75% | 100%, 4:21, 71% |
| Antlered King 2 | 50%, 4:43, 48% | 92%, 4:13, 64% | 96%, 5:19, 58% |
| Antlered King 3 | 21%, 6:06, 40% | 46%, 5:02, 43% | 50%, 5:48, 55% |
| Spinner 1 | 92%, 3:07, 64% | 100%, 2:24, 85% | 100%, 2:16, 80% |
| Spinner 2 | 75%, 3:27, 59% | 83%, 3:11, 76% | 96%, 3:06, 52% |
| Spinner 3 | 13%, 3:20, 79% | 71%, 3:46, 40% | 58%, 3:33, 35% |
| Bell Abbot 1 | 96%, 3:57, 75% | 96%, 2:45, 81% | 100%, 2:46, 81% |
| Bell Abbot 2 | 79%, 4:27, 60% | 92%, 3:33, 69% | 96%, 4:10, 62% |
| Bell Abbot 3 | 21%, 5:21, 32% | 71%, 4:53, 50% | 54%, 5:37, 44% |
| Furnace 1 | 96%, 2:35, 76% | 100%, 1:58, 81% | 88%, 2:05, 84% |
| Furnace 2 | 88%, 2:41, 51% | 100%, 2:37, 69% | 92%, 2:38, 73% |
| Furnace 3 | 63%, 3:19, 39% | 71%, 2:43, 53% | 67%, 3:32, 47% |
| Mirror King 1 | 88%, 3:37, 61% | 100%, 2:46, 74% | 100%, 3:01, 76% |
| Mirror King 2 | 67%, 3:28, 55% | 96%, 3:39, 53% | 100%, 3:50, 57% |
| Mirror King 3 | 21%, 4:24, 39% | 54%, 3:41, 30% | 46%, 4:28, 46% |

The first difficulty is now won nearly always, in about two to three and a half minutes. The second is won 83 to 100% of the time, a little above the aim: the bot is steadier than a new player, so it is left there. The third is now 46 to 71%, where it was 4 to 63%; what kills there is the third difficulty's own attacks (the King's Crossing Herd, the Mirror King's reflections), as it should be. The Antlered King's hunts are still the longest, at three and a half minutes at the first difficulty.

## Round 7, a hunter's page that says what to press

The owner: "for the menu in boss hunters, can we make it clearer of the button to select which hunters? the ui currently is very messy". The page a hunter opens to from the inn was rebuilt as one layout:

- **At the left, the hunter**, large and lit on their card, their name and title, and one big button, CHOOSE and their name. It is the only thing that chooses a hunter. Once chosen it is greyed and says CHOSEN, and the card is stamped CHOSEN. On a contract for a party, ADD AS PARTNER or REMOVE PARTNER under it, and how many partner places are left (`placesOf` in lodge.ts).
- **At the right, a ledger page** in three headed blocks: STATS (Health, Damage of each blow of the chain, Range and Speed, with the rank and trinkets in, as the hunt has them: `statsOf`), SKILLS (each its mark, name, key and one short line, `brief` in content.ts, whose numbers a test holds to the full line's; pressed, the full line is said) and GROWTH (the rank, a bar to the next and what it gives, the trinket slots with their pictures, and the trophy for the hunter going).
- **Along the bottom, what to bring**: a card each with its picture, name and supply cost large; one going has a lit gold edge and a tick, not a faint word. The supply is large at the bottom left.
- **One action to a corner**: BACK at the top left, back to the inn, and HUNT AS and the name of the hunter going at the bottom right. "HUNT AS THEM" is gone; the inn's HUNT says the name too.
- **Who hunts is shown everywhere in the lodge**: their likeness and name in the top bar, which opens their page, and a CHOSEN plaque at their place in the inn (a partner's says PARTNER).

Looked at in pictures at 907x510, 821x462 and on a phone held sideways and upright: a hunter not chosen, chosen, a party contract, and the first hunts. The pictures found the torch of Agnes reaching over her title and the tick's count drawn over a barricade, both fixed.

## Round 6, auto attack again, with the hand over it

The owner: "let's bring back autoattack for bosshunters, but make manual attack override auto attack". Built as a rule in `hunt.ts` with tests (`AUTO` in content.ts):

- **Auto attack** strikes for the player's hunter whenever the boss, or else a helper, is in reach and attack is not pressed, in the hunter's own chain. It starts no blow while the hunter stands in a warning or in the line of a charge: a blow plants a melee hunter, and the first try, which only kept clear of warnings about to land, let the Antlered King's charge kill most of the melee hunters (Ned won 1 hunt in 16).
- **A press overrides it.** From the press the blow goes where the player aims, as before, and auto waits a second after attack is let go before it strikes again. Auto never cranks a heavy shot.
- **AUTO ATTACK: ON / OFF** in the pause panel, on unless turned off, kept in the save. The lesson has it on too, and its strike step now says "Walk up to him: you attack on your own. Press J or click to strike when you choose." (on touch, "Tap ATTACK").
- **A small AUTO over the ATTACK button**, lit while auto is striking and dim while it waits or a press has taken over.
- Partners and the bot press as they did. `npm run pace -- --auto` has the player's hunter strike by auto alone, the bot only walking, dodging and using skills and the horn.

Measured at the first mark, 16 hunts each of the 48 pairs of boss and hunter: the bot pressing, 96% won in 3:27 on average; auto alone, 97% won in 3:46. Auto is a little slower, as it stops striking in the red. It is worst with Jory against the Furnace (38% against 63%), where a bow that stands still in the cinders is caught.

## Round 5, the artist's sixth pass

The artist drew Old Amos, the Drover, and Bull, his mastiff, in place of Brask and two hounds; the eight trinkets; and four looks a hunter earns by rank (a cord at the belt, a cloak, a trophy at the shoulder, a mantle with a gilt edge). They are in:

- **Ranks are worn.** A part of the kit's with a rank is drawn only from that rank, by the kit's own rule (`wornAt`), in the inn, on the hunter's page, in the hunt, on partners and on the record. The kit counts the first rank as 1 and the game as 0, so a figure is dressed at the game's rank plus one (`dressAt` in `pictures.ts`).
- **A rank gained is a moment** on the hunter's record: the hunter in their new look, lit, rising into place, with a sound.
- **The manifest carries which parts hide in a still.** Before it did, a hunter sat on a bench drew their standing legs as well as their seated ones.
- **Bull lies by his master** in the inn, in the kit's `lie` still. Amos's figure stands for the game's `brask`.
- **Trinkets have their own pictures** in the shop and in a hunter's trinket slots.
- **Small things left from round 4:** a bill's strip no longer lies over the boss's name; the "more below" band hides what it covers; the hands for hire say what they are in one line; on a touch screen the stick stays off the camp's cards until a thumb is on it.
- **Not done:** the kit's hearth, bar, stair, door and window were compared with the room drawn in code and left out, since the drawn ones are lit and in scale and the kit's are a first pass.

## Round 4, after the review

A review of the live game asked for seven things, in order. What was done:

1. **The hunter is always seen.** A bright outline of the hunter is drawn over everything while something stands in front of them; a boss reaching down over them fades; the ring at their feet is stronger; helpers and partners keep a step away (`ROOM` in content.ts, with a test). Numbers that land together are added into one.
2. **The words keep off the fight.** A banner that only says how things stand (the boss waking, a phase, reinforcements) gives way to a warning, goes when one comes up, and sits under the attack's name, which nothing covers. The move hint is shown in the lesson only, beside its plate. The lesson's plate keeps clear of the buttons and moves up out of the way of a warning laid under it. A hunt with mouse and keys has an ATTACK button (J). A touch screen that says it is a desktop is played by touch, with touch's words.
3. **The tasks are on the field.** The villagers and the cart to be kept have a gold ring and a mark over them, the markers to be broken a red one, and an arrow at the edge of the screen points toward one out of sight. A figure's shadow lies on the ground as shade, not as a hole.
4. **Growth between hunts** (`src/game/growth.ts`, with tests): a rank for each hunter from hunting with them (five, each a little more Health and Damage, 3% to 12%, and the third a second trinket slot); eight trinkets, each one small rule no trophy already gives, the plain ones sold in the shop and the rare ones only dropped by contracts; the week's hard contract (two of its boss's variants, three times the pay, a trinket for certain); and three chains of contracts that tell a story across their posters, with a prize at the end. Shown on a hunter's page (rank, how far to the next, trinket slots), on the bills and the contract page (the week's and a chain's strip), and on the hunter's record (experience, rank up, what was found). Measured: at the last rank, Marta's third marks go up by 10 to 40 points; the first two were already won.
5. **The lodge.** The shop is a sheet of cards with pictures, every ware seen at once. The contract page says at its foot when there is more below. The bills keep their words at the smallest legal size and drop the variant's name before shrinking. Cards on the muster not going stay readable. The inn opens on the hunter who goes, Amos sits on a bench and Ned at the table in the kit's own sitting pose, the hands for hire lean on the bar under a line saying what they are. The banner's two lines no longer touch.
6. **Old Brask is now Old Amos, the Drover**, with one big mastiff, Bull, in place of two dogs: the same two skills, retuned and measured. His lines are his own. Until the artist draws them, Amos is Brask's figure and Bull is the hound drawn bigger.
7. **The artist's fifth pass** is in: the three villagers, the cart whose wheels turn, the sellsword and the bowman, the grave marker, the totem, the standing stone and the jaw trap replace the last stand-ins; what was broken stands broken; every icon is the kit's own. Whole figures are written for cards only, and the art is 3.2 MB.

Looked at: the lodge (board, inn, a hunter's page, the shop) at 907x510, 821x462 and on a phone upright; the lesson's first steps, camp, a party hunt with villagers and with the cart, the boss's states and the hunter's record at 907x510; and the film of a hunt against the Gravedigger (`npm run film`, 1800 pictures), as strips. The pictures found three faults, fixed: every card of the muster showed the same figure, the camp's line ran off the left edge, and numbers kept adding up through a whole stun. The smoke: 95 of 96 checks passed, the one failing being its own old expectation that a mouse hunt has no ATTACK button (it has one now); it was run beside another project's smoke, so not alone.

Not done: the kit's hearth, bar, stair, door and window are not placed in the inn (its own drawn ones stand); the lodge was not seen at the phone held sideways; and the growth screens were seen in pictures only.

## The contract screen, the camp's cards and the inn's ten places

The owner: "contracts on one side and the selected contract details on the other / Selecting it will show more details about the contract / Plus the boss you'll be facing", and of the camp: "Make sure to make the items clearer / Not just words / But cards with pictures".

- **The board** is a column of posted contracts beside a dossier of the one picked: the boss large and lit, the lair, who posted it and why (and a word from Hobb), what is unlike it this time with the tasks, the party's places, everything it pays, and "Know your quarry": each of its attacks with how its warning looks and what to do, its weak place, its three phases. What has not been seen is "???" until a hunt reaches it (`quarryOf` in lodge.ts; the save keeps how far into each boss a player has been, `met`).
- **Camp** is a row of cards, one for each building brought, with its picture, its name and how many are left. A card picked up stands as a ghost on the ground with its true reach, green where it may go and red where not; a press on the ground sets it down there with a thump and dust; a building set down is picked up again by pressing it. Number keys pick the cards. `whyNotAt`, `placeAt` and `lift` in hunt.ts, with a test.
- **The inn** has places for the four new hunters (Ida in the door to the river, Silas at a butcher's block, Greta by an anvil in the corner by the fire, Ned at the end of the long table). With ten people the room is wider than the screen and is dragged sideways. A hunter shut away is a black shape and ???; how to open them is said only when they are pointed at or tapped.
- **The four later lairs** are dressed from the kit's pieces (cellar, abbey, foundry, hall), the Furnace's heat is a bar under its stagger with what it means now, a tall boss's head is kept below the bars, and long skill names have a short word on their buttons.

## Four more hunters and four more bosses

The owner: "Add more hunters as well / and bosses".

**Built** (the rules in `src/game`, with tests in `tests/bosses.test.ts`):

- **Four hunters**, each a way of fighting the first four do not have. **Greta Hale**, the Smith: a forge hammer, slow huge blows; her blows fill stagger half as much again as their harm and her second stuns small things; *Forge Strike* (the boss burns and its armor cracks, so everything fills more stagger) and *Anvil* (shown where it will fall, holds what is under it, and stays as a stone that stops a charge). **Ned Rook**, the Miner: a pick that does three times its harm to small things and to anything that stands still; *Powder Keg* (thrown, shown with its fuse, and a hunter left in it is hurt too) and *Cave-in* (rocks along a strip a second after it is shown). **Ida Marsh**, the Ferrywoman: the longest reach, a jab that pushes and a sweep that pulls small things to pole length; *Shove* (throws small things back, and timed as the boss winds up, puts it off its blow) and *Lantern Wake* (light left behind her: hunters faster in it, enemies slower). **Silas Grey**, the Butcher: fast cuts that make the boss bleed more with every one; *Hook* (drags a small thing to him, or him to the boss) and *Hack* (six cuts where he stands).
- **Four bosses**, each one idea, posted one after another after the King: **the Spinner** (webs that hold whoever walks into them, egg sacs that hatch until broken, and she drops out of the dark where the ground is marked and is soft while she climbs back), **the Bell Abbot** (the bell rings with a band of safe ground between its rings, monks walk round singing and mend him, and shallows slow everyone), **the Furnace** (it must be cooled to be hurt: a water barrel broken next to it; left alone it vents, and is then open and cool), **the Mirror King** (he steps out of one mirror and leaves a reflection in each of the others; the true one makes the big marks; a mirror broken takes its reflection with it). Three difficulties each, a variant each (Brood Mother, Full Choir, Stoked, Gallery), a dozen reasons on the board each, their minions for Escort and Endless Minions, markers for three of them.
- **Trophies**: the Spinner's Silk opens Greta, the Abbot's Bell Rope Ned, the Furnace's Grate Ida, the Mirror Shard Silas. Each does a little for whoever wears it (design.md says what).
- **Lines**: about sixty for each new hunter, and wake, change, last, big, reel and die for each boss (the Spinner and the Furnace are heard, not spoken); the first four hunters have a line for coming into each new lair.
- **Nothing hurts without a tell** still: every new attack is a shape on the ground; what a hunter's own skill does to the party (a keg) is shown the same way. The test that plays every monster and every variant takes the four new ones in.
- **The bot** walks round webs, keeps out of its own kegs, does not roll through a band of safe ground narrower than its roll, breaks sacs and mirrors when the boss is not open (a bow leaves those to blades), cuts down singing monks, and waits by a barrel for the Furnace to come to it when it is hot. A bow stands further off from the later four, and shoots first what has come close and is too quick to walk away from.
- **Tuned on the way**: Jory has 96 Health (was 84) and his bolts do 8 and 10 (were 7 and 9): he lost to every new boss before. The monks mend far less than at first (7 a second each, then 1.5), and the Abbot has 3000 Health; the Furnace 3400, more barrels; fewer spiderlings and cinders; the Abbot's second toll is shown once the first has rung.

**The drawn figures** came from the art agent (game-assets 43895be) and are in: `src/grim` copied from the kit, the four grounds written by the game's art build, the new figures, moves, stills and helpers named in `pictures.ts`, each blow of the new chains shown by its own move, the Spinner hanging by her thread while she is in the air, the Furnace's water shown only while it is cooled, reflections a little see-through, webs, shallows, a lantern's light, an anvil and a keg drawn on the field at the rules' size, a broken sac, barrel or mirror left where it stood, and the new skill and trophy icons in the interface. The bosses' posters are not written into the build until a screen shows them.

**Measured**: `npm run pace`, ten hunts each, every hunter against every boss.

Difficulty 1, hunts won and how long a won hunt took:

| Boss | Marta | Jory | Agnes | Brask | Greta | Ned | Ida | Silas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| The Gravedigger | 100%, 2:34 | 80%, 4:14 | 100%, 2:29 | 100%, 2:36 | 100%, 2:21 | 100%, 2:29 | 100%, 2:49 | 100%, 1:59 |
| The Antlered King | 100%, 3:41 | 100%, 4:35 | 90%, 6:00 | 100%, 4:08 | 100%, 2:45 | 50%, 4:48 | 80%, 5:54 | 100%, 2:41 |
| The Spinner | 100%, 2:42 | 80%, 6:44 | 100%, 3:54 | 100%, 2:44 | 100%, 2:32 | 100%, 2:11 | 90%, 4:03 | 100%, 2:09 |
| The Bell Abbot | 100%, 3:46 | 80%, 7:14 | 100%, 4:42 | 100%, 3:21 | 100%, 3:13 | 100%, 3:29 | 100%, 5:30 | 100%, 2:19 |
| The Furnace | 90%, 2:37 | 70%, 6:08 | 100%, 2:03 | 100%, 2:04 | 100%, 2:14 | 100%, 2:14 | 100%, 2:24 | 100%, 1:49 |
| The Mirror King | 100%, 2:53 | 70%, 7:31 | 100%, 3:19 | 100%, 2:53 | 80%, 2:51 | 100%, 3:10 | 100%, 3:34 | 100%, 2:26 |

Difficulty 2, hunts won and how long a won hunt took:

| Boss | Marta | Jory | Agnes | Brask | Greta | Ned | Ida | Silas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| The Gravedigger | 90%, 3:09 | 20%, 4:22 | 70%, 2:58 | 40%, 3:17 | 80%, 2:50 | 90%, 2:51 | 60%, 3:20 | 90%, 2:25 |
| The Antlered King | 80%, 4:16 | 90%, 5:43 | 60%, 7:04 | 90%, 4:36 | 60%, 3:21 | 50%, 5:25 | 60%, 6:50 | 80%, 3:06 |
| The Spinner | 100%, 3:09 | 30%, 8:04 | 60%, 4:07 | 100%, 3:55 | 80%, 2:58 | 100%, 2:43 | 50%, 4:47 | 80%, 2:47 |
| The Bell Abbot | 100%, 4:38 | 0% | 80%, 5:59 | 100%, 4:18 | 100%, 3:42 | 100%, 3:54 | 80%, 6:49 | 100%, 2:58 |
| The Furnace | 100%, 3:22 | 20%, 7:22 | 100%, 2:28 | 100%, 2:33 | 100%, 2:36 | 100%, 2:46 | 80%, 2:47 | 100%, 2:11 |
| The Mirror King | 100%, 3:27 | 40%, 7:53 | 90%, 3:57 | 100%, 3:47 | 70%, 3:01 | 100%, 3:50 | 100%, 4:06 | 90%, 2:56 |

Over all six bosses, difficulty 1 and 2: Marta 98% and 95%, Jory 80% and 33%, Agnes 98% and 77%, Brask 100% and 88%, Greta 97% and 82%, Ned 92% and 90%, Ida 95% and 72%, Silas 100% and 90%.

What it says: at difficulty 1 every one of the eight beats every boss most of the time, but Ned against the King (half: the charge catches him), and none wins twice as often as another. At difficulty 2 Jory is the one left behind (a third, against nine in ten for the best): a bow is chased by the later bosses' young and marks, and his hunts there take seven minutes or more, into the boss's impatience. The Silk, the Bell Rope, the Grate and the Shard were not worn in these hunts. Two measures with other dice differ by fifteen points or so, so only bigger differences mean anything.

**Not looked at**:

- Nobody has played any of the eight. They were seen in pictures of the lair a few seconds after the boss wakes, and in pictures of each attack's warning, taken by the walk at the small frame only, not on a phone.
- The Furnace's heat is not on the screen: no bar says how hot it is, and nothing but the size of the numbers says it is hot. Its water shows while it is cooled.
- The new lairs have their grounds but no dressing set out round them (the kit drew casks, pillars, flats and more: `DRESSING` in the lair has no entry for them yet), and no music of their own (they borrow the Gravedigger's).
- The inn has no place for the four new hunters, and the contract screen does not show the posters (the screens agent's).
- How a web, an anvil, a keg on its fuse, a lantern's light and a broken prop look at speed; the Spinner's thread; the reflections' see-through look beside the true King.
- The bot is the only player of them. Jory is the weakest of the eight against the later four; a person who uses his trap and tar as the bot does not may do better.

## The effects, and the warnings as marked ground

The owner asked to "improve the vfx of boss hunters so its more engaging", and then, of the warnings: "Also please update the markings (its just a plain circle)".

**Built** (`src/view/vfx`, hooked into the lair in a few lines):

- **Blows that land**: a star of light at the point, splinters flung the way the blow went, blood (some of it the style's bright red) that falls and lies, chips and clods off a heavy blow, the struck figure flat white for an instant (a boss only on a big blow or one in his opening), a short hold of the lair scaled to the blow, the screen knocked along the blow's line. A blow in his opening stings with gold splinters. A blow that meets nothing is a paler, thinner arc that whistles.
- **Each hunter's blow left in the air**: Marta's halberd a broad pale crescent, Agnes's pole a ribbon with fire along it, Brask's spear and Jory's bolt a thrust wedge, with a puff and a kick at the bow.
- **The boss's blows**: the ground darkens where it will fall as the moment comes, dust is drawn in to his feet, his lamp flares; a spade ploughs a furrow and throws earth to both sides, a sweep cracks across its arc, a ring breaks the ground in a star and rolls a wave of dust out; marks stay a while and fade. The King's charge kicks the ground up behind him and leaves hoof marks; what he crashes into flies apart.
- **Stagger and the break**: cracks of light open in him as the stagger fills; when it breaks they burst into gold splinters, the field behind him goes dark, his lamp gutters, the screen leans in. **His fall**: the lair slows, a last light, ash comes down over him and embers go up, and the dark lifts over a few seconds.
- **The lair**: fog in layers, leaves blown across the churchyard, embers off fires and burning tar, crows on the walls and trees that take off when something big lands.
- **The hunter's moments**: a dodge leaves a trail of after-images and a perfect one slows the lair for a breath; an iron ring for Block; teeth and blood for a trap; tar splashing; the flare's white then smoke; streaks behind the dogs; light rising for healing. Badly hurt, the colors drain and the edges beat red.
- **The warnings as marked ground** (`Tells.ts`): at the rules' own shape and size, darkened inside, a hard dark-red edge with a scratched line along it, a pattern for the kind (a spade's lane raked, grave earth heaving, hoof marks down a charge's lane, frost for the King's gore and stomp), the time as a fill that grows from where the blow comes from and reaches the edge as it lands, a beat that quickens in the last half second, the safe middle of a ring edged in pale, and the one the hunter stands in a little brighter.
- **EFFECTS: FULL or CALM** in the pause panel, and a most for what is alive at once that follows the light's setting.

**Fixed after looking**: the boss going wholly white on every blow (now only big or open blows, for an instant, by real time); the screen's flash held for seconds by the hold of a blow (it goes by real time now); the wind-up's lamp washing the whole lair red-brown; cracks of light that read as bats (now thin splits); the fall and a badly hurt hunter washing the screen out.

## Round 3, 25 November 2026: posted contracts, a party, and attacks by hand

The owner asked for three things in one go: the bosses as wanted posters that are random contracts, each unlike the last ("there could be a variant of the boss that is quicker, / Or there could be additional minions, or additional task"); partners on a contract ("one contract can house 2,3,4 hunters and we're just one of the hunters / The rest are AIs on our side"); and "Make it also so attacks are not automatic".

What was built, in the rules with tests (tests/contracts.test.ts, 33 of them):

- **The board** (lodge.ts: `board`, `fillBoard`, `repost`, `posterOf`, `rewardFor`, `setupForPosting`, `unposted`). Four contracts drawn by the save's dice; replaced when taken; the whole board again every five hunts; NEW POSTINGS free once between hunts.
- **Variants and tasks** (content.ts `VARIANTS`, `TASKS`; hunt.ts `Terms`, `TaskState`). Nine variants, eight tasks, each a rule in the hunt with a test. Nothing a variant adds hurts without a tell: a test plays every variant with a partner and fails if anyone is hurt by what was not shown.
- **A party** (hunt.ts `party`, partners' brains; lodge.ts `partyFor`, `togglePartner`, `hunterBar`). Up to four hunters; partners are the bot made a partner; down and helped up; the boss chooses among them, grows with them, and has attacks only for three or more. Two hands for hire when the player has too few hunters.
- **Attacks by hand** (content.ts `combo`, `heavy`, `ATTACK`; hunt.ts `attack`, `startBlow`, `landBlow`). Each hunter's chain; held, it repeats; Jory's held bolt; wind-ups that cannot be dodged out of and recoveries that can; aim toward the pointer or the way faced, turned to a boss a little ahead. The lesson's strike step teaches the press.
- **Partners speak**: lines for being helped up and helping, and the hands for hire talk about money.

In the screens, only what keeps it playable: J or K or a held press attacks; partners are drawn; the posted contracts are a plain list with NEW POSTINGS; tasks and partners' health are lines on the HUD. The screens agent makes these into the real thing.

## Round 2, 25 November 2026: the owner's first play

The owner played the published game and said: "let's make it simple for the first boss, e.g no camp, just you vs the boss, / make it essentially a tutorial / make the animations also clearer/ exagerrated to an extent, / the music also doesnt fit". Then: "dont use sexton name why sexton", and "Give some small dialogue as lore as well / But the dialogue is not blocking".

Built:

- **The first hunt is a lesson.** The title, then PLAY, then Marta against the Gravedigger: no camp, nothing brought, a simpler and slower boss (two attacks, then a third in a short second phase), and seven steps the hunt waits on, each taught on a plate at the foot of the screen and done once. Time slows the first time a warning shows. The next two hunts each bring in one new thing (a Barricade and the camp; Spearmen and the horn), and then the team and the shop open.
- **Plain names.** The Gravedigger, the Warden, the Poacher, the Dog Handler, the Mirror King; Dodge, Block, Sweep, Phase, Reward.
- **The game's own style** is in: every figure, the churchyard and the winter wood, icons, bars and buttons from `VennethN/game-assets`.
- **Clearer animation.** A boss's attack is a held, trembling wind-up past its pose, a strike that snaps out and stretches and is drawn as a smear along its warning's shape, and a slow, sagging recovery. Heavy blows stop the lair for a breath; the stagger breaking stops it longest, bursts gold and slows the lair for a beat.
- **Music written for the hunt** (merged from its own branch): the lodge, a near silent lair, a piece for each boss in three steps, and moments for waking, breaking and falling. The old fanfares are gone.
- **Lines**: about 230 short lines, hunters to each boss and each boss's story in pieces, shown by the speaker, never blocking. LINES turns them off.

The game agent that began this round stopped on a usage limit half way; another finished it from where it was left.

## Round 1, 25 November 2026: the game, with stand-in pictures

The project was begun from Lastander's: its build, scripts, sheet, figures, input, sound, portal code and the light on the field are kept, and its rules, screens and data were taken out.

Built:

- **The rules of a hunt** (`src/game/hunt.ts`), pure and seeded: camp before the monster wakes, the hunter's strike, roll and two abilities, the horn, the monster's rounds of attacks each with its tell, stagger and breaking, three parts, helpers, reinforcements, buildings, traps, tar, and how it ends. 50 tests.
- **Everything as tables** (`src/game/content.ts`): four hunters with eight abilities, the Sexton (nine attacks) and the Antlered King (seven), the risen, three reinforcements, four buildings, three marks.
- **The lodge** (`src/game/lodge.ts`): the save, the board, the muster within supply, trophies that open things and are worn, what coin buys. 11 tests.
- **The screens**: the lodge in three leaves, the lair with its camp and its hunt, the HUD, the result. A new player is put straight into the Sexton's lair.
- **The lair's light**, dark: the hunter's lantern, the monster's glow, a watchfire, burning tar, flashes; the tells are drawn over the dark and stay sharp.
- **A bot and a measure** (`npm run pace`). The table is in the README.

Measured: the Sexton is about where it was aimed (first mark nearly always, second about half, third seldom, three to six minutes), but Brask cannot win his second mark. The Antlered King was made harder three times and is still too easy at his second and third marks. Each thing brought changes the outcome against the King; against the Sexton the ballista, pikemen and barricades do.

Looked at: every screen at 907x510, the lodge, the camp and the monster's states at 821x462 and on a phone held upright, every attack's tell half shown, and a hunt against the Sexton in its middle. The smoke plays it through its own buttons and keys with the mouse and by touch: 61 checks pass.

Not looked at: nobody has played it, and the figures are stand-ins. The README's last section has the list.

## Round 0, 25 November 2026: the plan

The owner asked for a new game, Boss Hunters: each stage a boss to kill, a hunter with special abilities to control, reinforcements and support buildings to bring, in 2D as Lastander is, in a style of its own after the look the owner named ("Darkest dungeon-ish"; and then, of my first reading, "not necessarily dark ink / just darkest dungeon style").

Two things are begun side by side:

1. **The style**: its rules, its kit for drawing in code, and the first figures (two hunters, one monster, a reinforcement, a building), in `VennethN/game-assets` beside the Legion style.
2. **The game**: the project begun from Lastander's, the rules of a hunt as pure code with tests, and one monster that can be fought, with stand-in pictures until the style's are ready.
