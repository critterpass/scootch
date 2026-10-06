import { createContext, useContext, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';

import type { ColorScheme } from '@scootch/tokens';

import { ForcedLanguage } from '../../../i18n/i18n-provider';
import type { ScreenVariant, TextSize } from './screen-state';

/**
 * How much the largest accessibility text size enlarges body text: iOS's largest Dynamic Type
 * size, and the top of Android's font size setting.
 */
const LARGEST_TEXT_SCALE = Platform.OS === 'ios' ? 3.1 : 2;

const textScales: Record<TextSize, number> = { default: 1, largest: LARGEST_TEXT_SCALE };

const ForcedVariantContext = createContext<ScreenVariant | undefined>(undefined);

/**
 * Shows its children as one registry variant: the language, appearance and text size come from
 * the variant instead of the phone's settings, so a capture is the same on every device.
 */
export function ForcedVariant({ variant, children }: ForcedVariantProps) {
  return (
    <ForcedVariantContext.Provider value={variant}>
      <ForcedLanguage language={variant.language}>{children}</ForcedLanguage>
    </ForcedVariantContext.Provider>
  );
}

interface ForcedVariantProps {
  readonly variant: ScreenVariant;
  readonly children: ReactNode;
}

/** The registry variant being shown, or undefined in the app as a person uses it. */
export function useForcedVariant(): ScreenVariant | undefined {
  return useContext(ForcedVariantContext);
}

/** Light or dark: the phone's setting, unless a registry variant forces one. */
export function useAppearance(): ColorScheme {
  const forced = useContext(ForcedVariantContext)?.appearance;
  const device = useColorScheme() === 'dark' ? 'dark' : 'light';
  return forced ?? device;
}

export interface TextSizing {
  /** False under a forced variant, where the phone's text size setting must not also apply. */
  readonly allowFontScaling: boolean;
  /** The font size to set for a size from the tokens. */
  readonly size: (designSize: number) => number;
}

/**
 * How a screen sizes its text. The phone's text size setting scales it as usual; a registry
 * variant replaces that setting with its own size.
 */
export function useTextSizing(): TextSizing {
  const forced = useContext(ForcedVariantContext)?.textSize;
  if (forced === undefined) return { allowFontScaling: true, size: (designSize) => designSize };
  const scale = textScales[forced];
  return { allowFontScaling: false, size: (designSize) => designSize * scale };
}
