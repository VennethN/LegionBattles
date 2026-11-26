// What there is in the game, as tables: the hunters and what they can do,
// the monsters and every attack they have, what can be called with the
// horn, what can be built in camp, and the numbers of a hunt. The rules
// that read these are in hunt.ts; what is opened and bought between hunts
// is in lodge.ts.
//
// A new hunter, monster, reinforcement or building is mostly a new entry
// here. A new kind of shape or ability is a few lines in hunt.ts as well.

/** How hard a contract is: one, two or three marks. */
export type Mark = 1 | 2 | 3;

export function byId<T extends { id: string }>(list: readonly T[], id: string): T {
  const found = list.find((x) => x.id === id);
  if (!found) throw new Error(`nothing is called ${id}`);
  return found;
}

// ------------------------------------------------------------ the field

/** The lair: its long side, its short side, and how far in from its rim anyone can stand. A wide window has it lying down, a tall one stood up. */
export const FIELD = { long: 1180, short: 800, edge: 46 };

/**
 * How near the player's own hunter anyone else may stand, feet to feet. A helper, an ally or a partner that came
 * closer is put back to this: a figure stood on the player hides them, and in a game of reading where to step the
 * player has to see where they are. Every helper's reach is more than this, so it can still bite.
 */
export const ROOM = 30;

/** How near the sleeping monster nothing can be built, and how near each other two buildings can stand. */
export const CAMP = { clear: 190, apart: 64, wakeAt: 120 };

/** How long after one call of the horn the next can be made. */
export const HORN_WAIT = 5;

/** After being struck, how long nothing else can hurt the hunter. Without it two tells landing together would be one death. */
export const HURT_GRACE = 0.45;

/** How long into a hunt the monster loses patience, and how much faster its tells are from then. A hunt must end. */
export const ENRAGE = { at: 420, faster: 0.7 };

/** What each mark does to a monster: its health, the harm of its blows, how long its tells show, and how long it walks between attacks. */
export const MARKS: Record<Mark, { hp: number; dmg: number; tell: number; gap: number; name: string }> = {
  1: { hp: 1, dmg: 1, tell: 1, gap: 1, name: 'Difficulty 1' },
  2: { hp: 1.16, dmg: 1.13, tell: 0.9, gap: 0.87, name: 'Difficulty 2' },
  3: { hp: 1.4, dmg: 1.45, tell: 0.74, gap: 0.66, name: 'Difficulty 3' },
};

// ------------------------------------------------------------ the first hunt

/**
 * One thing taught, by having it done. The monster does what the step says, again and again, and the hunt does not
 * go on to the next until the hunter has done what it wants once.
 */
export interface LessonStep {
  id: string;
  /**
   * What ends it: `move` so many units walked; `avoid` an attack landed and missed; `dodge` a dodge made while an
   * attack was shown, which then missed; `strike` so many of the hunter's own blows landed; `skill` one of the two
   * abilities used; `break` the monster's stagger filled.
   */
  wants: 'move' | 'avoid' | 'dodge' | 'strike' | 'skill' | 'break';
  /** How many, for `move` and `strike`. */
  n?: number;
  /** Which ability, for `skill`. */
  skill?: 0 | 1;
  /** The attack the monster makes while the step waits. Without one it stands and does nothing. */
  attack?: string;
  /** How much longer than usual that attack's warning is shown here. */
  slow?: number;
  /** True if the first warning of this step is worth holding the moment for: the view slows time as it appears. */
  hold?: boolean;
  /** What the plate says: where there are keys, and by touch. */
  says: { keys: string; touch: string };
}

/**
 * A hunt that teaches: a simpler monster, nothing brought, no camp, and steps the hunt waits on. What a contract
 * allows is here and not in a screen: the lodge makes a hunt of a lesson where one is due (lodge.ts, `lessonFor`).
 */
export interface LessonDef {
  id: string;
  monster: string;
  /** Who goes: the one hunter a new player has. */
  hunter: string;
  /** No camp: the monster is awake as the hunter walks in. */
  camp: false;
  /** What this hunt does to the monster in place of a mark: its health, the harm of its blows, how long its warnings show, how long it walks between attacks. */
  scale: { hp: number; dmg: number; tell: number; gap: number };
  /** Its rounds for this hunt, in place of its own parts: fewer attacks, and fewer parts. */
  parts: readonly (readonly string[])[];
  /** The share of its stagger it takes to break it here: the break is to be seen. */
  stagger: number;
  /** While steps are left, no blow takes the hunter under this share of their health. */
  spare: number;
  steps: readonly LessonStep[];
  /** Said when the last step is done. */
  after: string;
}

export const LESSONS: readonly LessonDef[] = [
  {
    // The Gravedigger for someone who has never played: two attacks, then a third when he changes, all slow.
    // About two minutes with the steps. Measured by `npm run pace -- --lesson`.
    id: 'first', monster: 'sexton', hunter: 'marta', camp: false,
    scale: { hp: 0.38, dmg: 0.6, tell: 1.6, gap: 1.5 },
    parts: [['spade', 'sweep'], ['spade', 'lantern', 'sweep']],
    stagger: 0.3, spare: 0.4,
    steps: [
      { id: 'move', wants: 'move', n: 150, says: { keys: 'Move: W A S D or the arrow keys', touch: 'Push the stick, bottom left, to move' } },
      { id: 'avoid', wants: 'avoid', attack: 'spade', slow: 1.5, hold: true, says: { keys: 'Red ground: he hits there. Move out of the red.', touch: 'Red ground: he hits there. Move out of the red.' } },
      { id: 'dodge', wants: 'dodge', attack: 'sweep', slow: 1.5, hold: true, says: { keys: 'Press SPACE to dodge out of the red', touch: 'Tap DODGE to get out of the red' } },
      { id: 'strike', wants: 'strike', n: 3, says: { keys: 'Walk up to him: you attack on your own. Press J or click to strike when you choose.', touch: 'Walk up to him: you attack on your own. Tap ATTACK to strike when you choose.' } },
      // Her block lasts 1.4 seconds: the warning here is a little shorter, so that a press as the red shows turns the blow.
      { id: 'block', wants: 'skill', skill: 0, attack: 'spade', slow: 0.85, says: { keys: 'Press Q when the red shows: Block stops his hit', touch: 'Tap BLOCK when the red shows: it stops his hit' } },
      { id: 'sweep', wants: 'skill', skill: 1, says: { keys: 'Press E next to him: Sweep hits hard', touch: 'Tap SWEEP next to him: it hits hard' } },
      { id: 'break', wants: 'break', attack: 'spade', says: { keys: 'Hit him right after he swings. Fill the gold bar.', touch: 'Hit him right after he swings. Fill the gold bar.' } },
    ],
    after: 'Now finish him.',
  },
];

// ------------------------------------------------------------ hunters

/** How a hunter strikes by themselves: a swing through an arc, or a bolt that flies. */
export interface StrikeDef {
  kind: 'arc' | 'bolt';
  /** How far it reaches. */
  reach: number;
  /** Seconds from one blow to the next. */
  every: number;
  dmg: number;
  /** Half the width of a swing, in degrees. */
  half?: number;
  /** How fast a bolt flies. */
  speed?: number;
  /** A bolt loosed from beyond this far does this much more. */
  far?: { beyond: number; by: number };
}

/**
 * One blow of a hunter's chain. A press of attack begins the first; pressed again before the chain runs out, the
 * next. `wind` is the time from the press to the blow landing, in which nothing can stop it and no dodge can be
 * made: attacking into a warning has a cost. `recover` is after, and a dodge cuts it short.
 */
export interface BlowDef {
  /** A swing through an arc, a thrust down a line, or a bolt that flies. */
  kind: 'arc' | 'thrust' | 'bolt';
  reach: number;
  dmg: number;
  wind: number;
  recover: number;
  /** Half the width of a swing, in degrees. */
  half?: number;
  /** The width of a thrust. */
  w?: number;
  /** How fast a bolt flies, and how much more it does from beyond a distance. */
  speed?: number;
  far?: { beyond: number; by: number };
  /** Fire left on the ground where it lands: how wide, how long, and what it does each half second. */
  fire?: { r: number; life: number; dmg: number };
  /** The dogs bite with it. */
  hounds?: boolean;
  /** A held attack: how long it is aimed before it goes, and how much slower the hunter walks meanwhile. */
  aim?: number;
  /** Helpers it lands on are pushed this far from the hunter: the length of a pole. Less than nothing pulls them in. */
  push?: number;
  /** Cuts that open the boss: stacks of bleeding, each a little harm a second until they close. */
  bleed?: number;
  /** A blow that stuns: helpers it lands on are held this long, and the boss takes this much stagger more. */
  stun?: { hold: number; stagger: number };
}

/** How long after a blow's recovery a press still chains to the next, and how far the aim turns by itself toward a boss in reach. */
export const ATTACK = { chain: 0.4, help: 35 };

/**
 * Auto attack: the player's hunter strikes by themselves whenever something is in reach and nothing is pressed. `grace`
 * is how long after the player lets go of attack it waits, so a player choosing when to strike is not cut across at once.
 * Auto starts no blow while the hunter stands in a warning, however long it has to land: a blow plants a melee hunter and
 * halves their walk, and a player walking out of the red is not to be held there by their own swings.
 * `pad` is how near a warning's edge counts as standing in it, for this choice only: wide, as a charge catches what stands at its edge.
 */
export const AUTO = { grace: 1, pad: 40 };

