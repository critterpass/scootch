import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

import { CUES, encodeWav, type HapticTap } from '@scootch/sound';

import * as LiveActivity from '../../modules/scootch-live-activity';

import type {
  Clock,
  CuePlayer,
  HapticsPlayer,
  LiveActivityPort,
  NotificationScheduler,
  Timers,
} from './adapters';

// The real device behind each adapter. Nothing here is covered by the unit tests, which use fakes:
// it runs only in a native build.

export const systemClock: Clock = { now: () => Date.now() };

export const systemTimers: Timers = {
  set(delayMs, fire) {
    const id = setTimeout(fire, delayMs);
    return () => clearTimeout(id);
  },
};

// A cue's sound is the same for one bundle, so its file is named after the bundle's commit.
const BUNDLE = process.env['EXPO_PUBLIC_JS_COMMIT'] ?? 'local';

/**
 * Plays cues through expo-audio. A cue is rendered to PCM once, written to the cache folder as a
 * WAV file and kept loaded in its own player.
 */
export function nativeCuePlayer(): CuePlayer & { warm(): void } {
  const players = new Map<string, AudioPlayer>();

  function playerFor(name: string): AudioPlayer | null {
    const loaded = players.get(name);
    if (loaded) return loaded;
    const cue = CUES[name];
    if (!cue) return null;
    const file = new File(Paths.cache, `cue-${name}-${BUNDLE}.wav`);
    if (!file.exists) {
      file.create();
      file.writeSync(encodeWav(cue.render()));
    }
    const player = createAudioPlayer(file.uri);
    players.set(name, player);
    return player;
  }

  return {
    play(name) {
      try {
        const player = playerFor(name);
        if (!player) return;
        void player.seekTo(0).catch(() => undefined);
        player.play();
      } catch {
        // A cue that cannot play is silence, never a broken session.
      }
    },
    stop(name) {
      try {
        players.get(name)?.pause();
      } catch {
        // Nothing was playing.
      }
    },
    /** Renders every cue ahead of its first use, one per turn of the event loop. */
    warm() {
      const names = Object.keys(CUES);
      const next = () => {
        const name = names.shift();
        if (name === undefined) return;
        try {
          playerFor(name);
        } catch {
          // It is rendered again when it is first played.
        }
        setTimeout(next, 0);
      };
      setTimeout(next, 0);
    },
  };
}

function impactFor(tap: HapticTap): Haptics.ImpactFeedbackStyle {
  if (tap.intensity < 0.45) return Haptics.ImpactFeedbackStyle.Light;
  if (tap.intensity < 0.75) return Haptics.ImpactFeedbackStyle.Medium;
  return Haptics.ImpactFeedbackStyle.Heavy;
}

/** Plays a cue's taps at their own times, in step with its sound. */
export const nativeHaptics: HapticsPlayer = {
  play(taps) {
    for (const tap of taps) {
      setTimeout(() => {
        void Haptics.impactAsync(impactFor(tap)).catch(() => undefined);
      }, tap.atMs);
    }
  },
};

export const nativeNotifications: NotificationScheduler = {
  scheduledIds: async () =>
    (await Notifications.getAllScheduledNotificationsAsync()).map((request) => request.identifier),
  schedule: async ({ id, at, text }) => {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { body: text },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
  },
  cancel: (id) => Notifications.cancelScheduledNotificationAsync(id),
};

async function liveIds(): Promise<string[]> {
  const activities = await LiveActivity.listActive();
  return activities
    .filter((activity) => activity.status === 'active' || activity.status === 'stale')
    .map((activity) => activity.id);
}

async function endAll(): Promise<void> {
  for (const id of await liveIds()) await LiveActivity.end(id, undefined, 0);
}

/**
 * The session's Live Activity through the local module. The module answers "nothing there" on
 * Android and where Live Activities are switched off, so every call is then a no-op. The activity
 * is found by asking iOS which ones are live, so it is still reachable after a relaunch.
 */
export const nativeLiveActivity: LiveActivityPort = {
  start: async ({ title, endsAt, line }) => {
    await endAll();
    await LiveActivity.start(
      { taskTitle: title },
      { endDate: endsAt, line },
      { staleDate: endsAt },
    );
  },
  update: async ({ endsAt, line }) => {
    for (const id of await liveIds()) await LiveActivity.update(id, { endDate: endsAt, line });
  },
  end: endAll,
};
