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
  // A thing thrown: the arm goes back, then whips over.
  throw: {
    windup: pose({ weaponRot: -70, weaponX: -8, weaponY: -8, bodyRot: -10, headRot: -5, rootX: -4 }),
    strike: pose({ weaponRot: 70, weaponX: 10, bodyRot: 12, headRot: 5, rootX: 8, legBackRot: 12, extraRot: -10 }),
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
