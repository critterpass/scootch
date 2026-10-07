import {
  GlassContainer,
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors } from '@scootch/tokens';

import { useAppearance } from '../screens/registry/support/forced-variant';

import { glassDraw, pressOwner, type GlassDraw, type PressOwner } from './glass-choice';

export interface GlassSurfaceProps {
  readonly style?: ViewProps['style'];
  readonly children?: ReactNode;
  readonly testID?: string;
  /**
   * `regular` is the glass of every control. `clear` lets more of what is behind through, for a
   * small control that floats over a picture.
   */
  readonly variant?: 'regular' | 'clear';
  /**
   * True for a surface that is itself the pressed control (a corner button, a pill): the system's
   * glass then lights and stretches under the finger. A dock that only holds buttons is not.
   */
  readonly interactive?: boolean;
  /** A colour washed into the glass, only where the design tints it. */
  readonly tint?: string;
}

/** The fallback's see-through fill: the surface colour at 85%. */
const FALLBACK_ALPHA = 'D9';

let known: GlassDraw | undefined;

/**
 * How glass is drawn on this phone, asked of the system once. A build without the glass module, or
 * a system that cannot answer, draws the fallback.
 */
export function glassOnThisPhone(): GlassDraw {
  if (known === undefined) {
    try {
      known = glassDraw({
        liquidGlass: isLiquidGlassAvailable(),
        glassApi: isGlassEffectAPIAvailable(),
      });
    } catch {
      known = 'fallback';
    }
  }
  return known;
}

/** Who answers a press on a glass control here: see `pressOwner`. */
export function glassPressOwner(interactive: boolean): PressOwner {
  return pressOwner(glassOnThisPhone(), interactive);
}

/**
 * The one way to draw glass. A control sits on the system's Liquid Glass where the phone has it,
 * and on a plain translucent fill with a hairline edge everywhere else. Glass is for controls that
 * float above content, never for content, and never on another glass surface: a button inside a
 * glass dock is a tinted fill.
 */
export function GlassSurface({
  style,
  children,
  testID,
  variant = 'regular',
  interactive = false,
  tint,
}: GlassSurfaceProps) {
  const appearance = useAppearance();
  const palette = colors[appearance];

  if (glassOnThisPhone() === 'liquid') {
    return (
      <GlassView
        glassEffectStyle={variant}
        isInteractive={interactive}
        colorScheme={appearance}
        style={style}
        {...(tint === undefined ? {} : { tintColor: tint })}
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
        {
          backgroundColor: tint ?? `${palette.surface}${FALLBACK_ALPHA}`,
          borderColor: `${palette.ink}14`,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export interface GlassGroupProps {
  readonly style?: ViewProps['style'];
  readonly children?: ReactNode;
  /**
   * How near two glass shapes come before they start to flow into each other. Zero joins only
   * shapes that touch, which keeps separate controls separate.
   */
  readonly spacing?: number;
}

/**
 * Glass shapes that sit together are drawn in one pass, as the system draws the items of a bar, so
 * they bend the same light and can flow into each other. Without the system's glass it is a plain
 * view with the same layout.
 */
export function GlassGroup({ style, children, spacing = 0 }: GlassGroupProps) {
  if (glassOnThisPhone() === 'liquid') {
    return (
      <GlassContainer spacing={spacing} style={style}>
        {children}
      </GlassContainer>
    );
  }
  return <View style={style}>{children}</View>;
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
