import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import type { ParkedThought, SessionEvent } from '@scootch/domain';

import { useLanguage, useT } from '../../i18n/i18n-provider';
import { useCharacterMotion } from '../../ui/motion/use-feel';
import { useDispatch, useSession, useToday } from '../../state/day-store-provider';
import { useSurfaceRequest } from '../../state/surface-requests';
import { revealSeen } from '../reveal/reveal-seen';

import { SHORT_SESSION_SECONDS, shortSession } from './dev/short-session';
import type { SessionActions, SessionModel } from './screens/screen-props';
import {
  NOTHING_PASSED,
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
  const { today, monster, settings } = useToday();
  const dispatch = useDispatch();
  const { language } = useLanguage();
  const t = useT();
  const character = useCharacterMotion();
  const [passed, setPassed] = useState<Passed>(NOTHING_PASSED);
  const [parkOpen, setParkOpen] = useState(false);
  const [parkedNote, setParkedNote] = useState<string | null>(null);

  const send = useCallback(
    (event: SessionEvent) => void dispatch({ type: 'session', event }).catch(() => undefined),
    [dispatch],
  );
  const pass = useCallback(
    (changes: Partial<Passed>) => setPassed((before) => ({ ...before, ...changes })),
    [],
  );

  const live = session !== null && session.phase !== 'let_go' ? session : null;
  const phase = session?.phase ?? null;
  const now = useNow(phase !== null && TICKING.includes(phase));
  const view = sessionView({
    session,
    burst,
    treat,
    parkedThoughts,
    finishWith: settings.finishWith,
    passed,
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

  // Arriving here with a session that is set means Start was tapped: the session begins.
  useEffect(() => {
    if (phase === 'set') send({ type: 'started' });
  }, [phase, send]);

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
    holdStartsAt: 0,
    developerEnd: shortSession.isArmed(),
    timeOf: (thought: ParkedThought) =>
      new Date(thought.parkedAt).toLocaleTimeString(language, {
        hour: '2-digit',
        minute: '2-digit',
      }),
  };

  const actions = useMemo<SessionActions>(
    () => ({
      // Leaving early is unremarked: the session ends and the one screen is simply back.
      leave: () => send({ type: 'left' }),
      openPark: () => setParkOpen(true),
      closePark: () => setParkOpen(false),
      park: (text) => {
        send({ type: 'thought_parked', text });
        setParkOpen(false);
        setParkedNote(text);
      },
      send,
      finishEarly: () => pass({ finishingEarly: true }),
      keepGoing: () => pass({ finishingEarly: false }),
      passBurst: () => pass({ burst: true }),
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
    [dispatch, pass, send],
  );

  return { model, actions };
}
