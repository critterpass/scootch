import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

import { CUES, encodeWav, type HapticTap } from '@phusclass/sound';

import * as LiveActivity from '../../modules/phusclass-live-activity';
import * as SenderNotifications from '../../modules/phusclass-notifications';
import { getNetworkStateAsync } from '../features/offline/connection';

import { nextLiveLineTurn } from './live-line-turns';
import { createTapScheduler } from './tap-scheduler';
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

/** Cues the Motion board gives a rigid tap on every stroke: the drum, at Start and at time. */
const RIGID_CUES: ReadonlySet<string> = new Set(['drum']);
/** Taps that belong to a rigid cue; a cue's taps are its own objects, so a tap knows its cue. */
const rigidTaps = new WeakSet<HapticTap>();

function impactFor(tap: HapticTap): Haptics.ImpactFeedbackStyle {
  if (rigidTaps.has(tap)) return Haptics.ImpactFeedbackStyle.Rigid;
  if (tap.intensity < 0.45) return Haptics.ImpactFeedbackStyle.Light;
  if (tap.intensity < 0.75) return Haptics.ImpactFeedbackStyle.Medium;
  return Haptics.ImpactFeedbackStyle.Heavy;
}

const tapScheduler = createTapScheduler(systemTimers, (tap) => {
  void Haptics.impactAsync(impactFor(tap)).catch(() => undefined);
});

/** Plays a cue's taps at their own times, in step with its sound, until the cue is stopped. */
export const nativeHaptics: HapticsPlayer = {
  play(taps, name = '') {
    if (RIGID_CUES.has(name)) for (const tap of taps) rigidTaps.add(tap);
    tapScheduler.play(taps, name);
  },
  stop: (name) => tapScheduler.stop(name),
};

export const nativeNotifications: NotificationScheduler = {
  scheduledIds: async () =>
    (await Notifications.getAllScheduledNotificationsAsync()).map((request) => request.identifier),
  schedule: async ({ id, at, text, from, taskId, picture }) => {
    // One with a sender or a picture is the native module's to send: only it can give a
    // notification a sender. A build without the module sends the same words with the sender's
    // name as the title.
    if ((from || picture) && SenderNotifications.isAvailable()) {
      await SenderNotifications.schedule({
        id,
        at,
        title: null,
        body: text,
        senderName: from?.name ?? null,
        senderImage: from?.image ?? null,
        taskId: taskId ?? null,
        attachment: picture ?? null,
      });
      return;
    }
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        body: text,
        ...(from ? { title: from.name } : {}),
        ...(taskId ? { data: { taskId } } : {}),
      },
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

/** Takes everything off the Lock Screen, so a new session never stands beside an old one. */
async function clearAll(): Promise<void> {
  for (const activity of await LiveActivity.listActive()) {
    if (activity.status !== 'dismissed') await LiveActivity.end(activity.id, undefined, 0);
  }
}

async function isOffline(): Promise<boolean> {
  try {
    const network = await getNetworkStateAsync();
    return !(network.isInternetReachable ?? network.isConnected ?? true);
  } catch {
    return false;
  }
}

/**
 * The session's Live Activity through the local module. The module answers "nothing there" on
 * Android and where Live Activities are switched off, so every call is then a no-op. The activity
 * is found by asking iOS which ones are live, so it is still reachable after a relaunch. It goes
 * stale at the next line turn, so the system draws it again with the line of that moment.
 */
export const nativeLiveActivity: LiveActivityPort = {
  start: async ({ title, taskId, endsAt, line }) => {
    await clearAll();
    await LiveActivity.start(
      { taskTitle: title, taskId: taskId ?? null },
      { endDate: endsAt, line, offline: await isOffline() },
      { staleDate: nextLiveLineTurn(Date.now(), endsAt) },
    );
  },
  update: async ({ endsAt, line }) => {
    const offline = await isOffline();
    for (const id of await liveIds()) {
      await LiveActivity.update(
        id,
        { endDate: endsAt, line, offline },
        { staleDate: nextLiveLineTurn(Date.now(), endsAt) },
      );
    }
  },
  // Past its end the activity has nothing true left to count, so it goes.
  overtime: endAll,
  end: () => endAll(),
};
