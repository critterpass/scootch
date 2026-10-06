import type { Language } from '@scootch/domain';

import { ApiClientError, asApiError, errorFromResponse } from './api-error';

/** Where the anonymous device token lives. The app keeps it in the keychain; tests use a fake. */
export interface TokenStore {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
}

export interface HttpClientOptions {
  readonly baseUrl: string;
  readonly fetch: typeof fetch;
  readonly tokens: TokenStore;
  /** The language the device is registered with. */
  readonly language: () => Language;
  readonly timeoutMs?: number;
}

export interface PostOptions {
  readonly timeoutMs?: number;
}

export interface HttpClient {
  /** A POST as a registered device. `parse` checks the answer against its contract schema. */
  post<T>(
    path: string,
    body: unknown,
    parse: (json: unknown) => T,
    options?: PostOptions,
  ): Promise<T>;
}

export const DEFAULT_TIMEOUT_MS = 10_000;
const DEVICES_PATH = '/v1/devices';

/**
 * The API client's transport: registers the device on first use, sends its token as a bearer,
 * gives up after a timeout, turns the contract's error body into `ApiClientError`, and sends a
 * request once more when the server marks its error `retryable`.
 *
 * Only a path, a status and an error code are ever logged. Bodies hold what the user typed.
 */
export function createHttpClient(options: HttpClientOptions): HttpClient {
  let token: Promise<string> | null = null;

  async function send(
    path: string,
    body: unknown,
    headers: Record<string, string>,
    timeoutMs: number,
  ): Promise<unknown> {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), timeoutMs);
    try {
      const response = await options.fetch(`${options.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: abort.signal,
      });
      const json: unknown = await response.json().catch(() => null);
      if (!response.ok) throw errorFromResponse(response.status, json);
      return json;
    } catch (error) {
      if (abort.signal.aborted) {
        throw new ApiClientError('timeout', false, null, 'The server took too long to answer');
      }
      throw asApiError(error);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Registers this phone, or registers its stored token again. The server treats both the same. */
  async function register(existing: string | null): Promise<string> {
    const request = {
      language: options.language(),
      ...(existing === null ? {} : { token: existing }),
    };
    const answer = await send(DEVICES_PATH, request, {}, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const issued = (answer as { token?: unknown } | null)?.token;
    if (typeof issued !== 'string' || issued === '') {
      throw new ApiClientError('bad_response', false, null, 'Registration returned no token');
    }
    if (issued !== existing) await options.tokens.write(issued);
    return issued;
  }

  function deviceToken(): Promise<string> {
    token ??= options.tokens
      .read()
      .then((stored) => stored ?? register(null))
      .catch((error: unknown) => {
        token = null;
        throw asApiError(error);
      });
    return token;
  }

  return {
    async post(path, body, parse, postOptions = {}) {
      const timeoutMs = postOptions.timeoutMs ?? options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const attempt = async () => {
        const bearer = await deviceToken();
        const json = await send(path, body, { Authorization: `Bearer ${bearer}` }, timeoutMs);
        try {
          return parse(json);
        } catch {
          throw new ApiClientError(
            'bad_response',
            false,
            null,
            'The answer did not match its contract',
          );
        }
      };

      try {
        return await attempt();
      } catch (error) {
        const failure = asApiError(error);
        console.warn('api call failed', { path, code: failure.code, status: failure.status });
        if (failure.code === 'unauthorized') {
          // The server does not know this token (a new database, or a token restored from a
          // backup): register it and ask once more.
          const known = await options.tokens.read().catch(() => null);
          token = null;
          const registered = await register(known);
          token = Promise.resolve(registered);
        } else if (!failure.retryable) {
          throw failure;
        }
        return attempt();
      }
    },
  };
}
