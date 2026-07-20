# Before / after — contrast the old and new shape of one region

**Fits when:** a refactoring changes the *shape* of code (a rewritten docstring/contract, a function split, a data model change) and the contrast itself is the story.
**Skip when:** the change is additive — a unified hunk already interleaves old and new lines, which is usually enough.

Show the same region twice, old side then new side, with one sentence naming what to compare:

```tsx
<p>The module contract was rewritten. Before — bulk copy for trees only:</p>
<Diff file="relocate.py" lines={{ side: "old", start: 1, end: 24 }} />
<p>After — sidecar-safe copy AND move, with the two-phase order spelled out:</p>
<Diff file="relocate.py" lines={{ side: "new", start: 1, end: 28 }} />
```

**Pitfalls**

- Both slices must resolve inside the SAME hunk (slices cannot cross hunk boundaries).
- Use it for one or two pivotal regions, not as the default — everywhere else the normal unified view is denser.
- Old-side slices still count toward completeness; check the new side of that hunk is shown or covered elsewhere too.
