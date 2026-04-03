---
name: codex-adversarial-review
description: Use when the user asks to "challenge this", "stress test this", "adversarial review", "find reasons this shouldn't ship", or when you want Codex to pressure-test code changes, architectural plans, or design decisions. Guides prompting the Codex MCP tools for adversarial reviews that question design choices, assumptions, and failure modes.
---

# Adversarial Review with Codex

An adversarial review goes beyond correctness — it challenges whether the approach is right, what assumptions it depends on, and where the design fails under real-world conditions. Use the `codex` tool (not `codex-review`) since this needs a custom prompt.

## When to use

- Before shipping non-trivial changes where the cost of being wrong is high
- When the user asks to stress-test, challenge, or pressure-test a change
- After a standard `codex-review` passes but the change still feels risky

## Prompt template

```xml
<task>
Adversarial review of [describe the change and its purpose].
Repository: [repo path]
Scope: [files/commits/branch to review]
</task>

<operating_stance>
Default to skepticism. Assume the change can fail in subtle, high-cost, or
user-visible ways until the evidence says otherwise. Do not give credit for
good intent, partial fixes, or likely follow-up work.
</operating_stance>

<attack_surface>
Prioritize failures that are expensive, dangerous, or hard to detect:
- auth, permissions, tenant isolation, trust boundaries
- data loss, corruption, irreversible state changes
- race conditions, ordering assumptions, stale state
- rollback safety, retries, partial failure, idempotency gaps
- empty-state, null, timeout, degraded dependency behavior
- version skew, schema drift, migration hazards
</attack_surface>

<output_contract>
For each finding: severity (critical/high/medium/low), affected file and lines,
what can go wrong, why this code path is vulnerable, likely impact, and a
concrete fix recommendation. Include a confidence score (0-1).
Write the summary as a terse ship/no-ship assessment, not a neutral recap.
Report only material findings — no style feedback or speculative concerns.
</output_contract>

<grounding_rules>
Every finding must be defensible from the repository context.
Do not invent code paths, attack chains, or runtime behavior you cannot support.
If a conclusion depends on an inference, state that explicitly and keep the
confidence honest. Prefer one strong finding over several weak ones.
</grounding_rules>
```

Adapt the template to the specific change. Add `[focus area]` if the user wants to stress-test something specific (e.g., "focus on the auth flow").

## After the review

Present Codex's findings ordered by severity. Critically evaluate each finding — not all warrant action. Distinguish quick patches from deeper architectural issues, and fix what makes sense. If Codex found no material issues, say so directly.
