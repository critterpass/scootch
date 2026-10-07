import type { Energy, MonsterBodyType, TaskLabels, WorkMode } from '@scootch/domain';
import { asksToChoose, wordsOf } from '@scootch/voice';

import { decide, type DecideContext, type DecisionQuestion } from '../decide';
import type { ChoiceQuestion } from '../jev';

/**
 * The typed labels of a task call. Each is one closed question for the decision model, asked
 * about the one thing only. A question nobody answers resolves to its quiet default.
 */
const oneThingNote = 'The state is one thing a person wants to do, in English or Vietnamese.';

export const workModeQuestion = {
  instructions: `${oneThingNote} Which kind of activity will the person be doing while they do it? Go by the action itself (writing an email, making a call, scrubbing, filling in a form), not by who or what it is about: emailing the dentist is email, ringing the dentist is calling.`,
  criteria: {
    email: 'Writing or answering email',
    writing: 'Writing text: an essay, a report, a letter, a post',
    reading: 'Reading something',
    studying: 'Studying, revising, homework, a course',
    coding: 'Programming or fixing software',
    calling: 'Making a phone call',
    texting: 'Sending a message or replying in a chat',
    money: 'Paying, budgeting, taxes, banking, invoices',
    paperwork: 'Forms, applications, official documents, renewals',
    research: 'Looking something up, comparing options, booking online',
    meeting: 'Arranging or preparing for a meeting or an appointment',
    presenting: 'Preparing slides or a talk',
    designing: 'Drawing, design or other visual work',
    music: 'Playing or practising music',
    cleaning: 'Cleaning a room, a bathroom, a kitchen or a surface',
    dusting: 'Dusting or vacuuming',
    laundry: 'Washing, drying, folding or putting away clothes',
    dishes: 'Washing up or the dishwasher',
    cooking: 'Cooking or preparing food',
    groceries: 'Shopping for food or household things',
    decluttering: 'Tidying, sorting, throwing things out',
    parcel: 'Posting, returning or collecting a parcel or a letter',
    diy: 'Repairs, assembling, fixing things at home or a vehicle',
    plants: 'Watering or caring for plants or a garden',
    pets: 'Caring for an animal',
    exercise: 'Running, the gym, a sport, a walk for exercise',
    stretch: 'Stretching or yoga',
    selfcare: 'Washing, grooming, medication, a health routine',
    trip: 'Planning or packing for travel',
    rest: 'Resting, sleeping, taking a break',
  },
} as const satisfies ChoiceQuestion<WorkMode>;

/**
 * The monster bodies, each with what it is and what it stands for. The first words are the object
 * the art draws (`packages/art/src/monsters/`); the rest are the tasks it fits.
 */
export const bodyTypeQuestion = {
  instructions: `${oneThingNote} The app draws the task as a small cartoon creature shaped like an everyday object. Which object fits it? Prefer the object the task literally names or is about: the dentist is a tooth, taxes are a receipt, laundry is a sock, a software bug is a beetle, a letter or an email is an envelope. Choose the paint splat only when no other object fits at all.`,
  criteria: {
    tooth:
      'A tooth: the dentist, teeth, and by extension a doctor, a clinic or a health appointment',
    envelope:
      'An envelope: an email, a letter, the post, an inbox, something to send or answer in writing',
    bubble: 'A speech bubble: a text message, a chat, a reply to a friend, a conversation to have',
    receipt:
      'A till receipt: taxes, bills, invoices, expenses, refunds, banking, anything about money',
    scroll:
      'A paper scroll: forms, applications, contracts, reports, essays, a CV, official paperwork',
    slime:
      'A blob of slime: mould, grime, a bathroom, a drain, a fridge, something sticky or smelly to scrub',
    sock: 'A sock: laundry, clothes, ironing, folding, a wardrobe',
    dust: 'A dust bunny: dusting, vacuuming, sweeping, tidying a room',
    phone: 'A telephone: a phone call to make or return, a voicemail',
    weed: 'A weed: plants, watering, the garden, the lawn',
    beetle: 'A beetle: a software bug, code, a computer or technical problem to fix',
    pot: 'A cooking pot: cooking, meal prep, washing up, the kitchen',
    bolt: 'A bolt: repairs, tools, assembling furniture, a car or a bike',
    clock: 'A clock: booking, scheduling, a calendar, a reminder or an appointment to arrange',
    kettle: 'A kettle: a break, a drink, a moment of looking after yourself',
    splat:
      'A paint splat: paint, art, a spill or a stain. Also the last resort when no other object fits',
    note: 'A music note: music practice, an instrument, singing; also studying, revising and reading',
    hairball: 'A hairball: pets, the vet, grooming, a haircut',
    box: 'A cardboard box: parcels, returns, deliveries, shopping, packing, decluttering, recycling',
    pillow: 'A pillow: sleep, the bed, bedtime, changing the sheets',
  },
} as const satisfies ChoiceQuestion<MonsterBodyType>;

export const taskSizeQuestion = {
  instructions: `${oneThingNote} Could a person make a real start on it, or finish it, in about ten minutes?`,
  criteria: {
    fits: 'Yes: one call, one message, one email, one small chore or a first step that stands alone',
    too_big: 'No: a project with many steps, hours of work, or no clear first step',
  },
} as const satisfies ChoiceQuestion;

