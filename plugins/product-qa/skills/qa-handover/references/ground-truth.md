# Where the capability ground truth comes from

The capability matrix in `test-plan.md` checks the product against what the customer holds to be true. This document says where that truth lives, how to rank sources when several exist, what to do when they disagree, and what to record so a reader can judge the report.

## 1. Why this is a separate step

In the Krallerhof routing test, accounting was configured on extension 605; the hotel's own routing list said 600. A matrix generated from the configuration would have said 605 on both sides and passed. Every finding of that test came from comparing what the assistant actually did against the hotel's list, never against the assistant's own configuration or prompt (`test-plan.md` §1).

## 2. The three-way diff

| Source | What it is | Where it comes from |
|---|---|---|
| **Declared** | What the product says it does: prompt, registered tools, start prompts, capability flags | The product repository or its live configuration |
| **True** | What the customer holds to be the product's job and the facts behind it | The customer: their capability list, routing list, spec, system of record |
| **Observed** | What the product actually did | The test run: tool calls, arguments, cards, replies |

Declared vs true, before any test runs: in truth but not declared → a finding; declared but not in truth → ask whether it belongs in the gate and record the answer; in both → a matrix row. Observed vs true, after the run: the pass criterion.

## 3. Rank the sources per question

"Ground truth" is four different questions, and the best source differs for each. Ask for the first-ranked source; take a lower one only when the higher does not exist, and say so in §09 (the report's method section; report sections are defined in `test-plan.md` §10).

| Question | 1st | 2nd | 3rd |
|---|---|---|---|
| **What should the product do** for this intent? | The customer-confirmed capability list or UAT plan | An Intellegam-written spec — flagged *"written by Intellegam, not confirmed by the customer"* | The prompt and tool registration — flagged *self-referential* |
| **Is this fact** in the reply correct? | The live system of record at run time (catalogue API, routing list, database), value and retrieval date recorded | Constants pinned in rubrics — they go stale; re-pin and note it | Any document |
| **Which capabilities matter most?** | Real traffic — PostHog top intents by volume for the window | Scenario weights in the eval suite, if their provenance is known | Our judgement, said so |
| **Is the declared surface complete?** | The customer's API contract or scope document diffed against the capability list | — | — |

## 4. How to read each source

| Source | Read with | Note |
|---|---|---|
| Notion page or database | `notion-fetch`, `notion-search` | Record the page URL and last-edited date |
| Supplied document — PDF, XLSX, Markdown, HTML | Direct read; `wh convert` in the product repository for binary formats | The Krallerhof case: the hotel's routing list. Record file name, version or date, who supplied it |
| Live system of record | The product's own client (SimplePart catalogue API, `ukey_website` 4512 for the test storefront) | Fetch at run time; record the values and the date. Never copy from an older rubric |
| Real traffic | PostHog trace and span events for the window, production environment only | Demand side. It tells you what to weight, not what is true; it complements the list, never replaces it |
| Fallback: declared surface | The product's registered tools, chat configuration and prompt, or its live project row | Only with the user's explicit yes. Flagged in §09: *"derived from the product's own configuration; self-referential"* |

## 5. When sources disagree

The test never picks a side.

- **Customer truth vs configuration** — a finding, in the ledger with wrong value and right value (the 605 case). The configuration is corrected or the customer confirms the configuration is right; either way the report says which.
- **Rubric constant vs live system of record** — "rubric stale": re-pin to the live value, note it in §09, do not count the old failure against the product.
- **Two customer sources disagree, or the customer's list and their live system disagree** — a customer decision in §08 with the two values side by side. Krallerhof B: "confirm the kitchen extension: 660 or 204". LDV: "which Australian model does each of T90, XingJi H, XingJi R and T70 correspond to?"
- **Real traffic shows an intent the list does not cover** — a row marked "not in the capability list — observed N times in the window", and a customer decision whether it belongs.

## 6. The provenance record

Written to `<workdir>/provenance.md` in step 1 and repeated in §09.

| Field | Content |
|---|---|
| Source type | capability list / UAT plan / routing list / spec / system of record / real traffic / declared surface (fallback) |
| Locator | URL, file name and path, git ref, API endpoint |
| Version or date | document date, last-edited, or retrieval timestamp |
| Supplied by | name and role, or "Intellegam" |
| Confirmed by the customer? | yes with date and by whom / no / unknown |
| Known gaps | what the source does not cover |

Example, SimplePart, as the situation stands at the time of writing:

| Field | Content |
|---|---|
| Source type | Capability list + internal test cases + UAT plan |
| Locator | `intellegam-python`, `git show 3987b071^:agents/agents/infomedia/simplepart/customer_assistant/QA-Capabilities.md`, `…/QA-Test-Cases.md`, `…/QA-Plan-Internal.md`; `simplepart-qa-test-plan.html` at the repository root, same ref |
| Version or date | Written April 2026, last edited 2026-05-04; removed from tracking on 2026-06-30 by commit `3987b071`, hence readable at its parent ref |
| Supplied by | Intellegam |
| Confirmed by the customer? | unknown — ask before the run |
| Known gaps | UI-only behaviour (cards, dropdowns, carrier links) not covered by the harness; fr-CA at one case per capability |
