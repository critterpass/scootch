import { wireErrorSchema, type WireErrorCode } from '@scootch/domain';

/** The server's codes, plus the three ways a call can fail before a readable answer arrives. */
export type ApiErrorCode = WireErrorCode | 'network' | 'timeout' | 'bad_response';

/** Every way an API call fails, as one type. It never holds what the user typed. */
export class ApiClientError extends Error {
  readonly code: ApiErrorCode;
  /** The server said the same request may succeed if sent again. */
  readonly retryable: boolean;
  readonly status: number | null;
  /** The fixed word a rule's refusal carries (`detail.reason`), or `null`. Never a person's words. */
  readonly reason: string | null;

  constructor(
    code: ApiErrorCode,
    retryable: boolean,
    status: number | null,
    message: string,
    reason: string | null = null,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.retryable = retryable;
    this.status = status;
    this.reason = reason;
  }
}

/** A non-2xx answer as a typed error. A body that is not the contract's error shape is `internal`. */
export function errorFromResponse(status: number, body: unknown): ApiClientError {
  const wire = wireErrorSchema.safeParse(body);
  if (!wire.success) {
    return new ApiClientError('internal', false, status, `The server answered ${status}`);
  }
  const { code, retryable, message, detail } = wire.data.error;
  const reason = typeof detail?.['reason'] === 'string' ? detail['reason'] : null;
  return new ApiClientError(code, retryable, status, message, reason);
}

export function asApiError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error;
  return new ApiClientError('network', false, null, 'The server could not be reached');
}
