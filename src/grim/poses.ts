// The far ends of each movement. The game tweens between these and standing
// still, and the sheets draw every figure at each of them, which is where a
// part that comes away from the body shows up.
//
// A figure names the moves it has (kit/unit.ts, `moves`), so that a hunter
// with two abilities has a movement for each and a monster one for every
// attack it shows before it makes it.

import type { Move } from './kit/unit';
import { pose, type Pose } from './rig';

// ---- Polearms held upright in both hands, turning at the chest.

/** A halberd heaved back over the shoulder and brought down in front. */
export const CLEAVE: Move = {
  windup: pose({ weaponRot: -64, weaponY: -8, weaponX: -6, bodyRot: -9, headRot: 6, rootX: -6, legFrontRot: -10, legFrontY: -3, extraRot: 14 }),
  strike: pose({ weaponRot: 74, weaponX: 12, weaponY: 10, bodyRot: 14, bodySy: -0.04, headRot: -8, rootX: 14, legFrontRot: -14, legBackRot: 14, extraRot: -22 }),
};

/** The same weapon swung low and wide: back and down, then across. */
export const REAP: Move = {
  windup: pose({ weaponRot: -128, weaponY: 16, weaponX: -10, bodyRot: -12, headRot: 8, rootX: -8, legBackRot: 8, extraRot: 16 }),
  strike: pose({ weaponRot: 112, weaponY: 22, weaponX: 14, bodyRot: 16, headRot: -10, rootX: 16, legFrontRot: -16, legBackRot: 16, extraRot: -26 }),
};

/** Set against a blow: the point lowered at what comes, the weight on the back foot. */
export const BRACE: Pose = pose({ weaponRot: 58, weaponY: 14, weaponX: 4, bodyRot: -6, bodyY: 5, headRot: 4, legFrontRot: -12, legBackRot: 10, extraRot: 6 });

// ---- A crossbow, carried low and brought up.

export const LOOSE: Move = {
  windup: pose({ weaponRot: -22, weaponY: -10, weaponX: 4, bodyRot: -4, headRot: 3, offRot: -12, extraRot: 6 }),
  strike: pose({ weaponRot: -30, weaponY: -9, weaponX: -8, bodyRot: -10, headRot: -5, rootX: -5, offRot: -6, extraRot: 12 }),
};

/** A heavy crossbow held at the shoulder: he leans into it, and it throws him back when it goes. */
export const SHOULDER_LOOSE: Move = {
  windup: pose({ weaponRot: 3, weaponX: 4, bodyRot: 6, headRot: 3, legFrontRot: -5, rootX: 2 }),
  strike: pose({ weaponRot: -15, weaponX: -16, weaponY: -5, bodyRot: -12, headRot: -9, rootX: -10, legBackRot: -12, legFrontRot: 8, extraRot: 18 }),
};

/** Something set down on the ground: a trap laid, a flask rolled underhand. The whole man goes down to do it. */
export const SET_DOWN: Move = {
  windup: pose({ weaponRot: -14, weaponY: -6, bodyRot: -6, headRot: 5, rootX: -3, extraRot: 8 }),
  strike: pose({ weaponRot: 34, weaponX: 6, weaponY: 14, bodyRot: 24, bodyY: 10, headRot: -14, rootX: 6, legFrontRot: -10, legBackRot: 10, extraRot: -16 }),
};

// ---- A censer on a chain, and a lantern lifted.

export const CENSE: Move = {
  windup: pose({ weaponRot: 46, weaponY: -4, bodyRot: -7, headRot: 5, extraRot: 16 }),
  strike: pose({ weaponRot: -88, weaponY: -10, weaponX: 6, bodyRot: 9, headRot: -6, rootX: 6, legFrontRot: -10, extraRot: -24 }),
};

export const LIFT_LAMP: Move = {
  windup: pose({ offRot: -30, offY: -4, bodyRot: -4, headRot: 4 }),
  strike: pose({ offRot: -118, offY: -16, offX: 4, bodyRot: 5, bodySy: 0.03, headRot: -6, rootY: -3, extraRot: -10 }),
};

// ---- A spear or a pike, level.

export const THRUST: Move = {
  windup: pose({ weaponX: -16, weaponRot: -5, bodyRot: -9, headRot: 6, rootX: -6, legFrontRot: -8, extraRot: 10 }),
  strike: pose({ weaponX: 24, weaponRot: 3, bodyRot: 12, headRot: -7, rootX: 16, legFrontRot: -14, legBackRot: 14, extraRot: -20 }),
};

