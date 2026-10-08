import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Wallpaper: three drawings of the world, Save to Photos and Refresh every morning. */
export const lookWallpaper: ScreenState = {
  id: 'look-wallpaper',
  design: {
    board: 'System Surfaces v2',
    section: '07 Settings · icon and wallpaper',
    screen: 'Wallpaper · make it, you set it',
  },
  component: lazy(() =>
    import('../../features/look/captures').then((captures) => ({
      default: captures.WallpaperCapture,
    })),
  ),
  variants: standardVariants(),
};
