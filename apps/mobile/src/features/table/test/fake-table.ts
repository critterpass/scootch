import type { SocketFactory, SocketLike } from '../../../api/table-socket';
import { ApiClientError } from '../../../api/api-error';
import type { HttpClient, HttpMethod } from '../../../api/http-client';

/** One fake WebSocket: a test opens it, speaks as the server, and reads what the phone sent. */
export interface FakeSocket extends SocketLike {
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly sent: string[];
  closed: boolean;
  /** The server accepts the connection. */
  accept(): void;
  /** The server sends one message. */
  say(message: unknown): void;
  /** The line goes away, with the server's close code when it had one. */
  cut(code?: number): void;
}

/** The network boundary of the table: every socket the phone opens, in order. */
export function fakeSockets() {
  const sockets: FakeSocket[] = [];
  const open: SocketFactory = (url, headers) => {
    const socket: FakeSocket = {
      url,
      headers,
      sent: [],
      closed: false,
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
      send: (data) => void socket.sent.push(data),
      close: () => {
        socket.closed = true;
      },
      accept: () => socket.onopen?.(),
      say: (message) =>
        socket.onmessage?.({
          data: typeof message === 'string' ? message : JSON.stringify(message),
        }),
      cut: (code) => socket.onclose?.(code === undefined ? {} : { code }),
    };
    sockets.push(socket);
    return socket;
  };
  return {
    open,
    sockets,
    last: () => {
      const socket = sockets.at(-1);
      if (!socket) throw new Error('No socket was opened');
      return socket;
    },
    /** Every JSON frame the phone put on any socket. */
    frames: () => sockets.flatMap((socket) => socket.sent.filter((frame) => frame.startsWith('{'))),
  };
}

export interface SentRequest {
  readonly method: HttpMethod;
  readonly path: string;
  readonly body: unknown;
}

/** The server's refusal of a rule, as the HTTP client hands it on. */
export const refused = (reason: string) =>
  new ApiClientError('bad_request', false, 400, 'refused', reason);

/**
 * The HTTP boundary: records every request and answers by path. An answer that is an `Error` is
 * thrown, as the real client throws a refusal.
 */
export function fakeHttp(answers: Readonly<Record<string, unknown>> = {}) {
  const sent: SentRequest[] = [];
  const request: HttpClient['request'] = (method, path, body, parse) => {
    sent.push({ method, path, body });
    const answer = answers[`${method} ${path}`];
    if (answer instanceof Error) return Promise.reject(answer);
    try {
      return Promise.resolve(parse(answer ?? {}));
    } catch {
      return Promise.reject(new ApiClientError('bad_response', false, null, 'bad shape'));
    }
  };
  const http: HttpClient = {
    request,
    post: (path, body, parse) => request('POST', path, body, parse),
  };
  return { http, sent };
}
