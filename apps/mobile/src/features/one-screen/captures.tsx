import { FREE_STARTS_PER_DAY, type TaskRow } from '@scootch/domain';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { lineFor, lineWithNoTask } from '../../state/lines';
import { initialComposer, type ComposerState } from '../composer/composer-machine';
import type { ComposerViewProps } from '../composer/composer-view';

import { FriendTablePillView } from '../table/friend-table-pill';
import { TaskSetCompany } from '../table/task-set-company';

import { OneScreenView, type OneScreenShown } from './one-screen-view';

// The one screen's states as the screen registry shows them: the view with fixed state and no
// store behind it. Scootch's words still come from the offline pack, in the capture's language,
// and the person's words are one of the warm-up examples.

const nothing = () => undefined;
const READY = initialComposer('ready');
/** Home with nothing waiting for tomorrow and a start still open. */
const HOME = { waiting: null, startsNote: null } as const;
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
    // The warm-up ask is still first launch; every other composer state is home.
    ...(rest.warmUp ? {} : { home: HOME }),
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
      onWorld={nothing}
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

function TaskSet({
  offline,
  atTable = false,
}: {
  readonly offline: boolean;
  readonly atTable?: boolean;
}) {
  const { voice, words, t } = useCapture();
  // With no connection the task is unscreened: plain company and its own words, no joke.
  const task = capturedTask(words, offline ? 'unscreened' : 'pass');
  const said = lineFor('hatch', task, voice);
  // An ordinary day with this task set: the day the company choice is drawn on.
  const day = { today: { kind: 'task_set' as const, task }, heavyToday: false };
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
        onDiscard: nothing,
        company: (
          <TaskSetCompany day={day} company={atTable ? 'table' : 'alone'} onCompany={nothing} />
        ),
        ...(atTable ? { startLabel: t('table.startAt'), startIcon: 'table' as const } : {}),
      }}
    />
  );
}

export function OneScreenTaskSet() {
  return <TaskSet offline={false} />;
}

/** The set task with company chosen: "At a table", and the one action starts there. */
export function OneScreenTaskSetAtTable() {
  return <TaskSet offline={false} atTable />;
}

/** Home while a friend is at a table: the pill under the header. */
export function OneScreenFriendAtTable() {
  const { voice, t } = useCapture();
  return (
    <OneScreenView
      mood="waiting"
      attitude={voice.attitude}
      line={lineWithNoTask('waiting', voice)}
      offline={false}
      onWorld={nothing}
      shown={composerShown(
        {},
        {
          home: {
            ...HOME,
            company: (
              <FriendTablePillView
                seed="cccccccccccc"
                title={t('table.pill.friend', { name: 'Kofi' })}
                sub={t('table.openSeats', { count: 2 })}
                action={t('table.pill.join')}
                hint={t('table.pill.join.hint')}
                busy={false}
                onPress={nothing}
              />
            ),
          },
        },
      )}
    />
  );
}

export function OneScreenOffline() {
  return <TaskSet offline />;
}

/** Home on a day with something done in it: Scootch rests, and the dock is `gate`d or open. */
function Rested({ gate }: { readonly gate?: 'locked' | 'spent' }) {
  const { voice, t } = useCapture();
  return (
    <OneScreenView
      mood="asleep"
      attitude={voice.attitude}
      line={lineWithNoTask('doneForToday', voice)}
      offline={false}
      onWorld={nothing}
      shown={composerShown(gate ? { gate: { kind: gate, onUnlock: nothing } } : {}, {
        home: {
          waiting: null,
          startsNote:
            gate === 'locked' ? t('plus.oneMore.freeDone', { count: FREE_STARTS_PER_DAY }) : null,
        },
      })}
    />
  );
}

export function OneScreenDoneForToday() {
  return <Rested />;
}

export function OneScreenStartsLocked() {
  return <Rested gate="locked" />;
}

export function OneScreenStartsSpent() {
  return <Rested gate="spent" />;
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

function WaitingWith({
  capture,
  silent = false,
}: {
  readonly capture: ComposerCapture;
  /** Scootch says nothing: the composer's own words are all there is. */
  readonly silent?: boolean;
}) {
  const { voice } = useCapture();
  return (
    <OneScreenView
      mood="waiting"
      attitude={voice.attitude}
      line={silent ? null : lineWithNoTask('waiting', voice)}
      offline={false}
      shown={composerShown(capture)}
    />
  );
}

export function ComposerEmptyRecording() {
  return <WaitingWith capture={{ state: { notice: 'empty' } }} />;
}

export function ComposerNotUnderstood() {
  return <WaitingWith capture={{ notUnderstood: true }} silent />;
}
