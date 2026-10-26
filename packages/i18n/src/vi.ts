import type { Catalogue } from './catalogue-types';
import { viCommon } from './vi-common';
import { viDesk } from './vi-desk';
import { viBoard } from './vi-board';
import { viSession } from './vi-session';
import { viTuition } from './vi-tuition';
import { viTimetable } from './vi-timetable';
import { viReportCard } from './vi-report-card';
import { viShare } from './vi-share';

/** Vietnamese interface strings, one file per area, assembled under the English key set. */
export const vi: Catalogue = {
  ...viCommon,
  ...viDesk,
  ...viBoard,
  ...viSession,
  ...viTuition,
  ...viTimetable,
  ...viReportCard,
  ...viShare,
};
