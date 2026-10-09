import { getCalendars } from 'expo-localization';

import { defaultSettings } from '../../data/repositories/settings';
import { useLanguage, useT } from '../../i18n/i18n-provider';
import { openingLength } from '../../state/heard-time';
import { lineFor } from '../../state/lines';
import { capturedTask } from '../one-screen/captured-task';
import { minuteOptions } from '../one-screen/one-screen-panels';
import { OneScreenView } from '../one-screen/one-screen-view';
import { stageShown, type StageActions } from '../one-screen/stage-shown';

// A time heard in the words, as the screen registry shows it: the real views drawn with no store
// behind them. What Scootch says back is the offline pack's, in the capture's language.

const nothing = () => undefined;
const NO_ACTIONS: StageActions = {
  answerEnergy: nothing,
  cancel: nothing,
  accept: nothing,
  answerDeadline: nothing,
  pickAgain: nothing,
  takePick: nothing,
  dropPick: nothing,
  tooBig: nothing,
  catchIt: nothing,
  revealDone: nothing,
};
const TODAY = '2026-10-06';
/** 15:32 on the capture's day, where the phone is, as the other set-task captures stand. */
const CAPTURED_AT = new Date(2026, 9, 6, 15, 32).getTime();
/** The person's own words for the time, in the capture's language. */
const HEARD = { en: 'dentist at 5', vi: 'nha sĩ lúc 5 giờ' } as const;

function OneThingWithTime({
  serious = false,
  offline = false,
}: {
  readonly serious?: boolean;
  readonly offline?: boolean;
}) {
  const { language } = useLanguage();
  const t = useT();
  const task = capturedTask(t('launch.chip.reply'), serious ? 'serious' : 'pass');
  const drawn = stageShown(
    {
      kind: 'one_thing',
      task,
      quiet: serious,
      reveal: null,
      deadline: null,
      heardTime: { at: '17:00', heardAs: HEARD[language], watched: true },
    },
    { t, language, attitude: 'cheeky', today: TODAY, revealed: true, actions: NO_ACTIONS },
  );
  return <OneScreenView attitude="cheeky" offline={offline} {...drawn} />;
}

/** "Dentist at 5." said back on the one thing, with "Good" and "Don't watch it". */
export function DumpTimeHeard() {
  return <OneThingWithTime />;
}

/** No connection: the words said back and the plan are the phone's own. */
export function DumpTimeHeardOffline() {
  return <OneThingWithTime offline />;
}

/** A serious thing: the time is said back and the plan is told in plain words. */
export function DumpTimeHeardSerious() {
  return <OneThingWithTime serious />;
}

function TaskSetBeforeATime({ offline = false }: { readonly offline?: boolean }) {
  const { language } = useLanguage();
  const t = useT();
  const words = t('launch.chip.reply');
  const task = capturedTask(words, offline ? 'unscreened' : 'pass');
  const said = lineFor('hatch', task, { language, attitude: 'cheeky' });
  const options = minuteOptions(null);
  const opening = openingLength(
    {
      heardTime: { at: '17:00', heardAs: HEARD[language], watched: true },
      settings: defaultSettings(language),
      localDate: TODAY,
      timeZone: getCalendars()[0]?.timeZone ?? 'UTC',
      now: CAPTURED_AT,
    },
    { usual: 10, smallest: null, lengths: options },
  );
  return (
    <OneScreenView
      mood={said === null ? 'serious' : 'waiting'}
      attitude="cheeky"
      line={said}
      offline={offline}
      shown={{
        kind: 'task_set',
        taskText: said === null ? words : null,
        treat: '',
        minutes: opening.minutes,
        options,
        beforeGetReady: opening.beforeGetReady,
        endsFrom: CAPTURED_AT,
        helpers: { guess: { minutes: null, onGuess: nothing }, bites: null },
        onTreat: nothing,
        onMinutes: nothing,
        onStart: nothing,
        onDiscard: nothing,
      }}
    />
  );
}

/** A watched time at 17:00: the wheel opens at the longest length that ends before getting ready. */
export function OneScreenTaskSetBeforeATime() {
  return <TaskSetBeforeATime />;
}

/** No connection: the capped length and its line are worked out on the phone. */
export function OneScreenTaskSetBeforeATimeOffline() {
  return <TaskSetBeforeATime offline />;
}
