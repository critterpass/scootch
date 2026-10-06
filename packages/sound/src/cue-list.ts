import { type Cue, isCue } from './cue';
import * as cueModules from './cues/index.generated';

/** Every cue, by name. A cue is one file in `cues/`; the generated index collects them. */
export const CUES: Readonly<Record<string, Cue>> = Object.fromEntries(
  Object.values(cueModules)
    .filter(isCue)
    .map((cue) => [cue.name, cue]),
);
