import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';

import type { Translate } from '../../../i18n/i18n-provider';
import { GlassPill } from '../../../ui/buttons';
import { useScreenStyle } from '../../../ui/use-screen-style';

import { parkMotion } from './park-motion';
import { PillPlus } from './pill-marks';
import type { SessionInks } from './session-inks';
import { SessionText } from './session-text';

// Whether anything moves is decided by the screen, so no animation asks the system again.
const ALWAYS = ReduceMotion.Never;

export interface ParkPillProps {
  readonly inks: SessionInks;
  readonly t: Translate;
  readonly onPress: () => void;
  /**
   * True when the pill is coming back from the field it opened: it settles out of the field's
   * width. Turning up for the first time, it fades in.
   */
  readonly back: boolean;
}

/** "Park a thought": the one glass pill of a session at work, in the middle of its row. */
export function ParkPill({ inks, t, onPress, back }: ParkPillProps) {
  const { reducedMotion } = useScreenStyle();
  return (
    <Animated.View
      entering={back ? parkMotion(reducedMotion).pill : FadeIn.duration(260).reduceMotion(ALWAYS)}
      // It gives way to the field quickly: the field opens out of its shape.
      exiting={FadeOut.duration(120).reduceMotion(ALWAYS)}
      style={styles.middle}
    >
      <GlassPill
        label={t('talk.parkThought')}
        hint={t('session.park.hint')}
        testID="session-park"
        onPress={onPress}
      >
        <PillPlus inks={inks} />
        <SessionText face="pill" color={inks.ink} numberOfLines={1}>
          {t('talk.parkThought')}
        </SessionText>
      </GlassPill>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  middle: { alignSelf: 'center' },
});
