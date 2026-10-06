import { deepseekModels } from '../ai/deepseek';
import { jevModel } from '../ai/jev';
import { ledgerProject } from '../ledger';

/**
 * US dollars per million tokens, by the model id the ledger records.
 *
 * PLACEHOLDER PRICES: none of these has been checked against a provider's price list or an
 * invoice. They are to be confirmed by the founder; until then every figure the bot reports is
 * an estimate and says so.
 */
export const pricePerMillionTokens: Readonly<
  Record<string, { readonly input: number; readonly output: number }>
> = {
  [deepseekModels.writer]: { input: 0.6, output: 2.4 },
  [deepseekModels.fast]: { input: 0.1, output: 0.4 },
  [jevModel]: { input: 0.2, output: 0.2 },
};

export const priceNote = 'placeholder prices, to be confirmed';

/** The model calls of one route answered by one model, over a stretch of time. */
export type SpendLine = {
  readonly route: string;
  readonly model: string;
  readonly calls: number;
  readonly usd: number;
  /** False when the model has no price, so its calls are counted but cost nothing here. */
  readonly priced: boolean;
};

type UsageRow = {
  route: string;
  model: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
};

/** This app's model calls from `from` up to, not including, `to`, by route and model. */
export async function spendBetween(db: D1Database, from: Date, to: Date): Promise<SpendLine[]> {
  const { results } = await db
    .prepare(
      `SELECT route, model, COUNT(*) AS calls,
              SUM(input_tokens) AS input_tokens, SUM(output_tokens) AS output_tokens
       FROM ai_usage
       WHERE project = ? AND created_at >= ? AND created_at < ?
       GROUP BY route, model
       ORDER BY route, model`,
    )
    .bind(ledgerProject, from.toISOString(), to.toISOString())
    .all<UsageRow>();
  return results.map((row) => {
    const price = pricePerMillionTokens[row.model];
    return {
      route: row.route,
      model: row.model,
      calls: row.calls,
      usd:
        price === undefined
          ? 0
          : (row.input_tokens * price.input + row.output_tokens * price.output) / 1_000_000,
      priced: price !== undefined,
    };
  });
}

export type SpendTotal = { readonly name: string; readonly usd: number; readonly calls: number };

export function totalOf(lines: readonly SpendLine[]): { usd: number; calls: number } {
  return lines.reduce(
    (total, line) => ({ usd: total.usd + line.usd, calls: total.calls + line.calls }),
    { usd: 0, calls: 0 },
  );
}

/** The lines added up by route or by model, dearest first. */
export function totalsBy(lines: readonly SpendLine[], key: 'route' | 'model'): SpendTotal[] {
  const totals = new Map<string, SpendTotal>();
  for (const line of lines) {
    const name = line[key];
    const so = totals.get(name) ?? { name, usd: 0, calls: 0 };
    totals.set(name, { name, usd: so.usd + line.usd, calls: so.calls + line.calls });
  }
  return [...totals.values()].sort((a, b) => b.usd - a.usd || a.name.localeCompare(b.name));
}

/** Models that answered but have no price in the table. */
export function unpricedModels(lines: readonly SpendLine[]): string[] {
  return [...new Set(lines.filter((line) => !line.priced).map((line) => line.model))].sort();
}

export function formatUsd(usd: number): string {
  return `$${usd.toFixed(4)}`;
}
