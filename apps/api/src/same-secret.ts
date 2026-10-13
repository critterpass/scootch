/**
 * Whether a secret someone sent is the one expected, in time that says nothing about how much of
 * it was right: both are hashed to the same length first, and every byte is read.
 */
export async function sameSecret(given: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all(
    [given, expected].map(
      async (value) => new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))),
    ),
  );
  if (a === undefined || b === undefined) return false;
  let difference = 0;
  for (const [index, byte] of a.entries()) difference |= byte ^ (b[index] ?? 0);
  return difference === 0;
}
