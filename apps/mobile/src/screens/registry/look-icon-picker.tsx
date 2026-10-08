import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The app icon picker: what the icon changes with, and the ten icons with their locks. */
export const lookIconPicker: ScreenState = {
  id: 'look-icon-picker',
  design: {
    board: 'System Surfaces v2',
    section: '07 Settings · icon and wallpaper',
    screen: 'App icon · picker',
  },
  component: lazy(() =>
    import('../../features/look/captures').then((captures) => ({
      default: captures.IconPickerCapture,
    })),
  ),
  variants: standardVariants(),
};
