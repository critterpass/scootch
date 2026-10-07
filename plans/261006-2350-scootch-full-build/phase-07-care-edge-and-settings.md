# Phase 07: care, edge states and settings

Status: not started · Tasks: 8 · Needs: 03, 04
Owns: `apps/mobile/src/features/{care,offline,settings,privacy}`

Goal: Scootch behaves well when the task is heavy, the network is gone or the
user needs something different. Board: Care and Edge States. Read product-brief
section 6 first.

High effort for tasks 1 and 2.

### 1. Serious mode
- Do: the on-device keyword gate runs before anything is sent (idioms removed
  first; an explicit crisis phrase triggers crisis at once; any dark word
  holds the joke), then the Jev screen decides. No joke about a task before
  it has been screened.
  A serious task gets plain copy, no monster, no card, no share, no burst, an
  ink-grey disc and a plain finish. "It's fine, be funny" overrides it.
- Test: every place that renders a monster, a joke, a card or a share checks
  the flag. One test walks a serious task through the whole day loop and
  asserts none appears.
- Status: partly done — 45cd82d; built and tested with fakes, not yet run on a device

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
- Status: partly done — 45cd82d; built and tested with fakes, not yet run on a device; the helpline table is now one table shared with the website (`packages/i18n/src/helplines/`), with opening hours, a text number and an audience for each row; numbers verified at their own sources on 2026-10-07 except India (Tele-MANAS, official site would not load) and the opening hours of Hy Vọng Sống, which stay unverified; Vietnam lists 115, Ngày mai, Hy Vọng Sống and 111, closed lines say so and come last; a production bundle of the app now refuses to be made while anything is unverified, so it is blocked on those two until a person verifies them; the hours and closed states have never been seen on a device

### 3. Offline
- Do: starting works with no connection: carry on from yesterday or type
  something new; cached lines that are never about the new task; the task is
  screened and the monster hatches when the connection returns; the card,
  world piece and bar arrive later. A task typed offline gets plain company
  until it has been screened.
- Test: a task created offline syncs once, not twice.
- Status: partly done — 45cd82d; built and tested with fakes, not yet run on a device

### 4. Model unavailable
- Do: Scootch says so in one line and the user picks. Lines are written later.
- Status: partly done — 45cd82d; built and tested with fakes, not yet run on a device

### 5. Accessibility
- Do: largest text size reflows; VoiceOver labels and hints on every element;
  Reduce Motion forms; the finish-method setting.
- Done when: sheets at the largest text size for every screen in the registry,
  and a VoiceOver pass on the day loop.
- Status: partly done — 45cd82d; built and tested with fakes, not yet run on a device

### 6. Privacy and data
- Do: the plain privacy page; keep transcripts for seven days, off by default;
  export my data; delete everything, in two clear steps.
- Test: delete removes local data and calls the server delete.
- Status: partly done — 45cd82d; built and tested with fakes, not yet run on a device

### 7. Backup and restore
- Do: the token is written to a synchronisable Keychain item and to iCloud
  key-value storage, and read from whichever answers; the one line that
  explains the backup; restore on a new phone; what Scootch says when both
  are off.
- Test on two real phones: reinstall, a second phone on the same Apple ID,
  iCloud Keychain off, iCloud off, and how long the token takes to arrive.
- Done when: a device run restores a world onto a clean install.
- Status: partly done — 45cd82d; built and tested with fakes, not yet run on a device

### 8. Settings
- Do: one page, as on the board: the attitude dial; music, effects, haptics
  and motion; quiet hours; finish method; privacy and data; invite a friend.
  Add three rows the board lacks: language, Plus and helplines. Leave out
  "Sit with strangers".
- Status: partly done — 45cd82d; built and tested with fakes, not yet run on a device

## Exit

- The Care gate: the serious and crisis eval set passes with no miss, and the
  fresh-user walk shows no joke on a heavy task.
- Sheets for every state above.
