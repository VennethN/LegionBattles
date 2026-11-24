// The player's cards, and who of them fights. It opens over the field.
// Pressing a card shows what it is and does; from there it is put in the
// team or taken out. FILL TEAM fields the strongest.
//
// A unit the player does not know is its own outline in the dark, named
// "???", and nothing else about it is told.

import Phaser from 'phaser';
import { BONE, CLOTH, GOLD, HIGHLIGHT, IRON, OUTLINE, VENOM } from '../../art/kit/palette';
import { PACKS } from '../../data/packs';
import { SETS, UNITS, type UnitInfo } from '../../data/units';
import { MAX_LEVEL, RARITIES, RARITY, cardMult, xpToNext } from '../../game/rarity';
import { bestTeam, inTeam, known, teamSize, toggleTeam } from '../../game/rules';
import { markSeen, seen } from '../../game/tutorial';
import { STATUS } from '../../sim/status';
import { setupCamera } from '../app';
import { hex } from '../config';
import { SHEET } from '../Sheet';
import { commit, save } from '../session';
import { OverlayHead } from '../ui/chrome';
import { RARITY_MAT } from '../ui/colors';
import { gradeBadge } from '../ui/grade';
import { Guide } from '../ui/Guide';
import { portrait, unitCard } from '../ui/UnitCard';
import { Button, label, plain, slab } from '../ui/widgets';

const SET_ORDER = Object.keys(SETS);

function ordered(): UnitInfo[] {
  return Object.values(UNITS).sort(
    (a, b) =>
      SET_ORDER.indexOf(a.set) - SET_ORDER.indexOf(b.set) ||
      RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity) ||
      a.name.localeCompare(b.name),
  );
}

export class TeamScene extends Phaser.Scene {
  private selected = '';
  private detail: Phaser.GameObjects.GameObject[] = [];
  private guide!: Guide;

  constructor() {
    super('Team');
  }

  init(data: { selected?: string }): void {
    const s = save();
    this.selected = data.selected ?? (this.registry.get('selected') as string | undefined) ?? s.team[0]?.unit ?? Object.keys(s.cards)[0] ?? 'knight';
    this.detail = [];
  }

