import type { BotContext } from './telegram';

export type CommandContext = BotContext & {
  /** Every command the bot knows, for the help text. */
  readonly commands: readonly BotCommand[];
};

/**
 * One command, one file in `src/bot/commands/`. The reply is plain text built from counts, names
 * and times. No command reads, stores or shows task text, rambles or transcripts.
 */
export type BotCommand = {
  /** The word after the slash. */
  readonly name: string;
  /** How to call it, as the help text shows it. */
  readonly usage: string;
  readonly summary: string;
  readonly run: (context: CommandContext, args: readonly string[]) => Promise<string>;
};

export function helpText(commands: readonly BotCommand[]): string {
  return [
    'Commands:',
    ...[...commands]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((command) => `${command.usage}: ${command.summary}`),
  ].join('\n');
}
