/**
 * Privacy and terms in English: plain, and never joking. The privacy page states what the code
 * does (`apps/api/src`, `apps/mobile/app.config.ts`); change it whenever that changes.
 */
export const legalEn = {
  privacy: {
    title: 'Privacy · Phu’s Class',
    description:
      'What Phu’s Class keeps, where it goes and for how long. Your voice is turned into text and never kept by us. No ads, no tracking, nothing sold.',
    headline: 'Privacy, plainly.',
    lede: 'Phu’s Class keeps as little as it can, mostly on your phone. There are no accounts, no ads and no tracking, and nothing is sold. What you say is never used to train models.',
    updated: 'Last updated 27 October 2026.',
    tableTitle: 'At a glance',
    columns: ['What', 'Where it goes', 'How long'],
    rows: [
      [
        'Your voice',
        'Streamed while you hold to talk to ElevenLabs (Scribe), which sends back the text. Never kept by us',
        'Not kept by us. ElevenLabs keeps it under its own policy',
      ],
      ['Your tasks, board and logbook', 'Your phone', 'Until you delete them'],
      [
        'Backup, if it is on',
        'One snapshot of your app’s data on our server, under an anonymous token',
        'Until the next backup replaces it, or you delete it',
      ],
      ['Text checked for heavy topics', 'Our server, then TypeSafe', 'Not stored, not logged'],
      [
        'Text for a fresh line',
        'Our server, then Anthropic (Claude): the task’s words only',
        'Not stored by us. Anthropic deletes it within 30 days',
      ],
      ['Your calendar', 'Read on your phone only', 'Never leaves your phone'],
      [
        'Purchases',
        'Apple and RevenueCat, with an anonymous id',
        'While you have tuition, and as Apple’s records require',
      ],
      [
        'Notes home',
        'An Apple notification token on our server',
        'Until you turn notes off or delete everything',
      ],
      ['Crash reports', 'Sentry, in the EU', '90 days at most'],
    ],
    sections: [
      {
        title: 'Who we are',
        body: [
          'Phu’s Class is made by Odd Eggs Studio, which is responsible for the data described here. Write to privacy@phusclass.com about anything on this page.',
        ],
      },
      {
        title: 'Hearing you',
        body: [
          'When you hold to talk, the audio is streamed from your phone to ElevenLabs (Scribe), a speech-to-text service, which sends back the words as you speak, in whichever language you speak. The audio goes straight from your phone to ElevenLabs; our server only gives your phone a one-time key for it. We never receive or keep the audio, and neither does the app. ElevenLabs handles it under its own privacy policy (elevenlabs.io/privacy). Hearing needs a connection. You can always type instead.',
        ],
      },
      {
        title: 'Your tasks',
        body: [
          'Everything you say or type, the board, the logbook and your desk live in a database on your phone. There is no account and no sign-in.',
          'If backup is on, the app sends one snapshot of that data to our server so it can come back on a new phone. It is stored under an anonymous backup token kept in your iCloud; our server keeps only a fingerprint (a hash) of that token, not the token itself, and nothing that says which phone sent it. Each backup replaces the one before. A snapshot is at most 512 KB. Delete everything removes it.',
        ],
      },
      {
        title: 'Checking for heavy things',
        body: [
          'Before Thầy Phú says anything pointed about a task, its text is checked for crisis or heavy topics, so that the act can stop. Your phone checks first, with no connection. When you are online, the text is also sent to our server and from there to TypeSafe, a service that judges it. If TypeSafe does not answer, Anthropic (Claude) answers in its place. If Vietnamese was typed without tone marks, Claude may first restore them so it can be read properly.',
          'This text is not stored and not logged on our server, and it is never used to train models. When Claude reads it, Anthropic’s API terms apply, as below.',
        ],
      },
      {
        title: 'His fresh lines',
        body: [
          'Most of his lines are written in advance and come from the app itself. When you are online and a task is one he has no good line for, our server asks Anthropic (Claude) to write one. Only the task’s words are sent, with no name, device id or anything else about you. We do not store them.',
          'Under Anthropic’s API terms, the words are not used to train models, and Anthropic deletes them within 30 days. It keeps them longer only where the law requires it or to enforce its usage policy (privacy.claude.com).',
        ],
      },
      {
        title: 'Your calendar',
        body: [
          'If you open the timetable and allow it, the app reads your calendar events on your phone to lay out the day. They never leave your phone, and the app never changes your calendar.',
        ],
      },
      {
        title: 'Your device, to our server',
        body: [
          'The first time the app talks to our server it makes a random device token. Our server keeps only a hash of it, the app’s language, and when it was first and last seen. It is not linked to your name, email or Apple Account.',
          'For each call to a model we record the route, the model and the number of tokens used, never the text, so we can see what the service costs. When you delete everything, those records are cut loose from your device.',
        ],
      },
      {
        title: 'Purchases',
        body: [
          'Apple takes every payment; we never see your card. RevenueCat keeps track of whether you have tuition, under an anonymous id our server makes from your device token. Our server keeps whether tuition is active, which plan, and when it ends.',
        ],
      },
      {
        title: 'Notes home',
        body: [
          'If you let him send notes home, Apple gives the app a notification token, and our server keeps it, with the app it belongs to, so the notes can reach you. A Live Activity has tokens of its own, kept the same way while it runs. Turn notes off or delete everything and they go.',
        ],
      },
      {
        title: 'Photos',
        body: [
          'The app only ever adds a card you choose to save to your photos. It never looks at the rest.',
        ],
      },
      {
        title: 'Crash reports',
        body: [
          'When the app breaks, a report goes to Sentry, stored in the EU: what broke and where in the app, your iPhone model and iOS version. It is set up to leave out your name, your tasks and anything you typed. Reports are deleted after 90 days at most.',
        ],
      },
      {
        title: 'What we never do',
        body: [
          'No ads. No tracking across apps or websites. No selling or sharing your data for marketing. Nothing you say is used to train models. The services named here are used only to run Phu’s Class.',
        ],
      },
      {
        title: 'Export and delete',
        body: [
          'In the app’s settings you can export everything into one file, and delete everything. Deleting removes your data from your phone, and from our server it removes your device’s record, its notification tokens and your backup at once. Crash reports expire on their own within 90 days. Deleting does not cancel tuition: that is in your Apple settings.',
          'You can also write to privacy@phusclass.com to ask what we hold, to correct it or to delete it. Because there are no accounts, we may need your help to find what is yours.',
        ],
      },
      {
        title: 'This website',
        body: [
          'phusclass.com sets no cookies and runs no analytics. The chalkboard on the home page works entirely in your browser: nothing you type there is sent anywhere. Our host, Cloudflare, handles requests to serve the pages.',
        ],
      },
      {
        title: 'Children',
        body: [
          'Phu’s Class is not for children under 13, and we do not knowingly collect data from them.',
        ],
      },
      {
        title: 'Changes',
        body: [
          'If this policy changes, the new version goes here with a new date. If a change matters to how your data is used, the app will tell you first.',
        ],
      },
    ],
    contact: 'Questions: privacy@phusclass.com',
  },
  terms: {
    title: 'Terms · Phu’s Class',
    description:
      'The terms of using Phu’s Class and of tuition, in plain words: subscriptions, the free week, cancelling and refunds.',
    headline: 'Terms of use.',
    lede: 'The plain version of the deal between you and Odd Eggs Studio, the maker of Phu’s Class. By using the app or this site you agree to it.',
    updated: 'Last updated 27 October 2026.',
    crisisTitle: 'In a crisis',
    crisis:
      'Phu’s Class is not an emergency or crisis service. If you might hurt yourself or someone else, call your local emergency number now, or talk to a free, confidential helpline.',
    crisisLink: 'Find a helpline',
    sections: [
      {
        title: 'Who we are',
        body: [
          'Phu’s Class is published by Odd Eggs Studio (“we”). Write to hello@phusclass.com about anything here.',
        ],
      },
      {
        title: 'Who can use it',
        body: ['You must be at least 13 to use Phu’s Class.'],
      },
      {
        title: 'A support tool, not medical care',
        body: [
          'Phu’s Class is a support tool for starting things. It does not diagnose, treat, cure or prevent ADHD or any other condition, and it is not a substitute for professional care. Talk to a qualified professional about your health.',
          'Thầy Phú is a character. His lines are written to be funny about the task in front of you; some are written by a model and can be wrong or odd. Nothing he says is advice.',
        ],
      },
      {
        title: 'Your things',
        body: [
          'Your tasks and everything you write are yours. You let us process them only as needed to run the app: for example, to check a task for heavy topics or write a line about it, as the privacy page explains.',
        ],
      },
      {
        title: 'Acceptable use',
        body: [
          'Use Phu’s Class for yourself, lawfully. Don’t try to break, overload or get around its services or its safety checks, don’t use it to produce harmful or abusive material, and don’t copy or resell it. We may suspend access from a device that abuses the service.',
        ],
      },
      {
        title: 'Tuition: subscriptions',
        body: [
          'Tuition is an auto-renewing subscription sold through Apple, by the year or by the month. Payment is charged to your Apple Account when you confirm, or when the free week ends. It renews at the same length and price unless you cancel at least 24 hours before the end of the current period.',
          'The free week: each plan can start with one free week. Apple needs a payment method for it. If you don’t cancel at least 24 hours before it ends, the plan you chose starts and is charged. He sends a reminder two days before the first charge.',
          'Cancel in your iPhone’s Settings: your name, Subscriptions, Phu’s Class. Cancelling stops the next renewal; you keep tuition until the end of the period already paid for.',
          'Refunds are handled by Apple under its own rules, at reportaproblem.apple.com or from the app’s settings. We cannot issue refunds ourselves.',
          'If a price changes, Apple tells you before it applies, and you can cancel. A scholarship is a free school year of tuition we grant on request, with no proof needed.',
        ],
      },
      {
        title: 'Apple',
        body: [
          'The app is licensed to you under Apple’s standard Licensed Application End User License Agreement, together with these terms. Apple is not responsible for the app or for support of it.',
        ],
      },
      {
        title: 'The service',
        body: [
          'Typing tasks and running periods work on your phone without a connection; hearing you needs one. Online parts, such as fresh lines and backup, may sometimes be unavailable or change. We may update or end features, and will be straight with you about it.',
        ],
      },
      {
        title: 'Liability',
        body: [
          'Phu’s Class is provided as it is. To the extent the law allows, we are not liable for indirect or consequential losses, and our total liability to you is limited to what you paid us in the 12 months before the claim. Nothing here limits rights you have under the consumer law of your country that cannot be limited.',
        ],
      },
      {
        title: 'Ending',
        body: [
          'You can stop using Phu’s Class at any time and delete everything from the app’s settings. Deleting does not cancel tuition; cancel that in your Apple settings.',
        ],
      },
      {
        title: 'Changes to these terms',
        body: [
          'If these terms change, the new version goes here with a new date. If a change matters, the app tells you before it applies.',
        ],
      },
    ],
    contact: 'Questions: hello@phusclass.com',
  },
} as const;
