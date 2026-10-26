import { useTypeface, type SkTypeface } from '@shopify/react-native-skia';
import { useFonts } from 'expo-font';

import kithfieldHand from '../../assets/fonts/KithfieldHand-Bold.ttf';

/** The family name the app's own text uses for the handwriting. */
export const HAND_FAMILY = 'Kithfield Hand';

/**
 * Kithfield Hand, the chalk and his handwriting. expo-font registers it for the app's text; Skia
 * draws from its own copy of the same file, because a canvas cannot reach a font the system
 * registered for views. Null until the Skia copy has loaded.
 */
export function useHandFont(): SkTypeface | null {
  useFonts({ [HAND_FAMILY]: kithfieldHand });
  return useTypeface(kithfieldHand);
}