export type AbilityKind = 'brace' | 'sweep' | 'trap' | 'pool' | 'flare' | 'ward' | 'seton' | 'whistle' | 'forge' | 'anvil' | 'keg' | 'cavein' | 'shove' | 'wake' | 'hook' | 'hack';

/** One of a hunter's two abilities. `kind` says which rule in hunt.ts it is; the numbers are that rule's. */
export interface AbilityDef {
  id: string;
  name: string;
  /** What it does, in full: for the hunt's lesson and when its line on a hunter's page is pressed. */
  says: string;
  /** What it does in one short line, for a hunter's page: its numbers are the same as in `says`. Every hunter's skill has one. */
  brief?: string;
  kind: AbilityKind;
  /** Seconds before it can be used again. */
  wait: number;
  /** How wide it is, where it has a width. */
  r?: number;
  /** How long it lasts, where it lasts. */
  life?: number;
  dmg?: number;
  /** How much stagger it adds to the monster, flat. */
  stagger?: number;
  /** Seconds it holds or blinds the monster. */
  hold?: number;
  /** A share: how much less harm, how much slower, how much mended, how much more harm a held thing takes. */
  share?: number;
  /** How many of it can lie on the field at once. */
  most?: number;
  /** How far it can be thrown. */
  range?: number;
  /** Seconds from being shown to going off, for what is shown on the ground first: a keg's fuse, a falling anvil. */
  fuse?: number;
  /** How wide a strip it marks. */
  w?: number;
  /** How many blows it is made of, and the seconds between them. */
  n?: number;
  every?: number;
  /** How far it throws what it reaches. */
  push?: number;
  /** What it does to a hunter of the party caught in it: a keg does not ask whose side you are on. */
  hurt?: number;
  /** Harm a second it leaves burning on what it lands on. */
  burn?: number;
  /** How much slower an enemy goes in it. */
  slow?: number;
}

export const ABILITIES: readonly AbilityDef[] = [
  // Marta sets her halberd. The next of the monster's blows to reach her in `life` seconds is turned: it does nothing,
  // fills `stagger`, and she answers with a blow `share` times her own.
  { id: 'brace', name: 'Block', brief: 'Blocks the next hit and weakens the boss.', says: 'She blocks the next hit: no damage, and the boss is weakened.', kind: 'brace', wait: 9, life: 1.4, stagger: 36, share: 2.5 },
  { id: 'reap', name: 'Sweep', brief: 'Hits all around you for 30, knocks back.', says: 'Hits everything around her for 30 damage and knocks small enemies back.', kind: 'sweep', wait: 8, r: 138, dmg: 30, stagger: 8 },
  // Jory's trap lies where he stood. What steps in it is held for `hold` seconds and takes `share` more while held.
  { id: 'jawtrap', name: 'Trap', brief: 'A trap that holds for 2.4 seconds.', says: 'Placed at his feet. It holds what steps in it for 2.4 seconds, and that takes 30% more damage.', kind: 'trap', wait: 11, r: 30, life: 45, hold: 2.4, share: 0.3, stagger: 14, most: 2 },
  { id: 'tarflask', name: 'Tar', brief: 'A pool that slows the boss by 45%.', says: 'A pool that slows the boss by 45%. Fire sets it burning.', kind: 'pool', wait: 13, r: 96, life: 12, share: 0.45, dmg: 9, range: 400 },
  // Agnes's flare blinds the monster for `hold` seconds, which is an opening, and burns the small for `dmg`.
  { id: 'flare', name: 'Flare', brief: 'Stops the boss for 1.9 seconds.', says: 'A flash that stops the boss for 1.9 seconds and deals 26 damage to small enemies.', kind: 'flare', wait: 10, r: 190, hold: 1.9, dmg: 26, stagger: 16 },
  { id: 'lamp', name: 'Lamp', brief: 'Take half damage in its light for 8 seconds.', says: 'A lamp on the ground for 8 seconds. Everyone in its light takes half damage.', kind: 'ward', wait: 14, r: 120, life: 8, share: 0.5 },
  // Amos's mastiff holds the monster for `hold` seconds and bites `share` times as hard for `life`.
  { id: 'seton', name: 'Set Bull On', brief: 'Bull holds the boss for 1.8 seconds.', says: 'Bull holds the boss for 1.8 seconds and bites twice as hard for 4 seconds.', kind: 'seton', wait: 18, hold: 1.8, life: 4, share: 2, stagger: 10 },
  { id: 'heel', name: 'Call Back', brief: 'Bull comes back; both of you heal 15%.', says: 'Bull comes back, gets up if he is down, and both of you heal 15%.', kind: 'whistle', wait: 24, share: 0.15 },
  // Greta's hammer, heated: a heavy blow in front. What it lands on burns `dmg` a second for `life` seconds, and its
  // armor is cracked for as long: every blow fills `share` more stagger.
  { id: 'forgestrike', name: 'Forge Strike', brief: 'A blow for 30 damage that sets the boss burning.', says: 'A heated blow for 30 damage. The boss burns and takes 50% more stagger for 6 seconds.', kind: 'forge', wait: 12, r: 128, dmg: 30, stagger: 18, life: 6, share: 0.5, burn: 4 },
  // Her anvil is shown where it will fall, `range` in front of her, and falls after `fuse`: what is under it is held,
  // and it stays as a stone that blocks a charge.
  { id: 'anvil', name: 'Anvil', brief: 'Drops an anvil: 34 damage, holds 1.6 seconds.', says: 'Drops an anvil in front of her. It holds what is under it for 1.6 seconds, deals 34 damage, and stays as cover.', kind: 'anvil', wait: 15, r: 64, range: 120, fuse: 0.9, dmg: 34, hold: 1.6, stagger: 16, life: 14 },
  // Ned's powder: thrown, shown with its fuse, and it goes up. A hunter caught in it is hurt too.
  { id: 'keg', name: 'Powder Keg', brief: 'Thrown; blows up for 70 damage.', says: 'Thrown at the boss. After its fuse it blows up for 70 damage. Hunters in it get hurt too.', kind: 'keg', wait: 13, r: 110, range: 330, fuse: 1.6, dmg: 70, stagger: 30, hurt: 24 },
  // Rocks come down along a strip from where he stands, `fuse` after it is shown.
  { id: 'cavein', name: 'Cave-in', brief: 'Rocks fall in a line for 40 damage.', says: 'Rocks fall in a line in front of him a second later, for 40 damage.', kind: 'cavein', wait: 11, range: 330, w: 80, fuse: 1.0, dmg: 40, stagger: 20, hold: 0.8 },
  // Ida's pole at full length: helpers are thrown back, and a boss caught winding up is put off its blow.
  { id: 'shove', name: 'Shove', brief: 'Pushes back; stops a boss winding up.', says: 'A long push. Throws small enemies back. Timed as the boss winds up, it stops the attack.', kind: 'shove', wait: 8, r: 205, dmg: 10, push: 150, stagger: 24, hold: 1.3 },
  // Her lantern leaves light behind her as she walks, `n` patches `every` seconds apart, each lasting `life`.
  { id: 'wake', name: 'Lantern Wake', brief: 'A trail of light: hunters 30% faster.', says: 'For 6 seconds she leaves light behind her. Hunters in it move 30% faster, enemies 35% slower.', kind: 'wake', wait: 17, r: 74, life: 4.5, n: 12, every: 0.5, share: 0.3, slow: 0.35 },
  // Silas's hook on its chain: a small thing on its line is dragged to him, and if there is none he is dragged to the boss.
  { id: 'hook', name: 'Hook', brief: 'Pulls a small enemy in, or you to the boss.', says: 'Throws the hook. Pulls a small enemy to him, or pulls him to the boss.', kind: 'hook', wait: 9, range: 330, w: 40, dmg: 12 },
  // A flurry of the cleaver where he stands: `n` cuts, each opening another wound.
  { id: 'hack', name: 'Hack', brief: 'Six fast cuts that make the boss bleed.', says: 'Six fast cuts in front of him. Each makes the boss bleed more.', kind: 'hack', wait: 12, r: 104, dmg: 5, n: 6, every: 0.14 },
];

/** How a boss bleeds: the harm each stack does a second, the most stacks there can be, and the seconds after the last cut before one closes, and between each closing after. */
export const BLEED = { dps: 1.1, most: 10, close: 2.2, each: 0.7 };

export interface HunterDef {
  id: string;
  name: string;
  short: string;
  epithet: string;
  /** Who they are, in a line. */
  who: string;
  /** How they fight, for the muster. */
  way: string;
  hp: number;
  speed: number;
  /** The share of every blow that does not land on them: a heavy coat. */
  armor: number;
  strike: StrikeDef;
  /** The roll: how far, for how long nothing can hurt them, and how long before the next. */
  dodge: { dist: number; dur: number; wait: number };
  abilities: readonly [string, string];
  /** How many hounds come with them. */
  hounds?: number;
  /** Their chain of blows, one a press, the last the heaviest. */
  combo: readonly BlowDef[];
  /** What holding attack does, where it is not the chain again: a heavy shot that is aimed first. */
  heavy?: BlowDef;
  /** A hand for hire: never a player's own hunter, and they take a share of the reward. */
  hired?: boolean;
  /** How much more stagger their blows fill than their harm: a smith's hammer. */
  staggerBy?: number;
  /** How many times their harm their blows do to helpers and to anything that stands still on the field: a pick. */
  wrecker?: number;
  /** What opens them: nothing, or a monster's trophy. */
  opens: string | null;
}

