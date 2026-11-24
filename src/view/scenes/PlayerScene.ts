// The player's own growth: the skill tree their levels pay for, and the
// upgrades coins buy. It opens over the field from the level under the
// coins, and has a page for each.
//
// The tree is drawn as it is written (data/player.ts): the root at the left,
// a row to a branch, each node joined to the one it needs. A node is dark
// until that one has ranks enough, pale while it can be bought, and in its
// branch's color once it has a rank. Pressing one brings it up on the right,
// with what it gives now and at the next rank.
//
// Nothing here works a bonus out: bonuses.ts adds them up, and this shows
// what it says.

import Phaser from 'phaser';
import { ARCANE, BONE, CLOTH, FIRE, FROST, GOLD, HIGHLIGHT, HOLY, IRON, OUTLINE, VENOM, type Material } from '../../art/kit/palette';
import { sfx } from '../../audio/sfx';
import {
  BRANCH_NAME, EFFECT_NAME, PLAYER_MAX_LEVEL, TREE, UPGRADES, playerXpToNext, treeNode, type Branch, type TreeNode,
} from '../../data/player';
import { bonusParts, bonuses } from '../../game/bonuses';
import { buyUpgrade, pointsFree, rankOf, rankUp, resetTree, upgradeCost, upgradeLevel, whyNoRank } from '../../game/player';
import { setupCamera } from '../app';
import { hex } from '../config';
import { SHEET } from '../Sheet';
import { commit, save } from '../session';
import { OverlayHead, TABS_Y } from '../ui/chrome';
import { PH, PW, PX, PY } from '../ui/UnitPanel';
import { Button, label, plain, slab } from '../ui/widgets';

type Page = 'skills' | 'upgrades';
type Adder = <T extends Phaser.GameObjects.GameObject>(o: T) => T;

export interface PlayerData {
  page?: Page;
}

/** The color of each branch, for a node that has a rank in it. */
const BRANCH_MAT: Readonly<Record<Branch, Material>> = {
  root: ARCANE,
  war: FIRE,
  guard: FROST,
  craft: VENOM,
  fortune: HOLY,
};

/** Where a node stands on the screen, from its column and row in the tree. */
const NODE = 100;
function nodeAt(node: TreeNode): [number, number] {
  return [116 + node.at[0] * 176, 150 + node.at[1] * 128];
}

/** A share as a percent: "+12%". */
function percent(share: number): string {
  return `${Math.round(share * 1000) / 10}%`;
}

export class PlayerScene extends Phaser.Scene {
  private page: Page = 'skills';
  private selected = 'command';
  private head!: OverlayHead;
  private body: Phaser.GameObjects.GameObject[] = [];
  /** True once RESET has been pressed and asks to be pressed again. */
  private sure = false;

  constructor() {
    super('Player');
  }

  init(data: PlayerData): void {
    this.page = data.page ?? ((this.registry.get('playerPage') as Page | undefined) ?? 'skills');
    this.registry.set('playerPage', this.page);
    this.body = [];
    this.sure = false;
    const s = save();
    // It opens on a node that can take a point, if there is one: the first thing to do here.
    const open = pointsFree(s) > 0 ? TREE.find((n) => whyNoRank(s, n) === null) : undefined;
    this.selected = open?.id ?? (this.registry.get('playerNode') as string | undefined) ?? 'command';
  }

  create(): void {
    setupCamera(this);
    const s = save();
    this.head = new OverlayHead(this, this.page === 'skills' ? 'Skills' : 'Upgrades', s, () => commit());
    // The two pages, where the screens of cards have theirs.
    const tab = (x: number, w: number, text: string, of: Page): void => {
      const on = this.page === of;
      const b = new Button(this, x, TABS_Y, text, () => {
        if (!on) this.scene.restart({ page: of } satisfies PlayerData);
      }, { width: w, height: 46, size: 18, mat: on ? GOLD : BONE, color: on ? undefined : OUTLINE });
      if (!on) plain(b);
    };
    tab(104, 136, 'SKILLS', 'skills');
    tab(264, 164, 'UPGRADES', 'upgrades');
    this.redraw();
  }

