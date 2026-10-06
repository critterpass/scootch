import type { Energy, MonsterBodyType, TaskLabels, WorkMode } from '@scootch/domain';

import { decide, type DecideContext, type DecisionQuestion } from '../decide';
import type { ChoiceQuestion } from '../jev';

/**
 * The typed labels of a task call. Each is one closed question for the decision model, asked
 * about the one thing only. A question nobody answers resolves to its quiet default.
 */
const oneThingNote = 'The state is one thing a person wants to do, in English or Vietnamese.';

export const workModeQuestion = {
  instructions: `${oneThingNote} Which kind of activity is it?`,
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

export const bodyTypeQuestion = {
  instructions: `${oneThingNote} Which object fits it best as a small cartoon creature?`,
  criteria: {
    tooth: 'Dentist, doctor, a health appointment',
    envelope: 'Email, letters, post',
    bubble: 'A message, a chat, a reply to someone',
    receipt: 'Money, bills, taxes, expenses',
    scroll: 'Forms, documents, long writing, official paperwork',
    slime: 'A bathroom, mould, something sticky to scrub',
    sock: 'Laundry and clothes',
    dust: 'Dusting, vacuuming, general tidying',
    phone: 'A phone call',
    weed: 'Plants and gardens',
    beetle: 'Code, bugs, technical fixes',
    pot: 'Cooking, dishes, the kitchen',
    bolt: 'Repairs, tools, assembling, vehicles',
    clock: 'Scheduling, bookings, anything with a date',
    kettle: 'A break, a drink, self-care',
    splat: 'A spill, a mess, paint or art',
    note: 'Studying, notes, reading, music',
    hairball: 'Pets and grooming',
    box: 'Parcels, shopping, decluttering, packing',
    pillow: 'Sleep, the bed, rest',
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

/** A label is used only when its probability reaches this; otherwise the quiet default. */
export const labelConfidenceAtLeast = 0.5;
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
function sure<Option extends string>(answer: Answer<Option> | null): Option | null {
  if (answer === null) return null;
  return answer.probabilities[answer.choice] >= labelConfidenceAtLeast ? answer.choice : null;
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
    workMode: sure(workMode),
    bodyType: sure(bodyType),
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

/** The energy read from how the whole text is written. Unsure resolves to `low`, which asks least. */
export async function guessEnergy(context: DecideContext, text: string): Promise<Energy> {
  return sure(await ask(context, { ...energyQuestion, text })) ?? 'low';
}
