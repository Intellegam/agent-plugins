# Data shapes — render schemas, payloads and API surfaces as visuals

**Fits when:** the PR introduces or changes a data structure, a config format, a table schema, or a command/API surface — things humans parse faster as a table or card than as code.
**Skip when:** the shape is trivial (one field) or incidental to the change.

Plain JSX is enough — no library:

```tsx
<p>A plan is now explicit pairs, split into two ordered phases:</p>
<table>
  <thead><tr><th>Field</th><th>Meaning</th></tr></thead>
  <tbody>
    <tr><td><code>hidden_pairs</code></td><td>sidecar objects — copied FIRST (cache marker lands before the webhook fires)</td></tr>
    <tr><td><code>src_pairs</code></td><td>the visible files — copied second</td></tr>
    <tr><td><code>delete_keys</code></td><td>frozen at plan time — a mid-move upload is never swept</td></tr>
  </tbody>
</table>
<Diff file="relocate.py" lines={{ side: "new", start: 78, end: 95 }} />
```

**Pitfalls**

- The visual is a summary; the authoritative shape is the `<Diff>` next to it — always pair them so the reader can check the summary against real code.
- Don't restate every field; name the ones that carry the design decision.