/** A long pole with a light on its end, jabbed up and out at something's face. */
export const JAB: Move = {
  windup: pose({ weaponX: -12, weaponY: 7, weaponRot: 4, bodyRot: -8, headRot: 5, rootX: -5, extraRot: 8 }),
  strike: pose({ weaponX: 20, weaponY: -11, weaponRot: -3, bodyRot: 10, headRot: -6, rootX: 12, legFrontRot: -12, legBackRot: 12, extraRot: -14 }),
};

/** The same pole put straight up, as high as it goes, to burst its light over everything. */
export const RAISE_LIGHT: Move = {
  windup: pose({ weaponRot: 12, weaponY: 6, bodyRot: 5, bodyY: 3, headRot: 3 }),
  strike: pose({ weaponRot: -26, weaponY: -24, weaponX: -4, bodyRot: -6, bodySy: 0.03, headRot: -10, rootY: -3, extraRot: -8 }),
};

/** A spear carried upright, dropped to the hip and driven in underhand. */
export const UNDERHAND: Move = {
  windup: pose({ weaponRot: 34, weaponY: 2, weaponX: -8, bodyRot: -8, headRot: 5, rootX: -6, legFrontRot: -8, extraRot: 10 }),
  strike: pose({ weaponRot: 76, weaponX: 22, weaponY: 26, bodyRot: 14, bodySy: -0.03, headRot: -8, rootX: 16, legFrontRot: -14, legBackRot: 14, extraRot: -20 }),
};

/** A hand to the mouth: a whistle that brings the dogs in. */
export const WHISTLE: Move = {
  windup: pose({ offRot: -30, bodyRot: 3, headRot: 2 }),
  strike: pose({ offRot: -112, offX: 8, offY: -8, bodyRot: -9, bodySy: 0.03, headRot: -16, weaponRot: -9, rootX: -4, extraRot: 10 }),
};

/** An arm thrown out to point: a dog handler setting his dogs on, a captain's order. */
export const POINT: Move = {
  windup: pose({ offRot: 30, bodyRot: -5, headRot: 4 }),
  strike: pose({ offRot: -82, offX: 6, offY: -6, bodyRot: 11, headRot: -8, rootX: 8, weaponRot: 16, weaponX: 6, legFrontRot: -8, extraRot: -12 }),
};

// ---- Beasts and the small dead, whose weapon is the head or the arms.

export const LUNGE_BITE: Move = {
  windup: pose({ weaponRot: -14, weaponX: -6, bodyRot: -7, rootX: -8, legFrontRot: -10, extraRot: 8 }),
  strike: pose({ weaponRot: 14, weaponX: 10, bodyRot: 8, rootX: 18, legBackRot: 14, extraRot: -14 }),
};

export const CLAW: Move = {
  windup: pose({ weaponRot: -70, weaponY: -6, offRot: -30, bodyRot: -10, headRot: 8, rootX: -4 }),
  strike: pose({ weaponRot: 46, weaponX: 8, offRot: 20, bodyRot: 16, headRot: -10, rootX: 12, legBackRot: 12, extraRot: -12 }),
};

// ---- An engine: it kicks back when it looses.

export const KICK: Move = {
  windup: pose({ weaponRot: -3, weaponX: 2 }),
  strike: pose({ weaponRot: -9, weaponX: -9, bodyRot: -3, rootX: -3 }),
};

/** A thing that does nothing but stand. */
export const STAND: Move = { windup: pose({}), strike: pose({}) };

// ---- What every figure does.

/** A step: the top of it, and coming down. Tall figures stride; they do not hop. */
export const STRIDE: Pose = pose({ rootY: -4, bodyRot: 5, headRot: -2, legBackRot: 24, legFrontRot: -22, legFrontY: -3, weaponRot: -3, offRot: 6, extraRot: -12 });
export const TREAD: Pose = pose({ rootY: 1, bodyRot: 2, bodySy: -0.02, legBackRot: -16, legFrontRot: 16, legBackY: -3, weaponRot: 2, offRot: -5, extraRot: 8 });

/** Struck: knocked back, the head thrown. */
export const HIT: Pose = pose({ rootX: -8, bodyRot: -12, bodySx: 0.05, bodySy: -0.05, headRot: -14, weaponRot: -12, offRot: -14, extraRot: 18 });

