# Phase 06: Made to share

Owns: `packages/art/src/card/build-{story,trading-card,sticker-sheet,receipt,poster}.ts`,
`apps/mobile/src/features/share`.

### 1. The five pictures
- Do: each a pure builder in the art package, in the worn ink and finish:
  the riso story, the trading card, the sticker sheet, the day's receipt (the
  foil stamp with Plus) and the month's poster.
- Test: each builder; with the task hidden no task text is in the list.
- Status: done — every builder tested; seen as rendered pictures, not yet on a device

### 2. The share panel
- Do: one panel that offers the formats that fit what is being shared.
  Sharing rules as stored: a serious, private or unscreened task is on none of
  them; a crisis day offers none.
- Test: the share rules' test file.
- Status: done — unit-tested with a recorder in place of the phone

### 3. The month's poster on the 1st
- Do: counted on the phone from what it keeps; one notification on the 1st,
  never on a heavy day.
- Status: blocked — the counting is built and the poster is offered once the month turns; the notification on the 1st is not, because nothing can keep it off a heavy day
