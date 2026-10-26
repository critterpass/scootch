import type { Instant, SessionEffect } from '@phusclass/domain';
import { CUES } from '@phusclass/sound';

import type {
  Clock,
  CuePlayer,
  EffectSwitches,
  HapticsPlayer,
  LiveActivityPort,
  NotificationScheduler,
  NotificationSender,
  ScreenSink,
  SessionContext,
  Timers,
} from './adapters';

export interface EffectsRunnerOptions {
  readonly clock: Clock;
  readonly timers: Timers;
  readonly cues: CuePlayer;
  readonly haptics: HapticsPlayer;
  readonly notifications: NotificationScheduler;
  readonly liveActivity: LiveActivityPort;
  readonly screen: ScreenSink;
  readonly switches: () => EffectSwitches;
  /** Called when a session timer comes due. The store answers by dispatching a clock event. */
  readonly onClock: () => void;
  /** Draws today's receipt to a file and answers with its address; `null` when it cannot. */
  readonly receiptPicture?: () => Promise<string | null>;
}

export interface PlannedText {
  readonly at: Instant;
  readonly text: string;
  /** Who sends it; left out, it is the app's own. */
  readonly from?: NotificationSender | undefined;
  readonly taskId?: string | undefined;
  readonly actions?: boolean | undefined;
  /** True for the evening receipt, which is drawn when it is scheduled and sent as a picture. */
  readonly receipt?: boolean | undefined;
}

export interface EffectsRunner {
  /** Performs the device effects of one reducer step. Storage effects are the store's job. */
  run(effects: readonly SessionEffect[], context: SessionContext): void;
  /** Re-arms the session timers from their instants, after the app was in the background. */
  resync(): void;
  /** Makes the scheduled local notifications match the day's plan, replacing an older plan. */
  syncNotifications(planned: readonly PlannedText[]): Promise<void>;
  /** Resolves once every queued device call has been made. */
  settled(): Promise<void>;
}

type TimerName = 'end' | 'warning' | 'checkIn';
const NOTIFICATION_PREFIX = 'day-plan-';
/** How long a device call may take before what is queued behind it goes ahead without it. */
export const DEVICE_CALL_LIMIT_MS = 5000;

/**
 * Turns the session reducer's effect values into real timers, sound, haptics, Live Activity calls
 * and screen state. Timers are armed from instants, never from a count, so arming them again after
 * a background stay or a relaunch lands on the same moments.
 */
