// The Hold: what the player keeps between runs, shown plainly. A tab for
// each part of it (each hero's mastery, the companions and their slots,
// the armory, vows, quests, the Codex, the daily run), and under the tabs
// a list: each thing with what it is, what unlocks it, and a button where
// there is a choice. It shows the save and asks the Hold's rules
// (game/hold.ts) for everything.
//
// It is the plainest thing that works: the screens agent draws the real
// one. What is locked is dark, with "???" and what unlocks it.

import Phaser from 'phaser';
import { BONE, BUSH, GOLD, HOLY, IRON, LEATHER, OUTLINE, RUBY, type Material } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { BAND, COMPANIONS, CRATES, HEROES, PAY, VOWS, byId } from '../../game/data';
import {
  badge, chronicleOf, crateThings, dailyOf, dailyTaken, deedsOf, epithetOf, featSays, friendRows, masteryLevel, met, nextLevel, nextSlot, pickGift, slotsOf, toggleVow,
  trackRows, vowsNext, vowsOpen, type TrackRow,
} from '../../game/hold';
import { LEVEL_XP, type Gift } from '../../game/mastery';
import { STAT_INFO } from '../../game/stats';
import { SLOT_WAVES } from '../../game/companions';
import { isFriend, isOpen, setBand, type SaveData } from '../../game/state';
import { relicIcon, statIcon, weaponIcon } from '../icons';
import { CARDS, portraitFrame } from '../art/Sheet';
import { heading } from '../ui/widgets';
import { setupCamera } from '../app';
import { hex, view } from '../config';
import { SHEET } from '../art/Sheet';
import { commit, save, startDaily } from '../session';
import { slabImage } from '../ui/bake';
import { Button, label } from '../ui/widgets';

const TABS = ['HEROES', 'COMPANIONS', 'ARMORY', 'VOWS', 'QUESTS', 'CODEX', 'DAILY'] as const;

/** The day as the day's road counts it: the same day for everyone, wherever they are. */
const today = (): string => new Date().toISOString().slice(0, 10);
type Tab = (typeof TABS)[number];

/** One line of a list: what it is, what there is to say of it, and at its right a button, or a word where there is nothing to press. */
interface Row {
  title: string;
  says: string;
  /** True for what is not open: it is drawn dark. */
  dark?: boolean;
  /** A heading between rows, with nothing at its right. */
  head?: boolean;
  button?: { text: string; can: boolean; press: () => boolean; mat?: Material };
  note?: string;
}

export class HoldScene extends Phaser.Scene {
  private root!: Phaser.GameObjects.Container;
  private tab: Tab = 'HEROES';
  private page = 0;
  /** The hero whose track is shown, and the level picked out on it. */
  private hero = '';
  private level = -1;
  /** The companion last pressed on the COMPANIONS tab, said at its foot. */
  private picked = '';

  constructor() {
    super('Hold');
  }

  create(data: { tab?: Tab } = {}): void {
    setupCamera(this);
    this.cameras.main.setBackgroundColor('#2e2218');
    this.tab = data.tab && TABS.includes(data.tab) ? data.tab : 'HEROES';
    this.page = 0;
    const s = save();
    this.hero = isOpen(s, s.last) ? s.last : 'wren';
    this.level = -1;
    this.root = this.add.container(0, 0);
    music.play('meadow', 'calm');
    this.draw();
  }

