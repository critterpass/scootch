import type { Language } from './contracts';
import type { RequestIdVariables } from 'hono/request-id';

import type { TableObject } from './tables/table-object';

/**
 * Secrets the Worker expects, by name. Values live in Wrangler secrets (deployed) or `.dev.vars`
 * (local, ignored by git); `.dev.vars.example` lists the same names.
 */
export const secretNames = [
  'DEEPSEEK_API_KEY',
  'TYPESAFE_API_KEY',
  // Signs task continuations. Absent, the key is derived from DEEPSEEK_API_KEY.
  'TASK_CONTINUATION_SECRET',
  // Signs the monster words the server writes, for sharing. Absent, derived from DEEPSEEK_API_KEY.
  'SHARE_SIGNING_SECRET',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'TELEGRAM_WEBHOOK_SECRET',
  'REVENUECAT_API_V2_KEY',
] as const;
export type SecretName = (typeof secretNames)[number];

/** A secret is absent until it has been set for the environment, so readers must handle that. */
export type Secrets = { readonly [K in SecretName]?: string };

export type EnvironmentName = 'dev' | 'prd';

/** Everything `wrangler.jsonc` binds for an environment, plus the secrets. */
export type Bindings = Secrets & {
  readonly DB: D1Database;
  readonly FILES: R2Bucket;
  readonly IP_RATE_LIMIT: RateLimit;
  readonly DEVICE_RATE_LIMIT: RateLimit;
  /** One Durable Object per table, addressed by the table's id. */
  readonly TABLE: DurableObjectNamespace<TableObject>;
  readonly ENVIRONMENT: EnvironmentName;
  readonly COMMIT_SHA: string;
};

/** The device behind a request, set once its bearer token has been recognised. */
export type Device = {
  /** SHA-256 of the token, hex. The token itself is never kept. */
  readonly hash: string;
  readonly language: Language;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: RequestIdVariables & { device: Device };
};
