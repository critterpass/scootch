// A task's short name for the chalk. Tasks written before it have none here; the phone works one
// out from their words when it reads them, and keeps it the next time each is written.
export const sql = `
  ALTER TABLE tasks ADD COLUMN short TEXT;
`;
