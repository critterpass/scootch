import { deepseekUrl } from '../src/ai/deepseek';
import { jevUrl } from '../src/ai/jev';

/**
 * Stand-ins for the two model providers at the network boundary. The bodies are shaped like the
 * answers recorded from the real endpoints (field names, order and the usage block included).
 */
export type Reply = (request: { body: Record<string, unknown> }) => Response | Promise<Response>;

export type Providers = {
  fetch: typeof fetch;
  /** The JSON bodies sent to each provider, in order. */
  sent: { jev: Record<string, unknown>[]; deepseek: Record<string, unknown>[] };
};

export function providers(replies: { jev: Reply; deepseek: Reply }): Providers {
  const sent: Providers['sent'] = { jev: [], deepseek: [] };
  const send: typeof fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    const provider = url === jevUrl ? 'jev' : url === deepseekUrl ? 'deepseek' : undefined;
    if (provider === undefined) throw new Error(`unexpected request to ${url}`);
    if (typeof init?.body !== 'string') throw new Error('expected a JSON string body');
    const body = JSON.parse(init.body) as Record<string, unknown>;
    sent[provider].push(body);
    return replies[provider]({ body });
  };
  return { fetch: send, sent };
}

export function jevAnswers(probabilities: {
  pass: number;
  serious: number;
  crisis: number;
}): Reply {
  const [choice] = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0] ?? [];
  return () =>
    Response.json({
      model: 'jev-1.13.0',
      answers: { answer: { type: 'choice', choice, confidence: 0.98, probabilities } },
      usage: { input_tokens: 498, output_tokens: 40 },
    });
}

/** The fast tier answering through the forced tool call. */
export function deepseekAnswers(input: unknown): Reply {
  return ({ body }) =>
    Response.json({
      id: 'msg_recorded',
      type: 'message',
      role: 'assistant',
      model: body['model'],
      content: [{ type: 'tool_use', id: 'call_recorded', name: 'answer', input }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 612, output_tokens: 31 },
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
