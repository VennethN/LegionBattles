---
name: legion-art
description: Draws game art in code as SVG in the Legion house style, the look of Legion Battles and its sister games (chunky faceless fantasy figures, one dark outline, a fixed palette, flat cel shading, figures built of parts that a rig animates). Use this whenever a game in this family needs art or its art pipeline, even if the request does not say "skill" or "SVG". That covers a new unit, enemy, hero, boss, building or trap; an icon, card, pack, badge, logo, background, map, cover or thumbnail; a new game that should use "the same art", "the same concept art" or "our art style"; setting up the art build, the contact sheets or the Phaser runtime in a new project; and reviewing or changing anything under src/art. Read it before drawing, because the style has hard rules (no faces, a fixed palette, one line width) that a program can only partly check.
---

# Legion art

The art of these games is not made in a paint program and not generated as images. Every picture is drawn by TypeScript that writes plain SVG: a unit, an icon, the ground of a battle, the logo, the store covers. That is what keeps a whole game's art under a few megabytes, lets one person change every helmet in an afternoon, and makes a new game look like its sisters from the first day.

This skill carries three things: **the rules of the look**, **the kit that draws it** (source to copy into a project, with a cast of two hundred units), and **the way of working** that keeps it right.

## The look, in short

Read `references/rules.md` before drawing anything. In brief:

- **No faces. Ever.** No eyes, mouths, noses, brows, and no glowing dots. A head is a closed helmet with a dark slit, a hood filled with shadow, a hat over a veil, a wrap or a mask. Two dark openings side by side read as eyes whatever they are meant to be, on a building as much as on a head. No program can check this: you have to look at the picture.
- **One dark line**, `#2a1a10`, 4 px at 1x, round joins and caps, on everything.
- **A fixed palette**, all of it in `src/art/kit/palette.ts`. Nothing is drawn in a color that is not there.
- **Flat shapes only.** A fill, a darker rim away from the light, a lit rim toward it, a streak on polished things. Light comes from the top left. No gradients, blurs or filters in the art itself.
- **Chunky figures.** About 128 px tall on a 192 canvas, feet at (96, 180). The head is 40% of the height, the body short and wide, the legs stubs. Everyone faces right; the game mirrors.
- **Team color on cloth only.** Blue for the player, red for the enemy: a tunic, a cape, a plume. Never on steel or wood.
- **A silhouette of its own** for every unit: a head, a weapon and an off hand that no other unit has together.
- **What is drawn is the thing it is.** A coin is a struck coin, a tower is timber legs and a roof. No letters standing in for pictures, no emoji.

`assets/pictures/` has what it should look like: `contact-sheet.jpg` (the first cast, with every effect, icon, pack and badge), `cast-people.jpg`, `cast-beasts.jpg` and `cast-works.jpg` (the soldiers and townsfolk, the beasts, riders, golems and engines, the buildings and traps drawn since), `parts.jpg`, `poses.jpg`, `silhouettes.jpg`, `scenes.jpg`, `grounds.jpg`, `logo.jpg`, and two of a game on the screen, wide and on a phone (`legion-idle.jpg`, `legion-idle-phone.jpg`). Open one with the Read tool before you start, so you are matching a picture and not a description.

## Starting a new project

Copy the kit in with the install script. It never overwrites a file that is already there unless told to.

```bash
node .claude/skills/legion-art/scripts/install.mjs .            # into the project you are in
node .claude/skills/legion-art/scripts/install.mjs . --list     # only say what it would copy
```

It puts three things in, each at the path it has under `assets/kit`:

- `src/art`: the drawing kit and the cast: two hundred units in sixteen sets, soldiers and townsfolk, beasts and riders, golems and siege engines, buildings and traps. `references/roster.md` lists every one with its set, its role and how it is read. A sister game uses them as they are; that is what makes it a sister. Draw new ones the same way.
- `scripts`: `art.ts` (the build), `sheet.ts` (the contact sheets and checks), `roster.ts` (any units or sets on one sheet, the check of the whole cast, and the list of it), `preview.ts` (a quick look while drawing), and `art.game.ts`, which says what this game shows.
- `src/view`: the Phaser runtime. `art/Sheet.ts` packs pictures onto one texture, `art/Figure.ts` moves a figure's parts by the rig, `config.ts` fits the screen to any window, `ui/bake.ts`, `Effects.ts` and `Numbers.ts` are the small things every screen ends up wanting. Leave it out of a game that is not Phaser.

Then:

```bash
npm install --save-dev @resvg/resvg-js tsx typescript
npm install phaser                                   # for the runtime
```

and add to `package.json`: `"art": "tsx scripts/art.ts"`, `"art:sheet": "tsx scripts/sheet.ts"`, `"art:roster": "tsx scripts/roster.ts"`.

