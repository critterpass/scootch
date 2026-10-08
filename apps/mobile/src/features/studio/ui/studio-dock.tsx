import { StyleSheet, Text } from 'react-native';

import { fonts, shadows, tracking } from '@scootch/tokens';

import { useT } from '../../../i18n/i18n-provider';
import { CONTROL_HEIGHT, GlassDock, onInkOf } from '../../../ui/buttons';
import { PressSpring } from '../../../ui/motion/press-spring';
import { useScreenStyle } from '../../../ui/use-screen-style';
import { Sweep } from '../../plus/ui/sweep';

const LABEL = 17;

export interface StudioDockProps {
  readonly action: 'wearing' | 'wear' | 'buy';
  /** The store's own price text; `null` when the store gave none, and then nothing can be bought. */
  readonly price: string | null;
  readonly busy: boolean;
  readonly canTakeOff: boolean;
  readonly onTakeOff: () => void;
  readonly onWear: () => void;
  readonly onBuy: () => void;
}

/**
 * The studio's dock: "Take it off" and the one action beside it, a third wider. Something that is
 * on shows a pale plate that says so and does nothing; something that may be worn is put on;
 * something to buy is the filled action with a light crossing it, at the store's own price.
 */
export function StudioDock(props: StudioDockProps) {
  const { action, price, busy, canTakeOff } = props;
  const t = useT();
  const { palette, largeText, allowFontScaling, size } = useScreenStyle();
  const text = { fontSize: size(LABEL), letterSpacing: size(LABEL) * tracking.action };
  const wearing = action === 'wearing';
  const buying = action === 'buy';
  const label = wearing
    ? t('studio.wearing')
    : buying
      ? busy
        ? t('plus.purchasing')
        : price === null
          ? null
          : t('studio.buy', { price })
      : t('studio.wear');
  const press = wearing ? undefined : buying ? (busy ? undefined : props.onBuy) : props.onWear;
  return (
    <GlassDock style={largeText ? styles.stack : styles.row} testID="studio-dock">
      <PressSpring
        accessibilityRole="button"
        accessibilityLabel={t('studio.takeOff')}
        accessibilityHint={t('studio.takeOff.hint')}
        accessibilityState={{ disabled: !canTakeOff }}
        disabled={!canTakeOff}
        onPress={props.onTakeOff}
        feedback="choice"
        restOpacity={canTakeOff ? 1 : 0.4}
        testID="studio-take-off"
        style={[styles.control, largeText ? null : styles.quiet]}
      >
        <Text
          allowFontScaling={allowFontScaling}
          maxFontSizeMultiplier={1.6}
          style={[styles.quietLabel, text, { color: palette.ink }]}
        >
          {t('studio.takeOff')}
        </Text>
      </PressSpring>
      {label === null ? null : (
        <PressSpring
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint={buying ? t('studio.buy.hint') : t('studio.wear.hint')}
          accessibilityState={{ disabled: press === undefined, selected: wearing }}
          disabled={press === undefined}
          onPress={press}
          feedback="primary"
          restOpacity={buying && busy ? 0.6 : 1}
          testID={wearing ? 'studio-wearing' : buying ? 'studio-buy' : 'studio-wear'}
          style={[
            styles.control,
            largeText ? null : styles.action,
            wearing
              ? [styles.plate, { backgroundColor: palette.surface }]
              : [styles.filled, { backgroundColor: palette.ink }],
          ]}
        >
          {buying && !busy ? <Sweep colors={['rgba(255,255,255,0.28)']} /> : null}
          <Text
            allowFontScaling={allowFontScaling}
            maxFontSizeMultiplier={1.6}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={[styles.actionLabel, text, { color: wearing ? palette.ink : onInkOf(palette) }]}
          >
            {label}
          </Text>
        </PressSpring>
      )}
    </GlassDock>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 7 },
  stack: { gap: 7 },
  control: {
    minHeight: CONTROL_HEIGHT,
    borderRadius: CONTROL_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  quiet: { flex: 1 },
  action: { flex: 1.3 },
  plate: { borderWidth: 1, borderColor: 'rgba(28,26,23,0.12)' },
  filled: { boxShadow: shadows.inkButton },
  quietLabel: { fontFamily: fonts.body, fontWeight: '500', textAlign: 'center' },
  actionLabel: { fontFamily: fonts.body, fontWeight: '600', textAlign: 'center' },
});
