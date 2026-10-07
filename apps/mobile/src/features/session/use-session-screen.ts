import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import type { MonsterRow, ParkedThought, SessionEvent } from '@scootch/domain';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useCharacterMotion } from '../../ui/motion/use-feel';
import { useDispatch, useSession, useToday } from '../../state/day-store-provider';
import { useKeepsakes } from '../../state/keepsakes';
import { useSurfaceRequest } from '../../state/surface-requests';
import { revealSeen } from '../reveal/reveal-seen';

import { catchFor } from './catch/catch-kinds';
import { SHORT_SESSION_SECONDS, shortSession } from './dev/short-session';
import type { SessionActions, SessionModel } from './screens/screen-props';
import {
  CAUGHT_HOLD_MS,
  NOTHING_PASSED,
  catchPlays,
  catchable,
  closeMeans,
  finishedByHand,
  minutesLeft,
  sessionView,
  timeLeftFraction,
  type Passed,
} from './session-view';
import { BURST_HOLD_MS } from './ui/burst-shapes';
import { SAID_DONE, voiceFinishTrigger } from './voice-finish-trigger';

/** How often Scootch says another of his working lines. */
const WORKING_LINE_EVERY_MS = 90_000;
/** How long "Parked" stays up before the screen is only the work again. */
const PARKED_NOTE_MS = 2600;

const TICKING: readonly string[] = ['running', 'stuck', 'holding'];
/** How long a session that is set waits to learn whether catching has still to be explained. */
const COACH_WAIT_MS = 800;

function useScreenReader(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isScreenReaderEnabled()
      .then(setOn)
      .catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => listener.remove();
  }, []);
  return on;
}

/** The monsters already caught, oldest first, without the one this session is for. */
function caughtBefore(monsters: readonly MonsterRow[], taskId: string | null): MonsterRow[] {
  return monsters
    .filter((monster) => monster.caughtAt !== null && monster.taskId !== taskId)
    .sort((a, b) => (a.caughtAt ?? '').localeCompare(b.caughtAt ?? ''));
}

/** The current time, read once a second while `ticking`. */
function useNow(ticking: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ticking]);
  return now;
}

/**
 * The session screens' link to the day store: it reads the session and what the runner showed,
 * works out which screen is on, and turns every press into a store event. Timers, sound, haptics
 * and the Live Activity are the runner's; nothing here calls them.
 */
