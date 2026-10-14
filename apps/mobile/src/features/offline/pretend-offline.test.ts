import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { ApiClientError } from '../../api/api-error';
import { createHttpClient } from '../../api/http-client';

import { addNetworkStateListener, getNetworkStateAsync, NO_NETWORK } from './connection';
import { pretendOffline } from './pretend-offline';

// The phone's own reader is a native module: here it is a phone on wifi whose changes the test sends.
const mockPhone = {
  state: { type: 'WIFI', isConnected: true, isInternetReachable: true },
  listeners: new Set<(state: unknown) => void>(),
};
jest.mock('expo-network', () => ({
  NetworkStateType: { NONE: 'NONE', WIFI: 'WIFI' },
  getNetworkStateAsync: () => Promise.resolve(mockPhone.state),
  addNetworkStateListener: (listener: (state: unknown) => void) => {
    mockPhone.listeners.add(listener);
    return { remove: () => mockPhone.listeners.delete(listener) };
  },
}));
const phoneChanged = () => mockPhone.listeners.forEach((listener) => listener(mockPhone.state));

const BASE_URL = 'https://api.test';
const TOKEN = 'a'.repeat(43);

/** A server that answers every request with `{ ok: true }`, and counts what reached it. */
function countingServer() {
  const server = { reached: 0 };
  const fetchFake = (() => {
    server.reached += 1;
    return Promise.resolve(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }) as typeof fetch;
  const http = createHttpClient({
    baseUrl: BASE_URL,
    fetch: fetchFake,
    tokens: { read: () => Promise.resolve(TOKEN), write: () => Promise.resolve() },
    language: () => 'en',
  });
  return { server, http };
}

const ok = (json: unknown) => (json as { ok: boolean }).ok;

afterEach(() => pretendOffline.set(false));

describe('pretending to be offline', () => {
  it('fails every API call as a network error, and nothing reaches the server', async () => {
    const { server, http } = countingServer();
    pretendOffline.set(true);

    const post = http.post('/v1/tasks', { text: 'Email the dentist' }, ok);
    await expect(post).rejects.toBeInstanceOf(ApiClientError);
    await expect(post).rejects.toMatchObject({ code: 'network', status: null });
    await expect(http.request('GET', '/v1/me', null, ok)).rejects.toMatchObject({
      code: 'network',
    });
    expect(server.reached).toBe(0);

    pretendOffline.set(false);
    await expect(http.post('/v1/tasks', {}, ok)).resolves.toBe(true);
    expect(server.reached).toBe(1);
  });

  it('fails the first registration too, so a new phone gets no token', async () => {
    let reached = 0;
    const http = createHttpClient({
      baseUrl: BASE_URL,
      fetch: () => {
        reached += 1;
        return Promise.reject(new Error('not expected'));
      },
      tokens: { read: () => Promise.resolve(null), write: () => Promise.resolve() },
      language: () => 'en',
    });
    pretendOffline.set(true);

    await expect(http.post('/v1/tasks', {}, ok)).rejects.toMatchObject({ code: 'network' });
    expect(reached).toBe(0);
  });

  it('makes the connection reader report no network while the phone has one', async () => {
    await expect(getNetworkStateAsync()).resolves.toMatchObject({ isInternetReachable: true });

    pretendOffline.set(true);
    const state = await getNetworkStateAsync();
    expect(state).toEqual(NO_NETWORK);
    expect(state.isInternetReachable ?? state.isConnected).toBe(false);
  });

  it('tells a listener the connection went and came back, and holds the phone back meanwhile', async () => {
    const heard: boolean[] = [];
    const listening = addNetworkStateListener((state) => {
      heard.push(state.isInternetReachable ?? state.isConnected ?? false);
    });

    pretendOffline.set(true);
    expect(heard).toEqual([false]);
    // The phone's own wifi changing does not reach anyone while the switch is on.
    phoneChanged();
    expect(heard).toEqual([false]);

    // Turned off, the listener hears what the phone itself reports, so the app sees it return.
    pretendOffline.set(false);
    await new Promise((settled) => setImmediate(settled));
    expect(heard).toEqual([false, true]);

    listening.remove();
    pretendOffline.set(true);
    phoneChanged();
    expect(heard).toEqual([false, true]);
  });
});
