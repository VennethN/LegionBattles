// The Hold: what the player keeps between runs, shown plainly. A tab for
// each part of it (the hall, the kennels, the armory, blessings, danger,
// deeds, the chronicle), and under the tabs a list: each thing with what it
// is, what it costs or what opens it, and a button. It shows the save and
// asks the Hold's rules (game/hold.ts) for everything: a price is never
// worked out here.
//
// It is the plainest thing that works. What is not open is dark, with
// "???" and what opens it.

import Phaser from 'phaser';
import { BONE, BUSH, GOLD, IRON, LEATHER, OUTLINE, RUBY, type Material } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { BAND, BLESSINGS, COMPANIONS, CRATES, DANGERS, HEROES, RENOWN } from '../../game/data';
import {
  badge, blessPrice, blessSays, blessStep, buyBlessing, buyCrate, buyFriend, buyHero, buyPlace, chronicleOf, cratePrice, crateThings, deedsOf, featSays, friendPrice, heroPrice, placePrice,
  setDanger,
} from '../../game/hold';
import { isFriend, isOpen, type SaveData } from '../../game/state';
import { setupCamera } from '../app';
import { hex, view } from '../config';
import { SHEET } from '../art/Sheet';
import { commit, save } from '../session';
import { slabImage } from '../ui/bake';
import { Button, label } from '../ui/widgets';

