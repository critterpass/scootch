import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { shotFor } from '../../classroom/classroom';
import { useT } from '../../i18n/i18n-provider';
import { useBoard, useBoardStore } from '../../state/board-provider';
import { useMayMove } from '../../ui/motion/use-feel';

import { noticeUp } from './notice-rules';
import { handText } from './receipt-parts';

const TUITION = '/tuition' as Href;

/** The notice in the phone room, in room units: pinned on the right of the chalkboard. */
const NOTICE = { x: 948, y: 124, width: 112, height: 140 } as const;

/** The notice on the store: pinned once by the rule, gone when recess ends. */
export function TuitionNotice() {
  const snapshot = useBoard();
  const store = useBoardStore();
  const [pinnedFor, setPinnedFor] = useState<number | null>(null);
  const due = snapshot.tuitionNotice;
  const recessEnds = snapshot.recess?.endsAt ?? null;

  useEffect(() => {
    if (!due || recessEnds === null) return;
    setPinnedFor(recessEnds);
    void store.tuitionPinned();
  }, [due, recessEnds, store]);

  return noticeUp(snapshot, pinnedFor) ? <TuitionNoticeView /> : null;
}

/**
 * The notice itself, drawn on the chalkboard as the room is seen at recess: a paper slip with a
 * red pin, "Tuition" in his hand. Tapping it opens the receipt; ignoring it is fine.
 */
export function TuitionNoticeView() {
  const t = useT();
  const router = useRouter();
  const mayMove = useMayMove();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const camera = shotFor('recess', { width, height: height - insets.top });
  const k = width / camera.w;
  const left = (NOTICE.x - camera.x) * k;
  const top = insets.top + (NOTICE.y - camera.y) * k;

  return (
    <Animated.View
      {...(mayMove ? { entering: FadeIn.delay(700).duration(420) } : {})}
      style={[styles.spot, { left, top, width: NOTICE.width * k, height: NOTICE.height * k }]}
      testID="tuition-notice"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('notice.label')}
        onPress={() => router.push(TUITION)}
        hitSlop={24}
        style={styles.fill}
      >
        <View
          style={[
            styles.slip,
            { transform: [{ scale: k }, { rotate: '3deg' }], transformOrigin: 'top left' },
          ]}
        >
          <View style={styles.pin} />
          <Text allowFontScaling={false} style={styles.word}>
            {t('notice.word')}
          </Text>
          <Text allowFontScaling={false} style={[handText, styles.title]}>
            {t('notice.title')}
          </Text>
          <View style={[styles.rule, { width: 80, marginTop: 12 }]} />
          <View style={[styles.rule, { width: 66 }]} />
          <View style={[styles.rule, { width: 74 }]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  spot: { position: 'absolute', zIndex: 2 },
  fill: { flex: 1 },
  slip: {
    width: NOTICE.width,
    height: NOTICE.height,
    backgroundColor: '#FFFDF6',
    borderRadius: 4,
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 10,
    boxShadow: '0 3px 0 rgba(20,40,30,0.18), 0 10px 22px rgba(20,40,30,0.28)',
  },
  pin: {
    position: 'absolute',
    top: -7,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#D42A24',
    boxShadow: 'inset -2px -3px 0 rgba(0,0,0,0.18)',
  },
  word: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, color: '#8A7F74' },
  title: { fontSize: 26, lineHeight: 28, color: '#D42A24', marginTop: 6, textAlign: 'center' },
  rule: { height: 4, borderRadius: 2, backgroundColor: '#E6DED2', marginTop: 7 },
});
