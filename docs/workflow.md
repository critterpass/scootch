# Scootch: how we work

Each rule here exists because the opposite cost real time on CritterPass. The
"learned from" column says what happened.

## 1. Lanes

| Rule | Learned from |
|---|---|
| At most three or four lanes at once, one per area | Twelve to sixteen lanes exhausted the session window and stalled an 8-core Mac |
| One lane, one task, then it closes. A new task gets a fresh lane and a short brief | Lanes resumed five to ten times re-read their whole history: 450k to 940k tokens a pass |
| A lane never waits inside its turn. It pushes, dispatches, reports the run id and stops | Lanes polling CI burned tokens and the shared GitHub API budget |
| Every brief has a time box. A spike is ten to fifteen minutes, three to five samples, a verdict in a few lines | A "quick spike" briefed at ninety minutes with a 150-line report |
| Never widen a running task. Start a separate small one | Scope added mid-run |
| Medium effort by default; high only for native crashes, money, auth, data migration and cross-package contracts | Drift to high effort for everything |

## 2. Pull requests

| Rule | Learned from |
|---|---|
| One pull request per lane per cycle, with one CI run and one device run | Thirty open pull requests, each needing its own run and review |
| Merge with `gh pr merge --auto --squash`; never `--watch`, never a tight polling loop | The 5,000-call hourly budget ran out |
| No session links or attribution lines in commits or pull request bodies | Squash merges copied them into public history |
| Registries are folders, not lists: one file per screen, work mode, monster body, AI route and bot command, collected by a generated index | Every merge conflicted in the same registration lists |

## 3. This Mac

| Rule | Learned from |
|---|---|
| No full typecheck, lint or test suite locally. Run the one test file in hand; CI runs the rest | A typecheck took ten minutes with thirteen lanes |
| Device runs happen on GitHub Actions only. No simulators or emulators here | Simulators grew to 12 GB and the disk hit zero |
| No Docker | The stack has none; keep it that way |
| Lane worktrees live on the external lanes volume; remove them when their pull request merges | Finished worktrees held 4 to 6 GB each |
| Installs go through one queue, two at a time | Thirty-seven parallel installs deadlocked the volume |
| Kill only a process id you started. Never `pkill -f` or `killall` | `pkill -f "cat"` took Docker down |
| Never `git stash`; work in progress is a commit on your own branch | The stash list is shared across worktrees |
| Temp files go in `<scratchpad>/<branch>/`; never delete a file you did not create | A lane wiped the controller's scripts |
| Screenshots never enter the repository's git store. They are run artifacts | A screenshots branch grew to 7 GB and filled the disk three times |
| Shell is zsh: use arrays or `${=list}` to split, and compare times as numbers | Watchers that looped for hours on an unsplit list |

## 4. Native builds

| Rule | Learned from |
|---|---|
| Every capability and target is declared in the first native build | A missing capability failed signing and burned a build number |
| A change that alters the native fingerprint never lands on main between batches | A fingerprint change stranded the installed build for a day |
| Native work is batched; a JavaScript-only change never triggers a paid build | EAS builds cost money |
| Before saying an update is on a phone, confirm which build that phone runs and that its runtime matches | Updates published for the wrong runtime |

## 5. Proving it works

| Rule | Learned from |
|---|---|
| Every flow is walked as a fresh user: new install, no seed, real permissions prompts | Build 13 was "barely working" for a real user while every seeded flow passed |
| The fresh-user walk exists from the first screen, and grows with each phase | Gates were added after the features |
| No interface merge without design-beside-device sheets of every touched screen | A dozen obvious issues on screens nobody had captured |
| Sheets include the real states: long text, largest text size, keyboard open, empty, offline, serious mode | Lab scenes hid truncation, overlaps and keyboard faults |
| After any command or admin action, read back the state the app actually reads | "Applied" reported while the derived state was wrong for eleven hours |
| Anything a phone must register (tokens, permissions) is re-sent on launch or confirmed applied | A rejected registration was marked sent and never retried |
| "Done" needs evidence: the test output, the run id, or the sheet. Say what was not checked | Guesses reported as causes |
| Times come from `date`, never from memory | Notes stamped ten minutes ahead |

## 6. Secrets

| Rule | Learned from |
|---|---|
| Only `.env.example` is committed | Standard |
| List variable names only, with a names-only command. Never print values | A private key printed into a transcript, twice |
| A key pasted in chat goes into a file outside every repository, mode 600, and gets rotated after | A spike key in the transcript |

## 7. Scootch-specific

| Rule | Why |
|---|---|
| Every AI route has an eval set before it serves a user, in CI | The voice is the product; a prompt change can break it silently |
| The serious and crisis screen has its own eval set, and no change merges with a miss | The cost of a joke in the wrong place |
| A prompt or voice-guide change posts its eval result to the Telegram bot | The founder approves the voice by reading it |
| Nothing is called "MVP", "v2" or "later" in code for designed behaviour | Full scope at launch; the after-launch list is in the product brief |