export const HUNTERS: readonly HunterDef[] = [
  {
    id: 'marta', name: 'Marta Voss', short: 'Marta', epithet: 'the Warden', who: 'She kept the gate of a churchyard until what was in it got out.',
    way: 'Close range. Slow, heavy hits. 125 Health, takes 22% less damage.',
    hp: 125, speed: 158, armor: 0.22, strike: { kind: 'arc', reach: 98, every: 0.95, dmg: 16, half: 56 },
    dodge: { dist: 118, dur: 0.3, wait: 1.9 }, abilities: ['brace', 'reap'], opens: null,
    // A wide slow cleave, then a thrust that reaches further and leaves her open longer.
    combo: [
      { kind: 'arc', reach: 104, half: 66, dmg: 10, wind: 0.24, recover: 0.3 },
      { kind: 'thrust', reach: 142, w: 44, dmg: 14, wind: 0.18, recover: 0.58 },
    ],
  },
  {
    id: 'jory', name: 'Jory Pell', short: 'Jory', epithet: 'the Poacher', who: 'He has never met the thing he could not catch, given a week.',
    way: 'Long range. Fast on his feet. 35% more damage from far away. 96 Health.',
    hp: 96, speed: 186, armor: 0, strike: { kind: 'bolt', reach: 430, every: 1.05, dmg: 11, speed: 900, far: { beyond: 230, by: 0.35 } },
    dodge: { dist: 165, dur: 0.28, wait: 1.3 }, abilities: ['jawtrap', 'tarflask'], opens: 'spade',
    // A shot, then a shot and the long reload. Held, the crossbow is cranked for a heavy bolt.
    combo: [
      { kind: 'bolt', reach: 430, dmg: 8, wind: 0.12, recover: 0.38, speed: 900, far: { beyond: 230, by: 0.35 } },
      { kind: 'bolt', reach: 430, dmg: 10, wind: 0.12, recover: 0.8, speed: 900, far: { beyond: 230, by: 0.35 } },
    ],
    heavy: { kind: 'bolt', reach: 480, dmg: 19, wind: 0.05, recover: 0.45, speed: 1100, far: { beyond: 230, by: 0.35 }, aim: 0.9 },
  },
  {
    id: 'agnes', name: 'Agnes Thorn', short: 'Agnes', epithet: 'the Lamplighter', who: 'She lit the lamps of a town that is dark now. She kept the pole.',
    way: 'Mid range. Fire and light. 112 Health.',
    hp: 112, speed: 170, armor: 0, strike: { kind: 'arc', reach: 152, every: 1.0, dmg: 15, half: 38 },
    dodge: { dist: 140, dur: 0.3, wait: 1.5 }, abilities: ['flare', 'lamp'], opens: 'antler',
    // A quick jab with the pole, then a swing of its burning end that leaves fire on the ground.
    combo: [
      { kind: 'thrust', reach: 168, w: 30, dmg: 5, wind: 0.14, recover: 0.26 },
      { kind: 'arc', reach: 150, half: 50, dmg: 9, wind: 0.26, recover: 0.5, fire: { r: 56, life: 2.5, dmg: 4 } },
    ],
  },
  {
    id: 'brask', name: 'Old Amos', short: 'Amos', epithet: 'the Drover', who: 'Forty years driving cattle over the moor. The wood took the herd. Bull stayed.',
    way: 'A goad-spear, and Bull, a great mastiff in a leather coat, who fights beside him. 104 Health.',
    hp: 104, speed: 166, armor: 0, strike: { kind: 'arc', reach: 118, every: 1.0, dmg: 13, half: 24 },
    dodge: { dist: 140, dur: 0.3, wait: 1.5 }, abilities: ['seton', 'heel'], hounds: 1, opens: 'antler',
    // Spear thrusts, and on the third Bull goes in with him.
    combo: [
      { kind: 'thrust', reach: 128, w: 32, dmg: 6, wind: 0.14, recover: 0.24 },
      { kind: 'thrust', reach: 128, w: 32, dmg: 6, wind: 0.14, recover: 0.24 },
      { kind: 'thrust', reach: 140, w: 36, dmg: 10, wind: 0.22, recover: 0.55, hounds: true },
    ],
  },
  {
    id: 'greta', name: 'Greta Hale', short: 'Greta', epithet: 'the Smith', who: 'She shod every horse at Black Pit. The foundry woke and burned her brother.',
    way: 'Close range. Slow, huge hits that stun. Her hits fill stagger 50% more. 130 Health, takes 12% less damage.',
    hp: 130, speed: 150, armor: 0.12, strike: { kind: 'arc', reach: 112, every: 1.1, dmg: 18, half: 44 },
    dodge: { dist: 112, dur: 0.3, wait: 2.0 }, abilities: ['forgestrike', 'anvil'], opens: 'silk', staggerBy: 1.5,
    // An overhead blow, then the hammer brought round and down: the second stuns what it lands on.
    combo: [
      { kind: 'arc', reach: 112, half: 42, dmg: 14, wind: 0.4, recover: 0.42 },
      { kind: 'arc', reach: 122, half: 78, dmg: 23, wind: 0.58, recover: 0.78, stun: { hold: 1.4, stagger: 14 } },
    ],
  },
  {
    id: 'ned', name: 'Ned Rook', short: 'Ned', epithet: 'the Miner', who: 'He dug the cellars under Harrow. Something down there dug back.',
    way: 'Mid range. A pick and blasting powder. His hits do triple damage to small enemies and anything that stands still. 118 Health, takes 15% less damage.',
    hp: 118, speed: 164, armor: 0.15, strike: { kind: 'arc', reach: 128, every: 1.0, dmg: 14, half: 50 },
    dodge: { dist: 136, dur: 0.3, wait: 1.6 }, abilities: ['keg', 'cavein'], opens: 'bellrope', wrecker: 3,
    // A jab of the pick's point, then a swing of the whole of it.
    combo: [
      { kind: 'thrust', reach: 134, w: 40, dmg: 9, wind: 0.2, recover: 0.3 },
      { kind: 'arc', reach: 126, half: 56, dmg: 15, wind: 0.3, recover: 0.56 },
    ],
  },
  {
    id: 'ida', name: 'Ida Marsh', short: 'Ida', epithet: 'the Ferrywoman', who: 'She rowed the monks to the abbey before the water took it. They still ring for her.',
    way: 'Long reach with a ferry pole. Her jab pushes small enemies away and her sweep pulls them in. 114 Health.',
    hp: 114, speed: 172, armor: 0.08, strike: { kind: 'arc', reach: 196, every: 1.0, dmg: 12, half: 30 },
    dodge: { dist: 150, dur: 0.3, wait: 1.5 }, abilities: ['shove', 'wake'], opens: 'grate',
    // A long jab that pushes, then a sweep of the pole that pulls what it catches in toward her.
    combo: [
      { kind: 'thrust', reach: 204, w: 30, dmg: 9, wind: 0.2, recover: 0.3, push: 70 },
      { kind: 'arc', reach: 192, half: 46, dmg: 14, wind: 0.3, recover: 0.54, push: -90 },
    ],
  },
  {
    id: 'silas', name: 'Silas Grey', short: 'Silas', epithet: 'the Butcher', who: 'The mirror maker owed him a year of meat. He means to collect.',
    way: 'Close range. A cleaver and a hook. Fast cuts that make the boss bleed. 108 Health.',
    hp: 108, speed: 178, armor: 0, strike: { kind: 'arc', reach: 90, every: 0.8, dmg: 10, half: 60 },
    dodge: { dist: 150, dur: 0.28, wait: 1.4 }, abilities: ['hook', 'hack'], opens: 'shard',
    // Three quick chops, every one a wound; the last is the deepest.
    combo: [
      { kind: 'arc', reach: 90, half: 60, dmg: 5, wind: 0.1, recover: 0.18, bleed: 1 },
      { kind: 'arc', reach: 90, half: 60, dmg: 5, wind: 0.1, recover: 0.18, bleed: 1 },
      { kind: 'arc', reach: 96, half: 64, dmg: 8, wind: 0.16, recover: 0.44, bleed: 2 },
    ],
  },
  // Hands for hire: what fills a place in a party when the player has not unlocked enough hunters. Plainer and weaker
  // than a hunter, and they take a share of the reward.
  {
    id: 'sellsword', name: 'A Sellsword', short: 'Sellsword', epithet: 'for hire', who: 'Paid by the day. Paid in advance.',
    way: 'Close range. A plain fighter for hire. 96 Health.',
    hp: 96, speed: 160, armor: 0.1, strike: { kind: 'arc', reach: 100, every: 1, dmg: 11, half: 50 },
    dodge: { dist: 120, dur: 0.3, wait: 2.1 }, abilities: ['brace', 'reap'], opens: null, hired: true,
    combo: [
      { kind: 'arc', reach: 100, half: 56, dmg: 9, wind: 0.3, recover: 0.36 },
      { kind: 'arc', reach: 100, half: 56, dmg: 12, wind: 0.32, recover: 0.6 },
    ],
  },
  {
    id: 'bowman', name: 'A Hired Bowman', short: 'Bowman', epithet: 'for hire', who: 'He shoots what he is paid to. Mostly.',
    way: 'Long range. A plain archer for hire. 70 Health.',
    hp: 70, speed: 176, armor: 0, strike: { kind: 'bolt', reach: 400, every: 1, dmg: 8, speed: 820 },
    dodge: { dist: 150, dur: 0.28, wait: 1.6 }, abilities: ['jawtrap', 'tarflask'], opens: null, hired: true,
    combo: [
      { kind: 'bolt', reach: 400, dmg: 7, wind: 0.12, recover: 0.5, speed: 820 },
      { kind: 'bolt', reach: 400, dmg: 8, wind: 0.12, recover: 0.85, speed: 820 },
    ],
  },
];

