// Every part of every unit in the kit, held to its page: the art build looks only at the units its game shows.
import { Resvg } from '@resvg/resvg-js';
import { CANVAS, MARGIN } from '../src/art/kit/draw';
import { drawPart } from '../src/art/kit/unit';
import { UNIT_ART } from '../src/art/units';
const size = CANVAS + MARGIN * 2;
let bad = 0;
for (const unit of UNIT_ART) for (const part of unit.parts) {
  const svg = drawPart(unit, part, 'blue').svg(CANVAS, CANVAS, MARGIN);
  const px = new Resvg(svg).render().pixels;
  let off = false;
  for (let i = 0; i < size && !off; i++) off = px[i * 4 + 3] > 0 || px[((size - 1) * size + i) * 4 + 3] > 0 || px[(i * size) * 4 + 3] > 0 || px[(i * size + size - 1) * 4 + 3] > 0;
  if (off) { bad++; console.log('off its page:', unit.id, part.name); }
}
console.log(UNIT_ART.length, 'units,', bad, 'parts off their page');
