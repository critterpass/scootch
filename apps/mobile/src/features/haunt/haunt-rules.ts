import type { Href } from 'expo-router';

import type { MonsterRow, TaskRow } from '@scootch/domain';

import type {
  Friend,
  HauntDare,
  HauntToSend,
  TogetherApi,
  WaitingHaunt,
} from '../../api/together-api';
import type { DayEvent } from '../../state/day-types';
import { showsComedy, showsSelling, type SellingDay } from '../../state/shows-comedy';

export const HAUNT_SEND = '/haunt/send' as Href;
export const HAUNT_RECEIVED = '/haunt/received' as Href;

/**
 * Whether "Haunt a friend" is offered for this task's monster. Only for an ordinary, screened
 * task whose monster is not caught yet, and never on a crisis day or a day that holds anything
 * heavy: a serious task haunts nobody.
 */
export function offersHaunt(
  day: SellingDay,
  task: Pick<TaskRow, 'screen' | 'seriousOverridden'> | null,
  monster: Pick<MonsterRow, 'caughtOn'> | null,
): boolean {
  if (!showsSelling(day) || task === null || monster === null) return false;
  return showsComedy(task, 'share') && monster.caughtOn === null;
}

/**
 * The friends this phone's account may haunt. A phone that is not signed in, or cannot reach the
 * server, has none: the answer is then empty, never an error.
 */
export async function hauntableFriends(api: Pick<TogetherApi, 'friends'>): Promise<Friend[]> {
  try {
    return (await api.friends()).filter((friend) => friend.canBeHaunted);
  } catch {
    return [];
  }
}

/**
 * Whether the hatch screen offers "Haunt a friend": under the haunt's own rules (an ordinary
 * task, its monster not caught, never a crisis or a heavy day), and only when the person is
 * signed in with at least one friend who takes haunts.
 */
export function offersHauntOnHatch(
  day: SellingDay,
  task: Pick<TaskRow, 'screen' | 'seriousOverridden'> | null,
  monster: Pick<MonsterRow, 'caughtOn'> | null,
  friends: readonly Pick<Friend, 'canBeHaunted'>[],
): boolean {
  return offersHaunt(day, task, monster) && friends.some((friend) => friend.canBeHaunted);
}

/** What is sent: the monster's body and seed, a dare id and a switch. Never the task. */
export function hauntToSend(
  monster: Pick<MonsterRow, 'spec'>,
  to: string,
  dare: HauntDare,
  anonymous: boolean,
): HauntToSend {
  const { bodyType, seed } = monster.spec;
  return { to, bodyType, seed, dare, anonymous, screen: 'pass' };
}

/**
 * Whether a waiting haunt's card is shown now: on a day with nothing chosen yet, and never on a
 * crisis day or near something heavy. Otherwise it simply waits.
 */
export function showsHauntCard(day: SellingDay): boolean {
  return showsSelling(day) && day.today.kind === 'nothing_yet';
}

/**
 * "Catch it": the server is told, then the dare becomes today's one thing through the same event
 * a typed task takes, so it is screened, hatched and started like any other.
 */
export async function catchHaunt(
  api: Pick<TogetherApi, 'catchHaunt'>,
  dispatch: (event: DayEvent) => Promise<void>,
  haunt: Pick<WaitingHaunt, 'id'>,
  dareWords: string,
): Promise<void> {
  await api.catchHaunt(haunt.id);
  await dispatch({ type: 'text_submitted', text: dareWords, source: 'typed', energy: 'guess' });
}

/** "Shoo it": one call. Nothing is written on the phone and the sender is never told. */
export function shooHaunt(
  api: Pick<TogetherApi, 'shooHaunt'>,
  haunt: Pick<WaitingHaunt, 'id'>,
): Promise<void> {
  return api.shooHaunt(haunt.id);
}

/** Why a haunt was not sent, as the server's fixed word says. */
export type SendProblem = 'recent' | 'off' | 'notForThis' | 'failed';

export function sendProblemOf(reason: string): SendProblem {
  if (reason === 'haunted_recently') return 'recent';
  if (reason === 'cannot_be_haunted') return 'off';
  if (reason === 'not_for_this_task') return 'notForThis';
  return 'failed';
}
