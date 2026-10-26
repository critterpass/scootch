import { Canvas, Group, Path } from '@shopify/react-native-skia';
import { useRouter } from 'expo-router';
import type { StyleProp, ViewStyle } from 'react-native';

import { PressSpring } from '../../ui/motion/press-spring';

import { openShare } from './open-share';
import { useShareOffer } from './use-share-offer';

/** The App board's share mark: an arrow out of a tray, on a 24-unit grid. */
const MARK = ['M12 3v12M7 8l5-5 5 5', 'M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7'];

/**
 * The way into the share sheet for one finished task. It is there only when the finish may be
 * shared: never for a serious or crisis task, and nowhere on a crisis day (the one guard decides).
 */
export function ShareButton({
  logEntryId,
  label,
  color,
  size = 20,
  style,
  testID,
}: {
  readonly logEntryId: string;
  readonly label: string;
  readonly color: string;
  readonly size?: number;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}) {
  const router = useRouter();
  const offer = useShareOffer(logEntryId);
  if (offer?.kind !== 'ready') return null;
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => openShare(router, logEntryId)}
      style={style}
      {...(testID !== undefined ? { testID } : {})}
    >
      <Canvas style={{ width: size, height: size }} pointerEvents="none">
        <Group transform={[{ scale: size / 24 }]}>
          {MARK.map((path) => (
            <Path
              key={path}
              path={path}
              style="stroke"
              strokeWidth={2}
              strokeCap="round"
              strokeJoin="round"
              color={color}
            />
          ))}
        </Group>
      </Canvas>
    </PressSpring>
  );
}
