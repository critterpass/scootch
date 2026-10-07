import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { fonts, spacing } from '@scootch/tokens';

import { Scootch } from '../../art/Scootch';
import { useT } from '../../i18n/i18n-provider';
import { useScreenStyle } from '../../ui/use-screen-style';
import { Page } from '../settings/page';
import { Note, Row, Section, SwitchRow } from '../settings/rows';
import { ActionDock } from '../table/action-dock';
import { OpenSeat, Seat } from '../table/seat';
import { Words } from '../table/words';

import { tidyName, type NameProblem } from './account-flow';

/** The quiet way on from a page that asks for an account. */
export interface WayOn {
  /** True when a start is waiting: the way on starts it alone. Otherwise it only closes. */
  readonly startsAlone: boolean;
  readonly onPress: () => void;
}

/** The quiet way on, as a dock's quiet choice. */
function useWayOn(way: WayOn) {
  const t = useT();
  return {
    label: t(way.startsAlone ? 'account.notNow.alone' : 'haunt.notNow'),
    hint: t(way.startsAlone ? 'account.notNow.alone.hint' : 'account.notNow.hint'),
    onPress: way.onPress,
    testID: 'account-not-now',
  };
}

export interface SignInPageProps {
  readonly busy: boolean;
  readonly failed: boolean;
  readonly onSignIn: () => void;
  readonly wayOn: WayOn;
  readonly onClose: () => void;
}

const PROMISES = ['firstName', 'tasks', 'once'] as const;

/**
 * The one place an account is asked for: the first time a table is involved, never at first
 * launch. Three promises, one button, and a way on that needs no account.
 */
export function SignInPage({ busy, failed, onSignIn, wayOn, onClose }: SignInPageProps) {
  const t = useT();
  const { largeText } = useScreenStyle();
  const quiet = useWayOn(wayOn);
  return (
    <Page
      onClose={onClose}
      testID="account-sign-in"
      footer={
        <ActionDock
          quiet={quiet}
          action={{
            label: t('account.apple'),
            hint: t('account.apple.hint'),
            disabled: busy,
            onPress: onSignIn,
            testID: 'account-apple',
          }}
        />
      }
    >
      {largeText ? null : (
        <View
          style={styles.figure}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Scootch mood="waiting" reducedMotion size={140} />
        </View>
      )}
      <View style={styles.said}>
        <Words kind="headline">{t('account.title')}</Words>
      </View>
      <Section>
        {PROMISES.map((promise, index) => (
          <Row
            key={promise}
            first={index === 0}
            kind="fact"
            label={t(`account.promise.${promise}`)}
            sub={t(`account.promise.${promise}.sub`)}
          />
        ))}
      </Section>
      {failed ? (
        <Words kind="quiet" accessibilityLiveRegion="polite" testID="account-failed">
          {t('account.apple.failed')}
        </Words>
      ) : null}
    </Page>
  );
}

export interface SignInCancelledPageProps {
  /** The set task's own words, on its own phone; `null` with none set. */
  readonly taskText: string | null;
  readonly onAgain: () => void;
  readonly wayOn: WayOn;
  readonly onClose: () => void;
}

/**
 * Apple's sheet was closed. It is never a dead end: the task is still set, and it starts alone
 * from here.
 */
export function SignInCancelledPage(props: SignInCancelledPageProps) {
  const t = useT();
  const { largeText } = useScreenStyle();
  const quiet = useWayOn(props.wayOn);
  const again = {
    label: t('table.join.again'),
    hint: t('account.apple.hint'),
    onPress: props.onAgain,
    testID: 'account-again',
  };
  return (
    <Page
      onClose={props.onClose}
      testID="account-cancelled"
      footer={
        props.wayOn.startsAlone ? (
          <ActionDock
            quiet={again}
            action={{
              label: t('account.cancelled.alone'),
              hint: t('account.notNow.alone.hint'),
              onPress: props.wayOn.onPress,
              testID: 'account-start-alone',
            }}
          />
        ) : (
          <ActionDock quiet={quiet} action={again} />
        )
      }
    >
      {largeText ? null : (
        <View
          style={styles.figure}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Scootch mood="waiting" reducedMotion size={140} />
        </View>
      )}
      <View style={styles.said}>
        <Words kind="headline">{t('account.cancelled.title')}</Words>
        <Words kind="quiet">
          {props.taskText === null
            ? t('account.cancelled.sub')
            : t('account.cancelled.subTask', { task: props.taskText })}
        </Words>
      </View>
    </Page>
  );
}

