import * as Haptics from 'expo-haptics';
import { useNetworkState } from 'expo-network';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';

import type { Attitude } from '@scootch/domain';

import type { ScootchProps } from '../../art/Scootch';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { developerToolsAllowed } from '../../screens/registry/support/developer-tools';
import { useDispatch, useSession, useToday } from '../../state/day-store-provider';
import { lineFor, lineWithNoTask } from '../../state/lines';
import { useScreenReader } from '../../ui/use-screen-style';
import type { ComposerState } from '../composer/composer-machine';
import type { SpeechPort } from '../composer/speech';
import { useComposer } from '../composer/use-composer';

import type { SessionMinutes } from './one-screen-panels';
import { OneScreenView, type OneScreenShown } from './one-screen-view';

export interface OneScreenProps {
  readonly speech: SpeechPort;
  /** True straight after first launch: the first ask is the warm-up one, with its examples. */
  readonly warmUp: boolean;
  /** The system's notification prompt was just refused: it is said once, here. */
  readonly notificationsRefused: boolean;
}

type Mood = ScootchProps['mood'];

/** How Scootch reacts to the composer: he listens, watches the typing, or thinks it over. */
export function composerMood(state: ComposerState, taskCall: 'idle' | 'waiting' | 'held'): Mood {
  // A dark or heavy word was seen: nothing playful while the answer is on its way.
  if (taskCall === 'held') return 'serious';
  if (taskCall === 'waiting' || state.phase === 'sending' || state.phase === 'finishing') {
    return 'thinking';
  }
  if (state.phase === 'listening') return 'listening';
  return state.mode === 'typing' ? 'typing' : 'waiting';
}

/**
 * The one screen, driven by the day store: waiting with the composer, the task set with its two
 * choices and Start, or done for today. Every word Scootch says comes from the store's line, the
 * task's own lines or the offline pack.
 */
export function OneScreen({ speech, warmUp, notificationsRefused }: OneScreenProps) {
  const { today, settings, taskCall, notice, monster } = useToday();
  const { line: shownLine } = useSession();
  const { language } = useLanguage();
  const dispatch = useDispatch();
  const router = useRouter();
  const t = useT();
  const screenReader = useScreenReader();
  const network = useNetworkState();
  const [minutes, setMinutes] = useState<SessionMinutes>(10);
  const [treat, setTreat] = useState('');

  const attitude: Attitude = settings.attitude;
  const voice = { language, attitude };
  const composer = useComposer({
    speech,
    language,
    onSend: (text, source) => dispatch({ type: 'text_submitted', text, source, energy: 'guess' }),
    onTick: () => {
      if (settings.haptics) void Haptics.selectionAsync().catch(() => undefined);
    },
  });

  const offline = (network.isInternetReachable ?? network.isConnected) === false;
  const frame = {
    attitude,
    offline,
    ...(developerToolsAllowed() ? { onDeveloperTools: () => router.push('/developer-tools') } : {}),
  };

  // The session's own screens are shown on their route for as long as one is running.
  if (today.kind === 'in_session' || (today.kind === 'serious' && today.session !== null)) {
    return <Redirect href="/session" />;
  }
  // The care screen belongs to another part of the app: here the day only goes quiet.
  if (today.kind === 'crisis') {
    return <OneScreenView {...frame} mood="serious" line={null} shown={{ kind: 'quiet' }} />;
  }

  if (today.kind === 'done_for_today') {
    const said =
      shownLine && (shownLine.slot === 'done' || shownLine.slot === 'caught')
        ? shownLine.text
        : lineWithNoTask('doneForToday', voice);
    return <OneScreenView {...frame} mood="asleep" line={said} shown={{ kind: 'done' }} />;
  }

  if (today.kind === 'task_set' || today.kind === 'serious') {
    const { task } = today;
    const serious = today.kind === 'serious';
    const said = lineFor(serious ? 'acknowledge' : 'hatch', task, { language, attitude });
    const start = async () => {
      await dispatch({ type: 'session_set', minutes, treat: treat.trim() || null });
      await dispatch({ type: 'session', event: { type: 'started' } });
    };
    return (
      <OneScreenView
        {...frame}
        mood={serious || said === null ? 'serious' : monster ? 'pleased' : 'waiting'}
        line={said}
        shown={{
          kind: 'task_set',
          taskText: said === null || serious ? task.text : null,
          treat,
          minutes,
          onTreat: setTreat,
          onMinutes: setMinutes,
          onStart: () => void start().catch(() => undefined),
        }}
      />
    );
  }

  const { state } = composer;
  const quiet = state.phase !== 'idle' || taskCall !== 'idle';
  const slot = state.mode === 'typing' ? 'typing' : warmUp ? 'firstOneThing' : 'waiting';
  const shown: OneScreenShown = {
    kind: 'composer',
    composer: {
      state,
      level: composer.level,
      onEvent: composer.send,
      thinking: taskCall !== 'idle',
      notUnderstood: notice === 'say_it_another_way',
      screenReader,
      onOpenSettings: () => void Linking.openSettings().catch(() => undefined),
    },
    warmUp: warmUp
      ? {
          chips: [t('launch.chip.reply'), t('launch.chip.water'), t('launch.chip.email')],
          onChip: (text) => {
            composer.send({ type: 'keyboard_tapped' });
            composer.send({ type: 'text_changed', text });
            composer.send({ type: 'send_tapped' });
          },
        }
      : null,
    notificationsOff: notificationsRefused,
  };
  return (
    <OneScreenView
      {...frame}
      mood={composerMood(state, taskCall)}
      line={quiet ? null : lineWithNoTask(slot, voice)}
      shown={shown}
    />
  );
}
