---
name: qa-handover
description: Define and run the product QA gate before an Intellegam assistant is handed to external QA (IFM/Infomedia), and write the handover test report. Use when the user asks for a "QA handover", "QA gate", "test plan for IFM", "what to test before handing <product> to QA", "run the QA gate for <product>", or a "QA handover report". Produces a Markdown report whose capability matrix is checked against customer-supplied ground truth, not against the product's own configuration.
---

# QA Handover

Run the test gate a product must pass before it goes to external QA, and write the report that proves it. The gate, its pass criterion and the report contract are defined in the two references below; this file only says in which order to do what, with which commands, and where the evidence lands.

Six steps: **ground truth → matrix → run → collect → report → deliver.**

## Scope and limits

- **Test gate only.** This skill does not define the handover process and does not decide go-live (`test-plan.md` §1).
- **Run from the product repository.** Today every Intellegam assistant, its eval suite and its datasets live in `intellegam-python`. The working directory must be a checkout of it and `uv run ig --help` must succeed; this proves the CLI is installed, not that secrets are available — the eval command loads them itself from Infisical unless `INFISICAL_SYNCED` is set. Otherwise stop and say so.
- **Version 0.1 writes a Markdown report.** There is no HTML template and no PDF rendering. Do not claim a rendered deck; if asked for a PDF say rendering is planned and hand over the Markdown.
- **Version 0.1 does not author or execute new cases.** Matrix cases run only where the existing suite already covers them. Adding cases means writing into the product repository — propose it, do it only with explicit consent, never commit.
- **The measured layer is only as good as what the runner records** (`test-plan.md` §2). Step 4 states what each runner records today; categories the runner cannot measure are reported as judged only.
- PostHog credentials are optional. Without them category 5 is "not measured" and the traffic-based ranking in `ground-truth.md` §3 is unavailable.

## Load the references

Resolve `<skill-base>` as `${CLAUDE_PLUGIN_ROOT}/skills/qa-handover`, then read both references completely before acting:

- `<skill-base>/references/test-plan.md` — what is tested, how it is judged, what the report contains
- `<skill-base>/references/ground-truth.md` — where the capability truth comes from and how conflicts are handled

Loading is fail-closed: if either reference cannot be read, stop and report the path and error instead of running a generic QA pass.

## Inputs

Take these from the user's request; ask only for what is missing, in one question round.

| Input | Default | Notes |
|---|---|---|
| Product | required | The eval namespace `<org>/<project>` where one exists (`tp/renault-cs-ger`, `ateco/ateco-repair-assistant`). SimplePart has no eval namespace — its route is `/infomedia/simplepart/customer-assistant` and its suite is pytest — so name it `infomedia/simplepart-customer-assistant`, matching the agent's own metadata and PostHog tag |
| Ground-truth source | asked in step 1 | may be pre-supplied ("the Notion scope page", "this XLSX") |
| Existing test list or UAT plan | asked in step 1 | path, git ref, or "none"; its case IDs are carried into the report unchanged |
| Report language | English | |
| Previous report | none | needed for category 6 and for "vs previous run" in §05 |
| Latency budget | the product's own release plan if it states one | SimplePart's is in `test-plan.md` §5. Without any, §05 reports the numbers and says no budget was set |
| Evidence directory (`<workdir>`) | `../qa-handover/<org>-<project>/<YYYY-MM-DD>/` | a sibling of the checkout, resolved to an **absolute path** before use; never inside the product repository unless asked |

## 1. Establish ground truth

Ask where the capability truth for this product lives before building anything. Use `AskUserQuestion` (or ask directly if unavailable) with the source options and the per-question ranking from `ground-truth.md` §3 and §4; allow more than one. When the product has a capability list written by Intellegam, the first question is whether the customer has confirmed it. If the request already names a source, do not ask — restate it in one line and proceed. If the user has nothing, offer the declared-surface fallback explicitly and get a yes; never fall back silently.

Read the chosen source fully and write the provenance record (`ground-truth.md` §6) to `<workdir>/provenance.md`. If the source cannot be read — Notion access denied, file missing, git ref unknown — stop and report; do not substitute the fallback without asking.

