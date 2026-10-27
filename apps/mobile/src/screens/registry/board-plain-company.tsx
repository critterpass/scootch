import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** After the crisis screen is closed: the board back, with no tally, no remark and plain company. */
export const boardPlainCompany: ScreenState = {
  id: 'board-plain-company',
  design: null,
  undesignedReason:
    'The brief brings the board back after the crisis screen is closed, with no pressure and no joke; no board draws it. The Board with its tallies and old-chalk question left off and his plain line at the foot',
  component: lazy(() =>
    import('../../features/board/board-fixtures').then((screen) => ({
      default: screen.BoardPlain,
    })),
  ),
  variants: standardVariants(),
};