export function useSessionScreen(): { model: SessionModel; actions: SessionActions } {
  const { session, line, burst, treat, parkedThoughts, tinyNextStep, afterLines } = useSession();
  const { today, monster, settings, localDate } = useToday();
  const dispatch = useDispatch();
  const { language } = useLanguage();
  const t = useT();
  const character = useCharacterMotion();
  const [passed, setPassed] = useState<Passed>(NOTHING_PASSED);
  const [parkOpen, setParkOpen] = useState(false);
  const [parkedNote, setParkedNote] = useState<string | null>(null);

  // A finish made on the finish control on this visit: the catch may play before the reveal.
  const [byHand, setByHand] = useState(false);
  const sendFinish = useCallback(
    (event: SessionEvent) => {
      if (finishedByHand(event)) setByHand(true);
      return dispatch({ type: 'session', event }).catch(() => undefined);
    },
    [dispatch],
  );
  const send = useCallback((event: SessionEvent) => void sendFinish(event), [sendFinish]);
  const pass = useCallback(
    (changes: Partial<Passed>) => setPassed((before) => ({ ...before, ...changes })),
    [],
  );

  const live = session !== null && session.phase !== 'let_go' ? session : null;
  const phase = session?.phase ?? null;

  // A catch is a gesture on a moving drawing: it needs a monster, a finger that can find it and
  // motion that may play. Otherwise the finish is two taps.
  const screenReader = useScreenReader();
  const canCatch = catchable({
    monster: monster !== null,
    screenReader,
    reducedMotion: character.reducedMotion,
  });
  const catches = canCatch && settings.finishWith === 'hold' && live?.tone === 'full';
  // What is already kept is read once for the task: the binder's count and the month's page.
  const { keepsakes } = useKeepsakes(live?.taskId ?? null);
  const caught = useMemo(
    () => (keepsakes ? caughtBefore(keepsakes.monsters, live?.taskId ?? null) : null),
    [keepsakes, live?.taskId],
  );
  // How catching works is explained before the start until the first monster has been caught. A
  // phone that cannot say in time whether one has been simply starts.
  const [coached, setCoached] = useState(false);
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), COACH_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);
  const coach = catches && !coached && caught !== null && caught.length === 0;
  const startHeld = catches && !coached && (coach || (caught === null && !waited));
  const now = useNow(phase !== null && TICKING.includes(phase));
  const view = sessionView({
    session,
    burst,
    treat,
    parkedThoughts,
    finishWith: settings.finishWith,
    passed,
    catchable: canCatch,
    coach,
    caught: catchPlays({
      byHand,
      reducedMotion: character.reducedMotion,
      crisis: today.kind === 'crisis',
    }),
    ...(session?.phase === 'finished'
      ? { reveal: revealSeen(session.taskId) ? ('seen' as const) : ('pending' as const) }
      : {}),
  });

  // A finish hands over to the reveal: the card, the world piece, the bar. The treat and the
  // parked thoughts follow when it comes back.
  const router = useRouter();
  useEffect(() => {
    if (view.kind === 'reveal') router.replace('/reveal');
  }, [view.kind, router]);

  // Arriving here with a session that is set means Start was tapped: the session begins, unless
  // catching has still to be explained, and then the card's own Start begins it.
  useEffect(() => {
    if (phase === 'set' && !startHeld) send({ type: 'started' });
  }, [phase, startHeld, send]);

  // The catch ends by itself, and the reveal takes over.
  useEffect(() => {
    if (view.kind !== 'caught') return undefined;
    const timer = setTimeout(() => pass({ caught: true }), CAUGHT_HOLD_MS);
    return () => clearTimeout(timer);
  }, [view.kind, pass]);

  // The burst goes quiet by itself.
  useEffect(() => {
    if (view.kind !== 'burst') return undefined;
    const timer = setTimeout(() => pass({ burst: true }), BURST_HOLD_MS);
    return () => clearTimeout(timer);
  }, [view.kind, pass]);

  // Scootch changes his line now and then while the work goes on.
  const working = view.kind === 'working' && phase === 'running';
  useEffect(() => {
    if (!working) return undefined;
    const timer = setInterval(
      () => void dispatch({ type: 'working_line_turned' }).catch(() => undefined),
      WORKING_LINE_EVERY_MS,
    );
    return () => clearInterval(timer);
  }, [working, dispatch]);

  // The Control Center control or a Live Activity button asked to park a thought: the field opens.
  useSurfaceRequest('park_thought', view.kind === 'working', () => setParkOpen(true));

  useEffect(() => {
    if (parkedNote === null) return undefined;
    const timer = setTimeout(() => setParkedNote(null), PARKED_NOTE_MS);
    return () => clearTimeout(timer);
  }, [parkedNote]);

  // A spoken "done" is heard only while the finish is on show, and only when it was chosen.
  const listening = view.kind === 'finish' && settings.finishWith === 'voice';
  useEffect(() => {
    if (!listening || voiceFinishTrigger === null) return undefined;
    return voiceFinishTrigger.listen(() => send(SAID_DONE));
  }, [listening, send]);

  // VoiceOver hears the minutes left once a minute, not once a second.
  const left = live ? minutesLeft(live, now) : 0;
  const ticking = phase !== null && TICKING.includes(phase);
  useEffect(() => {
    if (!ticking || left <= 0) return;
    AccessibilityInfo.announceForAccessibility(t('session.minutesLeftSpoken', { count: left }));
  }, [ticking, left, t]);

  const task = 'task' in today ? today.task : null;
  const model: SessionModel = {
    view,
    quiet: live?.tone === 'quiet',
    taskText: task?.text ?? '',
    monster,
    workMode: task?.workMode ?? null,
    attitude: settings.attitude,
    plannedMinutes: live?.ask.minutes ?? 0,
    minutesLeft: left,
    fraction: live ? timeLeftFraction(live, now) : 0,
    line,
    tinyNextStep,
    treatLine: afterLines.treat,
    thoughtsLine: afterLines.parkedThoughts,
    reducedMotion: character.reducedMotion,
    parkOpen,
    parkedNote,
    catch:
      catches && live
        ? {
            kind: catchFor(live.taskId),
            caughtCount: caught ? caught.length : null,
            monthMates: (caught ?? []).filter(
              (mate) => mate.caughtOn?.slice(0, 7) === localDate.slice(0, 7),
            ),
            monthName: new Date(`${localDate}T12:00:00`).toLocaleDateString(language, {
              month: 'long',
            }),
          }
        : null,
    developerEnd: shortSession.isArmed(),
    timeOf: (thought: ParkedThought) =>
      new Date(thought.parkedAt).toLocaleTimeString(language, {
        hour: '2-digit',
        minute: '2-digit',
      }),
  };

  const shown = useRef(view);
  shown.current = view;
  const actions = useMemo<SessionActions>(
    () => ({
      // Mid-session a close never ends the session silently: it leads to the not-finished
      // choices, which can be taken back.
      leave: () => send({ type: closeMeans(shown.current) === 'ask' ? 'not_finished' : 'left' }),
      // Stopping on purpose leads to the not-finished choices; the work so far is recorded.
      leaveNow: () => send({ type: 'not_finished' }),
      openPark: () => setParkOpen(true),
      closePark: () => setParkOpen(false),
      park: (text) => {
        send({ type: 'thought_parked', text });
        setParkOpen(false);
        setParkedNote(text);
      },
      send,
      sendFinish,
      startNow: () => {
        setCoached(true);
        send({ type: 'started' });
      },
      finishEarly: () => pass({ finishingEarly: true }),
      keepGoing: () => pass({ finishingEarly: false }),
      passBurst: () => pass({ burst: true }),
      passCaught: () => pass({ caught: true }),
      passMoment: () => pass({ moment: true }),
      passTreat: () => pass({ treat: true }),
      passThoughts: () => pass({ thoughts: true }),
      resolveThought: (thought, resolution) =>
        void dispatch({ type: 'thought_resolved', thought, resolution }).catch(() => undefined),
      developerEnd: () =>
        void dispatch({
          type: 'developer_session_ends_in',
          seconds: SHORT_SESSION_SECONDS,
        }).catch(() => undefined),
    }),
    [dispatch, pass, send, sendFinish],
  );

  return { model, actions };
}
