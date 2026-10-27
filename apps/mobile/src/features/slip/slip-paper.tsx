import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useT } from '../../i18n/i18n-provider';
import { useTextSizing } from '../../screens/registry/support/forced-variant';
import { useMayMove } from '../../ui/motion/use-feel';
import { fadeUp, stampDown } from '../desk/class-motion';
import { ink, type } from '../desk/class-style';

import type { Graded } from './slip-model';

/** One 36-point line of the slip, its words on the purple rule. */
function Ruled({ children, style }: { readonly children: ReactNode; readonly style?: object }) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.rule} />
      {children}
    </View>
  );
}

/**
 * The slip itself, as the App board draws it: yellow paper ruled in purple with a red margin, the
 * task it is for, the excuse in the user's hand and his red comment, and a stamped grade.
 */
export function SlipPaper({
  taskTitle,
  excuseText,
  picked,
  graded,
}: {
  readonly taskTitle: string;
  /** The excuse as the user gave it, or `null` before one is given. */
  readonly excuseText: string | null;
  /** A picked excuse is written on the slip as a sentence. */
  readonly picked: boolean;
  readonly graded: Graded | null;
}) {
  const t = useT();
  const sizing = useTextSizing();
  const mayMove = useMayMove();
  return (
    <View style={styles.paper}>
      <View style={styles.margin} />
      <Ruled style={styles.forRow}>
        <Text
          allowFontScaling={sizing.allowFontScaling}
          numberOfLines={2}
          style={[styles.forLine, { fontSize: sizing.size(13) }]}
        >
          {t('slip.for')} <Text style={styles.forTask}>{taskTitle}</Text>
        </Text>
      </Ruled>
      <Ruled style={styles.handRow}>
        <Animated.Text
          key={excuseText ?? ''}
          {...(excuseText !== null && picked && mayMove ? { entering: fadeUp } : {})}
          testID="slip-excuse"
          allowFontScaling={sizing.allowFontScaling}
          numberOfLines={2}
          style={[
            type.hand,
            {
              fontSize: sizing.size(26),
              color: excuseText ? ink.purple : 'rgba(106,69,184,0.35)',
            },
          ]}
        >
          {excuseText === null ? t('slip.yourExcuse') : picked ? `${excuseText}.` : excuseText}
        </Animated.Text>
      </Ruled>
      <Ruled style={[styles.handRow, styles.commentRow]}>
        {graded !== null ? (
          <Animated.Text
            key={graded.comment}
            entering={FadeIn.duration(500)}
            testID="slip-comment"
            allowFontScaling={sizing.allowFontScaling}
            style={[type.hand, styles.comment, { fontSize: sizing.size(22) }]}
          >
            {graded.comment}
          </Animated.Text>
        ) : null}
      </Ruled>
      {graded?.grade ? (
        <Animated.View
          key={graded.grade}
          entering={mayMove ? stampDown : FadeIn.duration(200)}
          style={styles.stamp}
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('slip.grade', { grade: graded.grade })}
        >
          <Text style={[type.hand, styles.grade]}>{graded.grade}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    borderRadius: 18,
    paddingVertical: 10,
    paddingLeft: 52,
    paddingRight: 16,
    backgroundColor: '#FFF9E3',
    boxShadow: 'inset 0 0 0 1px rgba(150,120,40,0.08)',
    overflow: 'hidden',
  },
  margin: {
    position: 'absolute',
    left: 39,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(226,69,62,0.35)',
  },
  row: { minHeight: 36, justifyContent: 'flex-end' },
  rule: {
    position: 'absolute',
    left: -52,
    right: -16,
    bottom: 0,
    height: 1,
    backgroundColor: 'rgba(106,69,184,0.18)',
  },
  forRow: { paddingBottom: 6 },
  handRow: { paddingBottom: 3 },
  forLine: { color: ink.muted },
  forTask: { color: ink.text, fontWeight: '600' },
  commentRow: { paddingRight: 70 },
  comment: { color: ink.red },
  stamp: {
    position: 'absolute',
    right: 14,
    top: 28,
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: ink.red,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-10deg' }],
  },
  grade: { color: ink.red, fontSize: 30 },
});
