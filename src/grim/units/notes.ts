// What each figure is, in a line: its kind and how it is read at a glance.
// The roster in the guide is written from this, and the manifest carries it.

export interface UnitNote {
  kind: 'hunter' | 'monster' | 'enemy' | 'reinforcement' | 'building' | 'folk' | 'hireling' | 'prop';
  name: string;
  read: string;
}

export const UNIT_NOTES: Record<string, UnitNote> = {
  marta: { kind: 'hunter', name: 'Marta Voss, the Warden', read: 'a plain iron kettle helm, shoulders like a door under a hide, a short quilted jack, a halberd stood upright with her lamp low on it' },
  jory: { kind: 'hunter', name: 'Jory Pell, the Poacher', read: 'a deep hood lined in red, a heavy olive coat, a pack with jaw traps swinging off it, a windlass crossbow held into his shoulder' },
  agnes: { kind: 'hunter', name: 'Agnes Thorn, the Lamplighter', read: 'a flat cap and a soot-black smock, a ladder standing up over her back, a long pole with its wick burning at the far end' },
  brask: { kind: 'hunter', name: 'Old Brask, the Dog Handler', read: 'a barrel of a man under a ragged wolf pelt, bald, a beard like a spade, a boar spear stood upright, a hound at his knee' },
  greta: { kind: 'hunter', name: 'Greta Hale, the Smith', read: 'shoulders wider than a door, bare scorched arms, a leather apron to her knees, a red kerchief, tongs at her hip and a forge sledge on her shoulder with one face still red-hot' },
  ned: { kind: 'hunter', name: 'Ned Rook, the Miner', read: 'bent and long in the arm, a coat grey with stone dust, a leather hard hat with a candle stood on it, a powder keg on his back, a pick held ready' },
  ida: { kind: 'hunter', name: 'Ida Marsh, the Ferrywoman', read: 'a long wet oilskin and a sou\'wester with its brim down her back, waders, a coil of rope, and a ferry pole three times her height with a lantern on its hook' },
  silas: { kind: 'hunter', name: 'Silas Grey, the Butcher', read: 'big and bald on no neck, a stained smock and apron with red strings, a cleaver like a tombstone held up, a meat hook swinging on a chain from the other fist' },
  sexton: { kind: 'monster', name: 'The Gravedigger', read: 'a back like a barrow with candles and their wax run down it, a tiny hooded head, a pointed grave spade the size of a door, an arm that drags a great bell, a red cage on his chest' },
  risen: { kind: 'enemy', name: 'One of the risen', read: 'a corpse bent double in a torn shroud, both arms reaching, its head hanging, grave earth on it' },
  king: { kind: 'monster', name: 'The Antlered King', read: 'a pale starved beast, all shoulder, with a dead tree of frosted antlers in which a lamp, a bell and a crow hang, an iron crown in his brow, broken spears and a red wound in his shoulder' },
  herdbeast: { kind: 'enemy', name: 'One of the herd', read: 'a hart with nothing on it but hide and frost, head down, running' },
  spinner: { kind: 'monster', name: 'The Spinner', read: 'a spindle as tall as a man wound round with grey thread on eight long legs, a small veiled head with two hooked fangs, egg sacs hung under her, a line up into the dark, and a red place where the thread has worn through' },
  spiderling: { kind: 'enemy', name: 'One of her young', read: 'a little wound spindle on thin legs, veiled, with a fang' },
  abbot: { kind: 'monster', name: 'The Bell Abbot', read: 'a giant in a sodden habit hung with weed, a green bronze bell worn over his head to the shoulders and cracked down its front with red through the crack, the bell\'s iron clapper on a pole, his beads and a wooden cross' },
  monk: { kind: 'enemy', name: 'One of his monks', read: 'a drowned monk in a deep hood with nothing under it, walking with a tall candle on a staff' },
  furnace: { kind: 'monster', name: 'The Furnace', read: 'a round iron stove on two iron legs, a leaning chimney smoking, a band of glowing vents, a barred firebox door low and off to the side, a ladle of slag for one arm and a hooked poker for the other, a seam split red-hot' },
  mirror: { kind: 'monster', name: 'The Mirror King', read: 'tall and narrow in a king\'s robe gone to rags, a fur collar, a head that is one cracked pane of mirror under a crown of glass spikes, a chest of mirror with a red pane at its heart, a long splinter of mirror for a sword' },
  reflection: { kind: 'enemy', name: 'A reflection', read: 'the Mirror King again in the pale of the glass, with no red in him, a little see-through' },
  eggsac: { kind: 'building', name: 'An egg sac', read: 'a pale veined sac as big as a calf in a nest of thread, dark shapes curled inside it' },
  cinder: { kind: 'enemy', name: 'A cinder', read: 'a lump of clinker on two stubs, glowing through its cracks, sparks off it' },
  barrel: { kind: 'building', name: 'A water barrel', read: 'a hooped barrel on its end, wet down its sides, water at its brim and a dipper in it' },
  'mirror-stand': { kind: 'building', name: 'A tall mirror', read: 'a long mirror in a carved frame on clawed iron feet, a pale band of light across its glass' },
  pikeman: { kind: 'reinforcement', name: 'Pikeman of the lodge', read: 'a quilted coat with a red tabard, a mail hood under an iron cap, a pike held low' },
  crossbowman: { kind: 'reinforcement', name: 'Crossbowman of the lodge', read: 'a great shield with a red stripe on his back, a padded cap, a crossbow at his shoulder' },
  sapper: { kind: 'reinforcement', name: 'Sapper of the lodge', read: 'bent under a keg carried in both arms, a hide hood, a pick on his back, a lit match in his teeth' },
  hound: { kind: 'reinforcement', name: 'Hound', read: 'deep chest and thin loin, a heavy brow, an open jaw, a red rag at its collar' },
  ballista: { kind: 'building', name: 'Ballista', read: 'a great crossbow tipped up on a sled, a bolt as long as a man' },
  watchfire: { kind: 'building', name: 'Watchfire', read: 'an iron basket on three legs with the fire in it' },
  barricade: { kind: 'building', name: 'Barricade', read: 'sharpened stakes lashed across a log' },
  bellpost: { kind: 'building', name: 'Bell post', read: 'a timber post and arm with a bell hung from it and a rope to ring it by' },
  streetlamp: { kind: 'building', name: 'Street lamp', read: 'a short iron post with a lit square lantern, stood down by the Lamplighter' },
  'villager-farmer': { kind: 'folk', name: 'A farmer', read: 'a straw hat with a torn brim, a pale smock, a sack over his shoulder he will not let go of, clogs; small and round-shouldered' },
  'villager-crone': { kind: 'folk', name: 'An old woman', read: 'bent nearly double over a stick, a black shawl over her head and back, a long rust skirt, a basket with a loaf in it' },
  'villager-boy': { kind: 'folk', name: 'A boy', read: 'small and barefoot, a cap too big for him, a green tunic tied with red, a stick for driving geese' },
  cart: { kind: 'prop', name: 'A cart', read: 'a hand cart on two big spoked wheels, a cask and sacks under a red sheet roped down, two long shafts' },
  sellsword: { kind: 'hireling', name: 'Sellsword', read: 'a dented iron cap with a nose guard, mail over a stained gambeson, a short sword and a round shield with its paint gone; nothing of the lodge on him' },
  bowman: { kind: 'hireling', name: 'Bowman', read: 'a short green hood with a long tail, a leather jerkin, a longbow as tall as he is, a bag of arrows at his hip' },
  gravemarker: { kind: 'prop', name: 'A grave marker', read: 'a crooked wooden cross on a mound of turned earth, a rag on its arm and a candle at its foot' },
  totem: { kind: 'prop', name: 'An antler totem', read: 'a stake with bleached antlers lashed to its top, a red rag, bones and a little bell hung from it' },
  stone: { kind: 'prop', name: 'A standing stone', read: 'a grey stone taller than a man, leaning, lichen on it and an old mark cut in its face' },
  jawtrap: { kind: 'prop', name: 'A jaw trap', read: 'an iron trap set open on the ground, its teeth up, its chain pegged out' },
};
