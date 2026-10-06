// A ramble's words while the one thing is being picked from them. A row is deleted at the pick
// unless the person chose to keep transcripts, and then it is purged seven days after it was made.
export const sql = `
  CREATE TABLE ramble_transcripts (
    id TEXT PRIMARY KEY NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    picked_at TEXT
  );
`;