**Then say what the game shows**, in `scripts/art.game.ts`. As it comes it shows everything the kit can draw, on both sides, which is far more than a portal's 5 MB. A game names its cast (who is seen, on which side), its icons, its packs, the word in its logo and its own painted scenes, and only those are written: Legion Idle's art came to 3 MB that way. `assets/examples/art.game.idle.ts` is that game's, which takes its cast from its own data so that a hero added to the game is drawn without anyone remembering to.

If the project is not TypeScript, the rules and the pictures still hold: port `kit/path.ts`, `kit/draw.ts` and `kit/palette.ts` first, they are small and have no dependencies.

## Games drawn with it

- **Legion Battles**, an auto battler: units on a board, cards, packs, grades. Its cover script is `assets/examples/cover.ts`.
- **Legion Idle**, an idle game made from this skill in a day: a legion in ranks on a painted road, with a camp behind it. `assets/examples` has its `art.game.idle.ts`, its cover script (`cover-idle.ts`), and the screen that stands figures up as they are hired and brings a land's enemies in as it is come to (`StageView.idle.ts`, `AssetsScene.ts`). Read those before writing the same thing again.

## The way of working

Art here goes wrong in ways a type checker cannot see, so every change ends by looking at a picture.

1. **Look at who is there already.** `references/roster.md` is the cast. A game that needs a marsh, a mine or a fleet most likely has its people drawn: pick them by set and role before drawing anyone.
2. **Say how it is read** before drawing: its head, its weapon, what else. One sentence, kept as the unit's line in `src/art/units/notes.ts` (a recipe writes it there itself). If you cannot say it, it has no silhouette yet.
3. **Reuse parts.** A soldier is a recipe of a few lines: a head, a body, a weapon and how it is held, an off hand, something on the back, each picked from the catalogue (`src/art/units/catalogue.ts`). A new part goes in the kit (`kit/heads.ts`, `kit/arms.ts`, `kit/gear.ts`) and into the catalogue, not in the unit's file, so the next unit can use it.
4. **Draw it, and look while you do**: `npm run art:roster -- <ids, a set or a role> zoom=2` writes `build/roster.png` in seconds, from the source, whether the game shows the unit or not. Add `both` for the enemy's color too and `pose=strike` to see it mid-blow. Open it with the Read tool.
5. **Check**: `npm run art:roster -- check` holds every unit in the kit to what a program can see: the palette, the line, a shadow and a body, a line in the notes, cloth of its side unless it is a trap. `npm run art` then writes the files a game shows, and `npm run art:sheet` draws that game's contact sheets into `docs/art`.
6. **Look at the sheets.** No face anywhere, by accident either. Enough team color to tell sides at a glance. Parts that stay joined in every pose. A silhouette no other unit has. A batch of new units is looked at twice: small, all together, and then a few at a time and large, which is where a face shows.

When a request is for something this skill has not drawn before, work out how the rules apply rather than stretching them. That has been done for creatures and machines, and the kit has both: a beast has no face (a mask, a plate over the muzzle, a hood, a forelock, a horn where an eye would be), and a machine has no head at all. `references/kit.md` says how each is built.

## Where to read more

- `references/rules.md`: the rules in full, with the mistakes that taught them. Read before drawing.
- `references/kit.md`: how the code is laid out, the `Doc` drawing surface, shapes, parts with roles and pivots, poses, and how to add a unit from a recipe, a beast, a rider, an engine, a building, scenery, an icon, a pack, a logo, a painted scene. Read when writing art code.
- `references/roster.md`: the cast, set by set. Read when choosing units for a game, and before drawing a new one, so that it is not somebody who is already there.
- `references/runtime.md`: how a game shows the art: the manifest, packing SVGs onto one texture, and the rigged figure that animates by role in Phaser. Read when wiring art into a game.
- `references/covers.md`: store covers and thumbnails made from the game's own art. Read when asked for a cover, a thumbnail or key art.

## Keeping this skill current

The files under `assets/kit` are a copy of a project's art source. When a project that carries this skill adds parts, units or fixes to the kit, copy them back so the next game starts from them:

```bash
node .claude/skills/legion-art/scripts/sync.mjs .           # project -> skill
node .claude/skills/legion-art/scripts/sync.mjs . --check   # fail if they differ
```

The kit remembers which project it was last taken from, and will not take from another without `--adopt`: an older game's files would otherwise go over what a newer one added. Before adopting, run `--check` and read the files it lists on both sides.

If something about the look is decided anew (the owner asks for more shading, a rule turns out wrong), write it into `references/rules.md` with the reason. The rules there each came from a picture that went wrong.
