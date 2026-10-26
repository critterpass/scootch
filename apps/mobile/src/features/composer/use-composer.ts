import type { HeardTask } from '@phusclass/domain/hearing';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useLanguage } from '../../i18n/i18n-provider';

import {
  initialComposer,
  LAST_WORDS_MS,
  step,
  type ComposerCommand,
  type ComposerEvent,
  type ComposerState,
  type Permission,
} from './composer-machine';
import { handIn, type Say } from './hand-in';
import { useHearing } from './use-hearing';

export interface ComposerOptions {
  readonly say: Say;
  /** Every task heard went on the board: they fly up as chalk, and he answers. */
  readonly onLanded: (tasks: readonly HeardTask[], how: 'picked' | 'sentences') => void;
  /** A tap too short to be speech: his one line. */
  readonly onShortTap: () => void;
}

export interface Composer {
  readonly state: ComposerState;
  readonly press: () => void;
  readonly release: () => void;
  readonly openTyping: () => void;
  readonly edit: (draft: string) => void;
  readonly submit: () => void;
  readonly cancel: () => void;
}

// Asked once per launch at most; the system remembers the answer after that.
let knownPermission: Permission = 'unknown';

/** Runs the composer machine against the phone's hearing and the board store. */
export function useComposer(options: ComposerOptions): Composer {
  const { language } = useLanguage();
  const [state, setState] = useState<ComposerState>(initialComposer);
  const stateRef = useRef(state);
  const latest = useRef(options);
  latest.current = options;
  const lastWords = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);

  const send = useRef<(event: ComposerEvent) => void>(() => undefined);

  const hearing = useHearing({
    onWords: (words) => send.current({ type: 'heard', words }),
    onEnded: () => send.current({ type: 'ended' }),
    onUnavailable: () => send.current({ type: 'unavailable' }),
  });

  const perform = useCallback(
    (command: ComposerCommand) => {
      switch (command.kind) {
        case 'ask permission':
          void hearing.ask().then((granted) => {
            knownPermission = granted ? 'granted' : 'denied';
            send.current({ type: 'permission', granted });
          });
          return;
        case 'start hearing':
          void hearing.start(language);
          return;
        case 'stop hearing':
          hearing.stop();
          if (lastWords.current !== null) clearTimeout(lastWords.current);
          lastWords.current = setTimeout(() => send.current({ type: 'ended' }), LAST_WORDS_MS);
          return;
        case 'abort hearing':
          hearing.abort();
          return;
        case 'say':
          latest.current.onShortTap();
          return;
        case 'hand in':
          void handIn(command.text, latest.current.say).then((handed) => {
            send.current({ type: 'handed', ok: handed.ok });
            if (handed.ok) latest.current.onLanded(handed.tasks, handed.how);
          });
          return;
      }
    },
    [hearing, language],
  );

  send.current = (event: ComposerEvent) => {
    const next = step(stateRef.current, event);
    if (next.state.mode !== 'stopping' && lastWords.current !== null) {
      clearTimeout(lastWords.current);
      lastWords.current = null;
    }
    stateRef.current = next.state;
    setState(next.state);
    for (const command of next.commands) perform(command);
  };

  useEffect(
    () => () => {
      if (lastWords.current !== null) clearTimeout(lastWords.current);
      if (stateRef.current.mode === 'listening' || stateRef.current.mode === 'stopping') {
        hearing.abort();
      }
    },
    [hearing],
  );

  return {
    state,
    press: () => {
      const at = Date.now();
      held.current = true;
      if (knownPermission !== 'unknown') {
        send.current({ type: 'press', at, permission: knownPermission });
        return;
      }
      void hearing.permission().then((permission) => {
        knownPermission = permission;
        send.current({ type: 'press', at, permission });
        // Let go before the phone answered: it was a tap.
        if (!held.current) send.current({ type: 'release', at: Date.now() });
      });
    },
    release: () => {
      held.current = false;
      send.current({ type: 'release', at: Date.now() });
    },
    openTyping: () => send.current({ type: 'type' }),
    edit: (draft) => send.current({ type: 'edit', draft }),
    submit: () => send.current({ type: 'submit' }),
    cancel: () => send.current({ type: 'cancel' }),
  };
}