/** A party: how much each hunter more adds to the boss's health, its stagger and the damage of its blows, how much sooner it attacks again, how much more the hunt pays for each, and what a hand for hire takes of it. Set by measure so that 1 to 4 hunters win about the same share of a contract. */
export const PARTY = { most: 4, hp: 1.2, stagger: 1.0, gap: 0.5, dmg: 0.22, pay: 0.3, hiredCut: 0.2 };

/** Helping a fallen hunter up: how near to stand, for how long, with how much of their health they get up, how fast the help is lost when nobody stands by them, and the seconds within which a down helped up counts half for Stay Standing. */
export const REVIVE = { r: 70, time: 2.8, hp: 0.35, grace: 1.5, fade: 0.5, window: 7 };

// ------------------------------------------------------------ who fights beside the hunter

export type AllyWay = 'hold' | 'shoot' | 'sap' | 'hound' | 'cower';

/** One of those who fight beside the hunter by themselves: a man of a reinforcement, or a hound. */
export interface AllyDef {
  /** How it fights: holds its ground, shoots from where it stands, runs in with a charge, or runs with the hunter. */
  way: AllyWay;
  hp: number;
  speed: number;
  reach: number;
  every: number;
  dmg: number;
  /** What a pikeman set against a charge does to whoever charges through him, and the stagger of it. */
  set?: { dmg: number; stagger: number };
  /** A sapper's charge: how wide, how long its fuse, its harm and its stagger. */
  blast?: { r: number; fuse: number; dmg: number; stagger: number };
}

// Bull: one mastiff in place of two dogs, measured to be worth about what they were.
export const HOUND: AllyDef = { way: 'hound', hp: 92, speed: 224, reach: 52, every: 0.8, dmg: 7 };

export interface ReinforcementDef {
  id: string;
  name: string;
  says: string;
  /** What it costs of the supply. */
  cost: number;
  /** How many times it can be called in a hunt, before any step is bought. */
  charges: number;
  men: number;
  /** Where they come on: a line in front of the hunter, a rank behind, or at a run from where the hunter stands. */
  form: 'line' | 'back' | 'run';
  /** True if the monster may turn on them and not on the hunter. */
  draws?: boolean;
  ally: AllyDef;
  opens: string | null;
}

export const REINFORCEMENTS: readonly ReinforcementDef[] = [
  {
    id: 'pikemen', name: 'Spearmen', says: 'Four men in a line in front of you. They hurt a boss that charges into them.', cost: 2, charges: 1, men: 4, form: 'line', draws: true,
    ally: { way: 'hold', hp: 46, speed: 0, reach: 82, every: 0.9, dmg: 5, set: { dmg: 12, stagger: 6 } }, opens: null,
  },
  {
    id: 'crossbowmen', name: 'Crossbowmen', says: 'Three men behind you who shoot the boss.', cost: 2, charges: 1, men: 3, form: 'back',
    ally: { way: 'shoot', hp: 26, speed: 0, reach: 600, every: 2.3, dmg: 9 }, opens: null,
  },
  {
    id: 'sappers', name: 'Bombers', says: 'Two men who run in and set a bomb: 110 damage each, and it weakens the boss.', cost: 3, charges: 1, men: 2, form: 'run',
    ally: { way: 'sap', hp: 30, speed: 215, reach: 54, every: 0, dmg: 0, blast: { r: 88, fuse: 2, dmg: 110, stagger: 50 } }, opens: 'spade',
  },
];

// ------------------------------------------------------------ buildings

export type BuildingKind = 'ballista' | 'fire' | 'wall' | 'bell' | 'cart';

export interface BuildingDef {
  id: string;
  name: string;
  says: string;
  cost: number;
  hp: number;
  /** How much ground it takes: nothing walks through it. */
  r: number;
  kind: BuildingKind;
  /** How far it reaches: a ballista's range, a fire's light, how near the hunter must be to ring a bell. */
  reach: number;
  /** Seconds between a ballista's bolts, or between a bell's rings. */
  every?: number;
  dmg?: number;
  /** A share: how much faster those by a fire strike. */
  share?: number;
  stagger?: number;
  /** Seconds a monster that charged into it is dazed. */
  daze?: number;
  opens: string | null;
}

export const BUILDINGS: readonly BuildingDef[] = [
  { id: 'barricade', name: 'Barricade', says: 'Stops one charge and breaks. The boss is dazed for 2.7 seconds.', cost: 1, hp: 90, r: 30, kind: 'wall', reach: 0, daze: 2.7, stagger: 34, opens: null },
  { id: 'watchfire', name: 'Campfire', says: 'Light. Everyone near it attacks 30% faster.', cost: 2, hp: 60, r: 22, kind: 'fire', reach: 210, share: 0.3, opens: null },
  { id: 'bellpost', name: 'Bell', says: 'Stand next to it while the boss prepares an attack: the bell stops the attack.', cost: 2, hp: 60, r: 22, kind: 'bell', reach: 96, every: 15, stagger: 20, daze: 1.6, opens: 'spade' },
  { id: 'ballista', name: 'Ballista', says: 'Shoots the boss for 30 damage every 4 seconds.', cost: 3, hp: 70, r: 28, kind: 'ballista', reach: 620, every: 4, dmg: 30, opens: 'antler' },
];

// ------------------------------------------------------------ monsters

/**
 * One of the shapes a monster's attack marks on the ground before it lands.
 * `after` is how long into the attack the shape appears; it then shows for
 * the attack's tell and lands.
 */
export type ShapeDef =
  /** A strip from the monster toward its mark, `turn` degrees off. */
  | { kind: 'line'; len: number; w: number; turn?: number; after?: number }
  /** A wedge from the monster toward its mark. */
  | { kind: 'cone'; r: number; half: number; turn?: number; after?: number }
  /** A circle on the monster or on its mark. With `inner`, the middle of it is safe. */
  | { kind: 'ring'; r: number; at: 'self' | 'target'; inner?: number; after?: number }
  /** `n` circles: scattered round the mark, anywhere on the field, each where the hunter stands when it appears (`every` seconds apart), or one at each of the lair's props still standing. */
  | { kind: 'marks'; n: number; r: number; at: 'target' | 'field' | 'follow' | 'props'; spread?: number; every?: number; after?: number }
  /** `n` strips right across the field with safe ground between them. */
  | { kind: 'lanes'; n: number; w: number; after?: number };

export interface AttackDef {
  id: string;
  name: string;
  /** Seconds a shape shows before it lands. */
  tell: number;
  /** Seconds the monster is open afterwards. */
  recover: number;
  dmg: number;
  shapes: readonly ShapeDef[];
  /** Only at this mark and above. */
  mark?: Mark;
  /** Only when its mark is at least this far off, or at most this near. Otherwise the next in its round is taken. */
  far?: number;
  near?: number;
  /** Helpers get up where its marks land. */
  summon?: string;
  /** The monster runs down its first line when it lands. Meeting a stone or a barricade dazes it. */
  charge?: { speed: number; daze: number; stagger: number };
  /** The hunter struck by it cannot move for this long. */
  root?: number;
  /** Only when this many hunters or more are on the hunt. */
  party?: number;
  /** With three hunters or more, what it marks at its target it marks at a second one too. */
  split?: boolean;
  /** Each circle it marks leaves a web where it lands: so wide, for so long, and how long it holds a hunter who walks into it. */
  web?: { r: number; life: number; root: number };
  /** It leaves the ground as the warning shows and comes down in its first circle, and is slow to climb back: it takes `soft` more for its whole recovery. Nothing reaches it in the air. */
  leap?: { soft: number };
  /** Marked at its props: it steps out of one of them, picked as the warning shows, and a reflection of it out of each of the others. */
  swap?: boolean;
}

/** A lesser thing that fights for a monster. */
export interface HelperDef {
  id: string;
  name: string;
  hp: number;
  speed: number;
  dmg: number;
  reach: number;
  every: number;
  /** Seconds its blow shows on the ground before it lands. */
  tell: number;
  /** The most of them a monster keeps on the field. */
  most: number;
  /** True for a thing that stands and does nothing until it is broken: a contract's marker. */
  still?: boolean;
  /** Something still that hatches: one of these every so many seconds while it stands. */
  hatch?: { every: number; into: string };
  /** Health it gives back to the boss each second while it lives. */
  heals?: number;
  /** It walks the lair in procession, round and round, and goes for nobody. */
  walks?: boolean;
  /** Broken, it spills water: the boss within `r` is cooled by `by` of its heat. */
  douse?: { r: number; by: number };
  /** Seconds after it is broken until another stands in its place. */
  respawn?: number;
}

