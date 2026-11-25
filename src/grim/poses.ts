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
  strike: pose({ offRot: -112, offX: 8, offY: -8, bodyRot: -5, headRot: -8, extraRot: 6 }),
};

/** An arm thrown out to point: a kennelman setting his dogs on, a captain's order. */
export const POINT: Move = {
  windup: pose({ offRot: 30, bodyRot: -5, headRot: 4 }),
  strike: pose({ offRot: -82, offX: 6, offY: -6, bodyRot: 8, headRot: -5, rootX: 4, extraRot: -10 }),
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
