# Pseudocode — the shape of an algorithm, before the real lines

**Fits when:** a hunk implements an intricate algorithm whose *idea* is hard to see line-by-line — a tricky loop with interleaved cases, a recursive walk, a multi-pointer scan, a small state machine. A few plain-language steps make the shape obvious; the real diff then confirms it.
**Skip when:** the code already reads plainly, or the logic is simple. Pseudocode over straightforward code just adds a layer to keep in sync.

Pseudocode is an *abstraction you write*, not diff content — the one place a tour puts author-written "code-ish" text on the page. That cuts against the grounding guarantee, so handle it with care: keep it unmistakably a summary, and always pair it with the real `<Diff>` as the ground truth.

```tsx
<p>The slice keeps interleaved deletions instead of dropping them — the idea:</p>
<pre>{`take the rows whose chosen-side line is within [start, end]
widen to the contiguous span from the first such row to the last
  → any opposite-side row sitting between two hits comes along
rebuild the @@ header from the min/max line on each side`}</pre>
<Diff file="src/diff.ts" lines={{ side: "new", start: 120, end: 140 }} />
```

A plain `<pre>` gets code-block styling. Write **high-level steps in plain language, not realistic syntax** — the goal is the shape, and prose-steps can't be mistaken for the actual code (which is the whole point of a grounded tour). The `<Diff>` beside it is what the reader trusts; the pseudocode only orients.

**Pitfalls**

- Never let pseudocode stand in for the diff — it is the explanation, the `<Diff>` is the evidence. Show both, pseudocode first.
- Keep it short (a handful of steps). If it approaches the length of the real code, drop it and just narrate the code.
- Don't drift toward real syntax: the more it looks like code, the more it risks reading as the (ungrounded) truth — exactly what the tour exists to prevent.
