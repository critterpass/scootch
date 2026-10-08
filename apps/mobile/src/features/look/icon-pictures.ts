import type { ImageSourcePropType } from 'react-native';

import type { Attitude, CardFinish } from '@scootch/domain';

import chrome from '../../../assets/icons/preview/chrome.png';
import cheeky from '../../../assets/icons/preview/cheeky.png';
import glass from '../../../assets/icons/preview/glass.png';
import holo from '../../../assets/icons/preview/holo.png';
import jelly from '../../../assets/icons/preview/jelly.png';
import paper from '../../../assets/icons/preview/paper.png';
import riso from '../../../assets/icons/preview/riso.png';
import soft from '../../../assets/icons/preview/soft.png';
import unhinged from '../../../assets/icons/preview/unhinged.png';
import velvet from '../../../assets/icons/preview/velvet.png';

import { finishOfIcon, type AppIconName } from './icons';

/** The small copy of each icon, drawn by `assets/render-app-icon.ts` beside the icon itself. */
export const ICON_PICTURES: Readonly<Record<AppIconName, ImageSourcePropType>> = {
  soft,
  cheeky,
  unhinged,
  paper,
  holo,
  chrome,
  jelly,
  glass,
  velvet,
  riso,
};

/** The name an icon goes by: its attitude's, or its finish's as the studio writes it. */
export function iconLabel(
  icon: AppIconName,
): `studio.finish.${CardFinish}.short` | `settings.attitude.${Attitude}` {
  const finish = finishOfIcon(icon);
  if (finish !== null) return `studio.finish.${finish}.short`;
  return `settings.attitude.${icon as Attitude}`;
}
