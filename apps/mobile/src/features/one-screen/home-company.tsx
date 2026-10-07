import { View } from 'react-native';

import { spacing } from '@scootch/tokens';

import { AfterPhotoPill } from '../camera/after-photo-pill';
import { FriendTablePill } from '../table/friend-table-pill';

/** The quiet pills under home's header: the second photo of a finished mess, a friend's table. */
export function HomeCompany() {
  return (
    <View style={{ gap: spacing.sm, alignItems: 'center' }}>
      <AfterPhotoPill />
      <FriendTablePill />
    </View>
  );
}
