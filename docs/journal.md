# The journal of Boss Hunters

The newest round is at the top. Each round says what was built, who looked at it and what they said, and what was decided next. `docs/design.md` is what the game is to be.

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
