// One figure on the screen: a unit's parts as sprites, moved every frame by
// the rig. It is the art's own runtime, and knows nothing of any game: a
// game says where the figure stands, which way it faces, and what happens
// to it (it attacks, it is struck, it falls), and this plays that.
//
// Nothing here is frame-by-frame drawing. Every movement is a pose (a set
// of offsets for the parts) blended in and out over time: standing and
// breathing, hopping along, winding up and striking, being hit, falling.
// Because parts move by their role, a new unit needs no animation of its
// own.
//
// Nothing is allocated per frame.

import Phaser from 'phaser';
import type { ManifestUnit } from '../../art/manifest';
import { ATTACK_POSES, HIT_POSE, HOP_POSE, LAND_POSE } from '../../art/poses';
import { FEET_X, FEET_Y, addPose, clearPose, makeXforms, restPose, solve, type PartXform, type Pose } from '../../art/rig';
import { ART_SCALE } from './scale';
import { SHEET, Sheet } from './Sheet';

const RAD = Math.PI / 180;
const INV_ART = 1 / ART_SCALE;

/** Seconds a blow takes to come back to rest after it lands. */
const RECOVER = 0.3;
/** Seconds a hit's flinch lasts, and its white flash. */
const FLINCH = 0.26;
const FLASH = 0.07;
/** Seconds to fall over, to lie there, and to fade. A quick death skips the lying. */
const FALL = 0.42;
const LIE = 0.55;
const FADE = 0.45;

/**
 * What kind of thing a figure is. A unit breathes, hops along, swings and
 * topples. A building does none of that: only its flag stirs, a shot kicks
 * it a little, and it comes down where it stands.
 */
export type FigureKind = 'unit' | 'building';

