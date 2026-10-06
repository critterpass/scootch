import * as Haptics from 'expo-haptics';
import { useNetworkState } from 'expo-network';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';

import type { Attitude, Energy } from '@scootch/domain';

import type { ScootchProps } from '../../art/Scootch';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { developerToolsAllowed } from '../../screens/registry/support/developer-tools';
import { useDispatch, useDrawer, useSession, useToday } from '../../state/day-store-provider';
import type { DayEvent } from '../../state/day-types';
import { usePlus } from '../../state/keepsakes';
import { lineFor, lineWithNoTask } from '../../state/lines';
import { useScreenReader } from '../../ui/use-screen-style';
import type { ComposerState } from '../composer/composer-machine';
import type { SpeechPort } from '../composer/speech';
import { useComposer } from '../composer/use-composer';
import { dayWords } from '../drawer/day-words';
import { DrawerSheet } from '../drawer/drawer-sheet';
import { QuietLink, Stack } from '../dump/dump-panels';
import { HatchFigure } from '../monster/hatch-figure';
import { OneMore } from '../plus/one-more';
import { PLUS_SHEET_ONE_MORE } from '../plus/routes';

import { NotNow } from './not-now';
import { minuteOptions } from './one-screen-panels';
import { RETURN_CHIPS, stageOf } from './one-screen-stage';
import { OneScreenView, type OneScreenShown } from './one-screen-view';
import { stageShown } from './stage-shown';

export interface OneScreenProps {
  readonly speech: SpeechPort;
  /** True straight after first launch: the first ask is the warm-up one, with its examples. */
  readonly warmUp: boolean;
  /** The system's notification prompt was just refused: it is said once, here. */
  readonly notificationsRefused: boolean;
}

type Mood = ScootchProps['mood'];
type Held = { text: string; source: 'ramble' | 'typed'; sent: () => void };

/** The routes other parts of the app provide, reached by name. */
const WORLD = '/world' as Href;
const CARE = '/care' as Href;

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
 * The one screen, driven by the day store: the composer, the one thing that comes back, its
 * hatch, a counter-offer, the task set with Start, or done for today. Which of them shows is
 * worked out from the store; every word Scootch says comes from the task's lines or the offline
 * pack.
 */
