// Everything that is not a figure, in one list.

import { DEEP } from './deep';
import { FIELD } from './field';
import { INTERFACE } from './interface';
import { CHURCHYARD } from './lair';
import { POSTERS } from './posters';
import type { Thing } from './things';
import { WOODLAND } from './wood';
import { UI } from './ui';

export const THINGS: Thing[] = [...CHURCHYARD, ...WOODLAND, ...DEEP, ...FIELD, ...UI, ...INTERFACE, ...POSTERS];
