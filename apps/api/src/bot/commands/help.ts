import { helpText, type BotCommand } from '../command';

export const helpCommand: BotCommand = {
  name: 'help',
  usage: '/help',
  summary: 'this list',
  run: (context) => Promise.resolve(helpText(context.commands)),
};
