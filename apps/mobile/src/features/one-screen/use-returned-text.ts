import { useEffect } from 'react';

import type { DayEvent } from '../../state/day-types';
import type { ComposerEvent } from '../composer/composer-machine';

/** A cancelled wait hands the words back: they go into the field, to edit or send again. */
export function useReturnedText(
  returnedText: string | null,
  sendComposer: (event: ComposerEvent) => void,
  dispatch: (event: DayEvent) => Promise<void>,
): void {
  useEffect(() => {
    if (returnedText === null) return;
    sendComposer({ type: 'text_returned', text: returnedText });
    void dispatch({ type: 'returned_text_taken' }).catch(() => undefined);
  }, [returnedText, sendComposer, dispatch]);
}
