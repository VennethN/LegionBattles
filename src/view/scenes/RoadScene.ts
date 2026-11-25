// What the run chooses between the camp and the wave: a relic when one was
// won, one of three; and the road to the next wave, one of those laid out.
// It is shown over the field, as the camp is, and is the plainest thing
// that works: a card for each choice, with what it is, what it does and a
// button. It shows the run and asks its rules (game/run.ts) for everything.

import Phaser from 'phaser';
import type { ArenaScene } from './ArenaScene';
import { BONE, BUSH, GOLD, HOLY, IRON, OUTLINE, RUBY, type Material } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { COMPANIONS, byId, omenOf, relicOf, waveOf, type Omen } from '../../game/data';
import { fusesInto, takeRelic, takeRoad, type RunData } from '../../game/run';
import { ads } from '../../platform/ads';
import { setupCamera } from '../app';
import { hex, view } from '../config';
import { THING_ICONS, relicIcon } from '../icons';
import { SHEET } from '../art/Sheet';
import { keepRun, theRun } from '../session';
import { slabImage } from '../ui/bake';
import { Button, heading, label } from '../ui/widgets';

/** The picture and the color of each omen's card. */
const OMEN_LOOK: Record<Omen, { icon: string; mat: Material }> = {
  quiet: { icon: 'icon/boot', mat: BUSH },
  horde: { icon: 'icon/sword', mat: RUBY },
  champions: { icon: 'icon/crown', mat: GOLD },
  forced: { icon: 'icon/boot', mat: IRON },
  toll: { icon: 'icon/coin', mat: BUSH },
  duel: { icon: 'icon/burst', mat: RUBY },
  wounded: { icon: 'icon/heart', mat: RUBY },
  night: { icon: 'icon/candle', mat: IRON },
  wagon: { icon: THING_ICONS.wagon, mat: GOLD },
  burning: { icon: 'icon/w-torch', mat: GOLD },
  blizzard: { icon: 'icon/w-frost', mat: IRON },
  shrine: { icon: THING_ICONS.shrine, mat: HOLY },
  stray: { icon: THING_ICONS.cage, mat: BONE },
  bog: { icon: 'icon/boot', mat: BUSH },
  spores: { icon: 'icon/drop', mat: BUSH },
  ashfall: { icon: 'icon/w-torch', mat: RUBY },
  forge: { icon: 'icon/shield', mat: IRON },
  squall: { icon: 'icon/spark', mat: HOLY },
  smugglers: { icon: THING_ICONS.wagon, mat: GOLD },
  deepdark: { icon: 'icon/candle', mat: IRON },
  goldvein: { icon: 'icon/coin', mat: GOLD },
  gale: { icon: 'icon/feather', mat: IRON },
  stampede: { icon: 'icon/boot', mat: RUBY },
  restless: { icon: 'icon/rune', mat: IRON },
  vigil: { icon: THING_ICONS.shrine, mat: HOLY },
  overclocked: { icon: 'icon/hourglass', mat: GOLD },
  steam: { icon: 'icon/drop', mat: IRON },
};

export class RoadScene extends Phaser.Scene {
  private run!: RunData;
  private root!: Phaser.GameObjects.Container;

  constructor() {
    super('Road');
  }

