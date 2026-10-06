# @scootch/i18n

Interface strings in English and Vietnamese: buttons, labels, settings and system copy. Plain
TypeScript, so the same package runs in the app, the website and the Worker.

**Lines Scootch speaks never go here.** They are written per language by the AI routes, or come
from `packages/voice/offline/`. This package holds only what the interface itself says.

## Use

```ts
import { pickLanguage, t } from '@scootch/i18n';

const language = pickLanguage(deviceLocales, storedChoice); // 'vi' or 'en'
t(language, 'talk.hold'); // 'Giữ để nói'
t(language, 'world.thingsLiveHere', { count: 7 });
```

TypeScript checks the key and its parameters where `t` is called. A stored choice (the switch in
Settings) wins over the device; without one, the first device locale we ship decides.
## Add a string

1. Add the key to `src/en.ts`. English is the source of the key set. Name it `area.thing`.
2. Add the same key to `src/vi.ts`, written as a Vietnamese app would say it, not word for word.
3. Placeholders are `{name}` and must have the same names in both languages.
4. A string that changes with a number is an object of plural forms chosen by `count`:
   English `{ one, other }`, Vietnamese `{ other }` only.
5. Run `pnpm --filter @scootch/i18n test`. It names every key that is in one language only, has
   different parameters, or is empty or unchanged in Vietnamese. A word that really is the same
   in both goes in `sameInBothLanguages` (`src/completeness.ts`).
