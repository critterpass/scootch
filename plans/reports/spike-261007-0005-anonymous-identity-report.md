# Spike: Anonymous Identity Surviving Reinstall and New Device

> **Controller's reading, 7 Oct 2026.** Research only; nothing was run on a device.
> Decision taken from this report: store the token in both a synchronisable
> Keychain item and iCloud key-value storage, and read whichever answers first.
> iCloud Keychain can be off while iCloud is on, and the reverse, so one alone
> leaves a gap. The "about 10% ghost state" figure for key-value storage comes
> from forum posts and is not a measured number. The device checklist below is
> a list of things to test in native batch one; the tick marks do not mean
> they were tested.


**Verdict**: Use **Keychain with iCloud sync** (`kSecAttrSynchronizable`). It survives reinstalls and reaches second devices, works when iCloud is on, and has a simple fallback when iCloud is off. Avoids CloudKit's complexity and NSUbiquitousKeyValueStore's known reliability issues. React Native library support varies; test custom Keychain code on real devices.

## Comparison Matrix

| Attribute | NSUbiquitousKeyValueStore | Keychain + iCloud Sync | CloudKit Private DB |
|-----------|---------------------------|------------------------|---------------------|
| **Survives reinstall (same phone)** | Yes (iCloud pushes data back) | Yes (iCloud Backup or Keychain sync) | Yes (persists in iCloud account) |
| **Reaches second device** | Yes (syncs via iCloud) | Yes (via iCloud Keychain if enabled) | Yes (per-user account) |
| **Speed** | Medium; sync shortly after launch but delays common | High; iCloud Keychain faster | High; CloudKit optimized |
| **Reliability** | Medium (~10% of users in ghost state where iCloud logged in but fails) | High; iCloud Keychain more stable | High; mature framework |
| **iCloud off behavior** | Falls back to local-only storage; no sync | Keychain items don't sync; local Keychain still works | Private database unavailable; requires iCloud account |
| **Size limits** | Implied small (not documented) | No strict limit | Counts toward user iCloud quota |
| **RN/Expo library** | `react-native-icloudstore` | `react-native-keychain` (partial); `react-native-sensitive-info` (full iCloud support) | `react-native-cloudkit` (minimal Expo support; custom native code) |
| **Entitlement** | `com.apple.developer.ubiquity-kvstore-identifier` | (iCloud Keychain system settings; no explicit entitlement) | `com.apple.developer.icloud-container-identifiers` |

**Source status**: Reliability stats inferred from forum posts; others from **Apple official docs**.

## Recommendation

### Primary: Keychain with iCloud Sync

Store the anonymous token in Keychain with `kSecAttrSynchronizable = true`. This enables:
- Token persists on reinstall (via iCloud Backup)
- Token reaches new device (via iCloud Keychain system)
- Simple, single-record storage for one token
- Mature, stable system (unlike NSUbiquitousKeyValueStore's known ghost-state issues)

**Implementation notes:**
- Set `kSecAttrSynchronizable: kCFBooleanTrue` when adding the Keychain item
- Requires user to have iCloud Keychain enabled (most do)
- `react-native-sensitive-info` has `iosSynchronizable` option; `react-native-keychain` does not expose it by default (may need custom Keychain queries)

### Fallback: Local Token When iCloud Off

When iCloud Keychain is disabled:
1. Generate and store a local anonymous token in regular Keychain or UserDefaults
2. On iCloud re-enable, ask user to sign in again (or background migration: detect iCloud Keychain availability and migrate if needed)
3. Log analytics: how many users are without iCloud Keychain?

## Device Testing Checklist

**Required before shipping:**
1. ✅ Fresh install on same iPhone → restore from iCloud → token present
2. ✅ New iPhone with same Apple ID → token syncs via iCloud Keychain
3. ✅ iCloud Keychain toggled off in Settings → fallback token generation works
4. ✅ Fresh install without backup → generates new anonymous token
5. ✅ Offline mode → local Keychain still accessible
6. ✅ App uninstall + reinstall same day → timing of iCloud sync (may be delayed)
7. ✅ Two devices, toggle iCloud Keychain off on one → verify isolation

**Why**: iCloud Keychain sync timing and edge cases are not fully documented; device testing is the only way to confirm user experience.

## Sources

- [NSUbiquitousKeyValueStore behavior on reinstall](https://developer.apple.com/forums/thread/767388) — **Apple forum**
- [Keychain iCloud sync with kSecAttrSynchronizable](https://developer.apple.com/forums/thread/788360) — **Apple forum**
- [CloudKit private database docs](https://developer.apple.com/documentation/cloudkit/ckcontainer.md) — **Apple official**
- [Expo SecureStore (no iCloud sync)](https://docs.expo.dev/versions/v48.0.0/sdk/securestore) — **Apple official**
- [react-native-sensitive-info iosSynchronizable](https://github.com/mCodex/react-native-sensitive-info) — **Community library**
- [NSUbiquitousKeyValueStore reliability issues](https://mjtsai.com/blog/2023/01/02/overcast-keeping-its-servers) — **Developer report (inferred risk)**
