import type { TaskRow } from '@scootch/domain';

import { defaultSettings } from '../../data/repositories/settings';
import { useLanguage } from '../../i18n/i18n-provider';
import { OneScreenView } from '../one-screen/one-screen-view';

import { seriousShown } from './serious-shown';

// The serious screen's When, as the screen registry shows it: the real view with fixed state and
// no store behind it, on the care board's own example task.

const HEAVY_TASK = {
  en: "Call Dr. Okafor's office about the results.",
  vi: 'Gọi phòng khám của bác sĩ Oanh để hỏi kết quả.',
} as const;
const CAPTURE_NOW = new Date(2026, 9, 6, 9, 41).getTime();

function SeriousWhen({ kept, opened }: { readonly kept: boolean; readonly opened: boolean }) {
  const { language } = useLanguage();
  const task: TaskRow = {
    id: 'capture-serious-when',
    localDate: '2026-10-06',
    text: HEAVY_TASK[language],
    originalText: HEAVY_TASK[language],
    source: 'ramble',
    screen: 'serious',
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
    ...(kept ? { startCue: { kind: 'moment' as const, moment: 'lunch' as const } } : {}),
    createdAt: '2026-10-06T09:00:00.000Z',
    finishedAt: null,
  };
  return (
    <OneScreenView
      mood="serious"
      attitude="cheeky"
      line={null}
      offline={false}
      shown={seriousShown({
        task,
        settings: defaultSettings(language),
        language,
        reminderAt: null,
        now: CAPTURE_NOW,
        dispatch: () => Promise.resolve(),
        whenOpened: opened,
      })}
    />
  );
}

/** The When sheet opened from the serious screen. */
export function CareSeriousWhenSheet() {
  return <SeriousWhen kept={false} opened />;
}

/** The serious screen with a cue kept: the chip reads it back, in plain words. */
export function CareSeriousWhenKept() {
  return <SeriousWhen kept opened={false} />;
}
