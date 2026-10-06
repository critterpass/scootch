import {
  taskCreateResponseSchema,
  type TaskCreateRequest,
  type TaskCreateResponse,
} from '@scootch/domain';
import {
  checkLine,
  offlinePacks,
  wordsOf,
  type TaskCopy,
  type TaskLineFailure,
} from '@scootch/voice';

import type { Bindings } from '../../env';
import { ApiError } from '../../errors';
import { recordAiUsage } from '../../ledger';
import { decide, type DecideContext } from '../decide';
import { generate } from '../deepseek';
import { screenInputQuestion, screenVerdict } from '../screen-input';

import { guessEnergy, labelsFor } from './labels';
import { notePrompt, plainSystem, writerSystem } from './prompt';
import { plainOutputSchema, writerOutputSchema, type WriterOutput } from './schema';
import { oneThingProblem, sortThings, type OneThingProblem, type SortedThings } from './things';
import { copyFrom, failuresIn, withOfflineLines } from './voice-check';

export const taskCreateRouteId = 'task.create';

export type TaskCreateContext = {
  readonly env: Pick<Bindings, 'DB' | 'TYPESAFE_API_KEY' | 'DEEPSEEK_API_KEY'>;
  readonly deviceHash: string | null;
  readonly requestId?: string;
};

/** How the voice check went, as counts: what the eval and the logs may know about a call. */
export type VoiceCheckSummary = {
  /** Writer calls made: 1, or 2 when the first answer failed the check. */
  readonly attempts: number;
  /** Lines of the answer that came from the offline pack instead. */
  readonly replaced: number;
};

export type TaskCreateResult = {
  readonly response: TaskCreateResponse;
  readonly voice: VoiceCheckSummary;
};

const unchecked: VoiceCheckSummary = { attempts: 0, replaced: 0 };

/** A note this short is taken to be one task, so it can stand as the one thing in its own words. */
const ownWordsAtMost = 8;

function decideContext(context: TaskCreateContext): DecideContext {
  return { env: context.env, route: taskCreateRouteId, deviceHash: context.deviceHash };
}

