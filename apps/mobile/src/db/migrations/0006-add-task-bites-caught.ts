// Which of a task's three bites have been ticked, as a JSON list of their places. A task nobody
// has bitten, and one stored before bites existed, has none.
export const sql = `
  ALTER TABLE tasks ADD COLUMN bites_caught TEXT;
`;
