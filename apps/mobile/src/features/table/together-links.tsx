import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { MonsterRow, TaskRow } from '@scootch/domain';

import { useT } from '../../i18n/i18n-provider';
import type { SellingDay } from '../../state/shows-comedy';
import { GhostIcon } from '../../ui/icons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { QuietLink } from '../dump/dump-panels';
import { HAUNT_SEND, offersHaunt } from '../haunt/haunt-rules';

export interface TogetherLinksProps {
  readonly day: SellingDay;
  readonly task: TaskRow;
  readonly monster: MonsterRow | null;
}

/**
 * "Haunt a friend" under a set task, for a monster not caught yet: one small glass chip in the
 * middle, quieter than the task and the way to start it. What a haunt is, is said on the sheet it
 * opens. Sitting with someone is the company choice above it. On a heavy day, or beside a serious
 * task, nothing is drawn, and nothing takes its place.
 */
export function TogetherLinks({ day, task, monster }: TogetherLinksProps) {
  const router = useRouter();
  const t = useT();
  const { palette } = useScreenStyle();
  if (!offersHaunt(day, task, monster)) return null;
  return (
    <View style={styles.middle}>
      <QuietLink
        label={t('haunt.entry')}
        hint={t('haunt.entry.hint')}
        onPress={() => router.push(HAUNT_SEND)}
        testID="haunt-a-friend"
        icon={<GhostIcon color={palette.ink} eyes={palette.page} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // The chip keeps its own width and sits in the middle of the column, with the room above it
  // that the column gives every row.
  middle: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
});
