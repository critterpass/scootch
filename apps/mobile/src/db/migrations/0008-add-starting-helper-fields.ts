// What the starting helpers keep. A task: the guess at how long it would take, when it is brought
// back (JSON), what is in the way, and the line left for the next sitting (JSON). A caught monster:
// the guess and the word an odd hatch added, frozen with the card. A day: a clock time the user
// said (JSON). A row stored before these columns has none of them.
export const sql = `
  ALTER TABLE tasks ADD COLUMN guess_minutes INTEGER;
  ALTER TABLE tasks ADD COLUMN start_cue TEXT;
  ALTER TABLE tasks ADD COLUMN in_the_way TEXT;
  ALTER TABLE tasks ADD COLUMN next_start TEXT;
  ALTER TABLE monsters ADD COLUMN guess_minutes INTEGER;
  ALTER TABLE monsters ADD COLUMN odd_word TEXT;
  ALTER TABLE days ADD COLUMN heard_time TEXT;
`;
