import type { Instant, ParkedThought } from '@scootch/domain';
import type { HapticTap } from '@scootch/sound';

import type {
  Clock,
  CuePlayer,
  EffectSwitches,
  HapticsPlayer,
  LiveActivityPort,
  LocalNotification,
  NotificationScheduler,
  ScreenSink,
  Timers,
} from '../adapters';
import { createEffectsRunner } from '../effects-runner';

/** A clock and timers moved by hand: `advanceTo` fires what came due on the way, in order. */
export function fakeTime(start: Instant) {
  let now = start;
  const pending: { at: Instant; fire: () => void }[] = [];
  const clock: Clock = { now: () => now };
  const timers: Timers = {
    set(delayMs, fire) {
      const timer = { at: now + delayMs, fire };
      pending.push(timer);
      return () => {
        const index = pending.indexOf(timer);
        if (index >= 0) pending.splice(index, 1);
      };
    },
  };
  return {
    clock,
    timers,
    /** The instants timers are waiting for, soonest first. */
    armed: () => pending.map((timer) => timer.at).sort((a, b) => a - b),
    /** Moves the clock without firing anything, as time passes while the app is not running. */
    jumpTo(instant: Instant) {
      now = instant;
    },
    advanceTo(instant: Instant) {
      for (;;) {
        const next = pending.filter((timer) => timer.at <= instant).sort((a, b) => a.at - b.at)[0];
        if (!next) break;
        pending.splice(pending.indexOf(next), 1);
        now = Math.max(now, next.at);
        next.fire();
      }
      now = instant;
    },
  };
}

/** Every native adapter as a recorder, so a test reads what the phone would have done. */
export function fakeDevice() {
  const calls = {
    cues: [] as string[],
    stopped: [] as string[],
    haptics: [] as (readonly HapticTap[])[],
    hapticsStopped: [] as string[],
    live: [] as string[],
    lines: [] as string[],
    bursts: [] as string[],
    treats: [] as string[],
    thoughts: [] as (readonly ParkedThought[])[],
    scheduleCalls: 0,
  };
  const scheduled = new Map<string, LocalNotification>();
  const cues: CuePlayer = {
    play: (cue) => void calls.cues.push(cue),
    stop: (cue) => void calls.stopped.push(cue),
  };
  const haptics: HapticsPlayer = {
    play: (taps) => void calls.haptics.push(taps),
    stop: (name) => void calls.hapticsStopped.push(name),
  };
  const notifications: NotificationScheduler = {
    scheduledIds: () => Promise.resolve([...scheduled.keys()]),
    schedule: (notification) => {
      calls.scheduleCalls += 1;
      scheduled.set(notification.id, notification);
      return Promise.resolve();
    },
    cancel: (id) => {
      scheduled.delete(id);
      return Promise.resolve();
    },
  };
  const liveActivity: LiveActivityPort = {
    start: ({ title, endsAt, line }) => {
      calls.live.push(`start ${title} until ${endsAt}: ${line}`);
      return Promise.resolve();
    },
    update: ({ line }) => {
      calls.live.push(`update: ${line}`);
      return Promise.resolve();
    },
    overtime: () => {
      calls.live.push('overtime');
      return Promise.resolve();
    },
    end: (caught) => {
      calls.live.push(caught ? 'end caught' : 'end');
      return Promise.resolve();
    },
  };
  const screen: ScreenSink = {
    showLine: (slot, text) => void calls.lines.push(`${slot}: ${text}`),
    showBurst: (burst) => void calls.bursts.push(burst),
    handOverTreat: (treat) => void calls.treats.push(treat),
    showParkedThoughts: (thoughts) => void calls.thoughts.push(thoughts),
  };
  return {
    calls,
    cues,
    haptics,
    notifications,
    liveActivity,
    screen,
    /** What is waiting to be delivered, soonest first. */
    scheduled: () => [...scheduled.values()].sort((a, b) => a.at - b.at),
  };
}

export const ALL_ON: EffectSwitches = { effects: true, haptics: true, reducedMotion: false };

/** A runner on fakes. `clockEvents` counts how often a timer asked for a clock event. */
export function fakeRunner(start: Instant, switches: () => EffectSwitches = () => ALL_ON) {
  const time = fakeTime(start);
  const device = fakeDevice();
  const fired = { clockEvents: 0 };
  const runner = createEffectsRunner({
    clock: time.clock,
    timers: time.timers,
    cues: device.cues,
    haptics: device.haptics,
    notifications: device.notifications,
    liveActivity: device.liveActivity,
    screen: device.screen,
    switches,
    onClock: () => {
      fired.clockEvents += 1;
    },
  });
  return { time, device, runner, fired };
}