export const HELPERS: readonly HelperDef[] = [
  { id: 'risen', name: 'the risen', hp: 34, speed: 78, dmg: 8, reach: 40, every: 1.6, tell: 0.5, most: 6 },
  // The King's herd, for a contract that says he comes with it: quicker than the dead and harder to pin.
  { id: 'herd', name: 'a herd beast', hp: 40, speed: 118, dmg: 10, reach: 44, every: 1.5, tell: 0.5, most: 6 },
  // What a contract asks to be broken first. They stand where they are put and do nothing: a thing to go out of the way for.
  { id: 'gravemarker', name: 'a grave marker', hp: 240, speed: 0, dmg: 0, reach: 0, every: 0, tell: 0, most: 0, still: true },
  { id: 'totem', name: 'an antler totem', hp: 240, speed: 0, dmg: 0, reach: 0, every: 0, tell: 0, most: 0, still: true },
  // The Spinner's young: quick and weak, and there are always more while a sac stands.
  { id: 'spiderling', name: 'a spiderling', hp: 18, speed: 130, dmg: 5, reach: 34, every: 1.4, tell: 0.5, most: 4 },
  // A sac on the cellar wall: it does nothing but hatch. Broken, it hatches nothing more.
  { id: 'eggsac', name: 'an egg sac', hp: 50, speed: 0, dmg: 0, reach: 0, every: 0, tell: 0, most: 5, still: true, hatch: { every: 18, into: 'spiderling' } },
  // The Abbot's monks walk round the abbey singing, and he mends while they sing. They do not fight.
  { id: 'monk', name: 'a drowned monk', hp: 40, speed: 46, dmg: 0, reach: 0, every: 0, tell: 0, most: 3, heals: 1.5, walks: true },
  // Sparks off the Furnace that walk.
  { id: 'cinder', name: 'a cinder', hp: 24, speed: 96, dmg: 7, reach: 38, every: 1.6, tell: 0.5, most: 4 },
  // Water barrels in the foundry: broken next to the Furnace, the water cools it. Another is rolled in after a while.
  { id: 'barrel', name: 'a water barrel', hp: 30, speed: 0, dmg: 0, reach: 0, every: 0, tell: 0, most: 0, still: true, douse: { r: 200, by: 55 }, respawn: 14 },
  // A mirror in the hall. While it stands the Mirror King can step out of it, and leave a reflection in it.
  { id: 'mirror', name: 'a tall mirror', hp: 80, speed: 0, dmg: 0, reach: 0, every: 0, tell: 0, most: 0, still: true },
  // A reflection of the Mirror King: as tall as he is and as quick, with a small blow of its own. It breaks with its mirror.
  { id: 'reflection', name: 'a reflection', hp: 40, speed: 80, dmg: 10, reach: 60, every: 2.0, tell: 0.7, most: 3 },
];

export interface MonsterDef {
  id: string;
  name: string;
  /** What the board says of it before it has been met. */
  rumor: string;
  /** What the board says once it has been hunted. */
  known: string;
  lair: 'churchyard' | 'wood' | 'cellar' | 'abbey' | 'foundry' | 'hall';
  hp: number;
  speed: number;
  /** How much ground it takes. */
  r: number;
  /** How much stagger breaks it the first time, how much more each time after, how long it is down and how much more it takes then. */
  stagger: { max: number; grow: number; down: number; more: number };
  /** Seconds it walks between attacks, least and most. */
  gap: readonly [number, number];
  /** How near its mark it likes to stand. */
  reach: number;
  attacks: readonly AttackDef[];
  /** The round of attacks of each of its three parts, by name, in the order it uses them. */
  parts: readonly [readonly string[], readonly string[], readonly string[]];
  /** Standing stones in its lair: things a charge can be made to hit. */
  stones: number;
  /** Its trophy, by name, and what the trophy does for whoever wears it. */
  trophy: { id: string; name: string; says: string };
  /** The coin of each mark. The first fall at a mark pays twice. */
  pay: readonly [number, number, number];
  /** What must have been felled for its contract to be posted: nothing, or a monster. */
  after: string | null;
  /** Where it is weakest, in a line, told on its contract once it has been hunted. */
  weak?: string;
  /** Things of its lair that stand on the field from the start: egg sacs, barrels, mirrors. */
  props?: { id: string; n: number };
  /** Water lying in its lair: so many pools, so wide, and how much slower everyone in them goes. */
  shallows?: { n: number; r: number; slow: number };
  /**
   * A boss that runs hot. Its heat goes up `rise` a second; at `hot` and over it takes `hotShare` of any harm, at
   * `cool` and under `coolShare`. At 100 it vents with `burst`, and is left at `after`.
   */
  heat?: { rise: number; hot: number; cool: number; hotShare: number; coolShare: number; after: number; burst: AttackDef };
}

