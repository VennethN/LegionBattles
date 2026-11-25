// The Hold: what the player keeps between runs. A tab for each part of it
// (upgrades, heroes, companions, the armory, vows, quests, the codex, the
// daily run). The upgrades are drawn as the tree they are; the rest are
// lists, each thing with what it is, what it costs or what unlocks it, and a
// button. It shows the save and asks the Hold's rules (game/hold.ts) for
// everything: a price is never worked out here. What is not unlocked is
// dark, with "???" and what unlocks it.

import Phaser from 'phaser';
import { BONE, BUSH, GOLD, HOLY, IRON, LEATHER, OUTLINE, RUBY, type Material } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { BAND, BRANCHES, COMPANIONS, CRATES, HEROES, RENOWN, VOWS, byId } from '../../game/data';
import {
  altOpen, badge, boardOf, buyCrate, buyFriend, buyHero, buyNode, buyPlace, chronicleOf, cratePrice, crateThings, dailyOf, dailyTaken, deedsOf, epithetOf, featSays,
  friendPrice, heroPrice, met, oathsOf, placePrice, refundBoard, setAlt, toggleVow, vowsNext, vowsOpen,
} from '../../game/hold';
import { isFriend, isOpen, type SaveData } from '../../game/state';
import { setupCamera } from '../app';
import { hex, view } from '../config';
import { CARDS, SHEET, portraitFrame } from '../art/Sheet';
import { commit, save, startDaily } from '../session';
import { slabImage } from '../ui/bake';
import { Button, heading, label } from '../ui/widgets';

const TABS = ['BOARD', 'HALL', 'KENNELS', 'ARMORY', 'VOWS', 'DEEDS', 'CHRONICLE', 'DAILY'] as const;

/** The day as the day's road counts it: the same day for everyone, wherever they are. */
const today = (): string => new Date().toISOString().slice(0, 10);
type Tab = (typeof TABS)[number];
/** What a tab is called on its button, in the words a player knows. */
const TAB_NAMES: Record<Tab, string> = { BOARD: 'UPGRADES', HALL: 'HEROES', KENNELS: 'COMPANIONS', ARMORY: 'ARMORY', VOWS: 'VOWS', DEEDS: 'QUESTS', CHRONICLE: 'CODEX', DAILY: 'DAILY RUN' };

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
  /** A figure drawn at the row's left: a hero's or a companion's, dark while they are locked. */
  unit?: string;
}

export class HoldScene extends Phaser.Scene {
  private root!: Phaser.GameObjects.Container;
  private tab: Tab = 'BOARD';
  private page = 0;

  constructor() {
    super('Hold');
  }

