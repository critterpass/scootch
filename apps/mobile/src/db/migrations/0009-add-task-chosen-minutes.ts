// The length chosen on the set task's wheel, kept when a cue is saved or a bite is ticked there, so
// a start from the cue's message or from the last bite runs for that long. A task stored before,
// and one whose length was never kept, has none, and such a start runs for ten minutes.
export const sql = `
  ALTER TABLE tasks ADD COLUMN chosen_minutes INTEGER;
`;
