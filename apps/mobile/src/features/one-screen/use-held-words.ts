import { useCallback, useEffect, useRef, useState } from 'react';

import type { Energy } from '@scootch/domain';

import type { DayEvent } from '../../state/day-types';
import type { ComposerEvent } from '../composer/composer-machine';

interface Held {
  readonly text: string;
  readonly source: 'ramble' | 'typed';
  readonly sent: () => void;
}

/**
 * The first words of a day wait here while the battery question is asked. They always leave one
 * of two ways: the question is answered and they are sent, or the question is no longer on the
 * screen (the person took something from the drawer, the day moved on) and they go back into the
 * composer's field. Either way the composer is told, so it never stays waiting.
 */
export function useHeldWords(options: {
  readonly energyNeeded: boolean;
  readonly dispatch: (event: DayEvent) => Promise<void>;
}) {
  const [held, setHeld] = useState<Held | null>(null);
  const latest = useRef(options);
  latest.current = options;
  const waiting = useRef<Held | null>(null);
  waiting.current = held;

  /** The composer's send: held on the day's first words, sent straight on otherwise. */
  const onSend = useCallback((text: string, source: 'ramble' | 'typed') => {
    const { energyNeeded, dispatch } = latest.current;
    return energyNeeded
      ? new Promise<void>((sent) => setHeld({ text, source, sent }))
      : dispatch({ type: 'text_submitted', text, source, energy: 'guess' });
  }, []);

  const answer = useCallback((energy: Energy | 'guess') => {
    const words = waiting.current;
    if (!words) return;
    setHeld(null);
    void latest.current
      .dispatch({ type: 'text_submitted', text: words.text, source: words.source, energy })
      .catch(() => undefined)
      .then(words.sent);
  }, []);

  /** The question left the screen unanswered: the words return to the field. */
  const giveBack = useCallback((sendComposer: (event: ComposerEvent) => void) => {
    const words = waiting.current;
    if (!words) return;
    setHeld(null);
    words.sent();
    sendComposer({ type: 'text_returned', text: words.text });
  }, []);

  // Words still held when the screen goes are let go of, so nothing waits on them.
  useEffect(() => () => waiting.current?.sent(), []);

  return { asked: held !== null, onSend, answer, giveBack };
}
