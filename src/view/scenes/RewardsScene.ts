// The rewards: a calendar of seven days, a day claimed each day the player
// comes back, and the time played today with what it gives. It opens over
// the field. The rules are in game/rewards.ts and what each gives in
// data/rewards.ts.
//
// A thing the player has never held is shown as everything not yet reached
// is: its own shape in the dark, named "???". The calendar's two cards and
// the pack no shop sells are that until they are in hand.

import Phaser from 'phaser';
import { BONE, GOLD, HIGHLIGHT, HOLY, IRON, OUTLINE, VENOM, type Material } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { packById, packWord } from '../../data/packs';
import { DAILY, PLAYTIME, type Reward } from '../../data/rewards';
import { UNITS } from '../../data/units';
import { RARITIES } from '../../game/rarity';
import {
  addPlaytime, claimDaily, claimPlaytime, dailyNext, dailyReady, dailyRound, playedToday, playtimeState, rewardCoins, rewardGrade, rewardPack, type Given,
} from '../../game/rewards';
import { known, packShown } from '../../game/rules';
import { setupCamera } from '../app';
import { today } from '../clock';
import { H, W, hex } from '../config';
import { CARDS, SHEET } from '../Sheet';
import { commit, save } from '../session';
import { OverlayHead, veil } from '../ui/chrome';
import { RARITY_MAT } from '../ui/colors';
import { burst, cardFace, rays, type Adder } from '../ui/fanfare';
import { gradeBadge } from '../ui/grade';
import { Guide, type Rect } from '../ui/Guide';
import { portrait } from '../ui/UnitCard';
import { Button, label, slab } from '../ui/widgets';

/** The calendar's tiles, and the playtime track's. */
const DAY_W = 160;
const DAY_H = 222;
const DAY_GAP = 12;
const DAY_Y = 112;
const STEP_W = 200;
const STEP_H = 222;
const STEP_GAP = 24;
const STEP_Y = 438;

