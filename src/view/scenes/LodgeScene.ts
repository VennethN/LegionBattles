// The lodge, between hunts: the board of contracts, the muster, and the
// ledger of what coin buys. It shows what the rules say (game/lodge.ts) and
// asks them to change it; it works out no price and no permission itself.
//
// One screen in three leaves. Changing leaf, or anything on one, stands the
// screen up again: nothing here moves, so that is cheap and keeps it simple.

import Phaser from 'phaser';
import { BONE, GOLD, HOLY, IRON, LEATHER, OUTLINE, RUBY, type Material } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { ABILITIES, BUILDINGS, HUNTERS, MONSTERS, REINFORCEMENTS, byId, type Mark } from '../../game/content';
import {
  buy, changeBuilding, chargesOf, contracts, costOf, isOpen, lessonFor, newsOf, openingOf, opensBy, rewardOf, setHunter, supplyOf, toggleReinforcement, wares, wear, type Contract,
  board as postedBoard, partyFor, posterOf, posting, quarryOf, repost, togglePartner, type Posting, growthOf, setWeek, wearTrinket, placesOf, statsOf,
} from '../../game/lodge';
import { TRINKETS, weekOf } from '../../game/growth';
import { ASSETS, getManifest, setupCamera } from '../app';
import { GrimFigure } from '../art/GrimFigure';
import { getGrim, wantedUnit } from '../art/grim';
import { hex, view } from '../config';
import { ALLY_ART, BUILDING_ART, HUNTER_ART, MONSTER_ART, STAND_IN, dressAt, isGrim, type Art } from '../pictures';
import { CARDS, SHEET, portraitFrame, sheet } from '../art/Sheet';
import { commit, save, takeContract, takePosting, theContract } from '../session';
import { slabImage } from '../ui/bake';
import { Button, label } from '../ui/widgets';
import { uiIcon, uiKey } from '../ui/grim';
import { TRINKET_ICONS, wareIcon } from '../icons';
import { LairScene } from './LairScene';
import { Talk } from '../../game/talk';
import { Tavern } from '../Tavern';

type Leaf = 'board' | 'muster' | 'ledger';

const DARK: Material = { fill: '#3a2a1e', shade: '#2a1c12' };
/** The wall the bills are pinned to, and the bar the hunters stand in: dark timber. */
const WOOD_DARK: Material = { fill: '#3b2a1c', shade: '#2a1d13' };
const tall = (): boolean => view.tall;
const INK = OUTLINE;

export class LodgeScene extends Phaser.Scene {
  private leaf: Leaf = 'board';
  /** What the line under the muster says: what was last pressed, or why it would not go. */
  private note = '';
  /** Which hunter the TEAM screen is showing, or nothing for the inn they wait in. */
  private look: string | null = null;
  private tavern: Tavern | null = null;

  constructor() {
    super('Lodge');
  }

  create(data: { leaf?: Leaf; note?: string; look?: string | null } = {}): void {
    setupCamera(this);
    this.cameras.main.setBackgroundColor('#1c140e');
    this.leaf = data.leaf ?? 'board';
    this.note = data.note ?? '';
    this.look = data.look ?? null;
    this.tavern = null;
    this.boss = null;
    this.events.once('shutdown', () => this.tavern?.destroy());
    LairScene.applySound();
    music.play('lodge');
    const s = save();
    const w = view.w;

    // Along the top: the game's name, the three leaves, the coin and the sound.
    const lw = view.tall ? 116 : 132;
    this.add.image(10 + lw / 2, 34, 'logo').setDisplaySize(lw, (lw * 214) / 444);
    // The leaves there are yet: the team once there is something to choose, the shop once the opening hunts are done.
    const step = openingOf(s);
    const leaves: Array<[Leaf, string]> = [['board', 'BOSSES']];
    if (!step || !step.lesson) leaves.push(['muster', 'TEAM']);
    if (!step) leaves.push(['ledger', 'SHOP']);
    if (!leaves.some((l) => l[0] === this.leaf)) this.leaf = 'board';
    const tw = view.tall ? 104 : 118;
    // Who is hunting, in a chip by the game's name, on every leaf: pressed, it opens their page.
    const chipW = 100;
    const teamOpen = leaves.some((l) => l[0] === 'muster');
    this.chosenChip(view.tall ? 6 + chipW / 2 : 10 + lw + 8 + chipW / 2, view.tall ? 82 : 34, chipW, view.tall ? 36 : 46, teamOpen);
    const tx = view.tall ? w / 2 + 34 : Math.max(w / 2, 10 + lw + 8 + chipW + 8 + (leaves.length * (tw + 6) - 6) / 2);
    leaves.forEach(([leaf, name], i) => {
      new Button(this, tx + (i - (leaves.length - 1) / 2) * (tw + 6), 34, name, () => this.go(leaf), { width: tw, height: 46, size: 17, mat: leaf === this.leaf ? GOLD : IRON });
    });
    const coinY = view.tall ? 82 : 34;
    const coinX = view.tall ? w - 70 : w - 130;
    this.add.image(coinX - 34, coinY, uiKey('icon-coin')).setDisplaySize(30, 30);
    label(this, coinX, coinY - 1, String(s.coin), { size: 20, color: HOLY.fill });
    if (!view.tall) {
      const mute = this.add.container(w - 36, 34);
      mute.add([slabImage(this, -22, -22, 44, 44, BONE, 12, 5), this.add.image(0, -2, uiKey(s.sound ? 'icon-sound' : 'icon-mute')).setDisplaySize(30, 30)]);
      mute.setSize(44, 44).setInteractive({ useHandCursor: true }).on('pointerup', () => {
        s.sound = !s.sound;
        s.music = s.sound;
        commit();
        this.go(this.leaf);
      });
    }

    const top = view.tall ? 104 : 70;
    if (this.leaf === 'board') this.board(top);
    else if (this.leaf === 'muster') this.muster(top);
    else this.ledger(top);
  }

  /** The hunter going, in the top bar: their likeness and name. */
  private chosenChip(x: number, y: number, cw: number, ch: number, press: boolean): void {
    const s = save();
    const me = byId(HUNTERS, s.muster.hunter);
    const art = HUNTER_ART[me.id];
    const c = this.add.container(x, y);
    c.add(slabImage(this, -cw / 2, -ch / 2, cw, ch, DARK, 8, 3));
    // Their whole figure, as tall as the chip: a weapon held high is part of how they are known.
    const face = this.add.image(-cw / 2 + 20, 0, CARDS, isGrim(art) ? portraitFrame('grim', art.grim) : portraitFrame(art.team, art.legion));
    face.setScale((ch - 4) / face.height);
    c.add(face);
    const name = label(this, -cw / 2 + 38, -1, me.short.toUpperCase(), { size: 15, align: 'left', face: 'display', color: HOLY.fill });
    name.setScale(Math.min(1, (cw - 44) / name.width));
    c.add(name);
    if (press) {
      c.setSize(cw, ch).setInteractive({ useHandCursor: true }).on('pointerup', () => {
        sfx.play('click');
        this.go('muster', '', me.id);
      });
    }
  }

  private go(leaf: Leaf, note = '', look: string | null = null): void {
    this.scene.restart({ leaf, note, look });
  }

  override update(time: number, delta: number): void {
    this.tavern?.update(Math.min(0.05, delta / 1000));
    this.boss?.update(time / 1000, Math.min(0.05, delta / 1000));
  }

