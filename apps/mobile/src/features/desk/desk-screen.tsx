import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { HeardTask } from '@phusclass/domain/hearing';
import type { Language } from '@phusclass/i18n';

import { useCareGuard } from '../care/use-care-guard';
import { ChalkFlight } from '../composer/chalk-flight';
import { ComposerBar } from '../composer/composer-bar';
import { useComposer } from '../composer/use-composer';
import { useKeyboardHeight } from '../composer/use-keyboard-height';
import { useNetworkState } from '../offline/connection';
import { clockText } from '../session/session-model';
import { DrumBurst } from '../session/drum-burst';
import { afterSlip } from '../slip/slip-model';
import { SlipSheet } from '../slip/slip-sheet';
import { useLanguage } from '../../i18n/i18n-provider';
import { useBoard, useBoardStore } from '../../state/board-provider';
import { RECESS_MS } from '../../state/board-view';

import { useClassCue } from './class-cues';
import { deskModel, withSlipOut } from './desk-model';
import { DeskView } from './desk-view';
import { fixedLine, lineFor } from './his-line';
import { clearPassing, sayInPassing, usePassingLine } from './passing-line';
import { drawnCarvings } from './room-scene';
import { useDeskGestures } from './use-desk-gestures';
import { useStudentName } from './use-student-name';

/** The drum sounds for this long before the camera pulls back. */
const DRUM_MS = 760;
/** After a slip empties the desk, he picks again once his line has been read. */
const REPICK_MS = 2600;
/** Away this long, coming back is greeted with "Sit.". */
const AWAY_MS = 30 * 60_000;

function heardDate(day: string, language: Language): string {
  try {
    return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(Date.parse(`${day}T00:00:00Z`));
  } catch {
    return day;
  }
}

/** His answer once something said has gone on the board. Plain until it is screened. */
function landedLine(
  tasks: readonly HeardTask[],
  wasEmpty: boolean,
  language: Language,
  seed: number,
) {
  const first = tasks[0];
  if (first === undefined) return undefined;
  const plain = { plain: true };
  if (wasEmpty) return lineFor(language, 'firstThingToDesk', seed, { task: first.text }, plain);
  const dated = tasks.find((task) => task.dueDate !== null);
  if (dated?.dueDate) {
    return lineFor(
      language,
      'deadlineHeard',
      seed,
      { date: heardDate(dated.dueDate, language) },
      plain,
    );
  }
  const timed = tasks.find((task) => task.heardTime !== null);
  if (timed?.heardTime)
    return lineFor(language, 'timeHeard', seed, { time: timed.heardTime.at }, plain);
  return lineFor(language, 'writtenDown', seed);
}

