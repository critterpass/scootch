import type { Bindings } from '../../env';
import { ApiError } from '../../errors';
import { recordAiUsage } from '../../ledger';
import type { DecideContext } from '../decide';

export const taskCreateRouteId = 'task.create';

export type TaskCreateContext = {
  readonly env: Pick<Bindings, 'DB' | 'TYPESAFE_API_KEY' | 'DEEPSEEK_API_KEY'>;
  readonly deviceHash: string | null;
  readonly requestId?: string;
  /** Lets work that the answer no longer needs finish after it is sent, so its cost is recorded. */
  readonly defer?: (work: Promise<unknown>) => void;
};

/** How the voice check went, as counts: what the eval and the logs may know about a call. */
export type VoiceCheckSummary = {
  /** Writer calls made: 1, or 2 when some lines failed the check and were asked for once more. */
  readonly attempts: number;
  /** Lines of the answer that came from the offline pack instead. */
  readonly replaced: number;
  /** `offline` when no writer answer could be used and every line is an offline line. */
  readonly source: 'writer' | 'offline' | 'none';
};

export const unchecked: VoiceCheckSummary = { attempts: 0, replaced: 0, source: 'none' };

export function decideContext(context: TaskCreateContext): DecideContext {
  return { env: context.env, route: taskCreateRouteId, deviceHash: context.deviceHash };
}

/** One row in the cost ledger per model call. A ledger failure never costs the answer. */
export async function record(
  context: TaskCreateContext,
  call: { model: string; inputTokens: number; outputTokens: number },
): Promise<void> {
  try {
    await recordAiUsage(context.env.DB, {
      route: taskCreateRouteId,
      model: call.model,
      inputTokens: call.inputTokens,
      outputTokens: call.outputTokens,
      deviceHash: context.deviceHash,
    });
  } catch {
    console.error('ai usage not recorded', { route: taskCreateRouteId, model: call.model });
  }
}

export function unwritable(context: TaskCreateContext, problem: string): ApiError {
  console.error('task not written', { requestId: context.requestId, problem });
  return new ApiError('voice_check_failed', 'The task could not be written', { problem });
}

/** A seed worked out from what is being written about, so the same call draws the same prompt. */
export function seedOf(...parts: readonly string[]): number {
  let hash = 0x811c9dc5;
  for (const character of parts.join('\n')) {
    hash = Math.imul(hash ^ (character.codePointAt(0) ?? 0), 0x01000193);
  }
  return hash >>> 0;
}
