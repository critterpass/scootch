import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import type { MonsterRow, TaskRow } from '@scootch/domain';
import { fonts, shadows } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import type { SellingDay } from '../../state/shows-comedy';
import { Chevron, GhostIcon } from '../../ui/icons';
import { PressSpring } from '../../ui/motion/press-spring';
import { useScreenStyle } from '../../ui/use-screen-style';
import { HAUNT_SEND, offersHaunt } from '../haunt/haunt-rules';

const LABEL_SIZE = 17;
const SUB_SIZE = 13;

export interface TogetherLinksProps {
  readonly day: SellingDay;
  readonly task: TaskRow;
  readonly monster: MonsterRow | null;
}

/**
 * "Haunt a friend" under a set task, for a monster not caught yet: one row in line with the
 * length and the company choice, that says in a sentence what a haunt is before anything is
 * sent. Sitting with someone is the company choice above it. On a heavy day, or beside a serious
 * task, nothing is drawn, and nothing takes its place.
 */
export function TogetherLinks({ day, task, monster }: TogetherLinksProps) {
  const router = useRouter();
  const t = useT();
  const { palette, allowFontScaling, size } = useScreenStyle();
  if (!offersHaunt(day, task, monster)) return null;
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={`${t('haunt.entry')}. ${t('haunt.entry.sub')}`}
      accessibilityHint={t('haunt.entry.hint')}
      onPress={() => router.push(HAUNT_SEND)}
      feedback="choice"
      testID="haunt-a-friend"
      style={[styles.row, { backgroundColor: palette.surface }]}
    >
      <View style={[styles.glyph, { backgroundColor: palette.risoBlob }]}>
        <GhostIcon color={palette.ink} eyes={palette.risoBlob} />
      </View>
      <View style={styles.words}>
        <Text
          allowFontScaling={allowFontScaling}
          style={[styles.label, { color: palette.ink, fontSize: size(LABEL_SIZE) }]}
        >
          {t('haunt.entry')}
        </Text>
        <Text
          allowFontScaling={allowFontScaling}
          style={[
            styles.sub,
            { color: palette.muted, fontSize: size(SUB_SIZE), lineHeight: size(SUB_SIZE) * 1.35 },
          ]}
        >
          {t('haunt.entry.sub')}
        </Text>
      </View>
      <Chevron color={palette.chevron} direction="right" />
    </PressSpring>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 16,
    borderRadius: 22,
    boxShadow: shadows.card,
  },
  glyph: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  words: { flexGrow: 1, flexShrink: 1, flexBasis: 0, gap: 2 },
  label: { fontFamily: fonts.body },
  sub: { fontFamily: fonts.body },
});
