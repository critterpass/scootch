import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import type { TaskCreatePass, TaskCreateRequest } from '@scootch/domain';
import { vi } from 'vitest';

import passEn from '../../../packages/voice/fixtures/task.create.en.json';
import type { PickOutput } from '../src/ai/task-create/schema';
import { createApp } from '../src/app';
import * as routes from '../src/routes/index.generated';

import { providers, type Providers, type Reply } from './ai-providers';
import { freshIp, registerDevice } from './support';

export const passFixture = passEn as { request: TaskCreateRequest; response: TaskCreatePass };

/** The recorded answer's things as the fast pick would have given them, before code sorted them. */
export function pickOutputOf(response: TaskCreatePass): PickOutput {
  return {
    oneThing: response.oneThing.text,
    oneThingDue: null,
    parked: response.parked.map(({ text }) => text),
    dated: response.deadlines.map(({ text, heardAs, dueDate }) => ({
      text,
      heardAs,
      date: dueDate,
    })),
  };
}

/** The recorded answer's words as the writer would have given them, before code checked them. */
export function linesOutputOf(response: TaskCreatePass) {
  return {
    ...response.monster,
    ...response.lines,
    notifications: response.notifications.map(({ text }) => text),
  };
}

type Verdict = { pass: number; serious: number; crisis: number };

const labelChoices = ['calling', 'phone', 'fits', 'shareable', 'medium', 'genuine'];

/** Jev answering the screen with `screen` and every label question with a confident choice. */
export function jevDecides(screen: Verdict | Reply): Reply {
  return (request) => {
    const questions = request.body['questions'] as { answer: { criteria: Record<string, string> } };
    const options = Object.keys(questions.answer.criteria);
    if (options.includes('crisis') && typeof screen === 'function') return screen(request);
    const probabilities = options.includes('crisis')
      ? (screen as Verdict)
      : Object.fromEntries(
          options.map((option) => [
            option,
            labelChoices.includes(option) ? 0.92 : 0.08 / (options.length - 1),
          ]),
        );
    const [choice] = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0] ?? [];
    return Response.json({
      model: 'jev-1.13.0',
      answers: { answer: { type: 'choice', choice, confidence: 0.95, probabilities } },
      usage: { input_tokens: 498, output_tokens: 40 },
    });
  };
}

/** Calls to tools whose names start with `prefix` answered in turn; other tools get `otherwise`. */
function toolAnswers(prefix: string, outputs: readonly unknown[], otherwise?: Reply): Reply {
  let next = 0;
  return (request) => {
    const tool = (request.body['tools'] as { name: string }[])[0]?.name ?? '';
    if (!tool.startsWith(prefix)) {
      if (otherwise === undefined) throw new Error(`unexpected tool ${tool}`);
      return otherwise(request);
    }
    const input = outputs[Math.min(next, outputs.length - 1)];
    next += 1;
    return Response.json({
      id: 'msg_recorded',
      type: 'message',
      role: 'assistant',
      model: request.body['model'],
      content: [{ type: 'tool_use', id: 'call_recorded', name: tool, input }],
      stop_reason: 'tool_use',
      usage: { input_tokens: 2140, output_tokens: 520 },
    });
  };
}

/** The writer answering each of its calls in turn with the next output. */
export function writerAnswers(outputs: readonly unknown[], otherwise?: Reply): Reply {
  return toolAnswers('write_', outputs, otherwise);
}

/** The writer asked for failed lines once more answers with `outputs` in turn. */
export function rewriteAnswers(outputs: readonly unknown[], otherwise?: Reply): Reply {
  return toolAnswers('write_lines_again', outputs, otherwise);
}

/** `reply` for the call that asks for failed lines once more, `otherwise` for every other call. */
export function whenRewriting(reply: Reply, otherwise: Reply): Reply {
  return (request) => {
    const tool = (request.body['tools'] as { name: string }[])[0]?.name ?? '';
    return tool === 'write_lines_again' ? reply(request) : otherwise(request);
  };
}

/** The fast pick answering each of its calls in turn, with the writer behind it. */
export function pickAnswers(outputs: readonly unknown[], otherwise?: Reply): Reply {
  return toolAnswers('pick_', outputs, otherwise);
}

export function toolCalls(doubles: Providers, prefix: string): Record<string, unknown>[] {
  return doubles.sent.deepseek.filter((body) =>
    ((body['tools'] as { name: string }[])[0]?.name ?? '').startsWith(prefix),
  );
}

export function writerCalls(doubles: Providers): Record<string, unknown>[] {
  return toolCalls(doubles, 'write_');
}

/** Sends one task call with both provider keys set and the providers replaced. */
export async function createTask(
  replies: { jev: Reply; deepseek: Reply },
  body: unknown = passFixture.request,
  { path = '/v1/task-create', device }: { path?: string; device?: string } = {},
) {
  const doubles = providers(replies);
  vi.stubGlobal('fetch', doubles.fetch);
  const token = device ?? (await registerDevice());
  const ctx = createExecutionContext();
  const response = await createApp(Object.values(routes)).fetch(
    new Request(`https://api.test${path}`, {
      method: 'POST',
      headers: {
        'CF-Connecting-IP': freshIp(),
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }),
    { ...env, TYPESAFE_API_KEY: 'jev-test-key', DEEPSEEK_API_KEY: 'deepseek-test-key' },
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return { token, doubles, response, raw: await response.clone().text() };
}
