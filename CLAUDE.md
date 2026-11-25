# Notes for agents

Read `README.md` first: it says how the game plays and where everything is. Before drawing anything, read `.claude/skills/legion-art/SKILL.md`.

## Check

```sh
npm install
npm run check      # type check, tests, build: all three have to pass before a commit
```

Nothing after a push runs them for you.

## Look at it

There is no screen here, so look at pictures:

```sh
npm run dev &                       # http://127.0.0.1:5175/
npm run walk                        # every state at a portal's frame, to build/walk
npm run walk camp title --size=small,phone-tall
npm run smoke                       # plays it through its own buttons, with mouse and by touch
npm run film                        # films it frame by frame, to see it move
npm run light                       # the field under its light, each hour of each land, to build/light
```

Read the PNGs with the Read tool. Do this after any change a player will see, at the small frame and on a phone as well: most of what goes wrong is layout. `scripts/walk.ts` sets a state up by standing a run up as described (`window.stage`), so add a state there for a new screen. The smoke finds a button by the words on it, so give a new one words.

With the field's light on, the headless browser makes every frame in software and the smoke takes over half an hour: play it with `LIGHT=off TELL=1 npm run smoke` (about nine minutes; `TELL` says each check as it goes; `ONLY=frame` or `ONLY=phone` plays one of the two, and `SHOTS=folder` keeps a picture of the first camp). It holds the buttons and the rules behind them to working, not the shaders: look at those with `npm run light`. Do not change files while a walk or a smoke runs against `npm run dev`: the page reloads under it. Build and serve the build instead (`npm run build`, `npx vite preview --port 5179`, `URL=http://127.0.0.1:5179/`). A picture run cut off by a timeout can leave its browser running and eating a core: `pkill -f chrome-headless-shell` when nothing of yours is running.

The headless browser draws a few frames a second. The scripts take over the page's clock (`page.clock.install()`, then `pauseAt`), and from then on `runFor(1000 / 60)` is one frame of the game. Without the pause real time runs as well, and what is recorded is a timelapse.

## Rules of the project