export const MONSTERS: readonly MonsterDef[] = [
  {
    id: 'sexton', name: 'The Gravedigger',
    rumor: 'The graves at Saint Odran are open, and someone is still digging.',
    known: 'His spade hits in lines. The dead rise where the ground is marked. He is slow: attack after he swings.',
    weak: 'Slow to recover: hit him the moment his spade lands.',
    lair: 'churchyard', hp: 3400, speed: 62, r: 44, stagger: { max: 220, grow: 1.25, down: 4.5, more: 2 }, gap: [0.9, 1.5], reach: 150, stones: 0,
    attacks: [
      { id: 'spade', name: 'Spade Slam', tell: 0.95, recover: 1.3, dmg: 20, shapes: [{ kind: 'line', len: 290, w: 78 }] },
      { id: 'sweep', name: 'Sweep', tell: 0.85, recover: 1.2, dmg: 18, near: 210, shapes: [{ kind: 'cone', r: 185, half: 66 }] },
      { id: 'graves', name: 'Open Graves', tell: 1.4, recover: 1.7, dmg: 12, summon: 'risen', shapes: [{ kind: 'marks', n: 3, r: 44, at: 'target', spread: 190 }] },
      // Three furrows, one after another, fanned.
      { id: 'furrow', name: 'Three Slams', tell: 0.95, recover: 1.5, dmg: 20, shapes: [{ kind: 'line', len: 320, w: 62, turn: -30 }, { kind: 'line', len: 320, w: 62, after: 0.3 }, { kind: 'line', len: 320, w: 62, turn: 30, after: 0.6 }] },
      // His lantern: everything near him burns, so the answer is to be far or to be gone.
      { id: 'lantern', name: 'Lantern Burst', tell: 1.3, recover: 1.9, dmg: 24, shapes: [{ kind: 'ring', r: 200, at: 'self' }] },
      // The ground opens under the hunter again and again: keep moving.
      { id: 'bury', name: 'Bury', tell: 0.8, recover: 1.6, dmg: 16, shapes: [{ kind: 'marks', n: 6, r: 50, at: 'follow', every: 0.38 }] },
      { id: 'grasp', name: 'Grasping Hands', tell: 1.0, recover: 1.2, dmg: 9, root: 1.1, mark: 2, far: 170, split: true, shapes: [{ kind: 'ring', r: 82, at: 'target' }] },
      // Only against a party of three or more: his spade round in a half circle, across all of them.
      { id: 'widesweep', name: 'Wide Sweep', tell: 1.05, recover: 1.5, dmg: 18, party: 3, shapes: [{ kind: 'cone', r: 250, half: 105 }] },
      { id: 'cross', name: 'Four Slams', tell: 1.1, recover: 1.7, dmg: 19, mark: 3, shapes: [{ kind: 'line', len: 360, w: 74 }, { kind: 'line', len: 360, w: 74, turn: 90 }, { kind: 'line', len: 360, w: 74, turn: 180 }, { kind: 'line', len: 360, w: 74, turn: 270 }] },
      { id: 'moregraves', name: 'More Graves', tell: 1.5, recover: 1.8, dmg: 10, summon: 'risen', mark: 3, shapes: [{ kind: 'marks', n: 5, r: 44, at: 'field' }] },
    ],
    parts: [
      ['spade', 'sweep', 'spade', 'graves', 'grasp', 'widesweep'],
      ['furrow', 'sweep', 'graves', 'lantern', 'widesweep', 'spade', 'grasp', 'cross'],
      ['bury', 'furrow', 'lantern', 'graves', 'widesweep', 'sweep', 'cross', 'moregraves'],
    ],
    trophy: { id: 'spade', name: "The Gravedigger's Spade", says: 'Once per hunt, a hit that would kill you leaves you at 1 Health.' },
    pay: [40, 70, 110], after: null,
  },
  {
    id: 'king', name: 'The Antlered King',
    rumor: 'Something crowned walks the winter wood, and the trees lean away from it.',
    known: 'He charges across the field. Stand in front of a stone or a barricade and step aside: he is dazed when he hits it.',
    weak: 'He charges blind: a stone or a barricade in his way dazes him.',
    lair: 'wood', hp: 4200, speed: 96, r: 46, stagger: { max: 330, grow: 1.25, down: 4.5, more: 2 }, gap: [0.55, 0.9], reach: 230, stones: 2,
    attacks: [
      { id: 'charge', name: 'Charge', tell: 1.05, recover: 0.8, dmg: 42, charge: { speed: 880, daze: 2.2, stagger: 30 }, shapes: [{ kind: 'line', len: 640, w: 84 }] },
      { id: 'gore', name: 'Gore', tell: 0.62, recover: 0.9, dmg: 28, near: 190, shapes: [{ kind: 'cone', r: 150, half: 54 }] },
      { id: 'stomp', name: 'Stomp', tell: 0.8, recover: 1.1, dmg: 26, near: 230, shapes: [{ kind: 'ring', r: 175, at: 'self' }] },
      // Roots break the ground round the hunter.
      { id: 'thorns', name: 'Thorns', tell: 0.95, recover: 1.2, dmg: 23, split: true, shapes: [{ kind: 'marks', n: 5, r: 48, at: 'target', spread: 170 }] },
      // Only against a party of three or more: a turn of the antlers through everyone near.
      { id: 'widegore', name: 'Wide Gore', tell: 0.9, recover: 1.2, dmg: 26, party: 3, near: 260, shapes: [{ kind: 'cone', r: 220, half: 100 }] },
      // His herd: the dead of the wood run the field in lanes, and the hunter stands between.
      { id: 'herd', name: 'Stampede', tell: 1.4, recover: 1.6, dmg: 30, shapes: [{ kind: 'lanes', n: 4, w: 96 }] },
      { id: 'bellow', name: 'Roar', tell: 0.9, recover: 1.0, dmg: 22, mark: 2, shapes: [{ kind: 'ring', r: 280, at: 'self', inner: 120 }] },
      { id: 'crossherd', name: 'Wild Stampede', tell: 1.6, recover: 1.8, dmg: 30, mark: 3, shapes: [{ kind: 'lanes', n: 4, w: 96 }, { kind: 'marks', n: 4, r: 48, at: 'target', spread: 200, after: 0.7 }] },
    ],
    parts: [
      ['charge', 'gore', 'stomp', 'charge', 'widegore', 'bellow'],
      ['charge', 'thorns', 'charge', 'gore', 'widegore', 'stomp', 'bellow'],
      ['herd', 'charge', 'thorns', 'widegore', 'charge', 'stomp', 'crossherd', 'charge'],
    ],
    trophy: { id: 'antler', name: "The King's Tine", says: 'Dodge goes 25% further and has 25% less Cooldown.' },
    pay: [50, 85, 130], after: 'sexton',
  },
  {
    // One idea: the ground itself is hers. Webs hold whoever walks into them, her sacs keep hatching, and she comes down
    // from the dark where the ground is marked, and is slow and soft while she climbs back up.
    id: 'spinner', name: 'The Spinner',
    rumor: 'Something under the cellars of Harrow spins. The cats will not go down.',
    known: 'Her webs hold you: walk round them. Break her egg sacs or face more young. Hit her hard after she drops.',
    lair: 'cellar', hp: 3600, speed: 84, r: 42, stagger: { max: 240, grow: 1.25, down: 4.5, more: 2 }, gap: [0.8, 1.3], reach: 170, stones: 0,
    props: { id: 'eggsac', n: 3 },
    attacks: [
      { id: 'bite', name: 'Bite', tell: 0.72, recover: 1.1, dmg: 20, near: 210, shapes: [{ kind: 'cone', r: 150, half: 50 }] },
      // Spit that lands as webs: struck, held at once; missed, the web stays and holds whoever walks into it later.
      { id: 'spit', name: 'Web Spit', tell: 1.0, recover: 1.2, dmg: 8, root: 1.1, web: { r: 56, life: 11, root: 0.8 }, shapes: [{ kind: 'marks', n: 3, r: 56, at: 'target', spread: 150 }] },
      // Up into the dark, and down where the ring is: she is open and soft for a long while after.
      { id: 'drop', name: 'Drop', tell: 1.25, recover: 2.6, dmg: 26, leap: { soft: 0.5 }, shapes: [{ kind: 'ring', r: 112, at: 'target' }] },
      { id: 'legs', name: 'Leg Sweep', tell: 0.85, recover: 1.2, dmg: 18, near: 230, shapes: [{ kind: 'ring', r: 168, at: 'self' }] },
      { id: 'brood', name: 'Lay Eggs', tell: 1.3, recover: 1.5, dmg: 6, summon: 'eggsac', shapes: [{ kind: 'marks', n: 2, r: 40, at: 'field' }] },
      { id: 'widebite', name: 'Wide Bite', tell: 0.95, recover: 1.3, dmg: 18, party: 3, near: 260, shapes: [{ kind: 'cone', r: 215, half: 100 }] },
      { id: 'webfield', name: 'Web Rain', tell: 1.3, recover: 1.5, dmg: 8, root: 1.0, mark: 2, web: { r: 60, life: 10, root: 0.8 }, shapes: [{ kind: 'marks', n: 6, r: 60, at: 'field' }] },
      { id: 'frenzy', name: 'Frenzy', tell: 0.8, recover: 1.6, dmg: 18, mark: 3, near: 230, shapes: [{ kind: 'cone', r: 160, half: 40, turn: -45 }, { kind: 'cone', r: 160, half: 40, after: 0.25 }, { kind: 'cone', r: 160, half: 40, turn: 45, after: 0.5 }] },
    ],
    parts: [
      ['bite', 'spit', 'drop', 'legs', 'widebite'],
      ['spit', 'drop', 'bite', 'brood', 'legs', 'widebite', 'webfield'],
      ['drop', 'webfield', 'bite', 'brood', 'frenzy', 'drop', 'legs', 'widebite'],
    ],
    trophy: { id: 'silk', name: "The Spinner's Silk", says: 'Roots and webs hold you half as long.' },
    pay: [55, 95, 145], after: 'king',
  },
  {
    // One idea: the bell. Its rings come with a gap of safe ground to stand in, and the monks who walk round him singing
    // mend him while they live. The abbey is half under water, and the shallows slow everyone.
    id: 'abbot', name: 'The Bell Abbot',
    rumor: 'The abbey of Saint Wenna went under the lake. Its bell still rings at vespers.',
    known: 'Between the rings of his bell is safe ground: stand in it. Kill the singing monks, they heal him. Water slows you.',
    lair: 'abbey', hp: 3000, speed: 70, r: 46, stagger: { max: 280, grow: 1.25, down: 4.5, more: 2 }, gap: [0.9, 1.4], reach: 190, stones: 0,
    shallows: { n: 4, r: 112, slow: 0.3 },
    attacks: [
      { id: 'crook', name: 'Crook Swing', tell: 0.8, recover: 1.2, dmg: 20, near: 220, shapes: [{ kind: 'cone', r: 172, half: 60 }] },
      // A ring on him and a ring far out, at once: the band between them is where to be.
      { id: 'toll', name: 'Bell Toll', tell: 1.25, recover: 1.3, dmg: 22, shapes: [{ kind: 'ring', r: 130, at: 'self' }, { kind: 'ring', r: 430, at: 'self', inner: 245 }] },
      { id: 'censer', name: 'Censer', tell: 0.9, recover: 1.2, dmg: 19, shapes: [{ kind: 'line', len: 280, w: 72 }] },
      { id: 'procession', name: 'Call the Monks', tell: 1.3, recover: 1.5, dmg: 6, summon: 'monk', shapes: [{ kind: 'marks', n: 2, r: 40, at: 'field' }] },
      { id: 'widecrook', name: 'Wide Swing', tell: 1.0, recover: 1.4, dmg: 18, party: 3, near: 270, shapes: [{ kind: 'cone', r: 235, half: 100 }] },
      // Two tolls, the second shown once the first has rung, with its safe band further out: step out with it.
      { id: 'peal', name: 'Double Peal', tell: 1.25, recover: 1.5, dmg: 22, mark: 2, shapes: [{ kind: 'ring', r: 130, at: 'self' }, { kind: 'ring', r: 430, at: 'self', inner: 245 }, { kind: 'ring', r: 230, at: 'self', after: 1.2 }, { kind: 'ring', r: 480, at: 'self', inner: 360, after: 1.2 }] },
      { id: 'drown', name: 'Holy Water', tell: 0.9, recover: 1.5, dmg: 12, shapes: [{ kind: 'marks', n: 4, r: 46, at: 'follow', every: 0.5 }] },
      { id: 'knell', name: 'Knell', tell: 1.25, recover: 1.9, dmg: 22, mark: 3, shapes: [{ kind: 'ring', r: 130, at: 'self' }, { kind: 'ring', r: 430, at: 'self', inner: 245 }, { kind: 'ring', r: 230, at: 'self', after: 1.2 }, { kind: 'ring', r: 480, at: 'self', inner: 360, after: 1.2 }, { kind: 'ring', r: 350, at: 'self', after: 2.4 }] },
    ],
    parts: [
      ['crook', 'toll', 'censer', 'crook', 'toll', 'procession', 'widecrook'],
      ['toll', 'crook', 'censer', 'procession', 'peal', 'crook', 'censer', 'widecrook'],
      ['peal', 'drown', 'toll', 'crook', 'procession', 'widecrook', 'censer', 'knell', 'toll'],
    ],
    trophy: { id: 'bellrope', name: "The Abbot's Bell Rope", says: 'Each time the boss is stunned, you heal 20% of your Health.' },
    pay: [60, 100, 155], after: 'spinner',
  },
  {
    // One idea: heat. It must be cooled to be hurt: break a water barrel next to it. Left alone it heats up until it
    // vents, and after venting its weak place is open for a long while.
    id: 'furnace', name: 'The Furnace',
    rumor: 'The old foundry at Black Pit went cold ten years ago. Its chimney smokes again.',
    known: 'Hot, it takes little damage. Break a water barrel next to it to cool it. Left alone it vents: get away, then hit it.',
    lair: 'foundry', hp: 3400, speed: 58, r: 50, stagger: { max: 260, grow: 1.25, down: 4.5, more: 2 }, gap: [0.9, 1.4], reach: 170, stones: 0,
    props: { id: 'barrel', n: 4 },
    heat: {
      rise: 2.5, hot: 60, cool: 35, hotShare: 0.45, coolShare: 1.4, after: 15,
      burst: { id: 'overheat', name: 'Vent', tell: 1.4, recover: 3.2, dmg: 30, shapes: [{ kind: 'ring', r: 235, at: 'self' }] },
    },
    attacks: [
      { id: 'press', name: 'Hammer Press', tell: 0.8, recover: 1.2, dmg: 22, near: 210, shapes: [{ kind: 'cone', r: 162, half: 55 }] },
      // Four vents, then the four between them: stand between the spokes, then move.
      { id: 'vent', name: 'Vents', tell: 1.0, recover: 1.3, dmg: 20, shapes: [0, 90, 180, 270].map((turn) => ({ kind: 'line' as const, len: 340, w: 60, turn })).concat([45, 135, 225, 315].map((turn) => ({ kind: 'line' as const, len: 340, w: 60, turn, after: 0.7 }))) },
      { id: 'slag', name: 'Slag Throw', tell: 1.0, recover: 1.2, dmg: 18, shapes: [{ kind: 'marks', n: 3, r: 58, at: 'target', spread: 160 }] },
      { id: 'cinders', name: 'Cinders', tell: 1.3, recover: 1.5, dmg: 8, summon: 'cinder', shapes: [{ kind: 'marks', n: 2, r: 44, at: 'field' }] },
      { id: 'widepress', name: 'Wide Press', tell: 1.0, recover: 1.4, dmg: 19, party: 3, near: 270, shapes: [{ kind: 'cone', r: 232, half: 100 }] },
      // A line of fire that turns round it: keep behind it.
      { id: 'spokes', name: 'Turning Vent', tell: 0.95, recover: 1.6, dmg: 20, mark: 2, shapes: [0, 40, 80, 120, 160, 200].map((turn, i) => ({ kind: 'line' as const, len: 360, w: 56, turn, after: i * 0.25 })) },
      { id: 'pour', name: 'Pour Iron', tell: 1.4, recover: 1.6, dmg: 26, shapes: [{ kind: 'lanes', n: 3, w: 92 }] },
    ],
    parts: [
      ['press', 'vent', 'slag', 'cinders', 'widepress'],
      ['vent', 'slag', 'press', 'cinders', 'spokes', 'widepress'],
      ['spokes', 'pour', 'vent', 'cinders', 'press', 'widepress', 'slag'],
    ],
    trophy: { id: 'grate', name: "The Furnace's Grate", says: 'Skills have 15% less Cooldown.' },
    pay: [65, 110, 165], after: 'abbot',
  },
  {
    // One idea: he is not where he seems. He steps out of his mirrors and leaves reflections in the others, which fight
    // too and break at a blow. The true one makes the big marks. Break the mirrors and there is nowhere left to hide.
    id: 'mirror', name: 'The Mirror King',
    rumor: 'The mirror maker\'s hall has been shut a year. People see themselves in its windows, waving.',
    known: 'He steps out of his mirrors and leaves copies. Copies make small marks, he makes big ones. Break the mirrors.',
    lair: 'hall', hp: 3500, speed: 90, r: 44, stagger: { max: 250, grow: 1.25, down: 4.5, more: 2 }, gap: [0.8, 1.2], reach: 180, stones: 0,
    props: { id: 'mirror', n: 4 },
    attacks: [
      { id: 'cut', name: 'Glass Cut', tell: 0.75, recover: 1.1, dmg: 21, near: 210, shapes: [{ kind: 'cone', r: 160, half: 50 }] },
      { id: 'shards', name: 'Shards', tell: 0.9, recover: 1.2, dmg: 17, shapes: [{ kind: 'line', len: 330, w: 46, turn: -25 }, { kind: 'line', len: 330, w: 46 }, { kind: 'line', len: 330, w: 46, turn: 25 }] },
      // Each standing mirror bursts where it is marked; he steps out of one and a reflection out of each of the rest.
      { id: 'step', name: 'Mirror Step', tell: 1.1, recover: 1.0, dmg: 16, swap: true, summon: 'reflection', shapes: [{ kind: 'marks', n: 0, r: 72, at: 'props' }] },
      { id: 'lure', name: 'False Image', tell: 1.2, recover: 1.4, dmg: 8, summon: 'reflection', shapes: [{ kind: 'marks', n: 2, r: 44, at: 'target', spread: 170 }] },
      { id: 'widecut', name: 'Wide Cut', tell: 0.95, recover: 1.3, dmg: 18, party: 3, near: 260, shapes: [{ kind: 'cone', r: 220, half: 100 }] },
      { id: 'shatter', name: 'Shatter', tell: 1.2, recover: 1.4, dmg: 16, mark: 2, shapes: [{ kind: 'marks', n: 6, r: 56, at: 'field' }] },
      { id: 'crown', name: 'Crown of Glass', tell: 1.0, recover: 1.6, dmg: 22, mark: 3, shapes: [{ kind: 'ring', r: 265, at: 'self', inner: 110 }] },
    ],
    parts: [
      ['cut', 'shards', 'step', 'cut', 'widecut'],
      ['step', 'shards', 'cut', 'lure', 'shatter', 'widecut'],
      ['step', 'shards', 'lure', 'cut', 'shatter', 'widecut', 'crown'],
    ],
    trophy: { id: 'shard', name: 'The Mirror Shard', says: 'Your first hit after a dodge does 50% more damage.' },
    pay: [70, 120, 180], after: 'furnace',
  },
];

