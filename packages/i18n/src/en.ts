/**
 * English interface strings, and the source of the key set. Lines Thầy Phú speaks never go here:
 * they come from the AI routes or from `packages/voice/offline/`. Each area keeps its strings in
 * its own file; this assembles them.
 */
import { enCommon } from './en-common';
import { enDesk } from './en-desk';
import { enBoard } from './en-board';
import { enSession } from './en-session';
import { enTuition } from './en-tuition';
import { enTimetable } from './en-timetable';
import { enReportCard } from './en-report-card';
import { enShare } from './en-share';
import { enFirstDay } from './en-first-day';
import { enSettings } from './en-settings';
import { enCare } from './en-care';

export const en = {
  ...enCommon,
  ...enDesk,
  ...enBoard,
  ...enSession,
  ...enTuition,
  ...enTimetable,
  ...enReportCard,
  ...enShare,
  ...enFirstDay,
  ...enSettings,
  ...enCare,
} as const;
