import { useNetworkState } from 'expo-network';
import { useIsFocused, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Linking, View } from 'react-native';

import { hasStartLeft, startsAllowed, type Attitude } from '@scootch/domain';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import {
  useCue,
  useDispatch,
  useDrawer,
  useSession,
  useToday,
} from '../../state/day-store-provider';
import type { DayEvent } from '../../state/day-types';
import { usePlus } from '../../state/keepsakes';
import { lineWithNoTask } from '../../state/lines';
import { showsSelling } from '../../state/shows-comedy';
import { useSurfaceRequest } from '../../state/surface-requests';
import { touchHaptic } from '../../ui/motion/press-spring';
import { useFeel } from '../../ui/motion/use-feel';
import { useScreenReader } from '../../ui/use-screen-style';
import { seriousShown } from '../care/serious-shown';
import type { SpeechPort } from '../composer/speech';
import { useComposerFeedback } from '../composer/composer-feedback';
import { useComposer } from '../composer/use-composer';
import { DrawerSheet } from '../drawer/drawer-sheet';
import { QuietLink } from '../dump/dump-panels';
import { HatchHauntLink } from '../haunt/hatch-haunt-link';
import { wordsWhileUnscreened } from '../offline/waiting-words';
import { OneMore } from '../plus/one-more';
import { PLUS_SHEET_ONE_MORE } from '../plus/routes';

import { composerMood } from './composer-mood';
import { composerWays } from './composer-ways';
import { doneLine } from './done-line';
import { holdsWords, stageOf } from './one-screen-stage';
import { OneScreenView, type OneScreenShown } from './one-screen-view';
import { stageShown } from './stage-shown';
import { taskSetShown } from './task-set-shown';
import { useHeldWords } from './use-held-words';
import { useReturnedText } from './use-returned-text';

export interface OneScreenProps {
  readonly speech: SpeechPort;
  /** True straight after first launch: the first ask is the warm-up one, with its examples. */
  readonly warmUp: boolean;
  /** The system's notification prompt was just refused: it is said once, here. */
  readonly notificationsRefused: boolean;
}

/** The routes other parts of the app provide, reached by name. */
const [WORLD, CARE, SETTINGS] = ['/world', '/care', '/settings'] as [Href, Href, Href];
const SESSION = '/session' as Href;
/** What the drawing hook answers while a session covers the one screen. */
const COVERED = 'covered';

/**
 * The one screen, driven by the day store: the composer, the one thing that comes back, its
 * hatch, a counter-offer, the task set with Start, or done for today. Which of them shows is
 * worked out from the store; every word Scootch says comes from the task's lines or the offline
 * pack.
 */
export function OneScreen(props: OneScreenProps) {
  const drawn = useOneScreenDrawn(props);
  // The session fades in over the one screen. Until it covers it, the one screen stays exactly as
  // it was when Start was tapped, so there is never an empty frame between the two.
  const last = useRef<ReactElement | null>(null);
  const covered = drawn === COVERED;
  if (!covered) last.current = drawn;
  // What stays drawn under the arriving session takes no taps: Start cannot be pressed twice.
  return (
    <View style={{ flex: 1 }} pointerEvents={covered ? 'none' : 'auto'}>
      {last.current}
    </View>
  );
}