  private redraw(): void {
    for (const o of this.body) o.destroy();
    this.body = [];
    const add: Adder = (o) => {
      this.body.push(o);
      return o;
    };
    const s = save();
    this.head.coins.refresh();
    // The player's level, how far it is to the next, and the points there are to spend.
    const p = s.player;
    const free = pointsFree(s);
    const next = p.level >= PLAYER_MAX_LEVEL ? 'the last level' : `${p.xp} of ${playerXpToNext(p.level)} to the next`;
    const points = free === 1 ? '1 point to spend' : `${free} points to spend`;
    add(label(this, 216, 40, `Level ${p.level}  ·  ${next}${this.page === 'skills' ? `  ·  ${points}` : ''}`, {
      size: 18, weight: 600, align: 'left', color: free > 0 && this.page === 'skills' ? HOLY.fill : HIGHLIGHT, strokeWidth: 4,
    }));
    if (this.page === 'skills') this.drawTree(add);
    else this.drawUpgrades(add);
  }

  // ------------------------------------------------------------ the tree

  private drawTree(add: Adder): void {
    const s = save();
    // The lines first, under the nodes: gold where the way is open, dark where it is not.
    const lines = add(this.add.graphics());
    for (const node of TREE) {
      if (!node.needs) continue;
      const from = treeNode(node.needs.node);
      if (!from) continue;
      const [x0, y0] = nodeAt(from);
      const [x1, y1] = nodeAt(node);
      const open = rankOf(s, from.id) >= node.needs.ranks;
      lines.lineStyle(14, hex(OUTLINE), 1).lineBetween(x0, y0, x1, y1);
      lines.lineStyle(6, hex(open ? GOLD.fill : IRON.fill), 1).lineBetween(x0, y0, x1, y1);
    }
    for (const node of TREE) {
      const [x, y] = nodeAt(node);
      const rank = rankOf(s, node.id);
      const why = whyNoRank(s, node);
      const shut = rank === 0 && why === 'needs';
      const mat: Material = shut ? IRON : rank > 0 ? BRANCH_MAT[node.branch] : BONE;
      const root = add(this.add.container(x, y));
      const g = this.add.graphics();
      slab(g, -NODE / 2, -NODE / 2, NODE, NODE, mat, 18, 7);
      root.add(g);
      const icon = this.add.image(0, -12, SHEET, `icon/${node.icon}`).setScale(0.58);
      if (shut) icon.setTint(hex(OUTLINE)).setTintMode(Phaser.TintModes.FILL).setAlpha(0.6);
      root.add(icon);
      // Its ranks, as pips along its foot: filled for the ones bought.
      const pipW = 12;
      const px0 = -((node.ranks - 1) * (pipW + 3)) / 2;
      const pips = this.add.graphics();
      for (let i = 0; i < node.ranks; i++) {
        pips.fillStyle(hex(OUTLINE), 1).fillRoundedRect(px0 + i * (pipW + 3) - pipW / 2 - 2, 26, pipW + 4, 14, 4);
        pips.fillStyle(hex(i < rank ? GOLD.fill : IRON.shade), 1).fillRoundedRect(px0 + i * (pipW + 3) - pipW / 2, 28, pipW, 10, 3);
      }
      root.add(pips);
      if (why === null) {
        // A point can go here: a mark in its corner says so.
        const dot = this.add.graphics();
        dot.fillStyle(hex(OUTLINE), 1).fillCircle(NODE / 2 - 10, -NODE / 2 + 10, 13);
        dot.fillStyle(hex(HOLY.fill), 1).fillCircle(NODE / 2 - 10, -NODE / 2 + 10, 9);
        root.add(dot);
      }
      root.setSize(NODE, NODE);
      root.setInteractive({ useHandCursor: true });
      root.on('pointerup', () => {
        this.selected = node.id;
        this.registry.set('playerNode', node.id);
        this.sure = false;
        sfx.play('click');
        this.redraw();
      });
      if (node.id === this.selected) {
        const ring = add(this.add.graphics());
        ring.lineStyle(5, hex(HIGHLIGHT), 1).strokeRoundedRect(x - NODE / 2 - 6, y - NODE / 2 - 6, NODE + 12, NODE + 12, 22);
      }
    }
    // The branches' names, at the head of each row.
    for (const branch of ['war', 'guard', 'craft', 'fortune'] as const) {
      const first = TREE.find((n) => n.branch === branch);
      if (!first) continue;
      const [x, y] = nodeAt(first);
      add(label(this, x, y - NODE / 2 - 16, BRANCH_NAME[branch].toUpperCase(), { size: 14, color: BRANCH_MAT[branch].fill, strokeWidth: 4 }));
    }
    this.drawNode(add);
  }

