/**
 * The plain pages in English: straight, and never joking about anything serious. The privacy
 * table is a commitment the whole product must match (the same rows as the technical decisions).
 */
export const plainEn = {
  privacy: {
    title: 'Privacy, plainly · Scootch',
    description: 'What Scootch keeps, for how long, and what is never used to train anything.',
    headline: 'Privacy, plainly.',
    intro: 'What gets kept and for how long. Nothing you say or type is ever used to train models.',
    columns: ['Data', 'Kept'],
    rows: [
      [
        'Ramble audio',
        'Never kept by Scootch. Online it goes to ElevenLabs to be turned into text; offline your phone does it',
      ],
      ['Ramble transcript', 'Until the one thing is picked (or seven days if you turn that on)'],
      ['Typed tasks', 'Until you delete them'],
      [
        'Camera photos',
        'Never leave your phone. Read on it and deleted when the camera closes; the photo a session began with waits for its after photo, a day at most',
      ],
      [
        'Words read from a Paper or Screen photo',
        'Sent only after you allow it, to be read. Not stored and not logged',
      ],
      ['Web monster-maker input', '24 hours, unless you share the card'],
      ['Shared cards and records', 'Until unshared'],
      ['Table label', 'While seated'],
      [
        'That a session is on',
        'When a session starts and ends, your phone tells us only that this device is in a session: no task, name or label. We keep one row for the device with the time it started. It is removed when the session ends, forgotten after three hours, and deleted with Delete everything. Switch it off with Others hunting in Settings',
      ],
      ['Analytics', 'Counts only, no ad ids, 13 months'],
      [
        'Crash reports',
        'What broke and where in the app, with your iPhone model and iOS version. Sent to Sentry, 90 days at most',
      ],
      ['Delete everything', 'Gone from phone and servers within 30 days'],
    ],
    notes: [
      'On this website: the monster maker stores nothing you type. If you share a card, the monster is kept (its name, its card line, and what you typed only if you left “Show what I typed” on) until you unshare it, from the browser you shared it in.',
      'If you leave an email to hear about the launch, it is kept with the monster it should bring, and used for that one email only.',
    ],
    exportTitle: 'Export',
    exportBody:
      'In the app: Settings › Privacy and data › Export my data. You get one file with your tasks, monsters and records.',
    deleteTitle: 'Delete',
    deleteBody:
      'In the app: Settings › Privacy and data › Delete everything. It’s gone from your phone and our servers within 30 days. Deleting doesn’t cancel Plus; that’s in your Apple settings.',
    questions: 'Questions: privacy@scootch.app.',
    updated: 'Last updated 9 October 2026.',
  },
  terms: {
    title: 'Terms, in plain words · Scootch',
    description: 'What using Scootch means, without the legal fog.',
    headline: 'Terms, in plain words.',
    intro:
      'This is the plain version, and it says what we mean. A full legal version will be linked here before the app goes on sale.',
    sections: [
      {
        title: 'The short version',
        body: 'Use Scootch to start things. Don’t use it to hurt people. We’ll be straight with you about money and data.',
      },
      {
        title: 'Your stuff',
        body: 'Your tasks, monsters and records are yours. You give us permission to store them so the app works, and to show anything you choose to share.',
      },
      {
        title: 'Public things',
        body: 'If you share a link, it’s public until you take it down. Don’t share other people’s private details.',
      },
      {
        title: 'Paying',
        body: 'Plus is sold by Apple. Apple handles billing, refunds and cancelling. We remind you before every charge.',
      },
      {
        title: 'Not medical advice',
        body: 'Scootch is a support tool for starting things. It doesn’t diagnose, treat or cure ADHD or anything else. If you need care, talk to a professional.',
      },
      {
        title: 'Ending',
        body: 'You can delete everything at any time. We can suspend people who abuse tables or haunting.',
      },
    ],
  },
  about: {
    title: 'What Scootch is and isn’t',
    description: 'Scootch is a support tool for starting things. Here is exactly what that means.',
    headline: 'What Scootch is and isn’t.',
    intro: '',
    sections: [
      {
        title: 'Scootch is',
        body: 'A small, silly companion that helps you start one thing a day, and keeps you company while you do it.',
      },
      {
        title: 'Scootch is for',
        body: 'People with ADHD, people who procrastinate, and anyone for whom starting is the hard part.',
      },
      {
        title: 'Scootch isn’t',
        body: 'A treatment, a therapist, a coach or a medical device. It doesn’t diagnose, treat or cure ADHD, depression, anxiety or anything else.',
      },
      {
        title: 'Scootch won’t',
        body: 'Count your days, shame you, sell your data, or pretend a monster can replace real help.',
      },
      {
        title: 'If you need more',
        body: 'Talk to your doctor or a mental health professional. If you’re struggling right now, use the helplines. They’re linked from every page.',
      },
      {
        title: 'When it gets serious',
        body: 'If what you type sounds heavy, Scootch stops joking. No monster, no card, just a kind sentence and real people to talk to.',
      },
    ],
  },
  press: {
    title: 'Press kit · Scootch',
    description: 'What Scootch is, in a paragraph, and who to write to.',
    headline: 'Press kit.',
    intro:
      'Scootch is an iPhone app that helps people start one small thing a day. You ramble at a small hand-drawn critter, and it picks one task, turns it into a named monster, and sits with you while you catch it. It’s built for people with ADHD and anyone who finds starting hard. It is a support tool, not a treatment.',
    sections: [
      {
        title: 'Facts',
        body: 'iPhone first. English and Vietnamese. Free, with one paid tier, Scootch Plus. Nothing counts your days: no points and no leaderboards.',
      },
      {
        title: 'Pictures',
        body: 'The monsters on this site are drawn live by the same generator as the app, so a screenshot of any monster you make here is free to use in coverage. A downloadable pack of logos, poses and screenshots isn’t ready yet.',
      },
      {
        title: 'Contact',
        body: 'press@scootch.app. Ask for anything that isn’t here and we’ll send what exists.',
      },
    ],
  },
  support: {
    title: 'Questions, answered straight · Scootch',
    description: 'Fifteen questions about Scootch, answered straight.',
    headline: 'Questions, answered straight.',
    intro: 'Fifteen of them. Still stuck? Write to help@scootch.app. A person reads every message.',
    notOutYet:
      'Scootch isn’t out yet. These answers describe the app as it will be on its first day.',
    helplinesLink: 'Find a helpline in your country',
    questions: [
      {
        q: 'Is Scootch free?',
        a: 'Yes. The whole day loop for up to ten things a day is free for ever: all three attitudes, every monster you catch, joining a friend’s table, and the weekly song. Plus adds extras. Nothing you need to start is behind it.',
      },
      {
        q: 'Do I need an account?',
        a: 'No. Scootch works without signing up. You only sign in to sit at a table, and that’s Sign in with Apple.',
      },
      {
        q: 'Is Scootch for ADHD?',
        a: 'It’s built for people with ADHD and for anyone who puts things off. If starting is the hard part, it’s for you. It’s a support tool, not a treatment.',
      },
      {
        q: 'Does it diagnose or treat anything?',
        a: 'No. It’s a support tool for starting things. It doesn’t diagnose, treat or cure anything, and it isn’t a substitute for care.',
      },
      {
        q: 'What happens to what I say?',
        a: 'Your voice is turned into text by ElevenLabs when you are online, and on your phone when you are not. Scootch never keeps the audio. The text is kept until your one thing is picked. None of it is ever used to train models. The privacy page has the whole table.',
      },
      {
        q: 'Why one thing at a time?',
        a: 'Because starting is the win, and a long list is the thing most of us are avoiding. Scootch picks one thing and parks the rest in a drawer. When it’s done you can pick another: up to ten a day, free.',
      },
      {
        q: 'What if I don’t finish?',
        a: '“Not finished” is a normal outcome, and Scootch gives you three choices for what happens next. It never counts days and never remarks on a gap.',
      },
      {
        q: 'Can strangers see my tasks?',
        a: 'No. Tables are for friends you invite by link, and at a table people see a one or two word label written by Scootch, never your words. Nothing is public unless you share it, and every share can hide the task.',
      },
      {
        q: 'Can I turn off the jokes?',
        a: 'You pick an attitude: Soft, Cheeky or Unhinged, and Soft is the quiet one. There’s no switch that removes Scootch’s personality completely. For anything heavy, Scootch stops joking on its own.',
      },
      {
        q: 'How do I cancel Plus?',
        a: 'In your Apple settings: your name, then Subscriptions, then Scootch. iPhone has no pause, only cancel. You keep everything you caught.',
      },
      {
        q: 'Can I get a refund?',
        a: 'Apple handles all refunds, at reportaproblem.apple.com. We can’t issue one ourselves, because Apple takes the payment.',
      },
      {
        q: 'Is there an Android app?',
        a: 'Not yet. Scootch is iPhone-only for now. Android is planned, with no date. You can leave an email on the Android page, and the monster maker on this site works on any phone.',
      },
      {
        q: 'Does it work offline?',
        a: 'Starting never depends on a server, so a session runs with no connection. Offline, Scootch keeps you company in plain words, and a new task’s monster hatches once you’re back online.',
      },
      {
        q: 'How do I delete everything?',
        a: 'In the app: Settings › Privacy and data › Delete everything. It’s gone from your phone and our servers within 30 days. It doesn’t cancel Plus; that’s in your Apple settings.',
      },
      {
        q: 'I’m having a really hard time',
        a: 'Then Scootch isn’t the right help for this moment, and real people are. The helplines page lists free, confidential lines by country. If you’re in immediate danger, call your local emergency number.',
      },
    ],
  },
  helplines: {
    title: 'Helplines · Scootch',
    description: 'Free, confidential helplines by country.',
    headline: 'Talk to someone now.',
    intro:
      'These are free, confidential and staffed by people. If you’re in immediate danger, call your local emergency number.',
    emergency: 'Emergency',
    anywhere: 'Anywhere else',
    footnote: 'No Scootch, no jokes, no tracking on this page.',
  },
} as const;
