# Phase 11: The batch, built and walked

Needs from the founder: nothing new for these surfaces; the Pass Type ID
certificate is Plus Materials' own.

### 1. Declared once
- Do: the oldest iOS at 17.0; the share and notification-content extensions;
  alternate icons; the photo-add wording for wallpapers; the Focus filter and
  App Shortcuts. Tech decisions section 4 lists the second batch.
- Status: done — see the commit that adds `e2e/fresh/05a-look-icon-and-wallpaper.yaml`. Tech decisions section 4 lists the batch. The two new targets need provisioning profiles and the App ID needs Communication Notifications before a signed build can pass

### 2. The build
- Do: `native-build.yml` with `profile=e2e-test`, then `profile=dev` to
  TestFlight.
- Status: dispatched — the run ids are in the pull request. The simulator build is the first compile of everything after the widgets

### 3. Walked and sheeted
- Do: the fresh-user walk starts a hunt from a widget, answers a monster's
  notification and ticks the bites; sheets of every surface beside the board.
- Status: done in part — same commit: the fresh walk goes through Settings · Look, the icon picker and the wallpaper, and answers the system's icon alert; a tour captures the picker and the wallpaper for the sheets. A hunt from a widget, a monster's notification and its bites cannot be walked: a device flow cannot add a widget or press a notification's actions. No sheets of the widgets, the Lock Screen or the notifications exist beyond the drawings made on this Mac
