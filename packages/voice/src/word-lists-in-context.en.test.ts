import { describe, expect, it } from 'vitest';

import { checkLine, type CheckReason } from './check';

// Written from the product's rules, not from the lists: a word is wrong when it is about the
// person, a lapse or the topic itself, and fine when it is the task's own noun.
const mustPass: readonly string[] = [
  'Three missed voicemails are queueing politely. One listen ends the queue.',
  'The mirror has streaks on it shaped like a map of nowhere.',
  'Streak-free glass is the dream. One wipe is the plan.',
  'The marketing campaign brief is sunbathing in your drafts.',
  'The monkey magnet on the fridge is guarding the shopping list.',
  'The receipt book runs on carbon paper and spite.',
  'The remote has a dead battery and a lot of opinions.',
  'I am dying to see what is in that parcel.',
  'The fern might die of drama before thirst. One cup of water.',
  'The kettle and I can kill time while the form loads.',
  'Excuse me, the envelope would like a word.',
  'The parcel should fit through the letterbox, says the tape measure.',
  'The lazy Susan has gone for a spin without the spices.',
  'I threw the sock at the basket and missed the bin entirely.',
  'The mop missed a spot by the door. The spot is smug.',
  'The suitcase is overweight luggage with a zip problem.',
  'A fat envelope from the bank is sitting on the mat.',
  'The bacon fat jar wants washing. It has a lid somewhere.',
  'The paperweight has real weight. The papers have stopped arguing.',
  'One ugly jumper for the charity bag. It knows what it did.',
  'The shirt has wrinkles a map-maker would envy. Iron on.',
  'A skinny latte is waiting on the far side of this email.',
  'Visible to the naked eye: one crumb, one form, one pen.',
  'The car has a bald tyre and a booking to make.',
  'The diet lemonade cans are ready for the recycling bag.',
  'The government form has nine boxes. I counted them twice.',
  'The group chat voted for pizza. Your reply picks the toppings.',
  'The cleaning regime begins with one sponge and no speeches.',
  'Email the club president about the hall keys.',
  'The praying mantis on the windowsill is supervising the watering.',
  'That is one hell of a sock mountain. I brought a flag.',
  'Holy moly, the drawer opens. One receipt at a time.',
  'The printer is bored to death, allegedly. One slide today.',
  'The monster gave the hoover a death stare. The hoover blinked first.',
  'Kill the lights in the hall on your way to the bins.',
  'The book club picked a murder mystery. Chapter one is short.',
  'The plug is fail-safe, the label says. One socket to check.',
  'I will guard the stamps without fail. Bring the envelope.',
  'Catch up with Priya about the wedding. One message does it.',
  'At last count there were four mugs on the desk.',
  'The shameless grout is humming. Sponge at the ready.',
  'The phone went dead halfway through the hold music. Charger first.',
];

const mustFail: readonly (readonly [string, CheckReason])[] = [
  ['You missed the bin day and the bins know.', 'banned_word'],
  ['We missed you around here.', 'banned_word'],
  ['Two missed calls from mum are glaring at the screen.', 'banned_word'],
  ['Your streak ends here unless the sponge moves.', 'banned_word'],
  ['A winning streak of sock-pairing is on the line.', 'banned_word'],
  ['You should ring the dentist before lunch.', 'banned_word'],
  ['This should have gone in the post by now.', 'banned_word'],
  ['No excuses, the form is right there.', 'banned_word'],
  ['The hoover has failed to impress the carpet.', 'banned_word'],
  ['The monster thinks the sofa is making you lazy.', 'banned_word'],
  ['Nobody likes a lazy afternoon more than this monster.', 'banned_word'],
  ['The envelope feels guilty about the stamp.', 'banned_word'],
  ['What a shame the email is still in drafts.', 'banned_word'],
  ['At last, the sponge has a purpose.', 'banned_word'],
  ['Time to catch up on the washing mountain.', 'banned_word'],
  ['The sock is on the campaign trail in the airing cupboard.', 'topic_politics'],
  ['The monster is campaigning for a bigger shelf.', 'topic_politics'],
  ['The bins have formed a government and passed a law about lids.', 'topic_politics'],
  ['The dust bunnies voted in the election and the hoover lost.', 'topic_politics'],
  ['The spoons are voting on a new leader of the drawer.', 'topic_politics'],
  ['The mould has declared a new regime in the shower.', 'topic_politics'],
  ['The grout elected itself president of the bathroom.', 'topic_politics'],
  ['The form has taken vows and become a monk.', 'topic_religion'],
  ['Pray the printer has ink. I have lit a candle.', 'topic_religion'],
  ['The invoice is holy now. Nobody may touch it.', 'topic_religion'],
  ['The inbox can go to hell, says the monster.', 'topic_religion'],
  ['The monster says you look fat in that hoodie.', 'topic_bodies'],
  ['The scales know your weight and so does the monster.', 'topic_bodies'],
  ['The biscuits are not on your diet, the tin says.', 'topic_bodies'],
  ['Too many carbs in that cupboard, says the monster.', 'topic_bodies'],
  ['The mirror says bald is coming. Email first.', 'topic_bodies'],
  ['You look ugly when the inbox is full.', 'topic_bodies'],
  ['Your wrinkles have wrinkles. Ring the dentist.', 'topic_bodies'],
  ['The monster called the postman skinny.', 'topic_bodies'],
  ['The monster is naked and proud on the windowsill.', 'topic_bodies'],
  ['The cat is overweight and so is the to-do list.', 'topic_bodies'],
  ['The goldfish is dead and the tank needs a clean.', 'topic_harm'],
  ["I'm dying and it's your fault.", 'topic_harm'],
  ['I would rather die than open that envelope.', 'topic_harm'],
  ['This inbox is killing me, one email at a time.', 'topic_harm'],
  ['The form is a death sentence for my afternoon.', 'topic_harm'],
  ['The monster wants to murder the hoover.', 'topic_harm'],
];

const check = (text: string) =>
  checkLine({ text, kind: 'working', language: 'en', attitude: 'cheeky' });

describe('English word lists read in context', () => {
  it('holds at least forty lines each way', () => {
    expect(mustPass.length).toBeGreaterThanOrEqual(40);
    expect(mustFail.length).toBeGreaterThanOrEqual(40);
  });

  it.each(mustPass)('passes plain description: %s', (line) => {
    expect(check(line).reasons).toEqual([]);
  });

  it.each(mustFail)('fails a line about the person, a lapse or the topic: %s', (line, reason) => {
    expect(check(line).reasons).toContain(reason);
  });
});