  create(): void {
    const run = theRun();
    if (!run) {
      this.scene.start('Title');
      return;
    }
    this.run = run;
    setupCamera(this);
    this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, view.h).setTint(hex(OUTLINE)).setAlpha(0.6).setInteractive();
    this.root = this.add.container(0, 0);
    music.play(waveOf(run.wave).land, 'calm');
    this.draw();
    // It comes up into place: a fork in the road, or a relic, is a moment and not a list.
    this.root.setAlpha(0).setY(18);
    this.tweens.add({ targets: this.root, alpha: 1, y: 0, duration: 260, ease: 'Cubic.easeOut' });
    if (run.phase === 'relic') this.time.delayedCall(120, () => sfx.play('claim', 0.7, 1.1));
  }

  private text(x: number, y: number, t: string, o: Parameters<typeof label>[4] = {}): Phaser.GameObjects.Text {
    const made = label(this, x, y, t, o);
    this.root.add(made);
    return made;
  }

  private draw(): void {
    this.root.removeAll(true);
    const run = this.run;
    if (run.phase === 'relic') this.relics();
    else if (run.phase === 'road') this.roads();
    // Anything else is the camp's to show: a level, or the wares.
    else this.scene.start('Camp');
  }

  /**
   * Cards in a row on a wide screen, in a column on a tall one, each as tall as the most any of them says (`need`, at
   * the card's width). A tall screen's stand at the bottom, where a thumb is. The band at its fire is seen in the room
   * that is left: under a wide screen's cards, between a tall screen's heading and its cards.
   */
  private cards(n: number, top: number, need: (w: number) => number): { x: number[]; y: number[]; w: number; h: number } {
    const gap = 12;
    const arena = this.scene.get('Arena') as ArenaScene | null;
    if (view.tall) {
      const w = Math.min(420, view.w - 28);
      const h = Math.max(150, Math.min(210, need(w), (view.h - top - 16 - (n - 1) * gap) / n));
      const y0 = view.h - 16 - n * h - (n - 1) * gap;
      arena?.campFocus?.(0.5, (top + y0) / 2 / view.h);
      return { x: Array.from({ length: n }, () => (view.w - w) / 2), y: Array.from({ length: n }, (_, i) => y0 + i * (h + gap)), w, h };
    }
    const w = Math.min(250, (view.w - 32 - (n - 1) * gap) / n);
    const h = Math.max(240, Math.min(view.h - top - 20, need(w)));
    const x0 = (view.w - (n * w + (n - 1) * gap)) / 2;
    arena?.campFocus?.(0.5, Math.min(0.9, (top + h + view.h) / 2 / view.h));
    return { x: Array.from({ length: n }, (_, i) => x0 + i * (w + gap)), y: Array.from({ length: n }, () => top), w, h };
  }

  /** How tall a card has to be for its name and lines at a width: measured with the words themselves, as card() lays them, then let go. */
  private need(w: number, name: string, lines: Array<{ text: string; head?: string }>): number {
    const tall = view.tall;
    const pic = tall ? 92 : 78;
    const tw = tall ? w - pic - 56 : w - 24;
    const tallOf = (t: string, size: number): number => {
      const probe = label(this, 0, 0, t, { size, stroke: null, wrap: tw });
      const h = probe.height;
      probe.destroy();
      return h;
    };
    // Where the first line starts, as in card(): under the name, and on a wide card under the picture too.
    let h = (tall ? 26 : 20 + pic + 24) + 16 + Math.max(0, tallOf(name, 20) - 26);
    for (const line of lines) h += (line.head ? 22 : 0) + tallOf(line.text, 15) + 4;
    // The button under the words, and the card's edge.
    return h + (tall ? 64 : 76);
  }

  /** One card: a picture, a name, what it is in a line or two, and a button. A tall screen's is laid on its side. */
  private card(x: number, y: number, w: number, h: number, mat: Material, icon: string, name: string, lines: Array<{ text: string; color?: string; head?: string }>, button: string, on: () => void): void {
    this.root.add(slabImage(this, x, y, w, h, BONE, 16, 7));
    const tall = view.tall;
    // The picture is no bigger than leaves room for the words under it: a road's card has its risk and its reward to say.
    const pic = tall ? Math.min(92, h - 40) : Math.min(78, h * 0.26);
    const px = tall ? x + 18 + pic / 2 : x + w / 2;
    const py = tall ? y + h / 2 - 8 : y + 20 + pic / 2;
    this.root.add(slabImage(this, px - pic / 2 - 6, py - pic / 2 - 6, pic + 12, pic + 12, mat, 14, 5));
    const img = this.add.image(px, py, SHEET, icon);
    img.setOrigin(0.5, 0.5).setScale(pic / Math.max(img.frame.width, img.frame.height));
    this.root.add(img);
    const tx = tall ? x + pic + 40 : x + w / 2;
    const tw = tall ? w - pic - 56 : w - 24;
    const align = tall ? 'left' : 'center';
    let ty = tall ? y + 26 : py + pic / 2 + 24;
    this.text(tx, ty, name, { size: 20, color: OUTLINE, stroke: null, align, wrap: tw });
    ty += 16;
    for (const line of lines) {
      // A line with a head (THE WAVE, THE PRIZE) has it over it, small and in its color: the same two things are in the same two places on every card, to be read across.
      if (line.head) {
        ty += 4;
        this.text(tx, ty, line.head, { size: 15, color: line.color ?? '#6b4a2b', stroke: null, align }).setOrigin(tall ? 0 : 0.5, 0);
        ty += 18;
      }
      const made = this.text(tx, ty, line.text, { size: 15, color: line.head ? OUTLINE : (line.color ?? '#6b4a2b'), stroke: null, align, wrap: tw }).setOrigin(tall ? 0 : 0.5, 0);
      ty += made.height + 4;
    }
    const b = new Button(this, tall ? x + w - 84 : x + w / 2, y + h - 34, button, on, { width: tall ? 140 : w - 36, height: 46, size: 19, mat: BUSH });
    this.root.add(b.root);
  }

  // ------------------------------------------------------------ a relic

  private relics(): void {
    const run = this.run;
    const cx = view.w / 2;
    this.root.add(heading(this, cx, 40, 'CHOOSE A RELIC', GOLD));
    this.text(cx, 76, run.relicsDue > 1 ? `Choose 1. ${run.relicsDue - 1} more after this.` : 'Choose 1 of 3.', { size: 17, color: BONE.fill });
    // A relic that would make one of two with a relic held says so: the one it makes is what there is to chase.
    const linesOf = (id: string): Array<{ text: string; color?: string }> => {
      const f = fusesInto(run, id);
      const other = f?.of?.find((part) => part !== id);
      return [{ text: relicOf(id).says }, ...(f && other ? [{ text: `With your ${relicOf(other).name}, becomes ${f.name}: ${f.says.split(': ')[1] ?? f.says}`, color: '#2e7d3a' }] : [])];
    };
    const at = this.cards(run.relicChoices.length, 100, (w) => Math.max(...run.relicChoices.map((id) => this.need(w, relicOf(id).name, linesOf(id)))));
    run.relicChoices.forEach((id, i) => {
      const r = relicOf(id);
      this.card(at.x[i], at.y[i], at.w, at.h, GOLD, relicIcon(id), r.name, linesOf(id), 'TAKE', () => {
        takeRelic(this.run, i);
        sfx.play('claim', 0.8);
        keepRun();
        this.draw();
      });
    });
  }

  // ------------------------------------------------------------ the road

  private roads(): void {
    const run = this.run;
    const cx = view.w / 2;
    this.root.add(heading(this, cx, 40, 'CHOOSE YOUR ROAD'));
    this.text(cx, 78, `Wave ${run.wave} is next. Each road has a risk and a reward.`, { size: 16, color: BONE.fill });
    // Who is in the cage is not told: it is found out by letting them out.
    const linesOf = (omen: string): Array<{ head: string; text: string; color: string }> => {
      const o = omenOf(omen as Parameters<typeof omenOf>[0]);
      return [{ head: 'RISK', text: `Wave ${run.wave}: ${o.says}`, color: '#952239' }, { head: 'REWARD', text: o.prize[0].toUpperCase() + o.prize.slice(1), color: '#2e5f45' }];
    };
    const at = this.cards(run.roads.length, 100, (w) => Math.max(...run.roads.map((r) => this.need(w, omenOf(r.omen).name, linesOf(r.omen)))));
    run.roads.forEach((road, i) => {
      const o = omenOf(road.omen);
      const look = OMEN_LOOK[road.omen];
      const lines = linesOf(road.omen);
      this.card(at.x[i], at.y[i], at.w, at.h, look.mat, look.icon, o.name, lines, 'CHOOSE', () => this.go(i));
    });
    // The companions of the run that a road might add to are counted for the player who has forgotten.
    const strays = run.band.filter((b) => b.stray).map((b) => byId(COMPANIONS, b.id).name);
    if (strays.length > 0 && !view.tall) this.text(cx, view.h - 10, `Rescued companions with you: ${strays.join(', ')}`, { size: 15, color: BONE.shade });
  }

  /** On to the wave by the road that was chosen. */
  private go(i: number): void {
    if (!takeRoad(this.run, i)) return;
    sfx.play('place', 0.7);
    keepRun();
    // A portal may show something between waves. The wave waits for it, and never long.
    void ads().interstitial().then(() => {
      this.scene.stop();
      this.scene.get('Arena').scene.restart();
    });
  }
}
