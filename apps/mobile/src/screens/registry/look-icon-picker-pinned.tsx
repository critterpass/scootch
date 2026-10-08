import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The icon picker with Plus and one icon kept: no locks, and the pick wears the ring. */
export const lookIconPickerPinned: ScreenState = {
  id: 'look-icon-picker-pinned',
  design: {
    board: 'System Surfaces v2',
    section: '07 Settings · icon and wallpaper',
    screen: 'App icon · picker',
  },
  component: lazy(() =>
    import('../../features/look/captures').then((captures) => ({
      default: captures.IconPickerPinned,
    })),
  ),
  variants: standardVariants(),
};
