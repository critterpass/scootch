import type { Attitude, CameraStepWords, Language } from '@scootch/domain';
import { checkLine, checkWrittenLine, renderVoiceGuide } from '@scootch/voice';
import type { z } from 'zod';

import { ApiError } from '../../errors';
import { recordAiUsage } from '../../ledger';
import type { RouteContext } from '../../route';
import { generate, type ModelTier } from '../deepseek';

/** The three texts every camera step is written with. */
export type StepDraft = { readonly line: string; readonly action: string; readonly task: string };
export type StepWord = keyof StepDraft;

/** The button's words are a label, not a sentence. */
export const actionMaxCharacters = 28;
export const taskMaxCharacters = 100;

/** Every number on a camera screen is counted by the phone, so a model's text carries none. */
export function hasDigit(text: string): boolean {
  return /\p{N}/u.test(text);
}

/** Which of a step's three texts fail the voice check, a length or the no-numbers rule. */
export function failingWords(
  draft: StepDraft,
  language: Language,
  attitude: Attitude,
): ReadonlySet<StepWord> {
  const failing = new Set<StepWord>();
  const line = draft.line.trim();
  const action = draft.action.trim();
  const task = draft.task.trim();
  if (
    hasDigit(line) ||
    !checkWrittenLine({ text: line, kind: 'tinyNextStep', language, attitude }).ok
  ) {
    failing.add('line');
  }
  if (
    hasDigit(action) ||
    action.length > actionMaxCharacters ||
    !checkLine({ text: action, kind: 'tiniestNextStep', language, attitude }).ok
  ) {
    failing.add('action');
  }
  // The task is an instruction in plain words, whatever the attitude.
  if (
    hasDigit(task) ||
    task.length > taskMaxCharacters ||
    !checkLine({ text: task, kind: 'plainStep', language, attitude: 'soft' }).ok
  ) {
    failing.add('task');
  }
  return failing;
}

/** A step's words as the phone gets them: a failed line is Scootch's own, the rest are left out. */
export function stepWords(
  draft: StepDraft,
  failing: ReadonlySet<StepWord>,
  ownLine: string,
): CameraStepWords {
  return {
    line: failing.has('line') ? ownLine : draft.line.trim(),
    action: failing.has('action') ? null : draft.action.trim(),
    task: failing.has('task') ? null : draft.task.trim(),
  };
}

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

/** The voice guide at this attitude, then the route's own job in the user's language. */
export function cameraSystem(
  language: Language,
  attitude: Attitude,
  job: Readonly<Record<Language, readonly string[]>>,
): string {
  return [renderVoiceGuide(language, attitude, randomSeed()), job[language].join('\n')].join(
    '\n\n',
  );
}

/** What was seen or read, as a data block its own text cannot close early. */
export function dataBlock(tag: string, body: string): string {
  return `<${tag}>\n${body.replaceAll(`</${tag}>`, `<\\/${tag}>`)}\n</${tag}>`;
}

export type WriteRequest<Schema extends z.ZodType> = {
  /** The AI route's id, for the cost ledger. */
  readonly route: string;
  readonly tier: ModelTier;
  readonly system: string;
  readonly prompt: string;
  readonly tool: { readonly name: string; readonly description: string };
  readonly schema: Schema;
  /** How many things are wrong with an answer. Nought is an answer to use as it is. */
  readonly faults: (output: z.infer<Schema>) => number;
};

/**
 * One writer call, and one more when the first answer has a fault; the answer with fewer faults is
 * kept. Only token counts are recorded: nothing seen, read or written is logged or stored.
 */
export async function writeWithOneRetry<Schema extends z.ZodType>(
  c: RouteContext,
  request: WriteRequest<Schema>,
): Promise<z.infer<Schema>> {
  const attempt = async (): Promise<z.infer<Schema>> => {
    const generated = await generate(
      { apiKey: c.env.DEEPSEEK_API_KEY },
      {
        tier: request.tier,
        system: request.system,
        prompt: request.prompt,
        tool: request.tool,
        schema: request.schema,
        maxTokens: 700,
      },
    );
    try {
      await recordAiUsage(c.env.DB, {
        route: request.route,
        ...generated,
        deviceHash: c.var.device.hash,
      });
    } catch {
      console.error('ai usage not recorded', { route: request.route, model: generated.model });
    }
    return generated.output;
  };

  const first = await attempt();
  const firstFaults = request.faults(first);
  if (firstFaults === 0) return first;
  try {
    const second = await attempt();
    return request.faults(second) < firstFaults ? second : first;
  } catch (error) {
    // The reason only: a failure here never carries what was read or written into the log.
    console.warn('camera rewrite failed', {
      requestId: c.var.requestId,
      route: request.route,
      reason: error instanceof ApiError ? error.code : 'internal',
    });
    return first;
  }
}
