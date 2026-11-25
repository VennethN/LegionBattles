# Boss Hunters: the design

This is what the game is to be. It is the brief every agent works from. Where it and the code differ, the code is behind, unless `docs/journal.md` says a thing was tried and changed.

## What the owner asked for

In their words, of 25 November 2026:

- "Let's start another game / Titled 'Boss Hunters' / This will essentially be as we call it a boss hunting game / Each level/stage will feature a boss that we need to kill"
- "The game will be in 2d similar to lastander / But with a different artstyle / Darkest dungeon-ish artstyle"
- "Each level we will be controlling a 'hunter' / Which is essentially a character with special abilities"
- "In each level you'll be able to bring in other things such as reinforcements, support buildings"

It is a game in a genre, with its own hunters, bosses, names and look. The art is in the vein the owner named, drawn by us; no figure, name or picture of any other game is used.

## The game in one paragraph

A contract names a monster. The hunter goes to its lair with what they chose to bring, sets their camp while it sleeps, and wakes it. Then it is one great enemy against one hunter and their few helpers: the monster shows what it is about to do, the hunter reads it, steps out of the way, strikes in the opening, and uses their abilities when they count. It falls, and its trophy opens something new at the lodge. The next contract is worse.

## A hunt

The field is seen from above at an angle, as Lastander's is, with figures drawn from the side. One lair is one screen or a little more.

1. **The contract.** The board at the lodge shows the monsters that can be hunted. Picking one shows what is known of it (little, the first time) and what it pays.
2. **The muster.** The player picks a hunter and what to bring: reinforcements and support buildings, as many as the supply allows. Each thing has a cost in supply; the lodge's supply grows.
3. **Setting camp.** In the lair, the monster has not woken. The hunter walks the field and sets the buildings down where they choose. Nothing can be built once it wakes.
4. **The hunt.** The hunter is steered. They strike by themselves at what is in reach; the player's part is where to stand, when to dodge, and when to use what they have:
   - **Dodge**: a short roll that nothing can hurt, on a short wait.
   - **Two abilities**, the hunter's own, each on its wait.
   - **The horn**: calls a reinforcement onto the field. Each has its charges.
   Keys, a mouse and a phone all work: a stick from any press, and buttons for the four.
5. **The monster.** A great deal of health in three parts; at each part it changes (new attacks, a new shape, helpers). **Everything it does is shown before it does it**: a line it will charge down, a cone it will sweep, a ring that will burst, marks where things will fall. It has a **stagger**: blows in its openings fill it, and when it breaks the monster is down for a few seconds and takes far more. Reading the monster and breaking it is the game.
6. **The end.** The monster falls: its trophy, coin, and the next contract. The hunter falls: the hunt is lost and can be tried again at once, with the same or another muster.

A hunt is three to six minutes.

## Hunters

A hunter is a person with a name, a weapon, a way of fighting and two abilities. Four to begin with, each a different way to play:

| Hunter | Weapon | How they fight | Abilities |
| --- | --- | --- | --- |
| **Marta Voss**, the Lychwarden | a long halberd | up close, slow heavy blows, hard to move | *Brace*: sets the halberd; the next blow that reaches her is turned and fills the stagger. *Reap*: a wide sweep that throws lesser things aside. |
| **Jory Pell**, the Snaresman | a heavy windlass crossbow | from far off, always moving | *Jaw Trap*: laid on the ground; what steps in it is held and takes more. *Tar Flask*: a pool that slows, and burns if fire touches it. |
| **Agnes Thorn**, the Lamplighter | a lamplighter's long pole with a burning wick, and an oil can | middle reach, fire and light | *Flare*: a burst of light that blinds the monster for a moment and burns the small. *Street Lamp*: she stands a lamp on the ground; in its light allies are harder to hurt. |
| **Old Brask**, the Kennelman | a boar spear, and two hounds | with his dogs | *Set On*: the hounds go for the mark and hold it. *Heel*: the hounds come back to him and all three mend. |

Others are opened by trophies.

The names and dress are ours on purpose. A first draft had titles and looks that sat close to figures of other games (a nun with a light, a houndmaster, a trapper with a red scarf over the face, a pale countess); a reviewer said so, and they were changed. A new hunter or monster is held to the same: if it could be mistaken for somebody else's, it is redrawn or renamed.

## What can be brought

**Reinforcements** are called with the horn during the hunt and fight by themselves:

- Pikemen: stand in a line where they are called and hold it.
- Crossbowmen: stand back and shoot in volleys.
- Sappers: run in, set a charge on the monster and run out; the charge fills stagger.
- A surgeon: mends whoever is near, and drags the fallen back.
- Torchbearers: carry light, and burn what webs, roots or fog a monster lays.

**Support buildings** are set down before the monster wakes:

- Ballista: shoots a heavy bolt at the monster every few seconds.
- Watchfire: light in a dark lair, and those near it strike faster.
- Barricade: stops a charge once, and breaks.
- Field tent: standing in it mends, slowly.
- Bell post: rung by a blow from the hunter; its sound breaks what the monster is preparing.
- Tar pit, spike line: laid on the ground.

Each monster makes some of these worth more than others: a charger wants barricades, a thing of the dark wants fire.

## Monsters

Each is one idea, with attacks that teach it. To begin with:

| Monster | The idea | Its lair |
| --- | --- | --- |
| **The Sexton** | a huge gravedigger whose dead get up; his spade falls in lines, and graves open where marked | a churchyard |
| **The Spinner** | webs that hold, young that swarm, and she drops from above where the ground is marked | a rotten cellar |
| **The Antlered King** | he charges the length of the field; he must be made to hit something | a winter wood |
| **The Bell Abbot** | his bell sends rings across the field that must be stood between; his monks walk in procession | a drowned abbey |
| **The Furnace** | an iron thing that vents fire in turning lines and must be cooled to be hurt | a foundry |
| **The Glazier** | he is not where he seems: a thing of mirror glass in a hall of mirrors, and what is struck may be a reflection | a mirror maker's hall |

Each has three **marks** of difficulty: at a higher mark it has attacks it did not have before, and pays more.

## Between hunts: the lodge

- **The board**: the contracts.
- **Trophies**: each monster's first fall gives its trophy. A trophy opens something (a hunter, a reinforcement, a building) and can be worn: one trophy bends one rule for the hunter who wears it.
- **Coin** buys steps of supply and steps for what is brought (a second charge of pikemen, a sturdier barricade).
- What is not yet opened is dark, with "???" and what opens it.

## How it looks

A new house style, its own, kept in `VennethN/game-assets` beside the Legion style. The owner asked for "Darkest dungeon-ish artstyle", and when a first reading narrowed that to heavy ink, corrected it: "actually not necessarily dark ink / just darkest dungeon style". So it is the whole look that kind of game is known for, made as a style of ours:

- **Heavy, stylized figures seen from the side.** Broad shoulders, big hands and boots, a small head sunk between the shoulders, a hunched and weighted stance. Monsters are huge and wrong.
- **Thick black outlines with hard angles, and shadow as a shape.** Solid black is cut across a figure with a hard edge: not a gradient, not hatching.
- **No eyes are drawn.** Faces are there (a jaw, a nose, a brow) but the eyes are always lost in shadow, under a brow, a hood, a helmet or a mask.
- **Flat color in a muted, earthy palette** (browns, rust, dull reds, olive, dirty bone, lead), with red as the accent, warm firelight against cold dark, and a hard-edged lit rim where the light catches.
- **Gothic dress and gear**: worn leather, straps, buckles, rags, pitted iron, masks and hoods.
- **Lairs as dark stage sets** in the same flat shapes: stone, timber, torchlight.
- **Drawn in code**, as SVG, from parts that a rig moves, as the Legion figures are. No picture files made elsewhere, nothing made by an image model.
- **Ours.** It is in that vein, and no character, costume, pose, monster, interface piece or lettering of that game or any other is reproduced. The hunters and monsters are the ones in this design.
- **Lit by the game.** Lairs are dark. The light that Lastander's field has (an ambient hour, lights that follow things, glow, a lens) is this game's too, turned darker: a lantern, a watchfire, a monster's glow.
- The interface is in the same hand: contracts are posted bills, the muster is a ledger.

It must read on a small screen: a hunter stands about 90 units tall on the field and a monster three to five times that; words are never smaller than 15 of the layout's units.

## How it is built

The same way as Lastander, from which the project is begun: Phaser 4, TypeScript, Vite, Vitest; the rules pure and tested in `src/game`, numbers in data, the screens only show and ask; pictures and film looked at by whoever builds, and by reviewers who have not seen the work; a build under 5 MB that runs in a portal's frame and on a phone; text plain, with no em dashes; what nobody has looked at is said.

The owner asked for work to go in rounds with reviewing agents; `docs/journal.md` is where each round is written down.
