import { useNetworkState } from 'expo-network';
import { useIsFocused, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Linking, View } from 'react-native';

import { FREE_STARTS_PER_DAY, hasStartLeft, startsAllowed, type Attitude } from '@scootch/domain';

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
import { useTableState } from '../../state/together-context';
import { touchHaptic } from '../../ui/motion/press-spring';
import { useFeel } from '../../ui/motion/use-feel';
import { useKeyboardOpen } from '../../ui/use-keyboard-open';
import { useScreenReader } from '../../ui/use-screen-style';
import { seriousShown } from '../care/serious-shown';
import type { SpeechPort } from '../composer/speech';
import { useComposerFeedback } from '../composer/composer-feedback';
import { sendTyped, useComposer } from '../composer/use-composer';
import { drawerRowEvents } from '../drawer/drawer-events';
import { DrawerSheet } from '../drawer/drawer-sheet';
import { HatchHauntLink } from '../haunt/hatch-haunt-link';
import { useHomePager, usePagerHold } from '../home-pager/home-pager-context';
import { wordsWhileUnscreened } from '../offline/waiting-words';
import { PLUS_SHEET_ONE_MORE } from '../plus/routes';
import type { Company } from '../table/company-control';
import { lobbyPath, seatPath } from '../table/table-rules';

