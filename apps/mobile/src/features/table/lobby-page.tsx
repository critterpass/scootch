import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { fonts, radius, spacing } from '@scootch/tokens';

import type { FriendsTable } from '../../api/together-api';
import { Scootch } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { onInkOf } from '../../ui/buttons';
import { TableIcon } from '../../ui/icons';
import { useCharacterMotion } from '../../ui/motion/use-feel';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Page } from '../settings/page';
import { Row, Section } from '../settings/rows';

import { ActionDock } from './action-dock';
import { seatsToOpen } from './table-rules';
import { tableFriend } from './use-friends-tables';
import { Words } from './words';

/** What the dock's one action does: sit at a friend's table, or open one's own. */
const OWN = 'own';

export interface LobbyPageProps {
  readonly plus: boolean;
  /** The person already has a seat somewhere: the lobby offers the way back to it. */
  readonly seated: boolean;
  /** The open tables a friend is at. Nobody else's table is ever listed. */
  readonly tables: readonly FriendsTable[];
  readonly busy: boolean;
  readonly notice: 'open_failed' | 'sit_failed' | 'not_a_link' | null;
  /** Sits down at a friend's table. */
  readonly onSit: (tableId: string) => void;
  readonly onOpen: () => void;
  /** The locked control was tapped: the sheet opens, and only then. */
  readonly onLocked: () => void;
  readonly onJoin: (pasted: string) => void;
  readonly onBack: () => void;
  readonly onFriends: () => void;
  /** Set when the person came here to start: the way on without a table. */
  readonly onAlone?: (() => void) | undefined;
  readonly onClose: () => void;
}

/**
 * "Sit with someone", as the board draws it: Scootch, one big sentence, one card of tables and
 * one dock. The card lists a friend's table to sit down at and a table of one's own to open; the
 * dock does whichever is chosen. Friends only: no stranger's table is listed and nobody is seated
 * with one. With no friend sitting Scootch is asleep and the sentence says so plainly; it never
 * promises that someone will come.
 */
