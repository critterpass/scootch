/**
 * The session Live Activity as JavaScript sees it. The Swift definition both sides compile is
 * `targets/_shared/SessionActivityAttributes.swift`; these types mirror it field for field.
 */

/** Fixed for the life of the activity. */
export interface SessionActivityAttributes {
  taskTitle: string;
}

/** What an update changes. */
export interface SessionActivityState {
  /** When the session ends, in milliseconds since 1970; the views count down to it. */
  endDate: number;
  /** One line of text shown under the title. */
  line: string;
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
