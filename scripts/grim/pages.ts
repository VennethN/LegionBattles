// Every part of every figure, held to its page: what runs off the page of its file is cut off in the game.
import { Resvg } from '@resvg/resvg-js';
import { drawPart } from '../../src/grim/kit/unit';
import { UNIT_ART } from '../../src/grim/units';

let bad = 0;
for (const unit of UNIT_ART) for (const part of unit.parts) {
  const w = unit.canvas[0] + unit.margin * 2;
  const h = unit.canvas[1] + unit.margin * 2;
  const px = new Resvg(drawPart(unit, part).svg(unit.canvas[0], unit.canvas[1], unit.margin)).render().pixels;
  let off = false;
  for (let x = 0; x < w && !off; x++) off = px[x * 4 + 3] > 0 || px[((h - 1) * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h && !off; y++) off = px[y * w * 4 + 3] > 0 || px[(y * w + w - 1) * 4 + 3] > 0;
  if (off) {
    bad++;
    console.log('off its page:', unit.id, part.name);
  }
}
console.log(`pages: ${UNIT_ART.length} figures, ${bad} parts off their page`);
if (bad > 0) process.exit(1);
