import type {
  MonsterRow,
  SeriousLinePack,
  SessionLinePack,
  SessionRow,
  TaskRow,
} from '@scootch/domain';

import { specFromSeed } from '@scootch/art';

export const JOKES: SessionLinePack = {
  hatch: 'That dentist email has grandchildren now.',
  start: 'Molar is sweating.',
  working: ['Molar is sweating. Keep going.', 'Molar has gone quiet.', 'Molar is packing a bag.'],
  pickedUp: "Molar SAW that. Put me down and he'll forget.",
  checkIn: 'Still with the dentist?',
  tinyNextStep: 'Type only the greeting.',
  twoMinutesLeft: 'Two minutes. Molar is writing a will.',
  timeUp: 'Time. Molar faints.',
  caught: 'Got him.',
  notFinished: 'Not finished is fine.',
};

export const PLAIN: SeriousLinePack = {
  acknowledge: 'That is a heavy one. I am here.',
  working: ['Still here with you.'],
  tinyNextStep: 'Open the letter. Only that.',
  done: 'That is done.',
  notFinished: 'That is enough for today.',
};

export function taskRow(changes: Partial<TaskRow> = {}): TaskRow {
  return {
    id: 'task-1',
    localDate: '2026-10-06',
    text: 'Email the dentist',
    originalText: 'Email the dentist',
    source: 'typed',
    screen: 'pass',
    seriousOverridden: false,
    status: 'set',
    carriedOver: false,
    firstMentionedOn: '2026-10-06',
    dueDate: null,
    workMode: null,
    fitsTenMinutes: true,
    sharePrivate: false,
    shrinkCount: 0,
    lines: JOKES,
    notifications: [
      { text: 'The dentist email is still here.' },
      { text: 'Molar asked if you are alive.' },
      { text: 'Molar has started a podcast.' },
    ],
    createdAt: '2026-10-06T09:00:00.000Z',
    finishedAt: null,
    ...changes,
  };
}

export const seriousTask = (changes: Partial<TaskRow> = {}) =>
  taskRow({ text: 'Open the hospital letter', screen: 'serious', lines: PLAIN, ...changes });

export function sessionRow(changes: Partial<SessionRow> = {}): SessionRow {
  return {
    id: 'session-1',
    taskId: 'task-1',
    localDate: '2026-10-06',
    plannedMinutes: 10,
    treat: null,
    startedAt: '2026-10-06T13:40:00.000Z',
    endsAt: '2026-10-06T13:50:00.000Z',
    endedAt: null,
    outcome: null,
    finishMethod: null,
    notFinishedChoice: null,
    tableId: null,
    ...changes,
  };
}

export function monsterRow(changes: Partial<MonsterRow> = {}): MonsterRow {
  return {
    id: 'monster-1',
    taskId: 'task-1',
    origin: 'task',
    spec: specFromSeed('tooth', 'molar'),
    name: 'Molar',
    title: 'Inbox dweller',
    flavourText: 'Lives behind the unread badge.',
    hatchedAt: '2026-10-06T09:00:10.000Z',
    caughtAt: null,
    caughtOn: null,
    number: null,
    rarity: null,
    daysLurked: null,
    catchMinutes: null,
    dread: null,
    finish: 'standard',
    ...changes,
  };
}
