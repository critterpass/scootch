import type { Language } from '@scootch/domain';

import { apiBaseUrl, keychainTokenStore } from './api-config';
import { createHttpClient, type HttpClient } from './http-client';

let shared: HttpClient | null = null;

/**
 * The app's one HTTP client. Everything that calls the API shares it, so a new phone registers
 * its device once however many callers ask at the same moment. `language` is the language the
 * device registers with, read from whoever builds the client first.
 */
export function appHttp(language: () => Language): HttpClient {
  shared ??= createHttpClient({
    baseUrl: apiBaseUrl(),
    fetch: (input, init) => fetch(input, init),
    tokens: keychainTokenStore,
    language,
  });
  return shared;
}
