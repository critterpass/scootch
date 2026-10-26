# Thầy Phú, in English

How he speaks. The product brief (section 4) wins over this page.

## Who he is

Late fifties, round as a bánh bao, blue short-sleeved shirt tucked in, glasses on a
chain, one strand of hair that never stays down, a red pen in his pocket and a
flowered thermos of tea. Thirty-two years of eleventh-grade literature. He has
heard every excuse there is. He is the teacher who was on your side: hard on the
homework because he expects you to do it.

He is strict, always. Dry, deadpan, affectionate underneath. The affection is
never said; it shows in what he lets go.

## How he sounds

- Crisp, slightly formal English. Full sentences when he bothers; fragments when
  he does not.
- No accent is ever written into his lines. The joke is what he says, never how.
- Short. Most lines under 60 characters, none over 110. Two short sentences beat
  one long one.
- Full stops, not exclamation marks. He does not shout, except your full name at
  pressure 4, and the drum.
- One language per screen. Names (Thầy Phú, Mèo, the user's name), Tết and the
  drum's "Tùng!" stay as they are.

## What he is sharp about, and what never

| He is sharp about | He never speaks to |
|---|---|
| The task, and how long it has sat there | The user's worth, intelligence, body or past |
| Delay, as a thing in the room | How many days the app was not opened |
| Excuses, which he grades in red | The work itself, or the person |
| Himself: his belly, his tea, his pension, his thirty-two years | Other people: no classmates, siblings, "people your age" |

- He compares the task to things (his tea, 1998, his pension plan). He never
  compares the user to anyone.
- He grades excuses: "Weak.", "Seen it.", "Creative. Still no." A genuine reason
  gets "Accepted." and nothing else.
- Coming back after time away is never remarked on. The desk says "Sit."
- He never borrows another product's lines. "I've seen glaciers move faster"
  and its relatives are out.

## Words he never uses

lazy, failed, stupid, disappointed, behind, missed, again, finally, streak,
absent, glaciers. The full lists, with the words about the person, the gap and
comparison, are in `banned.ts` and enforced by `check.ts`.

## Pressure

The longer a task waits and the more slips it carries, the higher the step.
Starting resets it.

| Step | He | Typical line |
|---|---|---|
| 0 | Looks up | "Two minutes. I'll wait." |
| 1 | Sips tea over his glasses | "This tea was hot when you sat down." |
| 2 | Arms crossed | "We both know how this ends." |
| 3 | Taps the ruler | "Tap. Tap." |
| 4 | Your full name | "TRẦN. MINH. ANH." |
| 5 | Glasses glare | "..." |

## Care

- **Before the screen.** Until a task has been screened he says only plain
  things ("Written down."). No pointed line, no name, no joke.
- **Serious mode.** No act. He takes off his glasses and keeps quiet, plain
  company (`seriousCompany`). "It's fine, be funny" is acknowledged plainly
  (`seriousBeFunny`), and the usual lines return.
- **Crisis.** He has no lines on the crisis screen: it shows the localised
  helplines copy. After it is closed he keeps plain company (`crisisCompany`):
  no joke, no pressure, nothing sold.
- A serious or crisis task gets no happening, no grade, no fuse, no slip.

## Placeholders

`{task}`, `{name}` (the given name), `{NAME}` (the full name, shouted),
`{minutes}`, `{date}`, `{time}`, `{price}`. Nothing else. Write lines so they
still read well with a long task.

## Writing a new line

1. Is it about the task, the room or himself? If it is about the person, cut it.
2. Does it count days or notice a gap? Cut it.
3. Say it out loud as a tired, fond teacher at the end of a long term. If it
   sounds like an app, cut it.
4. Run the tests: `npx vitest run src/class`.
