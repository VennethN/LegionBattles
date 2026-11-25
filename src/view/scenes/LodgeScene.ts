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
import { buy, changeBuilding, chargesOf, contracts, costOf, isOpen, opensBy, setHunter, supplyOf, toggleReinforcement, wares, wear, type Contract } from '../../game/lodge';
import { setupCamera } from '../app';
import { hex, view } from '../config';
import { ALLY_ART, BUILDING_ART, HUNTER_ART, MONSTER_ART, STAND_IN, isGrim, type Art } from '../pictures';
import { CARDS, SHEET, portraitFrame } from '../art/Sheet';
import { commit, save, takeContract, theContract } from '../session';
import { slabImage } from '../ui/bake';
import { Button, label } from '../ui/widgets';
import { LairScene } from './LairScene';

type Leaf = 'board' | 'muster' | 'ledger';

const DARK: Material = { fill: '#3a2a1e', shade: '#2a1c12' };
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
    music.play('meadow', 'calm');
    const s = save();
    const w = view.w;

    // Along the top: the game's name, the three leaves, the coin and the sound.
    const lw = view.tall ? 116 : 132;
    this.add.image(10 + lw / 2, 34, 'logo').setDisplaySize(lw, (lw * 214) / 444);
    const leaves: Array<[Leaf, string]> = [['board', 'BOSSES'], ['muster', 'TEAM'], ['ledger', 'SHOP']];
    const tw = view.tall ? 104 : 118;
    const tx = view.tall ? w / 2 + 34 : w / 2;
    leaves.forEach(([leaf, name], i) => {
      new Button(this, tx + (i - 1) * (tw + 6), 34, name, () => this.go(leaf), { width: tw, height: 46, size: 17, mat: leaf === this.leaf ? GOLD : IRON });
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

  private board(top: number): void {
    const s = save();
    const w = view.w;
    const list = contracts(s);
    const chosen = theContract();
    const cols = view.tall ? 3 : list.length;
    const cw = Math.min(150, (w - 24) / cols - 8);
    const ch = view.tall ? 150 : 170;
    const x0 = w / 2 - ((cols - 1) * (cw + 8)) / 2;
    list.forEach((c, i) => {
      const x = x0 + (i % cols) * (cw + 8);
      const y = top + ch / 2 + Math.floor(i / cols) * (ch + 8);
      const picked = c.id === chosen.monster;
      const card = this.card(x, y, cw, ch, c.posted ? (picked ? GOLD : BONE) : DARK, c.posted ? () => this.pick(c, Math.min(c.upTo, Math.max(1, c.felled + 1)) as Mark) : null);
      // A contract that can be hunted is a posted bill, in the style's own hand.
      if (c.posted) card.addAt(this.add.image(0, 0, 'bill').setDisplaySize(cw - 8, ch - 8).setTint(picked ? 0xffffff : 0xb8b0a0), 1);
      if (c.monster && c.posted) {
        this.figure(card, MONSTER_ART[c.id], ch / 2 - 46, ch - 70, true);
        card.add(label(this, 0, ch / 2 - 32, c.monster.name.replace('The ', '').toUpperCase(), { size: 15, color: INK, stroke: null, wrap: cw - 8 }));
        // Its three marks: gold for those it has fallen at.
        for (let k = 0; k < 3; k++) card.add(this.add.image((k - 1) * 22, ch / 2 - 13, SHEET, 'icon/star').setScale(0.16).setTint(k < c.felled ? 0xffffff : 0x3a2a1e).setAlpha(k < c.felled ? 1 : 0.55));
      } else {
        // Not posted: a dark bill, and what must fall first. Nothing else of it is told.
        if (c.monster) this.figure(card, MONSTER_ART[c.id], ch / 2 - 46, ch - 76, false);
        else card.add(this.add.image(0, -ch / 2 + 44, SHEET, 'icon/lock').setScale(0.34).setAlpha(0.6));
        card.add(label(this, 0, ch / 2 - 62, 'LOCKED', { size: 16, color: BONE.shade }));
        card.add(label(this, 0, ch / 2 - 28, c.needs, { size: 15, color: BONE.shade, wrap: cw - 10 }));
      }
    });

    // The contract picked: what is known of it, its marks, what it pays, and the way out to it.
    const rows = Math.ceil(list.length / cols);
    const py = top + rows * (ch + 8) + 6;
    const ph = view.h - py - 10;
    const c = list.find((x) => x.id === chosen.monster && x.posted) ?? list[0];
    const m = c.monster ?? MONSTERS[0];
    const pw = Math.min(w - 20, 900);
    this.add.existing(slabImage(this, w / 2 - pw / 2, py, pw, ph, LEATHER, 16, 7));
    const left = w / 2 - pw / 2 + 24;
    const mark = Math.min(chosen.mark, Math.max(1, c.upTo)) as Mark;
    label(this, left, py + 30, m.name.toUpperCase(), { size: 24, align: 'left' });
    const textW = view.tall ? pw - 48 : pw - 300;
    label(this, left, py + (view.tall ? 86 : 80), c.felled > 0 || s.hunts > 0 ? m.known : m.rumor, { size: 16, align: 'left', wrap: textW, color: BONE.fill }).setOrigin(0, 0.5);
    // The marks: one, two, three. A mark not yet reached cannot be pressed.
    const mx = view.tall ? left + 30 : w / 2 + pw / 2 - 236;
    const my = view.tall ? py + 156 : py + 34;
    label(this, mx - 30, my - 30, 'DIFFICULTY', { size: 15, align: 'left', color: BONE.shade });
    for (let k = 1; k <= 3; k++) {
      const b = new Button(this, mx + 46 + (k - 1) * 58, my, String(k), () => this.pick(c, k as Mark), { width: 52, height: 46, size: 19, mat: k === mark ? GOLD : IRON });
      b.setEnabled(k <= c.upTo);
    }
    const pay = m.pay[mark - 1];
    const first = c.felled < mark;
    const lineY = view.tall ? py + 206 : py + 84;
    const lineX = view.tall ? left : mx - 30;
    label(this, lineX, lineY, `Reward: ${first ? pay * 2 : pay} coin${first ? ' (double for the first win)' : ''}`, { size: 15, align: 'left', color: HOLY.fill, wrap: view.tall ? pw - 48 : 250 }).setOrigin(0, 0.5);
    if (c.felled === 0) label(this, lineX, lineY + (view.tall ? 30 : 44), 'First win: a trophy and new unlocks.', { size: 15, align: 'left', color: BONE.shade });
    const by = py + ph - 44;
    new Button(this, w / 2 - 110, by, 'TEAM', () => this.go('muster'), { width: 200, height: 58, size: 22, mat: IRON });
    new Button(this, w / 2 + 110, by, 'HUNT', () => this.hunt(), { width: 200, height: 58, size: 26, mat: RUBY });
  }

  private pick(c: Contract, mark: Mark): void {
    takeContract(c.id, Math.max(1, Math.min(mark, c.upTo)) as Mark);
    this.go('board');
  }

  private hunt(): void {
    const c = theContract();
    takeContract(c.monster, c.mark);
    this.scene.start('Lair');
  }

  // ------------------------------------------------------------ the muster

  private muster(top: number): void {
    const s = save();
    const w = view.w;
    const m = s.muster;
    const used = costOf(m);
    const all = supplyOf(s);

    // Who goes.
    const hw = Math.min(150, (w - 24) / HUNTERS.length - 8);
    const hh = view.tall ? 118 : 108;
    const hx0 = w / 2 - ((HUNTERS.length - 1) * (hw + 8)) / 2;
    HUNTERS.forEach((h, i) => {
      const open = isOpen(s, h.id);
      const card = this.card(hx0 + i * (hw + 8), top + hh / 2, hw, hh, !open ? DARK : m.hunter === h.id ? GOLD : BONE, () => this.act(setHunter(s, h.id), `${h.name}, ${h.epithet}`));
      this.figure(card, HUNTER_ART[h.id], hh / 2 - 26, hh - 38, open);
      card.add(label(this, 0, hh / 2 - 14, open ? h.short.toUpperCase() : 'LOCKED', { size: 15, color: open ? INK : BONE.shade, stroke: null }));
    });
    const hunter = byId(HUNTERS, m.hunter);
    let y = top + hh + 20;
    label(this, w / 2, y, `${hunter.name.toUpperCase()}, ${hunter.epithet}`, { size: 18 });
    y += 26;
    label(this, w / 2, y, hunter.way, { size: 15, color: BONE.shade, wrap: w - 40 });
    y += view.tall ? 34 : 24;
    for (const id of hunter.abilities) {
      const a = byId(ABILITIES, id);
      label(this, w / 2, y + 6, `${a.name}: ${a.says}`, { size: 15, wrap: Math.min(w - 30, 720) });
      y += view.tall ? 44 : 26;
    }

    // What comes at the horn and what is built: one row in a wide window, two in a tall one.
    const things: Array<{ id: string; name: string; says: string; cost: number; art: Art; kind: 'r' | 'b' }> = [
      ...REINFORCEMENTS.map((r) => ({ id: r.id, name: r.name, says: r.says, cost: r.cost, art: ALLY_ART[r.id], kind: 'r' as const })),
      ...BUILDINGS.map((b) => ({ id: b.id, name: b.name, says: b.says, cost: b.cost, art: BUILDING_ART[b.id], kind: 'b' as const })),
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
      const card = this.card(x, cy, cw, ch, !open ? DARK : n > 0 ? GOLD : BONE, press);
      this.figure(card, t.art, 8, 62, open);
      card.add(label(this, 0, 26, open ? t.name.toUpperCase() : 'LOCKED', { size: 15, color: open ? INK : BONE.shade, stroke: null }).setScale(Math.min(1, (cw - 6) / (t.name.length * 9.6))));
      if (open) {
        card.add(label(this, -cw / 2 + 8, -ch / 2 + 14, `${t.cost}`, { size: 17, align: 'left', color: HOLY.fill }));
        card.add(label(this, 0, 48, n > 0 ? (t.kind === 'r' ? 'GOING' : `x${n}`) : t.kind === 'r' ? 'take' : 'add', { size: 15, color: n > 0 ? '#2e5f45' : '#6b5a48', stroke: null }));
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
    label(this, w / 2, y + 12, this.note, { size: 15, color: HOLY.fill, wrap: Math.min(w - 30, 760) });

    // Along the bottom: the supply, the trophy worn, and the way out.
    const by = view.h - 42;
    const sx = view.tall ? w / 2 : 150;
    const sy = view.tall ? by - 128 : by;
    this.add.image(sx - 96, sy, SHEET, 'icon/sack').setScale(0.3);
    label(this, sx - 70, sy - 1, `SUPPLY ${used} / ${all}`, { size: 20, align: 'left', color: used > all ? RUBY.fill : BONE.fill });
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
    new Button(this, view.tall ? w / 2 : w - 130, by, 'HUNT', () => this.scene.start('Lair'), { width: 220, height: 58, size: 26, mat: RUBY });
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
