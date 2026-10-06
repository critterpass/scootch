import type { TaskRow } from '@scootch/domain';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { lineFor, lineWithNoTask } from '../../state/lines';
import { initialComposer, type ComposerState } from '../composer/composer-machine';
import type { ComposerViewProps } from '../composer/composer-view';

import { OneScreenView, type OneScreenShown } from './one-screen-view';

// The one screen's states as the screen registry shows them: the view with fixed state and no
// store behind it. Scootch's words still come from the offline pack, in the capture's language,
// and the person's words are one of the warm-up examples.

const nothing = () => undefined;
const READY = initialComposer('ready');
/** How long the captured recording has been running. */
const RECORDING_FOR_MS = 14_000;

function useCapture() {
  const { language } = useLanguage();
  const t = useT();
  return { voice: { language, attitude: 'cheeky' } as const, words: t('launch.chip.reply'), t };
}

type ComposerCapture = Partial<Omit<ComposerViewProps, 'state'>> & {
  readonly state?: Partial<ComposerState>;
};

function composerShown(
  capture: ComposerCapture = {},
  rest: Partial<Extract<OneScreenShown, { kind: 'composer' }>> = {},
): OneScreenShown {
  return {
    kind: 'composer',
    warmUp: null,
    notificationsOff: false,
    ...rest,
    composer: {
      level: 0.6,
      onEvent: nothing,
      thinking: false,
      notUnderstood: false,
      screenReader: false,
      onOpenSettings: nothing,
      ...capture,
      state: { ...READY, ...capture.state },
    },
  };
}

/** A task as the phone stores it before any answer has come: its own words and nothing else. */
function capturedTask(text: string, screen: TaskRow['screen']): TaskRow {
  return {
    id: 'capture-task',
    localDate: '2026-10-06',
    text,
    originalText: text,
    source: 'typed',
    screen,
    seriousOverridden: false,
    status: 'set',
    carriedOver: false,
    firstMentionedOn: '2026-10-06',
    dueDate: null,
    workMode: null,
    fitsTenMinutes: null,
    sharePrivate: null,
    shrinkCount: 0,
    lines: null,
    notifications: [],
    createdAt: '2026-10-06T09:00:00.000Z',
    finishedAt: null,
  };
}

export function OneScreenWaiting() {
  const { voice } = useCapture();
  return (
    <OneScreenView
      mood="waiting"
      attitude={voice.attitude}
      line={lineWithNoTask('waiting', voice)}
      offline={false}
      shown={composerShown()}
    />
  );
}

function WarmUp({ notificationsOff }: { readonly notificationsOff: boolean }) {
  const { voice, t } = useCapture();
  return (
    <OneScreenView
      mood="listening"
      attitude={voice.attitude}
      line={lineWithNoTask('firstOneThing', voice)}
      offline={false}
      shown={composerShown(
        {},
        {
          warmUp: {
            chips: [t('launch.chip.reply'), t('launch.chip.water'), t('launch.chip.email')],
            onChip: nothing,
          },
          notificationsOff,
        },
      )}
    />
  );
}

export function LaunchFirstOneThing() {
  return <WarmUp notificationsOff={false} />;
}

export function LaunchNotificationsRefused() {
  return <WarmUp notificationsOff />;
}

export function OneScreenListening() {
  const { voice, words } = useCapture();
  const state = {
    phase: 'listening',
    transcript: words,
    startedAt: Date.now() - RECORDING_FOR_MS,
  } as const;
  return (
    <OneScreenView
      mood="listening"
      attitude={voice.attitude}
      line={null}
      offline={false}
      shown={composerShown({ state })}
    />
  );
}

export function OneScreenTyping() {
  const { voice, words } = useCapture();
  return (
    <OneScreenView
      mood="typing"
      attitude={voice.attitude}
      line={lineWithNoTask('typing', voice)}
      offline={false}
      shown={composerShown({ state: { mode: 'typing', text: words } })}
    />
  );
}

export function OneScreenThinking() {
  const { voice } = useCapture();
  return (
    <OneScreenView
      mood="thinking"
      attitude={voice.attitude}
      line={null}
      offline={false}
      shown={composerShown({ thinking: true, state: { mode: 'typing', phase: 'sending' } })}
    />
  );
}

function TaskSet({ offline }: { readonly offline: boolean }) {
  const { voice, words } = useCapture();
  // With no connection the task is unscreened: plain company and its own words, no joke.
  const said = lineFor('hatch', capturedTask(words, offline ? 'unscreened' : 'pass'), voice);
  return (
    <OneScreenView
      mood={said === null ? 'serious' : 'waiting'}
      attitude={voice.attitude}
      line={said}
      offline={offline}
      shown={{
        kind: 'task_set',
        taskText: said === null ? words : null,
        treat: '',
        minutes: 10,
        onTreat: nothing,
        onMinutes: nothing,
        onStart: nothing,
      }}
    />
  );
}

export function OneScreenTaskSet() {
  return <TaskSet offline={false} />;
}

export function OneScreenOffline() {
  return <TaskSet offline />;
}

export function OneScreenDoneForToday() {
  const { voice } = useCapture();
  return (
    <OneScreenView
      mood="asleep"
      attitude={voice.attitude}
      line={lineWithNoTask('doneForToday', voice)}
      offline={false}
      shown={{ kind: 'done' }}
    />
  );
}

function TypingOnly({ voice: status }: { readonly voice: 'refused' | 'unavailable' }) {
  const { voice } = useCapture();
  return (
    <OneScreenView
      mood="typing"
      attitude={voice.attitude}
      line={lineWithNoTask('typing', voice)}
      offline={false}
      shown={composerShown({ state: { mode: 'typing', voice: status } })}
    />
  );
}

export function ComposerMicrophoneRefused() {
  return <TypingOnly voice="refused" />;
}

export function ComposerSpeechUnavailable() {
  return <TypingOnly voice="unavailable" />;
}

function WaitingWith({ capture }: { readonly capture: ComposerCapture }) {
  const { voice } = useCapture();
  return (
    <OneScreenView
      mood="waiting"
      attitude={voice.attitude}
      line={lineWithNoTask('waiting', voice)}
      offline={false}
      shown={composerShown(capture)}
    />
  );
}

export function ComposerEmptyRecording() {
  return <WaitingWith capture={{ state: { notice: 'empty' } }} />;
}

export function ComposerNotUnderstood() {
  return <WaitingWith capture={{ notUnderstood: true }} />;
}
