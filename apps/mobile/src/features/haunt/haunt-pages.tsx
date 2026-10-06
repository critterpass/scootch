import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { specFromSeed } from '@scootch/art';
import type { MonsterBodyType } from '@scootch/domain';
import { spacing } from '@scootch/tokens';

import { HAUNT_DARES, type Friend, type HauntDare } from '../../api/together-api';
import { Monster } from '../../art/Monster';
import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Page } from '../settings/page';
import { Row, Section, SwitchRow } from '../settings/rows';
import { Words } from '../table/words';

import type { SendProblem } from './haunt-rules';

const PROBLEMS = {
  recent: 'haunt.problem.recent',
  off: 'haunt.problem.off',
  notForThis: 'haunt.problem.notForThis',
  failed: 'table.failed',
} as const;

export interface HauntSendPageProps {
  /** Friends who take haunts. */
  readonly friends: readonly Friend[];
  readonly to: string | null;
  readonly dare: HauntDare;
  readonly anonymous: boolean;
  readonly busy: boolean;
  readonly sent: boolean;
  readonly problem: SendProblem | null;
  readonly onTo: (accountId: string) => void;
  readonly onDare: (dare: HauntDare) => void;
  readonly onAnonymous: (anonymous: boolean) => void;
  readonly onSend: () => void;
  readonly onClose: () => void;
}

/** Sending a monster: a friend, one of the preset dares, and whether a name goes with it. */
export function HauntSendPage(props: HauntSendPageProps) {
  const t = useT();
  const { friends, to } = props;
  const friend = friends.find((one) => one.accountId === to);
  const name = friend?.displayName ?? null;
  return (
    <Page onClose={props.onClose} testID="haunt-send">
      <Words kind="title">
        {name === null ? t('haunt.send.titleNoOne') : t('haunt.send.title', { name })}
      </Words>
      <Words kind="quiet">{t(friends.length === 0 ? 'haunt.noFriends' : 'haunt.send.sub')}</Words>
      {friends.length === 0 ? null : (
        <>
          <Section label={t('haunt.who')}>
            {friends.map((one, index) => (
              <Row
                key={one.accountId}
                first={index === 0}
                kind="choice"
                selected={one.accountId === to}
                label={one.displayName ?? t('friends.noName')}
                hint={t('haunt.who.hint')}
                onPress={() => props.onTo(one.accountId)}
                testID={`haunt-to-${one.accountId}`}
              />
            ))}
          </Section>
          <Section label={t('haunt.dare')}>
            {HAUNT_DARES.map((dare, index) => (
              <Row
                key={dare}
                first={index === 0}
                kind="choice"
                selected={dare === props.dare}
                label={t(`haunt.dare.${dare}`)}
                hint={t('haunt.dare.hint')}
                onPress={() => props.onDare(dare)}
                testID={`haunt-dare-${dare}`}
              />
            ))}
            <SwitchRow
              label={t('haunt.anonymous')}
              sub={t(props.anonymous ? 'haunt.anonymous.on' : 'haunt.anonymous.off')}
              hint={t('haunt.anonymous.hint')}
              value={props.anonymous}
              onChange={props.onAnonymous}
              testID="haunt-anonymous"
            />
          </Section>
          {props.sent ? (
            <Words accessibilityLiveRegion="polite" testID="haunt-sent">
              {t('haunt.sent')}
            </Words>
          ) : (
            <CapsuleButton
              label={t('haunt.send')}
              hint={t('haunt.send.hint')}
              disabled={props.busy || to === null}
              onPress={props.onSend}
              testID="haunt-send-button"
            />
          )}
          {props.problem === null ? null : (
            <Words kind="quiet" accessibilityLiveRegion="polite" testID="haunt-problem">
              {t(PROBLEMS[props.problem])}
            </Words>
          )}
        </>
      )}
      {props.sent ? null : (
        <CapsuleButton
          tone="quiet"
          label={t('haunt.notNow')}
          hint={t('haunt.notNow.hint')}
          onPress={props.onClose}
          testID="haunt-not-now"
        />
      )}
    </Page>
  );
}

export interface HauntReceivedPageProps {
  readonly bodyType: MonsterBodyType;
  readonly seed: string;
  readonly dare: HauntDare;
  /** The sender's name; `null` for an anonymous haunt. */
  readonly from: string | null;
  readonly busy: boolean;
  readonly onCatch: () => void;
  readonly onShoo: () => void;
}

/** A waiting haunt: the monster, who sent it, the dare, and two equal ways out. */
export function HauntReceivedPage(props: HauntReceivedPageProps) {
  const t = useT();
  const { largeText } = useScreenStyle();
  const spec = useMemo(
    () => specFromSeed(props.bodyType, props.seed),
    [props.bodyType, props.seed],
  );
  return (
    <Page onClose={props.onShoo} testID="haunt-received">
      <View
        style={styles.figure}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Monster spec={spec} size={largeText ? 120 : 200} />
      </View>
      <Words kind="title">
        {props.from === null
          ? t('haunt.receivedAnonymous')
          : t('haunt.received', { name: props.from })}
      </Words>
      <Words>{t('haunt.received.says', { dare: t(`haunt.dare.${props.dare}`) })}</Words>
      <Words kind="quiet">{t('haunt.received.sub')}</Words>
      <View style={styles.choices}>
        <CapsuleButton
          tone="quiet"
          label={t('haunt.shoo')}
          hint={t('haunt.shoo.hint')}
          disabled={props.busy}
          onPress={props.onShoo}
          testID="haunt-shoo"
          style={styles.choice}
        />
        <CapsuleButton
          label={t('haunt.catch')}
          hint={t('haunt.catch.hint')}
          disabled={props.busy}
          onPress={props.onCatch}
          testID="haunt-catch"
          style={styles.choice}
        />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  figure: { alignItems: 'center' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { flexGrow: 1, flexBasis: 140 },
});