  private put<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.root.add(o);
    return o;
  }

  private text(x: number, y: number, t: string, o: Parameters<typeof label>[4] = {}): Phaser.GameObjects.Text {
    return this.put(label(this, x, y, t, o));
  }

  private draw(): void {
    this.root.removeAll(true);
    const s = save();
    const tall = view.tall;
    const pad = 14;
    // The head: where this is, on the screens' ribbon, and the way back.
    for (const o of heading(this, tall ? 110 : 120, 30, 'THE HOLD')) this.put(o);
    this.put(new Button(this, view.w - pad - (tall ? 42 : 66), 30, 'BACK', () => this.scene.start('Title'), { width: tall ? 84 : 132, height: 44, size: 18, mat: IRON }).root);
    // What the last run paid, once there has been one.
    let y = 62;
    if (s.tally) {
      const lines = s.tally.lines.map((l) => `${l.why}${l.count > 1 ? ` ${l.count}` : ''} +${l.xp}`).join(', ');
      const who = HEROES.find((h) => h.id === s.tally?.hero)?.short ?? 'Your hero';
      const t = this.text(pad, y, `The last run gave ${who} ${s.tally.total} mastery: ${lines}.`, { size: 15, align: 'left', color: BONE.shade, strokeWidth: 3, wrap: view.w - pad * 2 });
      t.setOrigin(0, 0);
      y += t.height + 10;
    } else {
      const t = this.text(pad, y, `Every run gives its hero mastery: ${PAY.wave} a wave cleared, ${PAY.boss} a boss, more for quests. Mastery unlocks upgrades for that hero.`, { size: 15, align: 'left', color: BONE.shade, strokeWidth: 3, wrap: view.w - pad * 2 });
      t.setOrigin(0, 0);
      y += t.height + 10;
    }
    // The tabs: one row on a wide screen, two on a tall one.
    const perRow = tall ? 4 : TABS.length;
    const tw = (view.w - pad * 2 - (perRow - 1) * 6) / perRow;
    TABS.forEach((tab, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const b = new Button(this, pad + tw / 2 + col * (tw + 6), y + 22 + row * 50, tab, () => {
        this.tab = tab;
        this.page = 0;
        sfx.play('click', 0.5);
        this.draw();
      }, { width: tw, height: 44, size: 15, mat: tab === this.tab ? GOLD : LEATHER });
      this.put(b.root);
    });
    y += Math.ceil(TABS.length / perRow) * 50 + 6;
    if (this.tab === 'HEROES') this.track(s, y);
    else if (this.tab === 'COMPANIONS') this.band(s, y);
    else this.list(this.rows(s), y);
  }

  /** The rows of the tab that is open. */
  private rows(s: SaveData): Row[] {
    switch (this.tab) {
      case 'HEROES':
        // Each hero unlocked, with their mastery track: what each level gives, reached or not, and the picks.
        return HEROES.flatMap((h): Row[] => {
          if (!isOpen(s, h.id)) return [{ title: '???', says: h.unlock ? `Unlock: ${featSays(h.unlock)}` : '', dark: true }];
          const won = badge(s, h.id);
          const next = nextLevel(s, h.id);
          const rows: Row[] = [{
            title: `${h.name}, ${epithetOf(s, h.id)}: mastery level ${masteryLevel(s, h.id)}`,
            says: `${next ? `${next.left} mastery to the next level.` : 'Mastery full.'}${won === null ? '' : won.length === 0 ? ' Has won.' : ` Has won with ${won.length} ${won.length === 1 ? 'vow' : 'vows'}.`}`,
            head: true,
          }];
          for (const r of trackRows(s, h.id)) {
            if (r.gifts.length === 1) rows.push({ title: `Level ${r.level}`, says: r.gifts[0].says, dark: !r.reached, note: r.reached ? 'UNLOCKED' : `${r.xp}` });
            else r.gifts.forEach((g, i) => rows.push({
              title: `Level ${r.level}, pick ${i + 1} of 2`, says: g.says, dark: !r.reached,
              button: { text: g.picked ? 'PICKED' : 'PICK', can: !g.picked, press: () => pickGift(s, h.id, r.level - 1, i), mat: g.picked ? BUSH : GOLD },
            }));
          }
          return rows;
        });
      case 'COMPANIONS': {
        const slots = slotsOf(s);
        const next = nextSlot(s);
        return [
          { title: `Companion slots: ${slots} of ${BAND.places}`, says: next ? `The next slot unlocks at best wave ${next}.` : 'Every slot is unlocked.', note: next ? `WAVE ${next}` : 'ALL' },
          ...friendRows(s).map((f): Row => (f.unlocked ? { title: `${f.def.name}, ${f.def.kind}`, says: `${f.def.says} ${f.def.quirkName}: ${f.def.quirkSays}`, note: 'UNLOCKED' } : { title: '???', says: f.how, dark: true, note: f.share > 0 ? `${Math.floor(f.share * 100)}%` : '' })),
        ];
      }
      case 'ARMORY':
        return CRATES.map((c): Row => {
          const open = s.crates.includes(c.id);
          const things = crateThings(s, c).map((t) => t.name).join(', ');
          return { title: c.name, says: open ? `${c.says} ${things}.` : `${things}. Unlock: ${c.deedSays}`, dark: !open, note: open ? 'UNLOCKED' : 'LOCKED' };
        });
      case 'VOWS': {
        const open = vowsOpen(s);
        const next = vowsNext(s);
        return [
          { title: 'Vows', says: `Vows are optional challenges for more mastery. Each one sworn pays ${Math.round(PAY.vow * 100)}% more. Sworn now: ${s.vows.length}.`, head: false },
          ...VOWS.map((v, i): Row => {
            if (open.includes(v.id)) {
              const sworn = s.vows.includes(v.id);
              return { title: v.name, says: v.says, button: { text: sworn ? 'SWORN' : 'SWEAR', can: true, press: () => toggleVow(s, v.id), mat: sworn ? BUSH : GOLD } };
            }
            // The first that is shut says what opens it; those past it say nothing yet.
            return { title: '???', says: i === open.length ? next : '', dark: true };
          }),
        ];
      }
      case 'QUESTS':
        return deedsOf(s).map((d): Row => ({
          title: d.name,
          says: d.opens && d.kind !== 'opens' ? `${d.says} Unlocks ${d.opens}.` : d.says,
          dark: !d.done && d.name === '???',
          note: d.done ? 'DONE' : d.xp > 0 ? `+${d.xp}${d.share > 0 ? `  ${Math.floor(d.share * 100)}%` : ''}` : d.kind === 'crate' ? 'CRATE' : `UNLOCKS ${d.opens.toUpperCase()}`,
        }));
      case 'CODEX':
        // What has been met is listed; the rest of each kind is one dark line, so that the list is as long as what there is to read.
        return chronicleOf(s).flatMap((p): Row[] => [
          { title: `${p.title}: ${p.met} of ${p.entries.length} met`, says: '', head: true },
          ...p.entries.filter((e) => e.met).map((e): Row => ({ title: e.name, says: e.says, note: e.count > 0 ? `${e.count} ${e.counted}`.toUpperCase() : '' })),
          ...(p.met < p.entries.length ? [{ title: '???', says: `${p.entries.length - p.met} more not met yet.`, dark: true }] : []),
        ]);
      case 'DAILY': {
        const date = today();
        const d = dailyOf(date);
        const hero = byId(HEROES, d.hero);
        const friend = byId(COMPANIONS, d.band[0]);
        // Whoever has not been met is not named: the road itself is the way to meet them.
        const who = `${met(s, 'hero', hero.id) ? hero.name : 'A hero not yet met'} with ${met(s, 'friend', friend.id) ? friend.name : 'a companion not yet met'}`;
        const taken = dailyTaken(s, date);
        return [
          {
            title: `The road of ${date}`,
            says: `${who}. One run a day, the same for everyone: the whole armory, nothing from the board, no vow.`,
            button: taken ? undefined : { text: 'SET OUT', can: true, press: () => (this.setOut(date), false) },
            note: taken && s.daily ? `WAVE ${s.daily.wave}` : undefined,
          },
          { title: `Furthest on any day's road: wave ${s.dailyBest}`, says: taken && s.daily ? `Today: wave ${s.daily.wave}, in ${Math.floor(s.daily.seconds / 60)} min ${s.daily.seconds % 60} s of fighting.` : 'Not taken today.' },
        ];
      }
    }
  }

  /** A picture standing for what a level of a track gives. */
  private giftIcon(hero: string, g: Gift): string {
    switch (g.kind) {
      case 'stat':
        return statIcon(STAT_INFO[g.stat].icon);
      case 'skill':
        return 'icon/star';
      case 'perk':
        return 'icon/crown';
      case 'way':
        return weaponIcon(byId(HEROES, hero).weapon);
      case 'relic':
        return relicIcon(g.relic);
      case 'title':
        return 'icon/laurel';
    }
  }

  /** Something that can be pressed: a box over what is drawn, which calls `then`. */
  private hit(x: number, y: number, w: number, h: number, then: () => void): void {
    const z = this.put(this.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true }));
    z.on('pointerup', () => {
      sfx.play('click', 0.5);
      then();
    });
  }

  /** A unit's portrait fitted to a box, dark as its own outline when it is locked. */
  private portrait(unit: string, cx: number, bottom: number, w: number, h: number, dark: boolean): void {
    const img = this.put(this.add.image(cx, bottom, CARDS, portraitFrame('blue', unit))).setOrigin(0.5, 1);
    img.setScale(Math.min(h / (img.frame.height || 1), w / (img.frame.width || 1)));
    if (dark) img.setTint(hex(OUTLINE)).setAlpha(0.85);
  }

  /**
   * The HEROES tab: a row of the heroes, and the chosen one's mastery track drawn as a path of its levels, each a
   * medallion with what it gives, lit once it is reached. A level pressed says what it gives below the path, and
   * where it is a pick of two, shows the two side by side to choose from.
   */
  private track(s: SaveData, top: number): void {
    const tall = view.tall;
    const W = view.w;
    const H = view.h;
    const pad = 14;
    // The heroes, in one row or two.
    const perRow = tall ? 5 : HEROES.length;
    const cell = Math.min(tall ? 92 : 78, (W - pad * 2) / perRow - 6);
    const ch = tall ? 78 : 66;
    HEROES.forEach((h, i) => {
      const x = pad + (i % perRow) * (cell + 6) + ((W - pad * 2) - perRow * (cell + 6) + 6) / 2;
      const y = top + Math.floor(i / perRow) * (ch + 6);
      const open = isOpen(s, h.id);
      const chosen = h.id === this.hero;
      this.put(slabImage(this, x, y, cell, ch, chosen ? GOLD : open ? BONE : IRON, 10, 4));
      this.portrait(h.unit, x + cell / 2, y + ch - 20, cell - 10, ch - 26, !open);
      this.text(x + cell / 2, y + ch - 11, open ? `${h.short.split(' ').pop()} ${masteryLevel(s, h.id)}` : '???', { size: 15, color: chosen ? OUTLINE : open ? OUTLINE : BONE.fill, stroke: chosen || open ? null : OUTLINE, strokeWidth: 3 });
      this.hit(x, y, cell, ch, () => {
        this.hero = h.id;
        this.level = -1;
        this.draw();
      });
    });
    let y0 = top + Math.ceil(HEROES.length / perRow) * (ch + 6) + 4;
    const hero = byId(HEROES, this.hero);
    const open = isOpen(s, hero.id);
    // The hero's card: who they are, their title, their level and how far to the next.
    const cardW = tall ? W - pad * 2 : 232;
    const cardH = tall ? 168 : H - y0 - pad;
    this.put(slabImage(this, pad, y0, cardW, cardH, BONE, 14, 6));
    const ink = OUTLINE;
    if (!open) {
      this.portrait(hero.unit, pad + (tall ? 60 : cardW / 2), y0 + (tall ? cardH - 14 : 150), 100, 120, true);
      this.text(pad + (tall ? 130 : 18), y0 + (tall ? 40 : 180), '???', { size: 24, align: 'left', color: ink, stroke: null });
      const t = this.text(pad + (tall ? 130 : 18), y0 + (tall ? 62 : 204), hero.unlock ? `Unlock: ${featSays(hero.unlock)}` : '', { size: 15, align: 'left', color: ink, stroke: null, wrap: tall ? cardW - 150 : cardW - 36, weight: 600 });
      t.setOrigin(0, 0);
      return;
    }
    const lv = masteryLevel(s, hero.id);
    const next = nextLevel(s, hero.id);
    const from = lv > 0 ? LEVEL_XP[lv - 1] : 0;
    const tx = tall ? pad + 124 : pad + 18;
    let ty = tall ? y0 + 26 : y0 + 150;
    this.portrait(hero.unit, pad + (tall ? 62 : cardW / 2), y0 + (tall ? cardH - 12 : 136), tall ? 100 : 150, tall ? 108 : 120, false);
    const name = this.text(tx, ty, hero.name, { size: 20, align: 'left', color: ink, stroke: null });
    name.setScale(Math.min(1, (cardW - (tx - pad) - 16) / Math.max(1, name.width)));
    ty += 24;
    this.text(tx, ty, epithetOf(s, hero.id), { size: 16, align: 'left', color: '#7a5a12', stroke: null });
    ty += 28;
    this.text(tx, ty, `MASTERY LEVEL ${lv}`, { size: 18, align: 'left', color: ink, stroke: null });
    ty += 20;
    const bw = cardW - (tx - pad) - 18;
    const g = this.put(this.add.graphics());
    g.fillStyle(hex(OUTLINE), 1).fillRoundedRect(tx, ty, bw, 14, 5);
    const share = next ? (next.xp - from) / Math.max(1, next.need - from) : 1;
    g.fillStyle(hex(GOLD.fill), 1).fillRoundedRect(tx + 2, ty + 2, Math.max(6, (bw - 4) * share), 10, 4);
    ty += 30;
    this.text(tx, ty, next ? `${next.xp} / ${next.need} mastery` : 'Track complete', { size: 15, align: 'left', color: ink, stroke: null, weight: 600 });
    if (!tall) {
      ty += 22;
      const won = badge(s, hero.id);
      const t = this.text(tx, ty, `Every run with ${hero.short} gives mastery: ${PAY.wave} a wave, ${PAY.boss} a boss, more for quests.${won === null ? '' : won.length === 0 ? ' Has won a run.' : ` Has won with ${won.length} ${won.length === 1 ? 'vow' : 'vows'}.`}`, { size: 15, align: 'left', color: '#4a3a2a', stroke: null, wrap: bw, weight: 600 });
      t.setOrigin(0, 0);
    }
    // The path of the track, right of the card or under it.
    const ax = tall ? pad : pad + cardW + 12;
    const aw = W - ax - pad;
    const ay = tall ? y0 + cardH + 8 : y0;
    const rows = trackRows(s, hero.id);
    const cols = tall ? 4 : 6;
    const lines = Math.ceil(rows.length / cols);
    const step = aw / cols;
    const r = Math.min(27, step / 2 - 10);
    const rowH = r * 2 + 34;
    const at = (i: number): [number, number] => {
      const row = Math.floor(i / cols);
      const col = row % 2 === 0 ? i % cols : cols - 1 - (i % cols);
      return [ax + step * (col + 0.5), ay + 12 + r + row * rowH];
    };
    // Picked out at first: a pick reached and never made, which the player should see; else the next level to reach,
    // what they are walking toward.
    if (this.level < 0 || this.level >= rows.length) {
      const made = s.picks[hero.id] ?? {};
      const open = rows.findIndex((row, i) => row.reached && row.gifts.length > 1 && made[i] === undefined);
      this.level = open >= 0 ? open : Math.min(rows.length - 1, lv);
    }
    const path = this.put(this.add.graphics());
    for (let i = 1; i < rows.length; i++) {
      const [x1, y1] = at(i - 1);
      const [x2, y2] = at(i);
      path.lineStyle(10, hex(OUTLINE), 1).lineBetween(x1, y1, x2, y2);
      path.lineStyle(5, hex(rows[i].reached ? GOLD.fill : IRON.shade), 1).lineBetween(x1, y1, x2, y2);
    }
    rows.forEach((row: TrackRow, i) => {
      const [x, y] = at(i);
      const isNext = i === lv;
      const fill = row.reached ? GOLD.fill : isNext ? BONE.fill : IRON.fill;
      const disc = this.put(this.add.graphics());
      if (i === this.level) disc.fillStyle(hex(HOLY.light), 1).fillCircle(x, y, r + 7);
      disc.fillStyle(hex(OUTLINE), 1).fillCircle(x, y, r + 3);
      disc.fillStyle(hex(fill), 1).fillCircle(x, y, r);
      disc.fillStyle(0xffffff, 0.25).fillCircle(x - r * 0.25, y - r * 0.3, r * 0.45);
      // A level with a pick shows both its pictures, the one picked in front.
      const gifts = row.gifts.length > 1 ? row.gifts : [row.gifts[0]];
      gifts.forEach((gf, j) => {
        const icon = this.put(this.add.image(gifts.length > 1 ? x + (j === 0 ? -r * 0.32 : r * 0.32) : x, y, SHEET, this.giftIcon(hero.id, gf.gift)));
        icon.setScale(((r * (gifts.length > 1 ? 1.05 : 1.45)) / Math.max(1, icon.frame.height)));
        if (!row.reached) icon.setTint(isNext ? 0xd8cfc0 : 0x6b6b6b);
      });
      this.text(x, y + r + 12, row.gifts.length > 1 ? `${row.level}: PICK` : String(row.level), { size: 15, color: row.reached ? GOLD.fill : BONE.fill });
      this.hit(x - r - 4, y - r - 4, r * 2 + 8, r * 2 + 26, () => {
        this.level = i;
        this.draw();
      });
    });
    // What the picked-out level gives, under the path.
    const dy = ay + 12 + lines * rowH;
    // On a tall screen the box is as tall as what it may hold, not the rest of the screen.
    const dh = Math.min(H - dy - pad, tall ? 220 : H);
    if (dh < 60) return;
    const row = rows[this.level];
    this.put(slabImage(this, ax, dy, aw, dh, BONE, 12, 5));
    const head = row.reached ? `LEVEL ${row.level}: UNLOCKED` : `LEVEL ${row.level}: ${row.xp} MASTERY`;
    this.text(ax + 16, dy + 22, head, { size: 17, align: 'left', color: row.reached ? '#2e5f45' : ink, stroke: null });
    if (row.gifts.length === 1) {
      const t = this.text(ax + 16, dy + 38, row.gifts[0].says, { size: 16, align: 'left', color: ink, stroke: null, wrap: aw - 32, weight: 600 });
      t.setOrigin(0, 0);
      return;
    }
    // A pick of two: side by side, the one in use marked, and either can be taken again at any time once reached.
    const cw = (aw - 32 - 10) / 2;
    row.gifts.forEach((gf, j) => {
      const cx0 = ax + 16 + j * (cw + 10);
      const cy0 = dy + 38;
      const chh = dh - 46;
      this.put(slabImage(this, cx0, cy0, cw, chh, gf.picked && row.reached ? GOLD : BONE, 10, 4));
      const icon = this.put(this.add.image(cx0 + 24, cy0 + 22, SHEET, this.giftIcon(hero.id, gf.gift)));
      icon.setScale(30 / Math.max(1, icon.frame.height));
      const t = this.text(cx0 + 44, cy0 + 8, gf.says, { size: 15, align: 'left', color: ink, stroke: null, wrap: cw - 52, weight: 600 });
      t.setOrigin(0, 0);
      if (chh >= 88) {
        const b = new Button(this, cx0 + cw / 2, cy0 + chh - 24, gf.picked ? 'PICKED' : 'PICK', () => {
          if (!pickGift(s, hero.id, row.level - 1, j)) return;
          commit();
          sfx.play('claim', 0.7);
          this.draw();
        }, { width: Math.min(140, cw - 16), height: 38, size: 16, mat: gf.picked ? BUSH : GOLD });
        b.setEnabled(row.reached && !gf.picked);
        this.put(b.root);
      }
    });
  }

  /**
   * The COMPANIONS tab: the six slots of the band, open or not, with who is in each, and under them every companion,
   * unlocked or not. A companion pressed goes into the band, or out of it; a locked one says how it is unlocked.
   */
  private band(s: SaveData, top: number): void {
    const tall = view.tall;
    const W = view.w;
    const H = view.h;
    const pad = 14;
    const slots = slotsOf(s);
    const next = nextSlot(s);
    const ink = OUTLINE;
    const say = this.text(pad + 4, top + 10, next ? `Companion slots: ${slots} of ${BAND.places}. The next unlocks at best wave ${next}.` : `Companion slots: all ${BAND.places} unlocked.`, { size: 16, align: 'left', color: BONE.fill });
    say.setOrigin(0, 0.5);
    // The slots.
    const sw = Math.min(tall ? 92 : 128, (W - pad * 2 - 5 * 8) / 6);
    const sh = tall ? 88 : 84;
    const sy = top + 26;
    const sx = (W - (sw * 6 + 5 * 8)) / 2;
    for (let i = 0; i < BAND.places; i++) {
      const x = sx + i * (sw + 8);
      const id = s.band[i];
      const def = id ? COMPANIONS.find((c) => c.id === id) : undefined;
      if (i >= slots) {
        this.put(slabImage(this, x, sy, sw, sh, IRON, 10, 4));
        this.put(this.add.image(x + sw / 2, sy + sh / 2 - 12, SHEET, 'icon/lock')).setScale(0.32);
        this.text(x + sw / 2, sy + sh - 18, `WAVE ${SLOT_WAVES[i]}`, { size: 15, color: BONE.fill });
        continue;
      }
      this.put(slabImage(this, x, sy, sw, sh, def ? GOLD : BONE, 10, 4));
      if (def) {
        this.portrait(def.unit, x + sw / 2, sy + sh - 22, sw - 12, sh - 28, false);
        this.text(x + sw / 2, sy + sh - 12, def.name, { size: 15, color: ink, stroke: null });
        this.hit(x, sy, sw, sh, () => {
          setBand(s, i, '');
          commit();
          this.draw();
        });
      } else this.text(x + sw / 2, sy + sh / 2, 'EMPTY', { size: 15, color: '#7a6a5a', stroke: null });
    }
    // Every companion.
    const rows = friendRows(s);
    const cols = tall ? 4 : 8;
    const gy = sy + sh + 12;
    const foot = 64;
    const cw = (W - pad * 2 - (cols - 1) * 6) / cols;
    const lines = Math.ceil(rows.length / cols);
    const chh = Math.min(tall ? 96 : 74, (H - gy - foot - pad - (lines - 1) * 6) / lines);
    let shown = rows.find((f) => f.def.id === this.picked) ?? null;
    rows.forEach((f, i) => {
      const x = pad + (i % cols) * (cw + 6);
      const y = gy + Math.floor(i / cols) * (chh + 6);
      const inBand = s.band.includes(f.def.id);
      this.put(slabImage(this, x, y, cw, chh, f.def.id === this.picked ? GOLD : f.unlocked ? BONE : IRON, 8, 4));
      this.portrait(f.def.unit, x + cw / 2, y + chh - 20, cw - 10, chh - 26, !f.unlocked);
      this.text(x + cw / 2, y + chh - 11, f.name, { size: 15, color: f.unlocked ? ink : BONE.fill, stroke: f.unlocked ? null : OUTLINE, strokeWidth: 3 });
      if (inBand) this.put(this.add.image(x + cw - 12, y + 12, SHEET, 'icon/check')).setScale(0.22);
      this.hit(x, y, cw, chh, () => {
        this.picked = f.def.id;
        if (f.unlocked) {
          // In the band it comes out; out of it, it goes into the first empty slot, or the last if none is empty.
          const at = s.band.indexOf(f.def.id);
          if (at >= 0) setBand(s, at, '');
          else if (slots > 0) setBand(s, Math.min(s.band.filter((b) => isFriend(s, b)).length, slots - 1), f.def.id);
          commit();
        }
        this.draw();
      });
    });
    // What the companion last pressed is, or how it is unlocked.
    shown ??= rows.find((f) => s.band.includes(f.def.id)) ?? rows[0];
    const fy = H - foot - pad + 4;
    this.put(slabImage(this, pad, fy, W - pad * 2, foot, BONE, 10, 4));
    const what = shown.unlocked
      ? `${shown.def.name}, ${shown.def.kind}. ${shown.def.says} ${shown.def.quirkName}: ${shown.def.quirkSays}`
      : `???  ${shown.how}${shown.share > 0 && shown.share < 1 ? ` (${Math.floor(shown.share * 100)}%)` : ''}`;
    const t = this.text(pad + 14, fy + 8, what, { size: 15, align: 'left', color: ink, stroke: null, wrap: W - pad * 2 - 28, weight: 600 });
    t.setOrigin(0, 0);
    if (t.height > foot - 12) t.setScale((foot - 12) / t.height);
  }

  /** Sets out on the day's road. */
  private setOut(date: string): void {
    if (!startDaily(date)) return;
    sfx.play('click', 0.6);
    this.scene.start('Arena');
  }

  /** The list, a page of it at a time: there is no scrolling here, only the next page and the one before. */
  private list(rows: Row[], top: number): void {
    const s = save();
    const tall = view.tall;
    const pad = 14;
    const rh = tall ? 92 : 62;
    const foot = 56;
    const per = Math.max(1, Math.floor((view.h - top - foot) / (rh + 6)));
    const pages = Math.max(1, Math.ceil(rows.length / per));
    this.page = Math.max(0, Math.min(pages - 1, this.page));
    const w = view.w - pad * 2;
    const bw = tall ? 100 : 132;
    rows.slice(this.page * per, this.page * per + per).forEach((r, i) => {
      const y = top + i * (rh + 6);
      if (r.head) {
        this.text(pad + 6, y + rh / 2, r.title, { size: 20, align: 'left', color: GOLD.fill });
        return;
      }
      this.put(slabImage(this, pad, y, w, rh, r.dark ? IRON : BONE, 12, 5));
      const ink = r.dark ? BONE.shade : OUTLINE;
      const room = w - bw - 34;
      this.text(pad + 14, y + 17, r.title, { size: 18, align: 'left', color: r.dark ? BONE.fill : OUTLINE, stroke: r.dark ? OUTLINE : null, strokeWidth: 3 });
      if (r.says) {
        const t = this.text(pad + 14, y + 32, r.says, { size: 15, align: 'left', color: ink, stroke: r.dark ? OUTLINE : null, strokeWidth: 3, wrap: room, weight: 600 });
        t.setOrigin(0, 0);
      }
      const bx = pad + w - bw / 2 - 10;
      if (r.button) {
        const press = r.button.press;
        const b = new Button(this, bx, y + rh / 2, r.button.text, () => {
          if (!press()) return;
          commit();
          sfx.play('claim', 0.7);
          this.draw();
        }, { width: bw, height: 46, size: 17, mat: r.button.mat ?? (r.button.can ? GOLD : IRON) });
        b.setEnabled(r.button.can);
        this.put(b.root);
      } else if (r.note) {
        this.text(bx, y + rh / 2, r.note, { size: 15, color: r.dark ? BONE.fill : RUBY.shade, stroke: r.dark ? OUTLINE : null, strokeWidth: 3, wrap: bw + 10 });
      }
    });
    void s;
    // The pages.
    if (pages > 1) {
      const y = view.h - foot / 2 - 2;
      const prev = new Button(this, pad + 70, y, 'BEFORE', () => {
        this.page--;
        sfx.play('click', 0.5);
        this.draw();
      }, { width: 140, height: 44, size: 17, mat: IRON });
      prev.setEnabled(this.page > 0);
      const next = new Button(this, view.w - pad - 70, y, 'MORE', () => {
        this.page++;
        sfx.play('click', 0.5);
        this.draw();
      }, { width: 140, height: 44, size: 17, mat: IRON });
      next.setEnabled(this.page < pages - 1);
      this.put(prev.root);
      this.put(next.root);
      this.text(view.w / 2, y, `${this.page + 1} of ${pages}`, { size: 17 });
    }
    // A screen with nothing on it to press still takes the press, so that it does not fall through.
    this.put(this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, view.h).setTint(hex(OUTLINE)).setAlpha(0.001).setDepth(-1));
  }
}
