// What each figure is, in a line: its kind and how it is read at a glance.
// The roster in the guide is written from this, and the manifest carries it.

export interface UnitNote {
  kind: 'hunter' | 'monster' | 'enemy' | 'reinforcement' | 'building';
  name: string;
  read: string;
}

export const UNIT_NOTES: Record<string, UnitNote> = {
  marta: { kind: 'hunter', name: 'Marta Voss, the Lychwarden', read: 'a plain iron kettle helm, shoulders like a door under a hide, a short quilted jack, a halberd stood upright with her lamp low on it' },
  jory: { kind: 'hunter', name: 'Jory Pell, the Snaresman', read: 'a deep hood lined in red, a heavy olive coat, a pack with jaw traps swinging off it, a windlass crossbow held into his shoulder' },
  agnes: { kind: 'hunter', name: 'Agnes Thorn, the Lamplighter', read: 'a flat cap and a soot-black smock, a ladder standing up over her back, a long pole with its wick burning at the far end' },
  brask: { kind: 'hunter', name: 'Old Brask, the Kennelman', read: 'a barrel of a man under a ragged wolf pelt, bald, a beard like a spade, a boar spear stood upright, a hound at his knee' },
  sexton: { kind: 'monster', name: 'The Sexton', read: 'a back like a barrow with candles and their wax run down it, a tiny hooded head, a pointed grave spade the size of a door, an arm that drags a great bell, a red cage on his chest' },
  risen: { kind: 'enemy', name: 'One of the risen', read: 'a corpse bent double in a torn shroud, both arms reaching, its head hanging, grave earth on it' },
  pikeman: { kind: 'reinforcement', name: 'Pikeman of the lodge', read: 'a quilted coat with a red tabard, a mail hood under an iron cap, a pike held low' },
  hound: { kind: 'reinforcement', name: 'Hound', read: 'deep chest and thin loin, a heavy brow, an open jaw, a red rag at its collar' },
  ballista: { kind: 'building', name: 'Ballista', read: 'a great crossbow tipped up on a sled, a bolt as long as a man' },
  watchfire: { kind: 'building', name: 'Watchfire', read: 'an iron basket on three legs with the fire in it' },
  barricade: { kind: 'building', name: 'Barricade', read: 'sharpened stakes lashed across a log' },
  streetlamp: { kind: 'building', name: 'Street lamp', read: 'a short iron post with a lit square lantern, stood down by the Lamplighter' },
};
