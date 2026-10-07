import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Scootch } from '../../art/Scootch';
import type { Friend } from '../../api/together-api';
import { useT } from '../../i18n/i18n-provider';
import { SwipeAway } from '../../ui/swipe-away';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Page } from '../settings/page';
import { Note, Row, Section, SwitchRow } from '../settings/rows';
import { ActionDock } from '../table/action-dock';
import { CritterAvatar } from '../table/critter-avatar';
import { Words } from '../table/words';

export interface FriendsPageProps {
  readonly friends: readonly Friend[];
  /** The friends who are at a table now, by account. */
  readonly atTable?: readonly string[];
  /** Friend links sent and not opened yet, each with the whole days it has left. */
  readonly pending?: readonly { readonly id: string; readonly days: number }[];
  readonly onCancelInvite?: (id: string) => void;
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
 * The person's friends, as the board draws them: one card of people, each with their critter and
 * whether they are at a table now, and "Invite a friend" in the dock. A friend is swiped away to
 * remove them, or tapped for the same choice written out, with Block beside it. There is no search
 * and no directory, and the other person is never told.
 */
export function FriendsPage(props: FriendsPageProps) {
  const t = useT();
  const { palette, largeText } = useScreenStyle();
  const { friends } = props;
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Page
      title={t('friends.title')}
      onClose={props.onClose}
      testID="friends"
      footer={
        <ActionDock
          action={{
            label: t('table.invite'),
            hint: t('friends.invite.hint'),
            onPress: props.onInvite,
            testID: 'friends-invite',
          }}
        />
      }
    >
      {friends.length === 0 ? (
        <>
          {largeText ? null : (
            <View
              style={styles.figure}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Scootch mood="waiting" reducedMotion size={160} />
            </View>
          )}
          <View style={styles.said}>
            <Words kind="headline" testID="friends-empty">
              {t('friends.empty')}
            </Words>
          </View>
        </>
      ) : (
        <Section>
          {friends.map((friend, index) => {
            const name = friend.displayName ?? t('friends.noName');
            const sitting = props.atTable?.includes(friend.accountId) === true;
            const opened = open === friend.accountId;
            return (
              <View key={friend.accountId}>
                <SwipeAway onGone={() => props.onRemove(friend.accountId)}>
                  <View style={{ backgroundColor: palette.surface }}>
                    <Row
                      first={index === 0}
                      leading={<CritterAvatar seed={friend.accountId} />}
                      label={name}
                      {...(sitting ? { sub: t('friends.atTable') } : {})}
                      hint={t('friends.row.hint')}
                      onPress={() => setOpen(opened ? null : friend.accountId)}
                      testID={`friend-${friend.accountId}`}
                    />
                  </View>
                </SwipeAway>
                {opened ? (
                  <>
                    <Row
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
                  </>
                ) : null}
              </View>
            );
          })}
        </Section>
      )}
      {props.pending === undefined || props.pending.length === 0 ? null : (
        <Section label={t('friends.pending')}>
          {props.pending.map((invite, index) => (
            <Row
              key={invite.id}
              first={index === 0}
              label={t('friends.pending.link')}
              sub={t('friends.pending.expires', { count: invite.days })}
              value={t('friends.pending.cancel')}
              hint={t('friends.pending.cancel.hint')}
              {...(props.onCancelInvite
                ? { onPress: () => props.onCancelInvite?.(invite.id) }
                : {})}
              testID={`friend-invite-${index}`}
            />
          ))}
        </Section>
      )}
      <Note text={t('friends.note')} />
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

const styles = StyleSheet.create({
  figure: { alignItems: 'center' },
  said: { paddingHorizontal: 12 },
});
