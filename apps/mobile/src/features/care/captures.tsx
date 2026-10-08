import type { TaskRow } from '@scootch/domain';

import { defaultSettings } from '../../data/repositories/settings';
import { useLanguage } from '../../i18n/i18n-provider';
import { OneScreenView } from '../one-screen/one-screen-view';

import { CrisisView } from './crisis-view';
import { helplinesFor } from './helplines';
import { HelplinesPage } from './helplines-page';
import { seriousShown } from './serious-shown';

// The care screens as the screen registry shows them: the real views with fixed state and no
// store behind them. The task is the design's own example, in the capture's language.

const nothing = () => undefined;
const HEAVY_TASK = {
  en: "Call Dr. Okafor's office about the results.",
  vi: 'Gọi phòng khám của bác sĩ Oanh để hỏi kết quả.',
} as const;
/** 9:41 on the capture's day, so the reminder row reads 10:00 as the design does. */
const CAPTURE_NOW = new Date(2026, 9, 6, 9, 41).getTime();

function Crisis({
  region,
  sitting = false,
}: {
  readonly region: string | null;
  readonly sitting?: boolean;
}) {
  return (
    <CrisisView
      helplines={helplinesFor(region)}
      now={CAPTURE_NOW}
      sitting={sitting}
      onCall={nothing}
      onTextLine={nothing}
      onDirectory={nothing}
      onText={nothing}
      onSit={nothing}
      onClose={nothing}
    />
  );
}

export function CareCrisis() {
  return <Crisis region="US" />;
}

export function CareCrisisVietnam() {
  return <Crisis region="VN" />;
}

export function CareCrisisUnknownRegion() {
  return <Crisis region={null} />;
}

export function CareCrisisSitting() {
  return <Crisis region="US" sitting />;
}

export function CareHelplines() {
  return (
    <HelplinesPage
      region="VN"
      now={CAPTURE_NOW}
      onCall={nothing}
      onTextLine={nothing}
      onDirectory={nothing}
      onClose={nothing}
    />
  );
}

export function CareSerious() {
  const { language } = useLanguage();
  const task: TaskRow = {
    id: 'capture-serious',
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
        now: CAPTURE_NOW,
        dispatch: () => Promise.resolve(),
      })}
    />
  );
}