/** Monsters that are posted on the board but cannot yet be hunted: their names are not told. Every one there is can be hunted now. */
export const TO_COME: ReadonlyArray<{ id: string; after: string }> = [];

// ------------------------------------------------------------ posted contracts

/**
 * A contract on the board is a boss, a difficulty, and a few things that make
 * this hunt of it unlike the last: how the boss fights (a variant), more of
 * its minions, and tasks besides the kill that pay more when they are done.
 * The board draws them by the save's own dice (lodge.ts); the hunt plays
 * them (hunt.ts, `Setup.terms`).
 */

/** How many contracts the board holds, how many hunts before the whole board is posted again, and the free new postings between hunts. */
export const BOARD = { size: 4, turnEvery: 5, freeReposts: 1 };

/** No warning is ever made shorter than this by a variant: a person has to be able to react. One that was shorter already stays as it was. */
export const TELL_FLOOR = 0.5;

export type VariantKind = 'boss' | 'minions';

export interface VariantDef {
  id: string;
  name: string;
  /** One plain line, as the poster says it. */
  says: string;
  kind: VariantKind;
  /** Only for this boss. */
  only?: string;
  /** Not below this difficulty. */
  mark?: Mark;
  /** What it adds to the contract's danger. Each point of it adds a quarter to the pay. */
  danger: number;
  /** What cannot come with it. */
  not?: readonly string[];
  /** Its numbers, each read by its own rule in hunt.ts. */
  speed?: number;
  tell?: number;
  gap?: number;
  hp?: number;
  /** How much bigger every shape it marks is. */
  size?: number;
  /** The share of harm taken off, until it is broken once. */
  armor?: number;
  /** Fights with the attacks of its next phase. */
  ahead?: boolean;
  /** How much longer it is open after an attack. */
  recover?: number;
  /** Leaves rot where it walks: a ring every so often, which bursts after its warning. */
  blight?: { every: number; r: number; tell: number; dmg: number };
  /** An attack it makes more often: one of these after every so many of its round. */
  more?: { attack: string; every: number };
  /** An attack it makes twice in a row. */
  again?: string;
  /** Minions with it from the start, and again at each new phase. */
  escort?: number;
  /** Minions that keep coming: so many, every so many seconds, each where a mark shows first. */
  waves?: { every: number; n: number };
  /** So many more of its lair's props. */
  props?: number;
  /** How much faster it heats up. */
  heat?: number;
}

export const VARIANTS: readonly VariantDef[] = [
  { id: 'quick', name: 'Quick', says: 'Moves and attacks 25% faster. Shorter warnings.', kind: 'boss', danger: 2, speed: 1.25, tell: 0.83, gap: 0.8, not: ['giant'] },
  { id: 'armored', name: 'Armored', says: 'Takes 50% less damage until you break its stagger once.', kind: 'boss', danger: 2, armor: 0.5 },
  { id: 'furious', name: 'Furious', says: 'Uses its next phase\'s attacks from the start.', kind: 'boss', mark: 2, danger: 2, ahead: true },
  // Big and slow: its attacks are bigger, but shown longer, further apart, and it is open longer after each.
  { id: 'giant', name: 'Giant', says: '20% more Health and bigger attacks. Slower, and open longer after each.', kind: 'boss', danger: 1, hp: 1.2, speed: 0.75, size: 1.15, tell: 1.35, gap: 1.35, recover: 1.5, not: ['quick'] },
  { id: 'blighted', name: 'Blighted', says: 'Leaves rot where it walks. The marked ground bursts.', kind: 'boss', danger: 1, blight: { every: 1.3, r: 60, tell: 1.1, dmg: 13 } },
  { id: 'restless', name: 'Restless Dead', says: 'Opens graves twice as often.', kind: 'boss', only: 'sexton', danger: 1, more: { attack: 'graves', every: 2 } },
  { id: 'stampede', name: 'Stampede', says: 'Charges twice in a row. A crash stops the second.', kind: 'boss', only: 'king', mark: 2, danger: 2, again: 'charge' },
  { id: 'brood', name: 'Brood Mother', says: 'Two more egg sacs in the cellar.', kind: 'boss', only: 'spinner', danger: 1, props: 2 },
  { id: 'choir', name: 'Full Choir', says: 'Calls the monks twice as often.', kind: 'boss', only: 'abbot', danger: 1, more: { attack: 'procession', every: 2 } },
  { id: 'stoked', name: 'Stoked', says: 'Heats up 50% faster.', kind: 'boss', only: 'furnace', danger: 1, heat: 1.5 },
  { id: 'gallery', name: 'Gallery', says: 'Two more mirrors in the hall.', kind: 'boss', only: 'mirror', danger: 1, props: 2 },
  { id: 'escort', name: 'Escort', says: '3 minions with it, and 3 more at each new phase.', kind: 'minions', danger: 1, escort: 3, not: ['waves'] },
  { id: 'waves', name: 'Endless Minions', says: '2 more minions every 28 seconds.', kind: 'minions', danger: 1, waves: { every: 28, n: 2 }, not: ['escort'] },
];

