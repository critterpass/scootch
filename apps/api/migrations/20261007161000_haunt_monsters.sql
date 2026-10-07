-- The monster a haunt carries, so catching it keeps the monster that was sent: its drawing
-- parameters and the words the server wrote for it. A row is written only with the server's own
-- signature over exactly these words, this seed and this language, so no column here can be
-- filled by a phone: they hold the server's comedy, never a task. The row goes when the haunt is
-- caught, shooed or run out.
CREATE TABLE haunt_monsters (
  haunt_id TEXT PRIMARY KEY REFERENCES haunts (id) ON DELETE CASCADE,
  -- The monster's spec as the art package draws it: ids and numbers, as JSON.
  spec TEXT CHECK (spec IS NULL OR json_valid(spec)),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  title TEXT NOT NULL CHECK (length(title) <= 60),
  flavour_text TEXT NOT NULL CHECK (length(flavour_text) BETWEEN 1 AND 160),
  language TEXT NOT NULL CHECK (language IN ('en', 'vi')),
  signature TEXT NOT NULL CHECK (length(signature) BETWEEN 1 AND 128)
);