function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}
function easeInQuad(t: number): number {
  return t * t;
}
function easeOutBack(t: number): number {
  const c = 1.70158;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

export class Figure {
  readonly root: Phaser.GameObjects.Container;
  /** Where its feet are. Set these, then call update. */
  x = 0;
  y = 0;
  /** 1 to face right, -1 to face left. */
  facing: 1 | -1 = 1;
  /** Hopping along: it is walking somewhere. */
  moving = false;
  /** Hopping on the spot. */
  cheering = false;
  /** How fast it hops when walking: its speed over the usual. */
  stride = 1;
  /** Added to its depth, which is otherwise how far down the screen its feet are. */
  lift = 0;
  /** How see-through it is besides its own fading: 1 is not at all. */
  alpha = 1;

  private readonly sprites: Phaser.GameObjects.Image[] = [];
  private readonly xf: PartXform[];
  private readonly pose: Pose = restPose();
  private readonly weaponIndex: number;
  private readonly glow: Phaser.GameObjects.Image | null = null;
  private readonly phase: number;

  private turn: number;
  private hopT = 0;
  private hopBlend = 0;
  private actAt = -1;
  private actWindup = 0.3;
  private actBig = false;
  private hitAt = -1;
  private hitDir = 1;
  private flashOn = false;
  private deadAt = -1;
  private quick = false;
  private isGone = false;

  constructor(
    scene: Phaser.Scene,
    readonly unitId: string,
    readonly team: 'blue' | 'red',
    private readonly art: ManifestUnit,
    /** How big a unit of its canvas is drawn, in the scene's own units. */
    public scale = 0.8,
    readonly kind: FigureKind = 'unit',
    seed = 0,
    /** The color of the glow a caster gathers at the tip of what it holds, or null for none. */
    glowColor: number | null = null,
  ) {
    this.root = scene.add.container(0, 0);
    this.xf = makeXforms(art.parts.length);
    let weapon = -1;
    art.parts.forEach((part, i) => {
      // The frame knows its own pivot (Sheet sets it), so the sprite turns about the right point.
      const img = scene.add.image(0, 0, SHEET, Sheet.unitFrame(team, unitId, part.name));
      img.setScale(INV_ART);
      this.sprites.push(img);
      this.root.add(img);
      if (part.role === 'weapon') weapon = i;
    });
    this.weaponIndex = weapon;
    if (glowColor !== null && (weapon >= 0 || kind === 'building')) {
      this.glow = scene.add.image(0, 0, SHEET, 'fx/disc').setScale(0).setTint(glowColor);
      this.root.add(this.glow);
    }
    // Its own rhythm, so that a row of figures does not breathe as one.
    this.phase = (((seed + 1) * 2654435761) >>> 0) / 4294967296 * 20;
    this.facing = team === 'blue' ? 1 : -1;
    this.turn = this.facing;
  }

  /**
   * Shows another picture in place of what it holds: a bare hand, for a game in which what a hero carries is drawn
   * beside them and not in their grip. The picture turns about its own middle, at the hand.
   */
  bareHand(frame: string): void {
    if (this.weaponIndex >= 0) this.sprites[this.weaponIndex].setFrame(frame);
  }

  /** A blow, a shot or a cast begins and will land in `windup` seconds. */
  attack(now: number, windup: number, big = false): void {
    if (this.deadAt >= 0) return;
    this.actAt = now;
    this.actWindup = Math.max(0.05, windup);
    this.actBig = big;
  }

  /** It was hurt. `fromX` is where the blow came from. */
  hit(now: number, fromX: number): void {
    if (this.deadAt >= 0) return;
    this.hitAt = now;
    const away = this.x >= fromX ? 1 : -1;
    // In the figure's own frame, back is negative: knocked the way the blow was going.
    this.hitDir = away === this.facing ? -1 : 1;
  }

  /** It falls. A quick death does not lie on the ground first: for when many fall in a second. */
  die(now: number, quick = false): void {
    if (this.deadAt < 0) this.deadAt = now;
    this.quick = quick;
    this.actAt = -1;
    this.moving = false;
  }

  /** Stands it up again as new: a figure that has fallen and gone is used for the next of its kind. */
  revive(): void {
    this.deadAt = -1;
    this.isGone = false;
    this.actAt = -1;
    this.hitAt = -1;
    this.hopT = 0;
    this.hopBlend = 0;
    this.moving = false;
    this.cheering = false;
    this.alpha = 1;
    this.turn = this.facing;
    this.root.setVisible(true);
    this.root.alpha = 1;
  }

  get dead(): boolean {
    return this.deadAt >= 0;
  }

  /** True once it has fallen and faded away. */
  get gone(): boolean {
    return this.isGone;
  }

  /** When it started to fall, by the clock it is updated with. Negative while it stands. */
  get fellAt(): number {
    return this.deadAt;
  }

  /** How far above its feet its shots leave from, and how far ahead of them. */
  get muzzleHeight(): number {
    return (FEET_Y - this.art.muzzle[1]) * this.scale;
  }
  get muzzleReach(): number {
    return (this.art.muzzle[0] - FEET_X) * this.scale * this.facing;
  }

  /** How tall it stands, for what floats over it. */
  get height(): number {
    return (FEET_Y - this.art.top) * this.scale;
  }

  setVisible(on: boolean): void {
    this.root.setVisible(on && !this.isGone);
  }

  update(now: number, dt: number): void {
    if (this.isGone) return;
    const p = this.pose;
    clearPose(p);
    const t = now + this.phase;
    const fixed = this.kind !== 'unit';

    if (!fixed) {
      // Standing: a slow breath, the head a beat behind, what is held swaying.
      const breath = Math.sin(t * 2.7);
      p.bodySy += 0.022 * breath;
      p.bodySx -= 0.014 * breath;
      p.headY += 1.1 * Math.sin(t * 2.7 - 0.7);
      p.headRot += 1.4 * Math.sin(t * 1.6);
      p.weaponRot += 2.6 * Math.sin(t * 2.1 + 1);
      p.offRot += 1.8 * Math.sin(t * 1.9 + 2);
    }
    // A flag stirs on a building as a plume does on a helm, and harder when there is something to cheer.
    p.extraRot += (fixed && this.cheering ? 9 : 5) * Math.sin(t * (fixed && this.cheering ? 5 : 2.3) + 0.5);

    // Walking, and cheering, are small hops.
    const hopping = !fixed && (this.moving || this.cheering) && this.deadAt < 0;
    this.hopBlend += ((hopping ? 1 : 0) - this.hopBlend) * Math.min(1, dt * 12);
    if (hopping || this.hopBlend > 0.02) {
      this.hopT += dt * (this.cheering ? 2.4 : 2.9 * this.stride);
      const h = Math.abs(Math.sin(this.hopT * Math.PI));
      addPose(p, HOP_POSE, h * this.hopBlend);
      const land = 1 - h;
      addPose(p, LAND_POSE, land * land * land * land * this.hopBlend);
      if (this.cheering) p.weaponRot -= 30 * h * this.hopBlend;
    } else {
      this.hopT = 0;
    }

    // A blow: back, a held breath, then through, to arrive exactly on time.
    let charge = 0;
    if (this.actAt >= 0 && fixed) {
      // A tower does not lean into a shot. It gathers, and the shot's kick sets it back a little.
      const e = now - this.actAt;
      if (e < this.actWindup) charge = Math.min(1, e / this.actWindup / 0.7);
      else {
        const r = (e - this.actWindup) / RECOVER;
        if (r >= 1) this.actAt = -1;
        else {
          const k = (1 - r) * (1 - r);
          p.bodySy -= 0.05 * k;
          p.bodySx += 0.03 * k;
          charge = Math.max(0, 1 - r * 3);
        }
      }
    } else if (this.actAt >= 0) {
      const poses = ATTACK_POSES[this.art.style];
      const e = now - this.actAt;
      const reach = this.actBig ? 1.3 : 1;
      if (e < this.actWindup) {
        const u = e / this.actWindup;
        if (u < 0.55) addPose(p, poses.windup, easeOutCubic(u / 0.55) * reach);
        else if (u < 0.78) addPose(p, poses.windup, reach * (1 + 0.06 * Math.sin(((u - 0.55) / 0.23) * Math.PI)));
        else {
          const k = easeInQuad((u - 0.78) / 0.22);
          addPose(p, poses.windup, (1 - k) * reach);
          addPose(p, poses.strike, k * reach);
        }
        charge = Math.min(1, u / 0.7);
      } else {
        const r = (e - this.actWindup) / RECOVER;
        if (r >= 1) this.actAt = -1;
        else {
          addPose(p, poses.strike, (1 - easeOutBack(Math.min(1, r * 1.1))) * reach);
          charge = Math.max(0, 1 - r * 3);
        }
      }
    }

    // A hit: knocked back and squashed, and white for a moment.
    let flash = false;
    if (this.hitAt >= 0) {
      const e = now - this.hitAt;
      if (e >= FLINCH) this.hitAt = -1;
      else {
        const k = e < 0.04 ? e / 0.04 : 1 - (e - 0.04) / (FLINCH - 0.04);
        // A wall does not flinch: it shudders.
        if (fixed) p.rootX += 2.4 * Math.sin(e * 95) * k;
        else addPose(p, HIT_POSE, k);
        if (!fixed && this.hitDir > 0) {
          // Struck from behind: the same flinch, the other way.
          p.rootX -= 2 * HIT_POSE.rootX * k;
          p.bodyRot -= 2 * HIT_POSE.bodyRot * k;
          p.headRot -= 2 * HIT_POSE.headRot * k;
        }
        flash = e < FLASH;
      }
    }
    if (flash !== this.flashOn) {
      this.flashOn = flash;
      for (let i = 0; i < this.sprites.length; i++) {
        const s = this.sprites[i];
        if (this.art.parts[i].role === 'shadow') continue;
        if (flash) s.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
        else s.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
      }
    }

    // Falling: over backwards, a small bounce, a moment on the ground, gone.
    let alpha = this.alpha;
    if (this.deadAt >= 0 && fixed) {
      // Brought down: it shudders and sinks into its own dust, where it stands.
      const e = now - this.deadAt;
      const k = Math.min(1, e / FALL);
      p.bodySy -= 0.82 * easeInQuad(k);
      p.bodySx += 0.12 * k;
      p.rootX += 2.6 * Math.sin(e * 70) * (1 - k);
      const fade = (e - FALL * 0.6) / FADE;
      if (fade >= 1) {
        this.isGone = true;
        this.root.setVisible(false);
        return;
      }
      if (fade > 0) alpha *= 1 - fade;
    } else if (this.deadAt >= 0) {
      const e = now - this.deadAt;
      const fall = this.quick ? FALL * 0.6 : FALL;
      const k = Math.min(1, e / fall);
      let rot = -90 * easeInQuad(k);
      if (e > fall) {
        const b = Math.min(1, (e - fall) / 0.22);
        rot += 9 * Math.sin(b * Math.PI) * (1 - b);
      }
      p.rootRot += rot;
      p.rootY += -10 * Math.sin(k * Math.PI);
      p.rootX += -10 * k;
      p.weaponRot += -40 * k;
      p.headRot += -14 * k;
      const fade = (e - fall - (this.quick ? 0.05 : LIE)) / (this.quick ? FADE * 0.5 : FADE);
      if (fade >= 1) {
        this.isGone = true;
        this.root.setVisible(false);
        return;
      }
      if (fade > 0) alpha *= 1 - fade;
    }

    solve(this.art.parts, p, this.xf);
    for (let i = 0; i < this.sprites.length; i++) {
      const s = this.sprites[i];
      const o = this.xf[i];
      s.x = o.x;
      s.y = o.y;
      s.rotation = o.rot * RAD;
      s.scaleX = o.sx * INV_ART;
      s.scaleY = o.sy * INV_ART;
    }

    if (this.glow) {
      if (this.weaponIndex >= 0) {
        const o = this.xf[this.weaponIndex];
        const part = this.art.parts[this.weaponIndex];
        const lx = this.art.muzzle[0] - part.pivot[0];
        const ly = this.art.muzzle[1] - part.pivot[1];
        const c = Math.cos(o.rot * RAD);
        const s = Math.sin(o.rot * RAD);
        this.glow.x = o.x + lx * c - ly * s;
        this.glow.y = o.y + lx * s + ly * c;
      } else {
        // A building holds nothing: what it throws gathers where it leaves from.
        this.glow.x = this.art.muzzle[0] - FEET_X;
        this.glow.y = this.art.muzzle[1] - FEET_Y;
      }
      const size = charge * (this.actBig ? 1.5 : 1) * (0.9 + 0.1 * Math.sin(now * 30));
      this.glow.setScale(size * INV_ART * 1.3);
      this.glow.setVisible(charge > 0.02);
    }

    // Turning round is a quick flip through flat, like a card.
    this.turn += (this.facing - this.turn) * Math.min(1, dt * 20);
    const root = this.root;
    root.x = this.x;
    root.y = this.y;
    root.scaleX = this.turn * this.scale;
    root.scaleY = this.scale;
    root.alpha = alpha;
    root.depth = this.y + this.lift;
  }

  destroy(): void {
    this.root.destroy();
  }
}
