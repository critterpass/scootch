# Phase 03: AI routes, API and ops bot

Status: not started · Tasks: 9 · Needs: 01 · Owns: `apps/api`, `packages/voice`

Goal: every model call the app makes, behind one small API, each with an eval
set, and the founder's Telegram bot. Read tech-decisions sections 2 and 5.

### 1. API shell
- Do: Hono on Workers, D1, R2, anonymous device tokens, rate limits, the error
  shape, a cost ledger per route, feature flags.
- Done when: it deploys to staging from CI.

### 2. Model gateway
- Owns: `apps/api/src/ai/`.
- Do: one client for the generation model and one for Jev, with timeouts, the
  fallback rule (Jev to the small generation model on error or timeout, same
  answer shape), and the model that answered recorded in the ledger.
- Test: fallback fires on a recorded timeout.

### 3. Input screen
- Do: the `screen.input` Jev route: pass, serious, crisis or reject. Thresholds
  in code. Low confidence resolves to the quieter answer.
- Eval: at least 60 cases in each language across heavy, crisis, abusive,
  injection and ordinary inputs. **No miss on crisis, in either language,**
  is the merge bar. Where Jev misses the bar in Vietnamese, Vietnamese runs on
  the fallback model.

### 4. The task call
- Do: the one call per task. In: the transcript or typed text, energy,
  attitude. Out: the one thing, the parked rest, deadlines (parsed and checked
  in code), the monster's name and flavour text, a pack of session lines, the
  day's notifications. Screened first; a serious task returns plain copy and
  no monster.
- Eval: 40 rambles in each language; checks for one clear thing, no invented
  deadlines, no line about the user's worth, no banned word, and that the
  output is in the user's language.

### 5. Small routes
- Owns: `apps/api/src/routes/` (one file per route).
- Do: shrink, bargain, stuck help, pick for me, the morning line, the weekly
  sentence, the week's record name; and the Jev labels `task.work_mode`, `task.body_type`, `task.size`,
  `ramble.energy`, `share.private`, `table.name`.
- Eval: a small set per route.

### 6. Voice guide and offline lines
- Owns: `packages/voice/`.
- Do: the approved voice guides, one per language, as the single prompt
  source; the offline line pack per attitude and language; the banned-word
  checker per language, used by every eval.
- Done when: a prompt change runs every eval in CI.

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
- Done when: the founder receives a digest from staging.

### 9. Eval results to the bot
- Do: after a merge that touches `packages/voice`, post the eval summary and
  five fresh sample lines per attitude to the bot.
- Done when: a prompt change produces a message.

## Exit

- Every route has an eval set in CI.
- The app can run a full day from recorded fixtures and from staging.
