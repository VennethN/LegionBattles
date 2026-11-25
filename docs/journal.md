# The journal of the rework

The newest round is at the top. Each round says what was built, who looked at it and what they said, and what was decided next. `docs/design.md` is what the game is being made into.

## Round 4, the Hold: what is kept between runs

Built as pure rules with a test each (`src/game/hold.ts`, its lists and numbers in `holdData.ts`, the save in `state.ts`), and shown as plainly as lets it be used (`HoldScene`, behind THE HOLD on the list of heroes). `docs/design.md`, "Between runs: the Hold", is what was built. It was built in a copy of its own, on the road's work, while the screens for heroes and companions were being made in the main copy.

It was built three times over in one round, and what stands is the third:

1. **First**, as the design then said: renown, prices, six blessings, five steps of danger, deeds, the Chronicle.
2. **Then a designer who had not seen the game read the rules** and said two things of the Hold that were right. Five fixed steps of danger are one other game's exact scheme: so they became **vows**, eight hard rules sworn in any mix. And the Hold was a list of prices, with deeds opening most people in the first few runs and nothing but renown to carry the next fifty: so each hero got **three oaths**, each crate a **deed that opens it for nothing**, each day **a road that is the same for everyone**, and every run's end the **nearest deeds not yet done**. The designer also asked that blessings give choices and no plain numbers.
3. **Then the owner spoke**, and that last point went the other way: "since its roguelite, can we add upgrades we can spend on to make permanent per run". So the blessings became **the board**: thirty-three lasting upgrades on four branches, plain strength among them, and the gifts that give a choice are branches of the same board.

What stands:

