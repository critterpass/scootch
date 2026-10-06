import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Suspense } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { captures } from '../../../screens/registry/support/all-states';
import { ForcedVariant } from '../../../screens/registry/support/forced-variant';

/** The way back is at least this tall, so it can be pressed on a phone with a thin status bar. */
const CLOSE_HEIGHT = 24;

/**
 * One registered state, full screen, exactly as its variant asks: nothing else is drawn, so a
 * capture of this screen is a capture of the state. `registry-state-<state>--<variant>` appears
 * once the state's screen is on show. The way back (`registry-state-close`) is an unseen strip
 * over the status bar, where no screen puts anything to press.
 */
export default function RegistryState() {
  const { capture: name } = useLocalSearchParams<{ capture: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const capture = captures.find((candidate) => candidate.name === name);

  if (capture === undefined) return <Redirect href="/registry" />;
  const Screen = capture.state.component;

  return (
    <View style={styles.fill}>
      <ForcedVariant variant={capture.variant}>
        <Suspense fallback={null}>
          <View testID={`registry-state-${capture.name}`} style={styles.fill}>
            <Screen />
          </View>
        </Suspense>
      </ForcedVariant>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to the screen registry"
        testID="registry-state-close"
        onPress={() => router.back()}
        style={[styles.close, { height: Math.max(insets.top, CLOSE_HEIGHT) }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  close: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
