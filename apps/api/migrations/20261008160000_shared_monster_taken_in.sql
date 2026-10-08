-- A website monster can arrive in the app as itself. The phone that took it in may then mark its
-- page caught, with no unshare token: only its device hash is kept. The kind line the task call
-- wrote for it on arrival is kept too, so the page's card can show it and a second arrival gets
-- the same one.
ALTER TABLE shared_monsters ADD COLUMN taken_in_by TEXT;
ALTER TABLE shared_monsters ADD COLUMN kind_line TEXT;
