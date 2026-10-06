# Phase 07: care, edge states and settings

Status: not started · Tasks: 8 · Needs: 03, 04
Owns: `apps/mobile/src/features/{care,offline,settings,privacy}`

Goal: Scootch behaves well when the task is heavy, the network is gone or the
user needs something different. Board: Care and Edge States. Read product-brief
section 6 first.

High effort for tasks 1 and 2.

### 1. Serious mode
- Do: the on-device screen runs before anything is sent, then the Jev screen.
  A serious task gets plain copy, no monster, no card, no share, no burst, an
  ink-grey disc and a plain finish. "It's fine, be funny" overrides it.
- Test: every place that renders a monster, a joke, a card or a share checks
  the flag. One test walks a serious task through the whole day loop and
  asserts none appears.

### 2. Crisis
- Do: all tasks hidden for the day; one human sentence; helplines for the
  user's region first; "just sit with me". No override. Helplines stay one tap
  from Settings afterwards.
- Do: a helpline table by country with a source and a checked date for each
  entry, and a safe default when the country is unknown. The board lists the
  United States, Canada, the United Kingdom and Ireland, Australia, New
  Zealand and India. Vietnam must be added and verified, because the app
  launches in Vietnamese.
- Test: crisis wins over every other state, including an active session.

### 3. Offline
- Do: starting works with no connection: carry on from yesterday or type
  something new; cached lines; the monster hatches when the connection
  returns; the card, world piece and bar arrive later.
- Test: a task created offline syncs once, not twice.

### 4. Model unavailable
- Do: Scootch says so in one line and the user picks. Lines are written later.

### 5. Accessibility
- Do: largest text size reflows; VoiceOver labels and hints on every element;
  Reduce Motion forms; the finish-method setting.
- Done when: sheets at the largest text size for every screen in the registry,
  and a VoiceOver pass on the day loop.

### 6. Privacy and data
- Do: the plain privacy page; keep transcripts for seven days, off by default;
  export my data; delete everything, in two clear steps.
- Test: delete removes local data and calls the server delete.

### 7. Backup and restore
- Do: the one line that explains iCloud backup; restore on a new phone; what
  Scootch says when iCloud is off.
- Done when: a device run restores a world onto a clean install.

### 8. Settings
- Do: one page, as on the board: the attitude dial; music, effects, haptics
  and motion; quiet hours; finish method; privacy and data; invite a friend.
  Add three rows the board lacks: language, Plus and helplines. Leave out
  "Sit with strangers".

## Exit

- The Care gate: the serious and crisis eval set passes with no miss, and the
  fresh-user walk shows no joke on a heavy task.
- Sheets for every state above.
