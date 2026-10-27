import { Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClassIcon, type ClassIconName } from '../../features/desk/class-icons';
import { ink } from '../../features/desk/class-style';
import { useT } from '../../i18n/i18n-provider';
import { GlassSurface } from '../glass-surface';
import { useMayMove } from '../motion/use-feel';

import { DUO, type FoldLayout } from './fold-layout';

/** Telling him from the side: a tap opens the composer for typing; held, he listens. */
export interface TellHandlers {
  readonly onTap: () => void;
  readonly onHoldStart?: () => void;
  readonly onHoldEnd?: () => void;
}

export interface SideControlsProps {
  readonly layout: FoldLayout;
  /** The board is showing as a page: its control reads as on and does nothing more. */
  readonly boardShown?: boolean;
  readonly onBoard: () => void;
  readonly onTimetable: () => void;
  readonly onLogbook: () => void;
  readonly onSettings: () => void;
  /** Telling him, on the desk: held, he listens; tapped, the composer opens for typing. */
  readonly tell?: TellHandlers;
  /**
   * The screen's own names for the controls it moved here (the desk's timetable, settings and
   * composer), so flows and tests find them by the same names on every iPhone.
   */
  readonly ids?: Partial<Record<'board' | 'timetable' | 'logbook' | 'settings' | 'tell', string>>;
}

/**
 * Below the system's own side controls: the time and the status ring run down the same edge, under
 * the outer camera closed and at the top of the inner display open (measured on the simulator).
 */
const TOP = { closed: 164, other: 112 } as const;

/**
 * The Duo's controls: Board, Timetable and Logbook down the side the system's own controls are
 * on, with Settings at the foot; in the desk stand, one bar along the foot. They fade from one
 * side and appear on the other rather than sliding across the screen.
 */
export function SideControls(props: SideControlsProps) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const mayMove = useMayMove();
  const { layout } = props;
  if (layout.controls === null) return null;

  const button = (
    name: ClassIconName,
    label: string,
    onPress: () => void,
    testID: string,
    on = false,
  ) => (
    <Pressable
      key={testID}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      disabled={on}
      style={[styles.button, on ? styles.on : null]}
    >
      <ClassIcon name={name} color={ink.text} size={20} />
    </Pressable>
  );
  const main = [
    button(
      'board',
      t('desk.openBoard'),
      props.onBoard,
      props.ids?.board ?? 'side-board',
      props.boardShown === true,
    ),
    button(
      'clock',
      t('desk.openTimetable'),
      props.onTimetable,
      props.ids?.timetable ?? 'side-timetable',
    ),
    button('book', t('board.logbook'), props.onLogbook, props.ids?.logbook ?? 'side-logbook'),
  ];
  const tell = props.tell;
  if (tell) {
    main.push(
      <Pressable
        key="side-tell"
        testID={props.ids?.tell ?? 'side-tell'}
        accessibilityRole="button"
        accessibilityLabel={t('composer.hold')}
        onPress={props.tell.onTap}
        {...(tell.onHoldStart ? { onLongPress: tell.onHoldStart } : {})}
        {...(tell.onHoldEnd ? { onPressOut: tell.onHoldEnd } : {})}
        style={styles.button}
      >
        <ClassIcon name="mic" color={ink.red} size={20} />
      </Pressable>,
    );
  }
  const settings = button(
    'sliders',
    t('desk.settings'),
    props.onSettings,
    props.ids?.settings ?? 'side-settings',
  );
  const fade = mayMove ? { entering: FadeIn.duration(420), exiting: FadeOut.duration(420) } : {};

  if (layout.controls === 'bottom') {
    return (
      <Animated.View
        key="bottom"
        {...fade}
        pointerEvents="box-none"
        style={[styles.footRow, { bottom: Math.max(insets.bottom, 0) + 20 }]}
      >
        <GlassSurface interactive style={styles.bar} testID="side-controls">
          {main}
          {settings}
        </GlassSurface>
      </Animated.View>
    );
  }
  const leading = layout.controls === 'leading';
  const top = layout.pose === 'closed' ? TOP.closed : TOP.other;
  return (
    <Animated.View
      key={layout.controls}
      {...fade}
      pointerEvents="box-none"
      style={[styles.column, leading ? { left: 0 } : { right: 0 }]}
    >
      <GlassSurface interactive style={[styles.stack, { top }]} testID="side-controls">
        {main}
      </GlassSurface>
      <GlassSurface interactive style={[styles.stack, { bottom: Math.max(insets.bottom, 0) + 14 }]}>
        {settings}
      </GlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  column: { position: 'absolute', top: 0, bottom: 0, width: DUO.column, zIndex: 4 },
  stack: {
    position: 'absolute',
    left: 8,
    width: 48,
    borderRadius: 24,
    paddingVertical: 4,
    alignItems: 'center',
    gap: 2,
  },
  footRow: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 4 },
  bar: { flexDirection: 'row', borderRadius: 26, paddingVertical: 4, paddingHorizontal: 6, gap: 2 },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: { backgroundColor: 'rgba(28,26,24,0.08)' },
});