export function OneScreen({ speech, warmUp, notificationsRefused }: OneScreenProps) {
  const day = useToday();
  const { today, settings, taskCall, notice, morning, localDate } = day;
  const { line: shownLine } = useSession();
  const drawer = useDrawer();
  const { language } = useLanguage();
  const dispatch = useDispatch();
  const router = useRouter();
  const t = useT();
  const screenReader = useScreenReader();
  const plus = usePlus();
  const network = useNetworkState();
  const [chosenMinutes, setMinutes] = useState<number | null>(null);
  const [treat, setTreat] = useState('');
  const [revealedFor, setRevealedFor] = useState<string | null>(null);
  const [held, setHeld] = useState<Held | null>(null);
  const energyNeeded = useRef(day.energyNeeded);
  energyNeeded.current = day.energyNeeded;

  const send = (event: DayEvent) => void dispatch(event).catch(() => undefined);
  const attitude: Attitude = settings.attitude;
  const voice = { language, attitude };
  const composer = useComposer({
    speech,
    language,
    // The first words of the day wait for the battery question; after that they go straight on.
    onSend: (text, source) =>
      energyNeeded.current
        ? new Promise<void>((sent) => setHeld({ text, source, sent }))
        : dispatch({ type: 'text_submitted', text, source, energy: 'guess' }),
    onTick: () => {
      if (settings.haptics) void Haptics.selectionAsync().catch(() => undefined);
    },
  });
  const answerEnergy = (energy: Energy | 'guess') => {
    if (!held) return;
    setHeld(null);
    void dispatch({ type: 'text_submitted', text: held.text, source: held.source, energy })
      .catch(() => undefined)
      .then(held.sent);
  };

  const stage = stageOf({ ...day, drawer, energyAsked: held !== null });
  const care = stage.kind === 'care';
  useEffect(() => {
    // A crisis day shows nothing of this screen: the care screens take over.
    if (care) router.replace(CARE);
  }, [care, router]);

  const offline = (network.isInternetReachable ?? network.isConnected) === false;
  const task = 'task' in today ? today.task : null;
  const frame = {
    attitude,
    offline,
    onWorld: () => router.push(WORLD),
    // The drawer opens on the person's own pull or their tap on "Peek", and on nothing else.
    onPull: () => send({ type: 'drawer', event: { type: 'pulled' } }),
    overlay: (
      <DrawerSheet
        open={drawer.open}
        items={drawer.items}
        today={localDate}
        canSwap={task === null || task.status === 'set'}
        onSwapIn={(itemId) => send({ type: 'drawer_item_swapped_in', itemId })}
        onClose={() => send({ type: 'drawer', event: { type: 'closed' } })}
      />
    ),
    ...(developerToolsAllowed() ? { onDeveloperTools: () => router.push('/developer-tools') } : {}),
  };

  if (care) return null;
  // The session's own screens are shown on their route for as long as one is running.
  if (stage.kind === 'session') return <Redirect href="/session" />;

  if (stage.kind === 'done') {
    const said =
      shownLine && (shownLine.slot === 'done' || shownLine.slot === 'caught')
        ? shownLine.text
        : lineWithNoTask('doneForToday', voice);
    const under = (
      <OneMore
        plus={plus}
        left={today.kind === 'done_for_today' ? today.startsLeft : 0}
        onLocked={() => router.push(PLUS_SHEET_ONE_MORE)}
        onMore={() => send({ type: 'one_more_asked' })}
      />
    );
    return <OneScreenView {...frame} mood="asleep" line={said} shown={{ kind: 'done', under }} />;
  }

  if (stage.kind === 'task_set') {
    const { quiet, carried, monster } = stage;
    const said = lineFor(quiet ? 'acknowledge' : 'hatch', stage.task, voice);
    const smallest = morning.kind === 'smallest_ask' ? morning.minutes : null;
    const minutes = chosenMinutes ?? smallest ?? 10;
    const start = async () => {
      await dispatch({ type: 'session_set', minutes, treat: treat.trim() || null });
      await dispatch({ type: 'session', event: { type: 'started' } });
    };
    const mood: Mood = quiet || said === null ? 'serious' : monster ? 'pleased' : 'waiting';
    return (
      <OneScreenView
        {...frame}
        mood={mood}
        line={said}
        shown={{
          kind: 'task_set',
          label: carried ? t('morning.fromYesterday') : quiet ? t('dump.justThis') : null,
          taskText: said === null || quiet || carried ? stage.task.text : null,
          treat,
          minutes,
          options: minuteOptions(smallest),
          onTreat: setTreat,
          onMinutes: setMinutes,
          onStart: () => void start().catch(() => undefined),
          ...(carried ? { startLabel: t('morning.start', { minutes }) } : {}),
          ...(carried && monster
            ? {
                figure: (
                  <HatchFigure
                    mood={mood}
                    attitude={attitude}
                    monster={monster.row}
                    sizeFactor={monster.sizeFactor}
                  />
                ),
              }
            : {}),
          extra: (
            <Stack>
              {carried ? (
                <QuietLink
                  label={t('morning.somethingElse')}
                  hint={t('morning.somethingElse.hint')}
                  onPress={() => send({ type: 'carried_task_set_aside' })}
                  testID="something-else"
                />
              ) : null}
              <NotNow onExcuse={(text) => send({ type: 'excuse_given', text })} />
            </Stack>
          ),
        }}
      />
    );
  }

  if (stage.kind !== 'composer') {
    const drawn = stageShown(stage, {
      t,
      language,
      attitude,
      today: localDate,
      revealed: stage.kind === 'one_thing' && revealedFor === stage.task.id,
      actions: {
        answerEnergy,
        another: () => send({ type: 'another_asked' }),
        accept: () => send({ type: 'one_thing_picked' }),
        peek: () => send({ type: 'drawer', event: { type: 'pulled' } }),
        answerDeadline: (text, choice) => send({ type: 'deadline_answered', text, choice }),
        pickAgain: () => send({ type: 'pick_for_me' }),
        takePick: (itemId) => send({ type: 'drawer_item_swapped_in', itemId }),
        smaller: () => send({ type: 'smaller_asked' }),
        deal: () => {
          void dispatch({ type: 'deal_struck', treat: treat.trim() || null })
            .then(() => dispatch({ type: 'session', event: { type: 'started' } }))
            .catch(() => undefined);
        },
        tooBig: () => send({ type: 'too_big' }),
        catchIt: () => send({ type: 'monster_met' }),
        revealDone: () => setRevealedFor(task?.id ?? null),
      },
    });
    return <OneScreenView {...frame} {...drawn} />;
  }

  const { state } = composer;
  const quiet = state.phase !== 'idle' || taskCall !== 'idle';
  const slot = state.mode === 'typing' ? 'typing' : warmUp ? 'firstOneThing' : 'waiting';
  const sendChip = (text: string) => {
    composer.send({ type: 'keyboard_tapped' });
    composer.send({ type: 'text_changed', text });
    composer.send({ type: 'send_tapped' });
  };
  const pickLabel = t('morning.chip.pick');
  const chips = stage.returning
    ? RETURN_CHIPS.filter((chip) => chip.id !== 'pick' || stage.canPickForMe).map((chip) =>
        t(chip.label),
      )
    : stage.canPickForMe && !warmUp
      ? [pickLabel]
      : [];
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
          onChip: sendChip,
        }
      : null,
    notificationsOff: notificationsRefused,
    ...(chips.length > 0
      ? {
          ways: {
            chips,
            hint: t('morning.chip.hint'),
            onChip: (text: string) =>
              text === pickLabel ? send({ type: 'pick_for_me' }) : sendChip(text),
            note: stage.note
              ? t('morning.note', {
                  thing: stage.note.item.text,
                  day: dayWords(stage.note.dueDate, localDate, language),
                })
              : null,
          },
        }
      : {}),
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
