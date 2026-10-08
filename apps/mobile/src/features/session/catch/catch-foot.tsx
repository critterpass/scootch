import { useRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { AnimatedViewStyle } from '../../../ui/motion/animated-style';

import type { ScreenProps } from '../screens/screen-props';
import { WorkingFooter } from '../screens/working-footer';
import type { ParkComposerHandle } from '../ui/park-composer';

export interface CatchFootProps extends ScreenProps {
  /** How far in from the sides, and up from the screen's edge, what is at the foot sits. */
  readonly inset: number;
  readonly bottom: number;
  /** How the foot comes and goes with Scootch's desk; `null` while a card or the field is up. */
  readonly layer: AnimatedViewStyle | null;
}

/**
 * What rises at the foot of the session while it is at work: the park field and the stuck card,
 * over the catch or under Scootch, and "Park a thought" itself while he has the screen. It keeps
 * clear of the keyboard, and takes no touch above itself except to close the field.
 */
export function CatchFoot(props: CatchFootProps) {
  const { model, actions, t } = props;
  const park = useRef<ParkComposerHandle | null>(null);
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
    >
      {model.parkOpen ? (
        // A touch anywhere above the dock closes it. Words already there are parked.
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('session.park.close')}
          accessibilityHint={t('session.park.close.hint')}
          testID="session-park-cancel"
          onPress={() => (park.current ? park.current.close() : actions.closePark())}
          style={styles.fill}
        />
      ) : (
        <View pointerEvents="none" style={styles.fill} />
      )}
      <Animated.View
        style={[
          styles.footer,
          { paddingHorizontal: props.inset, paddingBottom: props.bottom },
          props.layer,
        ]}
      >
        <WorkingFooter {...props} park={park} />
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  footer: { paddingTop: 8 },
});
