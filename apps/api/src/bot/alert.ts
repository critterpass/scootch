import { sendMessage, type BotContext } from './telegram';

const minuteMs = 60 * 1000;
const hourMs = 60 * minuteMs;

/** Every alert the bot can raise: its opening line, and how long that kind then stays quiet. */
const alertKinds = {
  error_spike: { title: 'Error spike', cooldownMs: 30 * minuteMs },
  model_fallback_streak: { title: 'Model falling back', cooldownMs: 30 * minuteMs },
  spend_over_cap: { title: "Model spend over the day's cap", cooldownMs: 20 * hourMs },
  deploy_failed: { title: 'Deploy failed', cooldownMs: 5 * minuteMs },
} as const satisfies Record<string, { title: string; cooldownMs: number }>;

export type AlertKind = keyof typeof alertKinds;

/** Counts, amounts, names of routes and models, dates. Never anything a user typed or said. */
export type AlertFacts = Readonly<Record<string, number | string>>;

export type AlertOutcome = 'sent' | 'cooling_down' | 'not_sent';

/**
 * Raises one alert in the founder's chat. Each kind has a cooldown: a second alert of a kind
 * inside it is dropped, so a fault that keeps happening cannot flood the chat. The cooldown is
 * claimed in one statement, so two callers at the same moment send one message.
 */
export async function alert(
  context: BotContext,
  kind: AlertKind,
  facts: AlertFacts,
): Promise<AlertOutcome> {
  const { title, cooldownMs } = alertKinds[kind];
  const at = context.now.toISOString();
  const quietSince = new Date(context.now.getTime() - cooldownMs).toISOString();
  const claimed = await context.env.DB.prepare(
    `INSERT INTO bot_alerts (kind, last_sent_at) VALUES (?1, ?2)
     ON CONFLICT (kind) DO UPDATE SET last_sent_at = excluded.last_sent_at
       WHERE bot_alerts.last_sent_at <= ?3
     RETURNING kind`,
  )
    .bind(kind, at, quietSince)
    .first();
  if (claimed === null) return 'cooling_down';

  const text = [
    `Alert: ${title}`,
    ...Object.entries(facts).map(([name, value]) => `${name}: ${value}`),
  ].join('\n');
  if (await sendMessage(context, text)) return 'sent';

  // Nothing reached the founder, so the next alert of this kind must not be held back.
  await context.env.DB.prepare('DELETE FROM bot_alerts WHERE kind = ? AND last_sent_at = ?')
    .bind(kind, at)
    .run();
  return 'not_sent';
}
