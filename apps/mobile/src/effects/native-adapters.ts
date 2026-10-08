import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { getNetworkStateAsync } from 'expo-network';
import * as Notifications from 'expo-notifications';

import {
  HOUR_MS,
  HUNT_CAUGHT_CARD_MS,
  catchHunt,
  huntOfSession,
  nextHuntChange,
  resumeHunt,
  type HuntRecord,
} from '@scootch/domain';
import { CUES, encodeWav, type HapticTap } from '@scootch/sound';

import * as LiveActivity from '../../modules/scootch-live-activity';
import * as MonsterNotifications from '../../modules/scootch-notifications';
import { nativeSharedStore } from '../features/surfaces/native-surface-ports';
import { SHARED_KEYS } from '../features/surfaces/surface-ports';
import type { SurfaceSnapshot } from '../features/surfaces/surface-snapshot';
import { readHunt } from '../features/surfaces/hunt-store';

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

function impactFor(tap: HapticTap): Haptics.ImpactFeedbackStyle {
  if (tap.intensity < 0.45) return Haptics.ImpactFeedbackStyle.Light;
  if (tap.intensity < 0.75) return Haptics.ImpactFeedbackStyle.Medium;
  return Haptics.ImpactFeedbackStyle.Heavy;
}

/** Plays a cue's taps at their own times, in step with its sound, until the cue is stopped. */
export const nativeHaptics: HapticsPlayer = createTapScheduler(systemTimers, (tap) => {
  void Haptics.impactAsync(impactFor(tap)).catch(() => undefined);
});

export const nativeNotifications: NotificationScheduler = {
  scheduledIds: async () =>
    (await Notifications.getAllScheduledNotificationsAsync()).map((request) => request.identifier),
  schedule: async ({ id, at, text, from, taskId, actions }) => {
    // A monster's message, or one with the bites under it, is the native module's to send: only
    // it can give a notification a sender. A build without the module sends the same words with
    // the monster's name as the title.
    if ((from || actions) && MonsterNotifications.isAvailable()) {
      await MonsterNotifications.schedule({
        id,
        at,
        body: text,
        senderName: from?.name ?? null,
        senderImage: from?.image ?? null,
        taskId: taskId ?? null,
        actions: actions === true,
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

/** The hunt record in the App Group, which the Lock Screen's buttons move with the app away. */
function storedHunt(): HuntRecord | null {
  try {
    return readHunt(nativeSharedStore().get(SHARED_KEYS.hunt));
  } catch {
    return null;
  }
}

function keepHunt(hunt: HuntRecord | null): void {
  try {
    const shared = nativeSharedStore();
    if (hunt === null) shared.remove(SHARED_KEYS.hunt);
    else shared.set(SHARED_KEYS.hunt, JSON.stringify(hunt));
  } catch {
    // Without the App Group the activity still shows; only its buttons have nothing to move.
  }
}

/** Two ends closer than this are the same end, read at two moments. */
const SAME_END_MS = 5_000;

/**
 * The card of the hunt that was just caught, and its caught line, from the snapshot as it stood
 * while the session ran: by the time the Lock Screen is looked at, the snapshot is about the rest
 * of the day. A task with no monster there (a serious one) has no card.
 */
function caughtCard(taskId: string): {
  line: string | null;
  caught: LiveActivity.SessionActivityCaughtCard | null;
} {
  try {
    const stored = nativeSharedStore().get(SHARED_KEYS.snapshot);
    const snapshot = stored === null ? null : (JSON.parse(stored) as Partial<SurfaceSnapshot>);
    if (snapshot?.taskId !== taskId) return { line: null, caught: null };
    const name = snapshot.monsterName ?? null;
    return {
      line: snapshot.taskLines?.caught ?? null,
      caught:
        name === null
          ? null
          : { name, image: snapshot.monsterImage ?? null, number: (snapshot.shelf ?? 0) + 1 },
    };
  } catch {
    return { line: null, caught: null };
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

/** Stale when the picture next changes by the clock, or at the next line turn if that is sooner. */
function staleAt(hunt: HuntRecord | null, endsAt: number): number {
  const now = Date.now();
  const turn = nextLiveLineTurn(now, endsAt);
  const change = hunt === null ? null : nextHuntChange(hunt, now);
  return change === null ? turn : Math.min(turn, change);
}

/**
 * The session's Live Activity through the local module. The module answers "nothing there" on
 * Android and where Live Activities are switched off, so every call is then a no-op. The activity
 * is found by asking iOS which ones are live, so it is still reachable after a relaunch. The hunt
 * record it carries is kept in the App Group as well, where the Lock Screen's buttons move it.
 */
export const nativeLiveActivity: LiveActivityPort = {
  start: async ({ title, taskId, endsAt, line }) => {
    await endAll();
    const now = Date.now();
    const stored = storedHunt();
    // A hunt begun or moved outside the app keeps the moment its clock started. It is this
    // session's only when it ends where the session does; anything else was left behind.
    const resumed =
      stored !== null &&
      stored.taskId === taskId &&
      stored.caughtAt === null &&
      stored.stoppedAt === null
        ? resumeHunt(stored, now)
        : null;
    const same = resumed !== null && Math.abs(resumed.endsAt - endsAt) < SAME_END_MS;
    const hunt: HuntRecord | null =
      taskId === undefined
        ? null
        : { ...(same ? resumed : huntOfSession(taskId, now, endsAt)), endsAt };
    keepHunt(hunt);
    await LiveActivity.start(
      { taskTitle: title, taskId: taskId ?? null },
      { endDate: endsAt, line, hunt, offline: await isOffline() },
      // Stale at the next change: the system then draws the activity again, and the widget
      // extension shows what the record and the shared snapshot have for that moment.
      { staleDate: staleAt(hunt, endsAt) },
    );
  },
  update: async ({ endsAt, line }) => {
    const stored = storedHunt();
    const hunt = stored === null ? null : { ...stored, endsAt };
    keepHunt(hunt);
    const offline = await isOffline();
    for (const id of await liveIds()) {
      await LiveActivity.update(
        id,
        { endDate: endsAt, line, hunt, offline },
        { staleDate: staleAt(hunt, endsAt) },
      );
    }
  },
  overtime: async () => {
    // The record already says so: the clock passed its end. Drawing it again shows the gold count.
    const hunt = storedHunt();
    if (hunt === null) return endAll();
    for (const activity of await LiveActivity.listActive()) {
      if (activity.status !== 'active' && activity.status !== 'stale') continue;
      await LiveActivity.update(activity.id, { ...activity.state, hunt });
    }
  },
  end: async (caught) => {
    const stored = storedHunt();
    keepHunt(null);
    if (!caught || stored === null) return endAll();
    const now = Date.now();
    const hunt = catchHunt(stored, now);
    const card = caughtCard(stored.taskId);
    // The caught card stays until the top of the hour after it would have folded.
    const leaves = (Math.floor((now + HUNT_CAUGHT_CARD_MS) / HOUR_MS) + 1) * HOUR_MS;
    for (const activity of await LiveActivity.listActive()) {
      if (activity.status !== 'active' && activity.status !== 'stale') continue;
      const final = {
        ...activity.state,
        hunt,
        line: card.line ?? activity.state.line,
        caught: card.caught,
      };
      await LiveActivity.end(activity.id, final, (leaves - now) / 1000);
    }
  },
};
