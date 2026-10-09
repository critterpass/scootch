import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing } from '@scootch/tokens';

import type { WhoCanSit } from '../../api/together-api';
import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton, GlassDock } from '../../ui/buttons';
import { useScreenStyle } from '../../ui/use-screen-style';
import { AppleSignInButton } from '../account/apple-sign-in-button';
import { Page } from '../settings/page';
import { Note, Row, Section, SwitchRow } from '../settings/rows';
import { Segmented } from '../zoo/ui/segmented';

import { CritterAvatar } from './critter-avatar';
import type { TablePrefs } from './table-prefs';
import { Words } from './words';

/** What Settings › Tables knows of the account once it has been read. */
export interface TablesAccount {
  readonly name: string | null;
  readonly whoCanSit: WhoCanSit;
  readonly friends: number;
  /** People the person muted or blocked, together. */
  readonly quieted: number;
}

export interface TablesSettingsPageProps {
  /** `null` on a phone that is not signed in, `undefined` until the account has been read. */
  readonly account: TablesAccount | null | undefined;
  readonly prefs: TablePrefs;
  readonly notice: 'sign_in_failed' | 'sign_out_failed' | 'delete_failed' | 'failed' | null;
  /** Apple's sign-in sheet is up. */
  readonly signingIn?: boolean;
  /** The question before the account is deleted is on the screen. */
  readonly asking: boolean;
  readonly onPref: (key: keyof TablePrefs, on: boolean) => void;
  readonly onWhoCanSit: (who: WhoCanSit) => void;
  readonly onSignIn: () => void;
  readonly onRename: () => void;
  readonly onFriends: () => void;
  readonly onQuieted: () => void;
  readonly onSignOut: () => void;
  readonly onAskDelete: () => void;
  readonly onKeep: () => void;
  readonly onDelete: () => void;
  readonly onClose: () => void;
}

const PROMISES = ['firstName', 'tasks', 'once'] as const;

const NOTICES = {
  sign_in_failed: 'account.apple.failed',
  sign_out_failed: 'account.signOut.failed',
  delete_failed: 'settings.tables.delete.failed',
  failed: 'table.failed',
} as const;

/**
 * Everything about tables in one place, as the board draws it: the name a seat shows, who can sit
 * down, what the table sees, the people the person knows, and the account's two ways out, worded
 * plainly. Signed out, it says tables are off, makes the three promises a sign-in makes, and signs
 * in from here: the button opens Apple's sheet at once.
 */