- **Renown.** Every run pays when it ends: 2 a wave come through, 10 a captain, 25 for the twentieth wave, a fifth more of all that for each vow it was sworn under, and what each deed done for the first time pays. `record` gives back the tally line by line and the save keeps the last one.
- **The board** (`BOARD`). The hero (health, armor, speed of foot down one side; harm, speed of striking, fury down the other; one getting-up a run at the foot of the first, dear), the band (companions' health, harm, getting up sooner), the purse (coins to begin with, free looks at other wares, marks to strike a ware from the table) and fortune (luck, experience, reach, a third road, a second look at a relic's choice). A place needs the one before it and each has a column and a row for a screen to draw a tree by. `refundBoard` takes it all back for what was paid.
- **The hall and the kennels.** A hero or a companion is opened by their deed, as before, or bought, at prices above the board's, so that renown goes there only for someone stuck. The second place in the band is 100. Seven of the deeds that open people now ask for runs ended (Quill 3, Mossback 5, Isaura 7, Greta 9, Hroth 12, Aldous 18, Thistle 22), so that whoever plays meets someone new every two or three runs; the rest are still deeds of skill.
- **The armory.** A run is offered only what is open: twelve weapons, sixteen wares and ten relics to begin with, the other forty-three things in nine crates by theme. A crate is opened by its own deed or bought. The weapons a run may be offered are an input it is given (`pool`), as the heroes' weapons agent asked.
- **Vows.** Eight: quicker enemies, a dearer camp, no hearts, a champion in every wave, one hand fewer, every wave by night, no rest between waves, a captain that gets up once. A first win opens three and two more open for each vow a win was sworn under. A hero's badge is the vows of their best win.
- **Oaths.** Thirty, three to a hero, as lines of one table: a win (a new name), a win under a vow (a relic to begin every run with), a deed about their quirk (the choice of a second rule for their own weapon: the choice is kept and given to the run as `alt`, and does nothing until the weapons' rules arrive from the other copy).
- **The Daily Road.** `dailyOf(date)` gives a hero, a companion and a seed from the date; one try a day; the whole armory, nothing from the board, no vow.
- **Deeds.** Twenty-eight that pay renown once each, and `nextDeeds` for the end of a run.
- **The Chronicle.** Everything met, with a count; the world now tells who stood on the field, how many of each were slain, a captain felled with no blow landed and a wave come through untouched.
- **One table of names** (`REF`): the captains, kinds of weapon and relics that the Hold's lists lean on, so that one renamed elsewhere is one line.

Measured with the plain player, twenty-four runs to a measure, Bram, Wren, Orrin and Isaura each alone and stopped at the twenty-sixth wave. The number is the mean of the waves come through with every run stopped at the twentieth, over the four:

| What the run began with | Mean of 20 | Won, of 96 |
| --- | --- | --- |
| Nothing bought, a first run's armory | 12.1 | 10 |
| The whole board, the whole armory | 18.1 | 55 |
| The same under three vows (quicker, dearer, no hearts) | 16.1 | 28 |
| Under five vows | 15.3 | 26 |
| Under all eight | 12.8 | 12 |

- **With nothing bought it is as the rules before it left it:** about one run in ten won.
- **With the whole board the plain player wins more than half its runs alone** (and three in four with two companions: Bram with Greta and Pip won 18 of 24). The enemies were not moved to take that back, as the owner's upgrades are meant to be felt.
- **The vows bring it back:** under all eight, with everything bought, it is about where a new player with nothing stands, and still won one run in eight.
- **One vow at a time** was measured only for two heroes and is at the edge of what the measure can tell. Before the board: quicker enemies cost this player nothing, a dearer camp and no hearts each a wave or so, no rest between waves two or three. Second Wind showed nothing: this player seldom reaches a captain in a state to lose to its getting up.
- **A career**, played three times from a new save, a run after a run with whoever is open and has been out least, the renown spent on the cheapest thing: everything open and the board full after 79, 67 and 62 runs. The second place in the band comes after the first or second run. Something is bought after about two runs in three of the first thirty (19 to 21 of 30): a place costs about what a run pays, but a run that ends on the fifth wave pays a tenth of one that is won, so some runs buy two places and some none. Its first run goes far enough to do most of the opening deeds of skill at once; after that someone new comes every two to four runs until the twenty-second. All nine crates were opened by their deeds, not bought. Eighteen to twenty of the thirty oaths were kept by the time the board was full: the oaths outlast it.

What is not as it was asked, or not known:

- **"Something to buy after nearly every run for the first thirty"** is two runs in three for this player, for the reason above.
- **A lock that holds through a camp** was asked for as a gift and is not one: a locked ware already stays for the next camp, for everyone.
- **The second rule for a hero's own weapon is a choice with nothing behind it yet** in this copy.
- **A hero's starting relic was not measured** by itself.
- **The first run's smaller armory makes that run a little stronger,** not weaker, by under a wave: fewer weapons to draw from means more twins to join and more of one kind.
- Nobody has pressed any of it but a script, and the board is shown as a list, not yet as a tree.

## Round 2, the road: roads, relics and kinds of weapon

Built as pure rules with a test each, and shown as plainly as lets them be played. `docs/design.md`, "A run", is what was built.

- **The road.** Out of the camp a run is offered two roads to the next wave, no two alike, rolled by its own dice, and takes one (`src/game/road.ts`, `march` and `takeRoad` in `run.ts`). A run may be begun with three, for the Hold to open later, and a relic adds one. A captain's wave and the first have one road. The seven omens of the design are all there: the quiet road, the horde, champions, the night march, the pay wagon, the shrine and the stray.
- **Relics.** Twenty-six (`src/game/relics.ts`), each bending a rule. One of three is chosen after a captain, after a road of champions and after a night march; now and then the last of the camp's wares is one, at a high price.
- **Kinds of weapon.** Ten kinds, every weapon of one or two, and a gift at two, three and four held (`src/game/kinds.ts`). Thirteen weapons were added so that every kind has at least four to find: twenty-nine in all now. The camp offers a weapon of a kind already held a little more often, as it does a twin.
- **The screens**, plainly: the roads as cards after the camp and a relic's choice as three (`RoadScene`), relics and kinds listed in the camp and pressable, a relic among the wares, the wagon, cage and shrine as pictures on the field with what is left of them, a ring under a champion, the night as a plain dark veil (`src/view/RoadField.ts`).

What was changed from the design and the spec, and why:

- **A champion has seven times the health of the one it is made from, not twice.** Twice was not noticed: three of them fell in the time one captain's blow takes. They are made from the sturdiest who walks in the wave, do more harm, and are worth four times the coins.
- **One stray a run, not two.** Two took the band to four or five with Aldous, and a companion is worth about two waves each.
- **The night march comes from the sixth wave and champions from the fourth**, and both are offered less often than the rest: a run that took every relic road held ten relics by the twentieth wave.
- **Lodestone became the Magpie Feather.** As written (coins fly in when the wave ends) it did nothing: every coin on the field comes in when a wave ends already. It now calls coins in from anywhere while the wave is fought.
- **The Frostbite Ring became the Frostbite Charm,** a shard of ice on a cord. A ring is a band round a dark middle, which is an eye. The pay wagon has no lock on its side for the same reason: two wheels and a mark between them were a face. The dice are marked with scratches, not pips.
- **The Hourglass is called Running Sands,** as a ware is already called Hourglass.
- **A blessing is a level's choice with no level made,** as the design says: it does not add the point of health a level does.

What was measured (`README.md`, "The pace"). With roads, relics and kinds a hero was far too strong for the waves as they were: half of Wren's runs came through thirty-one waves. The enemy curve was set again in three steps:

- Enemies' health grows by a further share of itself for every wave past the fourth, and their harm for every wave past the seventh. The first waves are as they were, to the point: an early enemy's harm is 1 or 2, and one step in the curve that turned a bruiser's 2 into 3 at the fourth wave ended a quarter of all runs there.
- The two walls the first round found (the twelfth wave and the eighteenth) are lower: fewer medjay and drummers come at the twelfth, fewer golems and bears at the eighteenth, and a medjay does a little less. Runs now end all along the way instead of at one wave.
- Hroth, Isaura, Fenn and Bram were brought toward the rest. Hroth was the strongest by far, as he was in the first round: his rage is less than half what it was, he leeches half as much and gets up with a quarter of his health, not a third. Isaura's momentum was eased, Fenn given two health back, and Bram two health and a shield that takes a little more.

Half of each hero's runs now come through ten or eleven waves, and about one run in twelve wins the twentieth (twenty-six of three hundred and twenty; the aim was one in eight). The roads are worth about two and a half waves to the plain player (measured by keeping it to the quiet road), the relics a little under one, and the gifts of the kinds less than the dice move: it buys with an eye to kinds but does not build for them as a person would. A companion is worth two to three waves now, which is more than the one to two that was aimed for; they were made to take a little more of each blow, and it was left there.

Left for the screens that come next: the road and the relic choice deserve more than cards; a champion's trait is only the color of its ring and a line across the screen when it stands; the night is a flat veil that the light should take over (it reads `World.night`); the shrine's filling is a disc on the ground; nothing shows that a relic went off but a small sparkle; the Bone Dice's roll (`World.bones`) is not shown at all; the risen are their red pictures tinted green.

## Round 1, the rules: named heroes and companions

Built as pure rules with tests, and shown on the screens only as plainly as lets them be played. `docs/design.md`, "Heroes" and "Companions", is what was built.

- **The ten heroes have names**, an epithet, who they are and a line they say (`src/game/heroes.ts`). A save from before is carried over to the new names.
- **A weapon of their own** each, which takes no hand, is never for sale, sold or joined, and grows a tier at hero levels 5, 10 and 15. A run starts with it and six free hands.
- **A quirk** each, in place of the old one-line rules, and what the screen can show of it told by the wave (`World.trait`: on or off, and how far along).
- **A move** each, filled by kills, let loose by the space bar, the other mouse button or a button, or by itself (AUTO MOVE, on for a new player) when it is full and there is a crowd, a captain or a hero in trouble. What lands somewhere marks the ground first.
- **Eight companions** (`src/game/companions.ts`) who steer themselves, are struck down and get up, grow with the hero's level, and can be bonded with at a level, three steps each. Biscuit is opened when the first run ends and goes along without being asked.
- **The save** holds who is open, who goes, and how many places the band has (one; the Hold will open the second).

What was measured (`README.md`, "The pace"): a hero comes about two waves further than before, 10 to 15 of the written twenty on the mean, and a companion is worth about two waves more. What the measuring found on the way:

- The move was by far the strongest thing. Let loose every ten seconds, as first written, it took half of all runs past the thirtieth wave. It now takes about four times the kills by the tenth wave, and comes once or twice a wave.
- Fenn's coins from every blow of every weapon were an economy of their own: only his own knives knock them loose now.
- Ysolde's freezing, Maren's hammer from the sky, Isaura's momentum and Hroth's rage were each eased from where the design put them.
- Tam's dragging a fallen hero up is a second life, and was eased twice.
- Twenty-four runs do not tell a companion worth one wave from one worth two. The same measure taken again with other dice moves by a wave or more.

Left for the screens that come next: the hero's own weapon in their hand (it floats with the rest), a move that looks like one, what a quirk is doing shown where the player looks, companions with health over them, the bond's card, the companions' chooser (a button that goes round those who are open), and a hero's page that says who they are.

Not built, and left room for: strays (a companion for one run), the Hold's second place in the band, relics, kinds of weapon, the road.

## Round 0, 25 November 2026: the plan

The owner asked for the game to be reworked entirely: named heroes with quirks, companions opened over many runs, a roguelite with more in it than a row of waves, and light laid over the drawn figures so that it is beautiful. They are away, and asked for the work to go round by itself with agents that review and agents that decide what is next.

Done before the rework began: every figure's weapon hand is held out from its body (the owner: "the hands are too much inwards").

Three things are being built side by side, each by an agent in a copy of the project of its own:

1. **The light**: shaders on the field's camera (lights, an hour for each wave, bloom, depth, grading), fire and shots drawn as light, weather.
2. **The heroes' pictures**: the ten named heroes drawn anew, each for themselves.
3. **The rules**: named heroes with their own weapon, quirk and move, and companions.

After they are brought together: the screens for all of it, then the road, relics, kinds of weapon and the Hold. Then reviewers look at pictures and film of it, and the next round is chosen from what they say.
