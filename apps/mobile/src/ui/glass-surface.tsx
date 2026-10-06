import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors } from '@scootch/tokens';

import { useAppearance } from '../screens/registry/support/forced-variant';

export interface GlassSurfaceProps {
  readonly style?: ViewProps['style'];
  readonly children?: ReactNode;
  readonly testID?: string;
}

/** The fallback's see-through fill: the surface colour at 85%. */
const FALLBACK_ALPHA = 'D9';

/**
 * The surface a control sits on: system glass where the phone has it, and a plain translucent
 * fill with a hairline edge everywhere else. Glass is for controls only, never for content.
 */
export function GlassSurface({ style, children, testID }: GlassSurfaceProps) {
  const appearance = useAppearance();
  const palette = colors[appearance];

  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={appearance}
        style={style}
        {...(testID ? { testID } : {})}
      >
        {children}
      </GlassView>
    );
  }
  return (
    <View
      {...(testID ? { testID } : {})}
      style={[
        styles.fallback,
        { backgroundColor: `${palette.surface}${FALLBACK_ALPHA}`, borderColor: `${palette.ink}14` },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#1C1A17',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});
