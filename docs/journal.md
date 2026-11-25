# The journal of the rework

The newest round is at the top. Each round says what was built, who looked at it and what they said, and what was decided next. `docs/design.md` is what the game is being made into.

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
