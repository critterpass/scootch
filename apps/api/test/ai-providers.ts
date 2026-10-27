import { claudeUrl } from '../src/ai/claude';
import { jevUrl } from '../src/ai/jev';

import { recorded as recordedDecide } from './fixtures/claude/decide';
import { recorded as recordedMarks } from './fixtures/claude/marks';
import { recorded as recordedStatus } from './fixtures/claude/status';

/**
 * Stand-ins for the two model providers at the network boundary. The bodies are shaped like the
 * answers recorded from the real endpoints (field names, order and the usage block included).
 */
export type Reply = (request: { body: Record<string, unknown> }) => Response | Promise<Response>;

export type Providers = {
  fetch: typeof fetch;
  /** The JSON bodies sent to each provider, in order. */
  sent: { jev: Record<string, unknown>[]; claude: Record<string, unknown>[] };
};

export function providers(replies: { jev: Reply; claude: Reply }): Providers {
  const sent: Providers['sent'] = { jev: [], claude: [] };
  const send: typeof fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    const provider = url === jevUrl ? 'jev' : url === claudeUrl ? 'claude' : undefined;
    if (provider === undefined) throw new Error(`unexpected request to ${url}`);
    if (typeof init?.body !== 'string') throw new Error('expected a JSON string body');
    const body = JSON.parse(init.body) as Record<string, unknown>;
    sent[provider].push(body);
    return replies[provider]({ body });
  };
  return { fetch: send, sent };
}

/** Which of the screen's three questions a request to a provider carries. */
export function screenQuestionIn(body: Record<string, unknown>): 'care' | 'preparation' | 'misuse' {
  // The option names, as either provider's request spells them.
  const sent = JSON.stringify(body);
  if (/\\?"crisis\\?":/.test(sent)) return 'care';
  return /\\?"misuse\\?":/.test(sent) ? 'misuse' : 'preparation';
}

/** A provider answering each of the screen's questions in its own way. */
export function perQuestion(replies: Record<ReturnType<typeof screenQuestionIn>, Reply>): Reply {
  return (request) => replies[screenQuestionIn(request.body)](request);
}

/** Jev answering one choice question with `probabilities`. */
export function jevChoice(probabilities: Record<string, number>): Reply {
  return () => {
    const [choice] = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0] ?? [];
    return Response.json({
      model: 'jev-1.13.0',
      answers: { answer: { type: 'choice', choice, confidence: 0.98, probabilities } },
      usage: { input_tokens: 498, output_tokens: 40 },
    });
  };
}

/**
 * Jev answering the care question with `probabilities`, the preparation question with `preparing`
 * as p(yes), and the misuse question with "genuine".
 */
export function jevAnswers(
  probabilities: { pass: number; serious: number; crisis: number },
  preparing = 0.01,
): Reply {
  return perQuestion({
    care: jevChoice(probabilities),
    preparation: jevChoice({ no: 1 - preparing, yes: preparing }),
    misuse: jevChoice({ genuine: 0.99, misuse: 0.01 }),
  });
}

/** The property names of the structured output a request to Claude asks for. */
export function outputKeysIn(body: Record<string, unknown>): string[] {
  const config = body['output_config'] as
    { format?: { schema?: { properties?: Record<string, unknown> } } } | undefined;
  return Object.keys(config?.format?.schema?.properties ?? {});
}

/** A Messages API answer recorded from Claude: one per call shape, in `fixtures/claude/`. */
export type ClaudeRecording = typeof recordedDecide;

export const recordedClaude = {
  decide: recordedDecide,
  marks: recordedMarks,
  status: recordedStatus,
} satisfies Record<string, ClaudeRecording>;

/**
 * A recorded answer with its one text block holding `output` as JSON instead (a string is sent as
 * it is); everything else, usage included, is as recorded.
 */
export function claudeMessage(output: unknown, recording: ClaudeRecording): Response {
  const text = typeof output === 'string' ? output : JSON.stringify(output);
  return Response.json({ ...recording, content: [{ type: 'text', text }] });
}

/** Claude answering with `output` in the shape of `recording`, the decision's by default. */
export function claudeAnswers(
  output: unknown,
  recording: ClaudeRecording = recordedClaude.decide,
): Reply {
  return () => claudeMessage(output, recording);
}

/** Claude answering exactly as recorded. */
export function claudeRecorded(recording: ClaudeRecording): Reply {
  return () => Response.json(recording);
}

/**
 * Claude stopping with nothing to read: a refusal with no content, or JSON cut off at the token
 * cap. Neither can be asked for on purpose, so both are built on the decision's recording.
 */
export function claudeStops(stopReason: 'refusal' | 'max_tokens'): Reply {
  const refused = stopReason === 'refusal';
  return () =>
    Response.json({
      ...recordedClaude.decide,
      content: refused ? [] : [{ type: 'text', text: '{"probabilities":{"pass":0.' }],
      stop_reason: stopReason,
      stop_details: refused ? { type: 'refusal', category: null, explanation: null } : null,
    });
}

/** What `fetch` does when `AbortSignal.timeout` fires. */
export const timesOut: Reply = () => {
  throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
};

export const connectionDrops: Reply = () => {
  throw new TypeError('Network connection lost.');
};

export function answersStatus(status: number): Reply {
  return () => Response.json({ error: { type: 'error', message: 'recorded failure' } }, { status });
}
