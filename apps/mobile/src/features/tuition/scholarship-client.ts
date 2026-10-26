import type { HttpClient } from '../../api/http-client';

const SCHOLARSHIP_PATH = '/v1/tuition/scholarship';

/** The server's answer to a scholarship ask. */
export interface ScholarshipAnswer {
  /** When the free school year ends, as an instant; `null` for tuition that never ends. */
  readonly endsAt: number | null;
}

/** Reads the route's answer; anything else is a broken contract. */
export function scholarshipAnswerOf(json: unknown): ScholarshipAnswer {
  if (typeof json !== 'object' || json === null) throw new Error('Not a scholarship answer');
  const { expiresAt, granted } = json as { expiresAt?: unknown; granted?: unknown };
  if (typeof granted !== 'boolean') throw new Error('Not a scholarship answer');
  if (expiresAt === null) return { endsAt: null };
  const endsAt = typeof expiresAt === 'string' ? Date.parse(expiresAt) : Number.NaN;
  if (Number.isNaN(endsAt)) throw new Error('Not a scholarship answer');
  return { endsAt };
}

/**
 * Asks for the scholarship: a free school year, no proof. The note a person writes is not sent;
 * it stays on the phone.
 */
export function askScholarship(http: Pick<HttpClient, 'post'>): Promise<ScholarshipAnswer> {
  return http.post(SCHOLARSHIP_PATH, {}, scholarshipAnswerOf);
}
