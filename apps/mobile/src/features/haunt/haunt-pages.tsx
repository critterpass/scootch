import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { specFromSeed } from '@scootch/art';
import type { MonsterBodyType, MonsterSpec } from '@scootch/domain';

import { HAUNT_DARES, type Friend, type HauntDare } from '../../api/together-api';
import { useT } from '../../i18n/i18n-provider';
import { Page } from '../settings/page';
import { Row, Section, SwitchRow } from '../settings/rows';
import { ActionDock } from '../table/action-dock';
import { Words } from '../table/words';

import { HauntCard } from './haunt-card';
import type { SendProblem } from './haunt-rules';

const PROBLEMS = {
  recent: 'haunt.problem.recent',
  off: 'haunt.problem.off',
  notForThis: 'haunt.problem.notForThis',
  failed: 'table.failed',
} as const;

export interface HauntSendPageProps {
  /** The monster being sent, as this phone knows it; `null` in the moment before it is read. */
  readonly monster: {
    readonly spec: MonsterSpec;
    readonly name: string;
    readonly line: string;
  } | null;
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
  /** Opens the share sheet with the link to the sent haunt's page. */
  readonly onPassOn: () => void;
  readonly onClose: () => void;
}

/**
 * Sending a monster, as the board draws it: its card, "Haunt Kofi?", one card with the dare and
 * whether a name goes with it, and a dock with "Not now" and "Send the haunt". The dare opens
 * into the preset list; with more than one friend who takes haunts, so does who it goes to.
 */
export function HauntSendPage(props: HauntSendPageProps) {
  const t = useT();
  const { friends, to, monster } = props;
  const [open, setOpen] = useState<'who' | 'dare' | null>(null);
  const friend = friends.find((one) => one.accountId === to);
  const name = friend?.displayName ?? null;
  const nobody = friends.length === 0;
  const dock = props.sent ? (
    <ActionDock
      quiet={{
        label: t('settings.close'),
        hint: t('haunt.notNow.hint'),
        onPress: props.onClose,
        testID: 'haunt-done',
      }}
      action={{
        label: t('haunt.link'),
        hint: t('haunt.link.hint'),
        onPress: props.onPassOn,
        testID: 'haunt-pass-on',
      }}
    />
  ) : (
    <ActionDock
      quiet={{
        label: t('haunt.notNow'),
        hint: t('haunt.notNow.hint'),
        onPress: props.onClose,
        testID: 'haunt-not-now',
      }}
      action={
        nobody
          ? undefined
          : {
              label: t('haunt.send'),
              hint: t('haunt.send.hint'),
              disabled: props.busy || to === null,
              onPress: props.onSend,
              testID: 'haunt-send-button',
            }
      }
    />
  );
  return (
    <Page onClose={props.onClose} testID="haunt-send" footer={dock}>
      {monster === null ? null : (
        <HauntCard spec={monster.spec} name={monster.name} line={monster.line} />
      )}
      <View style={styles.said}>
        <Words kind="headline">
          {props.sent
            ? t('haunt.sent')
            : name === null
              ? t('haunt.send.titleNoOne')
              : t('haunt.send.title', { name })}
        </Words>
        <Words kind="quiet" {...(props.sent ? { testID: 'haunt-sent' } : {})}>
          {t(nobody ? 'haunt.noFriends' : 'haunt.send.sub')}
        </Words>
      </View>
      {nobody || props.sent ? null : (
        <Section>
          {friends.length < 2 ? null : (
            <Row
              first
              label={t('haunt.who')}
              value={name ?? ''}
              hint={t('haunt.who.hint')}
              onPress={() => setOpen(open === 'who' ? null : 'who')}
              testID="haunt-who"
            />
          )}
          {open === 'who'
            ? friends.map((one) => (
                <Row
                  key={one.accountId}
                  kind="choice"
                  selected={one.accountId === to}
                  label={one.displayName ?? t('friends.noName')}
                  hint={t('haunt.who.hint')}
                  onPress={() => {
                    props.onTo(one.accountId);
                    setOpen(null);
                  }}
                  testID={`haunt-to-${one.accountId}`}
                />
              ))
            : null}
          <Row
            first={friends.length < 2}
            label={t('haunt.dare')}
            value={`“${t(`haunt.dare.${props.dare}`)}”`}
            hint={t('haunt.dare.hint')}
            onPress={() => setOpen(open === 'dare' ? null : 'dare')}
            testID="haunt-dare"
          />
          {open === 'dare'
            ? HAUNT_DARES.map((dare) => (
                <Row
                  key={dare}
                  kind="choice"
                  selected={dare === props.dare}
                  label={t(`haunt.dare.${dare}`)}
                  hint={t('haunt.dare.hint')}
                  onPress={() => {
                    props.onDare(dare);
                    setOpen(null);
                  }}
                  testID={`haunt-dare-${dare}`}
                />
              ))
            : null}
          <SwitchRow
            label={t('haunt.anonymous')}
            sub={t(props.anonymous ? 'haunt.anonymous.on' : 'haunt.anonymous.off')}
            hint={t('haunt.anonymous.hint')}
            value={props.anonymous}
            onChange={props.onAnonymous}
            testID="haunt-anonymous"
          />
        </Section>
      )}
      {props.problem === null ? null : (
        <Words kind="quiet" accessibilityLiveRegion="polite" testID="haunt-problem">
          {t(PROBLEMS[props.problem])}
        </Words>
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

/**
 * A waiting haunt, as the board draws it: the monster's card carrying the dare, who sent it, and
 * a dock with two equal ways out.
 */
export function HauntReceivedPage(props: HauntReceivedPageProps) {
  const t = useT();
  const spec = useMemo(
    () => specFromSeed(props.bodyType, props.seed),
    [props.bodyType, props.seed],
  );
  const dare = t(`haunt.dare.${props.dare}`);
  return (
    <Page
      onClose={props.onShoo}
      testID="haunt-received"
      footer={
        <ActionDock
          quiet={{
            label: t('haunt.shoo'),
            hint: t('haunt.shoo.hint'),
            disabled: props.busy,
            onPress: props.onShoo,
            testID: 'haunt-shoo',
          }}
          action={{
            label: t('haunt.catch'),
            hint: t('haunt.catch.hint'),
            disabled: props.busy,
            onPress: props.onCatch,
            testID: 'haunt-catch',
          }}
        />
      }
    >
      <HauntCard
        spec={spec}
        name={null}
        line={
          props.from === null
            ? t('haunt.received.says', { dare })
            : t('haunt.card.says', { name: props.from, dare })
        }
      />
      <View style={styles.said}>
        <Words kind="headline">
          {props.from === null
            ? t('haunt.receivedAnonymous')
            : t('haunt.received', { name: props.from })}
        </Words>
        <Words>{t('haunt.received.says', { dare })}</Words>
        <Words kind="quiet">{t('haunt.received.sub')}</Words>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  said: { paddingHorizontal: 12, gap: 10 },
});
