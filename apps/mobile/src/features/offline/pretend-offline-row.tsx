import { useSyncExternalStore } from 'react';

import { SwitchRow } from '../settings/rows';

import { PRETEND_OFFLINE, pretendOffline } from './pretend-offline';

const subscribe = (changed: () => void) => pretendOffline.subscribe(changed);

/**
 * The developer switch that makes the app behave as with no network, under the developer tools
 * row of Settings. Settings shows it only where the developer tools are allowed.
 */
export function PretendOfflineRow() {
  const on = useSyncExternalStore(subscribe, pretendOffline.isOn, pretendOffline.isOn);
  return (
    <SwitchRow
      label={PRETEND_OFFLINE.label}
      hint={PRETEND_OFFLINE.hint}
      value={on}
      onChange={pretendOffline.set}
      testID="dev-pretend-offline"
    />
  );
}
