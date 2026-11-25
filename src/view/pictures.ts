// Which picture stands for what. Every hunter, monster, helper, man and
// building of the game is named here and nowhere else: the screens ask
// this table, and the art builds write exactly what it names.
//
// The game's own style is the Grim kit (src/grim): a figure of it is named
// by `grim`. What that kit has not drawn yet is shown by a figure of the
// Legion kit this project was begun with, as a dark shape of the right
// size and no more: a stand-in that sits in the style. When the kit draws
// one, its line here changes to `grim` and the Legion figure leaves.

export type Side = 'blue' | 'red';

/** A figure of the game's own style, or a stand-in from the Legion kit (which side's drawing, and how big). */
export type Art = { grim: string } | { legion: string; team: Side; scale: number };

/** How big a figure of the style is drawn on the field: a hunter's 178 units of height are then about 90 pixels in a portal's frame. A monster is drawn at the same. */
export const GRIM_SCALE = 0.6;
/** The player's own hunter is drawn a little bigger than anyone else's, so that they read beside a boss. Their reach on the field is the rules', not this. */
export const HUNTER_SCALE = 0.72;
/** The color a stand-in is filled with: the style's unlit black, a little lifted so that it is seen on the dark. */
export const STAND_IN = 0x1a2227;

export const isGrim = (a: Art): a is { grim: string } => 'grim' in a;

export const HUNTER_ART: Record<string, Art> = {
  marta: { grim: 'marta' }, jory: { grim: 'jory' }, agnes: { grim: 'agnes' }, brask: { grim: 'brask' },
  // Hands for hire are not drawn yet: a dark shape of a fighter and of an archer.
  sellsword: { legion: 'militia', team: 'blue', scale: 0.62 }, bowman: { legion: 'poacher', team: 'blue', scale: 0.62 },
  greta: { grim: 'greta' }, ned: { grim: 'ned' }, ida: { grim: 'ida' }, silas: { grim: 'silas' },
};

export const MONSTER_ART: Record<string, Art> = {
  sexton: { grim: 'sexton' },
  king: { grim: 'king' },
  spinner: { grim: 'spinner' },
  abbot: { grim: 'abbot' },
  furnace: { grim: 'furnace' },
  mirror: { grim: 'mirror' },
};

/** Which of a monster's own moves shows each of its attacks, by the attack's name. One not named here is shown by the shape it marks. */
export const MONSTER_MOVES: Record<string, Record<string, string>> = {
  sexton: { spade: 'slam', furrow: 'slam', cross: 'slam', sweep: 'sweep', lantern: 'ring', graves: 'ring', moregraves: 'ring', bury: 'ring', grasp: 'ring', shift: 'ring' },
  king: { charge: 'charge', gore: 'gore', stomp: 'stomp', bellow: 'bellow', thorns: 'bellow', herd: 'bellow', crossherd: 'bellow', shift: 'bellow' },
  // The later four: an attack with no move of its own is shown by the nearest one it has.
  spinner: { bite: 'bite', widebite: 'bite', frenzy: 'bite', legs: 'legs', spit: 'spit', webfield: 'spit', drop: 'drop', brood: 'brood', shift: 'legs' },
  abbot: { crook: 'crook', widecrook: 'crook', toll: 'toll', peal: 'toll', knell: 'knell', censer: 'censer', drown: 'censer', procession: 'procession', shift: 'toll' },
  furnace: { press: 'press', widepress: 'press', vent: 'vent', spokes: 'vent', overheat: 'vent', slag: 'slag', cinders: 'cinders', pour: 'pour', shift: 'vent' },
  mirror: { cut: 'cut', widecut: 'cut', shards: 'shards', step: 'step', lure: 'lure', shatter: 'shatter', crown: 'crown', shift: 'crown' },
};

/** Which of a hunter's own moves shows each blow of their chain, by its place in the chain. One not named here is shown by their first move. */
export const BLOW_MOVES: Record<string, readonly string[]> = {
  greta: ['smash', 'swing'], ned: ['jab', 'pick'], ida: ['jab', 'sweep'], silas: ['chop', 'backhand', 'chop'],
};

/** Which of a hunter's moves shows each ability, by the ability's name. Their first move is their own blow. */
export const ABILITY_MOVES: Record<string, string> = {
  reap: 'reap', jawtrap: 'set', tarflask: 'set', flare: 'flare', lamp: 'lamp', seton: 'setOn', heel: 'heel',
  forgestrike: 'forgestrike', anvil: 'anvil', keg: 'keg', cavein: 'cavein', shove: 'shove', wake: 'wake', hook: 'hook', hack: 'hack',
};