/** Halfway through falling, which is where a loose part would show. */
export const FALL: Pose = pose({ rootRot: -48, rootY: -4, headRot: -16, weaponRot: -28, offRot: -22, legFrontRot: -18, legBackRot: 14, extraRot: 20 });

// ---- What every hunter has besides: a roll out of a blow, and the ways they wait at the inn.

/** Rolled out of a blow: tucked low, going forward, the weapon held in. Halfway through, where a part would come away. */
export const DODGE: Pose = pose({ rootX: 14, rootY: 22, rootRot: 26, bodyRot: 30, bodySy: -0.08, headRot: 24, weaponRot: 30, weaponX: -6, offRot: 30, legFrontRot: -46, legFrontY: -10, legBackRot: 40, legBackY: -8, extraRot: -26 });
/** Waiting: the weight on the back foot, the head down, the weapon let rest against them. */
export const REST: Pose = pose({ rootX: -2, bodyRot: -4, bodyY: 2, headRot: 14, headY: 2, weaponRot: 8, weaponX: -4, weaponY: 4, offRot: 10, legFrontRot: -8, legBackRot: 4, extraRot: 4 });
/** Sat down on a bench or a barrel: low, the legs out in front, the head down. */
export const SIT: Pose = pose({ rootY: 44, bodyRot: -6, bodyY: 4, headRot: 12, weaponRot: 14, weaponY: 6, offRot: 18, legFrontRot: -78, legFrontY: -6, legBackRot: -64, legBackY: -4, extraRot: 6 });

// ---- The hunters who came after the first four.

