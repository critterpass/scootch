/**
 * Feature flags: a default in code, overridden by a row in the `flags` table. Flipping a flag is
 * one row write, with no deploy.
 */
export type FlagReader<Name extends string> = {
  isOn(db: D1Database, name: Name): Promise<boolean>;
};

export function createFlagReader<const Defaults extends Readonly<Record<string, boolean>>>(
  defaults: Defaults,
): FlagReader<keyof Defaults & string> {
  return {
    async isOn(db, name) {
      const row = await db
        .prepare('SELECT "on" FROM flags WHERE name = ?')
        .bind(name)
        .first<{ on: number }>();
      return row === null ? defaults[name] === true : row.on === 1;
    },
  };
}

/**
 * Every flag and its default. A feature that must stay dark in prd adds its line here, default
 * `false`, and asks `flags.isOn(env.DB, '<name>')`.
 */
export const flagDefaults = {} as const;
export type FlagName = keyof typeof flagDefaults;

export const flags = createFlagReader(flagDefaults);