/** The desk, on the board store: one task, his line, Start with its fuse, "Say it", recess. */
export function DeskScreen() {
  const crisis = useCareGuard();
  const snapshot = useBoard();
  const store = useBoardStore();
  const router = useRouter();
  const { language } = useLanguage();
  const name = useStudentName();
  const network = useNetworkState();
  const passing = usePassingLine();
  const keyboard = useKeyboardHeight();
  const cue = useClassCue();
  const [slipOpen, setSlipOpen] = useState(false);
  const [chosenMinutes, setChosenMinutes] = useState<number | null>(null);
  const [drumming, setDrumming] = useState(false);
  const [flights, setFlights] = useState<{ readonly key: number; readonly notes: string[] }>({
    key: 0,
    notes: [],
  });

  const model = useMemo(() => deskModel({ snapshot, language, name }), [snapshot, language, name]);
  const deskTaskId = model.task?.id ?? null;
  const gestures = useDeskGestures(!slipOpen && !drumming);

  const composer = useComposer({
    say: store.say,
    onLanded: (tasks) => {
      const wasEmpty = snapshot.desk === null;
      cue('chalk');
      setFlights((last) => ({ key: last.key + 1, notes: tasks.map((task) => task.text) }));
      const line = landedLine(tasks, wasEmpty, language, Date.now());
      if (line !== undefined) sayInPassing(line.text, 2600);
    },
    onShortTap: () => sayInPassing(fixedLine(language, 'shortTap'), 1800),
  });

  // The desk is in front of the user again: the fuse burns from now.
  useFocusEffect(
    useCallback(() => {
      if (deskTaskId !== null) void store.openDesk();
    }, [deskTaskId, store]),
  );
  // Back after time away: the desk says only "Sit.", and nothing about how long it was.
  useEffect(() => {
    let leftAt: number | null = null;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') leftAt = Date.now();
      if (state !== 'active') return;
      if (store.getSnapshot().desk !== null) void store.openDesk();
      if (leftAt !== null && Date.now() - leftAt >= AWAY_MS) {
        sayInPassing(fixedLine(language, 'comingBack'), 2600);
      }
      leftAt = null;
    });
    return () => sub.remove();
  }, [store, language]);

  // The desk emptied with things still on the board (a slip): he picks again.
  const boardCount = snapshot.board.length;
  useEffect(() => {
    if (snapshot.phase !== 'empty' || boardCount === 0) return undefined;
    const timer = setTimeout(() => void store.pick(), REPICK_MS);
    return () => clearTimeout(timer);
  }, [snapshot.phase, boardCount, store]);

  // Recess has run out: the bell, and back to class.
  const recessDone = snapshot.phase === 'finished' && !snapshot.recessOffered;
  useEffect(() => {
    if (!recessDone) return;
    cue('bell');
    const over = lineFor(language, 'recessOver', Date.now());
    if (over !== undefined) sayInPassing(over.text, 2600);
    void store.next();
  }, [recessDone, store, cue, language]);

  // His tea goes cold at the first step: a sip.
  const lastPressure = useRef(model.pressure);
  useEffect(() => {
    if (model.pressure === 1 && lastPressure.current === 0) cue('tea-sip');
    lastPressure.current = model.pressure;
  }, [model.pressure, cue]);

  // "Still yours?" is put to the user once.
  const askedId = model.stillYours?.id ?? null;
  useEffect(() => {
    if (askedId !== null) void store.stillYoursAsked(askedId);
  }, [askedId, store]);

  const start = useCallback(() => {
    if (drumming) return;
    clearPassing();
    if (model.heavy) {
      // Plain company: no drum, no burst.
      void store.start(chosenMinutes ?? undefined);
      return;
    }
    setDrumming(true);
    cue('drum');
    setTimeout(() => {
      void store.start(chosenMinutes ?? undefined).finally(() => setDrumming(false));
    }, DRUM_MS);
  }, [drumming, model.heavy, store, chosenMinutes, cue]);

  if (crisis) return null;
  const phase = snapshot.phase;
  if (
    phase === 'running' ||
    phase === 'time up' ||
    (phase === 'finished' && snapshot.recessOffered)
  ) {
    return <Redirect href="/session" />;
  }

  const offline = network.isInternetReachable === false || network.isConnected === false;
  const recess =
    snapshot.recess === null
      ? null
      : {
          left: clockText(snapshot.recess.leftMs),
          gone: Math.min(1, 1 - snapshot.recess.leftMs / RECESS_MS),
          over: snapshot.recess.leftMs <= 0,
        };
  const typing = composer.state.mode === 'typing';
  const deskTitle = model.task?.title ?? '';

  return (
    <DeskView
      model={slipOpen ? withSlipOut(model, language) : model}
      passing={passing}
      carvings={drawnCarvings(snapshot.carvings, name)}
      offline={offline}
      now={snapshot.now.at}
      typing={typing}
      keyboard={typing ? keyboard : 0}
      chosenMinutes={chosenMinutes}
      recess={recess}
      gestures={gestures}
      composer={
        <ComposerBar
          state={composer.state}
          onPressIn={composer.press}
          onPressOut={composer.release}
          onType={composer.openTyping}
          onEdit={composer.edit}
          onSubmit={composer.submit}
          onCancel={composer.cancel}
        />
      }
      overlays={
        <>
          <ChalkFlight key={flights.key} notes={flights.notes} from={480} to={150} />
          {drumming ? <DrumBurst /> : null}
          {slipOpen && deskTaskId !== null ? (
            <SlipSheet
              taskId={deskTaskId}
              taskTitle={deskTitle}
              onClose={() => setSlipOpen(false)}
              onStart={() => {
                setSlipOpen(false);
                start();
              }}
              onHandIn={(excuse, graded) => {
                setSlipOpen(false);
                cue('red-pen');
                void store.slip(excuse, graded.accepted).then((outcome) => {
                  const after = outcome === null ? null : afterSlip(language, outcome);
                  sayInPassing(after ?? graded.comment, 2800);
                });
              }}
            />
          ) : null}
        </>
      }
      onStart={start}
      onLength={setChosenMinutes}
      onSlip={() => setSlipOpen(true)}
      onNotNow={() => void store.slip('', false)}
      onOpenBoard={gestures.openBoard}
      onOpenTimetable={gestures.openTimetable}
      onStillYours={(answer) => {
        if (askedId !== null) void store.answerStillYours(askedId, answer);
      }}
      onBackToClass={() => void store.next()}
      onSettings={() => router.push('/settings')}
      onChalkThrown={() => cue('chalk')}
    />
  );
}
