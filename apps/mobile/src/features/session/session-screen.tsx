import { Redirect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { TIMING, type Framing, type PhuMood } from '@phusclass/art/class';
import type { CommentStep } from '@phusclass/domain/board';

import { useCareGuard, useCareView } from '../care/use-care-guard';
import { ComposerBar } from '../composer/composer-bar';
import { useComposer } from '../composer/use-composer';
import { useClassCue } from '../desk/class-cues';
import { fixedLine, lineFor } from '../desk/his-line';
import { clearPassing, sayInPassing, usePassingLine } from '../desk/passing-line';
import { drawnCarvings } from '../desk/room-scene';
import { useStudentName } from '../desk/use-student-name';
import { useLanguage } from '../../i18n/i18n-provider';
import { useBoard, useBoardStore } from '../../state/board-provider';
import { useMayMove } from '../../ui/motion/use-feel';

import { HAPPENING_MS, HAPPENINGS } from './happening-scene';
import { sessionClock } from './session-model';
import { SessionView, type SessionPanel } from './session-view';
import { useLivePeriod } from './use-live-period';
import { useSessionChalk } from './use-session-chalk';

/** A happening comes this far into a period, and stays `HAPPENING_MS`. */
const HAPPENING_AT_MS = 20_000;
/** How long the drum's "Tùng!" stays on screen. */
const DRUM_SHOW_MS = 1200;

function between([lo, hi]: readonly [number, number]): number {
  return lo + Math.random() * (hi - lo);
}

/** A running period, on the board store: pacing, raise a hand, a stray thought, the drum, the finish. */
export function SessionScreen() {
  const crisis = useCareGuard();
  const care = useCareView();
  const snapshot = useBoard();
  const store = useBoardStore();
  const { language } = useLanguage();
  const name = useStudentName();
  const mayMove = useMayMove();
  const passing = usePassingLine();
  const cue = useClassCue();

  const [framing, setFraming] = useState<Framing>('desk');
  const [panel, setPanel] = useState<SessionPanel>('working');
  const [note, setNote] = useState('');
  const [straying, setStraying] = useState(false);
  const [drum, setDrum] = useState(false);
  const [looking, setLooking] = useState(false);
  const [took, setTook] = useState<number | null>(null);

  const clock = sessionClock(snapshot);
  const chalkboard = useSessionChalk(snapshot);
  const desk = snapshot.desk;
  const session = snapshot.session;
  // A heavy task, or plain company after a crisis: no drum, pacing, looks, happening or grade.
  const plain = care.mode === 'plain';
  const heavy = (desk?.heavy ?? false) || plain;
  const phase = snapshot.phase;
  const last = snapshot.lastFinish;
  const finished: {
    readonly title: string;
    readonly comment: CommentStep | null;
    readonly waitedDays: number;
    readonly tookMinutes: number;
  } | null =
    phase === 'finished' && last !== null
      ? {
          title: last.task.text,
          comment: plain ? null : last.comment,
          waitedDays: Math.max(
            0,
            Math.floor(
              ((last.task.done?.at ?? last.task.createdAt) - last.task.createdAt) / 86_400_000,
            ),
          ),
          tookMinutes: took ?? last.task.done?.periodMinutes ?? 1,
        }
      : null;
  const title = desk?.task.text ?? finished?.title ?? '';

  // The camera pulls back from the desk once the room is drawn; at the finish it comes back in.
  const atFinish = phase === 'finished';
  useEffect(() => {
    const timer = setTimeout(() => setFraming(atFinish ? 'desk' : 'session'), 60);
    return () => clearTimeout(timer);
  }, [atFinish]);

  // The first words of the period.
  const sessionId = session?.id ?? null;
  useEffect(() => {
    if (sessionId === null || clock === null || clock.timeUp) return;
    const line = heavy
      ? lineFor(language, plain ? 'crisisCompany' : 'seriousCompany', sessionId)
      : lineFor(language, 'start', sessionId, { minutes: clock.minutes });
    if (line !== undefined) sayInPassing(line.text, 2400);
  }, [sessionId]);

  // Time is up: the drum again, and "Done?".
  const timeUp = phase === 'time up';
  const wasTimeUp = useRef(timeUp);
  useEffect(() => {
    if (timeUp && !wasTimeUp.current && !heavy) {
      cue('drum');
      setDrum(true);
      const timer = setTimeout(() => setDrum(false), DRUM_SHOW_MS);
      wasTimeUp.current = timeUp;
      return () => clearTimeout(timer);
    }
    wasTimeUp.current = timeUp;
    return undefined;
  }, [timeUp, heavy, cue]);

  // While he paces he stops now and then to look straight at you.
  useEffect(() => {
    if (phase !== 'running' || heavy || panel !== 'working') return undefined;
    let timer: ReturnType<typeof setTimeout>;
    let looks = 0;
    const next = () => {
      timer = setTimeout(() => {
        looks += 1;
        setLooking(true);
        if (looks % 3 === 0) {
          const line = lineFor(language, 'looksUp', `${sessionId}:${looks}`);
          if (line !== undefined) sayInPassing(line.text, TIMING.paceLookMs);
        }
        timer = setTimeout(() => {
          setLooking(false);
          next();
        }, TIMING.paceLookMs);
      }, between(TIMING.paceLookEveryMs));
    };
    next();
    return () => clearTimeout(timer);
  }, [phase, heavy, panel, language, sessionId]);

  // A happening, when the store rolled one for this period: once, a little way in.
  const happening = session?.happening ?? null;
  const [happeningOn, setHappeningOn] = useState(false);
  const elapsed = session === null ? 0 : snapshot.now.at - session.startedAt;
  const happeningDue =
    happening !== null &&
    happening !== 'pop quiz' &&
    !heavy &&
    phase === 'running' &&
    elapsed >= HAPPENING_AT_MS &&
    elapsed < HAPPENING_AT_MS + HAPPENING_MS;
  useEffect(() => {
    if (!happeningDue || happening === null) return undefined;
    setHappeningOn(true);
    const { moment } = HAPPENINGS[happening];
    const line = lineFor(language, moment, `${sessionId}:happening`);
    if (line !== undefined) sayInPassing(line.text, 3200);
    const timer = setTimeout(() => setHappeningOn(false), HAPPENING_MS);
    return () => clearTimeout(timer);
  }, [happeningDue]);

  const composer = useComposer({
    say: store.say,
    onLanded: () => {
      cue('chalk');
      setStraying(false);
      const line = lineFor(language, plain ? 'writtenDown' : 'strayThought', Date.now());
      if (line !== undefined) sayInPassing(line.text, 2200);
    },
    onShortTap: () => sayInPassing(fixedLine(language, 'shortTap'), 1800),
  });

  const live =
    session === null ? null : { id: session.id, taskId: session.taskId, endsAt: session.endsAt };
  const baseLine = timeUp && !heavy ? (lineFor(language, 'timeUp', 'time')?.text ?? null) : null;
  useLivePeriod(
    phase === 'running' || phase === 'time up' ? live : null,
    title,
    passing?.text ?? baseLine ?? '',
  );

  const done = useCallback(() => {
    setTook(clock?.tookMinutes ?? 1);
    clearPassing();
    void store.finish().then((result) => {
      if (result === null) return;
      setPanel('finish');
      if (result.comment !== null) cue('red-pen');
    });
  }, [clock, store, cue]);

  if (crisis) return null;
  const inFinish = finished !== null;
  if (!inFinish && phase !== 'running' && phase !== 'time up' && phase !== 'loading') {
    return <Redirect href="/" />;
  }

  let mood: PhuMood =
    desk?.heavy === true ? 'serious' : heavy || timeUp || looking ? 'calm' : 'grading';
  if (finished !== null) mood = finished.comment === null ? 'serious' : 'clap';
  if (panel === 'partial' || panel === 'note') mood = 'calm';
  if (happeningOn && happening !== null) mood = HAPPENINGS[happening].mood;
  if (passing?.mood) mood = passing.mood;

  const partialLine =
    panel === 'partial'
      ? lineFor(language, 'partialCredit', sessionId ?? 'partial')?.text
      : panel === 'note'
        ? lineFor(language, 'partialNotePrompt', sessionId ?? 'note')?.text
        : undefined;
  const finishLine = inFinish ? fixedLine(language, 'next') : null;
  const line = passing?.text ?? partialLine ?? (inFinish ? finishLine : baseLine);

  return (
    <SessionView
      framing={framing}
      mood={mood}
      pace={mayMove && phase === 'running' && !heavy && !looking && panel === 'working'}
      line={line ?? null}
      title={title}
      chalkboard={chalkboard}
      heavy={desk?.heavy ?? false}
      plain={plain}
      clock={clock}
      panel={inFinish ? 'finish' : panel === 'finish' ? 'working' : panel}
      finish={finished === null ? null : { ...finished, recessOffered: snapshot.recessOffered }}
      carvings={drawnCarvings(snapshot.carvings, name)}
      happening={happeningOn ? happening : null}
      drum={drum}
      stray={
        straying ? (
          <ComposerBar
            state={
              composer.state.mode === 'idle'
                ? { mode: 'typing', draft: '', note: null }
                : composer.state
            }
            onPressIn={composer.press}
            onPressOut={composer.release}
            onType={composer.openTyping}
            onEdit={composer.edit}
            onSubmit={composer.submit}
            onCancel={() => {
              composer.cancel();
              setStraying(false);
            }}
            testID="session-stray-composer"
          />
        ) : null
      }
      note={note}
      onNote={setNote}
      onRaiseHand={() => {
        const line = lineFor(
          language,
          'raiseHand',
          Date.now(),
          { task: title },
          { plain: plain || !(desk?.task.screened ?? false) },
        );
        if (line !== undefined) sayInPassing(line.text, 2600, 'point');
      }}
      onStray={() => {
        composer.openTyping();
        setStraying(true);
      }}
      onDone={done}
      onNotYet={() => setPanel('partial')}
      onAnother={() => {
        setPanel('working');
        if (!heavy) cue('drum');
        void store.partial('another period');
      }}
      onBackOnBoard={() => setPanel('note')}
      onSaveNote={() => {
        void store.partial('back on board', note);
        setNote('');
      }}
      onErase={() => void store.partial('erase')}
      onClosePartial={() => setPanel('working')}
      onNext={() => {
        sayInPassing(fixedLine(language, 'next'), 1600);
        setTook(null);
        setPanel('working');
        void store.next();
      }}
      onRecess={() => {
        setTook(null);
        setPanel('working');
        void store.takeRecess();
      }}
    />
  );
}
