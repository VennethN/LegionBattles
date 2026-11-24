---
name: legion-art
description: Draws game art in code as SVG in the Legion house style, the look of Legion Battles and its sister games (chunky faceless fantasy figures, one dark outline, a fixed palette, flat cel shading, figures built of parts that a rig animates). Use this whenever a game in this family needs art or its art pipeline, even if the request does not say "skill" or "SVG". That covers a new unit, enemy, hero, boss, building or trap; an icon, card, pack, badge, logo, background, map, cover or thumbnail; a new game that should use "the same art", "the same concept art" or "our art style"; setting up the art build, the contact sheets or the Phaser runtime in a new project; and reviewing or changing anything under src/art. Read it before drawing, because the style has hard rules (no faces, a fixed palette, one line width) that a program can only partly check.
---

# Legion art

The art of these games is not made in a paint program and not generated as images. Every picture is drawn by TypeScript that writes plain SVG: a unit, an icon, the ground of a battle, the logo, the store covers. That is what keeps a whole game's art under a few megabytes, lets one person change every helmet in an afternoon, and makes a new game look like its sisters from the first day.

This skill carries three things: **the rules of the look**, **the kit that draws it** (source to copy into a project, with the whole cast of Legion Battles), and **the way of working** that keeps it right.

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

`assets/pictures/` has what it should look like: `contact-sheet.jpg` (every unit, effect, icon, pack and badge), `parts.jpg`, `poses.jpg`, `silhouettes.jpg`, `scenes.jpg`, `logo.jpg`. Open one with the Read tool before you start, so you are matching a picture and not a description.

## Starting a new project

Copy the kit in with the install script. It never overwrites a file that is already there unless told to.

```bash
node .claude/skills/legion-art/scripts/install.mjs .            # into the project you are in
node .claude/skills/legion-art/scripts/install.mjs . --list     # only say what it would copy
```

It puts the kit under `src/art`, the scripts under `scripts`, and the Phaser runtime under `src/view/art` (see `assets/kit` for exactly what). Then:

```bash
npm install --save-dev @resvg/resvg-js tsx typescript
```

and add to `package.json`: `"art": "tsx scripts/art.ts"`, `"art:sheet": "tsx scripts/sheet.ts"`.

The cast comes with it: about forty-five units, buildings and traps from Legion Battles (`src/art/units`). A sister game uses them as they are; that is what makes it a sister. Draw new ones the same way.

If the project is not TypeScript, the rules and the pictures still hold: port `kit/path.ts`, `kit/draw.ts` and `kit/palette.ts` first, they are small and have no dependencies.

## The way of working

Art here goes wrong in ways a type checker cannot see, so every change ends by looking at a picture.

1. **Say how it is read** before drawing: its head, its weapon, what else. One sentence, kept as the comment at the top of the unit's file. If you cannot say it, it has no silhouette yet.
2. **Reuse parts.** `src/art/kit/parts.ts` has legs, torsos, helms, hoods, weapons, shields and capes. A plain soldier is twenty lines. A new part goes in `parts.ts`, not in the unit's file, so the next unit can use it.
3. **Draw it, and look while you do**: `npx tsx scripts/preview.ts <id>` writes `build/preview.png` in seconds. Open it with the Read tool.
4. **Build and check**: `npm run art` writes the SVG files and the manifest; `npm run art:sheet` draws the contact sheets into `docs/art` and fails on a color off the palette, a line of the wrong width, or SVG that is not plain.
5. **Look at the sheets.** No face anywhere, by accident either. Enough team color to tell sides at a glance. Parts that stay joined in every pose (`poses.png`). A silhouette no other unit has (`silhouettes.png`).

When a request is for something this skill has not drawn before (a vehicle, a creature, a new kind of screen), work out how the rules apply rather than stretching them: a creature still has no face (a beak under a hood, a muzzle in shadow, a mask), a machine has no head at all.

## Where to read more

- `references/rules.md`: the rules in full, with the mistakes that taught them. Read before drawing.
- `references/kit.md`: how the code is laid out, the `Doc` drawing surface, shapes, parts with roles and pivots, poses, and how to add a unit, a building, scenery, an icon, a pack, a logo, a painted scene. Read when writing art code.
- `references/runtime.md`: how a game shows the art: the manifest, packing SVGs onto one texture, and the rigged figure that animates by role in Phaser. Read when wiring art into a game.
- `references/covers.md`: store covers and thumbnails made from the game's own art. Read when asked for a cover, a thumbnail or key art.

## Keeping this skill current

The files under `assets/kit` are a copy of a project's art source. When a project that carries this skill adds parts, units or fixes to the kit, copy them back so the next game starts from them:

```bash
node .claude/skills/legion-art/scripts/sync.mjs .           # project -> skill
node .claude/skills/legion-art/scripts/sync.mjs . --check   # fail if they differ
```

If something about the look is decided anew (the owner asks for more shading, a rule turns out wrong), write it into `references/rules.md` with the reason. The rules there each came from a picture that went wrong.
