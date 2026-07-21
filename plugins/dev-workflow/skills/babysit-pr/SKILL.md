---
name: babysit-pr
description: This skill MUST be used after creating or updating a PR on the current branch to babysit it - triage review comments (Codex or human) and CI failures until the PR is clean. Proactively run after `/dev-workflow:dev-sync` pushes a PR. Also use when the user says "babysit the PR", "babysit my PR", "triage PR", "handle PR comments", "address review", "respond to Codex", "resolve review threads", "fix CI on my PR", "my PR checks are red", or "what did Codex say".
---

# Babysit PR

## Dev Workflow

This skill is the post-PR step:

`/dev-workflow:dev-check` → `/dev-workflow:dev-review` → `/dev-workflow:dev-sync` → PR created → **`/dev-workflow:babysit-pr`** (loops until clean)

Requires `gh` (authenticated) and `python3`. Scripts live in this skill's `scripts/` directory — invoke them with `python3 "<skill-base>/scripts/<name>.py"` using the base directory announced when this skill loads. Check CLAUDE.md's **Dev Workflow Plugin** section for repo-specific triage notes (known flaky checks, sibling deployments that fail independently of the PR, a custom review bot to watch).

---

## The rule: Verify Before Fixing

Reviewer findings (automated or human) are **hypotheses**, not facts. Every reviewer pass introduces noise; acting on unverified claims creates worse code.

Before acting on any finding:

1. **Read** the claim + cited code. Understand the proposed failure mode.
2. **Prove or disprove empirically**: write a reproducing snippet, grep the codebase, run a targeted test, or exhibit a counter-example. If you cannot produce evidence, escalate to the user — do not fix on suspicion.
3. **Only then classify and act.**

## Process

### 1. Arm the waiter, then fetch PR state

**Arm first, fetch second** — the waiter baselines at startup, so anything that happens after arming (including during your triage pass) fires on this or the next arm. Fetching first would let an event land unseen between fetch and arm.

```text
# tool call (not a shell command) — one-shot: exits when the next event fires
Monitor(
  command="cd <repo-root> && python3 <skill-base>/scripts/await_pr_event.py $pr",
  description="next event on PR #$pr",
)
```

The `cd <repo-root>` prefix is required: `gh` resolves the repo from the working directory, and the monitor inherits whatever cwd the shell last had — which may have drifted elsewhere. Watch for the waiter *failing* (its task ends with a non-zero exit): that means it could not see the PR at all — re-arm it; never assume a dead waiter means a quiet PR.

Then fetch the current state:

```bash
pr=$(gh pr view --json number -q .number)
python3 "<skill-base>/scripts/fetch_open_threads.py" "$pr"
gh pr checks "$pr"
```

`fetch_open_threads.py` returns JSON: only unresolved threads, each with `thread_id`, `path`, `line`, and the full comment chain. Resolved threads are filtered out so we don't re-triage.

The waiter exits printing one line when something changes:

- `review-activity` — the review set changed (new, dismissed, or replaced review, any author)
- `reaction` — the PR's reactions changed (Codex reacts 👍 on the PR instead of posting a review when it finds nothing — this is its all-clear; anyone can react though, so verify the reactor in step 5 before treating it as one)
- `new-head` — a commit was pushed; CI and reviewers restart
- `ci-failure` — a check entered a failing state (includes cancelled/timed-out)
- `ci-concluded` — no checks pending anymore (green or red)
- `pr-closed` — the PR was merged or closed
- `quiet` — nothing happened for 30 min (`--quiet-after` to change) — the PR looks settled, assess for merge

Treat `review-activity`, `new-head`, `ci-failure`, and `ci-concluded` as "re-enter step 1" (re-arm, re-fetch, re-triage). Treat `reaction` and `quiet` as cues to assess the step-5 stop conditions and, if clean, report ready-to-merge. On `pr-closed`, stop babysitting — don't re-arm; report final state.

### 2. Classify each finding

Iterate the threads from step 1. For each one, apply **Verify Before Fixing**, pick a class, and act:

- verify the claim empirically (grep, reproducing snippet, targeted test)
- classify the finding (table below)
- `already-addressed` / `false-alarm` → reply + resolve (step 4)
- `real-fix-obvious` → queue the fix (commit all obvious fixes in a single batch)
- `real-fix-nonobvious` / `judgment-call` → present to user, leave the thread open

| Class                   | Meaning                                                   | Action                                                                      |
| ----------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| **already-addressed**   | Fixed by a prior commit; reviewer re-raised a stale claim | Reply citing commit + test; resolve (bot threads only — see step 4)         |
| **false-alarm**         | Claim doesn't match reality                               | Reply with empirical disproof (commit/test/counter-example); resolve (bot threads only) |
| **real-fix-obvious**    | Clear bug, small self-contained fix                       | Fix + test; batch commit + push once per pass; reply citing commit, resolve |
| **real-fix-nonobvious** | Real issue, fix is ambiguous or far-reaching              | Present options to user, don't auto-act                                     |
| **judgment-call**       | Stylistic or subjective trade-off                         | Present tradeoffs to user                                                   |

**Batch obvious fixes into a single commit** before moving on, so the review bot re-reviews once against the combined change instead of firing on each individual push.

If `/dev-workflow:dev-review` added a regression test for a claim that turned out to be a false alarm, cite _that test name_ in the `false-alarm` reply — the pre-push evidence is the cleanest artifact to link.

### 3. CI failures

For each failing check (GitHub Actions — for other providers, follow the check's details URL):

```bash
gh run view <run-id> --log-failed
```

Classify:

- **our-bug** — our change caused it → fix
- **flaky** — intermittent test, unrelated infrastructure → retry once via `gh run rerun`; if it still fails, treat as our-bug
- **external-dep** — a transient outside the PR's control (package registry/CDN blip, a sibling deployment that fails independently of this change — check CLAUDE.md's triage notes for known ones) → note and move on; don't block on it
- **infra** — CI config / secrets / runner problem → report to user

