import * as Haptics from 'expo-haptics';
import { useNetworkState } from 'expo-network';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';

import { hasStartLeft, startsAllowed, type Attitude, type Energy } from '@scootch/domain';

import type { ScootchProps } from '../../art/Scootch';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useDispatch, useDrawer, useSession, useToday } from '../../state/day-store-provider';
import type { DayEvent } from '../../state/day-types';
import { usePlus } from '../../state/keepsakes';
import { lineFor, lineWithNoTask } from '../../state/lines';
import { showsSelling } from '../../state/shows-comedy';
import { useSurfaceRequest } from '../../state/surface-requests';
import { useScreenReader } from '../../ui/use-screen-style';
import { seriousShown } from '../care/serious-shown';
import type { SpeechPort } from '../composer/speech';
import { useComposer } from '../composer/use-composer';
import { DrawerSheet } from '../drawer/drawer-sheet';
import { QuietLink, Stack } from '../dump/dump-panels';
import { HatchHauntLink } from '../haunt/hatch-haunt-link';
import { HatchFigure } from '../monster/hatch-figure';
import { wordsWhileUnscreened } from '../offline/waiting-words';
import { OneMore } from '../plus/one-more';
import { PLUS_SHEET_ONE_MORE } from '../plus/routes';
import { TogetherLinks } from '../table/together-links';

import { composerMood } from './composer-mood';
import { composerWays } from './composer-ways';
import { NotNow } from './not-now';
import { minuteOptions } from './one-screen-panels';
import { stageOf } from './one-screen-stage';
import { OneScreenView, type OneScreenShown } from './one-screen-view';
import { stageShown } from './stage-shown';
import { useReturnedText } from './use-returned-text';

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
const SETTINGS = '/settings' as Href;

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
  // A control or a widget asked for the composer: it opens for typing, or starts listening.
  useSurfaceRequest('composer', stage.kind === 'composer' && taskCall === 'idle', (request) =>
    composer.send(
      request.listening ? { type: 'toggled', at: Date.now() } : { type: 'keyboard_tapped' },
    ),
  );
  useReturnedText(day.returnedText, composer.send, dispatch);
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
        canSwap={task === null ? hasStartLeft(today) : task.status === 'set'}
        capNote={
          task === null && !hasStartLeft(today) && today.kind === 'done_for_today'
            ? t('drawer.cap', { count: startsAllowed(plus) })
            : null
        }
        onSwapIn={(itemId) => send({ type: 'drawer_item_swapped_in', itemId })}
        onClose={() => send({ type: 'drawer', event: { type: 'closed' } })}
      />
    ),
    onMore: () => router.push(SETTINGS),
    failed: notice === 'failed',
  };

  if (care) return null;
  // The session's own screens are shown on their route for as long as one is running.
  if (stage.kind === 'session') return <Redirect href="/session" />;

  if (stage.kind === 'done') {
    const said =
      // A finish says its own line; a serious task set aside says its plain one for leaving it.
      shownLine && ['done', 'caught', 'notFinished'].includes(shownLine.slot)
        ? shownLine.text
        : lineWithNoTask('doneForToday', voice);
    // A start still open today is offered on any day. Only the locked control, which leads to
    // Plus, is held back on a heavy day.
    const left = today.kind === 'done_for_today' ? today.startsLeft : 0;
    const under =
      left === 0 && !showsSelling(day) ? null : (
        <OneMore
          plus={plus}
          left={left}
          onLocked={() => router.push(PLUS_SHEET_ONE_MORE)}
          onMore={() => send({ type: 'one_more_asked' })}
        />
      );
    return (
      <OneScreenView
        {...frame}
        mood="asleep"
        line={said}
        shown={{ kind: 'done', under, waiting: stage.waiting?.text ?? null }}
      />
    );
  }

  const connection = { offline, modelDown: day.modelDown };
  if (stage.kind === 'task_set' && stage.quiet) {
    // A serious task: plain words, a quiet sitting, and nothing else on the screen.
    const shown = seriousShown({
      task: stage.task,
      settings,
      language,
      reminderAt: day.reminderAt,
      now: Date.now(),
      dispatch,
    });
    return <OneScreenView {...frame} mood="serious" line={null} shown={shown} />;
  }

  if (stage.kind === 'task_set') {
    const { carried, monster } = stage;
    const own = lineFor('hatch', stage.task, voice);
    const said = own ?? wordsWhileUnscreened(stage.task, 'set', connection, voice);
    const smallest = morning.kind === 'smallest_ask' ? morning.minutes : null;
    const minutes = chosenMinutes ?? smallest ?? 10;
    const start = async () => {
      await dispatch({ type: 'session_set', minutes, treat: treat.trim() || null });
      await dispatch({ type: 'session', event: { type: 'started' } });
    };
    const mood: Mood = said === null ? 'serious' : monster ? 'pleased' : 'waiting';
    return (
      <OneScreenView
        {...frame}
        mood={mood}
        line={said}
        shown={{
          kind: 'task_set',
          label: carried ? t('morning.fromYesterday') : null,
          taskText: own === null || carried ? stage.task.text : null,
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
              <QuietLink
                label={t('taskSet.rest')}
                hint={t('taskSet.rest.hint')}
                onPress={() => send({ type: 'done_for_today' })}
                testID="rest-today"
              />
              <TogetherLinks day={day} task={stage.task} monster={day.monster} />
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
      hatchExtra: <HatchHauntLink />,
      actions: {
        answerEnergy,
        another: () => send({ type: 'another_asked' }),
        accept: () => send({ type: 'one_thing_picked' }),
        peek: () => send({ type: 'drawer', event: { type: 'pulled' } }),
        answerDeadline: (text, choice) => send({ type: 'deadline_answered', text, choice }),
        pickAgain: () => send({ type: 'pick_for_me' }),
        takePick: (itemId) => send({ type: 'drawer_item_swapped_in', itemId }),
        dropPick: () => send({ type: 'pick_dropped' }),
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
    const waiting =
      stage.kind === 'one_thing'
        ? wordsWhileUnscreened(stage.task, 'offered', connection, voice)
        : null;
    return <OneScreenView {...frame} {...drawn} line={drawn.line ?? waiting} />;
  }

  const { state } = composer;
  // After a rejected text nothing is spoken: the composer's own plain words ask for something else.
  const quiet = state.phase !== 'idle' || taskCall !== 'idle' || notice !== null;
  const slot = state.mode === 'typing' ? 'typing' : warmUp ? 'firstOneThing' : 'waiting';
  const sendChip = (text: string) => {
    composer.send({ type: 'keyboard_tapped' });
    composer.send({ type: 'text_changed', text });
    composer.send({ type: 'send_tapped' });
  };
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
      onCancelThinking: () => send({ type: 'task_call_cancelled' }),
    },
    warmUp: warmUp
      ? {
          chips: [t('launch.chip.reply'), t('launch.chip.water'), t('launch.chip.email')],
          onChip: sendChip,
        }
      : null,
    notificationsOff: notificationsRefused,
    ...composerWays({
      stage,
      warmUp,
      t,
      language,
      today: localDate,
      sendChip,
      pickForMe: () => send({ type: 'pick_for_me' }),
    }),
  };
  return (
    <OneScreenView
      {...frame}
      mood={composerMood(state, taskCall, warmUp)}
      // With no connection Scootch says so, in place of his usual ask: starting still works.
      line={quiet ? null : lineWithNoTask(offline && slot === 'waiting' ? 'offline' : slot, voice)}
      shown={shown}
    />
  );
}
