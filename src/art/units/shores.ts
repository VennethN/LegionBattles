// By the water and under the sun: the Tidewatch, who take ships, and the
// Sunspear Dynasty of the old desert.

import { BONE, BRONZE, DARK_CLOTH, FROST, GOLD, HOLY, IRON, LEATHER, LINEN, RUBY, VENOM } from '../kit/palette';
import { buttons, mantle, seam } from '../kit/parts';
import { bandolier, hoops, medal, sash } from '../kit/gear';
import type { UnitArt } from '../kit/unit';
import { H, HOLD, O, W, X } from './catalogue';
import { figure } from './figure';
import { B } from './wearing';

const TIDE = 'Tidewatch';
const SUN = 'Sunspear';

export const SHORES_ART: UnitArt[] = [
  // ---------------------------------------------------------- the Tidewatch
  figure('deckhand', {
    set: TIDE, role: 'melee', read: 'a knotted cap, a hooped shirt, a cutlass, a hook where a hand would be',
    head: H.bandana(), body: B.tunic((c) => hoops(c)), arm: W.cutlass(), hold: HOLD.one, off: O.hook([78, 138]),
  }),
  figure('powdermonkey', {
    set: TIDE, role: 'ranged', read: 'a dark knotted cap, a bomb with its fuse lit, a keg under the arm',
    head: H.bandana(DARK_CLOTH, 'team'), body: B.tunic((c) => hoops(c)), arm: W.bomb(), hold: HOLD.up, off: O.keg(),
  }),
  figure('anchorman', {
    set: TIDE, role: 'melee', read: 'a pale cloth wound round the head, a hooped shirt, and a ship\'s anchor swung in both hands',
    head: H.wrap(LINEN), body: B.bulk((c) => hoops(c)), shadow: 42, arm: W.anchor(64), hold: HOLD.low,
  }),
  figure('marine', {
    set: TIDE, role: 'ranged', read: 'a round helm of mail and a band, a long gun, a coil of rope',
    head: H.coif(IRON, BRONZE), body: B.tunic((c) => { hoops(c); bandolier(c); }), arm: W.arquebus(58), hold: HOLD.gun, off: O.rope([76, 132]),
  }),
  figure('seawitch', {
    set: TIDE, role: 'caster', read: 'a spined shell for a helm, and a staff with a great shell dripping',
    head: H.shell(), body: B.robe(BONE, (c) => sash(c, LINEN)), arm: W.shellStaff(FROST), hold: HOLD.staff,
  }),
  figure('quartermaster', {
    set: TIDE, role: 'captain', read: 'a dark hat of three corners, the key to the stores, the ledger rolled',
    head: H.tricorn(DARK_CLOTH), back: [X.cape(DARK_CLOTH, 0.5)], body: B.tunic((c) => buttons(c)), arm: W.greatKey(), hold: HOLD.one, off: O.scroll(),
  }),
  figure('corsair', {
    set: TIDE, role: 'boss', read: 'a great hat worn side on with gold along its edge, a long cutlass, a pistol across the body, a cape',
    head: H.bicorne(DARK_CLOTH), back: [X.cape()], body: B.bulk((c) => { buttons(c); sash(c, GOLD); }), shadow: 42,
    arm: W.cutlass(62), hold: HOLD.one, off: O.held(W.arquebus(40), [86, 128], 84, 'pistol'),
  }),

  // ---------------------------------------------------------- the Sunspear Dynasty
  figure('sunguard', {
    set: SUN, role: 'melee', read: 'a banded cloth falling to each shoulder, a sickle sword of gold, a tall shield of bronze',
    head: H.nemes(), body: B.scale(BRONZE), arm: W.khopesh(), hold: HOLD.one, off: O.tower([74, 138], BRONZE),
  }),
  figure('sandarcher', {
    set: SUN, role: 'ranged', read: 'a great pale turban with a jewel, a bow, a quiver',
    head: H.turban(LINEN), back: [X.quiver()], body: B.tunic((c) => sash(c, GOLD)), arm: W.bow(), hold: HOLD.bow, off: O.arrow(), offOver: true,
  }),
  figure('medjay', {
    set: SUN, role: 'melee', read: 'a pointed helm with cloth hung from it, a mace, a shield of hide',
    head: H.spike(), body: B.tunic((c) => { seam(c); }), arm: W.mace(50), hold: HOLD.one, off: O.hide([76, 138], BONE, BRONZE),
  }),
  figure('embalmer', {
    set: SUN, role: 'support', read: 'a pale hood with a plate of gold across its opening, and a green light over an open hand',
    head: H.maskHood(LINEN, GOLD), body: B.robe(GOLD), arm: W.orbHand(VENOM), hold: [130, 116, 10],
  }),
  figure('sunpriest', {
    set: SUN, role: 'caster', read: 'a cowl banded with gold, a staff with the sun at its head, a pale mantle',
    head: H.cowl(), body: B.robe(GOLD, undefined, { over: (d) => mantle(d, LINEN) }), arm: W.sunStaff(HOLY), hold: HOLD.staff,
  }),
  figure('vizier', {
    set: SUN, role: 'captain', read: 'a pale mitre banded with gold, a crook of gold in one hand and a flail in the other',
    head: H.mitre(LINEN, 'team'), body: B.robe(GOLD, (c) => sash(c, GOLD)), arm: W.crook(62, GOLD), hold: [130, 136, 8], off: O.held(W.flail(24), [78, 132], -24, 'flail'),
  }),
  figure('sunregent', {
    set: SUN, role: 'boss', read: 'the sun stood behind a helm of gold with rays about it, a great sickle sword, a cape',
    head: H.sunDisc(), back: [X.cape()], body: B.bulk((c) => medal(c), { sleeve: BRONZE, shoulder: GOLD }), legs: BRONZE, shadow: 44,
    arm: W.khopesh(68), hold: [126, 136, 22],
  }),
];
void RUBY;
void LEATHER;
