import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '@scootch/tokens';

import { CapsuleButton, RoundButton } from '../../../ui/buttons';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { SessionText } from '../../session/ui/session-text';
import { SafeFrame } from '../../../ui/safe-frame';

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

/** A cross, drawn from two bars. */
function Cross({ color }: { readonly color: string }) {
  return (
    <View style={styles.cross}>
      <View style={[styles.bar, { backgroundColor: color, transform: [{ rotate: '45deg' }] }]} />
      <View style={[styles.bar, { backgroundColor: color, transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}

/**
 * The frame of every keeping screen: a title, a round close control, a middle and a dock. The
 * close control sits on the trailing side under a title and on the leading side without one, as
 * the boards draw it.
 */
export function KeepFrame(props: KeepFrameProps) {
  const { palette } = useScreenStyle();
  const { title, subtitle, close, footer, scroll = true, children } = props;
  const closeButton = (
    <RoundButton
      label={close.label}
      hint={close.hint}
      onPress={close.onPress}
      testID={props.closeTestID}
    >
      <Cross color={palette.ink} />
    </RoundButton>
  );
  return (
    <SafeFrame testID={props.testID} style={[styles.fill, { backgroundColor: palette.page }]}>
      <View style={styles.head}>
        {title === undefined ? (
          closeButton
        ) : (
          <>
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
            {closeButton}
          </>
        )}
      </View>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.middle}>{children}</ScrollView>
      ) : (
        <View style={styles.fill}>{children}</View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
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
function Lock({ color }: { readonly color: string }) {
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
    <View style={largeText ? styles.stack : styles.row}>
      {quiet ? button(quiet, 'quiet') : null}
      {action ? button(action, 'ink') : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  titles: { flex: 1, gap: spacing.xs },
  middle: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, paddingTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  stack: { gap: spacing.sm },
  grow: { flex: 1 },
  cross: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute', width: 16, height: 2, borderRadius: 1 },
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
