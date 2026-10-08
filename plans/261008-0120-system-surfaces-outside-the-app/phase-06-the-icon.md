# Phase 06: The icon

Owns: `apps/mobile/assets/icons`, `apps/mobile/assets/render-app-icon.ts`,
`apps/mobile/modules/app-icon` (new), `apps/mobile/src/features/look`.

### 1. Ten icons
- Do: Soft, Cheeky and Unhinged, and one per finish, each drawn by the icon
  script in Default, Dark, Clear and Tinted.
- Status: done — see the commit that adds `apps/mobile/assets/icons`. Drawn in Default, Dark and Tinted; Clear is the system's own treatment of those and has not been seen

### 2. Changing it
- Do: a small native module that sets the alternate icon. The icon follows
  the attitude, follows the worn finish, or stays as picked; it changes only
  while the app is in front, since iOS shows its own alert.
- Test: which icon for each mode, attitude, finish and who may wear it.
- Status: done — same commit. Which icon is tested; the module, the asset catalogue entries and the system's alert have not run in a build. The picker that changes the two settings is the Look phase
