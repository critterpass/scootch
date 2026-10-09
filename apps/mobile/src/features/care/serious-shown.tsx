import { getCalendars } from 'expo-localization';

import {
  dayMomentTimes,
  type Instant,
  type Language,
  type SettingsRow,
  type TaskRow,
} from '@scootch/domain';

import { reminderTime } from '../../state/care-flow';
import type { DayEvent } from '../../state/day-types';
import { lineFor } from '../../state/lines';
import type { OneScreenShown } from '../one-screen/one-screen-view';

import { SeriousPanel } from './serious-panel';
import { SeriousFooter } from './serious-when';

/** The length of a quiet sitting. A serious task is never bargained over. */
export const QUIET_MINUTES = 10;

export interface SeriousShownInput {
  readonly task: TaskRow;
  readonly settings: SettingsRow;
  readonly language: Language;
  readonly reminderAt: Instant | null;
  readonly now: Instant;
  readonly dispatch: (event: DayEvent) => Promise<void>;
  /** The When sheet drawn open, for the screen registry. */
  readonly whenOpened?: boolean;
}

const clock = (at: Instant, language: Language) =>
  new Date(at).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' });

/**
 * What the one screen shows for a serious task: its own plain words and the quiet choices. Every
 * sentence comes from the task's stored lines or the offline pack's plain ones.
 */
export function seriousShown(input: SeriousShownInput): OneScreenShown {
  const { task, settings, language } = input;
  const voice = { language, attitude: settings.attitude };
  const send = (event: DayEvent) => void input.dispatch(event).catch(() => undefined);
  const sit = () =>
    void input
      .dispatch({ type: 'session_set', minutes: QUIET_MINUTES, treat: null })
      .then(() => input.dispatch({ type: 'session', event: { type: 'started' } }))
      .catch(() => undefined);
  const offered = reminderTime(input.now, getCalendars()[0]?.timeZone ?? 'UTC', {
    start: settings.quietHoursStart,
    end: settings.quietHoursEnd,
  });
  return {
    kind: 'panel',
    name: 'serious',
    body: (
      <SeriousPanel
        taskText={task.text}
        said={lineFor('acknowledge', task, voice)}
        tinyStep={lineFor('tinyNextStep', task, voice)}
        reminderTime={offered === null ? null : clock(offered, language)}
        remindedAt={input.reminderAt === null ? null : clock(input.reminderAt, language)}
        onTinyStep={sit}
        onRemind={() => send({ type: 'reminder_asked' })}
        onBeFunny={() => send({ type: 'be_funny_asked' })}
      />
    ),
    footer: (
      <SeriousFooter
        cue={task.startCue ?? null}
        moments={dayMomentTimes(settings)}
        onCue={(cue) => send(cue === null ? { type: 'cue_cleared' } : { type: 'cue_saved', cue })}
        onNotToday={() => send({ type: 'serious_set_aside' })}
        onSit={sit}
        opened={input.whenOpened ?? false}
      />
    ),
  };
}
