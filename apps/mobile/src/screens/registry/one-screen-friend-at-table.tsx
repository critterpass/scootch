import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Home while a friend is at a table: the quiet pill under the header, with "Join". */
export const oneScreenFriendAtTable: ScreenState = {
  id: 'one-screen-friend-at-table',
  design: { board: 'Tables', section: '01 Ways in', screen: 'From the waiting screen' },
  component: lazy(() =>
    import('../../features/one-screen/captures').then((captures) => ({
      default: captures.OneScreenFriendAtTable,
    })),
  ),
  variants: standardVariants(),
};
