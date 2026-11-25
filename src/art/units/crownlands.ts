// More of the Crownlands: the kingdom's ranks beyond the first seven, its
// court, and the folk of its towns.

import { BONE, DARK_CLOTH, FIRE, GOLD, HOLY, IRON, LEATHER, LINEN, RUBY, STEEL, STONE, VENOM, WOOD } from '../kit/palette';
import { STRAW } from '../kit/heads';
import { buttons, furCollar, lacing, mantle, patch, seam } from '../kit/parts';
import { apron, bandolier, medal, quartered, ropeBelt, sash } from '../kit/gear';
import type { UnitArt } from '../kit/unit';
import { H, HOLD, O, W, X } from './catalogue';
import { figure } from './figure';
import { B } from './wearing';

const SET = 'Crownlands';
const TOWN = 'Townsfolk';

export const CROWNLANDS_ART: UnitArt[] = [
  figure('pikeman', {
    set: SET, role: 'melee', read: 'the sallet with its tail behind, and a pike twice its height',
    head: H.sallet(), body: B.plate(STEEL), legs: STEEL, arm: W.spear(104), hold: HOLD.tall,
  }),
  figure('crossbowman', {
    set: SET, role: 'ranged', read: 'the kettle hat, a crossbow levelled, a pavise slung on its back',
    head: H.kettle(), back: [X.slung(WOOD, IRON)], body: B.tunic((c) => bandolier(c)), arm: W.crossbow(), hold: HOLD.gun,
  }),
  figure('longbowman', {
    set: SET, role: 'ranged', read: 'a head of mail with a steel band, a bow taller than itself, a quiver',
    head: H.coif(), back: [X.quiver()], body: B.tunic((c) => lacing(c, 112, 108)), arm: W.longbow(), hold: HOLD.bow, off: O.arrow(), offOver: true,
  }),
  figure('musketeer', {
    set: SET, role: 'ranged', read: 'the morion with its comb and upswept brim, a long gun levelled, a cape',
    head: H.morion(), back: [X.cape()], body: B.tunic((c) => { buttons(c); sash(c, LINEN); }), arm: W.arquebus(), hold: HOLD.gun,
  }),
  figure('duelist', {
    set: SET, role: 'melee', read: 'a broad hat with a great feather, a rapier at full reach, a small buckler',
    head: H.cavalier(LEATHER), body: B.tunic((c) => { lacing(c, 112, 108); }), arm: W.rapier(), hold: [128, 132, 66], off: O.buckler([82, 138], 14),
  }),
  figure('swordmaster', {
    set: SET, role: 'melee', read: 'the barbute with its fin, and a sword in each hand',
    head: H.barbute(), body: B.plate(STEEL), legs: STEEL, arm: W.sword(62, STEEL), hold: [128, 134, 34], off: O.held(W.sword(54, STEEL), [74, 136], -36, 'sword-back'),
  }),
  figure('templar', {
    set: SET, role: 'melee', read: 'a great helm banded with gold, a morning star, a heater shield, a cape',
    head: H.greatHelm(), back: [X.cape()], body: B.plate(STEEL, (c) => quartered(c)), legs: STEEL, arm: W.morningstar(), hold: HOLD.one, off: O.heater(),
  }),
  figure('gendarme', {
    set: SET, role: 'melee', read: 'a visor drawn to a point like a hound\'s muzzle, and a glaive in both hands',
    head: H.hounskull(), back: [X.cape()], body: B.plate(STEEL), legs: STEEL, arm: W.glaive(), hold: HOLD.low,
  }),
  figure('champion', {
    set: SET, role: 'boss', read: 'three long plumes from a closed helm, a sword as long as itself, a cape',
    head: H.plumed(), back: [X.cape()], body: B.bulk((c) => { quartered(c); medal(c); }, { sleeve: STEEL, shoulder: STEEL }), legs: STEEL, shadow: 42,
    arm: W.greatsword(94, STEEL), hold: [122, 140, 30],
  }),
  figure('standardbearer', {
    set: SET, role: 'support', read: 'a round helm with a plume, and the standard held high',
    head: H.round(), crest: [X.plume()], body: B.plate(STEEL), legs: STEEL, arm: W.standard(), hold: [130, 138, 4],
  }),
  figure('engineer', {
    set: SET, role: 'support', read: 'a keep\'s tower for a helm, a mallet, the plans rolled in the other hand',
    head: H.tower(), back: [X.pack()], body: B.tunic((c) => apron(c, LEATHER)), arm: W.mallet(), hold: HOLD.one, off: O.scroll(),
  }),
  figure('alchemist', {
    set: SET, role: 'ranged', read: 'a knotted cap and a scarf, a flask held up to throw, a row of pouches',
    head: H.bandana(LINEN, 'team'), back: [X.pack()], body: B.tunic((c) => bandolier(c)), arm: W.flask(VENOM), hold: HOLD.up,
  }),
  figure('falconer', {
    set: SET, role: 'ranged', read: 'a pointed cap with a long feather, a hooded hawk on the fist, a javelin',
    head: H.featherCap(), body: B.tunic((c) => seam(c)), arm: W.javelin(44), hold: [126, 114, 68], off: O.hawk(),
  }),
  figure('bard', {
    set: SET, role: 'support', read: 'a soft flat cap pulled to one side, and a lute',
    head: H.beret(), back: [X.cape(LINEN, 0.5)], body: B.tunic((c) => { buttons(c); }), arm: W.lute(), hold: [126, 140, -42],
  }),
  figure('bishop', {
    set: SET, role: 'caster', read: 'a mitre banded with gold, a crosier, a book',
    head: H.mitre(), body: B.robe(GOLD, undefined, { over: (d) => mantle(d, LINEN) }), arm: W.crosier(HOLY), hold: HOLD.staff, off: O.book([72, 146]),
  }),
  figure('monarch', {
    set: SET, role: 'boss', read: 'a crown of points on a cowl, a sceptre, a mantle of fur and a long cape',
    head: H.crownCowl(), back: [X.cape()], body: B.robe(GOLD, undefined, { over: (d) => furCollar(d, BONE) }), arm: W.sceptre(RUBY), hold: [130, 126, 18],
  }),
  figure('levy', {
    set: SET, role: 'melee', read: 'a bucket for a helm, a pitchfork, a pot lid for a shield',
    head: H.bucket(), body: B.tunic((c) => { patch(c, 98, 114); ropeBelt(c); }), arm: W.trident(70, IRON), hold: HOLD.level, off: O.potLid(),
  }),

  // ---------------------------------------------------------- the folk of the towns
  figure('cook', {
    set: TOWN, role: 'melee', read: 'the tall puffed hat, a cleaver, a pot lid',
    head: H.toque(), body: B.tunic((c) => apron(c, LINEN)), arm: W.cleaver(), hold: HOLD.one, off: O.potLid([80, 140]),
  }),
  figure('baker', {
    set: TOWN, role: 'melee', read: 'a soft pale cap, a rolling pin, a sack of flour on the shoulder',
    head: H.beret(LINEN, 'team', BONE), body: B.tunic((c) => apron(c, BONE)), arm: W.rollingPin(), hold: HOLD.one, off: O.sack(),
  }),
  figure('fisher', {
    set: TOWN, role: 'ranged', read: 'a wide cone of straw, a rod with its line out, a basket on the back',
    head: H.strawCone(), back: [X.basket(STONE)], body: B.tunic((c) => { patch(c, 100, 116); ropeBelt(c); }), arm: W.fishingRod(), hold: [128, 134, 30],
  }),
  figure('farmer', {
    set: TOWN, role: 'melee', read: 'a straw hat with a broad brim, a scythe in both hands',
    head: H.brim(STRAW, 'team', LEATHER), body: B.tunic((c) => { seam(c); ropeBelt(c); }), arm: W.scythe(), hold: [122, 142, 14],
  }),
  figure('shepherd', {
    set: TOWN, role: 'support', read: 'a round fur hat with a flap over the ear, a crook, a cloak of fleece',
    head: H.furCap(BONE), back: [X.furCloak(BONE)], body: B.tunic((c) => ropeBelt(c)), arm: W.crook(), hold: HOLD.staff,
  }),
  figure('tailor', {
    set: TOWN, role: 'melee', read: 'a dark flat cap, shears as long as an arm, a bolt of cloth rolled under the other',
    head: H.beret(DARK_CLOTH, LINEN), body: B.tunic((c) => { buttons(c); sash(c, LINEN); }), arm: W.shears(), hold: [128, 134, 44], off: O.scroll([76, 138], 'team'),
  }),
  figure('carpenter', {
    set: TOWN, role: 'melee', read: 'a knotted cap, a saw, a mallet in the other hand',
    head: H.bandana(), body: B.tunic((c) => apron(c, LEATHER)), arm: W.saw(), hold: HOLD.one, off: O.held(W.mallet(34), [76, 140], -30, 'mallet'),
  }),
  figure('brewer', {
    set: TOWN, role: 'support', read: 'a round fur hat, a tankard raised, a keg under the other arm',
    head: H.furCap(LEATHER), body: B.bulk((c) => apron(c, LEATHER)), shadow: 40, arm: W.quarterstaff(40), hold: [130, 138, 10], off: O.mug([80, 128]), top: 40,
  }),
  figure('sweep', {
    set: TOWN, role: 'melee', read: 'a tall black hat, and a broom of twigs',
    head: H.stovepipe(DARK_CLOTH), body: B.tunic((c) => { buttons(c); }, { cloth: DARK_CLOTH }), back: [X.tornCape()], arm: W.broom(), hold: HOLD.staff,
  }),
  figure('fool', {
    set: TOWN, role: 'support', read: 'a cap of two horns with a bell on each, and a bauble',
    head: H.jester(), body: B.tunic((c) => quartered(c)), arm: W.wand(HOLY, 30), hold: HOLD.one,
  }),
  figure('watchman', {
    set: TOWN, role: 'support', read: 'a kettle hat of iron, a lantern held out, a staff',
    head: H.kettle(IRON, LEATHER), back: [X.cape(DARK_CLOTH, 0.5)], body: B.tunic((c) => buttons(c)), arm: W.lantern(FIRE), hold: [138, 118, 0],
    off: O.held(W.quarterstaff(60), [78, 138], -6, 'staff'),
  }),
  figure('woodcutter', {
    set: TOWN, role: 'melee', read: 'a deep hood, a felling axe, a pack of split wood on the back',
    head: H.hood('team', 4), back: [X.pack(WOOD, LEATHER)], body: B.bulk((c) => { seam(c); }), shadow: 40, arm: W.handAxe(56), hold: HOLD.one,
  }),
];
void GOLD;
void RUBY;
