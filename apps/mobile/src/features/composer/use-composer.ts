import type { HeardTask } from '@phusclass/domain/hearing';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';

import { useFeel } from '../../ui/motion/use-feel';
import { useNetworkState } from '../offline/connection';

import {
  initialComposer,
  LAST_WORDS_MS,
  step,
  type ComposerCommand,
  type ComposerEvent,
  type ComposerState,
  type Permission,
} from './composer-machine';
import { heardWordsAt } from './chalk-flight';
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
  /** How loud the voice is while listening, 0 to 1, for the bars. */
  readonly level: SharedValue<number>;
  readonly press: () => void;
  readonly release: () => void;
  readonly openTyping: () => void;
  readonly edit: (draft: string) => void;
  readonly submit: () => void;
  readonly cancel: () => void;
}

// Asked once per launch at most; the system remembers the answer after that.
let knownPermission: Permission = 'unknown';

/**
 * Said words stay on show at least this long before they go to the board: the user always sees
 * what was heard before anything is picked from it.
 */
const SHOW_WORDS_MS = 600;

const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/** Runs the composer machine against the hearing and the board store. */
export function useComposer(options: ComposerOptions): Composer {
  const { haptics } = useFeel();
  const network = useNetworkState();
  const offline = network.isConnected === false || network.isInternetReachable === false;
  const offlineRef = useRef(offline);
  offlineRef.current = offline;
  const hapticsRef = useRef(haptics);
  hapticsRef.current = haptics;
  const [state, setState] = useState<ComposerState>(initialComposer);
  const stateRef = useRef(state);
  const latest = useRef(options);
  latest.current = options;
  const lastWords = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);

  const send = useRef<(event: ComposerEvent) => void>(() => undefined);

  const hearing = useHearing({
    onHeard: ({ words, pending }) => send.current({ type: 'heard', words, pending }),
    onEnded: () => send.current({ type: 'ended' }),
    onUnavailable: (why) => send.current({ type: 'unavailable', why }),
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
          hearing.start();
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
        case 'hand in': {
          const spoken = stateRef.current.mode === 'handing' && stateRef.current.from === 'voice';
          // The words are kept: felt as they settle, the same moment the bar says so.
          if (spoken && hapticsRef.current) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          }
          // Typed words fly from the field's own place, not from where words were last heard.
          if (!spoken) heardWordsAt.current = null;
          const handing = handIn(command.text, latest.current.say);
          void Promise.all([handing, spoken ? wait(SHOW_WORDS_MS) : null]).then(([handed]) => {
            send.current({ type: 'handed', ok: handed.ok });
            if (handed.ok) latest.current.onLanded(handed.tasks, handed.how);
          });
          return;
        }
      }
    },
    [hearing],
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
    level: hearing.level,
    press: () => {
      const at = Date.now();
      held.current = true;
      if (knownPermission !== 'unknown') {
        send.current({
          type: 'press',
          at,
          permission: knownPermission,
          offline: offlineRef.current,
        });
        return;
      }
      void hearing.permission().then((permission) => {
        knownPermission = permission;
        send.current({ type: 'press', at, permission, offline: offlineRef.current });
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