export function TablesSettingsPage(props: TablesSettingsPageProps) {
  const t = useT();
  const { account, prefs } = props;
  return (
    <>
      <Page
        title={t('settings.tables')}
        onClose={props.onClose}
        testID="table-settings"
        {...(account === null
          ? {
              footer: (
                <GlassDock>
                  <AppleSignInButton
                    disabled={props.signingIn === true}
                    onPress={props.onSignIn}
                    testID="table-settings-sign-in"
                  />
                </GlassDock>
              ),
            }
          : {})}
      >
        {account === undefined ? null : account === null ? (
          <>
            <Words kind="quiet" testID="table-settings-off">
              {t('settings.tables.signedOut')}
            </Words>
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
          </>
        ) : (
          <>
            <Section>
              <Row
                first
                leading={<CritterAvatar seed="you" size={56} tone="tomato" />}
                label={account.name ?? t('friends.noName')}
                sub={t('settings.tables.signedIn')}
                hint={t('settings.tables.rename.hint')}
                onPress={props.onRename}
                testID="table-settings-account"
              />
            </Section>
            <View style={styles.who}>
              <Section label={t('settings.tables.whoCanSit')}>
                <View style={styles.segmented}>
                  <Segmented
                    label={t('settings.tables.whoCanSit')}
                    chosen={account.whoCanSit}
                    onChoose={props.onWhoCanSit}
                    segments={[
                      {
                        value: 'friends',
                        label: t('table.friends'),
                        testID: 'table-settings-who-friends',
                      },
                      {
                        value: 'nobody',
                        label: t('settings.tables.nobody'),
                        testID: 'table-settings-who-nobody',
                      },
                    ]}
                  />
                </View>
              </Section>
              <Note
                text={t(`settings.tables.whoCanSit.${account.whoCanSit}`)}
                testID="table-settings-who-note"
              />
            </View>
          </>
        )}
        <Section label={t('settings.tables.atTheTable')}>
          <SwitchRow
            first
            label={t('table.showLabel')}
            sub={t('table.showLabel.sub')}
            hint={t('table.showLabel.hint')}
            value={prefs.showLabel}
            onChange={(on) => props.onPref('showLabel', on)}
            testID="table-settings-show-label"
          />
          <SwitchRow
            label={t('settings.tables.allowNudges')}
            sub={t('settings.tables.allowNudges.sub')}
            hint={t('settings.tables.allowNudges.hint')}
            value={prefs.allowNudges}
            onChange={(on) => props.onPref('allowNudges', on)}
            testID="table-settings-allow-nudges"
          />
        </Section>
        {account ? (
          <>
            <Section label={t('settings.people')}>
              <Row
                first
                label={t('table.friends')}
                hint={t('table.friends.hint')}
                value={String(account.friends)}
                onPress={props.onFriends}
                testID="table-settings-friends"
              />
              <Row
                label={t('settings.tables.quieted')}
                hint={t('settings.tables.quieted.hint')}
                value={String(account.quieted)}
                onPress={props.onQuieted}
                testID="table-settings-quieted"
              />
            </Section>
            <Section>
              <Row
                first
                label={t('account.signOut')}
                hint={t('account.signOut.hint')}
                onPress={props.onSignOut}
                testID="table-settings-sign-out"
              />
              <Row
                danger
                label={t('settings.tables.delete')}
                hint={t('settings.tables.delete.hint')}
                onPress={props.onAskDelete}
                testID="table-settings-delete"
              />
            </Section>
          </>
        ) : null}
        {props.notice === null ? null : (
          <Note text={t(NOTICES[props.notice])} testID="table-settings-notice" />
        )}
      </Page>
      <DeleteTableAccountSheet
        open={props.asking}
        onKeep={props.onKeep}
        onDelete={props.onDelete}
      />
    </>
  );
}

interface DeleteTableAccountSheetProps {
  readonly open: boolean;
  readonly onKeep: () => void;
  readonly onDelete: () => void;
}

/**
 * The question before the table account goes. It says first what stays, then what goes; only the
 * social side is deleted, and keeping it is as easy as deleting it.
 */
function DeleteTableAccountSheet({ open, onKeep, onDelete }: DeleteTableAccountSheetProps) {
  const t = useT();
  const { palette } = useScreenStyle();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onKeep}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('settings.tables.delete.keep')}
        accessibilityHint={t('table.ok.hint')}
        onPress={onKeep}
        style={styles.shade}
      />
      <View
        accessibilityViewIsModal
        testID="table-delete-sheet"
        style={[styles.sheet, { backgroundColor: palette.page }]}
      >
        <View style={[styles.grabber, { backgroundColor: `${palette.ink}33` }]} />
        <Words kind="title" centred>
          {t('settings.tables.delete.title')}
        </Words>
        <Words kind="quiet" centred>
          {t('settings.tables.delete.body')}
        </Words>
        <Section>
          <Row
            first
            danger
            label={t('settings.tables.delete')}
            hint={t('settings.tables.delete.confirm.hint')}
            onPress={onDelete}
            testID="table-delete-confirm"
          />
        </Section>
        <CapsuleButton
          tone="quiet"
          label={t('settings.tables.delete.keep')}
          hint={t('table.ok.hint')}
          onPress={onKeep}
          testID="table-delete-keep"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  who: { gap: spacing.sm },
  segmented: { padding: 6 },
  shade: { flex: 1, backgroundColor: 'rgba(28,26,23,0.28)' },
  sheet: {
    borderTopLeftRadius: radius.lg + 8,
    borderTopRightRadius: radius.lg + 8,
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3 },
});
