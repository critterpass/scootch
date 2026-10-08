import { AskPage } from './ask-page';

const nothing = () => undefined;

/** A monster as its page on the website keeps it, with the words hidden. */
const MONSTER = {
  seed: 'dentist-seed',
  bodyType: 'tooth',
  name: 'Molar, Keeper of Thursday',
  flavourText: 'Lives in the inbox. Pays no rent.',
} as const;

/** A monster's link whose page hides the words: the card, and the one question. */
export function MonsterLinkAsks() {
  return <AskPage monster={MONSTER} onSend={nothing} onClose={nothing} />;
}
