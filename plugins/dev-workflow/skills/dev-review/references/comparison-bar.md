# Comparison Bar

Before reporting a finding, find its sibling path: the closest existing code
path in the repository that handles the same kind of input, operation or
boundary. Existing rigor there is evidence of what the repository accepts.

Keep two questions apart: is the defect real, and is the fix worth it. A real
defect can still have a remedy that costs more than it protects.

A fix beyond what the sibling path accepts is not required unless the finding
names a concrete exploit or harm, an explicit requirement, or a boundary the
new path crosses and the sibling does not, such as input from untrusted
callers. Report a finding whose fix is not required, tagged `beyond-parity`.

Below each finding's paragraph, add three lines:

- `Contract:` the requirement, invariant or guarantee the change violates.
- `Sibling:` the sibling path's file and symbol and how it handles the case,
  or `none` and why no analogous path exists.
- `Remedy:` the smallest fix that restores the contract, and its cost in added
  source lines, test lines and fixtures.