  create(data: { tab?: Tab } = {}): void {
    setupCamera(this);
    this.cameras.main.setBackgroundColor('#2e2218');
    this.tab = data.tab && TABS.includes(data.tab) ? data.tab : 'BOARD';
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
    // The head: where this is, the renown in hand, and the way back. What the last run paid is on the result.
    for (const o of heading(this, tall ? 110 : 120, 30, 'THE HOLD')) this.put(o);
    const rx = view.w - pad - (tall ? 84 : 132) - 14 - 70;
    this.put(slabImage(this, rx - 66, 10, 132, 40, IRON, 12, 4));
    this.put(this.add.image(rx - 40, 29, SHEET, 'icon/laurel')).setScale(0.24);
    this.text(rx + 14, 28, String(s.renown), { size: 22, color: HOLY.fill });
    this.put(new Button(this, view.w - pad - (tall ? 42 : 66), 30, 'BACK', () => this.scene.start('Title'), { width: tall ? 84 : 132, height: 44, size: 18, mat: IRON }).root);
    let y = 60;
    // The tabs: one row on a wide screen, two on a tall one.
    const perRow = tall ? 4 : TABS.length;
    const tw = (view.w - pad * 2 - (perRow - 1) * 6) / perRow;
    TABS.forEach((tab, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const b = new Button(this, pad + tw / 2 + col * (tw + 6), y + 22 + row * 50, TAB_NAMES[tab], () => {
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
    const buy = (price: number | null, press: () => boolean): Row['button'] | undefined =>
      price === null ? undefined : { text: `BUY ${price}`, can: s.renown >= price, press };
    switch (this.tab) {
      case 'HALL':
        return HEROES.map((h): Row => {
          if (isOpen(s, h.id)) {
            const won = badge(s, h.id);
            const oaths = oathsOf(s, h.id);
            // Each oath by name, kept or not, and the hero's best win: the badge they wear.
            const list = oaths.map((o) => `${o.done ? '[DONE]' : '[  ]'} ${o.oath.name}`).join('   ');
            const says = `${won === null ? 'No win yet.' : won.length === 0 ? 'Won a run.' : `Won with ${won.length} ${won.length === 1 ? 'vow' : 'vows'}.`}   Oaths: ${list}`;
            // The oath that opens a second rule for their weapon gives the choice between the two.
            const alt = s.alt.includes(h.id);
            const button: Row['button'] = altOpen(s, h.id) ? { text: 'SWITCH', can: true, press: () => setAlt(s, h.id, !alt), mat: BUSH } : undefined;
            const rule = altOpen(s, h.id) ? `   Weapon rule: ${alt ? 'new' : 'first'} one.` : '';
            return { title: `${h.name}, ${epithetOf(s, h.id)}`, says: says + rule, button, note: 'UNLOCKED', unit: h.unit };
          }
          return { title: '???', says: h.unlock ? `Unlock: ${featSays(h.unlock)} Or buy now.` : '', dark: true, button: buy(heroPrice(s, h.id), () => buyHero(s, h.id)), unit: h.unit };
        });
      case 'KENNELS': {
        const place = placePrice(s);
        const first: Row = {
          title: `Companion slots: ${s.places} of ${BAND.places}`,
          says: place === null ? 'Both slots unlocked.' : 'Take a 2nd companion on every run.',
          button: buy(place, () => buyPlace(s)),
          note: place === null ? 'UNLOCKED' : undefined,
        };
        return [first, ...COMPANIONS.map((c): Row => {
          if (isFriend(s, c.id)) return { title: `${c.name}, ${c.kind}`, says: c.says, note: 'UNLOCKED', unit: c.unit };
          return { title: '???', says: `Unlock: ${featSays(c.unlock)} Or buy now.`, dark: true, button: buy(friendPrice(s, c.id), () => buyFriend(s, c.id)), unit: c.unit };
        })];
      }
      case 'ARMORY':
        return CRATES.map((c): Row => {
          const open = s.crates.includes(c.id);
          const things = crateThings(s, c).map((t) => t.name).join(', ');
          return { title: c.name, says: open ? `${c.says} Inside: ${things}.` : `Inside: ${things}. Unlock: ${c.deedSays} Or buy it.`, dark: !open, button: open ? undefined : buy(cratePrice(s), () => buyCrate(s, c.id)), note: open ? 'UNLOCKED' : undefined };
        });
      case 'BOARD': {
        // The board as a list, a branch after a branch, each place under the one it needs. A screen that draws it as a tree has each place's column and row (boardOf).
        const board = boardOf(s);
        const owned = board.filter((n) => n.owned).length;
        const rows: Row[] = [{
          title: `Lasting upgrades: ${owned} of ${board.length} owned`,
          says: 'Each makes every run after it stronger. A place is opened by the one before it.',
          button: owned > 0 ? { text: 'TAKE BACK', can: true, press: () => refundBoard(s) > 0, mat: IRON } : undefined,
        }];
        for (const b of BRANCHES) {
          rows.push({ title: `${b.name}. ${b.says}`, says: '', head: true });
          for (const n of board.filter((x) => x.node.branch === b.id)) {
            if (n.owned) rows.push({ title: n.node.name, says: n.says, note: 'OWNED' });
            else if (n.open) rows.push({ title: n.node.name, says: n.says, button: buy(n.node.price, () => buyNode(s, n.node.id)) });
            else rows.push({ title: n.node.name, says: `${n.says} After ${board.find((x) => x.node.id === n.node.needs)?.node.name ?? 'the one before it'}.`, dark: true, note: `${n.node.price}` });
          }
        }
        return rows;
      }
      case 'VOWS': {
        const open = vowsOpen(s);
        const next = vowsNext(s);
        return [
          { title: `Vows: optional challenges for more Renown`, says: `Each vow you take makes your next runs harder and pays +${Math.round(RENOWN.vow * 100)}% Renown. Active now: ${s.vows.length}.`, head: false },
          ...VOWS.map((v, i): Row => {
            if (open.includes(v.id)) {
              const sworn = s.vows.includes(v.id);
              return { title: v.name, says: v.says, button: { text: sworn ? 'ACTIVE' : 'TAKE VOW', can: true, press: () => toggleVow(s, v.id), mat: sworn ? RUBY : GOLD } };
            }
            // The first that is shut says what opens it; those past it say nothing yet.
            return { title: '???', says: i === open.length ? next : '', dark: true };
          }),
        ];
      }
      case 'DEEDS':
        return deedsOf(s).map((d): Row => ({
          title: d.name,
          says: d.opens && d.kind !== 'opens' ? `${d.says} Unlocks ${d.opens}.` : d.says,
          dark: !d.done && d.name === '???',
          note: d.done ? 'DONE' : d.renown > 0 ? `+${d.renown}${d.share > 0 ? `  ${Math.floor(d.share * 100)}%` : ''}` : d.kind === 'oath' ? 'OATH' : d.kind === 'crate' ? 'CRATE' : `UNLOCKS ${d.opens.toUpperCase()}`,
        }));
      case 'CHRONICLE':
        // What has been met is listed; the rest of each kind is one dark line, so that the list is as long as what there is to read.
        return chronicleOf(s).flatMap((p): Row[] => [
          { title: `${p.title}: ${p.met} of ${p.entries.length} found`, says: '', head: true },
          ...p.entries.filter((e) => e.met).map((e): Row => ({ title: e.name, says: e.says, note: e.count > 0 ? `${e.count} ${e.counted}`.toUpperCase() : '' })),
          ...(p.met < p.entries.length ? [{ title: '???', says: `${p.entries.length - p.met} more not found yet.`, dark: true }] : []),
        ]);
      case 'DAILY': {
        const date = today();
        const d = dailyOf(date);
        const hero = byId(HEROES, d.hero);
        const friend = byId(COMPANIONS, d.band[0]);
        // Whoever has not been met is not named: the road itself is the way to meet them.
        const who = `${met(s, 'hero', hero.id) ? hero.name : '???'} with ${met(s, 'friend', friend.id) ? friend.name : '???'}`;
        const taken = dailyTaken(s, date);
        return [
          {
            title: `Daily Run: ${date}`,
            says: `${who}. One try a day, the same run for everyone. Every item unlocked, no upgrades, no vows.`,
            button: taken ? undefined : { text: 'PLAY', can: true, press: () => (this.setOut(date), false) },
            note: taken && s.daily ? `WAVE ${s.daily.wave}` : undefined,
          },
          { title: `Best Daily Run: wave ${s.dailyBest}`, says: taken && s.daily ? `Today: wave ${s.daily.wave}, ${Math.floor(s.daily.seconds / 60)} min ${s.daily.seconds % 60} s.` : 'Not played today.' },
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
      // A figure at the row's left, standing on its foot: a locked one is its own dark shape.
      const left = r.unit ? 64 : 0;
      if (r.unit) {
        const img = this.put(this.add.image(pad + 36, y + rh - 6, CARDS, portraitFrame('blue', r.unit)));
        img.setScale(Math.min((rh - 10) / (img.frame.height || 1), 56 / (img.frame.width || 1)));
        if (r.dark) img.setTint(hex(OUTLINE)).setTintMode(Phaser.TintModes.FILL).setAlpha(0.8);
      }
      const room = w - bw - 34 - left;
      this.text(pad + 14 + left, y + 17, r.title, { size: 18, align: 'left', color: r.dark ? BONE.fill : OUTLINE, stroke: r.dark ? OUTLINE : null, strokeWidth: 3 });
      if (r.says) {
        const t = this.text(pad + 14 + left, y + 32, r.says, { size: 15, align: 'left', color: ink, stroke: r.dark ? OUTLINE : null, strokeWidth: 3, wrap: room, weight: 600 });
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
      const prev = new Button(this, pad + 70, y, 'BACK', () => {
        this.page--;
        sfx.play('click', 0.5);
        this.draw();
      }, { width: 140, height: 44, size: 17, mat: IRON });
      prev.setEnabled(this.page > 0);
      const next = new Button(this, view.w - pad - 70, y, 'NEXT', () => {
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