## 2. Build the matrix

Harvest the product's declared surface for this product's shape:

| Product shape | Declared surface |
|---|---|
| Module exports `PROJECT` (`tp/*`, `ateco/*`) | `agents.<org>.<project_with_underscores>` → `PROJECT.project_prompt`, `PROJECT.chat.start_prompts`, `PROJECT.capabilities` (two entitlements, `web_access` and `file_tools`, not a capability list); `CHAT_CONFIG`. Capabilities = the tools the knowledge agent wires for that configuration |
| SimplePart | `agents.infomedia.simplepart.customer_assistant.CHAT_CONFIG` (start prompts per locale in `i18n.py`); capabilities = the tools registered in `agent.py` |
| Live-only namespace | NEON project config via `POSTGRES_READONLY_URL` (the eval default `--source live`); `ResolvedEnvironment` excludes the chat presentation |

Diff it against the ground-truth source and apply the three outcomes in `ground-truth.md` §2. If an existing test list was supplied, map its cases onto rows and categories and carry its IDs. Write the three requests per row following `test-plan.md` §3.1 and §4, each naming its expected tool and arguments (measured) and its rubric (judged). Draft the guardrail, escalation and grounding cases per `test-plan.md` §3.2–3.4. Category 6 follows `test-plan.md` §3.6.

Write the complete case list to `<workdir>/matrix.md` before running anything and tell the user how many rows and cases it holds.

## 3. Run

Pick the entry point from what exists in the checkout — the product decides, not the skill:

1. **YAML dataset exists** at `tests/datasets/<org>/<project_with_underscores>/` (or flat `<project_with_underscores>.yaml`): run
   `uv run ig agent eval <org>/<project> --json-report <workdir>/eval.json 2>&1 | tee <workdir>/eval.log`.
   The default `--source live` reads the NEON **dev** plane; prefix the global flag `uv run ig --env=prod agent eval …` to test the production plane, and record the resolved source and plane in §09. Add `--source code` or `--target-url <url>` only when the user names a non-default target. **Exit status 1 means at least one case failed; it is informational.** Read `eval.json` regardless. Only a missing `eval.json` or a traceback in `eval.log` is a run failure — then stop and report.
2. **pytest suite exists** at `tests/evals/test_<product>_*.py` (the SimplePart case): run
   `uv run pytest tests/evals/test_simplepart_single_turn.py tests/evals/test_simplepart_multi_turn.py tests/evals/test_simplepart_smoke_fr_ca.py -m llm_eval -v -s --junitxml=<workdir>/eval.xml 2>&1 | tee <workdir>/eval.log`.
   Pytest's exit status 1 is likewise informational. `SIMPLEPART_API_MODE` defaults to `live` under `-m llm_eval` (the real catalogue for storefront 4512); record the mode in §09.
3. **Neither exists**: stop and report. Nothing can be run and no category may be reported as tested.

Re-run only cells whose judged verdict flipped, three times each (`test-plan.md` §2); never re-run the whole suite to make a number come out.

## 4. Collect

Map every executed case to a matrix cell or a category. A cell with no executed case is **untested**, never passed. What each runner records today:

| Source | Records | Does not record |
|---|---|---|
| `eval.json` (`ig agent eval`) | per case `{name, passed, scores}`, `task_failures`, `evaluator_failures`, `pass_rate` — judge verdicts only. Join `metadata.{dimension,scenario,topic}` from the dataset YAML by case name | tool calls, model outputs, judge reasons. **Categories 1–4 are judged only for YAML products** and §09 says so. The run does export tool-call span events to the dev PostHog project (`$ai_input_state` carries the arguments); recovering the measured layer from there is a later collection step, not done in this version |
| `eval.xml` + `eval.log` (SimplePart pytest) | pass / fail / skipped per test — a skip is untested. Model outputs and judge reasons for the single-turn dataset test, which calls `report.print`; for every other test only a failing case's reply, inside the assertion message. **The single-turn dataset (32 cases) measures nothing about which tool ran**: its cases carry `LLMJudge` and `InjectionDefended` rubrics plus `NoInternalIds` (regex, all cases) and `ProseNotBullets` (regex, the `return_policy` case only). Tool calls are measured only where a standalone test asserts them: `count_tool_calls` / `find_tool_call_args` (tool and arguments); the approval-halt tests (the run ends in an approval request naming the tool, the card payload carries product, stock code and quantity and no raw key); the forbidden-phrase checks for false success after a decline (TC-G-07, TC-R-12); `resume_with_denial` (a post-decline retry re-halts for approval and the model stops re-issuing within four denials) | the tool call itself is never printed; a passing case's reply outside the dataset test is not recorded. Every other "no false success" check and every refusal is **judged**, as is `InjectionDefended` except its content-filter branch. Mark a SimplePart case measured only where one of the deterministic checks above applies; otherwise it is judged only, and §09 says so |
| PostHog export (category 5) | see below | anything outside the window |
| Previous report + its `eval.json`/`eval.xml` (category 6) | per-case pass/fail diff | nothing on a first run — state "baseline established" |

Making a runner print tool calls, or adding a tool-call evaluator, is a product-repository change; do not fabricate tool lines.

Record the first-pass tally, the final tally, the number of runs and the judge model. Build the findings ledger and the "checked and clean" list in the `test-plan.md` §7 format.

**Category 5 — real traffic**, production only:

- SimplePart: `uv run python -m operations.simplepart.posthog_export --days 7 --base-uri "file://<absolute workdir>/posthog"` (requires `SIMPLEPART_POSTHOG_PERSONAL_API_KEY` and `POSTHOG_PROJECT_ID_INTELLEGAM_PRODUCTION`; `POSTHOG_HOST` defaults to `https://eu.posthog.com`). Do not pass `--snapshot-date`: the default is yesterday in America/New_York, and passing `--base-uri` already disables the nightly-hour guard (a `--days` equal to the default does not). Files land in `<workdir>/posthog/snapshot_date=<YYYY-MM-DD>/`. **The export includes preview and staging sessions — including the team's own manual QA — so filter every row to `environment == "production"` and record the filter and window in §09.** Then: p50/p95 per turn from `$ai_latency` in `ai_trace.ndjson.gz` (one row per agent turn); per-stage latency from `ai_generation.ndjson.gz` (model calls) and `ai_span.ndjson.gz` (tool calls); failure classes and per-tool outcomes from `ai_span` and `ai_trace`; turn and session counts. Report the window and "N turns from N sessions".
- Other products: a HogQL query on `$ai_trace`, `$ai_generation` and `$ai_span` filtered to the product and to production, following the request shape in `tests/evals/reconcile_posthog.py` — which has no product filter and targets the dev project, so adapt, do not reuse.
- Every failure class seen in the window becomes either a ledger finding or a side attribution with evidence (§07).
- Credentials absent: do not skip silently. Use the §05 "not measured" wording from `test-plan.md` §10, list real traffic in §09 under what this test does not cover, and do not report category 5 as met.

The export carries PII (customer messages, escalation e-mail addresses). Keep it in `<workdir>`, quote no customer message in the report, and say at delivery that the directory contains PII.

## 5. Write the report

Write `<workdir>/report.md` following the spine in `test-plan.md` §10, section by section, in the requested language. Every section is present with the mandatory elements the spine lists; a section with nothing to show carries the spine's "when empty" text rather than disappearing. Transcripts in §10 are verbatim from `eval.log`, unedited, where the runner recorded them; for a case whose reply the runner did not record (step 4), §10 carries the case name, the expected and observed observable and the verdict, marked *reply not printed by the runner*, and §09 names the gap.

## 6. Deliver

Return the report path, the cover verdict, and open items grouped by owner and side, and restate the hand-back protocol (`test-plan.md` §8). Writing the report completes the request; posting it to Google Chat, Notion, Slack or e-mail is a separate action that needs an explicit request. Remind the user that `<workdir>` may contain PII from the PostHog pull.
