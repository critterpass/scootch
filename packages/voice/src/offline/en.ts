import type { OfflinePack } from './types';

export const enOffline: OfflinePack = {
  lines: {
    soft: {
      hatch: ['Something small has hatched. It can wait right here while we look at it.'],
      start: ["Here we go. I'm sitting right beside you."],
      working: [
        "I'm here. Nothing else needs us right now.",
        "One small piece at a time. I'm holding the rest.",
        "I've made myself comfortable. Take the time you need.",
        'Quiet company, as promised.',
      ],
      pickedUp: ["Oh, hello. I'm still here, and so is your place."],
      checkIn: ['How is it going? I have a smaller step ready if you want one.'],
      tinyNextStep: ['Pick the smallest piece you can see and touch only that.'],
      twoMinutesLeft: ['Two minutes to go. No need to hurry.'],
      timeUp: ["Time. Catch it whenever you're ready."],
      caught: ['Caught. That was the whole job.'],
      notFinished: ['You started, and that counts. What would you like to do with it now?'],
      tinierNextStep: ['Only look at the first piece. Looking counts.'],
      tiniestNextStep: ['Put one hand on it. That is all.'],
      treatHandOver: ['As promised: {treat}. It kept warm for you.'],
      parkedThoughts: ['Here are the thoughts you parked. I kept them safe and dry.'],
      releasedEarly: ['Let go a little early. No harm done; hold the button when you like.'],
      notification: [
        "I'm by the door with one small thing, whenever you like.",
        'One small thing is keeping warm here. No hurry.',
        'I saved us a quiet spot for the one thing.',
      ],
      flavourText: ['Small, patient and fond of corners. Weak against a gentle start.'],
    },
    cheeky: {
      hatch: ['Well, look what crawled out. It already thinks it owns the place.'],
      start: ['Off we go. The monster has stopped whistling.'],
      working: [
        "I'm keeping an eye on it. It is keeping an eye on me.",
        'The monster is pretending to read. The book is upside down.',
        "I've drawn a plan. It is mostly arrows.",
        "It just asked what you're doing. I said nothing.",
      ],
      pickedUp: ["Oh! You picked me up. Mind the paws, I'm on watch."],
      checkIn: ["How's it going in there? I have a tinier step in my pocket."],
      tinyNextStep: ["Do the smallest bit you can see. I'll deal with the heckling."],
      twoMinutesLeft: ['Two minutes on the clock. The monster is packing a very small bag.'],
      timeUp: ["Time. It's cornered and it knows it. Go catch it."],
      caught: ['Caught. It went quietly, apart from the speech.'],
      notFinished: ['You started, and the monster noticed. What do we do with it now?'],
      tinierNextStep: ['Just look at the first bit. Staring is allowed.'],
      tiniestNextStep: ['Touch it with one finger. Done.'],
      treatHandOver: ['A deal is a deal: {treat}. I only sniffed it once.'],
      parkedThoughts: ['Your parked thoughts, as left. One of them tried to escape.'],
      releasedEarly: ['Slipped off the button. It happens to paws too. Hold it when you like.'],
      notification: [
        'Your monster has started rearranging the furniture. One small start?',
        "The monster wants a word. I told it you'd bring ten minutes.",
        "I'm guarding the one thing. It is guarding its snacks.",
      ],
      flavourText: ['Lives rent-free and has opinions. Weak against one small start.'],
    },
    unhinged: {
      hatch: ['IT HATCHED. It looked at me. I looked at it. Nobody blinked.'],
      start: ["WE'RE OFF. I have put on a tiny helmet."],
      working: [
        'I AM NARRATING THIS TO A SPOON. The spoon is riveted.',
        'The monster made a face at me. I made one back. Stalemate.',
        'I built a fort out of nothing. It is holding.',
        'STATUS: you are working, I am vibrating. All normal.',
      ],
      pickedUp: ['YOU PICKED ME UP. I was mid-stare. The monster won that round.'],
      checkIn: ['REPORT: how is it going? I have a smaller step hidden in my cheek.'],
      tinyNextStep: ['Do the tiniest bit you can see. I will distract the monster with a dance.'],
      twoMinutesLeft: ['TWO MINUTES. The monster is packing. It owns one sock.'],
      timeUp: ['TIME. IT IS CORNERED. Go catch it before I try and lose.'],
      caught: ['CAUGHT. I have told the spoon. The spoon wept.'],
      notFinished: ['You started, and the monster saw everything. What do we do with it now?'],
      tinierNextStep: ['JUST LOOK AT THE FIRST BIT. Looking is a move.'],
      tiniestNextStep: ['ONE FINGER. Touch it. Run.'],
      treatHandOver: ['CEREMONY TIME: {treat}. I polished it with my whole face.'],
      parkedThoughts: ['YOUR PARKED THOUGHTS. I guarded them. One bit me.'],
      releasedEarly: ['THE BUTTON GOT AWAY. It is fine. Hold it when you like. I will guard it.'],
      notification: [
        'UPDATE: your monster has learned to whistle. Ten minutes ends the concert.',
        'BREAKING: the monster has named a chair after itself. One small start?',
        'I AM STARING AT THE ONE THING. IT IS STARING BACK. Ten minutes.',
      ],
      flavourText: ['Origin unknown. Hobbies include lurking and loud chewing.'],
    },
  },
  plain: {
    acknowledge:
      "That sounds like a lot. I'll keep this one simple and quiet, and I'll sit with you.",
    working: ["I'm right here. Take your time.", 'No rush. I am staying put.'],
    tinyNextStep: 'Write down the first small step, and only that.',
    done: "That's done. I'm here if you want to sit a while.",
    notFinished: "We can leave it here for today. It will keep until you're ready.",
    reminder: "One quiet thing is waiting here. I'm around whenever you're ready.",
  },
  noTask: {
    soft: {
      hello: "Oh, hello. I'm Scootch. I'm glad you're here.",
      about: 'I help you start one small thing a day, and I sit with you while you do it.',
      attitudeAsk: 'How much drama would you like from me?',
      favours: "Two small favours, if that's all right.",
      notificationsWhy: 'so I can nudge you gently',
      microphoneWhy: 'so you can talk it through',
      firstOneThing:
        "Let's warm up. What's one small thing that's been on your mind? Smaller is better.",
      waiting: "I'm here. What's the one thing today?",
      typing: 'Typing is lovely. Take your time.',
      doneForToday: "Done for today. Go and rest. I'll keep things cosy here.",
      plusSheet: "If you'd like a little more of me, it's here. No rush at all.",
      plusOneMore: 'A second thing today lives in Plus. No rush at all.',
      plusOffer: "Three caught. There's a little more of me, if you ever want it.",
      trialStarted: "A whole week of everything. I'll tell you before it costs a thing.",
      trialEndsTomorrow:
        'Your free week ends tomorrow, and the charge comes then. I wanted you to hear it from me.',
      trialLastDay: 'The free week ends tonight. What would you like to do?',
      renewalOff: "Done. Plus won't renew.",
      plusCancelled: "That's fair. I'll still be here. The one thing a day is yours to keep.",
      lifetime: "You're staying for good. I'm so glad.",
      offline: 'No signal just now. I can still sit with you.',
      modelDown: "My thinking is slow just now. You pick today, and I'll join in soon.",
      modelDownMore: "What you type still counts, and your monster hatches as soon as I'm here.",
      hatchesWhenBack: "Your monster will hatch when we're back online.",
      backupOff:
        "I can't keep a spare copy while iCloud is off, so your world lives on this phone only.",
      restoreOffer: 'I found the world you made before. Shall I bring it over?',
    },
    cheeky: {
      hello: "Oh! You're here. I'm Scootch. I've been waiting for you specifically.",
      about: 'I help you start one small thing a day, and I sit with you while you do it.',
      attitudeAsk: 'How much drama can you handle?',
      favours: 'Two tiny favours.',
      notificationsWhy: 'so I can be dramatic',
      microphoneWhy: 'so you can ramble',
      firstOneThing: "Let's warm up. What's one thing that's been bugging you? Smaller is better.",
      waiting: "I've been guarding this door all morning. What's the one thing today?",
      typing: "Typing? Fancy. I'll read every letter.",
      doneForToday: 'Done for today. Go do absolutely nothing.',
      plusSheet: "I work for free. I'd like to work for slightly more than free.",
      plusOneMore: "A second one? In this economy? That's a Plus thing.",
      plusOffer:
        'Three caught. I could do more for you, for a small fee. No pressure. Some pressure.',
      trialStarted: "A whole week of everything. I'll poke you before it costs a thing.",
      trialEndsTomorrow: "Tomorrow I charge you. I'm telling you now because I'm not a monster.",
      trialLastDay: 'Free week ends tonight. What shall we do?',
      renewalOff: "Done. Plus won't renew.",
      plusCancelled: "Fair. I'll still be here. The one thing a day is yours to keep.",
      lifetime: "You're stuck with me now. Forever. I'm thrilled.",
      offline: 'No signal. My jokes need wifi, but I can still sit with you.',
      modelDown: "My brain is buffering. You pick today, I'll be witty later.",
      modelDownMore:
        "Tasks you type now still count, and your monster hatches as soon as I'm here.",
      hatchesWhenBack: "Your monster will hatch when we're back online.",
      backupOff:
        "iCloud is off, so I can't keep a spare copy. Your world lives on this phone only.",
      restoreOffer: 'I found your old world in my pocket. Want it on this phone?',
    },
    unhinged: {
      hello: "YOU'RE HERE. I'm Scootch. I have been rehearsing this moment in a mirror.",
      about: 'I help you start one small thing a day, and I sit with you while you do it. Loudly.',
      attitudeAsk: 'HOW MUCH DRAMA CAN YOU HANDLE?',
      favours: 'TWO TINY FAVOURS. I practised asking.',
      notificationsWhy: 'so I can be VERY dramatic',
      microphoneWhy: 'so you can ramble at me',
      firstOneThing:
        "WARM-UP ROUND. What's one thing that's been bugging you? Smaller is better. Tiny is best.",
      waiting: "I HAVE BEEN STARING AT THIS DOOR FOR THREE HOURS. What's the one thing today?",
      typing: 'TYPING. Fancy. I will read every single letter.',
      doneForToday: "DONE FOR TODAY. Go do absolutely nothing. I'll supervise.",
      plusSheet: 'I have prepared a speech, a dance, and one very small invoice.',
      plusOneMore: "A SECOND ONE? TODAY? That's a Plus thing. I checked the tiny rulebook.",
      plusOffer:
        'THREE CAUGHT. I could do more for you, for a small fee. I rehearsed saying that casually.',
      trialStarted:
        'A WHOLE WEEK OF EVERYTHING. I will poke you before it costs a thing. I have set nine alarms.',
      trialEndsTomorrow:
        'TOMORROW I CHARGE YOU. I am telling you now because I am not a monster. I checked.',
      trialLastDay:
        'THE FREE WEEK ENDS TONIGHT. What shall we do? I am not hovering. I am hovering.',
      renewalOff: "DONE. Plus won't renew. I filed it under handled.",
      plusCancelled:
        "FAIR. I'll still be here. The one thing a day is yours to keep. I am guarding it.",
      lifetime: "YOU'RE STUCK WITH ME NOW. FOREVER. I'm thrilled. The spoon is thrilled.",
      offline: 'NO SIGNAL. My jokes need wifi. I can still sit with you, dramatically.',
      modelDown: "MY BRAIN IS BUFFERING. You pick today, I'll be witty later.",
      modelDownMore:
        "Tasks you type now STILL COUNT, and your monster hatches as soon as I'm here.",
      hatchesWhenBack: "YOUR MONSTER WILL HATCH when we're back online. I am guarding the egg.",
      backupOff: "ICLOUD IS OFF. I can't keep a spare copy. Your world lives on this phone only.",
      restoreOffer: 'I FOUND YOUR OLD WORLD IN MY POCKET. Want it on this phone?',
    },
  },
  monsterNames: [
    'Lurk, Keeper of the Thing by the Door',
    'Fidget, Tenant of the Back of the Shelf',
    'Odd Bob, Collector of Loose Ends',
  ],
  monsterTitles: ['Corner lurker', 'Loose-end collector'],
  deadline: (_attitude, thing, heardAs) => `I heard a date: ${thing}, ${heardAs}.`,
  renewal: (attitude, plan, day, price) => {
    const what = `Your ${plan === 'yearly' ? 'year' : 'month'} of Plus renews on ${day}${price === null ? '' : ` for ${price}`}.`;
    if (attitude === 'soft') {
      return `${what} If you'd rather it didn't, you can turn it off in Plus before then.`;
    }
    const rest = "Not feeling it? Turn it off in Plus and it simply won't renew. No hard feelings";
    return attitude === 'cheeky'
      ? `${what} ${rest}, I promise.`
      : `NOTICE: ${what} ${rest}. I PROMISE.`;
  },
};
