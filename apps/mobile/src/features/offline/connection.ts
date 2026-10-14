import * as Network from 'expo-network';
import { useSyncExternalStore } from 'react';

import { pretendOffline } from './pretend-offline';

export type NetworkState = Network.NetworkState;

/** What the phone reports with no network at all. */
export const NO_NETWORK: NetworkState = {
  type: Network.NetworkStateType.NONE,
  isConnected: false,
  isInternetReachable: false,
};

/**
 * The app's one reader of the connection: the phone's own, unless the developer switch pretends
 * there is none. Everything that asks whether the phone is online asks here, never expo-network.
 */
export async function getNetworkStateAsync(): Promise<NetworkState> {
  if (pretendOffline.isOn()) return NO_NETWORK;
  return Network.getNetworkStateAsync();
}

/**
 * Told each time the connection changes. While the switch is on the phone's own changes are not
 * passed on; turning it on reports no network, and turning it off reports what the phone has.
 */
export function addNetworkStateListener(listener: (state: NetworkState) => void): {
  remove: () => void;
} {
  const phone = Network.addNetworkStateListener((state) => {
    if (!pretendOffline.isOn()) listener(state);
  });
  const stop = pretendOffline.subscribe((on) => {
    if (on) listener(NO_NETWORK);
    else void getNetworkStateAsync().then(listener, () => undefined);
  });
  return {
    remove: () => {
      phone.remove();
      stop();
    },
  };
}

const subscribe = (changed: () => void) => pretendOffline.subscribe(changed);

/** The connection as a screen shows it, the hook form of the reader above. */
export function useNetworkState(): NetworkState {
  const phone = Network.useNetworkState();
  const pretending = useSyncExternalStore(subscribe, pretendOffline.isOn, pretendOffline.isOn);
  return pretending ? NO_NETWORK : phone;
}
