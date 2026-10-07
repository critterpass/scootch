import { colors, type ColorScheme, type Palette } from '@scootch/tokens';

import { inkOf, type InkId } from '../features/studio/catalogue';
import { useAppearance } from '../screens/registry/support/forced-variant';
import { usePlusState } from '../state/plus-context';

const inked = new Map<string, Palette>();

/**
 * The palette printed in an ink. Tangerine is the palette as the tokens give it. Another ink
 * takes tomato's place, and in the light appearance the page takes its paper; on the dark page
 * the ink's lighter side is used, so it still reads.
 */
export function paletteIn(scheme: ColorScheme, ink: InkId): Palette {
  const plain = colors[scheme];
  if (ink === 'tangerine') return plain;
  const key = `${scheme}:${ink}`;
  const known = inked.get(key);
  if (known) return known;
  const { accent, paper, highlight } = inkOf(ink).colours;
  const palette: Palette =
    scheme === 'dark'
      ? { ...plain, tomato: highlight, onTomato: plain.page }
      : {
          ...plain,
          page: paper,
          tomato: accent,
          // Mustard is light enough to carry ink; the deep inks carry their own paper.
          onTomato: ink === 'mustard' ? plain.ink : paper,
        };
  inked.set(key, palette);
  return palette;
}

/** The palette of this screen: the phone's appearance, printed in the ink the person wears. */
export function usePalette(): Palette {
  return paletteIn(useAppearance(), usePlusState().look.ink);
}
