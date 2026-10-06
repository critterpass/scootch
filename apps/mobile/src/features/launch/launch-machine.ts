import { isoFromInstant, type Attitude, type Instant, type SettingsRow } from '@scootch/domain';

/** The two things first launch asks for, in the order it asks. */
export const FAVOURS = ['notifications', 'microphone'] as const;
export type Favour = (typeof FAVOURS)[number];

export type LaunchStep = 'hello' | 'attitude' | 'permissions' | 'prompting' | 'finished';

export interface LaunchState {
  readonly step: LaunchStep;
  /** Cheeky until the person picks. */
  readonly attitude: Attitude;
  /** The favour being asked for now. */
  readonly asking: Favour;
  /** The favours the person said "Sure" to. Only these ever reach a system prompt. */
  readonly accepted: readonly Favour[];
}

export type LaunchEvent =
  | { readonly type: 'greeted' }
  | { readonly type: 'attitude_chosen'; readonly attitude: Attitude }
  | { readonly type: 'attitude_confirmed' }
  /** "Sure" or "Not now" to the favour being asked for. */
  | { readonly type: 'favour_answered'; readonly accepted: boolean }
  /** The system prompts for the accepted favours have all been answered. */
  | { readonly type: 'prompts_answered' };

export const LAUNCH_START: LaunchState = {
  step: 'hello',
  attitude: 'cheeky',
  asking: 'notifications',
  accepted: [],
};

/** First launch: hello, the one setup choice, two favours, done. No account, no tour. */
export function launchReducer(state: LaunchState, event: LaunchEvent): LaunchState {
  switch (event.type) {
    case 'greeted':
      return state.step === 'hello' ? { ...state, step: 'attitude' } : state;
    case 'attitude_chosen':
      return state.step === 'attitude' ? { ...state, attitude: event.attitude } : state;
    case 'attitude_confirmed':
      return state.step === 'attitude' ? { ...state, step: 'permissions' } : state;
    case 'favour_answered': {
      if (state.step !== 'permissions') return state;
      const accepted = event.accepted ? [...state.accepted, state.asking] : state.accepted;
      const next = FAVOURS[FAVOURS.indexOf(state.asking) + 1];
      if (next !== undefined) return { ...state, accepted, asking: next };
      // Nothing was accepted, so there is no system prompt to wait for.
      return { ...state, accepted, step: accepted.length > 0 ? 'prompting' : 'finished' };
    }
    case 'prompts_answered':
      return state.step === 'prompting' ? { ...state, step: 'finished' } : state;
  }
}

/** The system's own prompts. Each answers whether the person allowed it. */
export interface LaunchPermissions {
  readonly askNotifications: () => Promise<boolean>;
  readonly askMicrophone: () => Promise<boolean>;
}

export type FavourOutcome = 'allowed' | 'refused' | 'skipped';
export type LaunchOutcome = Readonly<Record<Favour, FavourOutcome>>;

/**
 * Shows the system prompt for each accepted favour, one after the other. A favour the person
 * skipped is never asked of the system.
 */
export async function askAccepted(
  accepted: readonly Favour[],
  permissions: LaunchPermissions,
): Promise<LaunchOutcome> {
  const outcome: Record<Favour, FavourOutcome> = {
    notifications: 'skipped',
    microphone: 'skipped',
  };
  for (const favour of FAVOURS) {
    if (!accepted.includes(favour)) continue;
    const ask =
      favour === 'notifications' ? permissions.askNotifications : permissions.askMicrophone;
    const allowed = await ask().catch(() => false);
    outcome[favour] = allowed ? 'allowed' : 'refused';
  }
  return outcome;
}

/** First launch is shown until it has been finished once, and never after. */
export function firstLaunchPending(settings: Pick<SettingsRow, 'firstLaunchDoneAt'>): boolean {
  return settings.firstLaunchDoneAt === null;
}

/** What finishing first launch writes to the settings. */
export function finishedLaunchSettings(
  state: Pick<LaunchState, 'attitude'>,
  now: Instant,
): Pick<SettingsRow, 'attitude' | 'firstLaunchDoneAt'> {
  return { attitude: state.attitude, firstLaunchDoneAt: isoFromInstant(now) };
}