export function LobbyPage(props: LobbyPageProps) {
  const t = useT();
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const character = useCharacterMotion();
  const [pasted, setPasted] = useState('');
  const { tables, plus, seated } = props;
  const quiet = tables.length === 0;
  // A friend's table is chosen when there is one; a table of one's own otherwise.
  const [picked, setPicked] = useState<string | null>(null);
  const chosen =
    tables.find((table) => table.tableId === picked) ?? (picked === OWN ? null : tables[0]) ?? null;
  const first = tables[0] ? tableFriend(tables[0]) : null;

  const action = seated
    ? {
        label: t('table.title'),
        hint: t('table.sit.hint'),
        onPress: props.onBack,
        testID: 'table-back',
      }
    : chosen !== null
      ? {
          label: t('table.sitDown'),
          hint: t('table.sitDown.hint'),
          icon: <TableIcon color={onInkOf(palette)} />,
          disabled: props.busy,
          onPress: () => props.onSit(chosen.tableId),
          testID: 'table-sit-down',
        }
      : {
          label: t('table.open'),
          hint: t('table.open.hint'),
          icon: <TableIcon color={onInkOf(palette)} />,
          disabled: props.busy,
          onPress: props.onOpen,
          testID: 'table-open',
        };

  return (
    <Page
      barTitle={t('table.sit')}
      onClose={props.onClose}
      testID="table-lobby"
      footer={
        <ActionDock
          action={action}
          quiet={
            props.onAlone === undefined
              ? undefined
              : {
                  label: t('table.alone'),
                  hint: t('table.alone.hint'),
                  onPress: props.onAlone,
                  testID: 'table-alone',
                }
          }
        />
      }
    >
      {largeText ? null : (
        <View
          style={styles.figure}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View style={[styles.ring, { borderColor: `${palette.tomato}33` }]} />
          <Scootch mood={quiet ? 'asleep' : 'thinking'} {...character} size={quiet ? 200 : 150} />
          {/* The friends who are sitting, at work around him: at most one in each corner. */}
          {tables
            .flatMap((table) => table.friends)
            .slice(0, AROUND.length)
            .map((friend, index) => (
              <View key={friend.accountId} style={[styles.around, AROUND[index]]}>
                <Scootch
                  mood="working"
                  workMode={null}
                  tone="paper"
                  {...character}
                  ownLoop={false}
                  seed={friend.accountId}
                  size={72}
                />
              </View>
            ))}
        </View>
      )}
      <View style={styles.said}>
        <Words kind="headline" testID={quiet ? 'table-lobby-quiet' : 'table-lobby-here'}>
          {seated
            ? t('table.pill.kept')
            : first === null
              ? t('table.lobby.quiet')
              : first.others > 0
                ? t('table.lobby.hereWith', {
                    name: first.name ?? t('friends.noName'),
                    count: first.others,
                  })
                : t('table.lobby.here', { name: first.name ?? t('friends.noName') })}
        </Words>
        <Words kind="quiet">{t('table.lobby.sub')}</Words>
      </View>
      {seated ? null : (
        <Section>
          {tables.map((table, index) => {
            const { name } = tableFriend(table);
            return (
              <Row
                key={table.tableId}
                first={index === 0}
                kind="choice"
                selected={chosen?.tableId === table.tableId}
                label={t('table.lobby.table', { name: name ?? t('friends.noName') })}
                value={t('table.openSeats', { count: table.openSeats })}
                hint={t('table.lobby.choose.hint')}
                onPress={() => setPicked(table.tableId)}
                testID={`table-sit-${table.tableId}`}
              />
            );
          })}
          <Row
            first={quiet}
            kind="choice"
            selected={chosen === null}
            label={t('table.lobby.own')}
            value={t('table.lobby.seats', { count: seatsToOpen(plus) })}
            hint={t('table.lobby.choose.hint')}
            onPress={() => setPicked(OWN)}
            testID="table-own"
          />
          {plus ? null : (
            <Row
              label={t('table.open.four')}
              value={t('brand.plus')}
              hint={t('keep.plusOnly.hint')}
              onPress={props.onLocked}
              testID="table-four-locked"
            />
          )}
        </Section>
      )}
      {props.notice === 'sit_failed' || props.notice === 'open_failed' ? (
        <Words kind="quiet" accessibilityLiveRegion="polite" testID={`table-${props.notice}`}>
          {t(props.notice === 'sit_failed' ? 'table.sitDown.failed' : 'table.open.failed')}
        </Words>
      ) : null}
      <Section label={t('table.join.section')}>
        <TextInput
          value={pasted}
          onChangeText={setPasted}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t('table.join.placeholder')}
          placeholderTextColor={palette.faint}
          accessibilityLabel={t('table.join.placeholder')}
          allowFontScaling={allowFontScaling}
          returnKeyType="go"
          onSubmitEditing={() => props.onJoin(pasted)}
          testID="table-join-field"
          style={[styles.field, { color: palette.ink, fontSize: size(17) }]}
        />
        {pasted.trim() === '' ? null : (
          <Row
            label={t('table.join')}
            hint={t('table.join.hint')}
            {...(props.busy ? {} : { onPress: () => props.onJoin(pasted) })}
            testID="table-join"
          />
        )}
      </Section>
      {props.notice === 'not_a_link' ? (
        <Words kind="quiet" accessibilityLiveRegion="polite" testID="table-not-a-link">
          {t('table.join.notALink')}
        </Words>
      ) : null}
      <Section>
        <Row
          first
          label={t('table.friends')}
          hint={t('table.friends.hint')}
          onPress={props.onFriends}
          testID="table-friends"
        />
      </Section>
    </Page>
  );
}

const RING = 260;
/** Where a sitting friend's critter stands on the ring, as the board places them. */
const AROUND = [
  { top: 28, left: 0 },
  { top: 44, right: 0 },
  { bottom: 0, left: 16 },
  { bottom: -8, right: 8 },
] as const;

const styles = StyleSheet.create({
  figure: { height: RING, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 8,
  },
  around: { position: 'absolute' },
  said: { paddingHorizontal: 12, gap: 10 },
  field: {
    minHeight: 54,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.body,
  },
});
