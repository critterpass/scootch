// "Turn it down for a week" on a monster's notification: the last day that thing's messages are
// sent at Soft, as a local date. A task nobody turned down, and one stored before, has none.
export const sql = `
  ALTER TABLE tasks ADD COLUMN soft_until TEXT;
`;
