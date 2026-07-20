# File overview — an annotated tree plus a role table

**Fits when:** the PR touches more than ~3 files, or the relationship between files carries meaning (core module + thin CLI wrappers + wiring).
**Skip when:** a one-file PR — a sentence does the job.

One section, early (right after the concepts), with up to three elements:

```tsx
<Section id="files" title="The files this PR touches, and how they relate">
  <FileTree>{`packages/core/warehouse/
  relocate.py — THE HEART: plan · execute · move
cli/
  commands/warehouse/
    move.py — NEW: thin "wh move" wrapper
  wh.py — registers the command`}</FileTree>
  <Graph source={`flowchart TD
  CLI["move.py — wh move"] --> MOVE["relocate.move()"]
  MOVE --> EXEC["execute()"] --> VERIFY["_verify"]`} />
  <table><thead><tr><th>File</th><th>Role in the change</th></tr></thead>
    <tbody><tr><td><code>relocate.py</code></td><td>the heart — all logic</td></tr></tbody>
  </table>
</Section>
```

`<FileTree>` takes plain indented text: 2 spaces per level, folders end with `/`, an optional ` — description` after a name, a blank line starts a new root group. The connector glyphs are drawn for you — never hand-write `├─`/`└─` art.

Point out the heart explicitly ("the one file that carries the design is …") — it primes the reader for where to spend attention.

**Pitfalls**

- The tree shows the PR's files, not the whole repo.
- Tree, call diagram, and role table answer different questions (where / who-calls-whom / why) — use the ones that add something, not all three by reflex.
