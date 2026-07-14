# Walkthrough map — one diagram, repeated with the current step highlighted

**Fits when:** a section walks through 3+ steps of one pipeline or flow (plan → copy → verify → delete) and the reader could lose orientation between code blocks.
**Skip when:** fewer than ~3 steps, or the flow is trivial — the repetition then costs more vertical space than it buys orientation.

Define the diagram ONCE as a template function (tour.tsx is plain TSX), then re-render it at each step with the active node highlighted — a "you are here" map:

```tsx
const pipeline = (active: string) => `flowchart TD
  plan["build the plan"] --> copy --> verify["verify by size"] --> del["delete source"]
  classDef current fill:#fde68a,stroke:#b45309,stroke-width:2px
  class ${active} current`;

<h3>Verifying the copy</h3>
<Graph source={pipeline("verify")} />
<p>…this step's prose…</p>
<Diff file="…" lines={{ side: "new", start: 407, end: 425 }} />
```

**Pitfalls**

- Keep the map small (5–8 nodes); a big map repeated four times dominates the page.
- Node ids must stay identical across calls — only the `class … current` line changes.
- Don't re-narrate the whole map at every step; the moving highlight IS the orientation.
