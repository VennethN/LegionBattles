// Under the ground and near the fire: the Emberforged of the burning hills,
// the Stonekin who delve, and the Hollow Court of the crypts.

import { ARCANE, BONE, BRONZE, CLOTH, DARK_CLOTH, FIRE, FROST, GOLD, HOLY, IRON, LEATHER, LINEN, STEEL, STONE } from '../kit/palette';
import { belt, mantle, seam, skirt } from '../kit/parts';
import { apron, bandolier, ribs, ropeBelt, sash } from '../kit/gear';
import type { UnitArt } from '../kit/unit';
import { H, HOLD, O, W, X } from './catalogue';
import { figure, wear } from './figure';
import { B } from './wearing';

const EMBER = 'Emberforged';
const STONEKIN = 'Stonekin';
const HOLLOW = 'Hollow Court';

export const DEEPS_ART: UnitArt[] = [
  // ---------------------------------------------------------- the Emberforged
  figure('cinderguard', {
    set: EMBER, role: 'melee', read: 'a great helm of dark iron banded in bronze, a mace, a round shield with a spike',
    head: H.greatHelm(IRON, BRONZE), back: [X.cape()], body: B.scale(IRON), legs: IRON, arm: W.mace(), hold: HOLD.one, off: O.spike(),
  }),
  figure('brandbearer', {
    set: EMBER, role: 'melee', read: 'a head wound in cloth, and a burning brand in each hand',
    head: H.wrap(), body: B.tunic((c) => { sash(c, DARK_CLOTH); }), arm: W.torch(), hold: HOLD.one, off: O.held(W.torch(FIRE, 30), [76, 134], -28, 'brand'),
  }),
  figure('slagthrower', {
    set: EMBER, role: 'ranged', read: 'a flat mask of plate, a bomb held up with its fuse lit, a row of pouches',
    head: H.forgeMask(), back: [X.pack(IRON, LEATHER)], body: B.tunic((c) => { bandolier(c); apron(c, LEATHER); }), arm: W.bomb(), hold: HOLD.up,
  }),
  figure('ashcaster', {
    set: EMBER, role: 'caster', read: 'a dark hood worn to rags, and a ball of fire over an open hand',
    head: H.ragged(DARK_CLOTH), back: [X.tornCape(DARK_CLOTH)], body: B.robe(BRONZE), arm: W.orbHand(FIRE, 12), hold: [130, 116, 10],
  }),
  figure('emberbrute', {
    set: EMBER, role: 'melee', read: 'a bull\'s horns on a helm of iron, and a great pick in both hands',
    head: H.bull(), body: B.bulk((c) => apron(c, LEATHER), { shoulder: IRON }), shadow: 42, arm: W.pick(72, true), hold: HOLD.low,
  }),
  figure('taskmaster', {
    set: EMBER, role: 'captain', read: 'a boiler for a helm with a pipe behind and a barred grille, a whip, a lantern',
    head: H.boiler(BRONZE), body: B.tunic((c) => { seam(c); }, { sleeve: LEATHER }), arm: W.whip(), hold: [130, 126, 6], off: O.held(W.lantern(FIRE), [78, 122], 0, 'lantern'),
  }),
  figure('forgelord', {
    set: EMBER, role: 'boss', read: 'an anvil for a helm, its horn forward, a hammer like an anvil too, a cape',
    head: H.anvil(), back: [X.cape()], body: B.bulk((c) => apron(c, LEATHER), { sleeve: IRON, shoulder: IRON }), legs: IRON, shadow: 44,
    arm: W.greatHammer(82), hold: HOLD.low,
  }),

  // ---------------------------------------------------------- the Stonekin
  figure('tunnelguard', {
    set: STONEKIN, role: 'melee', read: 'a banded helm with mail hung from it, a war hammer, a tower shield of iron',
    head: H.spangen(), back: [X.cape()], body: B.mail(), legs: IRON, arm: W.warhammer(52), hold: HOLD.one, off: O.tower([74, 138], IRON),
  }),
  figure('delver', {
    set: STONEKIN, role: 'melee', read: 'a cap with a candle burning on it, a pick in both hands, a pack',
    head: H.mining(), back: [X.pack()], body: B.tunic((c) => { seam(c); }), arm: W.pick(66, true), hold: HOLD.low,
  }),
  figure('blaster', {
    set: STONEKIN, role: 'ranged', read: 'a kettle hat of iron, a bomb held up, pouches across the chest',
    head: H.kettle(IRON, LEATHER), body: B.tunic((c) => bandolier(c)), arm: W.bomb(FIRE, 13), hold: HOLD.up, off: O.keg(),
  }),
  figure('runesmith', {
    set: STONEKIN, role: 'caster', read: 'a great helm cut from stone, a slab with a sign alight held up, a mallet',
    head: H.greatHelm(STONE, GOLD), body: B.robe(GOLD, undefined, { over: (d) => mantle(d, LEATHER) }), arm: W.runeTablet(HOLY), hold: [130, 118, 12],
    off: O.held(W.mallet(30), [76, 140], -30, 'mallet'),
  }),
  figure('foreman', {
    set: STONEKIN, role: 'captain', read: 'a bronze cap with a candle, a lantern held out, the plans rolled',
    head: H.mining('team', BRONZE), body: B.tunic((c) => { sash(c, LEATHER); }), arm: W.lantern(FIRE), hold: [138, 118, 0], off: O.scroll(),
  }),
  figure('underking', {
    set: STONEKIN, role: 'boss', read: 'a helm with crystals grown through its crown, a great pick, a cape',
    head: H.crystal(FROST), back: [X.cape()], body: B.bulk(undefined, { sleeve: IRON, shoulder: GOLD }), legs: IRON, shadow: 44,
    arm: W.pick(76, true), hold: HOLD.low,
  }),

  // ---------------------------------------------------------- the Hollow Court
  figure('cryptguard', {
    set: HOLLOW, role: 'melee', read: 'a dark barbute, ribs of bone laced over the chest, a flail, a tower shield',
    head: H.barbute(IRON), back: [X.tornCape()], legs: IRON,
    body: wear({ cloth: DARK_CLOTH, sleeve: IRON, on: (c, team) => { ribs(c); skirt(c, CLOTH[team]); belt(c); } }),
    arm: W.flail(), hold: HOLD.one, off: O.tower([74, 138], IRON, BONE),
  }),
  figure('shroud', {
    set: HOLLOW, role: 'melee', read: 'a dark hood with a plate of bone across its opening, and a sickle in each hand',
    head: H.maskHood(DARK_CLOTH), back: [X.tornCape(DARK_CLOTH)], body: B.tunic((c) => ropeBelt(c)), arm: W.sickle(24), hold: HOLD.one,
    off: O.held(W.sickle(20), [76, 138], -34, 'sickle'),
  }),
  figure('mourner', {
    set: HOLLOW, role: 'support', read: 'a dark veil over the whole head with a circlet, and three candles burning violet',
    head: H.mournVeil(DARK_CLOTH, GOLD, ARCANE), body: B.robe(BONE), arm: W.candelabra(ARCANE), hold: [130, 130, 10],
  }),
  figure('ferryman', {
    set: HOLLOW, role: 'melee', read: 'a deep dark hood, an oar in both hands, a violet lantern at its belt',
    head: H.hood(DARK_CLOTH, 14), body: B.robe(BONE), arm: W.oar(), hold: [122, 142, 16], off: O.held(W.lantern(ARCANE), [78, 126], 0, 'lantern'),
  }),
  figure('urnbearer', {
    set: HOLLOW, role: 'ranged', read: 'a dark cowl banded with bone, a flask of violet held up, a torn cape',
    head: H.cowl(DARK_CLOTH, BONE), back: [X.tornCape()], body: B.tunic((c) => sash(c, BONE)), arm: W.flask(ARCANE), hold: HOLD.up,
  }),
  figure('cryptkeeper', {
    set: HOLLOW, role: 'captain', read: 'a dark hood with a long tail down the back, a great iron key, a violet lantern',
    head: H.tailHood(DARK_CLOTH), body: B.robe(BONE), arm: W.greatKey(58, IRON), hold: HOLD.one, off: O.held(W.lantern(ARCANE), [78, 124], 0, 'lantern'),
  }),
  figure('hollowking', {
    set: HOLLOW, role: 'boss', read: 'a tall crown with a violet stone over a head veiled whole, a sceptre, a torn cape',
    head: H.tallCrown(LINEN, GOLD, ARCANE), back: [X.tornCape()], body: B.robe(BONE, undefined, { over: (d) => mantle(d, DARK_CLOTH, BONE) }), shadow: 42,
    arm: W.sceptre(ARCANE, 50), hold: [130, 126, 16],
  }),
];
void STEEL;
