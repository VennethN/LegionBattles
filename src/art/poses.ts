// The far ends of each movement. The game tweens between these and standing
// still, and the contact sheet draws every unit at each of them, which is
// where a part that comes away from the body shows up.

import type { AttackStyle } from './kit/unit';
import { pose, type Pose } from './rig';

export interface AttackPoses {
  /** Drawn back, just before the blow. */
  windup: Pose;
  /** The moment of contact or release. */
  strike: Pose;
}

export const ATTACK_POSES: Record<AttackStyle, AttackPoses> = {
  // A one-handed blade: back over the head, then down and across.
  slash: {
    windup: pose({ weaponRot: -92, weaponY: -6, bodyRot: -9, rootX: -5, headRot: -5, offRot: -8, legFrontRot: -8 }),
    strike: pose({ weaponRot: 64, weaponX: 4, bodyRot: 13, rootX: 14, headRot: 6, offRot: 6, legBackRot: 14, extraRot: -14 }),
  },
  // A two-handed weapon: heaved up, then brought down hard.
  chop: {
    windup: pose({ weaponRot: -78, weaponY: -10, bodyRot: -11, bodySy: 0.05, rootX: -6, headRot: -8, legFrontRot: -10 }),
    strike: pose({ weaponRot: 60, weaponY: 2, bodyRot: 16, bodySy: -0.05, rootX: 16, headRot: 9, legBackRot: 16, extraRot: -14 }),
  },
  // A spear or a dagger: pulled back, then straight out.
  thrust: {
    windup: pose({ weaponX: -14, weaponRot: -6, bodyRot: -8, rootX: -5, headRot: -4 }),
    strike: pose({ weaponX: 20, weaponRot: 4, bodyRot: 12, rootX: 14, headRot: 5, legBackRot: 14, extraRot: -12 }),
  },
  // A bow: the string hand comes back, the limbs bend, and it is let go.
  bow: {
    windup: pose({ offX: -17, weaponSx: -0.2, weaponX: 2, bodyRot: -6, headRot: -4, rootX: -2 }),
    strike: pose({ offX: 5, weaponSx: 0.12, bodyRot: 4, headRot: 2, rootX: 2, extraRot: -6 }),
  },
  // A staff: raised and held, then swept forward.
  cast: {
    windup: pose({ weaponRot: -20, weaponY: -13, bodyRot: -7, bodySy: 0.05, headRot: -7, rootY: -3 }),
    strike: pose({ weaponRot: 30, weaponY: -3, weaponX: 4, bodyRot: 9, headRot: 5, rootX: 5, extraRot: -10 }),
  },
  // Something on a chain: swung back, then up and out.
  swing: {
    windup: pose({ weaponRot: 42, bodyRot: -5, headRot: -4, offRot: -6 }),
    strike: pose({ weaponRot: -96, weaponY: -8, bodyRot: 7, headRot: 4, rootY: -3, offRot: 6, extraRot: -8 }),
  },
  // A crossbow or an engine: steadied, then it kicks.
  shoot: {
    windup: pose({ weaponRot: -5, weaponX: 3, bodyRot: 3, headRot: 2, bodySy: -0.02 }),
    strike: pose({ weaponRot: -12, weaponX: -11, bodyRot: -9, headRot: -6, rootX: -5, bodySx: 0.04, extraRot: 10 }),
  },
  // A thing thrown: the arm goes back, then whips over.
  throw: {
    windup: pose({ weaponRot: -70, weaponX: -8, weaponY: -8, bodyRot: -10, headRot: -5, rootX: -4 }),
    strike: pose({ weaponRot: 70, weaponX: 10, bodyRot: 12, headRot: 5, rootX: 8, legBackRot: 12, extraRot: -10 }),
  },
  // A beast, whose weapon is its head: drawn back, then snapped forward and down. It moves less than a
  // spear does, because a head that goes as far as a spear comes off its neck.
  bite: {
    windup: pose({ weaponRot: -14, weaponX: -5, bodyRot: -6, rootX: -6, legFrontRot: -8 }),
    strike: pose({ weaponRot: 12, weaponX: 8, bodyRot: 7, rootX: 16, legBackRot: 12, extraRot: -12 }),
  },
  // An engine's throwing arm: held down, then over the top. The frame under it hardly stirs.
  lob: {
    windup: pose({ weaponRot: -8, bodyRot: -2, bodySy: -0.02 }),
    strike: pose({ weaponRot: 64, bodyRot: 3, rootX: 2, bodySy: 0.03, extraRot: -8 }),
  },
  // A log or a drill on wheels: drawn back, then run forward. It stays on its wheels, and they turn.
  ram: {
    windup: pose({ weaponX: -14, rootX: -4, bodyRot: -2, legBackRot: -16, legFrontRot: -16 }),
    strike: pose({ weaponX: 20, rootX: 10, bodyRot: 3, legBackRot: 24, legFrontRot: 24, extraRot: -10 }),
  },
  // ---- The heroes' own. A soldier's blow tips the whole figure as one piece, which is right for a
  // crowd and stiff for the one figure a player looks at. In these the lead foot steps (legFrontRot,
  // legFrontY), the head turns against the body so that it stays on the enemy (headRot of the other
  // sign), and whatever is cloth lags behind and then whips past (extraRot, times each one's sway).

  // A sword kept on top of a great shield: the shield is pushed out as the sword goes back, and the cut comes down over it.
  guard: {
    windup: pose({ weaponRot: -74, weaponX: -6, weaponY: -8, offX: 6, offRot: -5, bodyRot: -8, headRot: 7, rootX: -6, legFrontRot: -14, legFrontY: -4, legBackRot: 6, extraRot: 14 }),
    strike: pose({ weaponRot: 62, weaponX: 8, weaponY: 8, offX: -4, offRot: 6, bodyRot: 11, headRot: -8, rootX: 15, legFrontRot: -20, legBackRot: 18, extraRot: -24 }),
  },
  // A great axe: heaved up off the back foot, brought down with a step.
  cleave: {
    windup: pose({ weaponRot: -80, weaponY: -10, bodyRot: -13, bodySy: 0.06, headRot: 9, rootX: -7, legFrontRot: -16, legFrontY: -5, legBackRot: 8, extraRot: 16 }),
    strike: pose({ weaponRot: 66, weaponX: 6, weaponY: 4, bodyRot: 18, bodySy: -0.06, headRot: -11, rootX: 18, legFrontRot: -22, legBackRot: 20, extraRot: -26 }),
  },
  // A hammer carried on the shoulder: lifted off it and over, then down in front.
  smite: {
    windup: pose({ weaponRot: 44, weaponY: -14, weaponX: 2, bodyRot: -10, bodySy: 0.05, headRot: 8, rootX: -6, legFrontRot: -14, legFrontY: -4, legBackRot: 6, extraRot: 14 }),
    strike: pose({ weaponRot: 122, weaponX: 12, weaponY: 6, bodyRot: 17, bodySy: -0.05, headRot: -10, rootX: 18, legFrontRot: -22, legBackRot: 20, extraRot: -26 }),
  },
  // A knife or a couched lance: gathered, then the whole body goes after the point. Whoever lunges is drawn
  // in a stride already, so the legs are turned only a little more: turned as far as a soldier's, they lay flat.
  lunge: {
    windup: pose({ weaponX: -16, weaponRot: -6, offRot: 10, bodyRot: -10, headRot: 7, rootX: -8, legFrontRot: -6, legFrontY: -4, extraRot: 12 }),
    strike: pose({ weaponX: 26, weaponRot: -3, weaponY: -3, offRot: -22, offX: -6, bodyRot: 8, headRot: -6, rootX: 20, legFrontRot: -10, legBackRot: 10, extraRot: -24 }),
  },
  // A staff or a wand: drawn up and back, then thrown forward from the shoulder.
  invoke: {
    windup: pose({ weaponRot: -24, weaponY: -15, bodyRot: -9, bodySy: 0.06, headRot: 8, rootY: -4, rootX: -3, legFrontRot: -10, legFrontY: -3, extraRot: 12 }),
    strike: pose({ weaponRot: 36, weaponX: 8, weaponY: -2, bodyRot: 8, headRot: -6, rootX: 8, legFrontRot: -18, legBackRot: 12, extraRot: -22 }),
  },
  // A longbow carried low with the arrow on the string: brought up level and drawn, then loosed. The arrow
  // turns about the string hand and the bow about the bow hand, so the two are moved to stay together.
  longshot: {
    windup: pose({ weaponRot: -30, weaponX: 4, weaponY: -18, weaponSx: -0.2, offRot: -30, offX: -15, offY: -7, bodyRot: -8, headRot: 6, rootX: -3, legFrontRot: -8, extraRot: 10 }),
    strike: pose({ weaponRot: -30, weaponX: 4, weaponY: -18, weaponSx: 0.12, offRot: -30, offX: 7, offY: -7, bodyRot: 4, headRot: -2, rootX: 2, extraRot: -10 }),
  },
  // A bell hung from a crook: the crook is tipped back, then swung down so that the bell comes over and rings.
  toll: {
    windup: pose({ weaponRot: -20, weaponY: -6, bodyRot: -8, headRot: 6, rootX: -4, legFrontRot: -8, extraRot: 10 }),
    strike: pose({ weaponRot: 52, weaponX: 6, weaponY: 2, bodyRot: 14, headRot: -9, rootX: 10, legFrontRot: -16, legBackRot: 14, extraRot: -18 }),
  },
  // A bird that strikes from the air: it lifts, then drops on its talons with its wings thrown up.
  stoop: {
    windup: pose({ rootY: -10, rootX: -6, bodyRot: -12, weaponRot: -10, legFrontRot: -20, legBackRot: -20, extraRot: 14 }),
    strike: pose({ rootY: 10, rootX: 14, bodyRot: 16, weaponRot: 12, legFrontRot: 26, legBackRot: 26, extraRot: -26 }),
  },
};

/** The top of a walking hop. */
export const HOP_POSE: Pose = pose({
  rootY: -11, bodyRot: 5, bodySy: 0.05, bodySx: -0.03, headRot: 3, headY: -1,
  legBackRot: 26, legFrontRot: -24, weaponRot: -6, offRot: 5, extraRot: -10,
});

/** Landing from a hop. */
export const LAND_POSE: Pose = pose({ bodySy: -0.07, bodySx: 0.06, headY: 2, legBackRot: -8, legFrontRot: 8, extraRot: 6 });

/** Struck: knocked back and squashed. */
export const HIT_POSE: Pose = pose({
  rootX: -9, bodyRot: -11, bodySx: 0.12, bodySy: -0.1, headRot: -12, headY: 2, weaponRot: -14, offRot: -10, extraRot: 16,
});

/** Halfway through toppling over, which is where a loose part would show. */
export const TOPPLE_POSE: Pose = pose({ rootRot: -52, rootY: -4, headRot: -14, weaponRot: -30, offRot: -18, legFrontRot: -20, legBackRot: 14 });