export interface NamePageProps {
  readonly busy: boolean;
  /** Why the last name was not kept, said plainly under the field. */
  readonly problem: NameProblem | null;
  /** What the field starts with: a first name from Apple, or nothing. */
  readonly suggested?: string;
  /** Whether a seat shows its one or two words; unset, the switch is not drawn. */
  readonly showLabel?: boolean;
  readonly onShowLabel?: (shown: boolean) => void;
  readonly onSave: (name: string) => void;
  readonly onClose: () => void;
}

const PROBLEMS = {
  length: 'account.name.length',
  refused: 'account.name.refused',
  unchecked: 'account.name.unchecked',
} as const;

/**
 * Choosing the name a seat shows, with the seat drawn as the table will see it. The server
 * screens the name; its refusal is shown as it is.
 */
export function NamePage(props: NamePageProps) {
  const { busy, problem, onSave, onClose, showLabel, onShowLabel } = props;
  const t = useT();
  const { palette, allowFontScaling, size, largeText } = useScreenStyle();
  const [name, setName] = useState(props.suggested ?? '');
  const shown = tidyName(name);
  return (
    <Page
      onClose={onClose}
      testID="account-name"
      footer={
        <ActionDock
          action={{
            label: t('account.name.save'),
            hint: t('account.name.save.hint'),
            disabled: busy,
            onPress: () => onSave(name),
            testID: 'account-name-save',
          }}
        />
      }
    >
      <View style={styles.said}>
        <Words kind="headline">{t('account.name.title')}</Words>
      </View>
      <TextInput
        value={name}
        onChangeText={setName}
        maxLength={40}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => onSave(name)}
        placeholder={t('account.name.placeholder')}
        placeholderTextColor={palette.muted}
        accessibilityLabel={t('account.name.title')}
        allowFontScaling={allowFontScaling}
        testID="account-name-field"
        style={[
          styles.field,
          { color: palette.ink, backgroundColor: palette.surface, fontSize: size(26) },
        ]}
      />
      <Note text={t(props.suggested ? 'account.name.fromApple' : 'account.name.sub')} />
      {problem === null ? null : (
        <Words kind="quiet" accessibilityLiveRegion="polite" testID="account-name-problem">
          {t(PROBLEMS[problem])}
        </Words>
      )}
      {largeText ? null : (
        <Section label={t('account.name.preview')}>
          <View
            accessible
            accessibilityLabel={shown}
            pointerEvents="none"
            style={[styles.preview, { backgroundColor: palette.risoBlob }]}
            testID="account-name-preview"
          >
            <Seat
              seat={{
                userId: 'preview',
                name: shown === '' ? t('account.name.placeholder') : shown,
                label: showLabel === false ? '' : t('account.name.preview.label'),
                workMode: null,
                online: true,
                nudgesLeft: 0,
              }}
              yours={false}
              size={96}
            />
            <OpenSeat size={96} />
          </View>
        </Section>
      )}
      {showLabel === undefined || onShowLabel === undefined ? null : (
        <Section>
          <SwitchRow
            first
            label={t('table.showLabel')}
            sub={t('table.showLabel.sub')}
            hint={t('table.showLabel.hint')}
            value={showLabel}
            onChange={onShowLabel}
            testID="account-show-label"
          />
        </Section>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  figure: { alignItems: 'center' },
  said: { paddingHorizontal: 12 },
  preview: { flexDirection: 'row', padding: spacing.sm, gap: spacing.sm, borderRadius: 28 },
  field: {
    minHeight: 64,
    borderRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontFamily: fonts.heading,
    fontWeight: '700',
  },
});
