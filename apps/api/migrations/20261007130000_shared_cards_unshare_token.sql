-- A card or a story shared from the app can be taken down again by the phone that shared it. The
-- phone keeps the token; only its SHA-256 hash is stored, as for a shared monster. A row with no
-- hash cannot be taken down by anyone. Nothing about the phone or its account is kept beside it.
ALTER TABLE shared_cards ADD COLUMN unshare_token_hash TEXT;
