// What the run chooses between the camp and the wave: a relic when one was
// won, one of three; and the road to the next wave, one of those laid out.
// It is shown over the field, as the camp is, and is the plainest thing
// that works: a card for each choice, with what it is, what it does and a
// button. It shows the run and asks its rules (game/run.ts) for everything.

import Phaser from 'phaser';
import { BONE, BUSH, GOLD, HOLY, IRON, OUTLINE, RUBY, type Material } from '../../art/kit/palette';
import { music } from '../../audio/music';
import { sfx } from '../../audio/sfx';
import { COMPANIONS, byId, omenOf, relicOf, waveOf, type Omen } from '../../game/data';
import { takeRelic, takeRoad, type RunData } from '../../game/run';
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
  night: { icon: 'icon/candle', mat: IRON },
  wagon: { icon: THING_ICONS.wagon, mat: GOLD },
  shrine: { icon: THING_ICONS.shrine, mat: HOLY },
  stray: { icon: THING_ICONS.cage, mat: BONE },
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
    this.add.image(0, 0, SHEET, 'fx/solid').setOrigin(0, 0).setDisplaySize(view.w, view.h).setTint(hex(OUTLINE)).setAlpha(0.88).setInteractive();
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

  /** Cards in a row on a wide screen, in a column on a tall one. Returns where each goes and how big it is. */
  private cards(n: number, top: number): { x: number[]; y: number[]; w: number; h: number } {
    const gap = 12;
    if (view.tall) {
      const h = Math.min(210, (view.h - top - 16 - (n - 1) * gap) / n);
      const w = Math.min(420, view.w - 28);
      return { x: Array.from({ length: n }, () => (view.w - w) / 2), y: Array.from({ length: n }, (_, i) => top + i * (h + gap)), w, h };
    }
    const w = Math.min(250, (view.w - 32 - (n - 1) * gap) / n);
    const h = Math.min(330, view.h - top - 20);
    const x0 = (view.w - (n * w + (n - 1) * gap)) / 2;
    return { x: Array.from({ length: n }, (_, i) => x0 + i * (w + gap)), y: Array.from({ length: n }, () => top + (view.h - top - 20 - h) / 2), w, h };
  }

  /** One card: a picture, a name, what it is in a line or two, and a button. A tall screen's is laid on its side. */
  private card(x: number, y: number, w: number, h: number, mat: Material, icon: string, name: string, lines: Array<{ text: string; color?: string; head?: string }>, button: string, on: () => void): void {
    this.root.add(slabImage(this, x, y, w, h, BONE, 16, 7));
    const tall = view.tall;
    const pic = tall ? Math.min(92, h - 40) : Math.min(104, h * 0.34);
    const px = tall ? x + 18 + pic / 2 : x + w / 2;
    const py = tall ? y + h / 2 - 8 : y + 22 + pic / 2;
    this.root.add(slabImage(this, px - pic / 2 - 6, py - pic / 2 - 6, pic + 12, pic + 12, mat, 14, 5));
    const img = this.add.image(px, py, SHEET, icon);
    img.setOrigin(0.5, 0.5).setScale(pic / Math.max(img.frame.width, img.frame.height));
    this.root.add(img);
    const tx = tall ? x + pic + 40 : x + w / 2;
    const tw = tall ? w - pic - 56 : w - 24;
    const align = tall ? 'left' : 'center';
    let ty = tall ? y + 26 : py + pic / 2 + 30;
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
    const at = this.cards(run.relicChoices.length, 100);
    run.relicChoices.forEach((id, i) => {
      const r = relicOf(id);
      this.card(at.x[i], at.y[i], at.w, at.h, GOLD, relicIcon(id), r.name, [{ text: r.says }], 'TAKE', () => {
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
    const at = this.cards(run.roads.length, 100);
    run.roads.forEach((road, i) => {
      const o = omenOf(road.omen);
      const look = OMEN_LOOK[road.omen];
      // Who is in the cage is not told: it is found out by letting them out.
      const lines = [{ head: 'RISK', text: o.says, color: '#952239' }, { head: 'REWARD', text: o.prize[0].toUpperCase() + o.prize.slice(1), color: '#2e5f45' }];
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
