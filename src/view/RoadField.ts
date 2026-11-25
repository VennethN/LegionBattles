// What a road and a relic put on the field, shown plainly: the pay wagon
// and the cage as pictures with a bar of what is left of them, the shrine
// with its ring filling, a ring under each champion, the dark of a night
// march, and the slain who have got up for the hero. It shows what the wave
// (game/world.ts) says is there and works nothing out for itself.
//
// It is a thing of its own beside the field's scene so that the scene is
// changed in few places: the scene makes one, tells it each event, and has
// it look at the wave once a frame.

import Phaser from 'phaser';
import { FIRE, FROST, HOLY, OUTLINE, STEEL, VENOM, WOOD } from '../art/kit/palette';
import { baked } from './ui/bake';
import { sfx } from '../audio/sfx';
import { COMPANIONS, TRAIT_NAMES, byId, type ChampionTrait } from '../game/data';
import type { Ev, Foe, World } from '../game/world';
import { ART_SCALE, hex } from './config';
import type { Effects } from './Effects';
import { THING_ICONS } from './icons';
import { SHEET, Sheet } from './art/Sheet';
import { STILL_SCALE } from './art/scale';

const INV_ART = 1 / ART_SCALE;
/** How far out a ring's picture and a disc's reach at their own size, in the field's units: what they are scaled by to be as wide as a thing is. */
const RING_R = 120;
const DISC_R = 60;
const GOLD = hex(HOLY.fill);
const RED = 0xd9443a;
/** How big each thing's picture is shown: its own width is about three times how big it is to what touches it. */
const THING_SCALE = { wagon: 0.8, cage: 0.56, shrine: 0.7 } as const;
/** The color of the ring under each kind of champion. */
const TRAIT_TINT: Record<ChampionTrait, number> = { quick: hex(HOLY.light), armored: hex(STEEL.fill), burning: hex(FIRE.fill) };

interface Thing {
  img: Phaser.GameObjects.Image;
  back: Phaser.GameObjects.Image;
  bar: Phaser.GameObjects.Image;
  flash: number;
}

/** What the field's scene hands over: how to say something across the screen, and how big a foe's picture is shown. */
export interface RoadFieldOpts {
  banner: (text: string, under: string) => void;
  foeScale: number;
}

export class RoadField {
  private readonly things = new Map<number, Thing>();
  private readonly rings = new Map<number, Phaser.GameObjects.Image>();
  private readonly risen = new Map<number, Phaser.GameObjects.Image>();
  private shrine: { img: Phaser.GameObjects.Image; ring: Phaser.GameObjects.Image; fill: Phaser.GameObjects.Image } | null = null;
  /** Bram's gates, a row of stakes each, and the lanes of a burning field, a band of color. */
  private readonly walls = new Map<number, Phaser.GameObjects.Image[]>();
  private readonly lanes = new Map<number, Phaser.GameObjects.Image>();

  /** The plain dark of a night march, for when the light of the field is off. */
  private veil: Phaser.GameObjects.Image | null = null;

