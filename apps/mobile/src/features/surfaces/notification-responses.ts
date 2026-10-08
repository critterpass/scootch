import { HUNT_ACTIONS } from '../../../modules/scootch-notifications';

/** What a tap on a notification, or on one of the actions under it, asks for. */
export type NotificationAsk =
  | { readonly kind: 'hunt'; readonly taskId: string | null }
  | { readonly kind: 'tomorrow'; readonly taskId: string }
  | { readonly kind: 'turn_down'; readonly taskId: string };

/** The parts of a notification response this reads, as expo-notifications hands them over. */
export interface ResponseLike {
  readonly actionIdentifier: string;
  readonly notification: {
    readonly request: {
      readonly content: { readonly data?: unknown };
      readonly trigger?: unknown;
    };
  };
}

/** The identifier the system gives a plain tap on the notification itself. */
export const DEFAULT_ACTION = 'expo.modules.notifications.actions.DEFAULT';

function taskIdIn(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null;
  const { taskId, body, payload } = value as Record<string, unknown>;
  if (typeof taskId === 'string') return taskId;
  return taskIdIn(body) ?? taskIdIn(payload);
}

/**
 * Reads a response. A tap on a monster's message, and "Hunt the next bite now", both ask for the
 * hunt; the other two actions need the thing they are about. Anything else asks for nothing.
 */
export function askOf(response: ResponseLike): NotificationAsk | null {
  const { request } = response.notification;
  const taskId = taskIdIn(request.content.data) ?? taskIdIn(request.trigger);
  switch (response.actionIdentifier) {
    case HUNT_ACTIONS.hunt:
      return { kind: 'hunt', taskId };
    case DEFAULT_ACTION:
      // Scootch's own notifications are about no thing: the tap just opens the app.
      return taskId === null ? null : { kind: 'hunt', taskId };
    case HUNT_ACTIONS.tomorrow:
      return taskId === null ? null : { kind: 'tomorrow', taskId };
    case HUNT_ACTIONS.turnDown:
      return taskId === null ? null : { kind: 'turn_down', taskId };
    default:
      return null;
  }
}