  /** The node on show, on the right: what it gives, what it needs, and the button that spends a point on it. */
  private drawNode(add: Adder): void {
    const s = save();
    const node = treeNode(this.selected) ?? TREE[0];
    const rank = rankOf(s, node.id);
    const why = whyNoRank(s, node);
    const cx = PX + PW / 2;
    const dark = { color: OUTLINE, stroke: null as null };
    const g = add(this.add.graphics());
    slab(g, PX, PY, PW, PH, BONE, 22, 8);
    slab(g, PX + 14, PY + 14, PW - 28, 132, BRANCH_MAT[node.branch], 16, 5);
    add(this.add.image(cx, PY + 78, SHEET, `icon/${node.icon}`).setScale(1));
    add(label(this, cx, PY + 174, node.name, { size: 28 }));
    add(label(this, cx, PY + 204, `${BRANCH_NAME[node.branch]}  ·  rank ${rank} of ${node.ranks}`, { size: 15, weight: 600, ...dark }));

    // What it gives: at the rank it has, and at the next.
    const said = (r: number): string => node.text.replace('{amount}', percent(node.perRank * r));
    let y = PY + 232;
    const now = add(label(this, PX + 24, y, rank > 0 ? said(rank) : said(1), { size: 15, weight: 600, align: 'left', wrap: PW - 48, ...dark }).setOrigin(0, 0));
    y += now.height + 10;
    if (rank > 0 && rank < node.ranks) {
      const then = add(label(this, PX + 24, y, `Next rank: ${percent(node.perRank * (rank + 1))}`, { size: 15, align: 'left', color: CLOTH.blue.shade, stroke: null }).setOrigin(0, 0));
      y += then.height + 10;
    }
    if (node.needs && rankOf(s, node.needs.node) < node.needs.ranks) {
      const from = treeNode(node.needs.node);
      add(label(this, PX + 24, y, `Needs ${node.needs.ranks} ${node.needs.ranks === 1 ? 'rank' : 'ranks'} of ${from?.name ?? '?'}.`, { size: 15, align: 'left', color: CLOTH.red.shade, stroke: null }).setOrigin(0, 0));
    }

    // Everything the player has, from every source, in one list.
    this.drawTotals(add, PY + 372);

    const by = PY + PH - 112;
    const text = why === null ? 'SPEND A POINT' : why === 'full' ? 'FULL' : why === 'needs' ? 'LOCKED' : 'NO POINTS';
    const up = new Button(this, cx, by, text, () => {
      if (rankUp(s, node.id)) {
        sfx.play('levelUp', 0.8, 1.1);
        commit();
        this.redraw();
      }
    }, { width: 300, height: 58, size: 24 });
    up.setEnabled(why === null);
    add(up.root);
    // Every point back, to be spent again. It asks once.
    const spent = TREE.some((n) => rankOf(s, n.id) > 0);
    const reset = plain(new Button(this, cx, by + 66, this.sure ? 'SURE? PRESS AGAIN' : 'TAKE EVERY POINT BACK', () => {
      if (!this.sure) {
        this.sure = true;
        this.redraw();
        return;
      }
      resetTree(s);
      commit();
      this.sure = false;
      this.redraw();
    }, { width: 300, height: 50, size: 17, mat: BONE, color: OUTLINE }));
    reset.setEnabled(spent);
    add(reset.root);
  }

