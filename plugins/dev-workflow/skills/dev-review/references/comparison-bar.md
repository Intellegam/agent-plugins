# Comparison Bar

Every finding-producing reviewer applies this bar, except the
structural-and-lean reviewer.

Before reporting a finding, find its sibling path: the closest existing code
path in the repository that handles the same kind of input, operation or
boundary. When reviewing connector skills, for example, the existing connector
tool calls are the sibling path. Existing rigor is evidence of what the
repository accepts. Explicit requirements, stronger boundaries and
demonstrable harm override it.

Keep two questions apart: is the defect real, and is the fix worth it. A real
defect can still have a remedy that costs more than it protects.

Hardening beyond what the sibling path accepts is optional unless the finding
names a concrete exploit or harm, an explicit requirement, or a boundary the
new path crosses and the sibling does not, such as input from untrusted
callers. Tag such a finding `beyond-parity`.

Below each finding's paragraph, add three lines:

- `Contract:` the requirement, invariant or guarantee the change violates.
- `Sibling:` the sibling path's file and symbol and how it handles the case,
  or `none` and why no analogous path exists.
- `Remedy:` the smallest fix that restores the contract, and its cost in added
  source lines, test lines and fixtures.
