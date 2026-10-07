import { useT } from '../../i18n/i18n-provider';
import { CapsuleButton } from '../../ui/buttons';
import { Page } from '../settings/page';
import { Note, Row, Section, SwitchRow } from '../settings/rows';

import type { TablePrefs } from './table-prefs';
import { Words } from './words';

export interface TablesSettingsPageProps {
  /**
   * The account tables use: `null` on a phone that is not signed in, `undefined` until it has
   * been read.
   */
  readonly account: { readonly name: string | null; readonly friends: number } | null | undefined;
  readonly prefs: TablePrefs;
  readonly notice: 'sign_out_failed' | null;
  readonly onPref: (key: keyof TablePrefs, on: boolean) => void;
  readonly onSignIn: () => void;
  readonly onFriends: () => void;
  readonly onSignOut: () => void;
  readonly onClose: () => void;
}

/**
 * Everything about tables in one place: the name a seat shows, what the table sees, the person's
 * friends, and signing out. Signed out, it says tables are off and offers the same sign-in a
 * table would. Tables are for friends at launch, so nothing here chooses who may sit.
 */
export function TablesSettingsPage(props: TablesSettingsPageProps) {
  const t = useT();
  const { account, prefs } = props;
  return (
    <Page title={t('settings.tables')} onClose={props.onClose} testID="table-settings">
      {account === undefined ? null : account === null ? (
        <>
          <Words kind="quiet" testID="table-settings-off">
            {t('settings.tables.signedOut')}
          </Words>
          <CapsuleButton
            label={t('account.apple')}
            hint={t('account.apple.hint')}
            onPress={props.onSignIn}
            testID="table-settings-sign-in"
          />
        </>
      ) : (
        <Section>
          <Row
            first
            kind="fact"
            label={account.name ?? t('friends.noName')}
            sub={t('settings.tables.signedIn')}
            testID="table-settings-account"
          />
        </Section>
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
          </Section>
          <Section>
            <Row
              first
              label={t('account.signOut')}
              hint={t('account.signOut.hint')}
              onPress={props.onSignOut}
              testID="table-settings-sign-out"
            />
          </Section>
          {props.notice === 'sign_out_failed' ? (
            <Note text={t('account.signOut.failed')} testID="table-settings-notice" />
          ) : null}
        </>
      ) : null}
    </Page>
  );
}
