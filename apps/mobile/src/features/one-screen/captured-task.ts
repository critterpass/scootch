import type { TaskRow } from '@scootch/domain';

/** A task as the phone stores it before any answer has come: its own words and nothing else. */
export function capturedTask(text: string, screen: TaskRow['screen']): TaskRow {
  return {
    id: 'capture-task',
    localDate: '2026-10-06',
    text,
    originalText: text,
    source: 'typed',
    screen,
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
}
