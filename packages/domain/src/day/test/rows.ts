import fc from 'fast-check';

import type { DayRow, DrawerItemRow, IsoDate, SessionRow, TaskRow } from '../../contracts';
import { addDays } from '../local-time';

export const TODAY: IsoDate = '2026-10-06';

export function taskRow(over: Partial<TaskRow> = {}): TaskRow {
  return {
    id: 'task-a',
    localDate: TODAY,
    text: 'Email the dentist about Thursday',
    originalText: 'Email the dentist about Thursday',
    source: 'ramble',
    screen: 'pass',
    seriousOverridden: false,
    status: 'set',
    carriedOver: false,
    firstMentionedOn: TODAY,
    dueDate: null,
    workMode: null,
    fitsTenMinutes: true,
    sharePrivate: false,
    shrinkCount: 0,
    lines: null,
    notifications: [],
    createdAt: '2026-10-06T09:41:00+01:00',
    finishedAt: null,
    ...over,
  };
}

export function sessionRow(over: Partial<SessionRow> = {}): SessionRow {
  return {
    id: 'session-a',
    taskId: 'task-a',
    localDate: TODAY,
    plannedMinutes: 10,
    treat: 'Coffee',
    startedAt: '2026-10-06T09:45:00+01:00',
    endsAt: '2026-10-06T09:55:00+01:00',
    endedAt: null,
    outcome: null,
    finishMethod: null,
    notFinishedChoice: null,
    tableId: null,
    ...over,
  };
}

export function dayRow(over: Partial<DayRow> = {}): DayRow {
  return {
    localDate: TODAY,
    status: 'open',
    openedAt: '2026-10-06T09:40:00+01:00',
    morningLine: null,
    energy: null,
    ...over,
  };
}

export function drawerItem(over: Partial<DrawerItemRow> = {}): DrawerItemRow {
  return {
    id: 'item-a',
    text: 'Call mum back',
    screen: 'pass',
    dueDate: null,
    firstMentionedOn: TODAY,
    lastMentionedOn: TODAY,
    returnOn: null,
    fadesOn: addDays(TODAY, 14),
    createdAt: '2026-10-06T09:41:00+01:00',
    ...over,
  };
}

/** Ids `prefix-1`, `prefix-2`, and so on. */
export function idMaker(prefix: string): () => string {
  let made = 0;
  return () => `${prefix}-${(made += 1)}`;
}

/** A calendar day up to `span` days either side of `TODAY`. */
export function dayNear(span: number): fc.Arbitrary<IsoDate> {
  return fc.integer({ min: -span, max: span }).map((offset) => addDays(TODAY, offset));
}

export const taskRowArbitrary: fc.Arbitrary<TaskRow> = fc
  .record({
    id: fc.constantFrom('task-a', 'task-b', 'task-c', 'task-d'),
    localDate: dayNear(1),
    screen: fc.constantFrom('unscreened', 'pass', 'serious'),
    seriousOverridden: fc.boolean(),
    status: fc.constantFrom('set', 'started', 'finished'),
    carriedOver: fc.boolean(),
    text: fc.constantFrom('Email the dentist', 'Council tax', 'Open the letter from the clinic'),
  })
  .map((over) => taskRow(over as Partial<TaskRow>));

export const sessionRowArbitrary: fc.Arbitrary<SessionRow> = fc
  .record({
    id: fc.constantFrom('session-a', 'session-b'),
    taskId: fc.constantFrom('task-a', 'task-b', 'task-c', 'task-d'),
    endedAt: fc.constantFrom(null, '2026-10-06T09:55:00+01:00'),
  })
  .map((over) => sessionRow(over));
