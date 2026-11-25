# The journal of the rework

The newest round is at the top. Each round says what was built, who looked at it and what they said, and what was decided next. `docs/design.md` is what the game is being made into.

## Round 10, after the second review

A fresh reviewer played the pictures of Round 9 and listed what was wrong and what to build next, in five steps. What was done, step by step:

1. **The fix pass.** Boss quests and unlocks name the boss wave from the land's own number (`bossWave`), never a number written in a scene. Shop and relic cards have a fixed layout: name, numbers, one line of what it does cut to fit, and the set bonus; nothing lies on anything else and nothing is shrunk under 15 units. The Hold hides its empty rows, shows UNLOCKED in green and lists the nearest quests first. The Daily tab says the day in words, and the title says DAILY RUN: SURPRISE HERO for a hero not met, where it said "??? + ???". Level-up cards say COMMON, UNCOMMON, RARE or EPIC on their color, where they said I to IV, and are only as tall as what they say. The result no longer says RENOWN EARNED.
2. **The hero always found.** Whoever stands in front of the hero is drawn see-through, and a pale halo shows behind the hero when anything covers them. Damage numbers on one enemy within 0.3 s are added into one, a poison or burn tick is not a number, at most 18 are on screen (a crit and the hero's own hurt always show), and a new one is nudged off one still young. The late lands (steppe, court, city, forge) were looked at in a horde at waves 65 to 95: the enemies are told apart and the hero is found in each, so no land was changed.
3. **Progress readable.** The HUD's bars say HP, FURY and XP, the skill button says SPACE or TAP, and a long skill name is set smaller rather than run over. Each medallion of the mastery track has a label under it (`giftShort` in `hold.ts`: "+16% DMG", "PASSIVE", "CHOOSE 1 OF 2"), both rows run left to right, and the detail box is as tall as its text. The title and the result say the next mastery level and how much mastery it needs.
4. **A lit camp.** When a wave is won the field goes to the land's dusk (`duskOf` in `hours.ts`), a campfire is lit beside the hero (a new picture, `thing-campfire`, which the light makes glow and flicker while the rest of the field is still), and the band stands round it facing the fire. The camp, road, relic and level screens are laid over it with a lighter veil, and each says where on the screen it has room for the fire (`ArenaScene.campFocus`). On a phone the relic, road and level cards stand at the bottom, in thumb reach, with the fire seen above them; a road or relic card is as tall as its words. The hero stands at the fire: there is no sitting pose in the kit.
5. **Something to chase.** Begun, not finished:
   - A weapon on offer with every slot full has SWAP on its card, which opens a list of the weapons held, each with what it sells for; the sale pays for the new one (`canSwap`, `swap` in `run.ts`).
   - Three relics made of two (`FUSED` in `relics.ts`): Bellows and Ember Heart make the Forge Heart (every 3rd kill bursts), Echo Bell and Stormglass the Thunder Bell (lightning every 5 s), Wolfskin and Kennel Whistle the Pack Banner (a companion counts twice as far away). Holding both halves makes the one at once, in one place in the row; it does what both did. A relic card says when taking it would make one.
   - `npm run pace` says how many relics are held as waves 10, 30 and 60 begin. Bram with a full track (12 runs): 4.1 at wave 10, 11.0 at wave 30, none reached 60. One wave rarely gives more than one, so a cap of one a wave changed nothing; most come from roads that pay a relic, which the player chooses. Relics made of two take one place where they took two. The pace itself was not changed.
   - Not built: a fifth form for weapons past tier IV, and two shop items of each land's own.

The smoke passes all 85 checks. It had failed one on a phone: after a reload it pressed CONTINUE while the list was still coming up into place, and the press missed. It waits a moment now, as it does before its other presses.

, the heroes brought level, the Hold drawn

The rules round of the owner's new direction (Round 8) was merged into the copy with the screens of Round 7: one Hold for the new model, the result paying mastery, and both rounds' smokes kept.

**The build** had come to 4,999,670 bytes, a hair under the portal's 5 MB. It is about 4.6 MB now, with nothing seen lost: the build rounds the figures' and the grounds' path numbers to whole units (a test holds that no point drifts more than half a unit along a path, however long), writes the manifest without its spaces, and ships only the woff2 fonts. A test fails the build over 4.8 MB, and `npm run check` builds before it tests so that the test measures the build it made.

**The heroes, brought level.** Measured with 24 runs a hero and Biscuit along. Before: half the runs at the start came through wave 5 to 14 (Bram, Fenn and Isaura lowest, Ysolde highest), and with a full mastery track 7 to 110 (Hroth half his runs to the end, Maren 54, Orrin 38; Isaura 7 and Bram 9, their tracks doing nothing for them). After: 7 to 9 at the start for every hero, and 22 to 37 with a full track. What moved:
- Bram starts with 14 Max HP, 3 Armor and 1 Melee Damage (was 8, 1 and slower feet); his track gives Melee Damage, Armor, 25% Damage and 15 Max HP.
- Isaura starts with 10 Max HP and 2 Armor besides her Melee Damage; her track gives 5 Melee Damage, 30 Max HP, 60% Damage and 6 Armor, so that a person who cannot hold a Tilt still grows.
- Fenn starts sturdier (10 Max HP, 1 Armor) and with less dodge (10); his coins add at most 20% damage, full at 80 held (it was 60% at 240, and a rich run ran away with itself); Lucky Break gives 2 crits, not 3; his track's stat steps are small.
- Ysolde starts with less (1 Magic Damage and 10 Range, was 2 and 20) and her track gives more.
- Hroth's and Maren's tracks give small stat steps; Bloodied and Dawnlight take 10% off a blow, not 20%; Radiance is 0.4x weapon damage in a smaller ring; Hungry Axe heals at most four times a second, as Grave Debt's healing already did, so a sweep through a crowd is one mouthful and not ten.
- Wren's, Orrin's, Old Nan's and Aldous's tracks were set again by the same measure.
Fenn's runs are the most bimodal (half 37, mean 56): one that gets rich still runs far. A person plays Tilt, Stand Fast and the coin toss better or worse than this player; that is not known.

**The Hold, drawn.** The HEROES tab is a row of the heroes (the locked ones dark, with "???") and the chosen one's card (picture, title, mastery level, a bar to the next) beside their mastery track, drawn as a path of twelve medallions: each shows what it gives, lit gold once reached; a level pressed says what it gives under the path, and a pick of two shows the two side by side with PICK. A pick reached and never made is picked out first, so a player sees it. The COMPANIONS tab is the six slots (who is in each; the locked ones with the best wave that opens them) over every companion, unlocked or dark with "???"; pressing one puts it in the band or takes it out, and the foot says what it does or how it is unlocked. The other tabs are the lists they were. The title no longer shows renown, which is gone. The result says a new companion slot or a new mastery level when the run unlocked one.

**A companion in a cage** is seen behind its bars, pacing, and leaps out with a burst of light when the cage breaks.

**The seven new lands** each have their own hours of light (a misty green mire, a bright coast with a pink sunset, the lamplit dark of the mines, a huge low sun on the steppe, a violet gloom in the Hollow Court, a brass haze in the Clockwork City, a forge's smoke lit from below) and their own retelling of one of the three themes, in a key, a mode, a pace, a voice and a drum of its own; no two lands play the same theme now. Each land's first wave and its boss were looked at once in a still.

Not done: the Hold's other tabs (vows, quests, Codex, armory, daily run) are still lists; the found cage was not seen in a picture; nobody has heard the retold themes.

## Round 8, the owner's new direction

The owner, after playing: "let's make it so you start with a ranged hero instead + 1 companion, / then rework companions into slots that you unlock as you get further into the waves (best wave) up to a max of 6 companions / then the companions themselves are unlocked some of them by completing waves, some of them by doing specific things/ hidden things, you can also get them by collecting them in game (random drop) / as for permanent upgrades, it'll be hero based, so as you finish more with your hero, you get to unlock permanent upgrades for that hero, e.g more skill, more quirks of the hero unlocked as you go", and then "let's make 100 waves". The last part of the first message, the choice between waves made clearer, is the screens' work and is not in this round.

What was built, in the rules (`src/game`), the tests, the computer player and the measures:

- **The start.** Wren is the first hero and the only one unlocked; Biscuit is along from the start. Bram is unlocked by finishing a run. The first run's stray script (Biscuit in a cage on wave 2) is gone. With Biscuit along and one slot the stray's cage is not offered at the first camp, so the Horde is offered from there, and a first camp still has two roads.
- **Slots by best wave**: 1 at the start, then at waves 10, 25, 40, 60 and 80, six at the most. A slot just unlocked is filled by whoever has waited longest; one the player empties stays empty. Aldous no longer brings one more: his Shepherd gives companions near him 30% more damage in its place.
- **No spike.** With n companions each has 1/sqrt(n) of the health and damage one alone has: six together are about 2.45 times one.
- **Sixteen companions**, eight new, each drawn with a unit the kit already had (herbalist, ice golem, automaton, cannon, beekeeper, reef crab, dire wolf, scarab), each with a way of fighting and a passive of its own. Four ways to unlock: by wave (Pip 5, Quill 12, Mossback 20, Tam 35), by quest (Greta, Ember, Thistle), hidden with a riddle (Nettle, Clank, Smoke), and found in a cage on the field (Hive from wave 6, Gilt 21, Rime 31, Snap 41, Boom 51): 10% a wave once one may be met, once a run, never on a boss's wave.
- **Mastery** in place of the board and renown. Every run pays its hero: 2 a wave, 10 a boss, 25 the win, 20% more a vow, and what its quests pay. Twelve levels for each hero, of one shape: stat steps, more from the skill, a second and a third passive written for them (twenty in all, each a rule the wave keeps), the second way of their weapon (in place of the oath that unlocked it), a relic to start with, a title, and two picks. The oaths are folded into the track; renown has no job left and is gone.
- **A hundred waves** over ten lands of ten, a boss on every tenth and an elite on every fifth. Seven new lands with grounds drawn by `arenaGround` from the palette, enemies from the kit's sets, a boss each with a way of its own, and two roads each; later lands bring new ways of fighting (blows on marked ground, warders, healers, the undying, splitters, riders who circle and shoot). Waves are 20 s rising to 35 s; the run is kept at every camp. The enemy curve, coins, prices and level costs were set again for a hundred waves.
- **The save** is version 5. A version 4 save keeps its heroes, companions, bests, Codex and crates; what it had spent on the board and held in renown becomes mastery for the hero it played most; its run in a camp is let go.
- **The build** was over 5 MB with a hundred units. The art build now writes every picture slim (no names nothing points at, short paths, the dark line said once as a class), which a pixel comparison in the browser shows draws the same, and the build is 4,999,439 bytes.

The measures, by the computer player (`npm run pace`), with fewer runs than the rule asks, as time was short: say so when they are used.

- A first run (Wren with Biscuit, the first armory, `--first --pool=start`, 8 runs): half come through wave 8, mean 12.4, the most 35. Earlier, with 16 runs: half 10, mean 13.1. Half is in the 7 to 10 asked for; the mean is pulled up by runs that get past the first walls and run on.
- Every hero at the start with Biscuit (8 runs each, half / mean): Wren 8 / 12.4, Bram 5 / 5.4, Orrin 17 / 13.3, Fenn 7 / 5.8, Old Nan 14 / 14.1, Isaura 8 / 8.0, Hroth 15 / 13.8, Aldous 10 / 11.5, Ysolde 17 / 15.9, Maren 15 / 14.5.
- Every hero with the whole track and the whole armory, with Biscuit (6 runs each, half / mean / won of 6): Wren 14 / 22.0 / 0, Bram 9 / 9.2 / 0, Orrin 43 / 43.8 / 1, Fenn 9 / 41.5 / 2, Old Nan 25 / 22.7 / 0, Isaura 5 / 5.5 / 0, Hroth 53 / 56.8 / 2, Aldous 24 / 21.8 / 0, Ysolde 16 / 13.0 / 0, Maren 44 / 49.2 / 1. Isaura with and without her track, 10 runs to wave 20: half 7 either way. Her track, and Bram's, do little for this player: it rides a line for her and stands still for him, and both die in the first land.
- One companion against six, Wren with the whole track (8 runs each): with Biscuit alone half come through wave 15, mean 20.8, none won; with six (Biscuit, Pip, Mossback, Quill, Greta, Ember) half 27, mean 35.3, one won. Six are felt, by about a land, and do not carry a run: the share each has of a bigger band holds.
- A full run of a hundred waves is about 41 minutes of fighting as this player plays it (Hroth, Maren and Orrin runs that came through), 55 at the most if every wave ran its whole time.
- Careers from a new save, three of 40 runs each (`--career --upto=40 --seed=0,1,2`): the second slot at runs 1, 3 and 1; the sixth at runs 37, 37 and not by run 40. Every hero was unlocked by run 23, 37 and 21. Companions by wave and by quest came in the first few runs (a first run that goes far does many at once); found ones at runs 1 (Hive, all three), 3 to 21 (Gilt), 27 to 30 (Rime), 5 to 37 (Snap) and 37 (Boom), and two of fifteen were not found by run 40. After 40 runs, four with each hero, their levels were 2 to 10: Isaura 2 in all three, Wren 7 to 9, Hroth 4 to 10. No track was full: at that rate a strong hero's is full in 12 to 15 runs with them and a weak one's in many more.
- The smoke (`LIGHT=off`, against a served build) passes all 85 checks on the frame and on a phone. It now looks for Wren at the start, two roads out of the first camp, mastery paid, a level's pick made in the Hold and the slots said; a carried-on run is given longer to load its pictures after a reload, as a hundred units take the headless browser some seconds.
- A found cage is rolled once a wave (`cageAt`, `cage` on the run), so that a wave's setup asked for again, as the screen does when a run is carried on, has the same companion in it.
- Smoke's riddle was done on every first run: the first waves are untouched by nearly anyone. Untouched waves are now counted only past the first land.

What nobody has looked at: everything on a screen. The Hold's tabs, the slots, a found cage, the new companions, lands, bosses and roads were only run by tests and the computer player. The new lands' grounds were never looked at, and seven of them borrow another land's hour of light and theme of music. The second way picked at level 5 is shown as a pick of two lines. Whether a person's first run ends near wave 8 is not known.

## Round 7, the choices made plain, and the Hold's screens begun

The screens agent of round 5 stopped on a usage limit after merging the rules of round 6; this round took over from there.

**The owner changed direction for the Hold** while it was being drawn: "as for permanent upgrades, it'll be hero based", with companions in slots opened by the best wave, up to six, and "can we make it WAY more clearer on the choice you get per wave as to make it clear what that does". A rules agent is building the new Hold in a copy of its own. So the board of 33 upgrades was drawn as a tree here and then taken out again before it was committed: the board is going away. What survives was kept.

**Every choice between waves says what it changes, in numbers, before it is made.** `src/game/preview.ts` makes the choice on a copy of the run and reads the copy's numbers, so a card shows what the rules would do and not a second guess at them (tests in `tests/preview.test.ts`):

- A level's card: the stat big, what it does in a few words, and each number it moves, now and after (Max HP 55 > 58; Attack Speed +10% > +20%; Gatekeeper hits/s 1.10 > 1.20), the better number green.
- A ware's card: a weapon's damage, hits a second and damage a second as this hero would fight with it; beside it the same weapon held ("Yours: 23.6 DPS, this is better") or that the two would merge; and the set bonus it moves ("Blade 2 > 3: +10% Crit Chance"). An item gives its stats now and after. A relic says its rule.
- The stats the last choice or buy changed are lit in the camp's list.
- Fenn's flip says its odds. A road's risk names the wave.

**Fixed from the pictures:** the title's renown no longer covers the hero's name; a weapon card's lines no longer lie on each other at the small frame; a long skill name is no longer cut off at the screen's edge ("THE ONE THAT MATTER"); the result's name stands clear of its ribbon.

**Added:** the result pays out renown line by line and names the three nearest quests with how far along each is; the title has the Daily Run and, once a run is won, the vows; a run's vows show under the coins in the HUD; the Hold speaks plain words, its tabs are Upgrades, Heroes, Companions, Armory, Vows (explained once: "optional challenges for more Renown"), Quests, Codex and Daily Run, and heroes and companions are drawn at a row's left, dark while locked.

**The merged rules on the field:** Bram's gate was a thin bar nobody could see and is a palisade of stakes that rises and sinks; a burning field's lane is a red band with a hard edge and a fill that runs along it before it burns, then fire; Open Grave has a ring of embers and sparks while it lasts, so that it is not Grave Debt's glow; the hand-over of the skill is "Auto-cast is off now. Press SPACE when the skill button glows." Walk states were added for Orrin's, Fenn's and Nan's passives, the burning field, the duel and the champion of wave 3.

**A phone's camp** has taller ware cards with room for their numbers, and the hero (picture, level, own weapon, experience) at the head of the stats.

Not done: hover or a long press for more (everything is on the card), an example for each relic, and the Hold's screens for the new model (they wait for the rules). The smoke passes all 85 checks, with the light off against a served build; its tap on a phone's level card was moved to where the taller cards now stand, and the check that a run is carried on after a reload failed once under load and passed after, so it now says what came back when it fails.

## Round 5, the look, after the first review

A reviewer who had never seen the game went through every picture of it as a demanding player would, with the owner's words beside them ("Essentially make the game beautiful to look at"). The verdict: the drawn figures and the interface were clean and of one hand, and at dusk with magic flying it began to look like the game asked for; but by day, which is the first thirty seconds, the light was "a pale haze over a flat lawn" and looked worse than no light at all, the hero was lost, and "a portal reviewer would pass the menus and doubt the fight".

The blockers by name, and what was done about each:

1. **Daylight was haze, not light.** No land is come into at noon now. Every land's first wave is the golden hour: a low warm sun and the sky's cool light, with shade that drifts over the field in long patches drawn out the way the light goes (`hours.ts`, the light pass in `shaders.ts`). The milky shafts are gone: the patches of sun are the beams. Every figure throws a shadow that lies the way the light goes and is long at dusk: one of the horde's is its own picture laid down dark, a rigged figure's is one long soft shape (`Shadows.ts`). The lens is steeper in contrast than it was.
2. **The hero was lost.** They stand in a ring of their side's blue, always, drawn by the camera that no light touches; they are drawn bigger (0.64 to the horde's 0.46); what they have bought floats smaller and behind them; numbers that would be written over them are set to one side; and a rule in the world keeps every companion on its feet out of a room round the hero's feet (`BAND.room`, with a test).
3. **Red rings lied.** Where an enemy is about to come up the ground stirs, dark: it is not a danger and is not drawn as one. Red is only harm. A charge's lane and a burst's ring have a hard edge and a fill that grows as the time runs out. The band's bolts are thin streaks and an enemy's are round.

And the rest of the list:

- **Nothing that stands is out of focus.** The lens blurred the whole top and bottom of the view, enemies and captains with it. It blurs nothing now. The ground's own picture, made small, is laid over the far and near edges of the view (`FieldLight.ground`): the ground is soft there and everything on it is sharp. An enemy's red keeps a plain light at every hour, so that night does not turn it purple.
- **A blow is a blow.** The hero's own weapon leaves a lit arc where a blade went and a streak where a point did, and the figure steps into it.
- **Moves.** Each dims the field for its moment, has about three times the light it had, and begins a step out from the hero, never on top of them. Its name is said small by its button; the field is left to the move.
- **The first thirty seconds.** The hero's name and line stand above them, not through them. What a new player is told is on a plate at the foot of the screen, and is a thumb and "drag to move" where there are no keys. The first red warning ever seen and the first blow ever taken are each said once. The first enemies of a wave are marked almost at once.
- **The Hold is a place.** The meadow at dusk, the gate the runs go out by, a fire, the hero by it and whoever goes along beside them. Sound and light are behind one cog. An unopened hero's card says the deed that opens it. There is room for the count of renown and a button for the Hold's board, which show when those rules are merged.
- **Quirks show on the hero.** Each has a ring on the ground in its own color, outside the blue one: faint, growing, bright when it is on. Fenn's coins go round him.
- **Overlaps and words.** The result's lines each have a place of their own. A level's card has dark words that fit it. The pack, the road and the wares say what they are.

Then the owner asked for "a bit better ui", and the interface was given a kit of its own:

- **A panel is a frame of timber with iron corners round parchment** (`ui/bake.ts`): every pale sheet a player reads from, a card or a whole screen, is that one thing.
- **A screen's heading is on a ribbon** (`heading` in `ui/widgets.ts`), and is the biggest thing on it.
- **A button lifts under a pointer** as well as sinking when pressed.
- **The HUD is one plate**: the hero's portrait in a frame with their health, fury, experience and quirk beside it; the wave and its time on a small plate of their own.
- **Screens come in** with a short rise out of nothing.
- **The camp shows what can be afforded**: a ware that cannot has an iron button with its price in red, and is dimmed.
- **A road's card says what it costs and what it pays in the same two places**, to be read across.

Then the owner played it on the published page, and their first words were: "let's fix the wording (its convoluted) and fix the clanky animation when moving hero".

**The movement.** Four things made it clanky, and each is changed:

1. *The wave was drawn where its last step left it.* The wave moves in fixed steps, sixty to the second, and a screen draws when it likes: at any rate but exactly sixty a frame came after no step, or after two, every so often, and the hero and the view jerked. A headless browser steps one frame at a time and never showed it. Everything that moves, and the view, is drawn between the last two steps now (`view/blend.ts`, with a test). `npm run glide` walks the hero with frames of 7, 9, 13, 19 and 23 thousandths of a second and at 75 and 144 a second, and holds every frame to the walk's own speed: the worst was 0.0% off.
2. *The figure turned to face every blow and back while it ran,* and (from earlier in this same round) stepped toward the blow against the way it was going. On the move it faces the way it goes; it turns to a blow, and steps into it, only standing.
3. *Walking was a hop:* a bounce with a squash on landing, three times a second. It is a walk now: the legs pass each other, each foot lifted as it comes through, timed to the ground covered so that the feet do not slide, eased in and out.
4. *Turning round went through nothing:* for a frame the figure was a sliver. It is a quick squash, never thinner than half.

**The wording.** The docs' old-fashioned voice had spilled into the game. Every string the screens show was rewritten in plain game terms (Passive, Skill, Weapon, Damage, Boss, Items, Reroll, Merge, Risk and Reward, Unlock and Locked): "Unlock: reach wave 10", "New companion unlocked: Greta", "Choose 1 of 3", "Wave 8. Killed by: Scarab". The rule and its list of terms are in `CLAUDE.md`. The text that comes from the rules' own data (what a hero's passive and skill say, relics, roads, the names of stats) is being rewritten by the rules agent where it is kept, and still reads the old way on these screens until that is merged.

Not done, and why:

- **Long shadows from the lights of the fight** (a fire throwing a figure's shadow away from it): shadows follow the sun only. It would be a second shadow for every figure near every light.
- **A waist, an arm that follows the weapon, cloth hung from a weapon**: these need the heroes' pictures cut into more parts.
- **Hover or press-and-hold for what a thing does**: a press already opens a thing's card in the camp. Nothing answers a hover but a button.
- **The camp on a phone** still has the hero's field showing dimly behind its lists, and its layout was not rebuilt.
## Round 6, the rules after the first review

A designer who had not seen the game reviewed its rules, and then the owner played it and said one thing: "let's fix the wording (its convoluted)". This round is the answer to both, with the Hold merged into it at the end. `docs/design.md` has every table in the game's own words.

**Dead or false, mended.** Coins on the ground when a wave's time runs out count for half, so Fetch, the Magpie Feather and Pickup Range matter. The Whetstone of Ages sharpens every weapon. The Echo Bell is every 4th hit. The Merchant's Seal halves the most expensive item in each shop and gives no free reroll. Late enemies deal about half of what they did (`ENEMY_GROWTH`). Burn grows with Magic Damage. No wave is longer than 45 seconds; a boss's is 60 at most and ends when the boss falls. Each hero's own weapon has its own numbers: a test fails if one twins a shop weapon.

**A first run has a script.** One road out of its first camp, the Stray's, with Biscuit in the cage, who is let out at the wave's end broken or not. A lone champion on wave 3 of every run drops a relic. Its shop draws from twelve weapons: that pool is the armory as a new player has it, given to the run when it begins. Bram's raised shield lets 40% through and blocks shots from the front.

**Roads that cost.** No free road. Twelve roads, six anywhere and two that are each land's own; all cost something.

**Heroes with verbs.** Five passives replaced (Orrin's staff copies the last weapon bought; Fenn flips a coin for an item; Nan's fire never goes out near her and stacks; Isaura readies a 2.5x thrust by riding straight; Hroth is strongest below 33% HP). War Cry is Open Grave. Every skill asks where, which way or when. Auto-cast is on for a first run only, then handed over and said once. Fury fills for about two casts a wave early and three or four late. Each own weapon learns a rule at levels 5, 10 and 15: thirty rules, a test each.

**The Hold merged in** (`holdout-hold`, 295 tests there, 360 here now):

- **One pool.** `STARTER_POOL` and `RunStart` are gone. A run's terms (`Terms`, hold.ts) carry `first` beside `pool`; `beginRun` marks a first run when no run has ended. The name kept is the Hold's, `pool`.
- **`run.alt` is real.** One of each weapon's three rules has a second way, chosen in its place once the hero's third oath unlocks the choice: ten second ways, forty rules, a test each (`tests/altrules.test.ts`).
- **Oaths written again** for the five replaced passives, each counted by the run as it is played (`COUNTS` in heroes.ts, `run.counts`): the staff changes form 10 times, 6 coin flips won, burn stacked to its max on 20 enemies, 40 Tilt kills, 150 kills in Grave Debt. Set from what the plain player counts: half its runs reach 6, 3, 4, 27 and 78 of those, and the best 16, 15, 42, 55 and 391.
- **Vows and roads add up.** The vow that was Forced March is Double Time, as the road has the name. The vow's champion keeps out of a duel and off wave 3. The night road is not offered under The Early Dark. A forced march and Open Wounds ask the same thing, and the worse holds.
- **The save** is version 4 still, with a kept run's new fields mended on the way in.
- **The Wayfarer's crate** asks for 8 different roads, not all of them: the two snow roads are only met from wave 15.

**The wording.** Every string a player reads in `src/game` was rewritten: passives, skills, weapons, weapon rules, companions, relics, weapon types and set bonuses, roads as risk and reward, stats, vows, oaths, quests, upgrades, crates, the Codex's lines. What happens and by how much, numbers as numbers. The stats are Max HP, HP Regen, Life Steal, Damage, Melee, Ranged and Magic Damage, Attack Speed, Crit Chance, Range, Armor, Dodge, Move Speed, Luck, Coin Gain, Pickup Range. Five enemies were renamed (Bandit, Bomber, Tomb Guard, Raider, War Singer). The rule is in `CLAUDE.md`.

**Measured** after the merge, the plain player alone, 32 runs a hero, each stopped at the 26th wave:

| Hero | Nothing bought, a first armory: half / mean of 20 / won | The whole board, the whole armory: half / mean of 20 / won |
| --- | --- | --- |
| Bram Oakenhold | 11 / 11.3 / 2 | 28 / 18.8 / 20 |
| Wren Fallowmere | 10 / 8.8 / 0 | 18 / 17.2 / 9 |
| Orrin Quillon | 11 / 11.5 / 2 | 27 / 18.7 / 23 |
| Fenn Two-Coins | 12 / 13.5 / 8 | 31 / 19.3 / 28 |
| Old Nan Cinderwick | 12 / 12.5 / 2 | 28 / 19.2 / 21 |
| Isaura Vane | 10 / 8.8 / 0 | 18 / 17.4 / 9 |
| Hroth | 13 / 14.3 / 7 | 31 / 19.4 / 27 |
| Brother Aldous Bell | 11 / 10.3 / 0 | 27 / 19.2 / 21 |
| Ysolde Rimeheart | 12 / 12.8 / 7 | 29 / 19.7 / 28 |
| Maren Dawnguard | 17 / 15.4 / 7 | 29 / 19.6 / 26 |

- **Nothing bought:** 35 runs of 320 won, one in nine. Nine heroes have half their runs through wave 10 to 13, Bram in the middle at 11. **Maren is too strong** (half through 17) and was not trimmed again after the merge; Hroth is at the top of the band. Wren and Isaura never won: the plain player holds a line for Isaura but does not ride through the thick of them as a person would, and it loses Wren's Unseen to every stray shot.
- **A run that clears all twenty waves is 12 to 13 minutes of fighting.**
- **The whole board:** 212 of 320 won, two in three. For the four heroes the Hold was measured with (Bram, Wren, Orrin, Isaura) it is 61 of 128, a little under the Hold's 55 of 96. The others gain more from the board than those four. The vows were not measured again.
- **A career**, once: everything unlocked and the board full after 65 runs (62 to 79 before the merge).
- **The roads**, as Bram over 40 runs before the merge (taken, cleared): Horde 54, 78%; Champions 35, 74%; Forced March 30, 100% (its cost is the wave after); Toll Road 28, 96%; Duel 34, 91%; Wounded 34, 82%; Stray 39, 100%; Grove Shrine 62, 98%; Pay Caravan 14, 93%; Burning Field 20, 85%; Long Night 2; Blizzard 3. Within a land no road is taken more than about twice as often as another. Across lands that cannot hold: few runs reach the snow. Horde, Champions and Wounded are lost between 1 in 6 and 1 in 4; the rest are lost less often than the aim.

Not as asked, or not done: a boss's wave may run to 60 seconds, not 45. Fenn keeps coins as damage beside his coin flip, and Hroth keeps his revive. Maren and Hroth want another trim. The second ways are not measured: the plain player never chooses one. The road figures were not taken again after the merge.

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

## Round 3, the screens: the hero found again, moves, quirks, the band, the Hold

The light, the art and both rounds of rules were brought together in the main copy, and what the screens show of them was made properly.

What was wrong first, from pictures of the merged game: the hero was lost under six floating weapons, a burst at the hero bloomed to a white blob over them, and night was a grey haze.

- **The hero's own weapon is in their hand** and the figure swings it on time, facing what it strikes. Bought weapons float small on a wide ring. The hero is drawn bigger than the horde.
- **The figure is more alive**: cloth on a spring, a lean into the run, weight behind a blow, a brace behind a shield. Not done: an arm that follows a weapon moved far from rest, a waist, and cloth hung from a weapon (Maren's oath, Isaura's pennon), which need the pictures redrawn in more parts.
- **Each of the ten moves has a look**, holds the wave for a breath, and names itself. Fury is under the health, and its button turns gold.
- **Quirks are seen**: a name and a bar in the HUD, a gold ring and a raised shield for Bram, a gathering light on Wren, streaks behind Isaura, a coal's glow on Hroth, a waiting spell in Orrin's staff, Aldous's fold on the ground.
- **The band**: names, health, down and counted, and each companion's own moment.
- **A run is its hero's**: their name, epithet and line before the first wave; their picture and name on the result with what they found and who stood with them.
- **The title is the Hold**: the chosen hero big and lit, with who they are.
- **The light**: night is dark with pools of light, a night march darker with a small light, each kind of ground and burst in its own color, a flash on the hero held down so that they are never bloomed away, champions and companions that glow given light.
- **Found on the way**: rings on the ground were drawn about twice as wide as they reach. Fixed. The build is 3.8 MB, not 4.7: `du -sh` counts disk blocks.
- **The road agent's work was merged here** (236 tests). Its screens were left mostly as they were: they already show the omen's picture and the prize plainly.

Looked at: stills only (see README, "Not yet looked at"). The next thing this needs is a film looked at frame by frame, and a person's hand on it.

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
