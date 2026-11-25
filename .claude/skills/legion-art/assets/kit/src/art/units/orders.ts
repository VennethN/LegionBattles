// The orders: the Artificers' Guild, who build what fights for them, and the
// Veiled Order, who serve something they do not name.

import { ARCANE, BONE, BRONZE, DARK_CLOTH, GOLD, IRON, LEATHER, LINEN, RUBY, STEEL } from '../kit/palette';
import { buttons, mantle, seam } from '../kit/parts';
import { apron, bandolier, ropeBelt, sash } from '../kit/gear';
import type { UnitArt } from '../kit/unit';
import { H, HOLD, O, W, X } from './catalogue';
import { figure } from './figure';
import { B } from './wearing';

const GUILD = 'Artificers';
const VEIL = 'Veiled Order';

export const ORDERS_ART: UnitArt[] = [
  // ---------------------------------------------------------- the Artificers' Guild
  figure('tinker', {
    set: GUILD, role: 'melee', read: 'a cog for a crest on a bronze helm, a wrench, a boiler on the back',
    head: H.gear(BRONZE), back: [X.boiler(BRONZE)], body: B.tunic((c) => apron(c, LEATHER)), arm: W.wrench(), hold: HOLD.one,
  }),
  figure('rifleman', {
    set: GUILD, role: 'ranged', read: 'a steel drum of a helm with a barred grille and a pipe, a long gun, pouches',
    head: H.boiler(STEEL), body: B.tunic((c) => bandolier(c)), arm: W.arquebus(64), hold: HOLD.gun,
  }),
  figure('sparkcaller', {
    set: GUILD, role: 'caster', read: 'a bronze cap with a violet flame on it, a wand with a star, a book held open',
    head: H.mining('team', BRONZE, ARCANE), body: B.robe(BRONZE), arm: W.wand(ARCANE, 36), hold: HOLD.one, off: O.held(W.tome(ARCANE), [80, 132], -10, 'tome'),
  }),
  figure('clockmage', {
    set: GUILD, role: 'caster', read: 'a tall dark hat banded in bronze, and a staff with an hourglass at its head',
    head: H.stovepipe(DARK_CLOTH, 'team', BRONZE), body: B.robe(BRONZE, (c) => buttons(c)), arm: W.hourglassStaff(ARCANE), hold: HOLD.staff,
  }),
  figure('sapper', {
    set: GUILD, role: 'melee', read: 'a bucket helm hooped in bronze, a shovel in both hands, a pack',
    head: H.bucket(LEATHER, BRONZE), back: [X.pack(LEATHER, BRONZE)], body: B.tunic((c) => seam(c)), arm: W.shovel(), hold: [122, 142, 20],
  }),
  figure('gearwright', {
    set: GUILD, role: 'captain', read: 'a gold cog over a steel helm, a mallet, a violet lantern',
    head: H.gear(STEEL, GOLD), body: B.tunic((c) => { apron(c, LEATHER); sash(c, BRONZE); }), arm: W.mallet(48), hold: HOLD.one, off: O.held(W.lantern(ARCANE), [78, 122], 0, 'lantern'),
  }),
  figure('ironmonger', {
    set: GUILD, role: 'boss', read: 'a boiler of gold for a helm, a wrench as long as an arm, a great tank on the back',
    head: H.boiler(GOLD), back: [X.boiler(GOLD)], body: B.bulk((c) => apron(c, LEATHER), { sleeve: BRONZE, shoulder: BRONZE }), legs: IRON, shadow: 44,
    arm: W.wrench(64, GOLD), hold: HOLD.low,
  }),

  // ---------------------------------------------------------- the Veiled Order
  figure('acolyte', {
    set: VEIL, role: 'melee', read: 'a tall cone of a hood with one slit, a knife, a violet brand',
    head: H.capirote(), body: B.tunic((c) => ropeBelt(c)), arm: W.dagger(36), hold: [128, 130, 70], off: O.held(W.torch(ARCANE, 30), [76, 132], -24, 'brand'),
  }),
  figure('penitent', {
    set: VEIL, role: 'melee', read: 'a dark cloth wound round the head, a flail, a rope for a belt',
    head: H.wrap(DARK_CLOTH), body: B.tunic((c) => { ropeBelt(c); }), arm: W.flail(36), hold: HOLD.one,
  }),
  figure('voidcaller', {
    set: VEIL, role: 'caster', read: 'a hood with a plate of bone across its opening, a book held open and alight, a dark mantle',
    head: H.maskHood(), body: B.robe(BONE, undefined, { over: (d) => mantle(d, DARK_CLOTH, null) }), arm: W.tome(ARCANE, DARK_CLOTH), hold: [130, 116, 8],
  }),
  figure('oathblade', {
    set: VEIL, role: 'melee', read: 'a dark sallet, a mace, a heater shield of iron, a torn cape',
    head: H.sallet(IRON), back: [X.tornCape()], body: B.plate(IRON), legs: IRON, arm: W.mace(52), hold: HOLD.one, off: O.heater([74, 140], IRON, BONE),
  }),
  figure('whisperer', {
    set: VEIL, role: 'support', read: 'a veil over the whole head with a violet stone at the brow, and a censer on its chain',
    head: H.mournVeil('team', GOLD, ARCANE), body: B.robe(GOLD), arm: W.censer(ARCANE, 26), hold: [138, 121, 0],
  }),
  figure('inquisitor', {
    set: VEIL, role: 'captain', read: 'a dark broad hat pulled low, a burning brand, a book',
    head: H.brim(DARK_CLOTH, 'team', RUBY), back: [X.cape(DARK_CLOTH, 0.5)], body: B.tunic((c) => buttons(c)), arm: W.torch(), hold: HOLD.one, off: O.book([72, 146], DARK_CLOTH),
  }),
  figure('hierophant', {
    set: VEIL, role: 'boss', read: 'a black sun stood behind a helm of iron, a crosier with a violet stone, a torn cape',
    head: H.sunDisc(IRON, IRON), back: [X.tornCape()], body: B.robe(BONE, undefined, { over: (d) => mantle(d, DARK_CLOTH, GOLD) }), shadow: 42,
    arm: W.crosier(ARCANE, 80), hold: HOLD.staff,
  }),
];
void LINEN;
