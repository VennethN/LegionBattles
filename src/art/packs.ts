// The packs, drawn. Every pack is a foil pouch: crimped shut at the top and
// the bottom, a band across it, a mark on a seal in the middle. What tells
// one from another is its color and its mark, never its shape.

import { Doc } from './kit/draw';
import { ARCANE, BONE, BUSH, CLOTH, FROST, GOLD, HOLY, OUTLINE, STEEL, STONE, WOOD, type Material } from './kit/palette';
import { Path, capsule, circle, poly, smooth, star } from './kit/path';

export const PACK_W = 124;
export const PACK_H = 168;

export interface PackLook {
  foil: Material;
  band: Material;
  mark: (d: Doc, cx: number, cy: number) => void;
}

function pouch(): Path {
  // Zigzag crimps along the top and the bottom, a slight belly between.
  const pts: Array<[number, number]> = [];
  const teeth = 9;
  const x0 = 12;
  const x1 = PACK_W - 12;
  for (let i = 0; i <= teeth; i++) pts.push([x0 + ((x1 - x0) * i) / teeth, i % 2 === 0 ? 14 : 6]);
  pts.push([PACK_W - 8, 84]);
  for (let i = teeth; i >= 0; i--) pts.push([x0 + ((x1 - x0) * i) / teeth, i % 2 === 0 ? PACK_H - 14 : PACK_H - 6]);
  pts.push([8, 84]);
  return poly(pts);
}

export function drawPack(d: Doc, look: PackLook): void {
  d.piece('pouch', pouch(), look.foil, {
    shade: 7,
    inner: (c) => {
      c.piece('crimp-top', poly([[0, 0], [PACK_W, 0], [PACK_W, 26], [0, 26]]), { fill: look.foil.shade, shade: look.foil.shade }, { shade: 0 });
      c.piece('crimp-bottom', poly([[0, PACK_H - 26], [PACK_W, PACK_H - 26], [PACK_W, PACK_H], [0, PACK_H]]), { fill: look.foil.shade, shade: look.foil.shade }, { shade: 0 });
      c.piece('band', poly([[0, 108], [PACK_W, 92], [PACK_W, 112], [0, 128]]), look.band, { shade: 0 });
    },
  });
  d.piece('seal', circle(PACK_W / 2, 74, 31), BONE, { shade: 4 });
  look.mark(d, PACK_W / 2, 74);
  d.glint('glint', capsule(24, 40, 34, 34, 6));
}

export const PACK_LOOKS: Readonly<Record<string, PackLook>> = {
  recruit: {
    foil: CLOTH.blue,
    band: GOLD,
    mark: (d, cx, cy) => {
      d.piece('mark', smooth([[cx - 15, cy - 14, 'c'], [cx, cy - 18], [cx + 15, cy - 14, 'c'], [cx + 15, cy], [cx + 9, cy + 12], [cx, cy + 19, 'c'], [cx - 9, cy + 12], [cx - 15, cy]]), STEEL, { shade: 3 });
    },
  },
  builder: {
    foil: WOOD,
    band: STEEL,
    mark: (d, cx, cy) => {
      // A tower: three merlons on a wall, and its gate.
      d.piece('mark', poly([
        [cx - 15, cy + 17], [cx - 15, cy - 16], [cx - 8, cy - 16], [cx - 8, cy - 9], [cx - 3.5, cy - 9], [cx - 3.5, cy - 16],
        [cx + 3.5, cy - 16], [cx + 3.5, cy - 9], [cx + 8, cy - 9], [cx + 8, cy - 16], [cx + 15, cy - 16], [cx + 15, cy + 17],
      ]), STONE, {
        shade: 3,
        inner: (c) => c.flat('gate', poly([[cx - 5, cy + 17], [cx - 5, cy + 6], [cx, cy + 1], [cx + 5, cy + 6], [cx + 5, cy + 17]]), OUTLINE),
      });
    },
  },
  thornwood: {
    foil: BUSH,
    band: GOLD,
    mark: (d, cx, cy) => {
      // A leaf with its rib.
      d.piece('mark', smooth([[cx - 16, cy + 14, 'c'], [cx - 14, cy - 8], [cx + 4, cy - 18], [cx + 18, cy - 16, 'c'], [cx + 16, cy], [cx + 4, cy + 14]]), BUSH, {
        shade: 3,
        inner: (c) => c.line('rib', smooth([[cx - 16, cy + 14], [cx + 16, cy - 14]], false)),
      });
    },
  },
  dunes: {
    foil: GOLD,
    band: CLOTH.red,
    mark: (d, cx, cy) => {
      d.piece('mark', star(cx, cy, 8, 20, 11), HOLY, { shade: 0 });
      d.piece('mark-core', circle(cx, cy, 8), GOLD, { shade: 0 });
    },
  },
  frost: {
    foil: FROST,
    band: STEEL,
    mark: (d, cx, cy) => {
      d.piece('mark', star(cx, cy, 6, 20, 7), FROST, { shade: 0 });
    },
  },
  royal: {
    foil: ARCANE,
    band: GOLD,
    mark: (d, cx, cy) => {
      d.piece('mark', poly([[cx - 17, cy + 12], [cx - 20, cy - 12], [cx - 9, cy - 2], [cx, cy - 18], [cx + 9, cy - 2], [cx + 20, cy - 12], [cx + 17, cy + 12]]), GOLD, { shade: 3 });
    },
  },
};
