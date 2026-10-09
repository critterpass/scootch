import type { TaskRow } from '@scootch/domain';

import { defaultSettings } from '../../data/repositories/settings';
import { useLanguage } from '../../i18n/i18n-provider';
import { OneScreenView } from '../one-screen/one-screen-view';

import { seriousShown } from './serious-shown';

// The serious screen with a time heard in its words, as the screen registry shows it: the real
// view with fixed state and no store behind it, on the care board's own example task.

const HEAVY_TASK = {
  en: "Call Dr. Okafor's office about the results before the appointment at 4.",
  vi: 'Gọi phòng khám của bác sĩ Oanh hỏi kết quả trước buổi hẹn lúc 4 giờ.',
} as const;
/** The person's own words for the time, in the capture's language. */
const HEARD = { en: 'appointment at 4', vi: 'buổi hẹn lúc 4 giờ' } as const;
const CAPTURE_NOW = new Date(2026, 9, 6, 9, 41).getTime();

/** "Just this, today" with "Appointment at 4." said back in plain words, "Good" and "Don't watch it". */
export function CareSeriousTimeHeard() {
  const { language } = useLanguage();
  const task: TaskRow = {
    id: 'capture-serious-time-heard',
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
        heardTime: { heardAs: HEARD[language] },
        now: CAPTURE_NOW,
        dispatch: () => Promise.resolve(),
      })}
    />
  );
}
