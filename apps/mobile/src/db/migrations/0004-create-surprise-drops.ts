// A surprise drop a finish gave. `pick` chooses the item from whatever the drop folder holds, so
// the row stays true when items are added. `choice` is what the person tapped: wear it, or later.
export const sql = `
  CREATE TABLE surprise_drops (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL,
    catch_number INTEGER NOT NULL,
    pick REAL NOT NULL,
    dropped_on TEXT NOT NULL,
    choice TEXT
  );
  CREATE INDEX surprise_drops_by_task ON surprise_drops (task_id);
`;
