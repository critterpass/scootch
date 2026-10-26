/** The tuition page in English: brief, section 7. */
export const tuitionEn = {
  title: 'Tuition · Phu’s Class',
  description:
    'What is free for good, what tuition adds, the two plans, the free week, the scholarship and how to cancel.',
  eyebrow: 'School fees',
  headline: 'Tuition.',
  lede: 'The class is free. Tuition opens a few extras, and pays for the classroom’s tea. Nothing that affects his comment, the board, the fuse, your desk or the happenings is ever sold.',
  freeTitle: 'Free, always',
  free: [
    'Saying tasks, by voice or typing',
    'The desk, the board and every period',
    'The fuse and the drum',
    'His comments and every pose',
    'The happenings and the carvings on your desk',
    'The logbook',
    'The small widget, the Live Activity and the Dynamic Island',
    'Sharing',
    'Everything for heavy days, and the helplines',
  ],
  paidTitle: 'Tuition opens',
  paid: [
    'The timetable: your calendar as the day’s periods, with a task he picks for each free period',
    'The big widgets and StandBy',
    'The report card: the logbook printed as a school report each term, with no counts or totals',
    'And as they arrive: his spoken voice, snapping a photo of a list, and Apple Watch',
  ],
  plansTitle: 'Two plans',
  plans: [
    { name: 'School year', price: '$39.99', per: 'a year', note: 'Selected first' },
    { name: 'Month', price: '$6.99', per: 'a month', note: '' },
  ],
  plansNote:
    'Prices are in US dollars. Apple shows the price in your own currency before you buy, with any local tax.',
  trialTitle: 'The free week',
  trial: [
    'Either plan starts with Apple’s free week. Apple needs a payment method for it.',
    'Before the button, the receipt shows three days: today, the day of his reminder, and the day of the first charge.',
    'He sends one note two days before the first charge. A note goes out before every charge after that, too.',
    'Cancel any time in the week and you pay nothing.',
  ],
  receipt: {
    title: 'Receipt',
    today: 'Today',
    todayNote: 'Free week starts',
    reminder: 'Day 5',
    reminderNote: 'His reminder',
    charge: 'Day 7',
    chargeNote: 'First charge',
    ask: 'Can’t pay right now?',
  },
  scholarshipTitle: 'The scholarship',
  scholarship:
    '“Can’t pay right now?” sits under every receipt. One tap and an optional note, and you get a free school year. No proof, no questions. You can ask again.',
  backTitle: 'Coming back',
  back: 'If your tuition has lapsed, Apple may offer you a free month, once. He never mentions how long it has been.',
  rulesTitle: 'House rules',
  rules: [
    'No paywall on first launch, on the desk, during a period or at a finish.',
    'Paid features are quiet locked controls where they live.',
    'The first offer comes after your third finish, pinned to the board at recess. Never on a day with something heavy in it. Ignoring it is fine.',
  ],
  cancelTitle: 'Cancel, refund, restore',
  cancel: [
    {
      q: 'Cancel',
      a: 'Tuition is a subscription with Apple, and it renews until you cancel. On your iPhone: Settings, your name, Subscriptions, Phu’s Class, Cancel Subscription. Cancel at least a day before it renews. You keep tuition until the end of the period you paid for.',
    },
    {
      q: 'Refund',
      a: 'Apple handles every payment and refund. Ask at reportaproblem.apple.com, or from the app’s settings, where the request is one tap away. We cannot issue refunds ourselves.',
    },
    {
      q: 'Restore',
      a: 'New phone? In the app’s settings, tap Restore purchases while signed in to the same Apple Account.',
    },
  ],
  refundLink: 'reportaproblem.apple.com',
} as const;
