import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { t } from '@scootch/i18n';

import { setActionLabels, setMorningHunt } from '../../../modules/scootch-notifications';
import type { DayStore } from '../../state/day-store';
import { useTogether } from '../../state/together-context';
import { friendsTablesSeen } from '../table/friends-tables-seen';
import { sitWithFriend } from '../table/sit-with-friend';
import { SESSION_ROUTE } from '../../state/session-relaunch';

import { askOf, type ResponseLike } from './notification-responses';
import type { SurfaceSync } from './surface-sync';

/** What was asked for on a surface that is answered on the session screen. */
const OPENS_SESSION: readonly string[] = [
  'start_session',
  'bite',
  'hunt',
  'park_thought',
  'stuck',
  'first_line',
  'make_smaller',
  'five_more',
  'finish',
];
const UNDER_WAY: readonly string[] = ['running', 'stuck', 'holding', 'time_up'];

/**
 * Runs the surface sync for the life of the app: follows the store, and at launch and on every
 * return to the front picks up what the controls and buttons asked for. A session started that
 * way lands on the session screen.
 */
export function SurfaceSyncHost({
  store,
  sync,
}: {
  readonly store: DayStore;
  readonly sync: SurfaceSync;
}) {
  const router = useRouter();
  const together = useTogether();

  useEffect(() => {
    const stopFollowing = sync.follow();
    // What a screen learns about friends' tables goes to the widget that shows them.
    const stopFriends = friendsTablesSeen.subscribe(() => void sync.sync());
    const opened = () =>
      void sync
        .opened()
        .then((actions) => {
          // The open seat on the widget: the same join the pill on home makes.
          const seat = actions.find((action) => action.kind === 'sit' && action.seatId !== null);
          if (seat?.seatId) {
            const { today } = store.getState();
            void sitWithFriend(together, seat.seatId, 'task' in today ? today.task : null)
              .then(({ to }) => router.push(to))
              .catch(() => undefined);
            return;
          }
          const session = store.getState().session;
          const asked = actions.some((action) => OPENS_SESSION.includes(action.kind));
          const under = session !== null && UNDER_WAY.includes(session.phase);
          if (asked && under) router.replace(SESSION_ROUTE);
        })
        .catch(() => undefined);

    // A tap on a monster's message, or an action under it. Starting is the day store's to
    // allow: it does nothing unless that thing is today's and may be started.
    const answered = new Set<string>();
    const respond = async (response: ResponseLike & { notification: { date?: number } }) => {
      const ask = askOf(response);
      const key = `${response.actionIdentifier}/${response.notification.date ?? ''}`;
      if (ask === null || answered.has(key)) return;
      answered.add(key);
      const { today } = store.getState();
      const todays = 'task' in today ? today.task.id : null;
      if (ask.kind === 'hunt') {
        if (ask.taskId !== null && ask.taskId !== todays) return;
        await store.dispatch({ type: 'surface_action', action: 'start_session' });
        const phase = store.getState().session?.phase;
        if (phase !== undefined && UNDER_WAY.includes(phase)) router.replace(SESSION_ROUTE);
      } else if (ask.kind === 'tomorrow') {
        await sync.aboutOneThing('tomorrow', ask.taskId, null);
        // Nine o'clock is set from the snapshot, so it is written first.
        await sync.sync();
        await setMorningHunt();
      } else {
        await sync.aboutOneThing('turn_down', ask.taskId, null);
      }
    };
    const responses = Notifications.addNotificationResponseReceivedListener(
      (response) => void respond(response).catch(() => undefined),
    );

    // The first look waits for the store to have rebuilt today from storage.
    let looked = false;
    const firstLook = () => {
      if (looked || !store.getState().ready) return;
      looked = true;
      opened();
      // The response that launched the app arrived before anything was listening.
      void Notifications.getLastNotificationResponseAsync()
        .then((response) => (response ? respond(response) : undefined))
        .catch(() => undefined);
    };
    // The words on the three actions follow the language the person chose.
    let labelled: string | null = null;
    const label = () => {
      const state = store.getState();
      const { language } = state.settings;
      if (!state.ready || language === labelled) return;
      labelled = language;
      void setActionLabels({
        hunt: t(language, 'notification.huntNextBite'),
        tomorrow: t(language, 'notification.tomorrowAtNine'),
        turnDown: t(language, 'notification.turnDown'),
      }).catch(() => undefined);
    };
    const look = () => {
      firstLook();
      label();
    };
    look();
    const stopWaiting = store.subscribe(look);
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active' && looked) opened();
    });
    return () => {
      stopFollowing();
      stopFriends();
      stopWaiting();
      responses.remove();
      appState.remove();
    };
  }, [store, sync, router, together]);

  return null;
}
