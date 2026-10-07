import { StyleSheet, View } from 'react-native';

import { Scootch, type ScootchProps } from '../../art/Scootch';
import { useScreenStyle } from '../../ui/use-screen-style';

export interface CritterAvatarProps {
  /** Whose critter: an account id, so the same person always blinks the same way. */
  readonly seed: string;
  readonly size?: number;
  /** Pale for someone else, as the boards draw them; tomato for the person's own. */
  readonly tone?: ScootchProps['tone'];
}

/**
 * A person as a row or a banner shows them: their critter at work, small, in a round window. It
 * is decoration: the row beside it carries the name.
 */
export function CritterAvatar({ seed, size = 44, tone = 'paper' }: CritterAvatarProps) {
  const { palette, largeText } = useScreenStyle();
  if (largeText) return null;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.window,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: palette.risoBlob },
      ]}
    >
      <Scootch
        mood="working"
        workMode={null}
        tone={tone}
        reducedMotion
        ownLoop={false}
        seed={seed}
        size={size}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  window: { overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' },
});
