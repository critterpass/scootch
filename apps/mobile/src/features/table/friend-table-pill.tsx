import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '@scootch/tokens';

import { Scootch } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { useToday } from '../../state/day-store-provider';
import { useTableState, useTogether } from '../../state/together-context';
import { onInkOf } from '../../ui/buttons';
import { GlassSurface } from '../../ui/glass-surface';
import { PressSpring } from '../../ui/motion/press-spring';
import { useCharacterMotion } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';

import { TABLE_LOBBY, TABLE_SEAT, accountThen, joinOutcomeOf, labelModeFor } from './table-rules';
import { tableFriend, useFriendsTables } from './use-friends-tables';

const CRITTER = 44;
const TITLE_SIZE = 15;
const SUB_SIZE = 13;

export interface FriendTablePillViewProps {
  /** Draws the critter: the friend's account, or the person's own seat. */
  readonly seed: string;
  readonly title: string;
  readonly sub: string | null;
  readonly action: string;
  readonly hint: string;
  readonly busy: boolean;
  readonly onPress: () => void;
}

/**
 * The quiet pill under the header: a critter at work, who is at a table, and the one tap that
 * sits down beside them. To a screen reader the whole pill is one button.
 */
export function FriendTablePillView(props: FriendTablePillViewProps) {
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const character = useCharacterMotion();
  return (
    <PressSpring
      accessibilityRole="button"
      accessibilityLabel={[props.title, props.sub, props.action].filter(Boolean).join(', ')}
      accessibilityHint={props.hint}
      accessibilityState={{ disabled: props.busy }}
      disabled={props.busy}
      onPress={props.onPress}
      feedback="choice"
      testID="friend-table-pill"
      style={styles.place}
    >
      <GlassSurface style={styles.pill}>
        <View pointerEvents="none" style={[styles.row, largeText && styles.stacked]}>
          {largeText ? null : (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.critter, { backgroundColor: palette.surface }]}
            >
              <Scootch
                mood="working"
                workMode={null}
                {...character}
                ownLoop={false}
                seed={props.seed}
                size={CRITTER}
              />
            </View>
          )}
          <View style={styles.words}>
            <Text
              allowFontScaling={allowFontScaling}
              style={[styles.title, { color: palette.ink, fontSize: size(TITLE_SIZE) }]}
            >
              {props.title}
            </Text>
            {props.sub === null ? null : (
              <Text
                allowFontScaling={allowFontScaling}
                style={[styles.sub, { color: palette.muted, fontSize: size(SUB_SIZE) }]}
              >
                {props.sub}
              </Text>
            )}
          </View>
          <View style={[styles.action, { backgroundColor: palette.ink }]}>
            <Text
              allowFontScaling={allowFontScaling}
              style={[styles.title, { color: onInkOf(palette), fontSize: size(TITLE_SIZE) }]}
            >
              {props.action}
            </Text>
          </View>
        </View>
      </GlassSurface>
    </PressSpring>
  );
}

/**
 * On home: a friend who is at a table now, with "Join"; or, for someone who already holds a seat,
 * the way back to it. Only people the person knows are ever named here. With nobody sitting,
 * nothing is drawn.
 */
export function FriendTablePill() {
  const { api, table, purchaseState } = useTogether();
  const { tableId, you } = useTableState();
  const { today } = useToday();
  const { tables, refresh } = useFriendsTables();
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);

  if (tableId !== null) {
    return (
      <FriendTablePillView
        seed={you ?? tableId}
        title={t('table.title')}
        sub={t('table.pill.kept')}
        action={t('table.pill.back')}
        hint={t('table.sit.hint')}
        busy={false}
        onPress={() => router.push(TABLE_SEAT)}
      />
    );
  }

  const [found] = tables;
  if (found === undefined) return null;
  const { name } = tableFriend(found);
  const join = () => {
    setBusy(true);
    void api
      .joinFriendsTable(found.tableId, purchaseState())
      .then((id) => {
        table.sit(id, labelModeFor('task' in today ? today.task : null));
        router.push(TABLE_SEAT);
      })
      .catch((error: unknown) => {
        const outcome = joinOutcomeOf(error);
        // The lobby says what went wrong and offers what is left; an account is asked for first.
        if (outcome === 'not_signed_in' || outcome === 'name_required') {
          router.push(accountThen('/table'));
        } else {
          refresh();
          router.push(TABLE_LOBBY);
        }
      })
      .finally(() => setBusy(false));
  };
  return (
    <FriendTablePillView
      seed={found.friends[0]?.accountId ?? found.tableId}
      title={name === null ? t('table.pill.friendNoName') : t('table.pill.friend', { name })}
      sub={t('table.openSeats', { count: found.openSeats })}
      action={t('table.pill.join')}
      hint={t('table.pill.join.hint')}
      busy={busy}
      onPress={join}
    />
  );
}

const styles = StyleSheet.create({
  // Under the header, inside the dock's gutter, as the board places it.
  place: { marginHorizontal: 14, marginTop: 6 },
  pill: { borderRadius: 30, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 8,
  },
  stacked: { flexDirection: 'column', alignItems: 'stretch', padding: 12 },
  critter: {
    width: CRITTER,
    height: CRITTER,
    borderRadius: CRITTER / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  words: { flexGrow: 1, flexShrink: 1, flexBasis: 0, gap: 1 },
  title: { fontFamily: fonts.body, fontWeight: '600' },
  sub: { fontFamily: fonts.body },
  action: {
    minHeight: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
