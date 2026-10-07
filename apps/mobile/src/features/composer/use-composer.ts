import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Language } from '@scootch/i18n';

import {
  composerReducer,
  initialComposer,
  type ComposerEffect,
  type ComposerEvent,
  type ComposerState,
} from './composer-machine';
import type { SpeechPort } from './speech';

/** A passing hint (cancelled, held too briefly) leaves by itself after this long. */
const NOTICE_MS = 1600;

export interface ComposerOptions {
  readonly speech: SpeechPort;
  readonly language: Language;
  /** Hands the words to the day store; resolves when its task flow has finished. */
  readonly onSend: (text: string, source: 'ramble' | 'typed') => Promise<void>;
  /** A light tap as a recording starts. */
  readonly onTick?: () => void;
}

export interface Composer {
  readonly state: ComposerState;
  /** How loud the voice is right now, from 0 to 1. */
  readonly level: number;
  readonly send: (event: ComposerEvent) => void;
  /** The words last handed over, spoken or typed, for the screen that plays them back. */
  readonly lastSent: string | null;
  /** Lets go of those words once they have been played. */
  readonly forgetSent: () => void;
}

/**
 * Runs the composer's state machine against the phone: it performs each effect on the speech
 * port and the day store, and feeds what they answer back in as events.
 */
export function useComposer({ speech, language, onSend, onTick }: ComposerOptions): Composer {
  const [state, setState] = useState(() => initialComposer());
  const [level, setLevel] = useState(0);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const forgetSent = useCallback(() => setLastSent(null), []);
  const current = useRef(state);
  const latest = useRef({ speech, language, onSend, onTick });
  latest.current = { speech, language, onSend, onTick };

  const send = useCallback((event: ComposerEvent) => {
    const perform = (effect: ComposerEffect) => {
      const { speech, language, onSend, onTick } = latest.current;
      switch (effect.kind) {
        case 'ask_to_listen':
          void speech
            .ask(language)
            .then((status) => send({ type: 'voice_status', status }))
            .catch(() => send({ type: 'voice_status', status: 'unavailable' }));
          return;
        case 'start_listening':
          setLevel(0);
          speech.start(language, {
            onHeard: (transcript) => send({ type: 'heard', transcript }),
            onLevel: setLevel,
            onEnd: (transcript) => send({ type: 'recognition_ended', transcript }),
            onFail: (reason) => send({ type: 'recognition_failed', reason }),
          });
          return;
        case 'stop_listening':
          return speech.stop();
        case 'abort_listening':
          return speech.abort();
        case 'send':
          setLastSent(effect.text);
          void onSend(effect.text, effect.source)
            .catch(() => undefined)
            .then(() => send({ type: 'sent' }));
          return;
        case 'tick':
          return onTick?.();
      }
    };
    const step = composerReducer(current.current, event);
    current.current = step.state;
    setState(step.state);
    for (const effect of step.effects) perform(effect);
  }, []);

  // What the phone allows is read when the composer appears and when the language changes.
  useEffect(() => {
    let live = true;
    void speech
      .status(language)
      .then((status) => {
        if (live) send({ type: 'voice_status', status });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [speech, language, send]);

  const { notice } = state;
  useEffect(() => {
    if (notice !== 'cancelled' && notice !== 'too_short') return;
    const timer = setTimeout(() => send({ type: 'notice_cleared' }), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice, send]);

  // A recording never outlives the screen it was made on.
  useEffect(() => () => latest.current.speech.abort(), []);

  return useMemo(
    () => ({ state, level, send, lastSent, forgetSent }),
    [state, level, send, lastSent, forgetSent],
  );
}

/** Sends words the way typed ones go: the dock becomes a field, takes them, and sends. */
export function sendTyped(send: (event: ComposerEvent) => void, text: string): void {
  send({ type: 'keyboard_tapped' });
  send({ type: 'text_changed', text });
  send({ type: 'send_tapped' });
}