function useOneScreenDrawn({
  speech,
  warmUp,
  notificationsRefused,
}: OneScreenProps): ReactElement | null | typeof COVERED {
  const day = useToday();
  const { today, settings, taskCall, notice, localDate } = day;
  const { line: shownLine } = useSession();
  const drawer = useDrawer();
  const { language } = useLanguage();
  const dispatch = useDispatch();
  const router = useRouter();
  const t = useT();
  const screenReader = useScreenReader();
  const plus = usePlus();
  const network = useNetworkState();
  const playCue = useCue();
  const [chosenMinutes, setMinutes] = useState<number | null>(null);
  const [treat, setTreat] = useState('');
  const [revealedFor, setRevealedFor] = useState<string | null>(null);
  // The first words of the day wait for the battery question; after that they go straight on.
  const heldWords = useHeldWords({ energyNeeded: day.energyNeeded, dispatch });

  const send = (event: DayEvent) => void dispatch(event).catch(() => undefined);
  const attitude: Attitude = settings.attitude;
  const voice = { language, attitude };
  const composer = useComposer({ speech, language, onSend: heldWords.onSend });
  // The composer is heard and felt: listen, send, cancel, the tick of a switch, the cancel arming.
  const feel = useFeel();
  const { nudging } = useComposerFeedback(composer.state, playCue, () => {
    if (feel.haptics) touchHaptic('choice');
  });
  const stage = stageOf({ ...day, drawer, energyAsked: heldWords.asked });
  const sendComposer = composer.send;
  // The question is not on the screen (something was taken from the drawer meanwhile): the held
  // words go back into the field instead of waiting for an answer nobody can give.
  const { asked, giveBack } = heldWords;
  const questionShows = holdsWords(stage);
  useEffect(() => {
    if (asked && !questionShows) giveBack(sendComposer);
  }, [asked, questionShows, giveBack, sendComposer]);
  // A control or a widget asked for the composer: it opens for typing, or starts listening.
  useSurfaceRequest('composer', stage.kind === 'composer' && taskCall === 'idle', (request) =>
    sendComposer(
      request.listening ? { type: 'toggled', at: Date.now() } : { type: 'keyboard_tapped' },
    ),
  );
  useReturnedText(day.returnedText, sendComposer, dispatch);
  const care = stage.kind === 'care';
  useEffect(() => {
    // A crisis day shows nothing of this screen: the care screens take over.
    if (care) router.replace(CARE);
  }, [care, router]);
  // The session's own screens are on their route for as long as one is running. It is pushed over
  // this screen, and only by the one screen the person is looking at.
  const focused = useIsFocused();
  const inSession = stage.kind === 'session';
  useEffect(() => {
    if (inSession && focused) router.push(SESSION);
  }, [inSession, focused, router]);

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
    // Scootch answers a tap with a squeak and a small celebration of his own.
    onSqueak: () => playCue('squeak'),
    failed: notice === 'failed',
  };

  if (care) return null;
  if (stage.kind === 'session') return COVERED;

  if (stage.kind === 'done') {
    // A start still open today is offered on any day. Only the locked control, which leads to
    // Plus, is held back on a heavy day.
    const left = today.kind === 'done_for_today' ? today.startsLeft : 0;
    const more =
      left === 0 && !showsSelling(day) ? null : (
        <OneMore
          plus={plus}
          left={left}
          onLocked={() => router.push(PLUS_SHEET_ONE_MORE)}
          onMore={() => send({ type: 'one_more_asked' })}
        />
      );
    // "That's it for today" can be taken back for as long as the day lasts.
    const under = day.restUndo ? (
      <>
        {more}
        <QuietLink
          label={t('taskSet.rest.undo')}
          hint={t('taskSet.rest.undo.hint')}
          onPress={() => send({ type: 'rest_undone' })}
          testID="rest-undo"
        />
      </>
    ) : (
      more
    );
    return (
      <OneScreenView
        {...frame}
        mood="asleep"
        line={doneLine(shownLine, voice)}
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
    const drawn = taskSetShown(stage, {
      day,
      t,
      voice,
      connection,
      chosenMinutes,
      treat,
      onTreat: setTreat,
      onMinutes: setMinutes,
      dispatch,
    });
    return <OneScreenView {...frame} {...drawn} />;
  }

  if (stage.kind !== 'composer') {
    const drawn = stageShown(stage, {
      t,
      language,
      attitude,
      today: localDate,
      revealed: stage.kind === 'one_thing' && revealedFor === stage.task.id,
      hatchExtra: <HatchHauntLink />,
      cue: playCue,
      actions: {
        answerEnergy: heldWords.answer,
        another: () => send({ type: 'another_asked' }),
        accept: () => send({ type: 'one_thing_picked' }),
        edit: () => send({ type: 'one_thing_returned' }),
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
      mood={composerMood(state, taskCall, warmUp, nudging)}
      // With no connection Scootch says so, in place of his usual ask: starting still works.
      line={quiet ? null : lineWithNoTask(offline && slot === 'waiting' ? 'offline' : slot, voice)}
      shown={shown}
    />
  );
}
