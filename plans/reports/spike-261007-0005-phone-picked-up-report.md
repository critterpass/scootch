# Spike: Phone Picked Up Detection

> **Controller's reading, 7 Oct 2026.** Research only; nothing was run on a device.
> Decision taken from this report: the app cannot know the phone was picked up
> while it is locked. The Live Activity therefore always carries an in-character
> line, which is what the user sees on any pick-up, and the "you picked me up"
> show plays when Scootch is opened or its Live Activity is tapped during a
> session.
> One correction: the report calls the Screen Time shield unsuited to a consumer
> app. Family Controls has had an individual (non-parental) authorisation since
> iOS 16 and consumer focus apps use it, with an entitlement Apple must approve.
> It stays a possible feature after launch, not a dead end.


**Verdict**: No reliable system API exists to detect device pickup while app is backgrounded and phone locked. None of the evaluated mechanisms—ActivityKit, Live Activity updates, Core Motion, Screen Time APIs, or Focus filters—can cleanly trigger a background callback when the user picks up the phone. Three workarounds exist, each with trade-offs.

## Mechanism Evaluation

| Mechanism | App Runs in Background? | Can Detect Pickup? | Notes |
|-----------|------------------------|--------------------|-------|
| ActivityKit | No | No | Manages Live Activities but offers no device event APIs |
| Live Activity push update | App async task | Only if pushed | Requires server to send push; doesn't detect pickup locally |
| `protectedDataDidBecomeAvailable` (unlock) | No | No | App backgrounded → callback doesn't fire; about data protection, not screen unlock |
| Background execution (timer) | No | No | Apps cannot run timers backgrounded; execution halts within seconds |
| Core Motion | Maybe | Unreliably | CMMotionManager stops within seconds unless Core Location also running; CMSensorRecorder could work for retrospective analysis |
| Screen Time APIs (DeviceActivity) | App extension | Unreliably | Designed for parental controls; eventDidReachThreshold often never fires (forum reports, unresolved) |
| Focus filters | No | No | Customize app behavior during Focus modes; don't detect unlock |
| App Intents | No | No | Voice/automation framework; no background execution for events |
| iOS 18.4+ new (Nearby Interaction + Live Activity) | Yes, limited | No | Enables background ranging only; not device pickup detection |

**All marked "No" or "Unreliably" are documented/inferred from forums; none verified on device.**

## Honest Alternatives

1. **React on foreground open** (docstring: Molar notices the unlock if Scootch is opened afterward)
   - Simplest, 100% reliable. Log focus session when Scootch regains foreground; cross-reference with timer state.
   - **Trade-off**: Requires user to open app; won't trigger if they unlock to check a notification.

2. **Tap the Live Activity** (user action on Lock Screen)
   - Tapping a Live Activity brings Scootch to foreground. Detect and react there.
   - **Trade-off**: Explicit tap required; less "magical."

3. **Notification on focus completion** (ignore pickup, react on timer end)
   - Schedule a local notification when focus starts. Fire when timer expires.
   - **Trade-off**: No reaction to pickup specifically, but satisfies the "Molar notices" intent (he gets a message after the session).

4. **Screen Time Shield** (rare, requires Family Controls)
   - Create a DeviceActivitySchedule that tracks when other apps launch during focus time, apply ManagedSettings shield to block them.
   - **Trade-off**: Requires com.apple.developer.family-controls entitlement; not suited for a public consumer app (Family Controls is for parental oversight); users may reject the permission; shield blocks apps, not just notifies.

## Recommendation

**Use Alternative 1 (foreground open):** When Scootch returns to foreground, check if an active focus session exists. If so, log the pickup and update the UI with the "You picked me up" message. Pair with Alternative 3 (notification) for users who don't re-open the app before the timer ends.

If the design requires true background reaction, accept that iOS cannot reliably deliver it without asking the user to grant invasive Family Controls permissions. Retarget the design to foreground interactions.

## Sources

- [Live Activity documentation](https://developer.apple.com/documentation/activitykit/) — **Apple official**
- [protectedDataDidBecomeAvailable](https://developer.apple.com/tutorials/data/documentation/uikit/uiapplicationdelegate/applicationprotecteddatadidbecomeavailable(_:).md) — **Apple official**
- [iOS background execution limits](https://developer.apple.com/forums/thread/793820) — **Apple forum**
- [Screen Time API reliability issues](https://developer.apple.com/forums/thread/735704) — **Apple forum (unresolved)**
- [Nearby Interaction with Live Activity (iOS 18.4+)](https://developer.apple.com/forums/thread/818917) — **Apple forum, inferred capability**
- [Core Motion background behavior](https://developer.apple.com/forums/thread/841001) — **Apple forum**
