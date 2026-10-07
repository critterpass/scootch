// The server's signature over a monster's name, title and card line, as JSON, kept so the words
// can later be put on a public page. A monster hatched before this column has none, and its
// picture is then shared without a page.
export const sql = `
  ALTER TABLE monsters ADD COLUMN signed TEXT;
`;
