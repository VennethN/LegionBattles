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
import { BONE, BUSH, GOLD, IRON, LEATHER, OUTLINE, RUBY, type Material } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { BAND, COMPANIONS, CRATES, HEROES, PAY, VOWS, byId } from '../../game/data';
import {
  badge, chronicleOf, crateThings, dailyOf, dailyTaken, deedsOf, epithetOf, featSays, friendRows, masteryLevel, met, nextLevel, nextSlot, pickGift, slotsOf, toggleVow,
  trackRows, vowsNext, vowsOpen,
} from '../../game/hold';
import { isOpen, type SaveData } from '../../game/state';
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

  constructor() {
    super('Hold');
  }

  create(data: { tab?: Tab } = {}): void {
    setupCamera(this);
    this.cameras.main.setBackgroundColor('#2e2218');
    this.tab = data.tab && TABS.includes(data.tab) ? data.tab : 'HEROES';
    this.page = 0;
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
    // The head: where this is, and the way back.
    this.text(pad, 30, 'THE HOLD', { size: tall ? 24 : 28, align: 'left' });
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
    this.list(this.rows(s), y);
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
