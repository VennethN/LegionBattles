// Lastander's own logo. The name is one word, LAST and STANDER run together,
// and the letter they share the place of is drawn as what the name means: the
// T is a sword stood point down in the ground, the last thing standing, with
// a torn pennant of the hero's blue still tied to it. The sun goes down behind
// it, as it does over every land of the game, and the arrows of those who
// came are stuck in the letters.
//
// It is drawn with the kit's pieces and the family's letters (logo.ts), on the
// same canvas as the family's logo, so the game lays it out the same way.

import { Doc } from './kit/draw';
import { CLOTH, DIRT, FIRE, GOLD, HOLY, LEATHER, STEEL, WOOD } from './kit/palette';
import { Path, capsule, circle, ellipse, path, poly } from './kit/path';
import { LETTERS, painter, type Painter } from './logo';
import { LOGO_H, LOGO_SCALE, LOGO_W, MARK_SIZE } from './logoSize';

const NAME = 'LASTANDER';
/** Which letter is the sword. */
const SWORD_AT = 3;

/** The sun, half down: a dome with a paler heart, and rays round it. Only what is above `floor` is drawn, and below `haze` it is dim. */
function sun(p: Painter, cx: number, cy: number, r: number, floor: number, haze: number): void {
  const dome = (rad: number): Path => path().M(cx - rad, floor).L(cx - rad, cy).C(cx - rad, cy - rad * 1.33, cx + rad, cy - rad * 1.33, cx + rad, cy).L(cx + rad, floor).Z();
  // The rays first, so the dome's line lies over their feet.
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i * Math.PI) / 8;
    // Every other ray is a long one.
    const far = r + (i % 2 === 0 ? 30 : 19);
    const near = r + 5;
    const half = 0.085;
    const at = (rad: number, ang: number): [number, number] => [cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad];
    // The rays that would lie along the ground are left out: they would only show as bits between the letters.
    if (at(far, a)[1] > cy - 20) continue;
    p.piece(`ray-${i}`, poly([at(near, a - half), at(far, a), at(near, a + half)]), HOLY, { shade: 2 });
  }
  // Low down the sun is deep in the haze: darker there, so that gold letters stand off it.
  p.piece('sun', dome(r), FIRE, {
    shade: 6,
    inner: (c) => {
      c.flat('sun-heart', dome(r * 0.7), HOLY.fill, 0.92);
      c.flat('sun-haze', poly([[cx - r, haze], [cx + r, haze], [cx + r, floor + 4], [cx - r, floor + 4]]), FIRE.shade);
      c.flat('sun-haze-edge', poly([[cx - r, haze - 5], [cx + r, haze - 5], [cx + r, haze], [cx - r, haze]]), FIRE.shade, 0.45);
    },
  });
}

/** An arrow stuck in something: its shaft from where it went in, out to its feathers. */
function arrow(p: Painter, name: string, x: number, y: number, deg: number, length: number): void {
  const a = (deg * Math.PI) / 180;
  const ex = x + Math.cos(a) * length;
  const ey = y + Math.sin(a) * length;
  const nx = -Math.sin(a);
  const ny = Math.cos(a);
  const back = (t: number, side: number): [number, number] => [x + Math.cos(a) * length * t + nx * side, y + Math.sin(a) * length * t + ny * side];
  p.piece(`${name}-feather`, poly([back(0.6, 0), back(0.72, 6.5), back(1.06, 6.5), back(0.96, 0), back(1.06, -6.5), back(0.72, -6.5)]), CLOTH.red, { shade: 2 });
  p.piece(`${name}-shaft`, capsule(x, y, ex, ey, 4.2), WOOD, { shade: 1 });
}

/**
 * The sword, point down. `top` is the upper edge of its guard, which lies where a letter's top would be; `tip` is
 * where its point ends. Its guard is as wide and nearly as heavy as the bar of a T, so that it is read as one.
 */
