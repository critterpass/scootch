import { matchFont, Skia, type SkFont } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { Platform } from 'react-native';

import { useHandFont } from '../../classroom/use-hand-font';

import type { CardFonts, FontRole } from './cards/card-text';

const SANS = Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif';
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

/**
 * The faces the cards are drawn with: Kithfield Hand from the app's own file, the system's sans
 * and serif. The hand is `null` until it has loaded, and the cards' handwriting waits for it.
 */
export function useCardFonts(): { readonly fonts: CardFonts; readonly ready: boolean } {
  const hand = useHandFont();
  return useMemo(() => {
    const cache = new Map<string, SkFont | null>();
    const fonts: CardFonts = (role: FontRole, size: number) => {
      const key = `${role}:${size}`;
      const cached = cache.get(key);
      if (cached !== undefined) return cached;
      const font =
        role === 'hand'
          ? hand === null
            ? null
            : Skia.Font(hand, size)
          : matchFont({
              fontFamily: role === 'serif' ? SERIF : SANS,
              fontSize: size,
              fontWeight: role === 'sans' ? 'normal' : 'bold',
            });
      cache.set(key, font);
      return font;
    };
    return { fonts, ready: hand !== null };
  }, [hand]);
}
