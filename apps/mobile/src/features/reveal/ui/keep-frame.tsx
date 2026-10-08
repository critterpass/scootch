import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@scootch/tokens';

import { CapsuleButton, GlassDock } from '../../../ui/buttons';
import { CloseButton, CornerBar } from '../../../ui/corner-bar';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { SessionText } from '../../session/ui/session-text';
import { SafeFrame } from '../../../ui/safe-frame';

/** From the bottom of the screen up to a dock, as the boards draw it. */
const DOCK_BOTTOM = 30;

export interface KeepFrameProps {
  readonly testID: string;
  /** The big title and the line under it. The reveal's steps have neither. */
  readonly title?: string;
  readonly subtitle?: string;
  readonly close: { readonly label: string; readonly hint: string; readonly onPress: () => void };
  readonly closeTestID: string;
  readonly footer?: ReactNode;
  /** False when the middle scrolls by itself, as the world's rows do. */
  readonly scroll?: boolean;
  readonly children: ReactNode;
}

/**
 * The frame of every keeping screen: a title, a round close control, a middle and a dock. The
 * close control is always in the trailing corner, exactly where every other screen has its own.
 */
export function KeepFrame(props: KeepFrameProps) {
  const { palette } = useScreenStyle();
  const insets = useSafeAreaInsets();
  const { title, subtitle, close, footer, scroll = true, children } = props;
  return (
    <SafeFrame testID={props.testID} style={[styles.fill, { backgroundColor: palette.page }]}>
      <CornerBar trailing={<CloseButton {...close} testID={props.closeTestID} />}>
        {title === undefined ? null : (
          <View style={styles.titles}>
            <SessionText face="headline" color={palette.ink} accessibilityRole="header">
              {title}
            </SessionText>
            {subtitle ? (
              <SessionText face="caption" color={palette.muted} testID={`${props.testID}-count`}>
                {subtitle}
              </SessionText>
            ) : null}
          </View>
        )}
      </CornerBar>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.middle}>{children}</ScrollView>
      ) : (
        <View style={styles.fill}>{children}</View>
      )}
      {footer ? (
        // The dock sits where every dock does: 30 points up, or on the home bar's own clear space.
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, DOCK_BOTTOM) - insets.bottom },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </SafeFrame>
  );
}

export interface DockAction {
  readonly label: string;
  readonly hint: string;
  readonly testID: string;
  readonly onPress?: () => void;
  /** A Plus control in the free app: drawn with its lock. A tap, where it has one, opens the sheet. */
  readonly locked?: boolean;
}

/** A small padlock, as the Plus board draws it beside a locked control. */
export function Lock({ color }: { readonly color: string }) {
  return (
    <View style={styles.lock}>
      <View style={[styles.shackle, { borderColor: color }]} />
      <View style={[styles.lockBody, { backgroundColor: color }]} />
    </View>
  );
}

/** The dock: a quiet control and the one action beside it, stacked at the large text sizes. */
export function Dock({
  quiet,
  action,
}: {
  readonly quiet?: DockAction;
  readonly action?: DockAction;
}) {
  const { palette, largeText } = useScreenStyle();
  const button = (item: DockAction, tone: 'ink' | 'quiet') => (
    <CapsuleButton
      key={item.testID}
      label={item.label}
      hint={item.hint}
      testID={item.testID}
      tone={item.locked ? 'quiet' : tone}
      disabled={item.locked === true && !item.onPress}
      style={largeText ? null : styles.grow}
      {...(item.locked ? { icon: <Lock color={palette.muted} /> } : {})}
      {...(item.onPress ? { onPress: item.onPress } : {})}
    />
  );
  return (
    <GlassDock style={largeText ? styles.stack : styles.row}>
      {quiet ? button(quiet, 'quiet') : null}
      {action ? button(action, 'ink') : null}
    </GlassDock>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // The bar's own gap gives the title its 24-point margin; the close control is in the corner.
  titles: {
    flex: 1,
    gap: spacing.xs,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  middle: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  stack: { gap: spacing.sm },
  grow: { flex: 1 },
  lock: { width: 12, height: 14, justifyContent: 'flex-end', alignItems: 'center' },
  shackle: {
    width: 8,
    height: 8,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  lockBody: { width: 12, height: 8, borderRadius: 2.5 },
});
