import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** The wallpaper on day zero: Scootch alone on the sand. */
export const lookWallpaperEmptyWorld: ScreenState = {
  id: 'look-wallpaper-empty-world',
  design: {
    board: 'System Surfaces v2',
    section: '07 Settings · icon and wallpaper',
    screen: 'Wallpaper · make it, you set it',
  },
  component: lazy(() =>
    import('../../features/look/captures').then((captures) => ({
      default: captures.WallpaperEmptyWorld,
    })),
  ),
  variants: standardVariants(),
};
