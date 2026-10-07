import { lazy } from 'react';

import { standardVariants, type ScreenState } from './support/screen-state';

/** Settings on a phone signed in for tables: the Tables row carries the seat's name. */
export const settingsTablesRow: ScreenState = {
  id: 'settings-tables-row',
  design: { board: 'Tables', section: '05 Managing tables', screen: 'Settings · Tables row' },
  component: lazy(() =>
    import('../../features/settings/captures').then((captures) => ({
      default: captures.SettingsSignedInForTables,
    })),
  ),
  variants: standardVariants(),
};
