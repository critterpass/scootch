import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { fonts, radius, spacing } from '@scootch/tokens';

import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Lock } from '../plus/ui/parts';
import { Page } from '../settings/page';
import { Row, Section } from '../settings/rows';

import { openTableStep, type JoinOutcome } from './table-rules';
import { Words } from './words';

export interface LobbyPageProps {
  readonly plus: boolean;
  /** The person already has a seat somewhere: the lobby offers the way back to it. */
  readonly seated: boolean;
  readonly busy: boolean;
  readonly notice: 'open_failed' | 'not_a_link' | null;
  readonly onOpen: () => void;
  /** The locked control was tapped: the sheet opens, and only then. */
  readonly onLocked: () => void;
  readonly onJoin: (pasted: string) => void;
  readonly onBack: () => void;
  readonly onFriends: () => void;
  readonly onClose: () => void;
}

/**
 * "Sit with someone": open a table (the quiet locked control without Plus), or join one by its
 * link. Friends only: there is no list of tables and nobody to be seated with.
 */
export function LobbyPage(props: LobbyPageProps) {
  const t = useT();
  const { palette, allowFontScaling, size } = useScreenStyle();
  const [pasted, setPasted] = useState('');
  return (
    <Page title={t('table.sit')} onClose={props.onClose} testID="table-lobby">
      <Words kind="quiet">{t('table.lobby.sub')}</Words>
      {props.seated ? (
        <CapsuleButton
          label={t('table.title')}
          hint={t('table.sit.hint')}
          onPress={props.onBack}
          testID="table-back"
        />
      ) : (
        <CapsuleButton
          label={t('table.open')}
          hint={props.plus ? t('table.open.hint') : t('keep.plusOnly.hint')}
          tone={props.plus ? 'ink' : 'quiet'}
          {...(props.plus ? {} : { icon: <Lock color={palette.muted} /> })}
          disabled={props.busy}
          onPress={openTableStep(props.plus) === 'open' ? props.onOpen : props.onLocked}
          testID={props.plus ? 'table-open' : 'table-open-locked'}
        />
      )}
      {props.notice === 'open_failed' ? (
        <Words kind="quiet" accessibilityLiveRegion="polite" testID="table-open-failed">
          {t('table.open.failed')}
        </Words>
      ) : null}
      <Words kind="quiet">{t('table.join.section')}</Words>
      <TextInput
        value={pasted}
        onChangeText={setPasted}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={t('table.join.placeholder')}
        placeholderTextColor={palette.muted}
        accessibilityLabel={t('table.join.placeholder')}
        allowFontScaling={allowFontScaling}
        testID="table-join-field"
        style={[
          styles.field,
          { color: palette.ink, backgroundColor: palette.surface, fontSize: size(17) },
        ]}
      />
      {props.notice === 'not_a_link' ? (
        <Words kind="quiet" accessibilityLiveRegion="polite" testID="table-not-a-link">
          {t('table.join.notALink')}
        </Words>
      ) : null}
      <CapsuleButton
        tone="quiet"
        label={t('table.join')}
        hint={t('table.join.hint')}
        disabled={props.busy}
        onPress={() => props.onJoin(pasted)}
        testID="table-join"
      />
      <Section label={t('table.friends')}>
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

export type JoinProblem = Exclude<JoinOutcome, 'name_required' | 'not_signed_in' | 'plus_required'>;

const PROBLEMS = {
  link_ended: ['table.join.ended', 'table.join.ended.sub'],
  full: ['table.join.full', 'table.join.full.sub'],
  banned: ['table.join.banned', 'table.join.banned.sub'],
  unreachable: ['table.join.unreachable', 'table.join.unreachable.sub'],
} as const;

export interface JoinPageProps {
  /** `null` while the seat is being asked for. */
  readonly problem: JoinProblem | null;
  readonly onAgain: () => void;
  readonly onClose: () => void;
}

/** Asking for the seat an invite link points to, and the plain reasons it may not be given. */
export function JoinPage({ problem, onAgain, onClose }: JoinPageProps) {
  const t = useT();
  if (problem === null) {
    return (
      <Page onClose={onClose} testID="table-joining">
        <Words kind="quiet">{t('table.join.seating')}</Words>
      </Page>
    );
  }
  const [title, sub] = PROBLEMS[problem];
  return (
    <Page onClose={onClose} testID={`table-join-${problem}`}>
      <Words kind="title">{t(title)}</Words>
      <Words kind="quiet">{t(sub)}</Words>
      {problem === 'unreachable' ? (
        <CapsuleButton
          tone="quiet"
          label={t('table.join.again')}
          hint={t('table.join.again.hint')}
          onPress={onAgain}
          testID="table-join-again"
        />
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 54,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.body,
  },
});
