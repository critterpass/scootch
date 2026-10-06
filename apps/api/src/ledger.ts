/** The tag on every ledger row, so spend on provider keys shared with other apps can be split. */
export const ledgerProject = 'scootch';

export type AiUsage = {
  /** The AI route's id, such as `task.create`. */
  readonly route: string;
  /** The model that actually answered, which is the fallback's name when the fallback ran. */
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  /** The device's token hash, or null for a call no device made. */
  readonly deviceHash: string | null;
};

/** Adds one model call to the cost ledger. Token counts only: no request or response text. */
export async function recordAiUsage(db: D1Database, usage: AiUsage): Promise<void> {
  await db
    .prepare(
      `INSERT INTO ai_usage (route, model, input_tokens, output_tokens, device_hash, project, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      usage.route,
      usage.model,
      usage.inputTokens,
      usage.outputTokens,
      usage.deviceHash,
      ledgerProject,
      new Date().toISOString(),
    )
    .run();
}