  /** What every source adds up to, effect by effect: the one list of all the player's bonuses. */
  private drawTotals(add: Adder, y: number): void {
    const s = save();
    const dark = { color: OUTLINE, stroke: null as null };
    add(label(this, PX + 24, y, 'ALL YOU HAVE', { size: 14, align: 'left', color: IRON.shade, stroke: null }).setOrigin(0, 0.5));
    const all = bonuses(s);
    if (all.length === 0) {
      add(label(this, PX + 24, y + 26, 'Nothing yet. A level is a point, and coins buy upgrades.', { size: 14, weight: 600, align: 'left', wrap: PW - 48, ...dark }).setOrigin(0, 0));
      return;
    }
    all.forEach((b, i) => {
      const parts = bonusParts(s, b.effect).map((part) => `${part.name.toLowerCase()} ${percent(part.amount)}`).join(', ');
      const line = `${b.effect === 'packCost' ? '' : '+'}${percent(b.amount)} ${EFFECT_NAME[b.effect]}`;
      add(label(this, PX + 24, y + 26 + i * 22, line, { size: 15, align: 'left', ...dark }).setOrigin(0, 0.5));
      add(label(this, PX + PW - 24, y + 26 + i * 22, parts, { size: 12, weight: 600, align: 'right', color: IRON.shade, stroke: null }));
    });
  }

  // ------------------------------------------------------------ the upgrades

  private drawUpgrades(add: Adder): void {
    const s = save();
    const dark = { color: OUTLINE, stroke: null as null };
    const x = 30;
    const w = 836;
    const h = 100;
    UPGRADES.forEach((up, i) => {
      const y = 82 + i * (h + 10);
      const level = upgradeLevel(s, up.id);
      const cost = upgradeCost(s, up);
      const g = add(this.add.graphics());
      slab(g, x, y, w, h, BONE, 16, 6);
      slab(g, x + 12, y + 12, 76, 76, level > 0 ? GOLD : IRON, 12, 4);
      add(this.add.image(x + 50, y + 48, SHEET, `icon/${up.icon}`).setScale(0.62));
      add(label(this, x + 106, y + 28, up.name, { size: 22, align: 'left' }));
      add(label(this, x + 106, y + 56, up.text.replace('{amount}', percent(up.perLevel * Math.max(1, level))).replace(/\.$/, level > 0 ? '.' : ', a level.'), { size: 14, weight: 600, align: 'left', ...dark }));
      // What the next level makes it: the first, for one not bought yet, which gives nothing so far.
      const then = level >= up.levels ? '' : level > 0 ? `  ·  next: ${percent(up.perLevel * (level + 1))}` : '  ·  not bought yet';
      add(label(this, x + 106, y + 78, `Level ${level} of ${up.levels}${then}`, { size: 14, align: 'left', color: CLOTH.blue.shade, stroke: null }));
      if (cost === null) {
        add(label(this, x + w - 110, y + h / 2, 'ALL BOUGHT', { size: 20, color: GOLD.shade, stroke: null }));
        return;
      }
      const b = new Button(this, x + w - 110, y + h / 2, `     ${cost}`, () => {
        if (buyUpgrade(s, up.id)) {
          sfx.play('buy');
          commit();
          this.redraw();
        }
      }, { width: 180, height: 60, size: cost >= 100000 ? 18 : 22, mat: VENOM });
      b.root.add(this.add.image(-66, -3, SHEET, 'icon/coin').setScale(0.36));
      b.setEnabled(s.coins >= cost);
      add(b.root);
    });
    // On the right, what it all adds up to.
    const g = add(this.add.graphics());
    slab(g, PX, PY, PW, PH, BONE, 22, 8);
    add(label(this, PX + PW / 2, PY + 40, 'Upgrades', { size: 28 }));
    add(label(this, PX + 24, PY + 74, 'Coins buy these for good. Each level costs more than the last, and what they give is added to what the skill tree gives.', {
      size: 15, weight: 600, align: 'left', wrap: PW - 48, ...dark,
    }).setOrigin(0, 0));
    this.drawTotals(add, PY + 190);
  }
}