/** One row in the cost ledger per model call. A ledger failure never costs the answer. */
async function record(
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

/** The care screen's verdict. When no model answers, nothing was judged and nothing is funny. */
async function screen(context: TaskCreateContext, text: string) {
  try {
    const decision = await decide(decideContext(context), { ...screenInputQuestion, text });
    return { verdict: screenVerdict(decision.answer.probabilities), screened: true };
  } catch (error) {
    console.error('task not screened', {
      requestId: context.requestId,
      reason: error instanceof ApiError ? error.code : 'internal',
    });
    return { verdict: 'serious' as const, screened: false };
  }
}

function seed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

/** A heavy task: the one thing in plain words, with the plain pack. No monster and no joke. */
async function plainTask(
  context: TaskCreateContext,
  request: TaskCreateRequest,
): Promise<TaskCreateResponse> {
  const { language } = request;
  const generated = await generate(
    { apiKey: context.env.DEEPSEEK_API_KEY },
    {
      tier: 'writer',
      system: plainSystem(language),
      prompt: notePrompt(request, request.energy === 'guess' ? 'low' : request.energy),
      tool: { name: 'write_plain_task', description: 'Return the one thing in plain words.' },
      schema: plainOutputSchema,
      maxTokens: 1200,
    },
  );
  await record(context, generated);

  // A heavy task is never lost to a bad rewording: the user's own words stand in when they fit.
  const problem = oneThingProblem(generated.output.oneThing, request);
  const ownWords = request.text.trim();
  if (problem !== null && problem !== 'declined' && ownWords.length > 280) {
    throw unwritable(context, problem);
  }
  const sorted = sortThings(
    problem === null || problem === 'declined'
      ? generated.output
      : { ...generated.output, oneThing: ownWords },
    request,
  );
  const plain = offlinePacks[language].plain;
  const step = generated.output.tinyNextStep.trim();
  const stepIsFine = checkLine({ text: step, kind: 'plainStep', language, attitude: 'soft' }).ok;
  return {
    verdict: 'serious',
    // A guess is not made about a heavy note: the answer that asks least is used.
    energy: request.energy === 'guess' ? 'low' : request.energy,
    oneThing: sorted.oneThing,
    parked: sorted.parked,
    deadlines: sorted.dated.map((deadline) => ({
      ...deadline,
      line: offlinePacks[language].deadline('plain', deadline.text, deadline.heardAs),
    })),
    lines: {
      acknowledge: plain.acknowledge,
      working: [...plain.working],
      tinyNextStep: stepIsFine ? step : plain.tinyNextStep,
      done: plain.done,
      notFinished: plain.notFinished,
    },
  };
}

function unwritable(context: TaskCreateContext, problem: OneThingProblem | 'contract'): ApiError {
  console.error('task not written', { requestId: context.requestId, problem });
  return new ApiError('voice_check_failed', 'The task could not be written', { problem });
}

type Attempt = {
  readonly sorted: SortedThings;
  readonly copy: TaskCopy;
  readonly failures: TaskLineFailure[];
  readonly problem: OneThingProblem | null;
};

/** One writer call, sorted and checked. `retry` tells the writer where its last answer failed. */
async function attempt(
  context: TaskCreateContext,
  request: TaskCreateRequest,
  retry?: Attempt,
): Promise<Attempt> {
  const { language, attitude } = request;
  const generated = await generate(
    { apiKey: context.env.DEEPSEEK_API_KEY },
    {
      tier: 'writer',
      system: writerSystem(language, attitude, seed()),
      prompt: notePrompt(
        request,
        request.energy === 'guess' ? 'unknown' : request.energy,
        retry === undefined
          ? undefined
          : [
              ...retry.failures,
              ...(retry.problem === null ? [] : [{ slot: 'oneThing', reasons: [retry.problem] }]),
            ],
      ),
      tool: {
        name: 'write_task',
        description: "Return today's one thing and everything said about it.",
      },
      schema: writerOutputSchema,
      maxTokens: 3000,
    },
  );
  await record(context, generated);

  // A short note that is one task already: when the rewording strays, the user's words stand.
  const strayed = oneThingProblem(generated.output.oneThing, request) === 'not_in_text';
  const output: WriterOutput =
    strayed && wordsOf(request.text).length <= ownWordsAtMost
      ? { ...generated.output, oneThing: request.text.trim() }
      : generated.output;
  const sorted = sortThings(output, request);
  const lineOf = new Map(output.dated.map((item) => [item.text.trim(), item.line]));
  const deadlines = sorted.dated.map((deadline) => ({
    ...deadline,
    line: lineOf.get(deadline.text) ?? '',
  }));
  const copy = copyFrom(output, deadlines, attitude);
  return {
    sorted,
    copy,
    failures: failuresIn(copy, language, attitude),
    problem: oneThingProblem(output.oneThing, request),
  };
}

function badness({ failures, problem }: Attempt): number {
  return failures.length + (problem === null ? 0 : 1000);
}

/** The full answer: one writer call, the voice check, one regeneration, then offline lines. */
async function funnyTask(
  context: TaskCreateContext,
  request: TaskCreateRequest,
  seriousOverridden: boolean,
): Promise<TaskCreateResult> {
  const { language, attitude } = request;
  const energy =
    request.energy === 'guess'
      ? guessEnergy(decideContext(context), request.text)
      : Promise.resolve(request.energy);

  let best = await attempt(context, request);
  let attempts = 1;
  if (badness(best) > 0) {
    // Where and why only: a failure can be logged because it never holds the line.
    console.warn('task voice check failed', {
      requestId: context.requestId,
      attempt: 1,
      problem: best.problem,
      failures: best.failures.map(({ slot, reasons }) => `${slot}: ${reasons.join(' ')}`),
    });
    attempts = 2;
    try {
      const second = await attempt(context, request, best);
      if (badness(second) <= badness(best)) best = second;
    } catch (error) {
      console.warn('task regeneration failed', {
        requestId: context.requestId,
        reason: error instanceof ApiError ? error.code : 'internal',
      });
    }
  }
  if (best.problem !== null) throw unwritable(context, best.problem);
  if (best.failures.length > 0) {
    console.warn('task lines replaced', {
      requestId: context.requestId,
      failures: best.failures.map(({ slot, reasons }) => `${slot}: ${reasons.join(' ')}`),
    });
  }

  const copy = withOfflineLines(best.copy, best.failures, language, attitude);
  const labels = labelsFor(decideContext(context), best.sorted.oneThing.text);
  const response = taskCreateResponseSchema.safeParse({
    verdict: 'pass',
    seriousOverridden,
    energy: await energy,
    oneThing: best.sorted.oneThing,
    parked: best.sorted.parked,
    deadlines: copy.deadlines,
    monster: copy.monster,
    labels: await labels,
    lines: copy.lines,
    notifications: copy.notifications,
  });
  if (!response.success) throw unwritable(context, 'contract');
  return { response: response.data, voice: { attempts, replaced: best.failures.length } };
}

/**
 * The one call per task. The text is screened first: a crisis answers with the verdict alone, a
 * heavy task with plain words and no monster, and anything else with everything the day needs.
 * "It's fine, be funny" lifts a serious verdict only when a model really judged the text.
 *
 * The text goes to the models and nowhere else: it is not logged and not stored.
 */
export async function createTask(
  context: TaskCreateContext,
  request: TaskCreateRequest,
): Promise<TaskCreateResult> {
  const { verdict, screened } = await screen(context, request.text);
  if (verdict === 'crisis') return { response: { verdict: 'crisis' }, voice: unchecked };
  const serious = verdict === 'serious';
  if (serious && !(request.overrideSerious && screened)) {
    return { response: await plainTask(context, request), voice: unchecked };
  }
  return funnyTask(context, request, serious);
}