export function createEffectsRunner(options: EffectsRunnerOptions): EffectsRunner {
  const due = new Map<TimerName, Instant>();
  const cancels = new Map<TimerName, () => void>();
  let liveEndsAt: Instant | null = null;
  let queue: Promise<void> = Promise.resolve();
  let lastPlan: string | null = null;

  // Device calls run one after another, and a failing one never stops the session. One that never
  // answers (the phone's notification service stuck) is given up on, or the day would never open.
  const enqueue = (call: () => Promise<void>, failed?: () => void) => {
    queue = queue.then(() => withinLimit(call)).catch(() => failed?.());
    return queue;
  };

  function withinLimit(call: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      const cancel = options.timers.set(DEVICE_CALL_LIMIT_MS, () =>
        reject(new Error('The device call did not answer')),
      );
      Promise.resolve().then(call).then(resolve, reject).finally(cancel);
    });
  }

  function disarm(name: TimerName) {
    cancels.get(name)?.();
    cancels.delete(name);
  }

  function arm(name: TimerName, at: Instant) {
    disarm(name);
    due.set(name, at);
    const cancel = options.timers.set(Math.max(0, at - options.clock.now()), () => {
      cancels.delete(name);
      due.delete(name);
      options.onClock();
    });
    cancels.set(name, cancel);
  }

  function cancelTimers() {
    for (const name of [...cancels.keys()]) disarm(name);
    due.clear();
  }

  // A cue is felt as well as heard, whichever switch is off. With motion reduced, a pattern is
  // felt as its first tap only.
  function feel(cue: string) {
    const switches = options.switches();
    const taps = CUES[cue]?.haptics ?? [];
    const felt = switches.reducedMotion ? taps.slice(0, 1) : taps;
    if (switches.haptics && felt.length > 0) options.haptics.play(felt, cue);
  }

  function perform(effect: SessionEffect, context: SessionContext, feltApart: ReadonlySet<string>) {
    const switches = options.switches();
    switch (effect.kind) {
      case 'start_timer':
        liveEndsAt = effect.until;
        return arm('end', effect.until);
      case 'schedule_warning':
        return arm('warning', effect.at);
      case 'schedule_check_in':
        return arm('checkIn', effect.at);
      case 'cancel_timer':
        return cancelTimers();
      case 'play_cue':
        if (switches.effects) options.cues.play(effect.cue);
        // A cue asked for without its haptic (a shrink, a parked thought) is still felt.
        if (!feltApart.has(effect.cue)) feel(effect.cue);
        return;
      case 'stop_cue':
        // The sound and the taps stop together: nothing goes on in the hand after letting go.
        options.haptics.stop(effect.cue);
        return options.cues.stop(effect.cue);
      case 'haptic':
        return feel(effect.pattern);
      case 'show_line': {
        const text = context.lineFor(effect.line);
        if (text === null) return;
        options.screen.showLine(effect.line, text);
        const endsAt = liveEndsAt;
        if (endsAt !== null && options.clock.now() < endsAt) {
          void enqueue(() => options.liveActivity.update({ endsAt, line: text }));
        }
        return;
      }
      case 'show_burst':
        return options.screen.showBurst(effect.burst);
      case 'hand_over_treat':
        return options.screen.handOverTreat(effect.treat);
      case 'show_parked_thoughts':
        return options.screen.showParkedThoughts(effect.thoughts);
      case 'start_live_activity': {
        const { until } = effect;
        const { title, taskId, liveLine } = context;
        liveEndsAt = until;
        void enqueue(() =>
          options.liveActivity.start({ title, taskId, endsAt: until, line: liveLine }),
        );
        return;
      }
      case 'overtime_live_activity':
        void enqueue(() => options.liveActivity.overtime());
        return;
      case 'end_live_activity': {
        const caught = effect.caught === true;
        liveEndsAt = null;
        void enqueue(() => options.liveActivity.end(caught));
        return;
      }
      // Storage effects: the store writes these through the repositories.
      case 'grant_start_reward':
      case 'grant_finish_reward':
      case 'save_parked_thought':
      case 'record_session_end':
      case 'shrink_task':
      case 'carry_task_to_tomorrow':
      case 'forget_task':
        return;
    }
  }

  return {
    run(effects, context) {
      const feltApart = new Set(
        effects.flatMap((effect) => (effect.kind === 'haptic' ? [effect.pattern] : [])),
      );
      for (const effect of effects) perform(effect, context, feltApart);
    },
    resync() {
      for (const [name, at] of [...due]) arm(name, at);
    },
    syncNotifications(planned) {
      const plan = JSON.stringify(planned);
      if (plan === lastPlan) return queue;
      lastPlan = plan;
      // A plan that did not go through is tried again with the next one, even if it is the same.
      const forget = () => {
        if (lastPlan === plan) lastPlan = null;
      };
      return enqueue(async () => {
        const { notifications } = options;
        for (const id of await notifications.scheduledIds()) {
          if (id.startsWith(NOTIFICATION_PREFIX)) await notifications.cancel(id);
        }
        const now = options.clock.now();
        for (const [index, one] of planned.entries()) {
          if (one.at <= now) continue;
          const { receipt, ...rest } = one;
          // The receipt is drawn now, as the day stands; without a picture its words still go.
          const picture = receipt
            ? await (options.receiptPicture?.() ?? Promise.resolve(null)).catch(() => null)
            : null;
          await notifications.schedule({
            id: `${NOTIFICATION_PREFIX}${index}`,
            ...rest,
            ...(picture === null ? {} : { picture }),
          });
        }
      }, forget);
    },
    settled: () => queue,
  };
}
