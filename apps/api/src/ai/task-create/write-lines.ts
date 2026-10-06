import { taskCreateLinesResponseSchema, type TaskCreateLinesResponse } from '@scootch/domain';
import { checkLine, offlineMonsterName, type TaskCopy } from '@scootch/voice';

import { ApiError } from '../../errors';
import { generate } from '../deepseek';

import { record, type TaskCreateContext, type VoiceCheckSummary } from './context';
import type { ContinuationPayload } from './continuation';
import { rewritePrompt, taskPrompt, writerSystem } from './prompt';
import { linesOutputSchema, rewriteOutputSchema } from './schema';
import { copyFrom, failuresIn, offlineCopy, replaceLines, withOfflineLines } from './voice-check';

export type TaskLinesResult = {
  readonly response: TaskCreateLinesResponse;
  readonly voice: VoiceCheckSummary;
};

function reasonOf(error: unknown): string {
  return error instanceof ApiError ? error.code : 'internal';
}

function responseFrom({ monster, lines, notifications }: TaskCopy) {
  return taskCreateLinesResponseSchema.safeParse({ monster, lines, notifications });
}

/**
 * Stage two: the monster's name and card, the session's lines and the day's notifications, about
 * the one thing alone. One writer call; a line that fails the voice check is asked for once more
 * on its own, with the reasons and never the rejected text; a line that fails twice becomes an
 * offline line. When the writer gives nothing usable, the whole answer is offline lines and a
 * name made in code. This never fails for the phone.
 */
export async function writeLines(
  context: TaskCreateContext,
  { oneThing, language, attitude, bodyType, seed }: ContinuationPayload,
): Promise<TaskLinesResult> {
  const offlineName = offlineMonsterName(language, bodyType, seed);
  const offline = (): TaskLinesResult => ({
    response: taskCreateLinesResponseSchema.parse(
      (({ monster, lines, notifications }) => ({ monster, lines, notifications }))(
        offlineCopy(language, attitude, offlineName),
      ),
    ),
    voice: { attempts: 1, replaced: 0, source: 'offline' },
  });
  const config = { apiKey: context.env.DEEPSEEK_API_KEY };
  const system = writerSystem(language, attitude, seed);

  let copy: TaskCopy;
  try {
    const generated = await generate(config, {
      tier: 'writer',
      system,
      prompt: taskPrompt(oneThing),
      tool: { name: 'write_lines', description: 'Return everything said about the one thing.' },
      schema: linesOutputSchema,
      maxTokens: 2000,
    });
    await record(context, generated);
    copy = copyFrom(generated.output, attitude);
  } catch (error) {
    // The reason only: the answer that failed is never logged.
    console.warn('task lines not written', {
      requestId: context.requestId,
      reason: reasonOf(error),
    });
    return offline();
  }

  let failures = failuresIn(copy, language, attitude);
  let attempts = 1;
  if (failures.length > 0) {
    // Where and why only: a failure can be logged because it never holds the line.
    console.warn('task voice check failed', {
      requestId: context.requestId,
      failures: failures.map(({ slot, reasons }) => `${slot}: ${reasons.join(' ')}`),
    });
    attempts = 2;
    try {
      const nameFailed = failures.some(({ slot }) => slot === 'monster.name');
      const rewritten = await generate(config, {
        tier: 'writer',
        system,
        prompt: rewritePrompt(language, oneThing, nameFailed ? null : copy.monster.name, failures),
        tool: { name: 'write_lines_again', description: 'Return only the lines asked for.' },
        schema: rewriteOutputSchema(failures.map(({ slot }) => slot)),
        maxTokens: 900,
      });
      await record(context, rewritten);
      const texts = new Map<string, string>();
      for (const { slot, kind } of failures) {
        const text = (rewritten.output[slot] ?? '').trim();
        if (checkLine({ text, kind, language, attitude }).ok) texts.set(slot, text);
      }
      copy = replaceLines(copy, texts);
      failures = failures.filter(({ slot }) => !texts.has(slot));
    } catch (error) {
      console.warn('task lines not rewritten', {
        requestId: context.requestId,
        reason: reasonOf(error),
      });
    }
  }
  if (failures.length > 0) {
    console.warn('task lines replaced', {
      requestId: context.requestId,
      failures: failures.map(({ slot, reasons }) => `${slot}: ${reasons.join(' ')}`),
    });
  }

  const response = responseFrom(withOfflineLines(copy, failures, language, attitude, offlineName));
  if (!response.success) {
    console.warn('task lines not written', { requestId: context.requestId, reason: 'contract' });
    return offline();
  }
  return {
    response: response.data,
    voice: { attempts, replaced: failures.length, source: 'writer' },
  };
}
