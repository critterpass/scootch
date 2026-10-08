# Phase 3: the App Clip

Effort: high (a Swift target).

### 1. The clip shows the monster
- Do: read the invocation link, fetch the monster's page, and show its preview
  card, its name and one plain sentence in English or Vietnamese, with the App
  Store overlay for the full app. No monster for a link that is not a
  monster's; no word about being a placeholder anywhere.
- The link is still kept in the App Group for the app to read.
- Check: `swiftc` type-check on the Mac; the first signed app is the proof.
- Status: done — see the commit that makes the App Clip show the monster.
  Type-checked and drawn on the Mac; not yet opened on a phone.

### 2. The words
- Do: the clip's sentences are interface words, not Scootch's voice, and live
  in the target's string catalogue in both languages.
- Status: done — see the same commit (`en.lproj` and `vi.lproj` in the target).

Done when: a signed app opens the clip from a monster's link on a phone.
