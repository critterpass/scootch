import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The wallpaper page after Photos said no. */
export const lookWallpaperPhotosRefused: ScreenState = {
  id: 'look-wallpaper-photos-refused',
  design: {
    board: 'System Surfaces v2',
    section: '07 Settings · icon and wallpaper',
    screen: 'Wallpaper · make it, you set it',
  },
  component: lazy(() =>
    import('../../features/look/captures').then((captures) => ({
      default: captures.WallpaperPhotosRefused,
    })),
  ),
  variants: standardVariants(),
};
