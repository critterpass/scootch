import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { shadows } from '@scootch/tokens';

import { CapsuleButton, GlassDock } from '../../../ui/buttons';

import type { ControlProps } from './controls';
import type { SessionInks } from './session-inks';

/**
 * Where a character stands on a drawn screen: a row of the board's height, the figure on its
 * floor, in the middle. `top` is the gap under the corner row, less the four points that row lacks.
 */
export function Stage({
  height,
  top,
  children,
}: {
  readonly height: number;
  readonly top: number;
  readonly children: ReactNode;
}) {
  return <View style={[styles.stage, { height, marginTop: top + 4 }]}>{children}</View>;
}

/** The words under the stage: 28 points in from each side, 12 apart. */
export function Words({ top, children }: { readonly top: number; readonly children: ReactNode }) {
  return <View style={[styles.words, { marginTop: top }]}>{children}</View>;
}

/** The board's card: the surface, lifted by a hairline and a soft shadow. */
export function PaperCard({
  inks,
  radius,
  style,
  children,
  testID,
}: {
  readonly inks: SessionInks;
  readonly radius: number;
  readonly style?: ViewProps['style'];
  readonly children: ReactNode;
  readonly testID?: string;
}) {
  return (
    <View
      {...(testID ? { testID } : {})}
      style={[
        { backgroundColor: inks.surface, borderRadius: radius, boxShadow: shadows.card },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** The one action of a screen in its glass dock, as the board ends the treat and the thoughts. */
export function InkDock({ label, hint, testID, onPress }: Omit<ControlProps, 'inks' | 'style'>) {
  return (
    <GlassDock>
      <CapsuleButton tone="ink" label={label} hint={hint} testID={testID} onPress={onPress} />
    </GlassDock>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  words: {
    alignSelf: 'stretch',
    paddingHorizontal: 28,
    gap: 12,
  },
});
