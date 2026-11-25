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
  board as postedBoard, partyFor, posterOf, posting, repost, togglePartner, type Posting,
} from '../../game/lodge';
import { setupCamera } from '../app';
import { hex, view } from '../config';
import { ALLY_ART, BUILDING_ART, HUNTER_ART, MONSTER_ART, STAND_IN, isGrim, type Art } from '../pictures';
import { CARDS, SHEET, portraitFrame } from '../art/Sheet';
import { commit, save, takeContract, takePosting, theContract } from '../session';
import { slabImage } from '../ui/bake';
import { Button, label } from '../ui/widgets';
import { uiIcon } from '../ui/grim';
import { LairScene } from './LairScene';
import { Talk } from '../../game/talk';

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

  constructor() {
    super('Lodge');
  }

  create(data: { leaf?: Leaf; note?: string } = {}): void {
    setupCamera(this);
    this.cameras.main.setBackgroundColor('#1c140e');
    this.leaf = data.leaf ?? 'board';
    this.note = data.note ?? '';
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
    const tx = view.tall ? w / 2 + 34 : w / 2;
    leaves.forEach(([leaf, name], i) => {
      new Button(this, tx + (i - (leaves.length - 1) / 2) * (tw + 6), 34, name, () => this.go(leaf), { width: tw, height: 46, size: 17, mat: leaf === this.leaf ? GOLD : IRON });
    });
    const coinY = view.tall ? 82 : 34;
    const coinX = view.tall ? w - 70 : w - 130;
    this.add.image(coinX - 34, coinY, SHEET, 'icon/coin').setScale(0.3);
    label(this, coinX, coinY - 1, String(s.coin), { size: 20, color: HOLY.fill });
    if (!view.tall) {
      const mute = this.add.container(w - 36, 34);
      mute.add([slabImage(this, -22, -22, 44, 44, BONE, 12, 5), this.add.image(0, -2, SHEET, s.sound ? 'icon/sound' : 'icon/mute').setScale(0.26).setTint(hex(OUTLINE))]);
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

  private go(leaf: Leaf, note = ''): void {
    this.scene.restart({ leaf, note });
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
  private figure(c: Phaser.GameObjects.Container, art: Art, floor: number, high: number, open: boolean): void {
    const img = this.add.image(0, floor, CARDS, isGrim(art) ? portraitFrame('grim', art.grim) : portraitFrame(art.team, art.legion));
    img.setScale(Math.min(high / img.height, 1.2));
    if (!open) img.setTint(hex(OUTLINE)).setTintMode(Phaser.TintModes.FILL).setAlpha(0.85);
    else if (!isGrim(art)) img.setTint(STAND_IN).setTintMode(Phaser.TintModes.FILL);
    c.add(img);
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
          const d = this.add.rectangle(-bw * 0.24 + (k - 1) * 14, bh * 0.34, 8, 8, k < mark ? 0x8a1e16 : 0x6b5a48, k < mark ? 1 : 0.35).setAngle(45);
          card.add(d);
        }
        const { coin } = rewardOf(s, c.id, mark as Mark);
        const pay = label(this, -bw * 0.22, bh * 0.43, `${coin} COIN`, { size: 15, color: '#3a2410', stroke: null, face: 'display' });
        pay.setScale(Math.min(1, (bw * 0.42) / pay.width));
        // Who may go: a party of more than the hunter is said on the bill (the contract's own number, when contracts have one).
        const party = (c as Contract & { party?: number }).party ?? 1;
        if (party > 1) card.add(label(this, -bw * 0.08, bh * 0.47, `PARTY: ${party}`, { size: 15, color: INK, stroke: null, face: 'display' }));
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
   * The board once contracts are posted at random: the wall of timber with each posting a bill pinned askew. On the
   * bill only what is read at a glance: the boss's likeness, its name on a clear strip, its danger in marks of blood,
   * how many hunters it takes, what is unlike it this time in one shrunk line, and the reward. The bill picked is
   * lifted off the wall, and everything about it is said under the wall: where, who posted it and why, each variant
   * and each task with what it pays. Bills and words of any length lay out the same way.
   */
  private posters(top: number): void {
    const s = save();
    const w = view.w;
    const tall = view.tall;
    const list = postedBoard(s);
    // A bill is always picked: the first, until another is.
    if (list.length && !list.some((p) => p.id === theContract().posting?.id)) takePosting(list[0].id);
    const chosen = theContract();
    const wallH = tall ? Math.min(view.h * 0.46, 420) : Math.min(view.h * 0.48, 240);
    this.add.existing(slabImage(this, 6, top - 4, w - 12, wallH, WOOD_DARK, 4, 6));
    const cols = tall ? Math.min(2, list.length) : Math.max(1, Math.min(5, list.length));
    const rows = Math.max(1, Math.ceil(list.length / cols));
    const gap = 12;
    const bw = Math.min(170, (w - 30) / cols - gap);
    const bh = Math.min(bw * 1.32, (wallH - 16) / rows - gap);
    const x0 = w / 2 - ((cols - 1) * (bw + gap)) / 2;
    list.forEach((p, i) => {
      const poster = posterOf(s, p);
      const x = x0 + (i % cols) * (bw + gap);
      const y = top + 6 + bh / 2 + Math.floor(i / cols) * (bh + gap);
      const picked = chosen.posting?.id === p.id;
      const tilt = picked ? 0 : ((i * 37 + p.id * 11) % 7) - 3;
      if (picked) this.add.rectangle(x + 5, y + 2, bw * 1.06, bh * 1.06, 0x000000, 0.45);
      const card = this.add.container(x, y + (picked ? -4 : 0)).setAngle(tilt).setScale(picked ? 1.06 : 1);
      card.add(this.add.image(0, 0, 'bill').setDisplaySize(bw, bh).setTint(picked ? 0xffffff : 0xcfc4ae));
      card.add(this.add.circle(0, -bh / 2 + 7, 3, 0x2a221a).setStrokeStyle(1, 0x8a7a60));
      this.figure(card, MONSTER_ART[p.monster], bh * 0.13, bh * 0.44, true);
      card.add(slabImage(this, -bw / 2 + 6, bh * 0.2 - 13, bw - 12, 26, DARK, 2, 3));
      const name = label(this, 0, bh * 0.2, byId(MONSTERS, p.monster).name.replace(/^The /, '').toUpperCase(), { size: 17, color: BONE.fill, face: 'display' });
      name.setScale(Math.min(1, (bw - 24) / name.width));
      card.add(name);
      // Danger in marks of blood, up to six, and the party it takes beside them.
      const dx = -bw * 0.24;
      for (let k = 0; k < Math.max(3, poster.danger); k++) card.add(this.add.rectangle(dx + (k - 1) * 12, bh * 0.31, 7, 7, k < poster.danger ? 0x8a1e16 : 0x6b5a48, k < poster.danger ? 1 : 0.35).setAngle(45));
      // What is unlike it this time, stamped in red across the corner of its likeness; the party it takes in the other.
      const stamp = (text: string, x: number, y: number, angle: number): void => {
        const t = label(this, x, y, text.toUpperCase(), { size: 15, color: '#8a1e16', stroke: '#e8dcc0', strokeWidth: 3, face: 'display' }).setAngle(angle);
        t.setScale(Math.min(1, (bw * 0.5) / t.width));
        card.add(t);
      };
      if (poster.variants.length) stamp(poster.variants[0].name + (poster.variants.length > 1 ? ` +${poster.variants.length - 1}` : ''), bw * 0.16, -bh * 0.24, -9);
      if (poster.party > 1) stamp(`PARTY ${poster.party}`, -bw * 0.17, bh * 0.08, 7);
      if (poster.tasks.length) stamp(`+ ${poster.tasks.length} TASK${poster.tasks.length > 1 ? 'S' : ''}`, bw * 0.17, bh * 0.08, -6);
      const pay = label(this, -bw * 0.22, bh * 0.4, `${poster.coin} COIN`, { size: 15, color: '#3a2410', stroke: null, face: 'display' });
      pay.setScale(Math.min(1, (bw * 0.42) / pay.width));
      card.add(pay);
      card.setSize(bw, bh).setInteractive({ useHandCursor: true });
      card.on('pointerup', () => {
        sfx.play('click');
        takePosting(p.id);
        this.go('board');
      });
    });

    // Under the wall: everything about the bill picked, then the way out.
    const py = top + wallH + 6;
    const ph = view.h - py - 8;
    const pw = Math.min(w - 12, 900);
    this.add.existing(slabImage(this, w / 2 - pw / 2, py, pw, ph, LEATHER, 4, 6));
    const picked = list.find((p) => p.id === chosen.posting?.id);
    const left = w / 2 - pw / 2 + 18;
    const by = py + ph - 34;
    if (picked) {
      // Hobb, who keeps the board, says a word about the bill taken down: his own dice, the same word for the same bill.
      const hobb = new Talk(picked.id * 131 + 7, 'keeper', picked.monster).pick('keeper', 'taken');
      if (hobb) {
        const hl = label(this, w / 2 + pw / 2 - 18, top + wallH - 22, `Hobb: "${hobb}"`, { size: 15, align: 'right', color: BONE.shade });
        hl.setScale(Math.min(1, (w - 40) / hl.width));
      }
      const poster = posterOf(s, picked);
      const head = label(this, left, py + 22, poster.title.toUpperCase(), { size: 22, align: 'left', face: 'display' });
      head.setScale(Math.min(1, (pw - 36) / head.width));
      label(this, left, py + 44, `${poster.where}. Posted by ${poster.by}: "${poster.why}"`, { size: 15, align: 'left', color: BONE.shade, wrap: pw - 36 }).setOrigin(0, 0);
      const said = [
        ...poster.variants.map((v) => `${v.name}: ${v.says}`),
        ...poster.tasks.map((t) => `Task, ${t.name}: ${t.says} (+${t.bonus} coin)`),
        `${poster.partyText}. Reward: ${poster.coin} coin${poster.first ? ', doubled for the first win' : ''}${poster.thing ? `, and ${poster.thing}` : ''}${poster.hiredCut ? `. Hired hands take ${poster.hiredCut}` : ''}.`,
      ];
      const body = label(this, left, py + (tall ? 92 : 80), said.join('\n'), { size: 15, align: 'left', wrap: pw - 36, color: BONE.fill }).setOrigin(0, 0);
      // Long contracts are made to fit the room above the buttons.
      body.setScale(Math.min(1, (by - 34 - body.y) / Math.max(1, body.height)));
    } else label(this, w / 2, py + 40, 'Pick a contract from the board.', { size: 16, color: BONE.shade });
    const bwid = Math.min(190, (pw - 40) / 3);
    new Button(this, w / 2 - bwid - 10, by, 'NEW POSTINGS', () => {
      const why = repost(s);
      commit();
      this.go('board', why);
    }, { width: bwid, height: 50, size: 16, mat: IRON });
    new Button(this, w / 2, by, 'TEAM', () => this.go('muster'), { width: bwid, height: 54, size: 22, mat: IRON });
    const hunt = new Button(this, w / 2 + bwid + 10, by, 'HUNT', () => this.hunt(), { width: bwid, height: 54, size: 26, mat: RUBY });
    hunt.setEnabled(!!picked);
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

  private muster(top: number): void {
    const s = save();
    const w = view.w;
    const m = s.muster;
    const used = costOf(m);
    const all = supplyOf(s);

    // Who goes: every hunter in one bar of portraits. The one chosen is raised and lit; one not yet unlocked is its
    // black shape, "???" and how to unlock it, and nothing else.
    // Hands for hire are not in the bar: they come by themselves when a contract needs more than the player has.
    const own = HUNTERS.filter((h) => !h.hired);
    const hw = Math.min(132, (w - 24) / own.length - 8);
    const hh = tall() ? 120 : 112;
    const hx0 = w / 2 - ((own.length - 1) * (hw + 8)) / 2;
    // How many the contract picked takes, the player among them.
    const party = theContract().posting ? posterOf(s, theContract().posting as Posting).party : 1;
    this.add.existing(slabImage(this, 6, top - 6, w - 12, hh + 14, WOOD_DARK, 4, 5));
    own.forEach((h, i) => {
      const open = isOpen(s, h.id);
      const chosen = m.hunter === h.id;
      const x = hx0 + i * (hw + 8);
      const y = top + hh / 2 + (chosen ? -3 : 1);
      if (chosen) this.add.image(x, y + 6, SHEET, 'fx/glow').setDisplaySize(hw * 1.6, hh * 1.4).setTint(0xffb85a).setAlpha(0.45);
      const card = this.card(x, y, hw, hh - (chosen ? 0 : 6), chosen ? BONE : DARK, () => this.act(setHunter(s, h.id), `${h.name}, ${h.epithet}`));
      this.figure(card, HUNTER_ART[h.id], hh / 2 - 26, hh - 40, open);
      if (open) card.add(label(this, 0, hh / 2 - 14, h.short.toUpperCase(), { size: 15, color: chosen ? INK : BONE.fill, stroke: chosen ? null : undefined, face: 'display' }));
      else {
        card.add(label(this, 0, -hh / 2 + 18, '???', { size: 17, color: BONE.shade, face: 'display' }));
        const how = label(this, 0, hh / 2 - 14, opensBy(h.id) || 'Locked', { size: 15, color: BONE.shade, wrap: hw - 8 });
        how.setScale(Math.min(1, 30 / how.height, (hw - 8) / how.width));
        card.add(how);
      }
      if (!chosen && open) card.setAlpha(0.9);
      // On a contract for more than one, an unlocked hunter can be taken along: a tag under their card says so.
      if (party > 1 && open && !chosen) {
        const going = m.partners.includes(h.id);
        const tag = new Button(this, x, y + hh / 2 + 2, going ? 'PARTNER' : '+ TAKE', () => this.act(togglePartner(s, h.id), going ? `${h.short} stays.` : `${h.short} comes along.`), { width: Math.min(hw - 10, 104), height: 44, size: 15, mat: going ? GOLD : IRON });
        void tag;
      }
    });
    const hunter = byId(HUNTERS, m.hunter);
    let y = top + hh + (party > 1 ? 44 : 26);
    if (party > 1) {
      // The party's slots: the player, the partners chosen, and a hired hand in each slot left.
      const { partners, hired } = partyFor(s, party);
      const names = [`${hunter.short} (you)`, ...partners.map((id) => byId(HUNTERS, id).short), ...Array.from({ length: hired }, () => 'Hired hand')];
      label(this, w / 2, y - 18, `PARTY ${party}: ${names.join(', ')}`, { size: 15, face: 'display', color: BONE.fill });
    }
    label(this, w / 2, y, `${hunter.name.toUpperCase()}, ${hunter.epithet.toUpperCase()}`, { size: 19, face: 'display', color: HOLY.fill });
    y += 24;
    label(this, w / 2, y, hunter.way, { size: 15, color: BONE.shade, wrap: w - 40 });
    y += tall() ? 34 : 26;
    // The two skills, each with its own mark from the style.
    for (const id of hunter.abilities) {
      const a = byId(ABILITIES, id);
      const line = label(this, w / 2 + 14, y + 4, `${a.name}: ${a.says}`, { size: 15, wrap: Math.min(w - 60, 700) });
      const icon = uiIcon(id);
      if (icon) this.add.image(w / 2 + 14 - line.displayWidth / 2 - 16, y + 4, icon).setDisplaySize(26, 26);
      y += tall() ? 44 : 26;
    }

    // What comes at the horn and what is built: one row in a wide window, two in a tall one.
    // In the opening hunts only what has been brought in so far is shown: the rest is not yet spoken of.
    const step = openingOf(s);
    const things: Array<{ id: string; name: string; says: string; cost: number; art: Art; kind: 'r' | 'b' }> = [
      ...(!step || step.reinforcements > 0 ? REINFORCEMENTS : []).map((r) => ({ id: r.id, name: r.name, says: r.says, cost: r.cost, art: ALLY_ART[r.id], kind: 'r' as const })),
      ...(!step || step.buildings > 0 ? BUILDINGS : []).map((b) => ({ id: b.id, name: b.name, says: b.says, cost: b.cost, art: BUILDING_ART[b.id], kind: 'b' as const })),
    ];
    const cols = view.tall ? 4 : things.length;
    const cw = Math.min(118, (w - 20) / cols - 6);
    const ch = 128;
    y += 8;
    const tx0 = (n: number): number => w / 2 - ((n - 1) * (cw + 6)) / 2;
    things.forEach((t, i) => {
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, things.length - row * cols);
      const x = tx0(inRow) + (i % cols) * (cw + 6);
      const cy = y + ch / 2 + row * (ch + 6);
      const open = isOpen(s, t.id);
      const n = t.kind === 'r' ? (m.reinforcements.includes(t.id) ? 1 : 0) : (m.buildings[t.id] ?? 0);
      const press = (): void => {
        if (t.kind === 'r') this.act(toggleReinforcement(s, t.id), `${t.name}: ${t.says}${chargesOf(s, t.id) > 1 ? ' 2 calls.' : ''}`);
        else this.act(changeBuilding(s, t.id, 1), `${t.name}: ${t.says}`);
      };
      const card = this.card(x, cy, cw, ch, !open ? DARK : BONE, press);
      if (open && n === 0) card.setAlpha(0.72);
      // Going on the hunt: a brass edge round it.
      if (n > 0) card.add(this.add.rectangle(0, 0, cw - 4, ch - 4).setStrokeStyle(3, 0xb08a48));
      this.figure(card, t.art, 8, 62, open);
      card.add(label(this, 0, 26, open ? t.name.toUpperCase() : 'LOCKED', { size: 15, color: open ? INK : BONE.shade, stroke: null }).setScale(Math.min(1, (cw - 6) / (t.name.length * 9.6))));
      if (open) {
        if (!step) card.add(label(this, -cw / 2 + 8, -ch / 2 + 14, `${t.cost}`, { size: 17, align: 'left', color: HOLY.fill }));
        card.add(label(this, 0, 48, n > 0 ? (t.kind === 'r' ? 'GOING' : `x${n}`) : t.kind === 'r' ? 'take' : 'add', { size: 15, color: n > 0 ? '#7a1e16' : '#5a4a38', stroke: null, face: 'display' }));
        // A building that is going can be taken off again by its own small button.
        if (t.kind === 'b' && n > 0) {
          const off = this.add.container(cw / 2 - 16, -ch / 2 + 16);
          off.add([slabImage(this, -14, -14, 28, 28, RUBY, 8, 3), label(this, 0, -2, '-', { size: 20 })]);
          off.setSize(44, 44).setInteractive({ useHandCursor: true }).on('pointerup', (_p: unknown, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
            e.stopPropagation();
            this.act(changeBuilding(s, t.id, -1), t.name);
          });
          card.add(off);
        }
      } else card.add(label(this, 0, 48, opensBy(t.id), { size: 15, color: BONE.shade }).setScale(Math.min(1, (cw - 4) / 170)));
    });
    y += Math.ceil(things.length / cols) * (ch + 6) + 4;

    // What was last pressed, or why it would not go.
    label(this, w / 2, y + 12, this.note || newsOf(s), { size: 15, color: HOLY.fill, wrap: Math.min(w - 30, 760) });

    // Along the bottom: the supply, the trophy worn, and the way out.
    const by = view.h - 42;
    const sx = view.tall ? w / 2 : 150;
    const sy = view.tall ? by - 128 : by;
    if (!step) {
      this.add.image(sx - 96, sy, SHEET, 'icon/sack').setScale(0.3);
      label(this, sx - 70, sy - 1, `SUPPLY ${used} / ${all}`, { size: 20, align: 'left', color: used > all ? RUBY.fill : BONE.fill });
    }
    if (s.trophies.length) {
      const worn = s.worn[m.hunter];
      const name = worn ? MONSTERS.find((x) => x.trophy.id === worn)?.trophy.name ?? '' : 'none';
      const tyy = view.tall ? by - 70 : by;
      const next = (): void => {
        // Round the trophies held, and then none.
        const at = worn ? s.trophies.indexOf(worn) : -1;
        const to = at + 1 < s.trophies.length ? s.trophies[at + 1] : null;
        wear(s, to);
        const t = to ? MONSTERS.find((x) => x.trophy.id === to)?.trophy : null;
        this.act('', t ? `${t.name}: ${t.says}` : 'No trophy.');
      };
      new Button(this, w / 2, tyy, `TROPHY: ${name.toUpperCase()}`, next, { width: Math.min(330, w - 40), height: 46, size: 15, mat: IRON });
    }
    new Button(this, view.tall ? w / 2 : w - 130, by, 'HUNT', () => this.leave(), { width: 220, height: 58, size: 26, mat: RUBY });
  }

  /** Something was pressed on the muster: it is written down, and the line says what it was or why not. */
  private act(why: string, said: string): void {
    if (why) sfx.play('deny', 0.6);
    commit();
    this.go('muster', why || said);
  }

  // ------------------------------------------------------------ the ledger

  private ledger(top: number): void {
    const s = save();
    const w = view.w;
    const list = wares(s);
    const pw = Math.min(w - 20, 760);
    const rh = Math.min(58, (view.h - top - 60) / list.length);
    label(this, w / 2, top + 16, this.note || 'Spend coin here. Trophies unlock more.', { size: 15, color: this.note ? HOLY.fill : BONE.shade, wrap: pw - 20 });
    list.forEach((ware, i) => {
      const y = top + 44 + i * rh + rh / 2;
      this.add.existing(slabImage(this, w / 2 - pw / 2, y - rh / 2 + 3, pw, rh - 6, ware.had ? DARK : BONE, 12, 5));
      const ink = ware.had ? BONE.shade : INK;
      label(this, w / 2 - pw / 2 + 18, y - (view.tall ? 9 : 0) - 2, ware.name, { size: 16, align: 'left', color: ink, stroke: null });
      if (!view.tall) label(this, w / 2 - pw / 2 + 300, y - 2, ware.says, { size: 15, align: 'left', color: ink, stroke: null });
      else label(this, w / 2 - pw / 2 + 18, y + 10, ware.says, { size: 15, align: 'left', color: ink, stroke: null }).setScale(Math.min(1, (pw - 150) / (ware.says.length * 7.4)));
      if (ware.had) label(this, w / 2 + pw / 2 - 64, y - 2, 'BOUGHT', { size: 16, color: BONE.shade });
      else {
        const b = new Button(this, w / 2 + pw / 2 - 64, y - 1, `${ware.price}`, () => {
          const why = buy(s, ware.id);
          if (why) sfx.play('deny', 0.6);
          else sfx.play('buy', 0.8);
          commit();
          this.go('ledger', why || `${ware.name}: bought.`);
        }, { width: 104, height: Math.max(44, rh - 12), size: 18, mat: s.coin >= ware.price ? GOLD : IRON });
        b.setEnabled(s.coin >= ware.price);
      }
    });
  }
}
