import { useRouter } from 'expo-router';

import type { MonsterRow, TaskRow } from '@scootch/domain';

import { useT } from '../../i18n/i18n-provider';
import type { SellingDay } from '../../state/shows-comedy';
import { QuietLink } from '../dump/dump-panels';
import { HAUNT_SEND, offersHaunt } from '../haunt/haunt-rules';

import { TABLE_LOBBY, showsTableEntry } from './table-rules';

export interface TogetherLinksProps {
  readonly day: SellingDay;
  readonly task: TaskRow;
  readonly monster: MonsterRow | null;
}

/**
 * The quiet ways to company under a set task: "Sit with someone", and "Haunt a friend" for a
 * monster not caught yet. On a heavy day, or beside a serious task, neither is drawn.
 */
export function TogetherLinks({ day, task, monster }: TogetherLinksProps) {
  const router = useRouter();
  const t = useT();
  return (
    <>
      {showsTableEntry(day) ? (
        <QuietLink
          label={t('table.sit')}
          hint={t('table.sit.hint')}
          onPress={() => router.push(TABLE_LOBBY)}
          testID="sit-with-someone"
        />
      ) : null}
      {offersHaunt(day, task, monster) ? (
        <QuietLink
          label={t('haunt.entry')}
          hint={t('haunt.entry.hint')}
          onPress={() => router.push(HAUNT_SEND)}
          testID="haunt-a-friend"
        />
      ) : null}
    </>
  );
}