import { composerMood } from './composer-mood';
import { composerWays } from './composer-ways';
import { doneLine } from './done-line';
import { HomeCompany } from './home-company';
import { holdsWords, homeStarts, stageOf } from './one-screen-stage';
import { OneScreenView, type OneScreenShown } from './one-screen-view';
import { stageShown } from './stage-shown';
import { taskSetShown } from './task-set-shown';
import { useHeldWords } from './use-held-words';
import { useReturnedText } from './use-returned-text';
import { sentWordsAreStale, useForgetSentWords } from './use-sent-words';

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
 * The one screen, driven by the day store: home with its composer, the one thing that comes back,
 * its hatch, or the task set with Start. Which of them shows is worked out from the store; every word Scootch says comes from the task's lines or the offline
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
  const pager = useHomePager();
  const t = useT();
  const screenReader = useScreenReader();
  const plus = usePlus();
  const network = useNetworkState();
  const playCue = useCue();
  const keyboardOpen = useKeyboardOpen();
  const [chosenMinutes, setMinutes] = useState<number | null>(null);
  const [treat, setTreat] = useState('');
  // Alone or at a table, once chosen; until then someone with a seat starts at their table.
  const [chosenCompany, setCompany] = useState<Company | null>(null);
  const seated = useTableState().tableId !== null;
  const [revealedFor, setRevealedFor] = useState<string | null>(null);
  // The drawer was opened from the words that wait for tomorrow: they are marked out in it.
  const [waitingMarked, markWaiting] = useState(false);
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
  const takesWords = stage.kind === 'home' && stage.startLeft;
  useSurfaceRequest('composer', takesWords && taskCall === 'idle', (request) => {
    // Asked for from outside while a page beside home is showing: home comes back first.
    pager?.show('home');
    // A step from the camera goes the way typed words go: the field, then send.
    if (request.text !== undefined) return sendTyped(sendComposer, request.text);
    sendComposer(
      request.listening ? { type: 'toggled', at: Date.now() } : { type: 'keyboard_tapped' },
    );
  });
  useReturnedText(day.returnedText, sendComposer, dispatch);
  useForgetSentWords(
    sentWordsAreStale(
      stage.kind,
      day.returnedText !== null,
      // A retry in flight keeps its words even while the earlier refusal is still on the screen.
      notice === 'say_it_another_way' && composer.state.phase === 'idle',
    ),
    composer.lastSent,
    composer.forgetSent,
  );
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
  // The pages beside home are not swiped to while something here has the finger or stands over
  // the screen: a hold on the composer, the keyboard, the drawer, a session on its way in.
  usePagerHold(composer.state.phase !== 'idle' || keyboardOpen || drawer.open || inSession || care);

  const offline = (network.isInternetReachable ?? network.isConnected) === false;
  const task = 'task' in today ? today.task : null;
  const frame = {
    attitude,
    offline,
    // The world and Settings are the pages either side of home; alone, home opens them as screens.
    onWorld: () => (pager ? pager.show('world') : router.push(WORLD)),
    // The drawer opens on the person's own pull, or their tap on what waits for tomorrow.
    onPull: () => send({ type: 'drawer', event: { type: 'pulled' } }),
    overlay: (
      <DrawerSheet
        open={drawer.open}
        items={drawer.items}
        today={localDate}
        canSwap={task === null ? hasStartLeft(today) : task.status === 'set'}
        waiting={day.waitingForTomorrow}
        waitingMarked={waitingMarked}
        capNote={
          task === null && !hasStartLeft(today) && today.kind === 'done_for_today'
            ? t('drawer.cap', { count: startsAllowed(plus) })
            : null
        }
        {...drawerRowEvents(day.waitingForTomorrow?.id ?? null, send)}
        onClose={() => {
          markWaiting(false);
          send({ type: 'drawer', event: { type: 'closed' } });
        }}
      />
    ),
    onMore: () => (pager ? pager.show('settings') : router.push(SETTINGS)),
    // Scootch answers a tap with a squeak and a small celebration of his own.
    onSqueak: () => playCue('squeak'),
    failed: notice === 'failed',
  };

  if (care) return null;
  if (stage.kind === 'session') return COVERED;

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
      company: chosenCompany ?? (seated ? 'table' : 'alone'),
      onCompany: setCompany,
      // A seat already held is gone back to; otherwise the lobby finds or opens one.
      onTable: (minutes) => router.push((seated ? seatPath : lobbyPath)(minutes)),
      dispatch,
    });
    return <OneScreenView {...frame} {...drawn} />;
  }

  if (stage.kind !== 'home') {
    const drawn = stageShown(stage, {
      t,
      language,
      attitude,
      today: localDate,
      revealed: stage.kind === 'one_thing' && revealedFor === stage.task.id,
      sentWords: composer.lastSent,
      parked: drawer.items.length,
      hatchExtra: <HatchHauntLink />,
      cue: playCue,
      actions: {
        answerEnergy: heldWords.answer,
        cancel: () => send({ type: 'one_thing_cancelled' }),
        accept: () => send({ type: 'one_thing_picked' }),
        answerDeadline: (text, choice) => send({ type: 'deadline_answered', text, choice }),
        pickAgain: () => send({ type: 'pick_for_me' }),
        takePick: (itemId) => send({ type: 'drawer_item_swapped_in', itemId }),
        dropPick: () => send({ type: 'pick_dropped' }),
        tooBig: () => send({ type: 'too_big' }),
        catchIt: () => send({ type: 'monster_met' }),
        revealDone: () => {
          setRevealedFor(task?.id ?? null);
          composer.forgetSent();
        },
      },
    });
    const waiting =
      stage.kind === 'one_thing'
        ? wordsWhileUnscreened(stage.task, 'offered', connection, voice)
        : null;
    return <OneScreenView {...frame} {...drawn} line={drawn.line ?? waiting} />;
  }

  const { state } = composer;
  // The warm-up ask is first launch's: once something was done today it is an ordinary home.
  const firstAsk = warmUp && !stage.rested;
  const starts = homeStarts({ startLeft: stage.startLeft, plus, selling: showsSelling(day) });
  // After a rejected text nothing is spoken: the composer's own plain words ask for something else.
  const quiet = state.phase !== 'idle' || taskCall !== 'idle' || notice !== null;
  const typing = state.mode === 'typing' && (keyboardOpen || state.text.trim() !== '');
  // A day with something done in it rests until Scootch is spoken to: he sleeps, and wakes to
  // listen the moment the capsule is held or the keyboard comes up.
  const resting = stage.rested && !quiet && !typing;
  const slot = state.mode === 'typing' ? 'typing' : firstAsk ? 'firstOneThing' : 'waiting';
  const sendChip = (text: string) => sendTyped(composer.send, text);
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
      // With no start left the dock takes no words. Only the locked capsule, on a day with nothing
      // heavy in it, leads to the sheet, and only when it is tapped.
      ...(starts === 'open'
        ? {}
        : {
            gate: {
              kind: starts,
              onUnlock: () => router.push(PLUS_SHEET_ONE_MORE),
            },
          }),
    },
    warmUp: firstAsk
      ? {
          chips: [t('launch.chip.reply'), t('launch.chip.water'), t('launch.chip.email')],
          onChip: sendChip,
        }
      : null,
    notificationsOff: notificationsRefused,
    ...(firstAsk
      ? {}
      : {
          home: {
            waiting: stage.waiting?.text ?? null,
            onWaiting: () => {
              markWaiting(true);
              send({ type: 'drawer', event: { type: 'pulled' } });
            },
            startsNote:
              starts === 'locked'
                ? t('plus.oneMore.freeDone', { count: FREE_STARTS_PER_DAY })
                : null,
            // Never beside something heavy: the pill leads to a table, and its lobby sells seats.
            ...(showsSelling(day) ? { company: <HomeCompany /> } : {}),
          },
        }),
    ...composerWays({ stage, t, language, today: localDate, sendChip }),
  };
  return (
    <OneScreenView
      {...frame}
      mood={resting ? 'asleep' : composerMood(state, taskCall, firstAsk, nudging)}
      // With no connection Scootch says so, in place of his usual ask: starting still works.
      line={
        resting
          ? doneLine(shownLine, voice)
          : quiet
            ? null
            : lineWithNoTask(offline && slot === 'waiting' ? 'offline' : slot, voice)
      }
      shown={shown}
    />
  );
}