  /** A card: a slab with a press on it. */
  private card(x: number, y: number, cw: number, ch: number, mat: Material, press: (() => void) | null): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    c.add(slabImage(this, -cw / 2, -ch / 2, cw, ch, mat, 12, 6));
    if (press) {
      c.setSize(cw, ch).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => {
        sfx.play('click');
        press();
      });
    }
    return c;
  }

  /**
   * A figure on a card, standing on the card's floor. One not yet unlocked is its black shape. A stand-in for what
   * the style has not drawn yet is a dark shape too, a little paler, and no more.
   */
  private figure(c: Phaser.GameObjects.Container, art: Art, floor: number, high: number, open: boolean, rank = 0): void {
    const img = this.add.image(0, floor, CARDS, isGrim(art) ? portraitFrame('grim', art.grim) : portraitFrame(art.team, art.legion));
    img.setScale(Math.min(high / img.height, 1.2));
    if (!open) img.setTint(hex(OUTLINE)).setTintMode(Phaser.TintModes.FILL).setAlpha(0.85);
    else if (!isGrim(art)) img.setTint(STAND_IN).setTintMode(Phaser.TintModes.FILL);
    c.add(img);
    // A hunter who has risen is shown in what they have earned: the card's picture is drawn at the first rank, so the
    // figure itself takes its place once it is on the sheet.
    if (open && rank > 1 && isGrim(art)) {
      void sheet(this.game, getManifest()).ensureWanted(this.scene.get(ASSETS), [wantedUnit(art.grim)]).then(() => {
        if (!img.active) return;
        const g = getGrim();
        const u = g.units[art.grim];
        const fig = new GrimFigure(this, art.grim, u, g.poses, Math.min(high / (u.feet[1] - u.top), 1.2), 4);
        fig.x = 0;
        fig.y = floor;
        fig.rank = rank;
        fig.shift = 1;
        c.add(fig.root);
        img.destroy();
        const tick = (_t: number, dt: number): void => {
          if (!fig.root.active) {
            this.events.off('update', tick);
            return;
          }
          fig.update(this.time.now / 1000, dt / 1000);
        };
        this.events.on('update', tick);
      });
    }
  }

  // ------------------------------------------------------------ the board

  /**
   * The board: a wall of timber with the contracts posted on it as wanted bills, each pinned a little askew, with
   * the boss's likeness, its name, what is known of it in a line, its danger and its reward. One not yet posted is a
   * dark bill with the boss's black shape, "???" and what must fall first: nothing else of it is told. The bill
   * picked is lifted off the wall, straight and lit; under the wall, what it asks and pays, and the way out.
   * The wall lays out three to five bills of any length of words: each shrinks its words to its own width.
   */
  private board(top: number): void {
    if (posting(save())) {
      this.posters(top);
      return;
    }
    const s = save();
    const w = view.w;
    const all = contracts(s);
    // The wall holds only what can be hunted: a boss still to come is a dark shape in a line under it, not a dead bill.
    const list = all.filter((c) => c.posted);
    const later = all.filter((c) => !c.posted);
    const chosen = theContract();
    const tall = view.tall;
    // The wall: planks across the whole width, behind every bill.
    const wallH = tall ? Math.min(view.h * 0.5, 420) : Math.min(view.h * 0.5, 250);
    this.add.existing(slabImage(this, 6, top - 4, w - 12, wallH, WOOD_DARK, 4, 6));
    const cols = tall ? Math.min(2, list.length) : Math.min(5, list.length);
    const rows = Math.ceil(list.length / cols);
    const gap = 10;
    const bw = Math.min(170, (w - 30) / cols - gap, tall ? 999 : 170);
    const bh = Math.min(bw * 1.32, (wallH - 40) / rows - gap);
    const x0 = w / 2 - ((cols - 1) * (bw + gap)) / 2;
    list.forEach((c, i) => {
      const x = x0 + (i % cols) * (bw + gap);
      const y = top + 6 + bh / 2 + Math.floor(i / cols) * (bh + gap);
      const picked = c.posted && c.id === chosen.monster;
      // Pinned askew, each its own way; the one picked hangs straight and stands out.
      const tilt = picked ? 0 : ((i * 37) % 7) - 3;
      const card = this.add.container(x, y + (picked ? -4 : 0)).setAngle(tilt);
      const bill = this.add.image(0, 0, 'bill').setDisplaySize(bw, bh);
      if (!c.posted) bill.setTint(0x4a4038);
      else bill.setTint(picked ? 0xffffff : 0xcfc4ae);
      card.add(bill);
      // A nail at the top: what holds it to the wall.
      card.add(this.add.circle(0, -bh / 2 + 7, 3, 0x2a221a).setStrokeStyle(1, 0x8a7a60));
      if (c.monster) this.figure(card, MONSTER_ART[c.id], bh * 0.14, bh * 0.46, c.posted);
      if (c.posted && c.monster) {
        // The name on a dark strip of its own across the bill, clear of everything printed on it.
        card.add(slabImage(this, -bw / 2 + 6, bh * 0.22 - 13, bw - 12, 26, DARK, 2, 3));
        const name = label(this, 0, bh * 0.22, c.monster.name.replace(/^The /, '').toUpperCase(), { size: 17, color: BONE.fill, face: 'display' });
        name.setScale(Math.min(1, (bw - 24) / name.width));
        card.add(name);
        // Danger, in red marks of blood: one for each mark of difficulty it will be hunted at.
        const mark = picked ? Math.min(chosen.mark, c.upTo) : Math.min(c.upTo, Math.max(1, c.felled + 1));
        for (let k = 0; k < 3; k++) {
          const d = this.add.rectangle(-bw * 0.24 + (k - 1) * 14, bh * 0.3, 8, 8, k < mark ? 0x8a1e16 : 0x6b5a48, k < mark ? 1 : 0.35).setAngle(45);
          card.add(d);
        }
        const { coin } = rewardOf(s, c.id, mark as Mark);
        // Above the bill's torn foot and left of its seal, where nothing printed covers it.
        const pay = label(this, -bw * 0.22, bh * 0.37, `${coin} COIN`, { size: 15, color: '#3a2410', stroke: null, face: 'display' });
        pay.setScale(Math.min(1, (bw * 0.42) / pay.width));
        // Who may go: a party of more than the hunter is said on the bill (the contract's own number, when contracts have one).
        const party = (c as Contract & { party?: number }).party ?? 1;
        if (party > 1) card.add(label(this, -bw * 0.08, bh * 0.44, `PARTY: ${party}`, { size: 15, color: INK, stroke: null, face: 'display' }));
        card.add(pay);
      } else {
        card.add(label(this, -bw * 0.08, bh * 0.22, '???', { size: 20, color: BONE.shade, face: 'display' }));
        const need = label(this, -bw * 0.06, bh * 0.36, c.needs, { size: 15, color: BONE.shade, wrap: bw * 0.72 });
        need.setScale(Math.min(1, (bh * 0.2) / need.height));
        card.add(need);
      }
      if (c.posted) {
        card.setSize(bw, bh).setInteractive({ useHandCursor: true });
        card.on('pointerup', () => {
          sfx.play('click');
          this.pick(c, Math.min(c.upTo, Math.max(1, c.felled + 1)) as Mark);
        });
        card.on('pointerover', () => !picked && this.tweens.add({ targets: card, y: y - 3, angle: tilt / 2, duration: 120 }));
        card.on('pointerout', () => !picked && this.tweens.add({ targets: card, y, angle: tilt, duration: 120 }));
      }
      if (picked) {
        // Lifted off the wall: a shadow under it and a little larger.
        const shade = this.add.rectangle(x + 5, y + 2, bw, bh, 0x000000, 0.45);
        shade.setDepth(-1);
        card.setScale(1.06);
      }
    });

    // Bosses still to come: their dark shapes in a line at the foot of the wall, ??? and what must fall first.
    if (later.length) {
      const ly = top + wallH - 22;
      const first = later[0].needs.replace(/^Beat The /, 'Beat the ');
      const t = label(this, w - 20, ly, `MORE TO HUNT: ${later.map(() => '???').join('  ')}   ${first}`, { size: 15, align: 'right', color: BONE.shade });
      t.setScale(Math.min(1, (w - 40) / t.width));
    }

    // The contract picked: what is known of it, the difficulty, what it pays, and the way out to it.
    const py = top + wallH + 6;
    const ph = view.h - py - 8;
    const c = list.find((x) => x.id === chosen.monster && x.posted) ?? list[0];
    const m = c.monster ?? MONSTERS[0];
    const pw = Math.min(w - 12, 900);
    this.add.existing(slabImage(this, w / 2 - pw / 2, py, pw, ph, LEATHER, 4, 6));
    const left = w / 2 - pw / 2 + 20;
    const mark = Math.min(chosen.mark, Math.max(1, c.upTo)) as Mark;
    const head = label(this, left, py + 24, m.name.toUpperCase(), { size: 24, align: 'left', face: 'display' });
    const textW = tall ? pw - 40 : pw - 290;
    label(this, left, py + 48, c.felled > 0 || s.hunts > 0 ? m.known : m.rumor, { size: 15, align: 'left', wrap: textW, color: BONE.fill }).setOrigin(0, 0);
    void head;
    // The difficulty: one, two, three. One not yet reached cannot be pressed.
    const mx = tall ? left : w / 2 + pw / 2 - 250;
    const my = tall ? py + 132 : py + 30;
    label(this, mx, my, 'DIFFICULTY', { size: 15, align: 'left', color: BONE.shade, face: 'display' });
    for (let k = 1; k <= 3; k++) {
      const b = new Button(this, mx + 128 + (k - 1) * 46, my, String(k), () => this.pick(c, k as Mark), { width: 44, height: 44, size: 19, mat: k === mark ? GOLD : IRON });
      b.setEnabled(k <= c.upTo);
    }
    const { coin: pay, first } = rewardOf(s, c.id, mark);
    const lesson = !!lessonFor(s, c.id, mark);
    const lineY = tall ? py + 172 : py + 66;
    const lineX = mx;
    label(this, lineX, lineY, `Reward: ${pay} coin${first ? ', doubled for the first win' : ''}`, { size: 15, align: 'left', color: HOLY.fill, wrap: tall ? pw - 40 : 240 }).setOrigin(0, 0.5);
    if (lesson) label(this, lineX, lineY + 26, 'First win: a trophy and new unlocks.', { size: 15, align: 'left', color: BONE.shade });
    const by = py + ph - 36;
    // What is new at this hunt, in one line over the way out.
    const news = newsOf(s);
    if (news) label(this, w / 2, by - 44, news, { size: 15, color: HOLY.fill, wrap: pw - 40 });
    const team = !openingOf(s)?.lesson;
    if (team) new Button(this, w / 2 - 110, by, 'TEAM', () => this.go('muster'), { width: 200, height: 56, size: 22, mat: IRON });
    new Button(this, team ? w / 2 + 110 : w / 2, by, 'HUNT', () => this.hunt(), { width: 200, height: 56, size: 26, mat: RUBY });
  }

  /**
   * The board once contracts are posted at random, in two halves. On one side the postings, each a strip of paper
   * nailed to the wall: the boss's small likeness, its name, its danger in marks of blood, the party it takes and the
   * reward; the one picked pulled forward and lit, and NEW POSTINGS at the foot. On the other the one picked in full,
   * a dossier: the boss large and lit, in the pose it strikes from; where, who posted it and why; what is unlike it
   * this time and the tasks; the party's places; everything it pays; and what is known of the boss (src/game/lodge.ts,
   * quarryOf). A phone held upright has the postings above and the dossier under them; the dossier scrolls when it
   * is longer than its room.
   */
  private posters(top: number): void {
    const s = save();
    // The week by the player's own clock: a new one posts its hard contract.
    setWeek(s, weekOf(Date.now()));
    const w = view.w;
    const tall = view.tall;
    const list = postedBoard(s);
    // A bill is always picked: the first, until another is.
    if (list.length && !list.some((p) => p.id === theContract().posting?.id)) takePosting(list[0].id);
    const chosen = theContract();
    const picked = list.find((p) => p.id === chosen.posting?.id) ?? null;
    const by = view.h - 36;
    const n = Math.max(3, list.length);
    // Where each half goes.
    const lx = 6;
    const ly = top - 4;
    const lw = tall ? w - 12 : Math.max(250, Math.min(340, w * 0.32));
    const rowH = tall ? 66 : Math.min(84, (view.h - ly - 8 - 72) / n - 8);
    const lh = tall ? list.length * (rowH + 8) + 70 : view.h - ly - 8;
    const dx = tall ? 6 : lx + lw + 8;
    const dy = tall ? ly + lh + 6 : ly;
    const dw = tall ? w - 12 : w - dx - 6;
    const dh = by - 36 - dy;
    this.add.existing(slabImage(this, lx, ly, lw, lh, WOOD_DARK, 4, 6));

    // The postings, one under another.
    list.forEach((p, i) => {
      const poster = posterOf(s, p);
      const on = p.id === picked?.id;
      const rw = lw - 20 - (on ? 0 : 10);
      const x = lx + 10 + (on ? 0 : 4) + rw / 2;
      const y = ly + 12 + rowH / 2 + i * (rowH + 8);
      if (on) this.add.image(x, y, SHEET, 'fx/glow').setDisplaySize(rw * 1.3, rowH * 2).setTint(0xffb85a).setAlpha(0.35);
      const row = this.add.container(x, y);
      if (on) this.add.rectangle(x + 5, y + 4, rw, rowH, 0x000000, 0.45);
      // Every bill is paper that can be read; the one picked stands forward, lit, and the rest sit back a little dimmer.
      row.add(slabImage(this, -rw / 2, -rowH / 2, rw, rowH, BONE, 3, 3));
      if (!on) row.setAlpha(0.72);
      // The one picked has a gold edge, so it is found at once.
      else row.add(this.add.rectangle(0, 0, rw + 4, rowH + 4).setStrokeStyle(3, 0xd8a24a));
      // Nails at its corners.
      for (const sx of [-1, 1]) row.add(this.add.circle(sx * (rw / 2 - 7), -rowH / 2 + 7, 2.5, 0x2a221a).setStrokeStyle(1, 0x8a7a60));
      const face = this.add.image(-rw / 2 + 34, rowH / 2 - 6, CARDS, isGrim(MONSTER_ART[p.monster]) ? portraitFrame('grim', (MONSTER_ART[p.monster] as { grim: string }).grim) : portraitFrame('grim', 'sexton')).setOrigin(0.5, 1);
      face.setScale(Math.min((rowH - 10) / face.height, 56 / face.width));
      row.add(face);
      // Under a strip across the bill's top (the week's contract, a chain's step), the name moves down clear of it.
      const name = label(this, -rw / 2 + 68, -rowH / 2 + (poster.banner ? 31 : 18), byId(MONSTERS, p.monster).name.replace(/^The /, '').toUpperCase(), { size: 17, align: 'left', color: INK, stroke: null, face: 'display' });
      // Never smaller than the smallest words the game allows.
      name.setScale(Math.max(15 / 17, Math.min(1, (rw - 150) / name.width)));
      row.add(name);
      // The week's contract and a chain's step say so on a strip across the top of the bill.
      if (poster.banner) {
        // Clear of the coin and its icon at the bill's right.
        const tag = label(this, rw / 2 - 92, -rowH / 2 + 1, poster.banner, { size: 15, align: 'right', color: '#f0d8a8', face: 'display' });
        row.add([this.add.rectangle(rw / 2 - 92 - tag.displayWidth / 2, -rowH / 2 + 1, tag.displayWidth + 12, 20, 0x7a1e16), tag]);
      }
      for (let k = 0; k < Math.max(3, poster.danger); k++) row.add(this.add.rectangle(-rw / 2 + 74 + k * 13, rowH / 2 - 18, 7, 7, k < poster.danger ? 0x8a1e16 : 0x6b5a48, k < poster.danger ? 1 : 0.35).setAngle(45));
      // The party, and the first way it is unlike itself if there is room for it at a size that can be read.
      const room = rw - 84 - Math.max(3, poster.danger) * 13 - 12;
      const party = poster.party > 1 ? `PARTY ${poster.party}` : 'ALONE';
      const subT = label(this, -rw / 2 + 74 + Math.max(3, poster.danger) * 13 + 6, rowH / 2 - 18, party, { size: 15, align: 'left', color: '#5a3a20', stroke: null, face: 'display' });
      if (poster.variants.length) {
        subT.setText(`${party}  ${poster.variants[0].name.toUpperCase()}`);
        if (subT.width > room) subT.setText(party);
      }
      row.add(subT);
      row.add(this.add.image(rw / 2 - 58, -rowH / 2 + 18, uiKey('icon-coin')).setDisplaySize(20, 20));
      row.add(label(this, rw / 2 - 12, -rowH / 2 + 18, String(poster.coin), { size: 17, align: 'right', color: '#3a2410', stroke: null, face: 'display' }));
      row.setSize(rw, rowH).setInteractive({ useHandCursor: true });
      row.on('pointerup', () => {
        sfx.play('click');
        takePosting(p.id);
        this.go('board');
      });
    });
    new Button(this, lx + lw / 2, ly + lh - 32, 'NEW POSTINGS', () => {
      const why = repost(s);
      commit();
      this.go('board', why);
    }, { width: Math.min(220, lw - 30), height: 48, size: 16, mat: IRON });

    // The dossier of the one picked.
    this.add.existing(slabImage(this, dx, dy, dw, dh, LEATHER, 4, 6));
    if (picked) this.dossier(picked, dx, dy, dw, dh);
    else label(this, dx + dw / 2, dy + 40, 'Pick a contract.', { size: 16, color: BONE.shade });
    if (this.note) label(this, dx + dw / 2, by - 44, this.note, { size: 15, color: HOLY.fill, wrap: dw - 40 }).setDepth(5);
    const bw = Math.min(200, (dw - 30) / 2);
    new Button(this, dx + dw / 2 - bw / 2 - 8, by, 'TEAM', () => this.go('muster'), { width: bw, height: 54, size: 22, mat: IRON });
    const hunt = new Button(this, dx + dw / 2 + bw / 2 + 8, by, 'HUNT', () => this.hunt(), { width: bw, height: 54, size: 26, mat: RUBY });
    hunt.setEnabled(!!picked);
  }

  /** The boss of the dossier, standing in the pose it strikes from: updated each frame while the board is up. */
  private boss: GrimFigure | null = null;

  /**
   * The dossier: laid out away from the rest of the screen and looked at through a camera of its own over its room,
   * so that it can be scrolled when it is longer than the room is.
   */
  private dossier(p: Posting, x: number, y: number, w: number, h: number): void {
    const s = save();
    const poster = posterOf(s, p);
    const m = byId(MONSTERS, p.monster);
    const q = quarryOf(s, p.monster);
    // Far off to the side, where the screen's own camera never looks.
    const OX = 20000;
    const OY = 0;
    const pad = 16;
    const two = w >= 600;
    const aw = two ? Math.min(290, w * 0.4) : w - pad * 2;
    const bx = two ? pad + aw + 18 : pad;
    const bw = two ? w - bx - pad : w - pad * 2;
    const at = (lx: number, ly: number): [number, number] => [OX + lx, OY + ly];
    const text = (lx: number, ly: number, t: string, o: Parameters<typeof label>[4], wrap: number): number => {
      const [tx, ty] = at(lx, ly);
      const l = label(this, tx, ty, t, { size: 15, align: 'left', wrap, ...o }).setOrigin(0, 0);
      return l.height;
    };
    const head = (lx: number, ly: number, t: string): number => text(lx, ly, t, { size: 17, face: 'display', color: HOLY.fill }, 400) + 6;

    // The boss, large and lit: a warm and a red light behind it, and its name and lair under it.
    const figH = two ? Math.min(230, h * 0.48) : 210;
    const [fx, fy] = at(pad + aw / 2, pad + figH);
    this.add.image(fx, fy - figH * 0.45, SHEET, 'fx/glow').setDisplaySize(aw * 1.3, figH * 1.3).setTint(0x8a2a1a).setAlpha(0.7).setBlendMode(Phaser.BlendModes.ADD);
    this.add.image(fx - aw * 0.15, fy - figH * 0.6, SHEET, 'fx/glow').setDisplaySize(aw * 0.8, figH * 0.8).setTint(0xffb060).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
    this.add.ellipse(fx, fy - 4, aw * 0.7, 26, 0x000000, 0.5);
    const art = MONSTER_ART[p.monster];
    if (isGrim(art)) {
      void sheet(this.game, getManifest()).ensureWanted(this.scene.get(ASSETS), [wantedUnit(art.grim)]).then(() => {
        if (!this.scene.isActive() || this.leaf !== 'board') return;
        const g = getGrim();
        const u = g.units[art.grim];
        const fig = new GrimFigure(this, art.grim, u, g.poses, figH / (u.feet[1] - u.top), 3);
        fig.x = fx;
        fig.y = fy;
        fig.facing = -1;
        // Drawn back to strike: the first of its blows, held at its wind-up.
        const first = Object.values(u.moves)[0];
        if (first) fig.rest = first.windup;
        this.boss = fig;
      });
    } else {
      const img = this.add.image(fx, fy, CARDS, portraitFrame(art.team, art.legion)).setOrigin(0.5, 1);
      img.setScale(figH / img.height).setTint(STAND_IN).setTintMode(Phaser.TintModes.FILL);
    }
    let ya = pad + figH + 10;
    if (poster.banner) ya += text(pad, ya, poster.banner, { face: 'display', color: RUBY.fill }, aw) + 2;
    ya += text(pad, ya, m.name.toUpperCase(), { size: 24, face: 'display' }, aw) + 2;
    ya += text(pad, ya, poster.where, { color: BONE.shade }, aw) + 8;
    // Its danger, in marks of blood.
    text(pad, ya, 'DANGER', { face: 'display', color: BONE.shade }, aw);
    for (let k = 0; k < 6; k++) {
      const [mx, my] = at(pad + 84 + k * 16, ya + 10);
      this.add.rectangle(mx, my, 9, 9, k < poster.danger ? 0x8a1e16 : 0x4a3a2c, 1).setAngle(45);
    }
    ya += 30;
    // The party's places: the player, the partners taken, and a hired hand in each left.
    ya += head(pad, ya, poster.party > 1 ? `PARTY OF ${poster.party}` : 'ALONE');
    const { partners } = partyFor(s, poster.party);
    const names = [`${byId(HUNTERS, s.muster.hunter).short} (you)`, ...partners.slice(0, poster.party - 1).map((id) => byId(HUNTERS, id).short)];
    const slotW = Math.min(66, (aw - 6 * (names.length - 1)) / Math.max(1, names.length));
    names.forEach((nm, i) => {
      const [sx, sy] = at(pad + i * (slotW + 6), ya);
      this.add.existing(slabImage(this, sx, sy, slotW, 40, i === 0 ? GOLD : IRON, 3, 3));
      const t = label(this, sx + slotW / 2, sy + 20, nm.replace(' (you)', ''), { size: 15, face: 'display' });
      t.setScale(Math.min(1, (slotW - 6) / t.width));
    });
    ya += 52;
    // Everything it pays.
    ya += head(pad, ya, 'REWARD');
    const pays = [
      `${poster.coin} coin${poster.first ? ', twice over for the first win' : ''}`,
      ...(poster.thing ? [`and ${poster.thing}`] : []),
      ...(poster.tasks.length ? [`+ ${poster.bonus} coin for the tasks`] : []),
      ...(poster.hiredCut ? [`Hired hands take ${poster.hiredCut}`] : []),
      ...(poster.prize ? [`+ ${poster.prize} coin for the end of the story`] : []),
      ...(p.weekly ? ['and a trinket, for certain'] : []),
    ];
    ya += text(pad, ya, pays.join('\n'), { color: HOLY.fill }, aw) + 10;

    // Who posted it and why, what is unlike it this time, and the tasks.
    let yb = two ? pad : ya + 6;
    yb += head(bx, yb, `POSTED BY ${poster.by.toUpperCase()}`);
    yb += text(bx, yb, `"${poster.why}"`, { color: BONE.fill }, bw) + 6;
    const hobb = new Talk(p.id * 131 + 7, 'keeper', p.monster).pick('keeper', 'taken');
    if (hobb) yb += text(bx, yb, `Hobb: "${hobb}"`, { color: BONE.shade }, bw) + 6;
    yb += 6;
    yb += head(bx, yb, 'THIS TIME');
    if (!poster.variants.length && !poster.tasks.length) yb += text(bx, yb, 'Nothing out of the way. Just the boss.', { color: BONE.shade }, bw) + 6;
    for (const v of poster.variants) {
      const [mx, my] = at(bx + 6, yb + 10);
      this.add.rectangle(mx, my, 9, 9, 0x8a1e16).setAngle(45);
      yb += text(bx + 20, yb, `${v.name}: ${v.says}`, {}, bw - 20) + 4;
    }
    for (const t of poster.tasks) {
      const [mx, my] = at(bx + 6, yb + 10);
      this.add.rectangle(mx, my, 11, 11).setStrokeStyle(2, 0xd8c8a0);
      yb += text(bx + 20, yb, `${t.name}: ${t.says} (+${t.bonus} coin)`, {}, bw - 20) + 4;
    }
    yb += 10;
    // What is known of the boss: each attack and how it is told, its weak place, its phases.
    yb += head(bx, yb, 'KNOW YOUR QUARRY');
    for (const a of q.attacks) yb += text(bx, yb, a ? `${a.name}: ${a.how}` : '???', { color: a ? BONE.fill : BONE.shade }, bw) + 4;
    yb += 4;
    yb += text(bx, yb, `Weak place: ${q.weak ?? '???'}`, { color: q.weak ? HOLY.fill : BONE.shade }, bw) + 6;
    for (const ph of q.phases) yb += text(bx, yb, ph, { color: ph.includes('???') ? BONE.shade : BONE.fill }, bw) + 2;

    // A camera of its own over the dossier's room, scrolled by a drag or the wheel when it is longer than that.
    const z = view.zoom;
    const cam = this.cameras.add(x * z, y * z, w * z, h * z);
    cam.setZoom(z);
    const most = Math.max(0, Math.max(ya, yb) + pad - h);
    let scroll = 0;
    // While there is more below, the foot of the page darkens and says so: nothing is cut off without a word.
    const cue = this.add.container(OX + w / 2, 0).setDepth(50).setVisible(most > 0);
    cue.add([
      this.add.rectangle(0, -26, w, 30, 0x0d0b09, 0.86),
      this.add.rectangle(0, -6, w, 14, 0x0d0b09, 0.85),
      label(this, 0, -14, 'MORE BELOW: DRAG OR SCROLL', { size: 15, face: 'display', color: HOLY.fill }),
    ]);
    const place = (): void => {
      scroll = Math.max(0, Math.min(most, scroll));
      cam.centerOn(OX + w / 2, OY + h / 2 + scroll);
      cue.setY(OY + h + scroll).setVisible(scroll < most - 4);
    };
    place();
    this.events.once('shutdown', () => this.cameras.remove(cam));
    if (most > 0) {
      // A small bar on its edge says there is more.
      const bar = this.add.graphics();
      const draw = (): void => {
        bar.clear().fillStyle(0xd8c8a0, 0.5).fillRect(x + w - 6, y + 4 + (h - 8) * (scroll / (most + h)), 3, (h - 8) * (h / (most + h)));
      };
      draw();
      let from: number | null = null;
      const inside = (p: Phaser.Input.Pointer): boolean => {
        const px = p.x / z;
        const py = p.y / z;
        return px >= x && px <= x + w && py >= y && py <= y + h;
      };
      this.input.on('pointerdown', (pt: Phaser.Input.Pointer) => {
        if (inside(pt)) from = pt.y / z + scroll;
      });
      this.input.on('pointermove', (pt: Phaser.Input.Pointer) => {
        if (from === null || !pt.isDown) return;
        scroll = from - pt.y / z;
        place();
        draw();
      });
      this.input.on('pointerup', () => (from = null));
      this.input.on('wheel', (pt: Phaser.Input.Pointer, _o: unknown, _dx: number, wdy: number) => {
        if (!inside(pt)) return;
        scroll += wdy * 0.5;
        place();
        draw();
      });
    }
  }

  private pick(c: Contract, mark: Mark): void {
    takeContract(c.id, Math.max(1, Math.min(mark, c.upTo)) as Mark);
    this.go('board');
  }

  private hunt(): void {
    const c = theContract();
    // A posted contract is kept as it was taken; before the board is posted, the one the board holds out.
    if (c.posting === undefined) takeContract(c.monster, c.mark);
    this.leave();
  }

  /** Out to the lair. What the lodge had to say once about what is new has now been said. */
  private leave(): void {
    const s = save();
    if (!openingOf(s) && !s.told.includes('open')) {
      s.told.push('open');
      commit();
    }
    this.scene.start('Lair');
  }

  // ------------------------------------------------------------ the muster

  /** The party's slots, in a line: the player, the partners chosen, and a hired hand in each slot left. */
  private partyLine(party: number): string {
    const s = save();
    // The partners are named, hands for hire among them by what they are.
    const { partners } = partyFor(s, party);
    const names = [`${byId(HUNTERS, s.muster.hunter).short} (you)`, ...partners.map((id) => byId(HUNTERS, id).short)];
    return `PARTY ${party}: ${names.join(', ')}`;
  }

  /**
   * The TEAM screen's first view: the inn the hunters wait in, each at their own place (src/view/Tavern.ts). A press
   * on a hunter opens what they do and the hunt's loadout; the notice board by the door goes to the contracts.
   */
  private inn(top: number): void {
    const s = save();
    const w = view.w;
    const party = theContract().posting ? posterOf(s, theContract().posting as Posting).party : 1;
    const foot = view.h - (tall() ? 150 : 72);
    // Wider than the screen, and dragged sideways: ten people need the room.
    const rw = tall() ? Math.max(w - 12, 820) : Math.max(w - 12, 1360);
    this.tavern = new Tavern(this, 6, top - 4, rw, foot - top + 4, s, (id) => {
      const d = byId(HUNTERS, id);
      if (!d.hired && !isOpen(s, id)) {
        sfx.play('deny', 0.6);
        this.go('muster', opensBy(id) || 'Locked');
        return;
      }
      this.go('muster', '', id);
    }, () => this.go('board'));
    // Under the room: who is going, what was last said, and the way out.
    const by = view.h - 42;
    const hunter = byId(HUNTERS, s.muster.hunter);
    const lx = tall() ? w / 2 : 20;
    if (party > 1) label(this, lx, tall() ? foot + 22 : by - 12, this.partyLine(party), { size: 15, face: 'display', color: BONE.fill, align: tall() ? 'center' : 'left' });
    label(this, lx, tall() ? foot + 50 : party > 1 ? by + 12 : by, this.note || 'Drag to look round the room. Press a hunter to choose them and what to bring.', { size: 15, color: HOLY.fill, align: tall() ? 'center' : 'left', wrap: tall() ? w - 40 : w - 300 });
    new Button(this, tall() ? w / 2 : w - 6 - 118, by, `HUNT AS ${hunter.short.toUpperCase()}`, () => this.leave(), { width: 236, height: 58, size: 22, mat: RUBY });
  }

  /**
   * A hunter's page, opened from the inn: one layout in four parts. At the left the hunter, large and lit, with the one
   * button that chooses them (and, on a contract for more, the one that takes them along). At the right a ledger page
   * of what they are: STATS, SKILLS and GROWTH. Along the bottom what is brought, with the supply. BACK is at the top
   * left and HUNT AS at the bottom right, and nothing else sounds like either.
   */
  private muster(top: number): void {
    if (!this.look) {
      this.inn(top);
      return;
    }
    const s = save();
    const w = view.w;
    const h = view.h;
    const m = s.muster;
    const hunter = byId(HUNTERS, this.look);
    const party = theContract().posting ? posterOf(s, theContract().posting as Posting).party : 1;
    const step = openingOf(s);
    const short = !tall() && h < 450;

    // The bottom row: the supply at the left, what was last said, and HUNT AS at the right.
    const bh = short ? 48 : 54;
    const by = h - bh / 2 - (tall() ? 14 : 6);
    // The things to bring, in a strip over it: one row in a wide window, two in a tall one.
    const things = this.bringable();
    const cols = tall() ? 4 : Math.max(1, things.length);
    const rows = Math.ceil(things.length / cols);
    const ch = tall() ? 90 : short ? 82 : 104;
    const stripBottom = by - bh / 2 - (tall() ? 34 : 8);
    const stripTop = stripBottom - rows * (ch + 6) + 6;
    this.bringStrip(things, stripTop, ch, cols);

    // Above it, the hunter and their ledger: side by side in a wide window, one over the other in a tall one.
    const y0 = top - 4;
    const y1 = stripTop - 8;
    if (tall()) {
      // The hunter takes what the ledger does not need, so that the figure is large.
      const hh = Math.max(party > 1 ? 196 : 176, Math.min(340, y1 - y0 - 290));
      this.hunterPanel(hunter, party, 6, y0, w - 12, hh, true);
      this.ledgerPage(hunter, 6, y0 + hh + 6, w - 12, y1 - y0 - hh - 6, false);
    } else {
      const lw = Math.min(300, Math.round(w * 0.33));
      this.hunterPanel(hunter, party, 6, y0, lw, y1 - y0, short || y1 - y0 < 250);
      this.ledgerPage(hunter, 6 + lw + 8, y0, w - 20 - lw, y1 - y0, true);
    }

    // The supply, large, at the left of the bottom row. In the opening hunts it is not yet spoken of.
    if (!step) {
      const used = costOf(m);
      const all = supplyOf(s);
      this.add.image(28, by, uiKey('icon-sack')).setDisplaySize(36, 36);
      label(this, 52, by - 1, `SUPPLY ${used} / ${all}`, { size: short ? 22 : 24, align: 'left', face: 'display', color: used > all ? RUBY.fill : BONE.fill });
    }
    const hw = tall() ? 196 : 236;
    const said = this.note || newsOf(s);
    if (tall()) label(this, w / 2, stripBottom + 17, said, { size: 15, color: HOLY.fill, wrap: w - 30 });
    else label(this, (w - hw - 6 + (step ? 12 : 236)) / 2, by, said, { size: 15, color: HOLY.fill, wrap: Math.max(120, w - hw - 6 - (step ? 12 : 236) - 20) });
    const me = byId(HUNTERS, m.hunter);
    new Button(this, w - 6 - hw / 2, by, `HUNT AS ${me.short.toUpperCase()}`, () => this.leave(), { width: hw, height: bh, size: tall() ? 20 : 22, mat: RUBY });
  }

  /** The hunter, large and lit, the way back, and the buttons that choose them. `side` puts the buttons beside the figure. */
  private hunterPanel(hunter: (typeof HUNTERS)[number], party: number, x: number, y: number, pw: number, ph: number, side: boolean): void {
    const s = save();
    const m = s.muster;
    const chosen = m.hunter === hunter.id;
    this.add.existing(slabImage(this, x, y, pw, ph, WOOD_DARK, 4, 5));
    // BACK at the top left, to the inn; the name beside it.
    new Button(this, x + 8 + 48, y + 26, 'BACK', () => this.go('muster'), { width: 96, height: 42, size: 17, mat: IRON });
    const nx = x + 112;
    const name = label(this, nx, y + 16, hunter.name.toUpperCase(), { size: 19, align: 'left', face: 'display', color: HOLY.fill });
    name.setScale(Math.min(1, (pw - 120) / name.width));
    const epithet = label(this, nx, y + 38, hunter.epithet.toUpperCase(), { size: 15, align: 'left', face: 'display', color: BONE.shade });
    epithet.setScale(Math.min(1, (pw - 120) / epithet.width));

    // The buttons: CHOOSE (or CHOSEN, greyed), and on a contract for more, the partner's place.
    const places = party > 1 ? placesOf(s, party) : null;
    const partnerable = !!places && !hunter.hired && !chosen && isOpen(s, hunter.id);
    const going = m.partners.includes(hunter.id);
    const rowsH = 50 + (partnerable ? 48 : 0) + (places ? 24 : 0);
    const fy = y + 54;
    const fh = side ? ph - 54 - 8 : ph - 54 - rowsH - 8;
    const fw = side ? Math.min(tall() ? 160 : 110, fh * 0.85) : Math.min(pw - 24, fh * 0.9, 170);
    const bw = side ? Math.min(220, pw - fw - 36) : pw - 24;
    const fx = side ? x + 12 + fw / 2 : x + pw / 2;
    // The hunter: lit from behind, on a card of their own.
    this.add.image(fx, fy + fh / 2, SHEET, 'fx/glow').setDisplaySize(fw * 2, fh * 1.5).setTint(0xffb85a).setAlpha(0.5);
    const card = this.card(fx, fy + fh / 2, fw, fh, BONE, null);
    // Kept inside the card: a torch or a pole held high does not reach the name.
    this.figure(card, HUNTER_ART[hunter.id], fh / 2 - 10, tall() ? fh - 60 : fh - 34, true, hunter.hired ? 0 : dressAt(growthOf(s, hunter.id).rank));
    if (chosen) {
      // A stamp across the card's corner: this is who is hunting.
      const stamp = this.add.container(fx, fy + fh - 22).setAngle(-8);
      stamp.add([this.add.rectangle(0, 0, 78, 26, 0xe8d6b0, 0.85).setStrokeStyle(3, 0x8a2418), label(this, 0, -1, 'CHOSEN', { size: 15, face: 'display', color: '#8a2418', stroke: null })]);
    }
    const bx = side ? x + 12 + fw + 12 + bw / 2 : x + pw / 2;
    let byy = side ? fy + 24 : y + ph - rowsH - 4 + 25;
    if (side && fh > rowsH) byy += (fh - rowsH) / 2;
    if (hunter.hired) {
      label(this, bx, byy + 10, 'A hand for hire: comes by themselves when a contract is short of hunters.', { size: 15, color: BONE.fill, wrap: bw });
      return;
    }
    const choose = new Button(this, bx, byy, chosen ? 'CHOSEN' : `CHOOSE ${hunter.short.toUpperCase()}`, () => this.act(setHunter(s, hunter.id), `${hunter.name}, ${hunter.epithet}: chosen.`), { width: bw, height: 46, size: 19, mat: GOLD });
    if (chosen) choose.setEnabled(false);
    byy += 48;
    if (partnerable) {
      new Button(this, bx, byy, going ? 'REMOVE PARTNER' : 'ADD AS PARTNER', () => this.act(togglePartner(s, hunter.id), going ? `${hunter.short} stays.` : `${hunter.short} comes along.`), { width: bw, height: 42, size: 15, mat: IRON });
      byy += 34;
    }
    if (places) {
      byy -= partnerable ? 0 : 14;
      const left = places.left === 1 ? '1 PLACE LEFT' : `${places.left} PLACES LEFT`;
      label(this, bx, byy + 4, `PARTNERS: ${places.chosen} OF ${places.places}, ${left}`, { size: 15, face: 'display', color: BONE.fill, wrap: bw });
    }
  }

  /** The ledger page: what the hunter is, in three headed blocks. `beside` puts each heading at the left of its block. */
  private ledgerPage(hunter: (typeof HUNTERS)[number], x: number, y: number, pw: number, ph: number, beside: boolean): void {
    const s = save();
    this.add.existing(slabImage(this, x, y, pw, ph, BONE, 8, 4));
    const hw = beside ? 88 : 0;
    const cx = x + 12 + hw;
    const cw = pw - 24 - hw;
    const grown = hunter.hired ? null : growthOf(s, hunter.id);
    const stats = statsOf(s, hunter.id);
    // How tall each block is, so that what room is left is shared out between them.
    const skillH = beside ? 28 : 44;
    const heads = beside ? 0 : 3 * 20;
    const need = heads + 40 + hunter.abilities.length * skillH + (grown ? 66 : 24);
    const gap = Math.max(4, (ph - 12 - need) / 4);
    let yy = y + 6 + gap;
    const head = (name: string, hh: number): number => {
      const hy = beside ? yy + Math.min(10, hh / 2 - 8) : yy + 8;
      label(this, beside ? x + 12 : x + 12, hy, name, { size: 17, align: 'left', face: 'display', color: INK, stroke: null });
      return beside ? yy : yy + 20;
    };
    const rule = (): void => {
      this.add.rectangle(x + 12, yy - gap / 2, pw - 24, 1, 0x8d7650, 0.6).setOrigin(0, 0.5);
    };

    // STATS: four numbers in a row, each under its name.
    let at = head('STATS', 40);
    const cells: Array<[string, string]> = [['HEALTH', `${stats.health}`], ['DAMAGE', stats.damage.join(' / ')], ['RANGE', `${stats.range}`], ['SPEED', `${stats.speed}`]];
    cells.forEach(([k, v], i) => {
      const sx = cx + (i + 0.5) * (cw / cells.length);
      label(this, sx, at + 8, k, { size: 15, color: '#6a5640', stroke: null });
      label(this, sx, at + 28, v, { size: 19, face: 'display', color: INK, stroke: null });
    });
    yy = at + 40 + gap;
    rule();

    // SKILLS: a line each, its mark, its name and key, and what it does. Pressed, the whole of it is said.
    at = head('SKILLS', hunter.abilities.length * skillH);
    const keys = !this.sys.game.device.input.touch;
    hunter.abilities.forEach((id, i) => {
      const a = byId(ABILITIES, id);
      const ry = at + i * skillH + 12;
      const row = this.add.container(0, 0);
      const icon = uiIcon(id);
      if (icon) row.add(this.add.image(cx + 12, ry, icon).setDisplaySize(24, 24));
      const nm = label(this, cx + 30, ry, a.name.toUpperCase(), { size: 15, align: 'left', face: 'display', color: INK, stroke: null });
      row.add(nm);
      let tx = cx + 30 + nm.width + 6;
      if (keys) {
        row.add(label(this, tx, ry, ['Q', 'E'][i] ?? '', { size: 15, align: 'left', face: 'display', color: '#8a2418', stroke: null }));
        tx += 18;
      }
      if (beside) row.add(label(this, tx, ry, a.brief ?? a.says, { size: 15, align: 'left', color: '#3a2a1e', stroke: null, wrap: cx + cw - tx }));
      else row.add(label(this, cx + 30, ry + 20, a.brief ?? a.says, { size: 15, align: 'left', color: '#3a2a1e', stroke: null, wrap: cw - 30 }));
      row.setSize(cw * 2, skillH * 2).setInteractive({ useHandCursor: true }).on('pointerup', () => this.go('muster', `${a.name}: ${a.says}`, this.look));
    });
    yy = at + hunter.abilities.length * skillH + gap;
    rule();

    // GROWTH: the rank and how far to the next, then a slot for each trinket and, for the one hunting, the trophy.
    at = head('GROWTH', grown ? 66 : 24);
    if (!grown) {
      label(this, cx, at + 12, 'A hand for hire does not rank up.', { size: 15, align: 'left', color: '#3a2a1e', stroke: null });
      return;
    }
    const rank = label(this, cx, at + 10, grown.name.toUpperCase(), { size: 17, align: 'left', face: 'display', color: INK, stroke: null });
    let gx = cx + rank.width + 10;
    if (grown.next) {
      const bw = Math.min(140, cw * 0.28);
      this.add.rectangle(gx, at + 10, bw, 10, 0x2a1e14).setOrigin(0, 0.5).setStrokeStyle(1, 0x8d7650);
      this.add.rectangle(gx + 1, at + 10, (bw - 2) * grown.next.share, 8, 0xd8a24a).setOrigin(0, 0.5);
      gx += bw + 10;
    }
    const next = grown.next ? `${grown.next.left} more to ${grown.next.name}` : 'The last rank';
    label(this, gx, at + 10, grown.gives ? `${grown.gives}. ${next}.` : `${next}.`, { size: 15, align: 'left', color: '#3a2a1e', stroke: null, wrap: cx + cw - gx });
    const held = s.trinkets ?? [];
    const chosen = s.muster.hunter === hunter.id;
    const trophy = chosen && s.trophies.length > 0;
    const n = grown.slots + (trophy ? 1 : 0);
    const sw = Math.min(200, (cw - (n - 1) * 8) / n);
    const sy = at + 44;
    for (let i = 0; i < grown.slots; i++) {
      const on = grown.worn[i];
      const t = on ? TRINKETS.find((q) => q.id === on) : null;
      const cycle = (): void => {
        // Round what is held and not worn in another of their slots, and then none.
        const free = held.filter((id) => id === on || !grown.worn.includes(id));
        const was = on ? free.indexOf(on) : -1;
        const to = free[was + 1] ?? null;
        if (on) wearTrinket(s, hunter.id, on);
        if (to) wearTrinket(s, hunter.id, to);
        const d = to ? TRINKETS.find((q) => q.id === to) : null;
        this.act('', d ? `${d.name}: ${d.says}` : held.length ? 'No trinket.' : 'No trinkets yet. Contracts drop them, and the Shop sells some.');
      };
      const sx = cx + sw / 2 + i * (sw + 8);
      new Button(this, sx + 12, sy, t ? t.name.toUpperCase() : '+ TRINKET', cycle, { width: sw - 24, height: 38, size: 15, mat: t ? GOLD : IRON });
      // The trinket's own picture at the slot's left, so it says what it holds at a glance.
      const pic = t ? uiIcon(`icon-${TRINKET_ICONS[t.id]}`) : null;
      if (pic) this.add.image(sx - sw / 2 + 14, sy, pic).setDisplaySize(30, 30);
    }
    if (trophy) {
      const worn = s.worn[s.muster.hunter];
      const name = worn ? MONSTERS.find((q) => q.trophy.id === worn)?.trophy.name ?? '' : 'none';
      const next2 = (): void => {
        // Round the trophies held, and then none.
        const was = worn ? s.trophies.indexOf(worn) : -1;
        const to = was + 1 < s.trophies.length ? s.trophies[was + 1] : null;
        wear(s, to);
        const t = to ? MONSTERS.find((q) => q.trophy.id === to)?.trophy : null;
        this.act('', t ? `${t.name}: ${t.says}` : 'No trophy.');
      };
      new Button(this, cx + sw / 2 + grown.slots * (sw + 8), sy, `TROPHY: ${name.toUpperCase()}`, next2, { width: sw, height: 38, size: 15, mat: worn ? GOLD : IRON });
    }
  }

  /** What can be brought: what comes at the horn and what is built. In the opening hunts only what has been brought in so far. */
  private bringable(): Array<{ id: string; name: string; says: string; cost: number; art: Art; kind: 'r' | 'b' }> {
    const step = openingOf(save());
    return [
      ...(!step || step.reinforcements > 0 ? REINFORCEMENTS : []).map((r) => ({ id: r.id, name: r.name, says: r.says, cost: r.cost, art: ALLY_ART[r.id], kind: 'r' as const })),
      ...(!step || step.buildings > 0 ? BUILDINGS : []).map((b) => ({ id: b.id, name: b.name, says: b.says, cost: b.cost, art: BUILDING_ART[b.id], kind: 'b' as const })),
    ];
  }

  /** The strip of what is brought: a card each with its picture, name and supply cost; one going is lit and ticked. */
  private bringStrip(things: ReturnType<LodgeScene['bringable']>, y: number, ch: number, cols: number): void {
    const s = save();
    const m = s.muster;
    const w = view.w;
    const step = openingOf(s);
    const cw = Math.min(124, (w - 12) / cols - 6);
    const x0 = (n: number): number => w / 2 - ((n - 1) * (cw + 6)) / 2;
    things.forEach((t, i) => {
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, things.length - row * cols);
      const x = x0(inRow) + (i % cols) * (cw + 6);
      const cy = y + ch / 2 + row * (ch + 6);
      const open = isOpen(s, t.id);
      const n = t.kind === 'r' ? (m.reinforcements.includes(t.id) ? 1 : 0) : (m.buildings[t.id] ?? 0);
      const press = (): void => {
        if (t.kind === 'r') this.act(toggleReinforcement(s, t.id), `${t.name}: ${t.says}${chargesOf(s, t.id) > 1 ? ' 2 calls.' : ''}`);
        else this.act(changeBuilding(s, t.id, 1), `${t.name}: ${t.says}`);
      };
      if (n > 0) this.add.image(x, cy, SHEET, 'fx/glow').setDisplaySize(cw * 1.5, ch * 1.4).setTint(0xffc860).setAlpha(0.55);
      const card = this.card(x, cy, cw, ch, !open ? DARK : BONE, press);
      // Going on the hunt: a lit gold edge and a tick. Not going: plain, and as easy to read.
      if (n > 0) card.add(this.add.rectangle(0, 0, cw - 4, ch - 4).setStrokeStyle(4, 0xf0b840));
      this.figure(card, t.art, ch / 2 - 30, ch - 50, open);
      card.add(label(this, 0, ch / 2 - 15, open ? t.name.toUpperCase() : 'LOCKED', { size: 15, color: open ? INK : BONE.shade, stroke: null, face: 'display' }).setScale(Math.min(1, (cw - 8) / (t.name.length * 9.6))));
      if (!open) {
        card.add(label(this, 0, -6, opensBy(t.id), { size: 15, color: BONE.shade, wrap: cw - 8 }));
        return;
      }
      // The supply it takes, large, at the top left.
      if (!step) card.add(label(this, -cw / 2 + 8, -ch / 2 + 16, `${t.cost}`, { size: 24, align: 'left', face: 'display', color: '#8a5a10', stroke: null }));
      if (n > 0) {
        const tick = this.add.container(cw / 2 - 16, -ch / 2 + 16);
        const g = this.add.graphics();
        g.fillStyle(0xf0b840, 1).fillCircle(0, 0, 13).lineStyle(2, hex(OUTLINE), 1).strokeCircle(0, 0, 13);
        g.lineStyle(4, hex(OUTLINE), 1).beginPath().moveTo(-6, 0).lineTo(-2, 5).lineTo(7, -6).strokePath();
        tick.add(g);
        card.add(tick);
        if (t.kind === 'b') {
          // How many are built, under the tick when more than one, and a small button to take one off again.
          if (n > 1) card.add(label(this, cw / 2 - 16, -ch / 2 + 40, `x${n}`, { size: 17, face: 'display', color: INK, stroke: null }));
          const off = this.add.container(-cw / 2 + 18, 4);
          off.add([slabImage(this, -14, -14, 28, 28, RUBY, 8, 3), label(this, 0, -2, '-', { size: 20 })]);
          off.setSize(44, 44).setInteractive({ useHandCursor: true }).on('pointerup', (_p: unknown, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
            e.stopPropagation();
            this.act(changeBuilding(s, t.id, -1), t.name);
          });
          card.add(off);
        }
      }
    });
  }

  /** Something was pressed on the muster: it is written down, and the line says what it was or why not. */
  private act(why: string, said: string): void {
    if (why) sfx.play('deny', 0.6);
    commit();
    this.go('muster', why || said, this.look);
  }

  // ------------------------------------------------------------ the ledger

  private ledger(top: number): void {
    const s = save();
    const w = view.w;
    const list = wares(s);
    label(this, w / 2, top + 14, this.note || 'Spend coin here. Trophies unlock more.', { size: 15, color: this.note ? HOLY.fill : BONE.shade, wrap: w - 40 });
    // Each ware a card with its picture, what it is and what it does, and its price on a button: laid out in as many
    // columns as fit, so that every one is seen at once.
    const pw = Math.min(w - 16, 1000);
    const cols = Math.max(2, Math.min(5, Math.floor(pw / 176)));
    const rows = Math.ceil(list.length / cols);
    const cw = pw / cols - 8;
    // On a tall screen the cards take the room there is, so that the page is not half empty.
    const ch = Math.min(view.tall ? 190 : 124, (view.h - top - 40) / rows - 8);
    list.forEach((ware, i) => {
      const x = w / 2 - pw / 2 + (i % cols) * (cw + 8) + cw / 2 + 4;
      const y = top + 34 + Math.floor(i / cols) * (ch + 8) + ch / 2;
      const card = this.add.container(x, y);
      card.add(slabImage(this, -cw / 2, -ch / 2, cw, ch, ware.had ? DARK : BONE, 6, 4));
      const ink = ware.had ? BONE.shade : INK;
      card.add(this.add.image(-cw / 2 + 22, -ch / 2 + 22, uiKey(wareIcon(ware.id))).setDisplaySize(32, 32).setAlpha(ware.had ? 0.5 : 1));
      const name = label(this, -cw / 2 + 44, -ch / 2 + 22, ware.name, { size: 15, align: 'left', color: ink, stroke: null, face: 'display' });
      name.setScale(Math.min(1, (cw - 52) / name.width));
      card.add(name);
      const says = label(this, -cw / 2 + 10, -ch / 2 + 42, ware.says, { size: 15, align: 'left', color: ink, stroke: null, wrap: cw - 20 }).setOrigin(0, 0);
      card.add(says);
      if (ware.had) card.add(label(this, 0, ch / 2 - 18, 'BOUGHT', { size: 15, color: BONE.shade, face: 'display' }));
      else {
        const b = new Button(this, x, y + ch / 2 - 22, `${ware.price}`, () => {
          const why = buy(s, ware.id);
          if (why) sfx.play('deny', 0.6);
          else sfx.play('buy', 0.8);
          commit();
          this.go('ledger', why || `${ware.name}: bought.`);
        }, { width: Math.min(110, cw - 20), height: 38, size: 17, mat: s.coin >= ware.price ? GOLD : IRON });
        b.setEnabled(s.coin >= ware.price);
      }
    });
  }
}