  create(): void {
    setupCamera(this);
    const s = save();
    const head = new OverlayHead(this, 'Your Team', s, () => {
      // The tutorial's look at the team is over once it has been filled and shut.
      if (seen(s, 'fill')) markSeen(s, 'team');
      commit();
    });
    label(this, 250, 40, `${s.team.length} of ${teamSize(s)} in the team`, { size: 20, weight: 600, align: 'left', color: HIGHLIGHT, strokeWidth: 4 });

    const fill = plain(new Button(this, 640, 38, 'FILL TEAM', () => {
      s.team = bestTeam(s);
      markSeen(s, 'fill');
      commit();
      this.scene.restart({ selected: this.selected });
    }, { width: 170, height: 46, size: 20, mat: BONE, color: OUTLINE }));

    const units = ordered();
    const cols = 6;
    const pitch = 140;
    units.forEach((u, i) => {
      const x = 30 + 66 + (i % cols) * pitch;
      const y = 78 + 67 + Math.floor(i / cols) * pitch;
      const card = unitCard(this, x, y, u.id, s);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerup', () => {
        this.selected = u.id;
        this.registry.set('selected', u.id);
        this.showDetail();
        ring.setPosition(x, y).setVisible(true);
      });
    });
    const ring = this.add.graphics().setDepth(50);
    ring.lineStyle(5, hex(HIGHLIGHT), 1).strokeRoundedRect(-69, -70, 138, 140, 16);
    const at = units.findIndex((u) => u.id === this.selected);
    if (at >= 0) ring.setPosition(30 + 66 + (at % cols) * pitch, 78 + 67 + Math.floor(at / cols) * pitch);
    else ring.setVisible(false);

    this.showDetail();

    this.guide = new Guide(this, 'Team');
    this.guide.mark('fill', () => fill.rect);
    this.guide.mark('close', () => head.close.rect);
    this.guide.refresh();
  }

  private showDetail(): void {
    for (const o of this.detail) o.destroy();
    this.detail = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.detail.push(o);
      return o;
    };
    const s = save();
    const def = UNITS[this.selected];
    if (!def) return;
    const card = s.cards[def.id];
    const isKnown = known(s, def);
    const px = 884;
    const py = 78;
    const pw = 372;
    const ph = 620;
    const cx = px + pw / 2;
    const g = add(this.add.graphics());
    slab(g, px, py, pw, ph, BONE, 22, 8);
    slab(g, px + 14, py + 14, pw - 28, 150, isKnown ? RARITY_MAT[def.rarity] : IRON, 16, 5);
    add(portrait(this, cx, py + 154, def.id, 'blue', 128, !isKnown));

    const dark = { color: OUTLINE, stroke: null as null };
    if (!isKnown) {
      add(label(this, cx, py + 200, '???', { size: 30 }));
      add(label(this, cx, py + 260, 'You have not met this one yet.\nBeat it in battle and packs\ncan turn it over.', { size: 18, weight: 600, ...dark }));
      return;
    }

    add(label(this, cx, py + 190, def.name, { size: def.name.length > 14 ? 24 : 28 }));
    add(label(this, cx, py + 220, `${RARITY[def.rarity].name}  ·  ${SETS[def.set].name}`, { size: 15, weight: 600, ...dark }));

    const m = card ? cardMult(card.grade, card.level) : 1;
    if (card) {
      add(gradeBadge(this, px + 62, py + 252, card.grade, 26));
      add(label(this, px + 118, py + 252, `Level ${card.level}`, { size: 18, align: 'left', ...dark }));
      // Experience toward the next level.
      const bw = 120;
      const need = xpToNext(card.level);
      const share = card.level >= MAX_LEVEL ? 1 : Math.min(1, card.xp / need);
      const bar = add(this.add.graphics());
      bar.fillStyle(hex(OUTLINE), 1).fillRoundedRect(px + pw - 24 - bw - 3, py + 243, bw + 6, 18, 8);
      bar.fillStyle(hex(IRON.fill), 1).fillRoundedRect(px + pw - 24 - bw, py + 246, bw, 12, 5);
      if (share > 0.03) bar.fillStyle(hex(VENOM.fill), 1).fillRoundedRect(px + pw - 24 - bw, py + 246, bw * share, 12, 5);
    } else {
      const pack = PACKS.find((p) => p.set === def.set);
      add(label(this, cx, py + 252, `Not held yet. Found in the ${pack ? pack.name : 'packs'}.`, { size: 16, weight: 600, color: CLOTH.red.shade, stroke: null }));
    }

    // Its numbers, as it would fight now.
    const stats: Array<[string, string]> = [
      ['icon/heart', `${Math.round(def.hp * m)}`],
      ['icon/sword', def.heal ? `${Math.round(def.heal.amount * m)} heal` : `${Math.round(def.damage * m)}`],
      ['icon/hourglass', `${def.attackInterval} s`],
      ['icon/range', def.range <= 1.6 ? 'melee' : `${def.range} tiles`],
      ['icon/shield', `${Math.round(def.armor)}`],
      ['icon/boot', `${def.speed}`],
    ];
    stats.forEach(([icon, text], i) => {
      const x = px + 30 + (i % 3) * 114;
      const y = py + 292 + Math.floor(i / 3) * 32;
      add(this.add.image(x, y, SHEET, icon).setScale(0.3));
      add(label(this, x + 18, y, text, { size: 16, weight: 600, align: 'left', ...dark }));
    });

    // What it says of itself, then its skill: each under the last, however long they run.
    let y = py + 350;
    if (def.text) {
      const t = add(label(this, px + 24, y, def.text, { size: 14, weight: 600, align: 'left', wrap: pw - 48, color: IRON.shade, stroke: null }).setOrigin(0, 0));
      y += t.height + 10;
    }
    if (def.skill) {
      const sk = def.skill;
      add(this.add.image(px + 32, y + 10, SHEET, 'icon/spark').setScale(0.3));
      add(label(this, px + 50, y + 10, `${sk.name}  (every ${sk.cooldown} s)`, { size: 17, align: 'left', color: CLOTH.blue.shade, stroke: null }));
      y += 24;
      let text = sk.text;
      if (sk.status) text += ` ${STATUS[sk.status.id].name}: ${STATUS[sk.status.id].text}`;
      add(label(this, px + 24, y, text, { size: 14, weight: 600, align: 'left', wrap: pw - 48, ...dark }).setOrigin(0, 0));
    }

    if (card) {
      const on = inTeam(s, def.id);
      const full = !on && s.team.length >= teamSize(s);
      const b = new Button(this, cx, py + ph - 50, on ? 'TAKE OUT' : full ? 'TEAM IS FULL' : 'PUT IN TEAM', () => {
        if (toggleTeam(s, def.id)) {
          commit();
          this.scene.restart({ selected: def.id });
        }
      }, { width: 260, height: 62, size: 24, mat: on ? CLOTH.red : GOLD });
      if (full) b.setEnabled(false);
      add(b.root);
    }
  }
}
