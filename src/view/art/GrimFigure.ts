// A figure of the game's own style on the screen: its parts stacked and
// moved by the kit's rig (src/grim/rig.ts), with what the kit names for it:
// moves, each a windup and a strike, and stills. It walks in a cycle
// between the kit's stride and tread, turns by easing through flat rather
// than flipping, breathes at rest, flinches when struck and falls.
//
// The game says where it is and what it is doing; this only shows it.

import Phaser from 'phaser';
import { addPose, clearPose, makeXforms, restPose, solve, type Pose } from '../../grim/rig';
import { SHEET } from './Sheet';
import { GRIM_RASTER, grimFrame, type GrimManifest, type GrimUnit } from './grim';

const RAD = Math.PI / 180;
const INV = 1 / GRIM_RASTER;
/** Seconds from the end of a windup to the blow being fully out, and to being back at rest after it is held. */
const SNAP = 0.07;
const BACK = 0.26;
/** How far past its drawn pose a wind-up is pushed while it is held, and a strike before it settles. */
const WINDUP_OVER = 0.18;
const STRIKE_OVER = 0.22;

const easeOut = (t: number): number => 1 - (1 - t) * (1 - t) * (1 - t);

export class GrimFigure {
  readonly root: Phaser.GameObjects.Container;
  x = 0;
  y = 0;
  /** Which way it is to face: it turns to it over a moment. */
  facing: 1 | -1 = 1;
  moving = false;
  alpha = 1;
  /** How fast its legs go, as a share of a plain walk. */
  pace = 1;
  /** A tint laid on every part, or white for none. */
  tint = 0xffffff;
  /** True to lay the tint on as a flat color, not a shade: a figure struck goes white for a moment. */
  fill = false;

  private readonly sprites: Phaser.GameObjects.Image[] = [];
  private readonly xf;
  private readonly p: Pose = restPose();
  private readonly mirror: Pose;
  private turn = 1;
  private readonly phase: number;
  private walk = 0;
  private cycle = 0;
  private act: { windup: Pose; strike: Pose; at: number; lead: number; hold: number } | null = null;
  private still: Pose | null = null;
  private stillK = 0;
  private hitAt = -9;
  private deadAt = -1;
  private lastTint = 0xffffff;
  private lastFill = false;
  /** A figure as big as a boss: its recovery is slower and heavier, the opening it leaves plainer. */
  big = false;
  /** A way of standing put together from the rig's own keys, held under everything else: at ease, at rest, sat. */
  rest: Pose | null = null;
  /** How much its weight shifts at rest, foot to foot: none in a hunt, where it stands ready. */
  shift = 0;

  constructor(
    scene: Phaser.Scene,
    readonly id: string,
    private readonly art: GrimUnit,
    private readonly poses: GrimManifest['poses'],
    public scale = 0.6,
    seed = 0,
  ) {
    this.root = scene.add.container(0, 0);
    this.xf = makeXforms(art.parts.length);
    for (const part of art.parts) {
      const img = scene.add.image(0, 0, SHEET, grimFrame(id, part.name)).setScale(INV);
      this.sprites.push(img);
      this.root.add(img);
    }
    // The other half of a walk: the same stride with the legs changed over.
    const s = poses.stride;
    this.mirror = { ...s, legBackRot: s.legFrontRot, legFrontRot: s.legBackRot, legBackY: s.legFrontY, legFrontY: s.legBackY, weaponRot: -s.weaponRot, offRot: -s.offRot, extraRot: -s.extraRot };
    this.phase = ((((seed + 1) * 2654435761) >>> 0) / 4294967296) * 20;
  }

  /** True if the kit drew this move for it. */
  can(move: string): boolean {
    return !!this.art.moves[move];
  }

  /** Does one of its moves: drawn back over `lead` seconds, the blow, held for `hold`, and back to rest. */
  play(move: string, now: number, lead: number, hold = 0.22): void {
    const m = this.art.moves[move] ?? Object.values(this.art.moves)[0];
    if (!m || this.deadAt >= 0) return;
    this.act = { windup: m.windup, strike: m.strike, at: now, lead: Math.max(0.04, lead), hold };
  }

  /** Stops what it was doing: a blow that was broken off. */
  drop(): void {
    this.act = null;
  }

  /** Stands in one of its stills for as long as it is asked to: staggered, braced. Nothing, to stand as usual. */
  hold(still: string | null): void {
    const p = still ? this.art.stills[still] : null;
    if (p) this.still = p;
    else if (!still) this.stillOff = true;
    if (p) this.stillOff = false;
    if (p || !still) this.stillName = p ? still : null;
  }

  /** The still it stands in, by name: what a part drawn for one still is shown in. */
  private stillName: string | null = null;

  private stillOff = true;

  hit(now: number): void {
    if (this.deadAt < 0) this.hitAt = now;
  }

  die(now: number): void {
    if (this.deadAt < 0) this.deadAt = now;
    this.act = null;
    this.moving = false;
  }

  /** Its parts as they are drawn: an after-image is made of copies of them. */
  get parts(): readonly Phaser.GameObjects.Image[] {
    return this.sprites;
  }

  /** How tall it stands, for what floats over it. */
  get height(): number {
    return (this.art.feet[1] - this.art.top) * this.scale;
  }

