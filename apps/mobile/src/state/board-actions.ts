import {
  answerStillYours as answerFade,
  askedStillYours,
  choose,
  DEFAULT_PERIOD_MINUTES,
  erase as eraseTask,
  isOpen,
  newTask,
  redate as redateTask,
  reword as rewordTask,
  tickOff as tickTask,
  type CareFlag,
  type IsoDate,
  type Task,
} from '@phusclass/domain/board';
import { hearWithModel, type HeardTask } from '@phusclass/domain/hearing';

import type { CareGateResult } from '../api/care-gate';
import { readCarvings } from '../data/carvings-repository';
import { readKv, readKvNumber } from '../data/kv-repository';
import { readOpenSession } from '../data/sessions-repository';
import { readSetting, writeSetting } from '../data/settings-repository';
import { readTasks } from '../data/tasks-repository';

import { KEYS, PERIOD_LENGTHS, type BoardCore } from './board-core';
import type { BoardState } from './board-view';

/** A care gate result as a flag: a held task counts as serious until the server screens it. */
function careOf(result: CareGateResult): CareFlag {
  return result === 'crisis' ? 'crisis' : result === 'hold' ? 'serious' : 'none';
}

/** A stored period length, or ten minutes when it is not one the settings offer. */
function periodLengthOf(stored: number | null): number {
  return PERIOD_LENGTHS.find((minutes) => minutes === stored) ?? DEFAULT_PERIOD_MINUTES;
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** What happens on the board and around the desk: loading, saying, care, the board's tools. */
export function boardActions(core: BoardCore) {
  const { deps } = core;

  /** His birthday, fixed once per install and never shown. */
  async function birthday(): Promise<string> {
    const stored = await readSetting<string>(deps.db, KEYS.birthday);
    if (stored !== null) return stored;
    const month = choose([...Array(12).keys()], deps.newId(), 'birthday month') + 1;
    const day = choose([...Array(MONTH_DAYS[month - 1]).keys()], deps.newId(), 'birthday day') + 1;
    const made = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    await writeSetting(deps.db, KEYS.birthday, made);
    return made;
  }

  /** Erase or tick: off the board, and the desk takes his next pick if it was the desk's. */
  async function offTheBoard(id: string, change: (task: Task) => Task): Promise<void> {
    const one = core.task(id);
    if (one === undefined || !isOpen(one)) return;
    const wasDesk = one.status === 'desk';
    if (wasDesk && core.state.session?.taskId === id) await core.endOpenSession('erase');
    await core.save([change(one)]);
    if (wasDesk) await core.refill(id);
  }

  /** Changes state that is not written anywhere. */
  function set(patch: () => Partial<BoardState>): Promise<void> {
    return core.act(() => {
      core.state = { ...core.state, ...patch() };
      return Promise.resolve();
    });
  }

  async function change(id: string, update: (task: Task) => Task): Promise<void> {
    const one = core.task(id);
    if (one !== undefined) await core.save([update(one)]);
  }

  return {
    /** Reads everything from SQLite, then fills an empty desk. Runs once, after migrations. */
    load: () =>
      core.act(async () => {
        const now = deps.clock();
        const open = await readOpenSession(deps.db);
        const pinned = await readKv(deps.db, KEYS.tuitionPinned);
        core.state = {
          ...core.state,
          ready: true,
          tasks: await readTasks(deps.db, now.at),
          carvings: await readCarvings(deps.db),
          session:
            open === null
              ? null
              : {
                  id: open.id,
                  taskId: open.task_id,
                  startedAt: open.started_at,
                  minutes: open.minutes,
                  happening: open.happening,
                },
          finishes: await readKvNumber(deps.db, KEYS.finishes, 0),
          longBoardRemarkedOn: await readKv(deps.db, KEYS.longBoard),
          tuitionPinnedAt: pinned === null || pinned === '' ? null : Number(pinned),
          crisisShownOn: await readKv(deps.db, KEYS.crisisShown),
          crisisOpenOn: await readKv(deps.db, KEYS.crisisOpen),
          birthday: await birthday(),
          periodLength: periodLengthOf(await readSetting<number>(deps.db, KEYS.periodLength)),
          drum: (await readSetting<boolean>(deps.db, KEYS.drum)) !== false,
        };
        await core.refill();
      }),

    /**
     * Something said or typed: heard on the phone, every task onto the board, and an empty desk
     * takes his pick. Each task is gated for care; a crisis phrase anywhere flags every task said
     * with it and opens the crisis screen for the rest of the day.
     */
    say: async (text: string): Promise<readonly HeardTask[]> => {
      // Heard before the board's queue: the models may take a few seconds, and nothing else on
      // the board waits for them. A crisis phrase is never sent anywhere to be split.
      const heardAt = deps.clock();
      const heard = await hearWithModel(
        text,
        { today: heardAt.day, nowMinutes: heardAt.minuteOfDay, dayFirst: deps.dayFirst ?? true },
        { split: deps.split, online: core.gate(text) === 'crisis' ? undefined : deps.online },
      );
      return core.act(async (): Promise<readonly HeardTask[]> => {
        const now = deps.clock();
        // The care gate reads what was heard, as said, whoever split it.
        const whole = core.gate(text);
        const added = heard.tasks.map((one) =>
          newTask({
            id: deps.newId(),
            text: one.text,
            short: one.short ?? undefined,
            at: now.at,
            dueDate: one.dueDate,
            heardTime: one.heardTime === null ? null : { day: heardAt.day, at: one.heardTime.at },
            care: whole === 'crisis' ? 'crisis' : careOf(core.gate(one.said)),
          }),
        );
        if (whole === 'crisis') {
          core.state = { ...core.state, crisisOpenOn: now.day, crisisShownOn: now.day };
          await core.writeKv(KEYS.crisisOpen, now.day);
          await core.writeKv(KEYS.crisisShown, now.day);
        }
        await core.save(added);
        await core.refill();
        return heard.tasks;
      });
    },

    /** The server's screen answered for a task. */
    screened: (id: string, care: CareFlag) =>
      core.act(() => change(id, (one) => ({ ...one, care, screened: true }))),

    /**
     * The server's screen called a crisis on a task said with a connection: the task is flagged
     * and the crisis screen opens for the rest of the day, as a crisis phrase said offline does.
     */
    raiseCrisis: (id: string) =>
      core.act(async () => {
        const day = deps.clock().day;
        await change(id, (one) => ({ ...one, care: 'crisis', screened: true }));
        core.state = { ...core.state, crisisOpenOn: day, crisisShownOn: day };
        await core.writeKv(KEYS.crisisOpen, day);
        await core.writeKv(KEYS.crisisShown, day);
      }),

    /** The person closed the crisis screen: the board comes back, and nothing is asked. */
    closeCrisis: () =>
      core.act(async () => {
        core.state = { ...core.state, crisisOpenOn: null };
        await core.writeKv(KEYS.crisisOpen, '');
      }),

    erase: (id: string) =>
      core.act(() => offTheBoard(id, (one) => eraseTask(one, deps.clock().at))),
    tickOff: (id: string) => core.act(() => offTheBoard(id, (one) => tickTask(one, deps.clock()))),
    reword: (id: string, text: string) =>
      core.act(() => change(id, (one) => rewordTask(one, text, deps.clock().at))),
    redate: (id: string, dueDate: IsoDate | null) =>
      core.act(() => change(id, (one) => redateTask(one, dueDate, deps.clock().at))),

    /** "Still yours?" was put to the user; it is not put again. */
    stillYoursAsked: (id: string) =>
      core.act(() => change(id, (one) => askedStillYours(one, deps.clock()))),
    answerStillYours: (id: string, answer: 'yes' | 'no') =>
      core.act(() => change(id, (one) => answerFade(one, answer, deps.clock()))),

    /** The long-board remark was made; not again today. */
    longBoardRemarked: () =>
      core.act(async () => {
        const day = deps.clock().day;
        core.state = { ...core.state, longBoardRemarkedOn: day };
        await core.writeKv(KEYS.longBoard, day);
      }),

    /** Ra chơi: offered after a finish, never forced. */
    takeRecess: () => set(() => ({ recess: { startedAt: deps.clock().at }, recessOffered: false })),

    /** "Next.", or the end of recess: his next pick comes to the desk. */
    next: () =>
      core.act(async () => {
        core.state = { ...core.state, recess: null, recessOffered: false, lastFinish: null };
        return core.refill();
      }),

    /** The tuition notice was pinned on the chalkboard; it rests two weeks if left. */
    tuitionPinned: () =>
      core.act(async () => {
        const at = deps.clock().at;
        core.state = { ...core.state, tuitionPinnedAt: at };
        await core.writeKv(KEYS.tuitionPinned, String(at));
      }),

    /** The period length from settings: five, ten, fifteen, twenty-five or forty-five minutes. */
    setPeriodLength: (minutes: number) =>
      core.act(async () => {
        const length = periodLengthOf(minutes);
        core.state = { ...core.state, periodLength: length };
        await writeSetting(deps.db, KEYS.periodLength, length);
      }),

    /** The school drum at the start and end of a period, on or off. */
    setDrum: (on: boolean) =>
      core.act(async () => {
        core.state = { ...core.state, drum: on };
        await writeSetting(deps.db, KEYS.drum, on);
      }),

    setEnrolled: (enrolled: boolean) => set(() => ({ enrolled })),
    setCelsius: (celsius: number | null) => set(() => ({ celsius })),
  };
}
