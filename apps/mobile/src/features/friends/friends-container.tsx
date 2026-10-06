import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Share } from 'react-native';

import { refusalOf, type AccountView, type Friend } from '../../api/together-api';
import { useT } from '../../i18n/i18n-provider';
import { useTogether } from '../../state/together-context';
import { JoinPage } from '../table/lobby-page';
import {
  FRIENDS_ACCEPTED,
  accountThen,
  friendInviteLink,
  inviteCodeFrom,
} from '../table/table-rules';

import { FriendsPage } from './friends-page';

/** Friends on the real phone. A phone that has not signed in is sent to do that first. */
export function FriendsContainer() {
  const { api } = useTogether();
  const router = useRouter();
  const t = useT();
  const { accepted } = useLocalSearchParams<{ accepted?: string }>();
  const [friends, setFriends] = useState<readonly Friend[]>([]);
  const [me, setMe] = useState<AccountView | null>(null);
  const [notice, setNotice] = useState<'failed' | 'accepted' | null>(
    accepted === '1' ? 'accepted' : null,
  );

  const load = useCallback(() => {
    void Promise.all([api.me(), api.friends().catch(() => [])])
      .then(([account, all]) => {
        if (account === null) return router.replace(accountThen('/friends'));
        setMe(account);
        setFriends(all);
      })
      .catch(() => setNotice('failed'));
  }, [api, router]);
  useEffect(load, [load]);

  const act = (work: Promise<unknown>) => {
    setNotice(null);
    void work.then(load).catch(() => setNotice('failed'));
  };
  return (
    <FriendsPage
      friends={friends}
      canBeHaunted={me?.canBeHaunted ?? null}
      notice={notice}
      onCanBeHaunted={(on) => act(api.setCanBeHaunted(on))}
      onInvite={() =>
        act(
          api.friendInvite().then(({ code }) =>
            Share.share({
              message: t('friends.invite.message', { link: friendInviteLink(code) }),
            }),
          ),
        )
      }
      onRemove={(accountId) => act(api.removeFriend(accountId))}
      onBlock={(accountId) => act(api.block(accountId, true))}
      onClose={() => router.replace('/table')}
    />
  );
}

/** A friend link, opened: it is accepted, then the friends page says so. */
export function FriendLinkContainer() {
  const { api } = useTogether();
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const [problem, setProblem] = useState<'link_ended' | 'unreachable' | null>(null);

  const ask = useCallback(() => {
    const valid = inviteCodeFrom(code ?? '');
    if (valid === null) return setProblem('link_ended');
    setProblem(null);
    void api
      .acceptFriend(valid)
      .then(() => router.replace(FRIENDS_ACCEPTED))
      .catch((error: unknown) => {
        const reason = refusalOf(error);
        if (reason === 'account_required') router.replace(accountThen(`/f/${valid}`));
        else setProblem(reason === 'invite_not_valid' ? 'link_ended' : 'unreachable');
      });
  }, [api, code, router]);
  useEffect(ask, [ask]);

  return <JoinPage problem={problem} onAgain={ask} onClose={() => router.replace('/')} />;
}
