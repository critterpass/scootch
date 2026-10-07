import { useRouter } from 'expo-router';

import type { MonsterRow, TaskRow } from '@scootch/domain';

import { useT } from '../../i18n/i18n-provider';
import type { SellingDay } from '../../state/shows-comedy';
import { GhostIcon } from '../../ui/icons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { QuietLink, QuietRow } from '../dump/dump-panels';
import { HAUNT_SEND, offersHaunt } from '../haunt/haunt-rules';

export interface TogetherLinksProps {
  readonly day: SellingDay;
  readonly task: TaskRow;
  readonly monster: MonsterRow | null;
}

/**
 * The quiet way to a friend under a set task: "Haunt a friend", for a monster not caught yet.
 * Sitting with someone is the company choice beside the length, not a chip here. On a heavy day,
 * or beside a serious task, nothing is drawn, and nothing takes its place.
 */
export function TogetherLinks({ day, task, monster }: TogetherLinksProps) {
  const router = useRouter();
  const t = useT();
  const { palette } = useScreenStyle();
  if (!offersHaunt(day, task, monster)) return null;
  return (
    <QuietRow>
      <QuietLink
        label={t('haunt.entry')}
        hint={t('haunt.entry.hint')}
        onPress={() => router.push(HAUNT_SEND)}
        testID="haunt-a-friend"
        icon={<GhostIcon color={palette.ink} eyes={palette.page} />}
      />
    </QuietRow>
  );
}
