/**
 * The session Live Activity as JavaScript sees it. The Swift definition both sides compile is
 * `targets/_shared/SessionActivityAttributes.swift`; these types mirror it field for field.
 */

/** Fixed for the life of the activity. */
export interface SessionActivityAttributes {
  taskTitle: string;
  /** The task the session is for, which finds its monster and its words in the shared snapshot. */
  taskId?: string | null;
}

/**
 * The session as the Lock Screen follows it: the fields of `HuntRecord` in `@scootch/domain` and of
 * `targets/_shared/HuntRecord.swift`. Times are milliseconds since 1970.
 */
export interface SessionActivityHunt {
  taskId: string;
  startedAt: number;
  beginsAt: number;
  endsAt: number;
  pausedAt: number | null;
  parkedAt: number | null;
  parkedText: string | null;
  caughtAt: number | null;
  stoppedAt: number | null;
}

/** What an update changes. */
export interface SessionActivityState {
  /** When the session ends, in milliseconds since 1970; the views count down to it. */
  endDate: number;
  /** What Scootch is saying. A state of the hunt that has words of its own shows those. */
  line: string;
  /** Without one the activity shows a plain running session that ends at `endDate`. */
  hunt?: SessionActivityHunt | null;
  /** True while the phone has no connection. */
  offline?: boolean | null;
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
