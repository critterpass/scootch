# Phase 07: Look and wallpaper

Owns: `apps/mobile/src/features/settings`, `apps/mobile/src/features/look`,
`apps/mobile/src/app/look`.

### 1. Settings · Look
- Do: a Look group with App icon, Card finish (opens the studio), Wallpaper
  and "Icon changes with", each row previewing what is picked. "Monsters
  message me" shows the attitude's limit.
- Status: done — see the commit that adds `apps/mobile/src/features/look/look-section.tsx`, without the Wallpaper row (below) and without "Monsters message me", which is not built. Not seen on a phone

### 2. The icon picker
- Do: the preview between two neighbours, the three modes, the attitude and
  finish icons with their locks.
- States: a finish that may not be worn (opens the studio on it).
- Status: done — same commit. Type-checked and linted; the page has not been drawn on a phone or in a device run

### 3. Wallpaper
- Do: three drawings of the user's own world sized for the Lock Screen; "Save
  to Photos"; "Refresh every morning" explains the Shortcuts automation and
  opens Shortcuts.
- States: an empty world, photos refused.
- Status: todo
