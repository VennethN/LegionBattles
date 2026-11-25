// Everything that is not a figure, in one list.

import { CHURCHYARD } from './lair';
import type { Thing } from './things';
import { UI } from './ui';

export const THINGS: Thing[] = [...CHURCHYARD, ...UI];
