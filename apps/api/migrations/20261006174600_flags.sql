-- Feature flag overrides. A flag with no row uses its default from the code.
CREATE TABLE flags (
  name TEXT PRIMARY KEY,
  "on" INTEGER NOT NULL CHECK ("on" IN (0, 1))
);