export const HELPER_ART: Record<string, Art> = {
  risen: { grim: 'risen' }, herd: { grim: 'herdbeast' },
  // What a contract asks to be broken first: not drawn yet, a dark stone.
  gravemarker: { legion: 'barrowstone', team: 'red', scale: 0.7 }, totem: { legion: 'barrowstone', team: 'red', scale: 0.7 },
  // The later bosses' own, and the props of their lairs, which stand as figures until they are broken.
  spiderling: { grim: 'spiderling' }, eggsac: { grim: 'eggsac' }, monk: { grim: 'monk' }, cinder: { grim: 'cinder' },
  barrel: { grim: 'barrel' }, mirror: { grim: 'mirror-stand' }, reflection: { grim: 'reflection' },
};

/** How see-through a helper is drawn: a reflection is a little, so that the true one is told from it. */
export const HELPER_ALPHA: Record<string, number> = { reflection: 0.62 };

/** What lies on the field of the later lairs, by the kit's name for it: drawn at the size of the thing in the rules. */
export const FIELD_THINGS = { web: 'web', water: 'shallows', wake: 'wake-light', anvil: 'anvil', keg: 'powderkeg', iron: 'poured-iron' } as const;
/** How wide the kit drew each of those, in the rules' units: what a picture is scaled by. */
export const FIELD_THING_R: Record<string, number> = { shallows: 112 };

/** Those who fight beside the hunter, by the reinforcement they came with. */
export const ALLY_ART: Record<string, Art> = {
  pikemen: { grim: 'pikeman' },
  hound: { grim: 'hound' },
  crossbowmen: { grim: 'crossbowman' },
  sappers: { grim: 'sapper' },
  // The villagers a contract asks to be kept alive: not drawn yet, so a dark shape of the right size.
  villager: { legion: 'beekeeper', team: 'blue', scale: 0.58 },
};

export const BUILDING_ART: Record<string, Art> = {
  barricade: { grim: 'barricade' },
  watchfire: { grim: 'watchfire' },
  ballista: { grim: 'ballista' },
  bellpost: { grim: 'bellpost' },
  // The cart a contract asks to be kept whole: not drawn yet, so a dark shape of the right size.
  cart: { legion: 'warwagon', team: 'blue', scale: 0.6 },
};

/** What stands or lies on the field besides: a lair's stones, a trap laid, the lamp Agnes stands on the ground. */
export const STONE_ART: Art = { legion: 'barrowstone', team: 'red', scale: 0.9 };
export const TRAP_ART: Art = { legion: 'spiketrap', team: 'blue', scale: 0.4 };
export const LAMP_ART: Art = { grim: 'streetlamp' };

/** The ground of each kind of lair: the style's own, or one of the Legion kit's by name until the style has it. */
export const LAIR_GROUND: Record<string, { grim: string } | { legion: 'meadow' | 'desert' | 'snow' }> = {
  churchyard: { grim: 'churchyard' }, wood: { grim: 'wood' },
  cellar: { grim: 'cellar' }, abbey: { grim: 'abbey' }, foundry: { grim: 'foundry' }, hall: { grim: 'hall' },
};


const ALL: Art[] = [...Object.values(HUNTER_ART), ...Object.values(MONSTER_ART), ...Object.values(HELPER_ART), ...Object.values(ALLY_ART), ...Object.values(BUILDING_ART), STONE_ART, TRAP_ART, LAMP_ART];
const legion = (list: Art[]): Array<{ team: Side; unit: string }> => list.flatMap((a) => (isGrim(a) ? [] : [{ team: a.team, unit: a.legion }]));

/** Every figure of the style the game shows. */
export const GRIM_UNITS: string[] = [...new Set(ALL.flatMap((a) => (isGrim(a) ? [a.grim] : [])))];

/** The Legion stand-ins that are moved part by part: a monster. */
export const RIGGED = legion(Object.values(MONSTER_ART));
/** The Legion stand-ins shown as one picture, changed between two as they walk. */
export const STILLS = legion([...Object.values(HELPER_ART), ...Object.values(ALLY_ART), ...Object.values(BUILDING_ART), STONE_ART, TRAP_ART]);
/** The Legion stand-ins shown whole on a card. */
export const WHOLE = legion([...Object.values(HUNTER_ART), ...Object.values(MONSTER_ART), ...Object.values(ALLY_ART), ...Object.values(BUILDING_ART)]);
/** The Legion grounds still shown. */
export const LEGION_GROUNDS = [...new Set(Object.values(LAIR_GROUND).flatMap((g) => ('legion' in g ? [g.legion] : [])))];
