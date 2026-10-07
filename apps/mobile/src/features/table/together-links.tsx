import { useRouter } from 'expo-router';

import type { MonsterRow, TaskRow } from '@scootch/domain';

import { useT } from '../../i18n/i18n-provider';
import type { SellingDay } from '../../state/shows-comedy';
import { GhostIcon, TogetherIcon } from '../../ui/icons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { QuietLink, QuietRow } from '../dump/dump-panels';
import { HAUNT_SEND, offersHaunt } from '../haunt/haunt-rules';

import { TABLE_LOBBY, showsTableEntry } from './table-rules';

export interface TogetherLinksProps {
  readonly day: SellingDay;
  readonly task: TaskRow;
  readonly monster: MonsterRow | null;
}

/**
 * The quiet ways to company under a set task, as two chips side by side: "Sit with someone", and
 * "Haunt a friend" for a monster not caught yet. On a heavy day, or beside a serious task,
 * neither is drawn, and nothing takes their place.
 */
export function TogetherLinks({ day, task, monster }: TogetherLinksProps) {
  const router = useRouter();
  const t = useT();
  const { palette } = useScreenStyle();
  const sits = showsTableEntry(day);
  const haunts = offersHaunt(day, task, monster);
  if (!sits && !haunts) return null;
  return (
    <QuietRow>
      {sits ? (
        <QuietLink
          label={t('table.sit')}
          hint={t('table.sit.hint')}
          onPress={() => router.push(TABLE_LOBBY)}
          testID="sit-with-someone"
          icon={<TogetherIcon color={palette.ink} />}
        />
      ) : null}
      {haunts ? (
        <QuietLink
          label={t('haunt.entry')}
          hint={t('haunt.entry.hint')}
          onPress={() => router.push(HAUNT_SEND)}
          testID="haunt-a-friend"
          icon={<GhostIcon color={palette.ink} eyes={palette.page} />}
        />
      ) : null}
    </QuietRow>
  );
}
