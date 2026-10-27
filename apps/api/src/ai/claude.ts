import Anthropic, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
} from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';

import { ApiError } from '../errors';

/**
 * The generation model: Claude Haiku 5.5 on the Anthropic API, through the official SDK. Every
 * call asks for structured output against a JSON schema made from a zod schema, and the answer is
 * checked against that zod schema again, so a caller gets typed data or an error, never prose.
 */
export const claudeBaseUrl = 'https://api.anthropic.com';
export const claudeUrl = `${claudeBaseUrl}/v1/messages`;

export const claudeModel = 'claude-haiku-5-5';

/**
 * One model, two tiers told apart by effort: `writer` for writing that matters most, `fast` for
 * short replies. Thinking is adaptive, so effort is the one dial.
 */
export const claudeEffort = { writer: 'medium', fast: 'low' } as const;
export type ModelTier = keyof typeof claudeEffort;

export const claudeTimeoutMs = { writer: 30_000, fast: 8_000 } as const satisfies Record<
  ModelTier,
  number
>;

export type ClaudeConfig = {
  readonly apiKey: string | undefined;
  /** The network boundary, replaced by recorded answers in tests. */
  readonly fetch?: typeof fetch;
};

export type GenerateRequest<Schema extends z.ZodType> = {
  readonly tier: ModelTier;
  readonly system: string;
  readonly prompt: string;
  /** The shape of the answer, sent as the output format and checked on the way back. */
  readonly schema: Schema;
  /** The cap on output, adaptive thinking included. */
  readonly maxTokens?: number;
  readonly timeoutMs?: number;
};

export type Generated<T> = {
  readonly output: T;
  /** The model id the response names. */
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
};

/** One attempt's failure: the wire error it becomes, and whether a second attempt may succeed. */
class AttemptFailed extends Error {
  readonly error: ApiError;
  readonly retryable: boolean;

  constructor(error: ApiError, retryable: boolean) {
    super(error.message);
    this.name = 'AttemptFailed';
    this.error = error;
    this.retryable = retryable;
  }
}

function unavailable(reason: string, retryable: boolean): AttemptFailed {
  return new AttemptFailed(
    new ApiError('model_unavailable', 'The model is not answering', { reason }),
    retryable,
  );
}

/** The SDK's typed failure, as this module's. */
function failureOf(error: unknown): AttemptFailed {
  // The time budget is spent, so a timeout is not tried again.
  if (error instanceof APIConnectionTimeoutError) {
    return new AttemptFailed(new ApiError('model_timeout', 'The model took too long'), false);
  }
  if (error instanceof APIConnectionError) return unavailable('transport_error', true);
  if (error instanceof APIError && typeof error.status === 'number') {
    // A refused request (bad key, bad shape) fails the same way twice; a busy provider may not.
    const busy = error.status === 429 || error.status >= 500;
    return unavailable(`http_${error.status}`, busy);
  }
  return unavailable('unreadable_response', true);
}

async function attempt<Schema extends z.ZodType>(
  client: Anthropic,
  request: GenerateRequest<Schema>,
): Promise<Generated<z.infer<Schema>>> {
  let message: Anthropic.Message;
  try {
    message = await client.messages.create(
      {
        model: claudeModel,
        max_tokens: request.maxTokens ?? 4000,
        output_config: {
          effort: claudeEffort[request.tier],
          format: { type: 'json_schema', schema: zodOutputFormat(request.schema).schema },
        },
        system: request.system,
        messages: [{ role: 'user', content: request.prompt }],
      },
      { timeout: request.timeoutMs ?? claudeTimeoutMs[request.tier] },
    );
  } catch (error) {
    throw failureOf(error);
  }

  // A refusal, or an answer cut off by the token cap, has nothing in it to read.
  if (message.stop_reason !== 'end_turn') {
    throw unavailable(`stop_${message.stop_reason ?? 'unknown'}`, false);
  }
  const text = message.content.flatMap((block) => (block.type === 'text' ? [block.text] : []));
  let json: unknown;
  try {
    json = JSON.parse(text.join(''));
  } catch {
    throw unavailable('invalid_output', true);
  }
  const output = request.schema.safeParse(json);
  if (!output.success) throw unavailable('invalid_output', true);
  return {
    output: output.data,
    model: message.model,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}

/**
 * One structured generation. A retryable failure (the provider busy, the connection dropped, or
 * output that does not match the schema) is tried once more; then the call fails with the wire
 * error `model_unavailable`, or `model_timeout` when the time budget ran out. A refusal is not
 * tried again. There is no other model behind this one: the caller's own failure path decides.
 */
export async function generate<Schema extends z.ZodType>(
  config: ClaudeConfig,
  request: GenerateRequest<Schema>,
): Promise<Generated<z.infer<Schema>>> {
  if (config.apiKey === undefined || config.apiKey === '') {
    throw new ApiError('model_unavailable', 'The model is not answering', {
      reason: 'missing_key',
    });
  }
  const client = new Anthropic({
    apiKey: config.apiKey,
    baseURL: claudeBaseUrl,
    // Retries are this module's, so the time budget and the schema check stay in one place.
    maxRetries: 0,
    ...(config.fetch ? { fetch: config.fetch } : {}),
  });
  try {
    return await attempt(client, request);
  } catch (first) {
    if (!(first instanceof AttemptFailed)) throw first;
    if (!first.retryable) throw first.error;
    try {
      return await attempt(client, request);
    } catch (second) {
      throw second instanceof AttemptFailed ? second.error : second;
    }
  }
}
