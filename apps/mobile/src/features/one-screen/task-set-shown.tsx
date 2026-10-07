import { startRefused, type Attitude } from '@scootch/domain';
import type { Language } from '@scootch/i18n';

import type { ScootchProps } from '../../art/Scootch';
import type { Translate } from '../../i18n/i18n-provider';
import type { useToday } from '../../state/day-store-provider';
import type { DayEvent } from '../../state/day-types';
import { lineFor } from '../../state/lines';
import { QuietLink, Stack } from '../dump/dump-panels';
import { HatchFigure } from '../monster/hatch-figure';
import { wordsWhileUnscreened, type Connection } from '../offline/waiting-words';
import { TogetherLinks } from '../table/together-links';

import { NotNow } from './not-now';
import { minuteOptions } from './one-screen-panels';
import type { Stage } from './one-screen-stage';
import type { OneScreenShown } from './one-screen-view';

type Mood = ScootchProps['mood'];

export interface TaskSetEnv {
  readonly day: ReturnType<typeof useToday>;
  readonly t: Translate;
  readonly voice: { readonly language: Language; readonly attitude: Attitude };
  readonly connection: Connection;
  /** The length the person picked; `null` while the default stands. */
  readonly chosenMinutes: number | null;
  readonly treat: string;
  readonly onTreat: (treat: string) => void;
  readonly onMinutes: (minutes: number) => void;
  readonly dispatch: (event: DayEvent) => Promise<void>;
}

export interface TaskSetDrawn {
  readonly mood: Mood;
  readonly line: string | null;
  readonly shown: OneScreenShown;
}

/** The task set, with its treat, its length and Start, as the one screen draws it. */
export function taskSetShown(
  stage: Extract<Stage, { kind: 'task_set' }>,
  env: TaskSetEnv,
): TaskSetDrawn {
  const { day, t, voice, connection, treat, dispatch } = env;
  const { carried, monster } = stage;
  const send = (event: DayEvent) => void dispatch(event).catch(() => undefined);
  const own = lineFor('hatch', stage.task, voice);
  const said = own ?? wordsWhileUnscreened(stage.task, 'set', connection, voice);
  const smallest = day.morning.kind === 'smallest_ask' ? day.morning.minutes : null;
  const minutes = env.chosenMinutes ?? smallest ?? 10;
  const start = async () => {
    await dispatch({ type: 'session_set', minutes, treat: treat.trim() || null });
    await dispatch({ type: 'session', event: { type: 'started' } });
  };
  const mood: Mood = said === null ? 'serious' : 'waiting';
  const off = startRefused(day.today);
  return {
    mood,
    line: said,
    shown: {
      kind: 'task_set',
      label: off ? t('taskSet.noStart') : carried ? t('morning.fromYesterday') : null,
      taskText: own === null || carried ? stage.task.text : null,
      treat,
      minutes,
      options: minuteOptions(smallest),
      onTreat: env.onTreat,
      onMinutes: env.onMinutes,
      // Start that would be refused is drawn off, with the reason, instead of doing nothing.
      onStart: off ? null : () => void start().catch(() => undefined),
      ...(carried ? { startLabel: t('morning.start', { minutes }) } : {}),
      ...(monster
        ? {
            figure: (
              <HatchFigure
                mood={mood}
                attitude={voice.attitude}
                monster={monster.row}
                sizeFactor={monster.sizeFactor}
              />
            ),
          }
        : {}),
      extra: (
        <Stack>
          {carried ? (
            <QuietLink
              label={t('morning.somethingElse')}
              hint={t('morning.somethingElse.hint')}
              onPress={() => send({ type: 'carried_task_set_aside' })}
              testID="something-else"
            />
          ) : null}
          {stage.task.status === 'started' ? (
            // Started and left: it cannot be bargained over or swapped, but it can be set down.
            <QuietLink
              label={t('taskSet.park')}
              hint={t('taskSet.park.hint')}
              onPress={() => send({ type: 'started_task_parked' })}
              testID="park-started"
            />
          ) : (
            <NotNow onExcuse={(text) => send({ type: 'excuse_given', text })} />
          )}
          <QuietLink
            label={t('taskSet.rest')}
            hint={t('taskSet.rest.hint')}
            onPress={() => send({ type: 'done_for_today' })}
            testID="rest-today"
          />
          <TogetherLinks day={day} task={stage.task} monster={day.monster} />
        </Stack>
      ),
    },
  };
}