/** Seconds as minutes and seconds. */
function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export class RewardsScene extends Phaser.Scene {
  private head!: OverlayHead;
  private guide!: Guide;
  private things: Phaser.GameObjects.GameObject[] = [];
  private show: Phaser.GameObjects.GameObject[] = [];
  private bar!: Phaser.GameObjects.Graphics;
  private played!: Phaser.GameObjects.Text;
  /** Under each step still ahead, how long it wants. */
  private left: Phaser.GameObjects.Text[] = [];
  /** What the tiles were last drawn for: they are drawn again when it changes. */
  private drawn = '';
  private busy = false;
  /** Where today's CLAIM is, and the first of the playtime track's, for the tutorial. */
  private dayClaim: Rect | null = null;
  private stepClaim: Rect | null = null;
  /** Where DONE is while a card that was given is on show. */
  doneRect: Rect | null = null;

  constructor() {
    super('Rewards');
  }

  init(): void {
    this.things = [];
    this.show = [];
    this.left = [];
    this.drawn = '';
    this.busy = false;
    this.dayClaim = null;
    this.stepClaim = null;
    this.doneRect = null;
  }

  create(): void {
    setupCamera(this);
    const s = save();
    this.head = new OverlayHead(this, 'Rewards', s, () => commit());

    label(this, 44, 92, 'DAILY', { size: 24, align: 'left' });
    label(this, 136, 93, 'Claim one each day.', {
      size: 19, weight: 600, align: 'left', color: HIGHLIGHT, strokeWidth: 4,
    });
    label(this, 44, 366, 'TIME PLAYED TODAY', { size: 24, align: 'left' });
    this.played = label(this, 300, 366, '', { size: 24, align: 'left', color: HOLY.fill });
    label(this, 44, 686, 'Resets every day.', { size: 19, weight: 600, align: 'left', color: HIGHLIGHT, strokeWidth: 4 });
    this.bar = this.add.graphics().setDepth(5);

    this.guide = new Guide(this, 'Rewards');
    this.guide.mark('day', () => this.dayClaim ?? this.dayRect(dailyNext(save())));
    this.guide.mark('calendar', () => ({ x: 36, y: DAY_Y - 8, w: W - 72, h: DAY_H + 16 }));
    this.guide.mark('playtime', () => ({ x: 36, y: 386, w: W - 72, h: STEP_Y + STEP_H - 378 }));
    this.guide.mark('close', () => this.head.close.rect);

    this.draw();
    this.guide.refresh();
  }

  dayRect(i: number): Rect {
    const x0 = (W - (DAILY.length * DAY_W + (DAILY.length - 1) * DAY_GAP)) / 2;
    return { x: x0 + i * (DAY_W + DAY_GAP), y: DAY_Y, w: DAY_W, h: DAY_H };
  }

  stepRect(i: number): Rect {
    const x0 = (W - (PLAYTIME.length * STEP_W + (PLAYTIME.length - 1) * STEP_GAP)) / 2;
    return { x: x0 + i * (STEP_W + STEP_GAP), y: STEP_Y, w: STEP_W, h: STEP_H };
  }

  /** What the tiles show, as one line: when it changes they are drawn again. */
  private key(): string {
    const s = save();
    const day = today();
    return `${s.rewards.claimed}/${dailyReady(s, day)}/${PLAYTIME.map((_p, i) => playtimeState(s, i, day)[0]).join('')}`;
  }

  override update(): void {
    if (this.busy) return;
    if (this.key() !== this.drawn) {
      this.draw();
      this.guide.refresh();
    } else this.drawTime();
  }

  // ------------------------------------------------------------ what a reward looks like

  /**
   * The picture of a reward and the words under it, stood in a tile whose
   * middle is x. A card or a pack the player has never held is dark.
   */
  private picture(add: Adder, reward: Reward, round: number, x: number, y: number): void {
    const s = save();
    const dark = { color: OUTLINE, stroke: null as null };
    if (reward.kind === 'coins') {
      add(this.add.image(x, y, SHEET, 'icon/coin').setScale(0.8));
      add(label(this, x, y + 50, `+${rewardCoins(s, reward)}`, { size: 22, color: GOLD.fill, strokeWidth: 6 }));
      add(label(this, x, y + 76, 'coins', { size: 18, weight: 600, ...dark }));
      return;
    }
    if (reward.kind === 'packs') {
      const id = rewardPack(s, reward) as string;
      const pack = packById(id);
      const shown = packShown(s, pack);
      const art = add(this.add.image(x, y, CARDS, `pack/${id.split('@')[0]}`).setScale(0.27));
      if (!shown) art.setTint(hex(OUTLINE)).setTintMode(Phaser.TintModes.FILL).setAlpha(0.85);
      add(label(this, x, y + 50, reward.count > 1 ? `x${reward.count}` : 'PACK', { size: 22, color: HOLY.fill, strokeWidth: 6 }));
      // One word under it: the picture says which land's pack it is.
      add(label(this, x, y + 76, shown ? packWord(id) : '???', { size: 18, weight: 600, ...dark }));
      return;
    }
    const def = UNITS[reward.unit];
    const met = known(s, def);
    const plate = add(this.add.graphics());
    slab(plate, x - 46, y - 44, 92, 82, met ? RARITY_MAT[def.rarity] : IRON, 12, 5);
    plate.fillStyle(hex(met ? HIGHLIGHT : OUTLINE), 0.3).fillRoundedRect(x - 40, y - 38, 80, 66, 8);
    const pic = add(portrait(this, x, y + 30, def.id, 'blue', 62, !met));
    if (pic.displayWidth > 84) pic.setScale((pic.scaleX * 84) / pic.displayWidth);
    // What is not known tells nothing of itself, its grade among the rest.
    if (met) add(gradeBadge(this, x - 40, y - 36, rewardGrade(reward, round), 20));
    // Its name and no more: that no pack holds it is what the rewards are, and need not be said under each.
    add(label(this, x, y + 62, met ? def.name : '???', { size: 18, strokeWidth: 5, wrap: 150 }).setLineSpacing(-4));
  }

  // ------------------------------------------------------------ the two tracks

  private draw(): void {
    for (const o of this.things) o.destroy();
    this.things = [];
    this.dayClaim = null;
    this.stepClaim = null;
    this.drawn = this.key();
    const add: Adder = (o) => {
      this.things.push(o);
      return o;
    };
    const s = save();
    const day = today();
    const next = dailyNext(s);
    const ready = dailyReady(s, day);
    const round = dailyRound(s);

    DAILY.forEach((reward, i) => {
      const r = this.dayRect(i);
      const cx = r.x + r.w / 2;
      // Claimed this time round, the one to claim, or still to come.
      const done = i < next;
      const now = i === next;
      const mat: Material = done ? IRON : now && ready ? GOLD : BONE;
      const g = add(this.add.graphics());
      slab(g, r.x, r.y, r.w, r.h, mat, 16, 7);
      g.fillStyle(hex(HIGHLIGHT), done ? 0.12 : 0.5).fillRoundedRect(r.x + 8, r.y + 34, r.w - 16, r.h - 86, 10);
      add(label(this, cx, r.y + 18, `DAY ${i + 1}`, { size: 19, strokeWidth: 5 }));
      const before = this.things.length;
      this.picture(add, reward, round, cx, r.y + 82);
      if (done) {
        for (const o of this.things.slice(before)) (o as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(0.45);
        add(this.add.image(cx, r.y + r.h - 26, SHEET, 'icon/check').setScale(0.4));
      } else if (now && ready) {
        const b = new Button(this, cx, r.y + r.h - 28, 'CLAIM', () => this.claimDay(), { width: r.w - 24, height: 44, size: 20, mat: VENOM });
        add(b.root);
        this.dayClaim = b.rect;
        // The one to press is ringed.
        const ring = add(this.add.graphics().setDepth(40));
        ring.lineStyle(5, hex(HIGHLIGHT), 1).strokeRoundedRect(r.x - 5, r.y - 5, r.w + 10, r.h + 10, 19);
      } else {
        add(label(this, cx, r.y + r.h - 27, now ? 'TOMORROW' : '', { size: 18, color: OUTLINE, stroke: null }));
      }
    });

    PLAYTIME.forEach((step, i) => {
      const r = this.stepRect(i);
      const cx = r.x + r.w / 2;
      const state = playtimeState(s, i, day);
      const mat: Material = state === 'taken' ? IRON : state === 'ready' ? GOLD : BONE;
      const g = add(this.add.graphics());
      slab(g, r.x, r.y, r.w, r.h, mat, 16, 7);
      g.fillStyle(hex(HIGHLIGHT), state === 'taken' ? 0.12 : 0.5).fillRoundedRect(r.x + 8, r.y + 34, r.w - 16, r.h - 86, 10);
      add(label(this, cx, r.y + 18, `${step.minutes} MINUTES`, { size: 19, strokeWidth: 5 }));
      const before = this.things.length;
      this.picture(add, step.reward, 0, cx, r.y + 82);
      if (state === 'taken') {
        for (const o of this.things.slice(before)) (o as unknown as Phaser.GameObjects.Components.Alpha).setAlpha(0.45);
        add(this.add.image(cx, r.y + r.h - 26, SHEET, 'icon/check').setScale(0.4));
      } else if (state === 'ready') {
        const b = new Button(this, cx, r.y + r.h - 28, 'CLAIM', () => this.claimStep(i), { width: r.w - 24, height: 44, size: 20, mat: VENOM });
        add(b.root);
        if (!this.stepClaim) this.stepClaim = b.rect;
      }
    });
    this.drawTime();
  }

  /** The time played, the bar that fills from one step to the next, and how long each step still wants. */
  private drawTime(): void {
    const s = save();
    const day = today();
    const seconds = playedToday(s, day);
    this.played.setText(clock(seconds));
    const g = this.bar;
    g.clear();
    const first = this.stepRect(0);
    const last = this.stepRect(PLAYTIME.length - 1);
    const y = 402;
    const x0 = first.x;
    const x1 = last.x + last.w / 2;
    g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(x0 - 4, y - 4, x1 - x0 + 8, 24, 11);
    g.fillStyle(hex(IRON.fill), 1).fillRoundedRect(x0, y, x1 - x0, 16, 7);
    // The steps stand evenly, so the bar fills from each to the next by its own share of the minutes between.
    let reach = x0;
    let from = 0;
    let fromX = x0;
    for (let i = 0; i < PLAYTIME.length; i++) {
      const to = PLAYTIME[i].minutes * 60;
      const r = this.stepRect(i);
      const toX = r.x + r.w / 2;
      if (seconds >= to) reach = toX;
      else {
        reach = fromX + ((toX - fromX) * Math.max(0, seconds - from)) / (to - from);
        break;
      }
      from = to;
      fromX = toX;
    }
    if (reach > x0 + 6) g.fillStyle(hex(HOLY.fill), 1).fillRoundedRect(x0, y, reach - x0, 16, 7);
    // A peg over each step, lit once the time has come to it.
    for (let i = 0; i < PLAYTIME.length; i++) {
      const r = this.stepRect(i);
      const cx = r.x + r.w / 2;
      const lit = seconds >= PLAYTIME[i].minutes * 60;
      g.fillStyle(hex(OUTLINE), 1).fillCircle(cx, y + 8, 15);
      g.fillStyle(hex(lit ? HOLY.fill : IRON.shade), 1).fillCircle(cx, y + 8, 11);
    }
    // Under each step that is still ahead, how long it wants.
    for (const t of this.left) t.destroy();
    this.left = [];
    for (let i = 0; i < PLAYTIME.length; i++) {
      if (playtimeState(s, i, day) !== 'ahead') continue;
      const r = this.stepRect(i);
      this.left.push(label(this, r.x + r.w / 2, r.y + r.h - 27, `in ${clock(PLAYTIME[i].minutes * 60 - seconds)}`, { size: 19, color: OUTLINE, stroke: null }).setDepth(6));
    }
  }

  /** Counts time as played. For the walks (scripts/rewards.mjs), which cannot sit through ten minutes. */
  addPlayed(seconds: number): void {
    addPlaytime(save(), seconds, today());
  }

  // ------------------------------------------------------------ claiming

  private claimDay(): void {
    if (this.busy) return;
    const given = claimDaily(save(), today());
    if (given) this.handOver(given, this.dayRect((dailyNext(save()) + DAILY.length - 1) % DAILY.length));
  }

  private claimStep(i: number): void {
    if (this.busy) return;
    const given = claimPlaytime(save(), i, today());
    if (given) this.handOver(given, this.stepRect(i));
  }

  /** Shows what a claim gave: a card is turned up in the middle of the screen, anything else rises out of its tile. */
  private handOver(given: Given, from: Rect): void {
    commit();
    this.head.coins.refresh();
    if (given.card) {
      this.reveal(given);
      return;
    }
    const x = from.x + from.w / 2;
    const y = from.y + from.h / 2;
    const said = given.coins > 0 ? `+${given.coins} coins` : `${given.count > 1 ? `${given.count} packs` : 'A pack'}: open in PACKS`;
    sfx.play('claim');
    if (given.coins > 0) this.time.delayedCall(160, () => sfx.play('coin'));
    const t = label(this, x, y, said, { size: 24, color: given.coins > 0 ? GOLD.fill : HOLY.fill, strokeWidth: 7 }).setDepth(9000);
    // It stays on the screen, whichever tile it rose from.
    t.setX(Math.max(t.width / 2 + 16, Math.min(W - t.width / 2 - 16, x)));
    this.tweens.add({ targets: t, y: y - 90, alpha: { from: 1, to: 0 }, duration: 1500, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
    const ring = this.add.image(x, y, SHEET, 'fx/ring').setTint(hex(HOLY.fill)).setDepth(8999).setScale(0.3);
    this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    this.draw();
    this.guide.refresh();
  }

  /** A card given: it is turned up as a card out of a pack is, with its grade stamped on it. */
  private reveal(given: Given): void {
    const card = given.card;
    if (!card) return;
    this.busy = true;
    const add: Adder = (o) => {
      this.show.push(o);
      return o;
    };
    const def = UNITS[card.unit];
    const rank = Math.max(0, RARITIES.indexOf(card.rarity));
    const color = hex(RARITY_MAT[card.rarity].fill);
    const cx = W / 2;
    const cy = H / 2 - 40;
    add(veil(this, 9000, 0.9));
    sfx.play('packOpen');
    music.duck(1.6);
    this.time.delayedCall(140, () => sfx.reveal(rank));
    burst(this, add, cx, cy, rank, color);
    rays(this, add, cx, cy, color, 430);
    const w = 264;
    const h = 330;
    const face = add(cardFace(this, card.unit, card.rarity, w, h).setPosition(cx, cy + 70).setDepth(9030));
    face.setScale(0.05, 0.5).setAlpha(0);
    this.tweens.add({ targets: face, scaleX: 1, scaleY: 1, y: cy, alpha: 1, duration: 340, delay: 120, ease: 'Back.easeOut' });
    const badge = add(gradeBadge(this, cx - w / 2 + 44, cy - h / 2 + 40, card.grade, 40).setDepth(9032).setAlpha(0));
    const rest = badge.scaleX;
    badge.setScale(rest * 2.5);
    this.tweens.add({ targets: badge, alpha: 1, scale: rest, duration: 240, delay: 520, ease: 'Back.easeOut', onStart: () => sfx.play('place') });
    const fresh = card.outcome === 'new';
    const headline = add(label(this, cx, cy - h / 2 - 38, fresh ? 'NEW!' : 'ANOTHER ONE', { size: 40, color: fresh ? HOLY.fill : VENOM.light, strokeWidth: 8 }).setDepth(9031).setAlpha(0).setScale(0.6));
    this.tweens.add({ targets: headline, alpha: 1, scale: 1, duration: 260, delay: 380, ease: 'Back.easeOut' });
    const sub = card.joined
      ? `${def.name} joins your team.`
      : fresh
        ? `${def.name} joins you. Field it in UNITS.`
        : `You hold ${card.held} of this unit now. Field it, or COMBINE it in UNITS.`;
    const line = add(label(this, cx, cy + h / 2 + 36, sub, { size: 20, weight: 600 }).setDepth(9031).setAlpha(0));
    this.tweens.add({ targets: line, alpha: 1, duration: 260, delay: 480 });
    this.time.delayedCall(700, () => {
      const done = new Button(this, cx, H - 56, 'DONE', () => {
        for (const o of this.show) o.destroy();
        this.show = [];
        this.doneRect = null;
        this.busy = false;
        this.draw();
        this.guide.refresh();
      }, { width: 220, height: 62, size: 28 }).setDepth(9061);
      add(done.root);
      this.doneRect = done.rect;
    });
  }
}
