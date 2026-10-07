import type { StringKey } from '@scootch/i18n';

import type { Translate } from '../../../i18n/i18n-provider';
import type { SessionModel } from '../screens/screen-props';

import { captionLines, type Caption, type CaptionName } from './captions';
import type { CatchStage } from './catch-flow';
import { taskPhrase } from './task-phrase';

type Words = (key: StringKey, params?: Readonly<Record<string, string | number>>) => string;

export interface CatchWordsInput {
  readonly stage: CatchStage;
  readonly status: Caption | null;
  readonly reaction: Caption | null;
  readonly won: CaptionName | null;
  readonly model: SessionModel;
  readonly t: Translate;
}

/** The task as typed, without the full stop it may have been given. */
export function taskAsTyped(task: string): string {
  return task.trim().replace(/[.!?…\s]+$/u, '');
}

/**
 * The two lines a catch shows. While the timer runs the headline is always the task itself, and
 * the trap is the quiet line under it (Scootch's own line for the last two minutes). What the
 * person just did takes both lines for a moment; once the gesture is unlocked they are the catch's
 * instructions; and once it has landed, the catch's own word over Scootch's caught line.
 */
export function catchWords({ stage, status, reaction, won, model, t }: CatchWordsInput): {
  readonly headline: string | null;
  readonly sub: string | null;
} {
  const fill = { task: taskAsTyped(model.taskText), name: model.monster?.name ?? '' };
  const lines = (caption: Caption) =>
    captionLines({ ...caption, params: { ...fill, ...caption.params } }, t as unknown as Words);

  if (stage === 'caught') {
    return {
      headline: won ? lines({ name: won }).headline : null,
      sub:
        model.line?.slot === 'caught'
          ? model.line.text
          : t('session.catch.won.sub', {
              count: Math.max(1, model.plannedMinutes - model.minutesLeft),
            }),
    };
  }
  if (reaction) return lines(reaction);
  if (stage === 'waiting') return lines({ name: 'waiting' });
  if (stage === 'ready' && status) return lines(status);
  const lastMinutes = model.view.kind === 'working' && model.view.twoMinutesLeft;
  return {
    headline: t('session.catch.go', { task: taskPhrase(model.taskText) }),
    sub: lastMinutes && model.line ? model.line.text : status ? lines(status).sub : null,
  };
}
