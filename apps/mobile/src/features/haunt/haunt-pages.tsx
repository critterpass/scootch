import { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { specFromSeed } from '@scootch/art';
import type { MonsterBodyType, MonsterSpec } from '@scootch/domain';

import { HAUNT_DARES, type Friend, type HauntDare } from '../../api/together-api';
import { useT } from '../../i18n/i18n-provider';
import { FittedSheet } from '../../ui/fitted-sheet';
import { Section, SwitchRow } from '../settings/rows';
import { Words } from '../table/words';

import { HauntCard } from './haunt-card';
import { ChipChoice, HauntGuide, SheetDock } from './haunt-parts';
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
  /** With nobody to haunt yet: sends a friend link, which is how a friend is made. */
  readonly onInvite?: (() => void) | undefined;
  readonly onClose: () => void;
}

/** Under this height the monster's card is left off, so the sheet stays on a short phone. */
const CARD_FITS_FROM = 760;

/**
 * Sending a monster: its card, "Haunt Kofi?", the dare and whether a name goes with it, and a
 * dock with "Not now" and "Send the haunt". It is a sheet as tall as what is on it, so every
 * choice is in view as chips and nothing opens or closes. With nobody to haunt yet it says what
 * a haunt is, in three steps, and offers the link that makes a friend.
 */
export function HauntSendPage(props: HauntSendPageProps) {
  const t = useT();
  const { height } = useWindowDimensions();
  const { friends, to, monster } = props;
  const friend = friends.find((one) => one.accountId === to);
  const name = friend?.displayName ?? null;
  const nobody = friends.length === 0;
  const notNow = {
    label: t('haunt.notNow'),
    hint: t('haunt.notNow.hint'),
    onPress: props.onClose,
    testID: 'haunt-not-now',
  };
  const dock = props.sent ? (
    <SheetDock
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
  ) : nobody ? (
    <SheetDock
      quiet={notNow}
      {...(props.onInvite === undefined
        ? {}
        : {
            action: {
              label: t('table.invite'),
              hint: t('friends.invite.hint'),
              onPress: props.onInvite,
              testID: 'haunt-invite',
            },
          })}
    />
  ) : (
    <SheetDock
      quiet={notNow}
      action={{
        label: t('haunt.send'),
        hint: t('haunt.send.hint'),
        disabled: props.busy || to === null,
        onPress: props.onSend,
        testID: 'haunt-send-button',
      }}
    />
  );
  return (
    <FittedSheet
      testID="haunt-send"
      close={{
        label: t('settings.close'),
        hint: t('settings.close.hint'),
        onPress: props.onClose,
        testID: 'haunt-send-close',
      }}
      footer={dock}
    >
      {monster === null || height < CARD_FITS_FROM ? null : (
        <HauntCard spec={monster.spec} name={monster.name} line={monster.line} />
      )}
      <View style={styles.said}>
        <Words kind="headline">
          {props.sent
            ? t('haunt.sent')
            : nobody
              ? t('haunt.noFriends.title')
              : name === null
                ? t('haunt.send.titleNoOne')
                : t('haunt.send.title', { name })}
        </Words>
        {props.sent ? (
          <Words kind="quiet" testID="haunt-sent">
            {t('haunt.send.sub')}
          </Words>
        ) : nobody ? null : (
          <Words kind="quiet">{t('haunt.send.sub')}</Words>
        )}
      </View>
      {nobody && !props.sent ? (
        <HauntGuide
          steps={[t('haunt.guide.invite'), t('haunt.guide.send'), t('haunt.guide.theirs')]}
        />
      ) : null}
      {nobody || props.sent ? null : (
        <>
          {friends.length < 2 ? null : (
            <ChipChoice
              label={t('haunt.who')}
              hint={t('haunt.who.hint')}
              chosen={to}
              choices={friends.map((one) => ({
                value: one.accountId,
                label: one.displayName ?? t('friends.noName'),
              }))}
              onChoose={props.onTo}
              testPrefix="haunt-to"
            />
          )}
          <ChipChoice
            label={t('haunt.dare')}
            hint={t('haunt.dare.hint')}
            chosen={props.dare}
            choices={HAUNT_DARES.map((dare) => ({
              value: dare,
              label: t(`haunt.dare.${dare}`),
            }))}
            onChoose={props.onDare}
            testPrefix="haunt-dare"
          />
          <Section>
            <SwitchRow
              first
              label={t('haunt.anonymous')}
              sub={t(props.anonymous ? 'haunt.anonymous.on' : 'haunt.anonymous.off')}
              hint={t('haunt.anonymous.hint')}
              value={props.anonymous}
              onChange={props.onAnonymous}
              testID="haunt-anonymous"
            />
          </Section>
        </>
      )}
      {props.problem === null ? null : (
        <Words kind="quiet" accessibilityLiveRegion="polite" testID="haunt-problem">
          {t(PROBLEMS[props.problem])}
        </Words>
      )}
    </FittedSheet>
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
  const { height } = useWindowDimensions();
  return (
    <FittedSheet
      testID="haunt-received"
      close={{
        label: t('haunt.shoo'),
        hint: t('haunt.shoo.hint'),
        onPress: props.onShoo,
        testID: 'haunt-received-close',
      }}
      footer={
        <SheetDock
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
      {height < CARD_FITS_FROM ? null : (
        <HauntCard
          spec={spec}
          name={null}
          line={
            props.from === null
              ? t('haunt.received.says', { dare })
              : t('haunt.card.says', { name: props.from, dare })
          }
        />
      )}
      <View style={styles.said}>
        <Words kind="headline">
          {props.from === null
            ? t('haunt.receivedAnonymous')
            : t('haunt.received', { name: props.from })}
        </Words>
        <Words>{t('haunt.received.says', { dare })}</Words>
        <Words kind="quiet">{t('haunt.received.sub')}</Words>
      </View>
    </FittedSheet>
  );
}

const styles = StyleSheet.create({
  // The close control floats in the trailing corner: the words keep clear of it when there is
  // no card above them.
  said: { gap: 10, paddingRight: 44 },
});
