/**
 * The session Live Activity as JavaScript sees it. The Swift definition both sides compile is
 * `targets/_shared/SessionActivityAttributes.swift`; these types mirror it field for field.
 */

/** Fixed for the life of the activity. */
export interface SessionActivityAttributes {
  taskTitle: string;
  /** The task the session is for, which finds its start time in the shared snapshot. */
  taskId?: string | null;
}

/** `desk`: the task waits, his face carries the pressure and the fuse burns. `session`: a period runs. */
export type SessionActivityMode = 'desk' | 'session';

/** What an update changes. Times are milliseconds since 1970. */
export interface SessionActivityState {
  /** When the period ends; the views count down to it. On the desk, when the day ends. */
  endDate: number;
  /** What Thầy Phú is saying. Empty on the desk. */
  line: string;
  /** True while the phone has no connection. */
  offline?: boolean | null;
  /** Left out, a period. */
  mode?: SessionActivityMode | null;
  /** The pressure step when sent, 0 to 5. */
  pressure?: number | null;
  /** When the pressure rises next, one step at each, soonest first (at most five). */
  pressureAt?: number[] | null;
  /** When the fuse was lit and when it burns out; left out when there is none. */
  fuseStart?: number | null;
  fuseEnd?: number | null;
  /** When the period began, for the bar. */
  startDate?: number | null;
  /** A serious task: quiet company, no fuse, no pressure, no pacing. */
  heavy?: boolean | null;
}

export interface SessionActivityUpdateOptions {
  /** When the system should treat the content as out of date, in milliseconds since 1970. */
  staleDate?: number;
}

export interface SessionActivityStartOptions extends SessionActivityUpdateOptions {
  /** Ask for a push token, so a server can update the activity. Off unless set. */
  pushUpdates?: boolean;
}

export type SessionActivityStatus = 'active' | 'stale' | 'ended' | 'dismissed' | 'unknown';

export interface ActiveSessionActivity {
  id: string;
  attributes: SessionActivityAttributes;
  state: SessionActivityState;
  status: SessionActivityStatus;
}

/** The token a server uses to update one activity, as lowercase hexadecimal. */
export interface PushTokenEvent {
  id: string;
  token: string;
}

/** The token a server uses to start a new activity (iOS 17.2 and later), as lowercase hexadecimal. */
export interface PushToStartTokenEvent {
  token: string;
}

export interface LiveActivitySubscription {
  remove(): void;
}
