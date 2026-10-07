-- A table's capacity is fixed when it opens: two for a table opened without Plus, four with it.
ALTER TABLE tables ADD COLUMN capacity INTEGER NOT NULL DEFAULT 4 CHECK (capacity BETWEEN 2 AND 4);

-- A table link is its maker's word for whoever holds it, so sitting down through one makes the
-- two friends. It can do that for as many people as the table has seats beside its maker, and no
-- more: after that the link seats only people who are already friends with someone there.
ALTER TABLE table_invites ADD COLUMN introductions_left INTEGER NOT NULL DEFAULT 0
  CHECK (introductions_left BETWEEN 0 AND 3);

-- A used friend link is remembered until it would have run out, so its page can say it was used.
ALTER TABLE friend_invites ADD COLUMN used_at TEXT
  CHECK (used_at IS NULL OR (length(used_at) = 24 AND used_at NOT GLOB '*[^0-9TZ:.-]*'));
