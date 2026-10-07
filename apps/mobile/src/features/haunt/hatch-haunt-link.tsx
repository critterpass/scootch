import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import type { Friend } from '../../api/together-api';
import { useT } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useTogether } from '../../state/together-context';
import { QuietLink } from '../dump/dump-panels';

import { HAUNT_SEND, hauntableFriends, offersHauntOnHatch } from './haunt-rules';

/**
 * "Haunt a friend" on the hatch screen, for the monster that just hatched. It is drawn only once
 * the server has named a friend who takes haunts, so a phone that never signed in, or has nobody
 * to haunt, sees the hatch exactly as before. It opens the same send sheet as the link under a
 * set task.
 */
export function HatchHauntLink() {
  const { api } = useTogether();
  const day = useToday();
  const router = useRouter();
  const t = useT();
  const [friends, setFriends] = useState<readonly Friend[]>([]);
  useEffect(() => {
    let current = true;
    void hauntableFriends(api).then((all) => {
      if (current) setFriends(all);
    });
    return () => {
      current = false;
    };
  }, [api]);

  const task = 'task' in day.today ? day.today.task : null;
  if (!offersHauntOnHatch(day, task, day.monster, friends)) return null;
  return (
    <QuietLink
      label={t('haunt.entry')}
      hint={t('haunt.entry.hint')}
      onPress={() => router.push(HAUNT_SEND)}
      testID="hatch-haunt-a-friend"
    />
  );
}
