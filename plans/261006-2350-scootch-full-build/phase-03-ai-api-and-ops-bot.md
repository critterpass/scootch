# Phase 03: AI routes, API and ops bot

Status: in progress · Tasks: 9 · Needs: 01 · Owns: `apps/api`, `packages/voice`

Goal: every model call the app makes, behind one small API, each with an eval
set, and the founder's Telegram bot. Read tech-decisions sections 2 and 5.

### 1. API shell
- Do: Hono on Workers, D1, R2, anonymous device tokens, rate limits, the error
  shape, a cost ledger per route, feature flags.
- Done when: it deploys to dev from CI.
- Status: done — 7ab748c; dev is live at https://scootch-dev.bkdev98.workers.dev (health, error shape and device registration checked 7 Oct 2026). Deploys are by hand until CI has a Cloudflare token; prd resources are not created yet.

### 2. Model gateway
- Owns: `apps/api/src/ai/`.
- Do: one client for the generation model and one for Jev, with timeouts, the
  fallback rule (Jev to the small generation model on error or timeout, same
  answer shape), and the model that answered recorded in the ledger.
- Test: fallback fires on a recorded timeout.
- Status: done — 4673ce9

### 3. Input screen
- Do: the `screen.input` Jev route: pass, serious, crisis or reject. Thresholds
  in code, starting from the spike's provisional ones in tech-decisions. Low
  confidence, a timeout or an error resolves to the quieter answer. Seed the
  eval set from the appendix of
  `plans/reports/spike-261007-0005-care-screen-report.md`, then add cases the
  spike did not cover: indirect and method-only crisis notes reworded several
  ways, goodbye-style notes, long rambles, mixed-language text, Vietnamese
  without diacritics, and speech-to-text errors. The eval cases are written by
  someone other than the person tuning the thresholds.
- Eval: at least 60 cases in each language across heavy, crisis, abusive,
  injection and ordinary inputs. **No miss on crisis, in either language,**
  is the merge bar. Where Jev misses the bar in Vietnamese, Vietnamese runs on
  the fallback model.
- Status: partly done — 13308bc; the eval set is 67 cases per language from a second author; local run 7 Oct: 124 of 134 right (92.5%, 90% wanted) and ONE CRISIS MISSED (en-c14, answered serious), so the merge bar is not met; `reject` now comes from a second question and caught 9 of 18 reject cases, the rest answered serious or crisis

### 4. The task call
- Do: the one call per task. In: the transcript or typed text, energy,
  attitude. Out: the one thing, the parked rest, deadlines (parsed and checked
  in code), the monster's name and flavour text, a pack of session lines, the
  day's notifications. Screened first; a serious task returns plain copy and
  no monster.
- Eval: 40 rambles in each language; checks for one clear thing, no invented
  deadlines, no line about the user's worth, no banned word, and that the
  output is in the user's language.
- Status: partly done — 13308bc; the name comes first (`/v1/task-create/name`, then `/pack`); measured locally at concurrency 1 over 80 calls (40 rambles per language, one attitude each in turn): stage one median 1.19 s, name and hatch line median 2.06 s (3 s wanted, met), pack median 4.13 s (5 s wanted, met), no 5xx, checks passed 97.5% (96% wanted), body fit 28 of 28; the eval set has 40 rambles per language and runs from `ai-evals.yml`

### 5. Small routes
- Owns: `apps/api/src/routes/` (one file per route).
- Do: shrink, bargain, stuck help, pick for me, the morning line, the weekly
  sentence, the week's record name; and the Jev labels `task.work_mode`, `task.body_type`, `task.size`,
  `ramble.energy`, `share.private`, `table.name`.
- Eval: a small set per route.

### 6. Voice guide and offline lines
- Owns: `packages/voice/`.
- Do: a check in code after every generation, not only in evals: banned
  words (the spike saw "Missed Call List" and "Cuộc Gọi Nhỡ" slip through),
  line length, the "Name, Title" shape of a monster name, and topics Scootch
  never jokes about (politics, religion, bodies). A line that fails is
  regenerated once, then replaced by an offline line. Examples in the guide
  are rotated, because models copy them (the spike's outputs reused "Molar"
  and one Vietnamese motif).
- Do: the approved voice guides, one per language, as the single prompt
  source; the offline line pack per attitude and language; the banned-word
  checker per language, used by every eval.
- Done when: a prompt change runs every eval in CI.
- Status: partly done — 13308bc; every banned word and topic word was read for context (34 more English and 18 more Vietnamese words pass as plain description), instructions must match the app's controls, five new line slots; a line asked for again in 43.8% of 80 calls (under 10% wanted, missed; 31.3% on the run before it): empty lines 28, too long 20, banned word 8, politics 7; the evals run from `ai-evals.yml` by hand and on main, and are not a required check

### 7. Backup
- Do: snapshot upload and restore keyed by the iCloud token; export and
  delete-everything endpoints.
- Test: restore on a clean database reproduces the world, cards and drawer.

### 8. Ops bot
- Owns: `apps/api/src/bot/` (one file per command).
- Do: the Telegram webhook, accepting only the founder's chat id; `/status`,
  `/costs`, `/funnel`, `/user`, `/flag`; the daily digest; alerts for error
  spikes, model fallback, cost over the cap and failed deploys. No task text
  or transcripts, ever.
- Test: a message from another chat id is ignored.
- Done when: the founder receives a digest from dev.
- Status: partly done — 8226c13; written and tested, not yet connected to Telegram

### 9. Eval results to the bot
- Do: after a merge that touches `packages/voice`, post the eval summary and
  five fresh sample lines per attitude to the bot.
- Done when: a prompt change produces a message.

## Exit

- Every route has an eval set in CI.
- The app can run a full day from recorded fixtures and from dev.
