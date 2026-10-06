import fc from 'fast-check';

import { MINUTE_MS, type Instant } from '../../day';
import { sessionReducer, sessionSet } from '../session-reducer';
import type {
  LiveSession,
  SessionEffect,
  SessionEvent,
  SessionState,
  SessionTone,
} from '../session-types';

export const T0: Instant = Date.UTC(2026, 9, 6, 8, 41);
export const minutes = (count: number) => count * MINUTE_MS;

export function setFor(tone: SessionTone = 'full', length = 10): LiveSession {
  return sessionSet({ taskId: 'task-molar', tone, minutes: length, treat: 'Coffee' });
}

/** One event and how long after the previous one it happens. */
export interface Move {
  readonly event: SessionEvent;
  readonly wait: number;
}

export interface Visit {
  readonly before: SessionState;
  readonly event: SessionEvent;
  readonly now: Instant;
  readonly state: SessionState;
  readonly effects: readonly SessionEffect[];
}

/** Runs moves from a state, returning every step taken. */
export function walk(start: SessionState, moves: readonly Move[], from: Instant = T0): Visit[] {
  const visits: Visit[] = [];
  let state = start;
  let now = from;
  for (const { event, wait } of moves) {
    now += wait;
    const step = sessionReducer(state, event, now);
    visits.push({ before: state, event, now, state: step.state, effects: step.effects });
    state = step.state;
  }
  return visits;
}

export function endOf(start: SessionState, moves: readonly Move[]): SessionState {
  return walk(start, moves).at(-1)?.state ?? start;
}

/** Shorthand: events a fixed wait apart. */
export function each(wait: number, ...types: SessionEvent['type'][]): Move[] {
  return types.map((type) => ({ event: { type } as SessionEvent, wait }));
}

const plain: SessionEvent['type'][] = [
  'too_big',
  'started',
  'clock',
  'backgrounded',
  'foregrounded',
  'killed',
  'relaunched',
  'stuck_tapped',
  'step_smaller',
  'step_accepted',
  'hold_started',
  'hold_released',
  'hold_completed',
  'double_tapped',
  'said_done',
  'finish_tapped',
  'not_finished',
  'chose_carry_on',
  'chose_make_smaller',
  'chose_let_go',
  'left',
];

export const anyEvent: fc.Arbitrary<SessionEvent> = fc.oneof(
  { weight: 6, arbitrary: fc.constantFrom(...plain).map((type) => ({ type }) as SessionEvent) },
  {
    weight: 1,
    arbitrary: fc
      .oneof(fc.integer({ min: -5, max: 500 }), fc.double())
      .map((length): SessionEvent => ({ type: 'bargained', minutes: length })),
  },
  {
    weight: 1,
    arbitrary: fc
      .constantFrom('Bin bags', 'Text Priya about Saturday', '  ')
      .map((text): SessionEvent => ({ type: 'thought_parked', text })),
  },
);

const wait = fc.oneof(fc.constant(0), fc.integer({ min: 0, max: minutes(9) }));
export const anyMoves = fc.array(fc.record({ event: anyEvent, wait }), { maxLength: 40 });
export const anyTone = fc.constantFrom<SessionTone>('full', 'quiet');
export const anyLength = fc.constantFrom(2, 5, 10, 25, 50);

/** Moves that happen to the app, not to the user: backgrounding, kills, relaunches and timers. */
export const lifecycleMoves = fc.array(
  fc.record({
    event: fc
      .constantFrom<SessionEvent['type']>(
        'backgrounded',
        'foregrounded',
        'killed',
        'relaunched',
        'clock',
      )
      .map((type) => ({ type }) as SessionEvent),
    wait,
  }),
  { maxLength: 40 },
);
