import { QuietedPage } from './quieted-page';
import { DEFAULT_TABLE_PREFS } from './table-prefs';
import { TablesSettingsPage, type TablesSettingsPageProps } from './tables-settings-page';

// Settings › Tables and the page behind it, as the screen registry shows them: the real views
// with fixed state and no server behind them.

const nothing = () => undefined;
const SIGNED_IN = { name: 'Priya', whoCanSit: 'friends', friends: 3, quieted: 1 } as const;
const TablesSettings = (props: Pick<TablesSettingsPageProps, 'account'> & { asking?: boolean }) => (
  <TablesSettingsPage
    account={props.account}
    asking={props.asking === true}
    prefs={DEFAULT_TABLE_PREFS}
    notice={null}
    onPref={nothing}
    onWhoCanSit={nothing}
    onSignIn={nothing}
    onRename={nothing}
    onFriends={nothing}
    onQuieted={nothing}
    onSignOut={nothing}
    onAskDelete={nothing}
    onKeep={nothing}
    onDelete={nothing}
    onClose={nothing}
  />
);

export const TABLE_SETTINGS_CAPTURES = {
  'tables-settings': () => <TablesSettings account={SIGNED_IN} />,
  'tables-delete-account': () => <TablesSettings account={SIGNED_IN} asking />,
  'tables-quieted': () => (
    <QuietedPage
      muted={[{ accountId: 'dddddddddddd', displayName: 'Mei' }]}
      blocked={[]}
      failed={false}
      onUnmute={nothing}
      onUnblock={nothing}
      onClose={nothing}
    />
  ),
  'tables-settings-signed-out': () => <TablesSettings account={null} />,
} as const;
