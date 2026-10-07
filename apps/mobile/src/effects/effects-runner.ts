import type { Instant, SessionEffect } from '@scootch/domain';
import { CUES } from '@scootch/sound';

import type {
  Clock,
  CuePlayer,
  EffectSwitches,
  HapticsPlayer,
  LiveActivityPort,
  NotificationScheduler,
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
}

export interface PlannedText {
  readonly at: Instant;
  readonly text: string;
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

  // Device calls run one after another, and a failing one never stops the session.
  const enqueue = (call: () => Promise<void>) => {
    queue = queue.then(call).catch(() => undefined);
    return queue;
  };

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
    if (switches.haptics && felt.length > 0) options.haptics.play(felt);
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
        const { title, liveLine } = context;
        liveEndsAt = until;
        void enqueue(() => options.liveActivity.start({ title, endsAt: until, line: liveLine }));
        return;
      }
      case 'end_live_activity':
        liveEndsAt = null;
        void enqueue(() => options.liveActivity.end());
        return;
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
      return enqueue(async () => {
        const { notifications } = options;
        for (const id of await notifications.scheduledIds()) {
          if (id.startsWith(NOTIFICATION_PREFIX)) await notifications.cancel(id);
        }
        const now = options.clock.now();
        for (const [index, one] of planned.entries()) {
          if (one.at <= now) continue;
          await notifications.schedule({ id: `${NOTIFICATION_PREFIX}${index}`, ...one });
        }
      });
    },
    settled: () => queue,
  };
}
