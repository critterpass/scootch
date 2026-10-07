-- Who may sit down at a table the person is at without a link: their friends, or nobody. A link
-- they send still seats its holder either way.
ALTER TABLE accounts ADD COLUMN sit_with TEXT NOT NULL DEFAULT 'friends'
  CHECK (sit_with IN ('friends', 'nobody'));