- **The rules are pure, in `src/game`, with tests.** `world.ts` and `run.ts` know nothing of the screen. A new rule goes there with a test, not into a scene.
- **The numbers are in `src/game/data.ts`, `heroes.ts`, `companions.ts`, `kinds.ts`, `relics.ts`, `road.ts`, `holdData.ts` and `mastery.ts`,** each with a comment that says what it is for.
- **A change to a number is measured.** `npm run pace` before and after, twelve runs at the least, and say what moved. `--why` finds a wall, `--friends` measures the companions, `--nomove`, `--noquirk` and `--nogrow` say what a part of a hero is worth, and `--quiet`, `--norelics` and `--nokinds` what the road, the relics and the kinds of weapon are. An early enemy's harm is 1 or 2: the smallest change to how harm grows is a half or a whole again on some wave, so look at where runs end, wave by wave, after any change to it. Two measures with other dice differ by a wave or more: believe a bigger difference than that, or play more runs.
- **The screens show and ask.** A scene never works out what something costs or does: it asks `run.ts`.
- **What the screens show of a hero's quirk, their move and the band, the wave tells them:** `World.trait`, `World.fury`, the companions in `World.band`, and the events. A screen never works a quirk out for itself.
- **What a road puts on the field and what a relic does, the wave tells the screens too:** `World.omen`, `night`, `shrine`, `risen`, `bones`, a foe's `champion` and `def.prop`, and the events `champion`, `wagon`, `bless`, `free`, `relic` and `risen`. `src/view/RoadField.ts` shows them.
- **The Hold's rules are functions on a save, in `src/game/hold.ts`.** A screen never works out what is unlocked, how many slots there are, or what a run is paid: it asks. A run takes what the Hold gives it when it begins (`beginRun`: its vows, the weapons it may be offered and what else is shut, its slots, what the hero's mastery has unlocked) and keeps that to its end, so a crate or a level unlocked in the middle of a run changes the next one.
- **A new weapon, ware or relic is in the armory from the start unless a crate in `holdData.ts` names it.** Put a new one in a crate whose theme it fits, or make a new crate with a quest of its own: `tests/hold.test.ts` holds the start to enough for a good first run, and every crate's quest to one a first run's armory can do.
- **Mastery makes a hero stronger for good, and the enemies are not made stronger to take it back.** The owner: "as for permanent upgrades, it'll be hero based". What keeps the game hard for a mastered hero is the hundred waves and the vows. So after a change to a track (`src/game/mastery.ts`), measure with no mastery, with the whole track (`--mastery=all`), and with it under vows.
- **A vow is a rule that is felt, not a share more of everything.**
- **Every hero's track has the same shape** (`trackOf` in `mastery.ts`): a new hero needs four stat steps, a relic and a title in `OWN`, and two passives of their own in `PERKS`, each a rule the wave keeps and the screen sees. A new kind of gift is a line in `Gift`, in `giftSays`, in `Boons`, and wherever a run or a wave takes it.
- **`holdData.ts` names bosses and kinds of weapon through `REF`, at its top.** A quest or a crate that needs a name from another list takes it from there, so that one renamed is one line.
- **Companions go in slots unlocked by the best wave** (`SLOT_WAVES`), six at the most, and each one's share of health and damage falls as the band grows (1/sqrt of its size). A new companion has a way to be unlocked (`Route`: a wave, a quest, a hidden quest with a riddle, or found in a cage), and is drawn with a unit the kit has.
- **What the Hold changes about how far a run gets is measured:** `npm run pace -- --mastery=all`, `--six`, `--vows=3` or `--vows=march,wind`, `--pool=start`, and `--career` for how many runs it takes to unlock everything and when each slot comes.
- **A relic bends a rule; it is not a line of stats.** A plain stat is a ware's or a kind's gift.
- **Everything an enemy is about to do is shown before it does it:** a mark where it will stand, a line it will run down, a ring it will burst in. A new way of fighting comes with its warning.
- **The art is drawn in code, in the kit's style.** No image files, no AI pictures, no art copied from another game. Nothing has a face: no eyes, mouths, noses or brows, and no two dark openings side by side that could be read as eyes. A pale ring round a dark middle is an eye too: an orb with a halo was, and is a cut stone now. So is a finger ring (the relic that was to be one is a shard on a cord), a wheel with a hub beside another, and a die's pips (the Bone Dice are scratched).
- **The pictures are flat and the game lights them.** The rule against gradients is about figures and things. The two pictures of light in `src/art/fx.ts` (`glow`, `flame`) fade to nothing, because light has no edge; they are only ever colored and added by `src/view/light`, never shown as things. Everything about the light is in that folder: the color of each hour in `hours.ts`, how strong each light is in `FieldLight.ts`, the lens's numbers on `StageFilter`. Look at a change with `npm run light`, at noon and at night both, and with `--mode=off` beside it.
- **Red means harm and nothing else.** A red line or ring on the ground is a blow that is coming, with a hard edge that says how far and a fill that says how soon. Nothing that is not a danger is drawn in red on the field: where an enemy will come up the ground only stirs, dark. An enemy's red keeps a plain light at every hour.
- **Nothing that stands is ever out of focus,** and nothing is drawn over the hero. They stand in a ring of their side's blue, and are found at a glance in a crowd and in the dark: look for them first in every picture of a fight.
- **No wave is at noon.** Flat light is no light. An hour has a warm sun, cool shade and long shadows, or it is night with pools of light. With the light on a picture must have more contrast than with it off: compare `--mode=off`.
- **The interface is one kit** (`src/view/ui`). A sheet to read from is the framed panel (a big pale slab becomes one by itself), a screen's heading is on a ribbon and is the biggest words on it, a button is `Button`, and what cannot be had is dimmed with its price in red. A new screen is made of these and comes in with `comeIn`.
- **Under the light an enemy is still easy to find, and what has to be read is not lit.** No hour is so dark that a red figure is lost on the ground. Numbers, the hero's health and the red warnings go through `light.crisp`, which keeps them off the lit camera.
- **It is a game in a genre, not a copy of another game.** Its heroes, weapons, wares, enemies, names and looks are its own.
- **The art build writes only what the game shows,** which `scripts/art.game.ts` says from the game's own data. A picture a screen names has to be on the list in `src/view/icons.ts`: a test says so if it is not.
- **Everything on the field is on one sheet,** and a field's pictures always fit. `tests/art.test.ts` fails when they no longer do.
- **No words smaller than 15 of the layout's units.** That is eleven pixels in the smallest frame a portal shows.
- **What a player has not unlocked is dark, with "???".** What unlocks it is said ("Unlock: clear wave 10."), and nothing else.
- **In-game text is plain game language.** The owner, after playing: "let's fix the wording (its convoluted)". Every string a player reads is written the way a player of this genre reads without thinking:
  - The usual terms: Passive (the code's `quirk`), Skill (`move`), Weapon, Damage (not harm), Attack Speed (not haste), HP or Max HP, HP Regen, Life Steal, Armor, Crit, Range, Move Speed, Pickup Range, Coin Gain, Melee, Ranged and Magic Damage, Unlock and Locked (not open, opened), Boss (not captain), Items (not wares), Camp or Shop, Weapon slots (not hands), Chest (not pack), Companion, Relic, Level up, Upgrade, Reroll, Ban, Risk and Reward on a road (not omen and prize), Mastery (a hero's track), Quests (not deeds), Codex (not chronicle), Daily Run, Weapon types and Set bonus (not kinds and gifts), Revive, Downed, Stun, Slow, Freeze, Burn, Poison, Knockback. Mastery, Vow, Fury and the Hold stay as names, each explained once where it is met.
  - Short and concrete: what happens and by how much, with the player as "you" or no subject at all. "Stand still to raise your shield: take 60% less damage." "Every 3rd bolt casts twice." "Unlock: clear wave 10."
  - Numbers as numbers and percents: "25%", "2x", "0.8 s", "5th". Never "a quarter", "half as much again", "a fifth more".
  - One line each where it can be. A relic or an upgrade says exactly what it does.
  - Labels are the nouns a player expects: COMPANION, WEAPON, PASSIVE, SKILL, BEST: WAVE 6, PLAY, NEXT WAVE, CHOOSE YOUR ROAD, CHOOSE A RELIC, REROLL, MERGE, PLAY AGAIN.
  - A hero's two lines of story keep their flavor, in simple sentences.
  - The smoke finds buttons by their words: change a button's words and the smoke together.
  - This is for what the player reads. Names in the code stay as they are (`quirk`, `move`, `omen`, `kinds`, `gifts`, `boons`), and comments and docs for the owner keep the project's own plain style.
- **The build stays under 5 MB,** in bytes: `du -sb dist`. With a hundred units it is close to it (4,999,425 bytes on 25 November 2026), though every picture is written slim (`slim` in `scripts/art.ts`: no names nothing points at, short paths, the dark line said once as a class), which draws the same. A new land or unit has to find its room. `du -sh` counts a whole disk block for each of three hundred small pictures and says a megabyte more.
- **Comments say why,** in short plain sentences.
- **Text for the owner and for the docs is plain, and has no em dashes.**
- **Say what nobody has looked at.** The README ends with that list: keep it true.

## Git

Work on the branch you are given. Commit messages are in the imperative and say what the change does for the game. Commit and push only what was asked for.
