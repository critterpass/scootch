import { accountIdArgument, unbanAccount } from '../../tables/moderation';
import type { BotCommand } from '../command';

export const unbanCommand: BotCommand = {
  name: 'unban',
  usage: '/unban <account id>',
  summary: 'let a banned account open and join tables again',
  run: async ({ env }, [arg]) => {
    const accountId = accountIdArgument(arg);
    if (accountId === undefined)
      return 'Usage: /unban <account id> (the 12 characters from a report)';
    return (await unbanAccount(env.DB, accountId))
      ? `Account ${accountId} may use tables again.`
      : 'No account has that id.';
  },
};
