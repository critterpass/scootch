import { colors, type Palette } from '@phusclass/tokens';

import { useAppearance } from '../screens/registry/support/forced-variant';

/** The palette of this screen: the phone's appearance, unless a registry variant forces one. */
export function usePalette(): Palette {
  return colors[useAppearance()];
}
