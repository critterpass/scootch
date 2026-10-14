import { useState } from 'react';

import type { ComposerEvent } from '../composer/composer-machine';

/**
 * Home comes back at rest. Words typed and sent from home leave the composer a text field, and the
 * field goes away with the keyboard while they are still being sent, so its putting away is not
 * heard. When home is drawn again (the thing put down, finished or cancelled) the composer is told
 * the keyboard went: with nothing typed it is the capsule again, with the world card above it.
 * Words handed back stay in the field.
 *
 * It is told while home is being drawn, not after: the field, which takes the keyboard as it
 * appears, is never drawn at all. The composer's state belongs to the same screen, so the screen
 * simply draws again at once.
 */
export function useHomeRests(home: boolean, sendComposer: (event: ComposerEvent) => void): void {
  const [wasHome, setWasHome] = useState(home);
  if (home === wasHome) return;
  setWasHome(home);
  if (home) sendComposer({ type: 'keyboard_dismissed' });
}
