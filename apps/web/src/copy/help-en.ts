/** Support and helplines in English. The helplines page never jokes. */
export const helpEn = {
  support: {
    title: 'Support · Phu’s Class',
    description:
      'Questions about Phu’s Class answered: purchases, cancelling, refunds, the scholarship, your data and language.',
    eyebrow: 'Support',
    headline: 'Questions, answered.',
    lede: 'Still stuck? Write to support@phusclass.com. A person reads every message.',
    email: 'support@phusclass.com',
    writeTo: 'Write to us',
    notOutYet:
      'Phu’s Class isn’t out yet. These answers describe the app as it will be on its first day.',
    questions: [
      {
        q: 'How do I restore my purchase?',
        a: 'In the app’s settings, tap Restore purchases while signed in to the Apple Account you paid with. Tuition comes back on a new phone the same way.',
      },
      {
        q: 'How do I cancel tuition?',
        a: 'On your iPhone: Settings, your name, Subscriptions, Phu’s Class, Cancel Subscription. Cancel at least a day before it renews. You keep tuition until the end of the period you paid for.',
      },
      {
        q: 'Can I get a refund?',
        a: 'Apple takes every payment, so Apple handles refunds: at reportaproblem.apple.com, or from the app’s settings, where the request is one tap away. We can’t issue one ourselves.',
      },
      {
        q: 'What is the scholarship?',
        a: 'Under every receipt in the app is “Can’t pay right now?”. One tap and an optional note gets you a free school year of tuition. No proof, no questions, and you can ask for it again.',
      },
      {
        q: 'How do I delete my data?',
        a: 'In the app’s settings: Delete everything. It removes your data from your phone, and from our server your device’s record, its notification tokens and your backup, at once. It doesn’t cancel tuition; that’s in your Apple settings.',
      },
      {
        q: 'Can I export my data?',
        a: 'Yes. In the app’s settings, Export gives you one file with your tasks and your logbook.',
      },
      {
        q: 'How do I change the language?',
        a: 'Phu’s Class speaks English or Vietnamese, one at a time, following your phone. To change only this app: iPhone Settings, Apps, Phu’s Class, Language.',
      },
      {
        q: 'How do I stop the notes home?',
        a: 'Turn them off in the app’s settings, or in iPhone Settings, Notifications. He also goes quiet on his own on days they are ignored, and respects Sleep and Focus.',
      },
      {
        q: 'Something heavy is going on.',
        a: 'Then the act stops: no jokes, no grade, no pressure. And if you are having a really hard time, real people can help. The helplines page lists free, confidential lines by country.',
      },
    ],
    helplinesLink: 'Find a helpline',
  },
  helplines: {
    title: 'Helplines · Phu’s Class',
    description: 'Free, confidential helplines by country.',
    headline: 'Talk to someone now.',
    intro:
      'These are free, confidential and answered by people. If you are in immediate danger, call your local emergency number.',
    emergency: 'Emergency',
    anywhere: 'Anywhere else',
    footnote: 'This page has no tracking.',
  },
} as const;
