import { StyleSheet, View } from 'react-native';

import { spacing } from '@scootch/tokens';

import type { Friend } from '../../api/together-api';
import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { Page } from '../settings/page';
import { Note, Row, Section, SwitchRow } from '../settings/rows';
import { Words } from '../table/words';

export interface FriendsPageProps {
  readonly friends: readonly Friend[];
  /** The person's own switch; `null` until their account has been read. */
  readonly canBeHaunted: boolean | null;
  readonly notice: 'failed' | 'accepted' | null;
  readonly onCanBeHaunted: (on: boolean) => void;
  readonly onInvite: () => void;
  readonly onRemove: (accountId: string) => void;
  readonly onBlock: (accountId: string) => void;
  readonly onClose: () => void;
}

/**
 * The person's friends: people who opened their link, and nobody else. There is no search and no
 * directory. Removing and blocking are quiet: the other person is never told.
 */
export function FriendsPage(props: FriendsPageProps) {
  const t = useT();
  const { friends } = props;
  return (
    <Page title={t('friends.title')} onClose={props.onClose} testID="friends">
      {friends.length === 0 ? (
        <Words kind="quiet" testID="friends-empty">
          {t('friends.empty')}
        </Words>
      ) : (
        friends.map((friend) => (
          <Section key={friend.accountId} label={friend.displayName ?? t('friends.noName')}>
            <Row
              first
              label={t('friends.remove')}
              hint={t('friends.remove.hint')}
              onPress={() => props.onRemove(friend.accountId)}
              testID={`friend-remove-${friend.accountId}`}
            />
            <Row
              danger
              label={t('friends.block')}
              hint={t('friends.block.hint')}
              onPress={() => props.onBlock(friend.accountId)}
              testID={`friend-block-${friend.accountId}`}
            />
          </Section>
        ))
      )}
      <View style={styles.invite}>
        <CapsuleButton
          tone="quiet"
          label={t('friends.invite')}
          hint={t('friends.invite.hint')}
          onPress={props.onInvite}
          testID="friends-invite"
        />
      </View>
      {props.canBeHaunted === null ? null : (
        <Section label={t('friends.you')}>
          <SwitchRow
            first
            label={t('friends.canBeHaunted')}
            sub={t('friends.canBeHaunted.sub')}
            hint={t('friends.canBeHaunted.hint')}
            value={props.canBeHaunted}
            onChange={props.onCanBeHaunted}
            testID="friends-can-be-haunted"
          />
        </Section>
      )}
      {props.notice === null ? null : (
        <Note
          text={t(props.notice === 'failed' ? 'table.failed' : 'friends.accepted')}
          testID="friends-notice"
        />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({ invite: { gap: spacing.sm } });
