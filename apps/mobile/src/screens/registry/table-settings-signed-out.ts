import { togetherState } from '../../features/table/registry/together-state';

/** Settings, Tables, on a phone that is not signed in: tables are off, and it signs in from here. */
export const tableSettingsSignedOut = togetherState({
  id: 'table-settings-signed-out',
  design: null,
  undesignedReason:
    'The board says the signed-out row reads "Off" and opens the same sign-in, but draws only the signed-in page',
  capture: 'tables-settings-signed-out',
});
