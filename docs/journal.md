# The journal of Boss Hunters

The newest round is at the top. Each round says what was built, who looked at it and what they said, and what was decided next. `docs/design.md` is what the game is to be.

## Round 1, 25 November 2026: the game, with stand-in pictures

The project was begun from Lastander's: its build, scripts, sheet, figures, input, sound, portal code and the light on the field are kept, and its rules, screens and data were taken out.

Built:

- **The rules of a hunt** (`src/game/hunt.ts`), pure and seeded: camp before the monster wakes, the hunter's strike, roll and two abilities, the horn, the monster's rounds of attacks each with its tell, stagger and breaking, three parts, helpers, reinforcements, buildings, traps, tar, and how it ends. 50 tests.
- **Everything as tables** (`src/game/content.ts`): four hunters with eight abilities, the Sexton (nine attacks) and the Antlered King (seven), the risen, three reinforcements, four buildings, three marks.
- **The lodge** (`src/game/lodge.ts`): the save, the board, the muster within supply, trophies that open things and are worn, what coin buys. 11 tests.
- **The screens**: the lodge in three leaves, the lair with its camp and its hunt, the HUD, the result. A new player is put straight into the Sexton's lair.
- **The lair's light**, dark: the hunter's lantern, the monster's glow, a watchfire, burning tar, flashes; the tells are drawn over the dark and stay sharp.
- **A bot and a measure** (`npm run pace`). The table is in the README.

Measured: the Sexton is about where it was aimed (first mark nearly always, second about half, third seldom, three to six minutes). The Antlered King is too easy at his second and third marks. Agnes is the weakest hunter.

Not looked at: nobody has played it, and the figures are stand-ins. The README's last section has the list.

## Round 0, 25 November 2026: the plan

The owner asked for a new game, Boss Hunters: each stage a boss to kill, a hunter with special abilities to control, reinforcements and support buildings to bring, in 2D as Lastander is, in a style of its own after the look the owner named ("Darkest dungeon-ish"; and then, of my first reading, "not necessarily dark ink / just darkest dungeon style").

Two things are begun side by side:

1. **The style**: its rules, its kit for drawing in code, and the first figures (two hunters, one monster, a reinforcement, a building), in `VennethN/game-assets` beside the Legion style.
2. **The game**: the project begun from Lastander's, the rules of a hunt as pure code with tests, and one monster that can be fought, with stand-in pictures until the style's are ready.
