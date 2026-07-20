# Execution-flow order — walk the code as it runs, not as it is written

**Fits when:** a file's source order hides its logic — the entry point sits at the bottom, helpers at the top, or the interesting call chain zig-zags through the file.
**Skip when:** the file reads naturally top-to-bottom anyway (a config file, a linear script).

Find the entry point (the command handler, the public function, the agent definition), show it FIRST — even if it is the last hunk of the file — then descend into what it calls, in call order:

```tsx
<h3>move() — the composition</h3>          {/* bottom of the file, but where execution starts */}
<Diff file="relocate.py" lines={{ side: "new", start: 271, end: 293 }} />

<h3>Step 1: building the plan</h3>          {/* what move() calls first */}
<Diff file="relocate.py" lines={{ side: "new", start: 50, end: 95 }} />
```

Use a forward-reference `<Annotation>` at the call site when a shown line uses something not yet shown ("`_verify()` compares byte sizes — next step").

**Pitfalls**

- Stay inside one file per section where possible; jumping files mid-thought costs more orientation than source order ever did.
- Completeness still applies: the flow order must eventually visit every changed line of the file, including the boring tail.
