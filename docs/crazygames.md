# Lastander on CrazyGames

What the portal asks of a game, what this game does about each, and what to fill in when it is sent in. The rules were read from the portal's own developer documentation on 26 November 2026; each line gives the page it came from. "Passed" is what was already right, "fixed" what was changed in this pass, "not checkable here" what only their QA tool, a real phone or a person can say.

## The listing

**Name:** Lastander

**Description** (no fixed numbers: the owner, "ITS GOING TO GET UPDATED"):

> Hold the line against wave after wave. Pick a hero, each with a passive and a skill of their own, and fight with weapons that swing and shoot by themselves while you move. Between waves, spend your coins at the camp on weapons, items and relics, choose your road, and level up. Bring companions along, unlock more heroes, and grow each hero's mastery from run to run. How long can you stand?

**Controls:** Move with WASD or the arrow keys (the keys are read by where they are, so ZQSD works on a French keyboard). SPACE uses your hero's skill. P pauses. On a phone, drag anywhere to move and tap the skill button.

**Tags** (from the portal's list, https://www.crazygames.com/tags): Horde Survival, Survival, Roguelike, Hero, Medieval, Bow, Magic, 2D, Mobile.

**Covers** (https://docs.crazygames.com/requirements/game-covers/): `docs/covers/cover-landscape.png` (1920 x 1080), `cover-portrait.png` (800 x 1200), `cover-square.png` (800 x 800). The title is the only words on them, and there is no border, icon or "Play".

**Preview videos:** not made in this pass (see the end).

**Upload pack:** `build/crazygames/` holds the zipped build (`lastander-crazygames.zip`, made by `npm run package:crazygames`), the three covers and this file.

## The checklist

### Technical (https://docs.crazygames.com/requirements/technical/)

| What they ask | Here | State |
| --- | --- | --- |
| Initial download at most 50 MB, and at most 20 MB for the mobile home page, measured to the first gameplay start | About 0.7 MB before the first wave starts for a new player (`npm run firstplay`); the whole build is 4.7 MB | passed |
| Total at most 250 MB, at most 1500 files | 4.7 MB in 126 files: the small pictures now ship in bundles (`bundleArt` in `vite.config.ts`) | passed, and fixed (607 files before) |
| Relative paths only | `base: './'` in `vite.config.ts`; nothing under an absolute path | passed |
| Works on Chrome and Edge; Safari games that misbehave are switched off there | Chromium headless only | Chrome passed; Edge and Safari not checkable here |
| Smooth on a 4 GB Chromebook | The effects are capped and step down on slow frames, as the light does | not checkable here |
| Mouse, keyboard and touch if mobile | Keys by `KeyboardEvent.code`, mouse, and a touch stick and button (`src/view/input.ts`) | passed (the smoke plays it by keys and by touch) |
| Landscape on desktop | The screen is laid out for any shape | passed |
| `user-select: none` on the page | `index.html` | passed |
| Resume audio after iOS interrupts it, on a touch | `sfx.ts` resumes a suspended or interrupted context on the next touch | passed (read in the code; not tried on an iPhone) |
| SDK: a gameplay start when the player reaches play | `CrazyGamesPortal.gameplayStart`, called when a wave starts | passed |

### Gameplay (https://docs.crazygames.com/requirements/gameplay/)

| What they ask | Here | State |
| --- | --- | --- |
| Text and pictures legible at a device pixel ratio of 1 in 907x510, 1216x684, 1077x606, 821x462, 1366x768, 1920x1080, 1536x864, 1280x720, 800x450 (mobile) and 1080x607 (tablet) | No words under 15 layout units (eleven pixels in the smallest frame); pictures of the main screens at every one of those sizes (`npm run walk -- --size=...`, the `cg-` sizes) | see "Looked at" below |
| Physics the same at any refresh rate | The wave steps at a fixed rate whatever the frame rate (`STEP` in `world.ts`) | passed |
| English | All in English | passed |
| Intuitive controls; keys that adapt to the layout | Keys by position | passed |
| Loads quickly, no errors or crashes | No error on the console in the portal check (`npm run portal`) | passed |
| Original name, art and content | Drawn in code in the game's own kit | passed |
| No custom fullscreen button | None | passed |
| No cross-promotion | No links of any kind | passed |
| PEGI 12 | Cartoon fighting, no blood | passed |
| Land new users in gameplay at once (at most one click) | A new player is in the first wave with no click; the first wave's pictures load first and everything else after (`src/view/stream.ts`) | passed, and faster: 4.2 s at 4 Mbit/s and 100 ms, from 9.0 s |

### Quality guidelines (https://docs.crazygames.com/requirements/quality/)

| Guideline | Here | State |
| --- | --- | --- |
| Onboarding in gameplay, little text, skippable | Taught by doing: a plate says each thing once when it first matters (move, red warnings, the skill when it first fills) | passed, and fixed: the skill no longer casts itself on a first run, and is taught |
| Escape not used | P pauses; Escape is left to the portal | passed |
| Clear goals, a pause, a mute | WAVE n, bosses, the camp; P and the pause button; SOUND and MUSIC in the pause panel, and the portal's own mute is obeyed | passed |

### Advertising (https://docs.crazygames.com/requirements/ads/)

| What they ask | Here | State |
| --- | --- | --- |
| Only ads through the SDK | Only `requestAd` | passed |
| Video ads never interrupt play; only at a natural break | A midgame ad is asked for when the player leaves the camp or picks a road, never in a wave | passed (the portal check sees one asked for on the road screen) |
| The game paused and muted during an ad, sound back after | No wave runs while it is asked for; the game is muted from `adStarted` and the portal's own mute put back after | passed |
| An unfilled ad lets the game go on | `adError` resolves and the next wave starts | passed |
| Rewarded ads only from a button the player chooses, never failing silently | The game offers none | passed (none) |
| Works with an ad blocker | No ad is needed for anything | passed |

### Account and progress (https://docs.crazygames.com/requirements/account-integration/, https://docs.crazygames.com/sdk/data/)

| What they ask | Here | State |
| --- | --- | --- |
| Progress kept through the data module, for guests and players signed in | The save goes to the SDK's data module on the portal (`CrazyStore`), and a save made in the browser before is brought over once | passed |
| At most 1 MB of data | A run of a hundred waves kept at every camp is under 8 KB (`tests/portalsave.test.ts`) | passed |
| The game still saves without the SDK | `localStorage` everywhere else | passed |

### The SDK's moments (https://docs.crazygames.com/sdk/game/)

| Moment | When the game says it | State |
| --- | --- | --- |
| `loadingStart` | As soon as the SDK is up | passed |
| `loadingStop` | When the first screen can be played (the first wave stands, or the title is up), not when everything has come | fixed (it was said when the boot was done) |
| `gameplayStart` | A wave starts, or play goes on after the pause | passed |
| `gameplayStop` | Pause, and the end of every wave (the camp, the road, a level up and the end of a run follow it); the title and Upgrades are only ever reached from there | passed |
| `happytime` | A boss falls | passed |

## Looked at, and not checkable here

Looked at: the portal build loaded in the headless browser with the SDK in its local mode (`npm run portal`), which gave the calls above in order and no console error; the first wave, the title, Upgrades and the boss's chest at the portal's frame.

Not checkable here: the portal's own QA tool and its preview page; a real phone or tablet, Safari, a Chromebook; how a real ad looks and sounds over the game; a player signed in to CrazyGames carrying a save between devices.

Not done in this pass: the two preview videos the portal asks for (15 to 20 seconds, 1080p landscape and 2:3 portrait, no sound). `npm run film` films the game frame by frame and can make them.