Report root cause before acting on non-trivial ones.

### 4. Reply + resolve

**Reply to every triaged finding.** The reply IS the context: it feeds the next review pass (so the bot doesn't re-raise the same false alarm) and is the durable record for future readers.

```bash
python3 "<skill-base>/scripts/reply_and_resolve.py" "$THREAD_ID" "$(cat <<'EOF'
reply body here — cite commit hash, test name, or empirical proof
EOF
)"
```

Reply content checklist:

- Cite evidence: commit SHA, test name, or a reproducing snippet
- Terse but complete — enough that the reviewer won't re-raise next pass
- On `false-alarm`: state what you verified and how (not just "not an issue")

**Only resolve when the finding has a clear disposition.** `real-fix-nonobvious` and `judgment-call` stay open until the user decides. **Human-authored threads always get `--no-resolve`** — reply, but leave resolution to the maintainer; human comments are conversation, not just findings.

### 5. Loop (event-driven)

After the first triage pass, **do not block**. The waiter armed in step 1 is one-shot: when its notification lands, re-enter step 1 (arm a fresh waiter, fetch threads + checks, triage). Between events you are free to return to the user, work on other tasks, or wait idly.

Stop when all three are clear:

1. **No skill-actionable review threads remain.** `fetch_open_threads.py` returns every unresolved thread — subtract the ones classified as `real-fix-nonobvious` / `judgment-call` (and human threads awaiting the maintainer's reply) during this session. Those are expected to stay open pending user decision and **must not block the stop condition** — report them at step 6 when stopping. Stop when the remaining threads (`already-addressed` / `false-alarm` / `real-fix-obvious`) have all been replied + resolved.
2. **CI checks are SUCCESS** (or the user has accepted non-blocking failures). Check: `gh pr checks "$pr"`.
3. **No actionable written feedback** on the PR outside inline threads. GitHub has three surfaces beyond inline threads, and the waiter only fingerprints reviews/reactions/checks — check the others manually:
   - **Latest review body** (`COMMENT` / `REQUEST_CHANGES` with a summary but no inline comments — typical human pattern):

     ```bash
     gh pr view "$pr" --json latestReviews --jq \
       '.latestReviews[] | {author: .author.login, state, body: (.body[0:400])}'
     ```

   - **Top-level PR conversation comments** (the "Conversation" tab — neither a review nor an inline thread). On your **first** pass over a PR, read all of them — an older comment may still be unaddressed. On later passes, filter to those after your last fix commit. This is also where review bots post out-of-band notices — e.g. Codex posting "usage limits reached" means the PR was never reviewed and quiet is NOT all-clear:

     ```bash
     last_fix=$(git log -1 --format=%cI HEAD)
     gh pr view "$pr" --json comments | jq --arg since "$last_fix" \
       '.comments[] | select(.createdAt > $since) | {author: .author.login, body: (.body[0:400])}'
     ```

   - **Open review threads** — already covered by (1).

   For **Codex specifically**: when it has no findings it **reacts with 👍 on the PR instead of posting a review** — the waiter surfaces this as a `reaction` event. Reactions carry no author in `gh pr view`, so before treating one as the all-clear, confirm who reacted:

     ```bash
     gh api graphql -f query='query($owner:String!,$repo:String!,$pr:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$pr){reactions(first:20){nodes{content createdAt user{login}}}}}}' \
       -F owner='{owner}' -F repo='{repo}' -F pr="$pr" --jq '.data.repository.pullRequest.reactions.nodes'
     ```

     The 👍 must be from the review bot and its `createdAt` must postdate your last push. A Codex review whose body is only the standard "Here are some automated review suggestions" boilerplate + the `Reviewed commit: ...` line, with zero inline threads, is also all-clear. For any other author, assume a body-only review or conversation comment is blocking unless you read it and confirm otherwise.

Stopping on `quiet` with green CI is legitimate even when the review bot never appeared (it may be rate-limited or down) — but the report must then say so explicitly. State the reviewer's status for the **current head**: reviewed-clean, reacted 👍, or **not observed** — never let silence read as approval.

Then stop the still-armed waiter with `TaskStop` (its task id is in the most recent Monitor response) and report.

`real-fix-nonobvious` and `judgment-call` threads stay open by design — they block only on user decision, not on the skill looping. Report them and stop the waiter.

If the same finding reappears after a reply, escalate — either the reply didn't land as useful context, or the finding deserves a real fix after all.

### 6. Report

Summarize to the user:

- Findings triaged (counts by class)
- Commits pushed
- Threads still open (with reason — waiting on user decision)
- CI status

## Scope & safety

- **Don't reply on someone else's PR** without authorization. Compare `gh pr view --json author --jq .author.login` with `gh api user --jq .login` — only proceed when they match.
- **PRs must target this checkout's repo.** Before the first triage pass, check `gh pr view "$pr" --json isCrossRepository --jq .isCrossRepository` — if `true`, stop and tell the user: the scripts resolve the current repo and would query the wrong one.
- **Draft PRs**: review bots don't review; skip.
- **Never push to the PR's base branch.** Feature-branch PRs only — all fixes go to the PR's head branch.
- **Custom review bots**: the waiter fires on review activity from any author. If the repo declares a custom bot in CLAUDE.md's triage notes, apply the same clean-signal reasoning to it as to Codex.

## Related skills

- `/dev-workflow:dev-review` — local review loop before pushing; shares the **Verify Before Fixing** discipline.
- `/dev-workflow:dev-sync` — documentation alignment; the step that typically precedes creating a PR.