function sword(p: Painter, d: Doc, cx: number, top: number, tip: number, blade: number, guard: number, bar: number): void {
  const grip = bar * 2.3;
  // The pennant, tied under the pommel, flying the way the wind goes: drawn first, so the hilt is over its knot.
  const ky = top - grip * 0.72;
  p.piece('pennant', poly([
    [cx, ky - 6], [cx + 30, ky - 15], [cx + 62, ky - 9], [cx + 48, ky - 1], [cx + 70, ky + 9], [cx + 44, ky + 11], [cx + 52, ky + 21], [cx + 22, ky + 13], [cx, ky + 8],
  ]), CLOTH.blue, { shade: 4 });
  const b = blade / 2;
  p.piece('blade', poly([[cx - b, top + bar - 2], [cx + b, top + bar - 2], [cx + b, tip - blade * 1.3], [cx, tip], [cx - b, tip - blade * 1.3]]), STEEL, { shade: 3 });
  // The ridge down its middle.
  if (p.pass === 'art') d.line('blade-ridge', poly([[cx, top + bar + 4], [cx, tip - blade * 1.5]], false), STEEL.shade, 2.2);
  p.piece('grip', poly([[cx - bar * 0.36, top + 2], [cx + bar * 0.36, top + 2], [cx + bar * 0.3, top - grip], [cx - bar * 0.3, top - grip]]), LEATHER, { shade: 2 });
  p.piece('pommel', circle(cx, top - grip - bar * 0.42, bar * 0.62), GOLD, { shade: 2 });
  const g = guard / 2;
  // The guard's ends turn down a little, as a sword's do and a T's do not, so that it is both.
  p.piece('guard', path()
    .M(cx - g, top + 1).L(cx + g, top + 1).L(cx + g + 2, top + bar + 4).L(cx + g - 9, top + bar + 4).L(cx + g - 11, top + bar)
    .L(cx - g + 11, top + bar).L(cx - g + 9, top + bar + 4).L(cx - g - 2, top + bar + 4).Z(), GOLD, { shade: 4 });
}

function paint(d: Doc, pass: 'edge' | 'art'): void {
  const p = painter(d, pass);
  // Tall, close-set letters: the name is nine long and has to fill a canvas a good deal less than nine letters wide.
  const kx = 1.34;
  const ky = 2.16;
  const gap = 4;
  const top = 108;
  const base = top + 28 * ky;
  const letters = [...NAME].map((ch) => LETTERS[ch]);
  const width = letters.reduce((n, l) => n + l.w * kx, 0) + gap * (letters.length - 1);
  const xs: number[] = [];
  let x = LOGO_W / 2 - width / 2;
  for (const l of letters) {
    xs.push(x);
    x += l.w * kx + gap;
  }
  const sx = xs[SWORD_AT] + (letters[SWORD_AT].w * kx) / 2;
  // The sun stands on the line the letters stand on: that line is the horizon.
  sun(p, sx, top + 30, 90, base - 2, top - 3);
  letters.forEach((l, i) => {
    if (i === SWORD_AT) return;
    p.cast(`letter-${i}-cast`, l.draw().scale(kx, ky).translate(xs[i] + 2.5, top + 3.5));
    p.piece(`letter-${i}`, l.draw().scale(kx, ky).translate(xs[i], top), GOLD, { shade: 5, holes: true });
  });
  // Where the point went in: the ground heaped a little round it, laid over the point.
  sword(p, d, sx, top, base + 9, 17, letters[SWORD_AT].w * kx + 5, 12);
  p.piece('mound', ellipse(sx, base + 7, 19, 5.5), DIRT, { shade: 2 });
  // Those who came left their arrows in it.
  arrow(p, 'arrow-a', xs[0] + 9, top + 10, -100, 34);
  arrow(p, 'arrow-b', xs[8] + 18, top + 12, -70, 34);
  arrow(p, 'arrow-c', xs[6] + 20, top + 6, -80, 28);
}

/** The whole logo. */
export function lastanderLogo(): Doc {
  const d = new Doc('logo');
  paint(d, 'edge');
  paint(d, 'art');
  return d;
}

function paintMark(d: Doc, pass: 'edge' | 'art'): void {
  const p = painter(d, pass);
  const cx = MARK_SIZE / 2 - 8;
  sun(p, cx, 112, 56, 132, 118);
  p.piece('ground', ellipse(cx + 6, 134, 62, 13), DIRT, { shade: 3 });
  sword(p, d, cx, 62, 138, 15, 46, 11);
  p.piece('mound', ellipse(cx, 136, 17, 5.5), DIRT, { shade: 2 });
}

/** The sword in the ground against the sun, alone, on a square. */
export function lastanderMark(): Doc {
  const d = new Doc('logo-mark');
  paintMark(d, 'edge');
  paintMark(d, 'art');
  return d;
}

export function lastanderLogoSvg(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" id="logo" width="${LOGO_W * LOGO_SCALE}" height="${LOGO_H * LOGO_SCALE}" ` +
    `viewBox="0 0 ${LOGO_W} ${LOGO_H}">\n${lastanderLogo().inner()}\n</svg>\n`
  );
}

export function lastanderMarkSvg(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" id="logo-mark" width="${MARK_SIZE * 2}" height="${MARK_SIZE * 2}" ` +
    `viewBox="0 0 ${MARK_SIZE} ${MARK_SIZE}">\n${lastanderMark().inner()}\n</svg>\n`
  );
}
