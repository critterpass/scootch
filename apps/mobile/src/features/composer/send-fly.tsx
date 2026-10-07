import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '@scootch/tokens';

import { CONTROL_HEIGHT } from '../../ui/buttons';
import { GlassSurface } from '../../ui/glass-surface';
import { WaveIcon } from '../../ui/icons';
import { useScreenStyle } from '../../ui/use-screen-style';

import { DOCK_PADDING } from './composer-fold';
import type { ComposerState } from './composer-machine';
import { shotFor } from './send-shot';

/** The board's flight: up 0.62 of the way to the top over 800 ms, fading over 600 ms after 250. */
const FLY_MS = 800;
const FADE_AFTER_MS = 250;
const FADE_MS = 600;
const RISE_SHARE = 0.62;
const VOICE_SCALE = 0.35;
const TYPED_SCALE = 0.55;
const TYPED_WIDTH = 260;
const CURVE = Easing.bezierFn(0.32, 0.72, 0, 1);

/** One thing sent: spoken words fly as a tomato pill, typed ones as a glass pill with the words. */
export interface Shot {
  readonly id: number;
  readonly text: string | null;
}

/**
 * Watches the composer for the moment words leave it: a recording let go to be sent, or a typed
 * thing sent. `null` until then, and where nothing may move.
 */
export function useSendShot(state: ComposerState, mayFly: boolean): Shot | null {
  const before = useRef(state);
  const [shot, setShot] = useState<Shot | null>(null);
  useEffect(() => {
    const was = before.current;
    before.current = state;
    if (!mayFly || was === state) return;
    const sent = shotFor(was, state);
    if (sent !== null) setShot({ id: Date.now(), text: sent.text });
  }, [state, mayFly]);
  return shot;
}

/**
 * The send fly: what was just sent lifts off the dock as a pill, flies up to Scootch and fades. It
 * is drawn over the dock and takes no touches; the dock itself is back at rest underneath.
 */
export function SendFly({ shot }: { readonly shot: Shot | null }) {
  const { palette, allowFontScaling, size } = useScreenStyle();
  const insets = useSafeAreaInsets();
  const anchor = useRef<ComponentRef<typeof View>>(null);
  const clock = useSharedValue(FADE_AFTER_MS + FADE_MS);
  const lift = useSharedValue(0);
  const id = shot?.id ?? null;
  const typed = shot?.text != null;

  useEffect(() => {
    if (id === null) return;
    // Where the dock is on the screen now: with the keyboard up it is far higher.
    const top = anchor.current?.getBoundingClientRect().y ?? 0;
    lift.value = Math.max(0, top - insets.top) * RISE_SHARE;
    clock.value = 0;
    clock.value = withTiming(FADE_AFTER_MS + FADE_MS, {
      duration: FADE_AFTER_MS + FADE_MS,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.Never,
    });
  }, [clock, id, insets.top, lift]);

  const flying = useAnimatedStyle(() => {
    const now = clock.value;
    const gone = CURVE(Math.min(1, now / FLY_MS));
    const small = typed ? TYPED_SCALE : VOICE_SCALE;
    return {
      opacity:
        now >= FADE_AFTER_MS + FADE_MS ? 0 : 1 - Math.max(0, (now - FADE_AFTER_MS) / FADE_MS),
      transform: [{ translateY: -lift.value * gone }, { scale: 1 - (1 - small) * gone }],
    };
  });

  return (
    <View ref={anchor} pointerEvents="none" style={styles.over}>
      <Animated.View style={flying}>
        {shot === null ? null : shot.text === null ? (
          <View style={[styles.voice, { backgroundColor: palette.tomato }]}>
            <WaveIcon color={palette.onTomato} />
          </View>
        ) : (
          <GlassSurface style={styles.typed}>
            <Text
              allowFontScaling={allowFontScaling}
              numberOfLines={1}
              style={[styles.words, { color: palette.ink, fontSize: size(16) }]}
            >
              {shot.text}
            </Text>
          </GlassSurface>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  over: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: DOCK_PADDING,
    height: CONTROL_HEIGHT,
    alignItems: 'center',
  },
  voice: {
    width: CONTROL_HEIGHT,
    height: CONTROL_HEIGHT,
    borderRadius: CONTROL_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 30px -6px rgba(240, 86, 46, 0.6)',
  },
  typed: {
    width: TYPED_WIDTH,
    maxWidth: '100%',
    height: CONTROL_HEIGHT,
    borderRadius: CONTROL_HEIGHT / 2,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  words: {
    fontFamily: fonts.body,
    fontWeight: '500',
  },
});
