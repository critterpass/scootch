import { View } from 'react-native';

import { spacing } from '@scootch/tokens';

import type { DayEvent } from '../../state/day-types';
import { AfterPhotoPill } from '../camera/after-photo-pill';
import { FriendTablePill } from '../table/friend-table-pill';

import type { OneScreenShown } from './one-screen-shown';

type Home = NonNullable<Extract<OneScreenShown, { kind: 'composer' }>['home']>;

/**
 * Home's parts that are not always there. The pills under the header are never beside something
 * heavy: one leads to a table, and its lobby sells seats. The world card is there until it is
 * swiped away, and that is kept with the other settings so it stays away.
 */
export function homeParts(
  selling: boolean,
  worldCard: boolean,
  dispatch: (event: DayEvent) => Promise<void>,
): Pick<Home, 'company' | 'onWorldCardAway'> {
  const away = () =>
    void dispatch({ type: 'settings_changed', changes: { worldCardOnHome: false } }).catch(
      () => undefined,
    );
  return {
    ...(selling ? { company: <HomeCompany /> } : {}),
    ...(worldCard ? { onWorldCardAway: away } : {}),
  };
}

/** The quiet pills under home's header: the second photo of a finished mess, a friend's table. */
export function HomeCompany() {
  return (
    <View style={{ gap: spacing.sm, alignItems: 'center' }}>
      <AfterPhotoPill />
      <FriendTablePill />
    </View>
  );
}
