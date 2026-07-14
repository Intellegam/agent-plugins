# State maps — map every failure to its guaranteed end state

**Fits when:** the PR is about safety, invariants, or failure handling — the real deliverable is "whatever goes wrong, you end up HERE".
**Skip when:** failures are incidental (a validation error message) rather than the design.

One top-down diagram, each outcome mapped to its end state in *user* terms — and if an entire class of states is impossible by construction, say so in the map; that is usually the strongest single statement of the PR:

```tsx
<Graph source={`flowchart TD
  O1["copy or verify failed"] --> R1["source INTACT · destination rolled back clean · safe to retry"]
  O2["delete failed after verified copy"] --> R2["destination COMPLETE · leftover source keys are NAMED"]
  O3["everything succeeded"] --> R3["source gone · destination COMPLETE"]
  BAD["source gone AND destination incomplete"] --> IMP["IMPOSSIBLE by construction"]`} />
```

Place it where the guarantees have just been shown in code (after the rollback/sweep sections), as the payoff — not before, where it would be an unearned claim.

**Pitfalls**

- Outcomes must be mutually exclusive and cover all paths, or the map undermines trust.
- End states in user language ("safe to retry", "orphans are named"), not implementation language ("RollbackError raised").
