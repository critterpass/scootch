import {
  taskCreateResponseSchema,
  type Energy,
  type TaskCreateRequest,
  type TaskCreateResponse,
  type TaskCreateStartPass,
  type TaskLabels,
} from '@scootch/domain';
import { checkLine, offlinePacks, wordsOf } from '@scootch/voice';

import { ApiError } from '../../errors';
import { decide } from '../decide';
import { generate } from '../deepseek';
import { screenInputQuestion, screenVerdict } from '../screen-input';

import {
  decideContext,
  record,
  seedOf,
  unchecked,
  unwritable,
  type TaskCreateContext,
  type VoiceCheckSummary,
} from './context';
import type { ContinuationPayload } from './continuation';
import { guessEnergy, labelsFor } from './labels';
import { ownWordsAtMost, pickThings } from './pick';
import { notePrompt, plainSystem } from './prompt';
import { plainOutputSchema } from './schema';
import { oneThingProblem, sortThings } from './things';
import { writeLines } from './write-lines';

export { taskCreateRouteId, type TaskCreateContext, type VoiceCheckSummary } from './context';

export type TaskCreateResult = {
  readonly response: TaskCreateResponse;
  readonly voice: VoiceCheckSummary;
};

/** Stage one's answer: a pass still waiting for its words, or a verdict that is already whole. */
export type TaskStart =
  | {
      readonly verdict: 'pass';
      readonly response: Omit<TaskCreateStartPass, 'continuation'>;
      /** What stage two is asked with. */
      readonly payload: ContinuationPayload;
    }
  | {
      readonly verdict: 'serious' | 'crisis';
      readonly response: Exclude<TaskCreateResponse, { verdict: 'pass' }>;
    };

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

/** A heavy task: the one thing in plain words, with the plain pack. No monster and no joke. */
async function plainTask(
  context: TaskCreateContext,
  request: TaskCreateRequest,
): Promise<Exclude<TaskCreateResponse, { verdict: 'pass' }>> {
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

/** A promise that is being waited for elsewhere, or not at all, without an unhandled rejection. */
function held<T>(work: Promise<T>): Promise<T> {
  work.catch(() => undefined);
  return work;
}

/**
 * Stage one: what the screen shows first. The care screen, the fast pick and the energy guess all
 * start at once, and nothing is answered until the screen has: a crisis answers with the verdict
 * alone and a heavy task with plain words and no monster, exactly as if nothing else had run.
 * "It's fine, be funny" lifts a serious verdict only when a model really judged the text.
 *
 * The text goes to the models and nowhere else: it is not logged and not stored.
 */
export async function startTask(
  context: TaskCreateContext,
  request: TaskCreateRequest,
): Promise<TaskStart> {
  const { language, attitude } = request;
  const text = request.text.trim();
  const picking = held(pickThings(context, request));
  const energy: Promise<Energy> =
    request.energy === 'guess'
      ? held(guessEnergy(decideContext(context), request.text))
      : Promise.resolve(request.energy);
  // A note this short is its own one thing, so its labels need not wait for the pick.
  const early: Promise<TaskLabels> | null =
    wordsOf(text).length <= ownWordsAtMost ? held(labelsFor(decideContext(context), text)) : null;
  const speculative = Promise.allSettled([picking, energy, ...(early === null ? [] : [early])]);

  const { verdict, screened } = await screen(context, request.text);
  if (verdict === 'crisis') {
    context.defer?.(speculative);
    return { verdict, response: { verdict: 'crisis' } };
  }
  const serious = verdict === 'serious';
  if (serious && !(request.overrideSerious && screened)) {
    context.defer?.(speculative);
    return { verdict: 'serious', response: await plainTask(context, request) };
  }

  const sorted = await picking;
  const oneThing = sorted.oneThing.text;
  const labels = await (early !== null && oneThing === text
    ? early
    : labelsFor(decideContext(context), oneThing));
  return {
    verdict: 'pass',
    response: {
      verdict: 'pass',
      seriousOverridden: serious,
      energy: await energy,
      oneThing: sorted.oneThing,
      parked: sorted.parked,
      deadlines: sorted.dated.map((deadline) => ({
        ...deadline,
        line: offlinePacks[language].deadline(attitude, deadline.text, deadline.heardAs),
      })),
      labels,
    },
    payload: {
      oneThing,
      language,
      attitude,
      bodyType: labels.bodyType,
      seed: seedOf(oneThing, language, attitude, request.localDate),
    },
  };
}

/** The one call per task: both stages in one answer, for a caller that asks for everything. */
export async function createTask(
  context: TaskCreateContext,
  request: TaskCreateRequest,
): Promise<TaskCreateResult> {
  const start = await startTask(context, request);
  if (start.verdict !== 'pass') return { response: start.response, voice: unchecked };
  const written = await writeLines(context, start.payload);
  const response = taskCreateResponseSchema.safeParse({ ...start.response, ...written.response });
  if (!response.success) throw unwritable(context, 'contract');
  return { response: response.data, voice: written.voice };
}