const TABS = ['HALL', 'KENNELS', 'ARMORY', 'BLESSINGS', 'DANGER', 'DEEDS', 'CHRONICLE'] as const;
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
  private tab: Tab = 'HALL';
  private page = 0;

  constructor() {
    super('Hold');
  }

  create(data: { tab?: Tab } = {}): void {
    setupCamera(this);
    this.cameras.main.setBackgroundColor('#2e2218');
    this.tab = data.tab && TABS.includes(data.tab) ? data.tab : 'HALL';
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
    // The head: where this is, the renown in hand, and the way back.
    this.text(pad, 30, 'THE HOLD', { size: tall ? 24 : 28, align: 'left' });
    this.text(view.w - pad - (tall ? 96 : 150), 30, `RENOWN ${s.renown}`, { size: tall ? 19 : 22, align: 'right', color: GOLD.fill });
    this.put(new Button(this, view.w - pad - (tall ? 42 : 66), 30, 'BACK', () => this.scene.start('Title'), { width: tall ? 84 : 132, height: 44, size: 18, mat: IRON }).root);
    // What the last run paid, once there has been one.
    let y = 62;
    if (s.tally) {
      const lines = s.tally.lines.map((l) => `${l.why}${l.count > 1 ? ` ${l.count}` : ''} +${l.renown}`).join(', ');
      const t = this.text(pad, y, `The last run paid ${s.tally.total}: ${lines}.`, { size: 15, align: 'left', color: BONE.shade, strokeWidth: 3, wrap: view.w - pad * 2 });
      t.setOrigin(0, 0);
      y += t.height + 10;
    } else {
      const t = this.text(pad, y, `Every run pays renown: ${RENOWN.wave} a wave come through, ${RENOWN.captain} a captain, more for deeds.`, { size: 15, align: 'left', color: BONE.shade, strokeWidth: 3, wrap: view.w - pad * 2 });
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
      }, { width: tw, height: 44, size: tall ? 15 : 16, mat: tab === this.tab ? GOLD : LEATHER });
      this.put(b.root);
    });
    y += Math.ceil(TABS.length / perRow) * 50 + 6;
    this.list(this.rows(s), y);
  }

  /** The rows of the tab that is open. */
  private rows(s: SaveData): Row[] {
    const buy = (price: number | null, press: () => boolean): Row['button'] | undefined =>
      price === null ? undefined : { text: `BUY ${price}`, can: s.renown >= price, press };
    switch (this.tab) {
      case 'HALL':
        return HEROES.map((h): Row => {
          if (isOpen(s, h.id)) {
            const won = badge(s, h.id);
            return { title: `${h.name}, ${h.epithet}`, says: h.who, note: won < 0 ? 'OPEN' : `WON AT ${won}` };
          }
          return { title: '???', says: h.unlock ? featSays(h.unlock) : '', dark: true, button: buy(heroPrice(s, h.id), () => buyHero(s, h.id)) };
        });
      case 'KENNELS': {
        const place = placePrice(s);
        const first: Row = {
          title: `Places in the band: ${s.places} of ${BAND.places}`,
          says: place === null ? 'Both places are open.' : 'A second companion goes on every run.',
          button: buy(place, () => buyPlace(s)),
          note: place === null ? 'OPEN' : undefined,
        };
        return [first, ...COMPANIONS.map((c): Row => {
          if (isFriend(s, c.id)) return { title: `${c.name}, ${c.kind}`, says: c.says, note: 'OPEN' };
          return { title: '???', says: featSays(c.unlock), dark: true, button: buy(friendPrice(s, c.id), () => buyFriend(s, c.id)) };
        })];
      }
      case 'ARMORY':
        return CRATES.map((c): Row => {
          const open = s.crates.includes(c.id);
          const things = crateThings(s, c).map((t) => t.name).join(', ');
          return { title: c.name, says: `${c.says} ${things}.`, dark: !open, button: open ? undefined : buy(cratePrice(s), () => buyCrate(s, c.id)), note: open ? 'OPEN' : undefined };
        });
      case 'BLESSINGS':
        return BLESSINGS.map((b): Row => {
          const says = blessSays(s, b.id);
          const step = blessStep(s, b.id);
          const line = says.next ? (says.now ? `${says.now} Next: ${says.next}` : says.next) : says.now;
          return { title: `${b.name}${b.prices.length > 1 ? ` (${step} of ${b.prices.length})` : ''}`, says: line, button: buy(blessPrice(s, b.id), () => buyBlessing(s, b.id)), note: says.next ? undefined : 'ALL' };
        });
      case 'DANGER': {
        const pick = (n: number): Row['button'] => ({ text: s.danger === n ? 'CHOSEN' : 'CHOOSE', can: s.danger !== n, press: () => setDanger(s, n), mat: s.danger === n ? BUSH : GOLD });
        const more = (n: number): string => `${Math.round(RENOWN.danger * n * 100)}% more renown.`;
        return [
          { title: 'Danger 0', says: 'The game as it is.', button: pick(0) },
          ...DANGERS.map((d): Row => {
            if (d.n <= s.dangers) return { title: `Danger ${d.n}: ${d.name}`, says: `${d.says} And all the ones before it. ${more(d.n)}`, button: pick(d.n) };
            // The next one says what opens it; those past it say nothing yet.
            return { title: `Danger ${d.n}: ???`, says: d.n === s.dangers + 1 ? `Win the twentieth wave at danger ${d.n - 1}.` : '', dark: true };
          }),
        ];
      }
      case 'DEEDS':
        return deedsOf(s).map((d): Row => ({
          title: d.name,
          says: d.says,
          dark: !d.done && d.name === '???',
          note: d.done ? 'DONE' : d.renown > 0 ? `+${d.renown}${d.share > 0 ? `  ${Math.floor(d.share * 100)}%` : ''}` : `OPENS ${d.opens.toUpperCase()}`,
        }));
      case 'CHRONICLE':
        // What has been met is listed; the rest of each kind is one dark line, so that the list is as long as what there is to read.
        return chronicleOf(s).flatMap((p): Row[] => [
          { title: `${p.title}: ${p.met} of ${p.entries.length} met`, says: '', head: true },
          ...p.entries.filter((e) => e.met).map((e): Row => ({ title: e.name, says: e.says, note: e.count > 0 ? `${e.count} ${e.counted}`.toUpperCase() : '' })),
          ...(p.met < p.entries.length ? [{ title: '???', says: `${p.entries.length - p.met} more not met yet.`, dark: true }] : []),
        ]);
    }
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