  /** Whether the plain dark is laid over a night march: only where the field's light is not being made, which is darker and better. */
  plainNight(on: boolean): void {
    this.veil?.setVisible(on);
  }

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: World,
    private readonly fx: Effects,
    private readonly o: RoadFieldOpts,
  ) {
    const w = world;
    // The dark of a night march, laid over the whole field. Where the light of the field is made by shaders, that takes its place: it reads `world.night`.
    if (w.night) this.veil = scene.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(w.w, w.h).setTint(0x0b1030).setAlpha(0.34).setDepth(8000);
    const sh = w.shrine;
    if (sh) {
      const ring = scene.add.image(sh.x, sh.y, SHEET, 'fx/ring').setTint(GOLD).setScale(sh.r / RING_R, (sh.r / RING_R) * 0.62).setAlpha(0.8).setDepth(2);
      const fill = scene.add.image(sh.x, sh.y, SHEET, 'fx/disc').setTint(GOLD).setAlpha(0.3).setDepth(1).setScale(0.01);
      const img = scene.add.image(sh.x, sh.y - 4, SHEET, THING_ICONS.shrine).setOrigin(0.5, 0.94).setScale(THING_SCALE.shrine * INV_ART).setDepth(sh.y - 4);
      this.shrine = { img, ring, fill };
    }
  }

  /** Something happened in the wave. True if it was something of the road's or a relic's. */
  react(e: Ev): boolean {
    const w = this.world;
    switch (e.t) {
      case 'hit': {
        const t = this.things.get(e.id);
        if (t) t.flash = 0.09;
        return false;
      }
      case 'fall': {
        const t = this.things.get(e.id);
        if (t) {
          this.fx.spawn('fx/dust', e.x, e.y - 20, { dur: 0.35, from: 0.6, to: 1.8, alpha: 0.8, depth: e.y + 2 });
          for (const img of [t.img, t.back, t.bar]) img.destroy();
          this.things.delete(e.id);
        }
        this.rings.get(e.id)?.destroy();
        this.rings.delete(e.id);
        return false;
      }
      case 'champion': {
        const f = w.foes.find((x) => x.id === e.id);
        if (f) this.rings.set(f.id, this.scene.add.image(f.x, f.y, SHEET, 'fx/ring').setTint(TRAIT_TINT[e.trait]).setDepth(2));
        this.o.banner('A CHAMPION', TRAIT_NAMES[e.trait]);
        sfx.play('spawn', 0.8, 0.8);
        return true;
      }
      case 'wagon':
        if (e.how === 'on') this.o.banner('PAY WAGON', 'Destroy it before it escapes');
        else if (e.how === 'broken') sfx.play('claim', 0.8);
        else this.o.banner('', 'The wagon escaped');
        return true;
      case 'bless':
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          this.fx.spawn('fx/sparkle', e.x + Math.cos(a) * 40, e.y - 30 + Math.sin(a) * 24, { dur: 0.7, from: 0.5, to: 1.3, tint: GOLD, vy: -70, delay: i * 0.03, depth: e.y + 80 });
        }
        this.o.banner('BLESSED', 'Free upgrade at the next camp');
        sfx.play('levelUp', 0.8);
        return true;
      case 'free':
        this.fx.spawn('fx/ring', e.x, e.y - 10, { dur: 0.45, from: 0.3, to: 2.4, tint: GOLD, alpha: 0.9, flat: 0.5, depth: e.y + 3 });
        this.o.banner(`${byId(COMPANIONS, e.who).name.toUpperCase()} IS FREE`, 'Joins you for this run');
        sfx.play('claim', 0.8);
        return true;
      case 'relic':
        this.fx.spawn('fx/sparkle', e.x, e.y - 44, { dur: 0.4, from: 0.4, to: 1, tint: GOLD, vy: -40, depth: e.y + 60 });
        return true;
      case 'risen':
        this.fx.spawn('fx/dust', e.x, e.y - 6, { dur: 0.3, from: 0.4, to: 1, alpha: 0.7, flat: 0.5, depth: e.y - 1 });
        return true;
      case 'herald':
        this.o.banner('CHAMPION DEFEATED', 'It dropped a relic');
        sfx.play('claim', 0.8);
        return true;
      case 'duel':
        if (e.how === 'on') this.o.banner('THE DUEL', 'One champion. No other enemies.');
        else this.o.banner('DUEL WON', 'It dropped a relic');
        return true;
      case 'block':
        this.fx.spawn('fx/sparkle', e.x, e.y, { dur: 0.25, from: 0.4, to: 1, tint: e.back ? GOLD : hex(STEEL.fill), depth: e.y + 60 });
        sfx.play('tick', 0.4, 0.7);
        return true;
      default:
        return false;
    }
  }

  /** Shows the wave as it stands now. */
  sync(clock: number, dt: number): void {
    const w = this.world;
    // The wagon and the cage.
    for (const f of w.foes) {
      if (!f.def.prop) continue;
      let t = this.things.get(f.id);
      if (!t) t = this.stand(f);
      const kind = f.def.prop as 'wagon' | 'cage';
      const s = THING_SCALE[kind] * INV_ART;
      // A wagon rocks as it rolls.
      const rock = f.moving ? Math.sin(clock * 9) * 0.02 : 0;
      t.img.setPosition(f.x, f.y).setScale(s * (f.face < 0 && kind === 'wagon' ? -1 : 1), s).setRotation(rock).setDepth(f.y);
      if (t.flash > 0) {
        t.flash -= dt;
        t.img.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      } else t.img.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
      const up = kind === 'wagon' ? 98 : 74;
      t.back.setPosition(f.x, f.y - up).setDisplaySize(54, 8).setDepth(f.y + 1);
      t.bar.setPosition(f.x - 25, f.y - up).setDisplaySize(50 * Math.max(0, f.hp / f.maxHp), 4).setDepth(f.y + 2);
    }
    // A ring under each champion, which follows it.
    for (const [id, ring] of this.rings) {
      const f = w.foes.find((x) => x.id === id);
      if (!f) {
        ring.destroy();
        this.rings.delete(id);
        continue;
      }
      const r = (f.def.r * 2.2) / RING_R;
      const beat = 1 + Math.sin(clock * 6) * 0.06;
      ring.setPosition(f.x, f.y).setScale(r * beat, r * beat * 0.62);
    }
    // The shrine's ring fills as the hero stands in it.
    const sh = w.shrine;
    if (sh && this.shrine) {
      const share = sh.got / sh.need;
      const r = (sh.r / DISC_R) * Math.max(0.02, share);
      this.shrine.fill.setScale(r, r * 0.62).setAlpha(sh.done ? 0.12 : 0.34);
      this.shrine.ring.setAlpha(sh.done ? 0.25 : 0.55 + Math.sin(clock * 4) * 0.25);
    }
    // Bram's gates: a palisade of sharpened stakes across the way he faced, standing upright as everything on the
    // field does, each stake sorted by its own foot. It sinks back into the ground as its time runs out. It was a
    // thin bar of color, and nobody could tell there was a gate.
    const stake = baked(this.scene, 'stake', 18, 62, (ctx) => {
      ctx.beginPath();
      ctx.moveTo(3, 14);
      ctx.lineTo(9, 2);
      ctx.lineTo(15, 14);
      ctx.lineTo(15, 60);
      ctx.lineTo(3, 60);
      ctx.closePath();
      ctx.fillStyle = WOOD.fill;
      ctx.fill();
      ctx.fillStyle = WOOD.shade;
      ctx.fillRect(10, 14, 5, 46);
      ctx.fillStyle = '#c9a24a';
      ctx.fillRect(3, 30, 12, 4);
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke();
    });
    for (const g of w.walls) {
      let row = this.walls.get(g.id);
      // Along the wall: across the way he faced. Laid out on the ground, which is seen from above and so shorter up and down.
      const ax = -g.ny;
      const ay = g.nx * 0.62;
      const n = Math.max(3, Math.round((g.half * 2) / 16));
      if (!row) {
        row = [];
        for (let i = 0; i < n; i++) row.push(this.scene.add.image(0, 0, stake).setOrigin(0.5, 1).setDisplaySize(18, 62));
        this.walls.set(g.id, row);
      }
      const rise = Math.min(1, g.life * 3);
      row.forEach((img, i) => {
        const t = (i / (n - 1) - 0.5) * 2 * g.half;
        const px = g.x + ax * t;
        const py = g.y + ay * t + (i % 2) * 3;
        img.setPosition(px, py).setDisplaySize(18, 62 * rise * (0.9 + 0.1 * (i % 3))).setDepth(py).setAlpha(Math.min(1, 0.4 + g.life));
      });
    }
    for (const [id, row] of this.walls) {
      if (w.walls.some((g) => g.id === id)) continue;
      for (const img of row) img.destroy();
      this.walls.delete(id);
    }
    // The lanes of a burning field: red and beating while they are only shown, the color of fire once they burn.
    for (const p of w.perils) {
      let img = this.lanes.get(p.id);
      if (!img) {
        img = this.scene.add.image(p.x, p.y, SHEET, 'fx/solid').setDepth(3);
        this.lanes.set(p.id, img);
      }
      const lit = p.left <= 0;
      img.setPosition(p.x, p.y).setDisplaySize(p.w, p.h).setTint(lit ? hex(FIRE.fill) : RED).setAlpha(lit ? 0.6 : 0.2 + 0.14 * Math.sin(clock * 16) ** 2);
    }
    for (const [id, img] of this.lanes) {
      if (w.perils.some((p) => p.id === id)) continue;
      img.destroy();
      this.lanes.delete(id);
    }
    // The slain who are on their feet for the hero: their own figures, pale and green.
    const seen = new Set<number>();
    for (const r of w.risen) {
      seen.add(r.id);
      let img = this.risen.get(r.id);
      if (!img) {
        img = this.scene.add.image(r.x, r.y, SHEET, Sheet.stillFrame('red', r.unit, 'a')).setTint(hex(VENOM.light));
        this.risen.set(r.id, img);
      }
      const stride = r.moving && Math.floor((clock + r.id * 0.37) * 6) % 2 === 1;
      const s = (this.o.foeScale * r.size) / STILL_SCALE;
      // It fades as its time runs out.
      img.setFrame(Sheet.stillFrame('red', r.unit, stride ? 'b' : 'a')).setPosition(r.x, r.y).setScale(s).setFlipX(r.face < 0).setDepth(r.y).setAlpha(Math.min(0.8, 0.25 + r.life * 0.4));
    }
    for (const [id, img] of this.risen) {
      if (seen.has(id)) continue;
      img.destroy();
      this.risen.delete(id);
    }
  }

  private stand(f: Foe): Thing {
    const kind = f.def.prop as 'wagon' | 'cage';
    const img = this.scene.add.image(f.x, f.y, SHEET, THING_ICONS[kind]).setOrigin(0.5, 0.94);
    const back = this.scene.add.image(f.x, f.y, SHEET, 'fx/solid').setTint(hex(OUTLINE));
    const bar = this.scene.add.image(f.x, f.y, SHEET, 'fx/solid').setTint(kind === 'wagon' ? RED : hex(FROST.fill)).setOrigin(0, 0.5);
    const t = { img, back, bar, flash: 0 };
    this.things.set(f.id, t);
    return t;
  }
}