/** Who fights for each boss when a contract brings minions, and what a contract asks to be broken first. */
export const MINION: Record<string, string> = { sexton: 'risen', king: 'herd', spinner: 'spiderling', abbot: 'monk', furnace: 'cinder', mirror: 'reflection' };
/** The Furnace has none: what stands in the foundry is its barrels, and they are for breaking anyway. */
export const MARKER: Record<string, string> = { sexton: 'gravemarker', king: 'totem', spinner: 'eggsac', abbot: 'gravemarker', mirror: 'mirror' };

export type TaskKind = 'swift' | 'careful' | 'breaks' | 'nobuild' | 'markers' | 'villagers' | 'cart' | 'together';

export interface TaskDef {
  id: TaskKind;
  name: string;
  /** What the poster says, with `{n}` for the task's number. */
  says: string;
  /** Its number at each difficulty, where it has one. */
  n?: readonly [number, number, number];
  /** The bonus it pays when done, as a share of the contract's coin. */
  pay: number;
  not?: readonly TaskKind[];
}

export const TASKS: readonly TaskDef[] = [
  // Seconds, at each difficulty; longer for a Giant and for each hunter more, as the boss's Health is.
  { id: 'swift', name: 'Fast Kill', says: 'Kill it within {n}.', n: [215, 240, 265], pay: 0.5 },
  { id: 'careful', name: 'Careful', says: 'Get hit no more than {n} times.', n: [20, 18, 16], pay: 0.5 },
  { id: 'breaks', name: 'Break It', says: 'Break its stagger {n} times.', n: [3, 3, 4], pay: 0.4 },
  // Not posted: building nothing was no challenge, only a choice. The rule stays for a contract that may want it later.
  { id: 'nobuild', name: 'No Camp', says: 'Build nothing in its lair.', pay: 0.4 },
  { id: 'markers', name: 'Markers', says: 'Break all {n} markers before it dies.', n: [6, 6, 7], pay: 0.5 },
  // How many of the three must live.
  { id: 'villagers', name: 'Villagers', says: 'Keep {n} of the 3 villagers alive.', n: [1, 1, 2], pay: 0.5, not: ['cart'] },
  { id: 'cart', name: 'The Cart', says: 'Do not let the cart be destroyed.', pay: 0.5, not: ['villagers'] },
  // Only on a contract for two hunters or more: how many times the party may go down in all.
  { id: 'together', name: 'Stay Standing', says: 'The party goes down no more than {n} times. Helped up within 7 s counts half.', n: [4, 4, 3], pay: 0.5 },
];

/** A villager on the field: they stand where they are and hope. */
/** A villager on the field: they stand and hope, and run out of a warning they find themselves in, slower than a hunter. */
export const VILLAGER: AllyDef = { way: 'cower', hp: 170, speed: 95, reach: 0, every: 0, dmg: 0 };
/** The cart a contract asks to be kept whole. It is not built: it is there. */
/** The cart a contract asks to be kept whole. It rolls along its road at `speed`, and stops while a warning lies on its way. */
export const CART: BuildingDef = { id: 'cart', name: 'The Cart', says: 'Keep it whole.', cost: 0, hp: 900, r: 30, kind: 'cart', reach: 0, opens: null };
export const CART_ROAD = { speed: 24, ahead: 46 };

/** Where each boss is hunted, as a poster says it. */
export const WHERE: Record<string, string> = {
  sexton: "Saint Odran's churchyard", king: 'The winter wood', spinner: 'The cellars under Harrow', abbot: 'The drowned abbey of Saint Wenna',
  furnace: 'The old foundry at Black Pit', mirror: "The mirror maker's hall",
};

/** Who puts a contract up. */
export const POSTED_BY: readonly string[] = [
  'The village of Harrow', 'Father Aldric', 'The widow Maud', 'Tobin the miller', 'The foreman of the Black Pit', 'The reeve of Coldwater',
  'The innkeeper at the Crossed Keys', 'Sister Hild', 'The charcoal burners', 'The ferryman', "Lord Vesey's steward", 'Old Gammer Pike',
  'The gravediggers of Saint Odran', 'A farmer who would not give his name', 'The toll keeper', 'The children of Harrow',
];

/** Why it was put up: a line each, by the boss. */
export const WHY: Record<string, readonly string[]> = {
  sexton: [
    'He dug up my husband. Then he buried him again, better. I still want him gone.',
    'The bell rings at night. Nobody is in the tower.',
    'Three of our dead walked into the river. They could not swim before either.',
    'He took every spade in the parish.',
    'Something fills in the graves we dig. Then digs them out again.',
    'Our priest went to talk to him. Now our priest digs too.',
    'The lantern on the hill is not ours.',
    'We buried Old Wick on Monday. He was home for supper on Tuesday.',
    'Nobody has slept in a week. The digging goes on all night.',
    'He keeps a list. My name is on it.',
    'The dead keep walking to the mill. The miller wants them off his floor.',
    'He opened my family tomb and said it was overdue.',
    'Funerals are cancelled until he is dead. Properly dead.',
    'He stole the church bell rope. We have nothing to ring.',
  ],
  king: [
    "Took three cows and the miller's boy. The boy came back. The cows did not.",
    'The deer do not run from the hunters any more. They run with him.',
    'Our woodcutters will not go past the old wall.',
    'He wears a lamp in his antlers. It was my brother\'s.',
    'Every tree on the north road is scratched at head height.',
    'A bell rings in the wood when he passes. We took that bell down years ago.',
    "He broke the gate of the lord's park. Then the lord's carriage. Then the lord.",
    'Snow came in summer. He came with it.',
    'Our hunters went into the wood. Their dogs came back alone.',
    'He knocked down the toll house. Twice.',
    'The crows follow him. So do the wolves.',
    'We left him bread at the edge of the wood. He left us a crown of bones.',
    'The charcoal burners say he stood and watched them all night.',
    'He walked through the village at dawn. Nobody has fixed the walls since.',
  ],
  spinner: [
    'The wine in our cellar is wrapped up tight. So is the cellarman.',
    'Something taps on the floorboards from below. Eight taps.',
    'Our cat went down after a rat. The rat came back up.',
    'The cellars under Harrow join up now. They never used to.',
    'There are eggs in the potato store. They are not potatoes.',
    'My husband went down for a cheese. Bring the cheese if you can.',
    'Silk on every stair. The children think it is snow.',
    'She took the well bucket, the rope, and the boy holding it.',
    'Nobody goes down after dark. It is always dark down there.',
    'The tavern cellar is hers now. We are out of ale.',
    'We hear her spinning all night. It sounds like a loom.',
    'The rats have all gone. That is not good news.',
  ],
  abbot: [
    'The bell rings under the lake at vespers. We drowned it on purpose.',
    'Monks walk out of the water in a line. They never get wet.',
    'The ferry will not cross. The bell calls it back.',
    'Our nets come up with prayer books in them.',
    'He blessed the lake. Now nothing lives in it.',
    'The abbey roof is above the water again. It was not last year.',
    'He wants his tithe. We do not know what in.',
    'Our priest went to the shore to pray. He is still there. Singing.',
    'The bell is louder every night.',
    'Three fishermen joined the choir. They could not sing before.',
    'He took the candles from our church. All of them.',
    'Every bell in the valley rings when his does.',
  ],
  furnace: [
    'The foundry went cold ten years ago. It is warm again.',
    'Its chimney smokes, and nobody has been in to light it.',
    'It ate the coal store. Then the coal man.',
    'Sparks come over the wall and walk about.',
    'The river runs hot past the foundry. The fish come out cooked.',
    'We hear the hammers going all night. There is nobody to swing them.',
    'Our smith went in to put it out. Bring his apron back.',
    'It wants iron. It has had all our gates.',
    'The snow does not settle on the Black Pit road.',
    'It breathes. We can see the walls move.',
    'Every pot in the village has a crack in it now.',
    'The night shift at the pit came out with their boots melted.',
  ],
  mirror: [
    'I saw myself in his window. I waved. I was not waving.',
    'There are two of my daughter now. One of them is wrong.',
    'He made our mirrors. Cover yours.',
    'The mirror maker died a year ago. His shop is open.',
    'My reflection is late. It catches up.',
    'Every window on Glass Street shows the same face.',
    'He owes the butcher for a year of meat. The butcher has asked.',
    'Things come out of the mirrors at night and stand in the road.',
    'He sold Lord Vesey a looking glass. There are two Lord Veseys.',
    'The lake shows his hall upside down. With lights on.',
    'We broke our mirrors. The pieces still watch.',
    'Something in the hall wears a crown made of glass.',
  ],
};

/** The chance a contract also pays a thing: a step from the shop, free. Only from difficulty 2. */
export const THING_CHANCE = 0.3;

/** How many hunters a contract takes, drawn from these at each difficulty. A dangerous contract takes one more, up to four. */
export const PARTY_SIZES: Record<Mark, readonly number[]> = { 1: [1, 1, 1, 2], 2: [1, 2, 2, 3], 3: [2, 3, 3, 4] };
/** From this danger on, a contract takes one hunter more. */
export const PARTY_DANGER = 6;