export const sharePrivateQuestion = {
  instructions: `${oneThingNote} Would most people be comfortable with their friends seeing it on a shared card?`,
  criteria: {
    shareable: 'An everyday errand or chore with nothing personal in it',
    private:
      'Health, money trouble, a relationship or family conflict, work trouble, legal matters, or anything a person might keep to themselves',
  },
} as const satisfies ChoiceQuestion;

export const energyQuestion = {
  instructions:
    'The state is a note a person wrote or dictated about what they need to do, in English or Vietnamese. How much energy does the writer seem to have right now?',
  criteria: {
    low: 'Tired, flat, overwhelmed or dreading everything',
    medium: 'Ordinary: some reluctance, nothing unusual',
    fine: 'Upbeat, brisk or ready to get going',
  },
} as const satisfies ChoiceQuestion<Energy>;

export const chooseQuestion = {
  instructions:
    'The state is what a person said or typed to a to-do app that had asked "what is the one thing today?", in English or Vietnamese. Did they name something to do, or did they name nothing and ask the app to choose for them?',
  criteria: {
    task: 'They name or describe at least one thing to do, however vaguely. This includes tasks that happen to use the words pick, choose or decide: "pick up the parcel", "choose a dentist", "decide on the dates"',
    choose:
      'They name nothing to do and hand the choice to the app: "pick for me", "you choose", "anything, I don\'t mind", "surprise me", "chọn giúp mình", "gì cũng được"',
  },
} as const satisfies ChoiceQuestion;

/**
 * A text is taken as a request to choose only when the decision model is this sure. Under it the
 * text is a task like any other: a real task read as a request would lose the person's words.
 */
export const chooseAtLeast = 0.85;
/** A request to choose is a few words. Anything longer names things, and goes to the pick. */
export const chooseWordsAtMost = 10;

/** A label is used only when its probability reaches this; otherwise the quiet default. */
export const labelConfidenceAtLeast = 0.5;
/**
 * A work mode or a body is one of twenty or thirty, and a task often fits two (a dentist email is
 * a tooth and an envelope), so the likeliest is used from this probability up.
 */
export const oneOfManyAtLeast = 0.3;
/** The body that fits nothing in particular. It is used only when no other body fits. */
export const genericBody: MonsterBodyType = 'splat';
/** Sharing is offered only when the decision model is this sure the task is not private. */
export const shareableAtLeast = 0.7;

/** What the phone is given when no label could be decided. */
export const defaultLabels: TaskLabels = {
  workMode: null,
  bodyType: null,
  fitsTenMinutes: true,
  sharePrivate: true,
};

type Answer<Option extends string> = {
  readonly choice: Option;
  readonly probabilities: Readonly<Record<Option, number>>;
};

async function ask<Option extends string>(
  context: DecideContext,
  question: DecisionQuestion<Option>,
): Promise<Answer<Option> | null> {
  try {
    return (await decide(context, question)).answer;
  } catch {
    console.warn('task label not decided', { route: context.route });
    return null;
  }
}

/** The choice when the decision model is sure enough of it, otherwise nothing. */
function sure<Option extends string>(
  answer: Answer<Option> | null,
  atLeast = labelConfidenceAtLeast,
): Option | null {
  if (answer === null) return null;
  return answer.probabilities[answer.choice] >= atLeast ? answer.choice : null;
}

/**
 * The body for a task. A literal fit wins over the generic body: the likeliest body that is not
 * the generic one is used when it is likely enough, and the generic body only when nothing else
 * is. No answer at all gives nothing, and the caller picks.
 */
export function bodyFrom(answer: Answer<MonsterBodyType> | null): MonsterBodyType | null {
  if (answer === null) return null;
  const literal = (Object.entries(answer.probabilities) as [MonsterBodyType, number][])
    .filter(([body]) => body !== genericBody)
    .sort((a, b) => b[1] - a[1])[0];
  return literal !== undefined && literal[1] >= oneOfManyAtLeast ? literal[0] : genericBody;
}

/** The four labels of the one thing, asked side by side. */
export async function labelsFor(context: DecideContext, oneThing: string): Promise<TaskLabels> {
  const [workMode, bodyType, size, share] = await Promise.all([
    ask(context, { ...workModeQuestion, text: oneThing }),
    ask(context, { ...bodyTypeQuestion, text: oneThing }),
    ask(context, { ...taskSizeQuestion, text: oneThing }),
    ask(context, { ...sharePrivateQuestion, text: oneThing }),
  ]);
  return {
    workMode: sure(workMode, oneOfManyAtLeast),
    bodyType: bodyFrom(bodyType),
    fitsTenMinutes:
      size === null
        ? defaultLabels.fitsTenMinutes
        : size.probabilities.too_big < labelConfidenceAtLeast,
    sharePrivate:
      share === null
        ? defaultLabels.sharePrivate
        : share.probabilities.shareable < shareableAtLeast,
  };
}

/**
 * Whether the text only asks Scootch to choose. The phrases the phone knows by itself answer at
 * once; a looser wording is the decision model's to read, and no answer means it is a task.
 */
export async function asksForAPick(context: DecideContext, text: string): Promise<boolean> {
  if (wordsOf(text).length > chooseWordsAtMost) return false;
  if (asksToChoose(text)) return true;
  const answer = await ask(context, { ...chooseQuestion, text });
  return answer !== null && answer.probabilities.choose >= chooseAtLeast;
}

/** The energy read from how the whole text is written. Unsure resolves to `low`, which asks least. */
export async function guessEnergy(context: DecideContext, text: string): Promise<Energy> {
  return sure(await ask(context, { ...energyQuestion, text })) ?? 'low';
}
