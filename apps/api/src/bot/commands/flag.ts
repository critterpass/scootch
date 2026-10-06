import { flagDefaults } from '../../flags';
import type { BotCommand } from '../command';

const flagNamePattern = /^[a-z0-9][a-z0-9_.-]{0,63}$/;
const defaults: Readonly<Record<string, boolean>> = flagDefaults;

const word = (on: boolean) => (on ? 'on' : 'off');

async function listFlags(db: D1Database): Promise<string> {
  const { results } = await db
    .prepare('SELECT name, "on" FROM flags ORDER BY name')
    .all<{ name: string; on: number }>();
  const set = new Map(results.map((row) => [row.name, row.on === 1]));
  const names = [...new Set([...Object.keys(defaults), ...set.keys()])].sort();
  if (names.length === 0) return 'No flags yet.';
  return [
    'Flags:',
    ...names.map((name) => {
      const override = set.get(name);
      return override === undefined
        ? `${name}: ${word(defaults[name] === true)} (default)`
        : `${name}: ${word(override)} (set)`;
    }),
  ].join('\n');
}

export const flagCommand: BotCommand = {
  name: 'flag',
  usage: '/flag, or /flag <name> on|off',
  summary: 'list the feature flags, or flip one',
  run: async ({ env }, [name, state]) => {
    if (name === undefined) return listFlags(env.DB);
    if (!flagNamePattern.test(name) || (state !== 'on' && state !== 'off')) {
      return 'Usage: /flag <name> on|off (a name is lower-case letters, digits, dots, dashes)';
    }
    await env.DB.prepare(
      'INSERT INTO flags (name, "on") VALUES (?, ?) ON CONFLICT (name) DO UPDATE SET "on" = excluded."on"',
    )
      .bind(name, state === 'on' ? 1 : 0)
      .run();
    const known = name in defaults ? '' : ' No code reads a flag with this name yet.';
    return `Flag ${name} is now ${state}.${known}`;
  },
};
