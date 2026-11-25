// The wild places: the Mireborn of the marsh, the folk of the Wildwood, and
// the Stormriders of the open steppe. Their riders, their beasts and what
// they build are in the files for those.

import { ARCANE, BONE, BRONZE, BUSH, DARK_CLOTH, DIRT, HOLY, IRON, LEATHER, LINEN, RUBY, STONE, VENOM } from '../kit/palette';
import { furCollar, lacing, patch, seam } from '../kit/parts';
import { bandolier, furHem, ropeBelt, sash } from '../kit/gear';
import type { UnitArt } from '../kit/unit';
import { H, HOLD, O, W, X } from './catalogue';
import { figure } from './figure';
import { B } from './wearing';

const MIRE = 'Mireborn';
const WOOD = 'Wildwood';
const STORM = 'Stormriders';

export const WILDS_ART: UnitArt[] = [
  // ---------------------------------------------------------- the Mireborn
  figure('bogspear', {
    set: MIRE, role: 'melee', read: 'a cone of straw, a spear of three tines, a shield of hide',
    head: H.strawCone(), body: B.tunic((c) => { patch(c, 98, 114); ropeBelt(c); }), arm: W.trident(72, IRON), hold: HOLD.level, off: O.hide(),
  }),
  figure('netter', {
    set: MIRE, role: 'ranged', read: 'a hood worn to rags, a net gathered to cast, a sickle in the other hand',
    head: H.ragged(BUSH), body: B.tunic((c) => ropeBelt(c)), arm: W.net(), hold: [130, 112, 12], off: O.held(W.sickle(), [76, 138], -30, 'sickle'),
  }),
  figure('leecher', {
    set: MIRE, role: 'support', read: 'a brown toadstool for a hat, a flask of what it gathers, a basket on the back',
    head: H.mushroom(DIRT, 'team'), back: [X.basket(BUSH)], body: B.tunic((c) => { seam(c); ropeBelt(c); }), arm: W.flask(VENOM), hold: HOLD.up,
  }),
  figure('sporecaller', {
    // Violet, not red: a red cap as big as the head would be taken for the enemy's color on a soldier of the player's.
    set: MIRE, role: 'caster', read: 'a violet spotted toadstool for a hat, and a staff with another grown on it',
    head: H.mushroom(ARCANE, LINEN), body: B.robe(BONE), arm: W.sporeStaff(VENOM, ARCANE), hold: HOLD.staff,
  }),
  figure('mudbrute', {
    set: MIRE, role: 'ranged', read: 'a hollow stump for a helm with a twig in leaf, and a boulder held overhead',
    head: H.stump(), body: B.bulk((c) => { patch(c, 104, 120, 14, 12); ropeBelt(c, 142); }, { from: [116, 108] }), shadow: 42,
    arm: W.boulder(STONE), hold: [112, 58, 0], top: 14,
  }),
  figure('bogwitch', {
    set: MIRE, role: 'captain', read: 'a hood wreathed in leaves, a crook with a green lantern, a torn dark cape',
    head: H.wreath(), back: [X.tornCape(DARK_CLOTH)], body: B.robe(BONE), arm: W.crookLantern(VENOM), hold: [129, 135, 4],
  }),
  figure('mirelord', {
    set: MIRE, role: 'boss', read: 'a great pale toadstool spotted red, a scythe, a cloak of moss',
    head: H.mushroom(BONE, 'team', RUBY), back: [X.furCloak(BUSH)], body: B.bulk((c) => { ropeBelt(c, 142); furHem(c, BUSH, 152); }), shadow: 44,
    arm: W.scythe(88), hold: [122, 142, 14],
  }),

  // ---------------------------------------------------------- the Wildwood
  figure('thornspear', {
    set: WOOD, role: 'melee', read: 'a green pointed cap with a feather, a spear, a slab of bark for a shield',
    head: H.featherCap(BUSH, 'team'), body: B.tunic((c) => lacing(c, 112, 108)), arm: W.spear(68), hold: HOLD.level, off: O.bark(),
  }),
  figure('wolfhunter', {
    set: WOOD, role: 'ranged', read: 'a grey wolf\'s pelt for a hood, ears and all, a throwing stick, javelins on the back',
    head: H.pelt(STONE), back: [X.javelins()], body: B.tunic((c) => { seam(c); furHem(c, STONE, 152); }), arm: W.boomerang(), hold: HOLD.up,
  }),
  figure('bearclaw', {
    set: WOOD, role: 'melee', read: 'a bear\'s pelt for a hood with its round ears, and most of a tree for a club',
    head: H.pelt(LEATHER, true), body: B.bulk((c) => furHem(c, LEATHER, 152), { over: (d) => furCollar(d, LEATHER) }), shadow: 42, arm: W.club(72), hold: HOLD.low,
  }),
  figure('druid', {
    set: WOOD, role: 'caster', read: 'a pale hood wreathed in leaves, and a staff with a green crescent moon',
    head: H.wreath(LINEN), body: B.robe(BONE, (c, team) => { void team; sash(c, LINEN); }), arm: W.moonStaff(VENOM), hold: HOLD.staff,
  }),
  figure('barkguard', {
    set: WOOD, role: 'melee', read: 'a stump helm banded dark, a staff shod with iron, a turtle\'s shell for a shield',
    head: H.stump(LEATHER, BUSH), body: B.tunic((c) => ropeBelt(c)), arm: W.quarterstaff(64), hold: [124, 136, 24], off: O.shell(),
  }),
  figure('packmaster', {
    set: WOOD, role: 'captain', read: 'a white wolf\'s pelt, a whip, a cloak of grey fur',
    head: H.pelt(BONE), back: [X.furCloak(STONE)], body: B.tunic((c) => bandolier(c)), arm: W.whip(), hold: [130, 126, 6],
  }),
  figure('elderthorn', {
    set: WOOD, role: 'boss', read: 'antlers branching wider than its shoulders over a veil, a living staff with a bud alight, a cloak of moss',
    head: H.antlerCrown(), back: [X.furCloak(BUSH)], body: B.robe(BONE, undefined, { shape: 'robe', over: (d) => furCollar(d, BUSH) }), shadow: 42,
    arm: W.branchStaff(HOLY, 76), hold: HOLD.staff,
  }),

  // ---------------------------------------------------------- the Stormriders, on foot
  figure('lamellar', {
    set: STORM, role: 'melee', read: 'a pointed helm with a tail of hair, a curved blade, a round shield of hide',
    head: H.tailHelm(), body: B.scale(LEATHER), arm: W.cutlass(56), hold: HOLD.one, off: O.hide([78, 138], LEATHER, BONE),
  }),
  figure('skirmisher', {
    set: STORM, role: 'ranged', read: 'a round fur hat with a flap, a short bow, a hem of fur',
    head: H.furCap(LEATHER), back: [X.quiver()], body: B.tunic((c) => { sash(c, BONE); furHem(c, LEATHER, 152); }), arm: W.bow(), hold: HOLD.bow, off: O.arrow(), offOver: true,
  }),
  figure('stormcaller', {
    set: STORM, role: 'support', read: 'a leather cap with a bull\'s horns, a drum slung in front, a beater raised',
    head: H.bull(LEATHER, BONE), body: B.tunic((c) => furHem(c, BONE, 152)), arm: W.beater(), hold: [129, 104, 24], off: O.drum([112, 142]),
  }),
  figure('wrangler', {
    set: STORM, role: 'ranged', read: 'a wound cloth over the head, a sling whirled high, a coil of rope',
    head: H.wrap(), body: B.tunic((c) => { lacing(c, 112, 108); furHem(c, LEATHER, 152); }), arm: W.sling(), hold: [130, 108, 0], off: O.rope([76, 132]),
  }),
  figure('bannerlord', {
    set: STORM, role: 'captain', read: 'a bronze pointed helm with a tail of hair, the horde\'s standard, a cloak of fur',
    head: H.tailHelm('team', BRONZE), back: [X.furCloak(LEATHER)], body: B.scale(BRONZE), arm: W.standard(90, LEATHER, BONE), hold: [130, 138, 4],
  }),
];