  update(now: number, dt: number): void {
    const p = this.p;
    clearPose(p);
    let alpha = this.alpha;

    // At rest it is not still: it breathes, and what it holds moves with it.
    p.bodySy += 0.012 * Math.sin(now * 2 + this.phase);
    p.weaponRot += 1.1 * Math.sin(now * 1.7 + this.phase);
    p.headRot += 0.8 * Math.sin(now * 1.3 + this.phase * 2);
    p.extraRot += 2.5 * Math.sin(now * 1.9 + this.phase);
    if (this.rest) addPose(p, this.rest, 1);
    if (this.shift) {
      // Weight from one foot to the other, slowly, now and then.
      const k = Math.sin(now * 0.45 + this.phase) * this.shift;
      p.rootX += 2 * k;
      p.bodyRot += 2.5 * k;
      p.headRot -= 3 * k;
    }

    // The walk: one foot out, the feet passing, the other foot out, and round again.
    this.walk += ((this.moving && this.deadAt < 0 ? 1 : 0) - this.walk) * Math.min(1, dt * 9);
    if (this.walk > 0.02) {
      this.cycle += dt * 8.4 * this.pace;
      const w = Math.sin(this.cycle);
      addPose(p, this.poses.tread, (1 - Math.abs(w)) * this.walk);
      addPose(p, w >= 0 ? this.poses.stride : this.mirror, Math.abs(w) * this.walk);
    }

    this.stillK += ((this.stillOff ? 0 : 1) - this.stillK) * Math.min(1, dt * 10);
    if (this.still && this.stillK > 0.01) addPose(p, this.still, this.stillK);

    // A move in three beats that can be told apart at a glance: a wind-up that draws the whole figure back and
    // holds there, trembling, past where the kit drew it; a strike that snaps out beyond its pose and stretches the
    // body; and a recovery, slow for a big figure, in which it is plainly open. Timing and pose are pushed, not
    // rubber: it must still look heavy.
    // Held in a still (staggered, braced), a figure does not also swing or flinch on top of it: poses added on top of
    // each other pull its parts apart.
    const a = this.stillK > 0.3 ? null : this.act;
    if (a) {
      const t = now - a.at;
      const back = BACK * (this.big ? 2.2 : 1);
      if (t < a.lead) {
        const k = easeOut(t / a.lead);
        // The last third of a long wind-up is a hold: it goes a little further back, and shakes with the strain.
        const held = a.lead > 0.35 ? Math.max(0, (t / a.lead - 0.66) / 0.34) : 0;
        addPose(p, a.windup, k * (1 + WINDUP_OVER * held) + held * 0.04 * Math.sin(now * 70));
        p.bodySy -= 0.05 * k;
        p.bodySx += 0.04 * k;
      } else if (t < a.lead + SNAP) {
        const k = (t - a.lead) / SNAP;
        addPose(p, a.windup, (1 - k) * (1 + WINDUP_OVER));
        addPose(p, a.strike, k * (1 + STRIKE_OVER));
        p.bodySy += 0.06 * k;
        p.bodySx -= 0.04 * k;
      } else if (t < a.lead + SNAP + a.hold) {
        // It settles back from beyond the pose onto it.
        const k = (t - a.lead - SNAP) / Math.max(0.01, a.hold);
        addPose(p, a.strike, 1 + STRIKE_OVER * (1 - easeOut(Math.min(1, k * 2))));
        p.bodySy += 0.06 * (1 - easeOut(Math.min(1, k * 2)));
      } else if (t < a.lead + SNAP + a.hold + back) {
        const k = easeOut((t - a.lead - SNAP - a.hold) / back);
        addPose(p, a.strike, 1 - k);
        // Spent: it sags as it comes back, the opening a player is to see.
        p.bodyY += (this.big ? 6 : 2) * Math.sin(k * Math.PI);
        p.headRot += (this.big ? 8 : 3) * Math.sin(k * Math.PI);
      } else this.act = null;
    }

    // Struck: a hard flinch away, quick in and slower out, and a squash.
    const since = now - this.hitAt;
    if (since < 0.34 && this.stillK < 0.3) {
      const k = since < 0.06 ? since / 0.06 : 1 - (since - 0.06) / 0.28;
      addPose(p, this.poses.hit, k * 1.35);
      p.bodySy -= 0.05 * k;
      p.bodySx += 0.05 * k;
    }

    if (this.deadAt >= 0) {
      const t = now - this.deadAt;
      addPose(p, this.art.stills.fall ?? this.poses.fall, easeOut(Math.min(1, t / 0.55)));
      if (t > 1.6) alpha *= Math.max(0, 1 - (t - 1.6) / 0.6);
    }

    solve(this.art.parts, this.art.feet, p, this.xf);
    for (let i = 0; i < this.sprites.length; i++) {
      const s = this.sprites[i];
      const o = this.xf[i];
      s.x = o.x;
      s.y = o.y;
      s.rotation = o.rot * RAD;
      s.scaleX = o.sx * INV;
      s.scaleY = o.sy * INV;
      const part = this.art.parts[i];
      if (part.only) s.visible = part.only === this.stillName;
      else if (part.hide) s.visible = part.hide !== this.stillName;
    }
    if (this.tint !== this.lastTint || this.fill !== this.lastFill) {
      this.lastTint = this.tint;
      this.lastFill = this.fill;
      for (const s of this.sprites) s.setTint(this.tint).setTintMode(this.fill ? Phaser.TintModes.FILL : Phaser.TintModes.MULTIPLY);
    }

    // A turn is eased through flat, as a card is turned, over a fifth of a second: never from one frame to the next.
    this.turn += (this.facing - this.turn) * Math.min(1, dt * 11);
    const root = this.root;
    root.x = this.x;
    root.y = this.y;
    root.scaleX = (Math.abs(this.turn) < 0.08 ? 0.08 * Math.sign(this.turn || 1) : this.turn) * this.scale;
    root.scaleY = this.scale;
    root.alpha = alpha;
    root.depth = this.y;
  }

  destroy(): void {
    this.root.destroy();
  }
}
