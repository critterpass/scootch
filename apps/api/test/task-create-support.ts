import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import type { TaskCreatePass, TaskCreateRequest } from '@scootch/domain';
import { vi } from 'vitest';

import passEn from '../../../packages/voice/fixtures/task.create.en.json';
import type { WriterOutput } from '../src/ai/task-create/schema';
import { createApp } from '../src/app';
import * as routes from '../src/routes/index.generated';

import { providers, type Providers, type Reply } from './ai-providers';
import { freshIp, registerDevice } from './support';

export const passFixture = passEn as { request: TaskCreateRequest; response: TaskCreatePass };

/** The recorded answer as the writer would have given it, before code sorted and checked it. */
export function writerOutputOf(response: TaskCreatePass): WriterOutput {
  return {
    oneThing: response.oneThing.text,
    oneThingDue: null,
    parked: response.parked.map(({ text }) => text),
    dated: response.deadlines.map(({ text, heardAs, dueDate, line }) => ({
      text,
      heardAs,
      date: dueDate,
      line,
    })),
    monster: response.monster,
    lines: response.lines,
    notifications: response.notifications.map(({ text }) => text),
  };
}

type Verdict = { pass: number; serious: number; crisis: number };

const labelChoices = ['calling', 'phone', 'fits', 'shareable', 'medium'];

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

/** The writer answering each call in turn with the next output; other tools get `otherwise`. */
export function writerAnswers(outputs: readonly unknown[], otherwise?: Reply): Reply {
  let next = 0;
  return (request) => {
    const tool = (request.body['tools'] as { name: string }[])[0]?.name ?? '';
    if (!tool.startsWith('write_')) {
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

export function writerCalls(doubles: Providers): Record<string, unknown>[] {
  return doubles.sent.deepseek.filter((body) =>
    ((body['tools'] as { name: string }[])[0]?.name ?? '').startsWith('write_'),
  );
}

/** Sends one task call with both provider keys set and the providers replaced. */
export async function createTask(
  replies: { jev: Reply; deepseek: Reply },
  body: unknown = passFixture.request,
) {
  const doubles = providers(replies);
  vi.stubGlobal('fetch', doubles.fetch);
  const token = await registerDevice();
  const ctx = createExecutionContext();
  const response = await createApp(Object.values(routes)).fetch(
    new Request('https://api.test/v1/task-create', {
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