/** A sledge carried on the shoulder, heaved back and brought down over it onto what is in front. */
export const SMASH: Move = {
  windup: pose({ weaponRot: -30, weaponY: -10, weaponX: -6, bodyRot: -12, headRot: 6, rootX: -8, legFrontRot: -8, legFrontY: -3, extraRot: 14 }),
  strike: pose({ weaponRot: 150, weaponX: 16, weaponY: 26, bodyRot: 20, bodySy: -0.05, headRot: -10, rootX: 16, legFrontRot: -16, legBackRot: 16, extraRot: -24 }),
};
/** The same sledge swung low and round, at the knees of what is there. */
export const SWING_LOW: Move = {
  windup: pose({ weaponRot: -60, weaponY: 10, weaponX: -14, bodyRot: -14, headRot: 8, rootX: -10, legBackRot: 8, extraRot: 16 }),
  strike: pose({ weaponRot: 104, weaponX: 18, weaponY: 30, bodyRot: 14, headRot: -10, rootX: 14, legFrontRot: -16, legBackRot: 14, extraRot: -22 }),
};
/** A thing heaved up and thrown down in front with both hands: an anvil, a stone. */
export const HEAVE: Move = {
  windup: pose({ weaponRot: -40, weaponY: -16, bodyRot: -16, bodySy: 0.03, headRot: -8, rootX: -6, rootY: -4, legFrontRot: -6, extraRot: 14 }),
  strike: pose({ weaponRot: 60, weaponX: 10, weaponY: 24, bodyRot: 26, bodyY: 10, headRot: -12, rootX: 10, legFrontRot: -18, legBackRot: 16, extraRot: -20 }),
};
/** A thing held up high, as a blessing or a warning: a red-hot sledge, a lamp. */
export const HOLD_HIGH: Move = {
  windup: pose({ weaponRot: -12, weaponY: 6, bodyRot: 4, bodyY: 3, headRot: 4 }),
  strike: pose({ weaponRot: -70, weaponY: -26, weaponX: -6, bodyRot: -8, bodySy: 0.04, headRot: -14, rootY: -4, extraRot: -12 }),
};
/** A pick brought down from over the head, short and hard. */
export const PICK: Move = {
  windup: pose({ weaponRot: -96, weaponY: -12, weaponX: -6, bodyRot: -10, headRot: 6, rootX: -6, legFrontRot: -8, extraRot: 14 }),
  strike: pose({ weaponRot: 54, weaponX: 12, weaponY: 18, bodyRot: 18, bodySy: -0.04, headRot: -10, rootX: 14, legFrontRot: -14, legBackRot: 14, extraRot: -20 }),
};
/** The pick driven into the ground with the whole weight behind it: the floor cracks and the roof comes down. */
export const BREAK_GROUND: Move = {
  windup: pose({ weaponRot: -120, weaponY: -20, weaponX: -8, bodyRot: -16, bodySy: 0.03, headRot: -6, rootY: -6, legFrontRot: -8, extraRot: 16 }),
  strike: pose({ weaponRot: 88, weaponX: 10, weaponY: 40, bodyRot: 34, bodyY: 14, headRot: -16, rootX: 8, rootY: 6, legFrontRot: -20, legBackRot: 22, extraRot: -26 }),
};
/** Something on the back swung round and thrown overarm with the free hand: a keg with its fuse lit. */
export const THROW: Move = {
  windup: pose({ offRot: -150, offY: -10, offX: -10, bodyRot: -14, headRot: 8, rootX: -6, weaponRot: 14, legBackRot: 8, extraRot: 14 }),
  strike: pose({ offRot: 60, offX: 14, offY: -4, bodyRot: 16, headRot: -8, rootX: 12, weaponRot: -10, legFrontRot: -14, legBackRot: 14, extraRot: -20 }),
};
/** A very long pole swung flat across in front, its lamp going round with it. */
export const POLE_SWEEP: Move = {
  windup: pose({ weaponRot: -30, weaponX: -10, weaponY: 4, bodyRot: -10, headRot: 6, rootX: -6, extraRot: 12 }),
  strike: pose({ weaponRot: 62, weaponX: 14, weaponY: 10, bodyRot: 12, headRot: -8, rootX: 12, legFrontRot: -12, legBackRot: 12, extraRot: -18 }),
};
/** The pole's foot set against what is in front and pushed, the whole body behind it: what a ferry is poled off with. */
export const SHOVE: Move = {
  windup: pose({ weaponX: -14, weaponRot: 16, weaponY: 6, bodyRot: -6, headRot: 4, rootX: -8, legFrontRot: -6, extraRot: 10 }),
  strike: pose({ weaponX: 26, weaponRot: 34, weaponY: 14, bodyRot: 22, headRot: -10, rootX: 18, legFrontRot: -18, legBackRot: 26, extraRot: -22 }),
};
/** A cleaver brought down short: the butcher's stroke, from the shoulder. */
export const CHOP: Move = {
  windup: pose({ weaponRot: -80, weaponY: -10, weaponX: -4, bodyRot: -8, headRot: 5, rootX: -4, extraRot: 10 }),
  strike: pose({ weaponRot: 50, weaponX: 10, weaponY: 12, bodyRot: 14, bodySy: -0.03, headRot: -8, rootX: 10, legFrontRot: -10, legBackRot: 10, extraRot: -16 }),
};
/** The cleaver back across, the other way: a backhand that follows the chop. */
export const BACKHAND: Move = {
  windup: pose({ weaponRot: 46, weaponY: 6, bodyRot: 10, headRot: -4, rootX: 4, extraRot: -10 }),
  strike: pose({ weaponRot: -54, weaponX: 6, weaponY: -2, bodyRot: -10, headRot: 6, rootX: 8, legFrontRot: -8, legBackRot: 8, extraRot: 16 }),
};
/** A hook on a chain whirled and thrown with the free hand, then hauled back in. */
export const HOOK_THROW: Move = {
  windup: pose({ offRot: -130, offY: -10, bodyRot: -10, headRot: 6, rootX: -6, weaponRot: 10, extraRot: 14 }),
  strike: pose({ offRot: 40, offX: 16, offY: -6, bodyRot: 14, headRot: -8, rootX: 12, weaponRot: -6, legFrontRot: -14, legBackRot: 14, extraRot: -18 }),
};

/** The sledge held up red-hot a moment, then brought down: the Smith's heated blow. */
export const FORGE_STRIKE: Move = { windup: HOLD_HIGH.strike, strike: SMASH.strike };
/** Many short cuts in a row where he stands: the cleaver up, and down at the end of them. */
export const HACK: Move = {
  windup: pose({ weaponRot: -40, weaponY: -6, bodyRot: -4, headRot: 4, rootX: -2, extraRot: 8 }),
  strike: pose({ weaponRot: 70, weaponX: 14, weaponY: 16, bodyRot: 18, bodySy: -0.04, headRot: -10, rootX: 14, legFrontRot: -12, legBackRot: 12, extraRot: -18 }),
};
