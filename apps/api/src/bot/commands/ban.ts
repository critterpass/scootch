import { accountIdArgument, banAccount } from '../../tables/moderation';
import type { BotCommand } from '../command';

export const banCommand: BotCommand = {
  name: 'ban',
  usage: '/ban <account id>',
  summary: 'stop an account opening or joining tables, and free its seats',
  run: async ({ env, now }, [arg]) => {
    const accountId = accountIdArgument(arg);
    if (accountId === undefined)
      return 'Usage: /ban <account id> (the 12 characters from a report)';
    return (await banAccount(env, accountId, now))
      ? `Account ${accountId} is banned from tables.`
      : 'No account has that id.';
  },
};
