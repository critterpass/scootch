/**
 * English interface strings, and the source of the key set. Lines Scootch speaks never go here.
 */
export const en = {
  'brand.name': 'Scootch',
  'brand.plus': 'Plus',

  'talk.hold': 'Hold to talk',
  'talk.parkThought': 'Park a thought',

  'session.start': 'Start',
  'session.notNow': 'Not now',
  'session.stuck': "I'm stuck",
  'session.doneForToday': 'Done for today',

  'monster.smaller': 'Smaller',
  'monster.tooBig': 'Too big',
  'monster.catch': 'Catch him',

  'world.thingsLiveHere': {
    one: '{count} thing lives here',
    other: '{count} things live here',
  },

  'settings.title': 'Settings',
  'settings.attitude': 'Attitude',
  'settings.attitude.soft': 'Soft',
  'settings.attitude.cheeky': 'Cheeky',
  'settings.attitude.unhinged': 'Unhinged',
  'settings.quietHours': 'Quiet hours',
  'settings.privacyAndData': 'Privacy and data',
  'settings.deleteEverything': 'Delete everything',
  'settings.keepEverything': 'Keep everything',
  'settings.restorePurchases': 'Restore purchases',

  'language.en': 'English',
  'language.vi': 'Vietnamese',

  'scootch.squeakHint': 'Double tap for a squeak.',

  'launch.step': 'Step {step} of {total}',
  'launch.hello.action': 'Hi, Scootch',
  'launch.hello.hint': 'Goes on to the one setup choice.',
  'launch.attitude.soft.about': 'One gentle nudge a day.',
  'launch.attitude.cheeky.about': 'Up to three. Specific. A bit rude about the task.',
  'launch.attitude.unhinged.about': 'Escalating theatre. Never about you.',
  'launch.attitude.confirm': '{attitude} it is',
  'launch.attitude.confirm.hint': 'You can change it any time in Settings.',
  'launch.permissions.notifications': 'Notifications',
  'launch.permissions.microphone': 'Microphone',
  'launch.permissions.accept': 'Sure',
  'launch.permissions.accept.hint': 'Your phone then asks you to confirm.',
  'launch.permissions.skip.hint': 'Skips this one. Your phone asks nothing.',
  'launch.chip.reply': 'reply to one message',
  'launch.chip.water': 'drink some water',
  'launch.chip.email': 'open the scary email',
  'launch.chip.hint': 'Sets this as your one thing.',
  'launch.notificationsOff':
    'Notifications are off, so Scootch stays quiet until you open the app.',

  'composer.hold.hint': 'Hold while you talk and let go to send. Slide left to cancel.',
  'composer.toggle.hint': 'Double tap to start talking. Double tap again to send.',
  'composer.stopAndSend': 'Stop and send',
  'composer.cancelRecording': 'Cancel recording',
  'composer.recording': 'Recording, {time}',
  'composer.slideToCancel': 'Slide left to cancel',
  'composer.releaseToCancel': 'Release to cancel',
  'composer.cancelled': 'Cancelled. No harm done.',
  'composer.tooShort': 'Hold it down while you talk',
  'composer.thinking': 'Scootch is picking the one thing…',
  'composer.placeholder': 'Type the one thing…',
  'composer.typeIt': 'Type it',
  'composer.typeIt.hint': 'Turns the bar into a text field.',
  'composer.talkInstead': 'Talk instead',
  'composer.talkInstead.hint': 'Brings back hold to talk.',
  'composer.send': 'Send',
  'composer.send.hint': 'Hands this to Scootch.',
  'composer.empty': 'Nothing was heard. Hold and talk, or type it.',
  'composer.micRefused': 'The microphone is off for Scootch, so this is typing only.',
  'composer.openSettings': 'Open Settings',
  'composer.openSettings.hint': 'Opens this app in your phone’s Settings.',
  'composer.voiceUnavailable':
    'This phone cannot turn {language} speech into text by itself. Typing works.',
  'composer.sayItAnotherWay': 'Scootch could not make sense of that. Try it in other words.',

  'oneScreen.offline': "Offline · I'll sync later",
  'oneScreen.world': 'Your world',
  'oneScreen.more': 'More',
  'oneScreen.notOpenYet': 'Not open yet',
  'oneScreen.yourTask': 'Your one thing',

  'taskSet.treat': 'Treat after this',
  'taskSet.treat.placeholder': 'Name it',
  'taskSet.treat.hint': 'Name something nice for afterwards. You can leave it empty.',
  'taskSet.minutes': '{minutes} min',
  'taskSet.minutes.hint': 'Sets how long the session runs.',
  'taskSet.start.hint': 'Starts a {minutes} minute session.',
} as const;
