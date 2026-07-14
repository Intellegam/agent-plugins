# Bespoke visuals — custom React/SVG/CSS when a graph or table isn't enough

**Fits when:** the clearest explanation is a picture the built-ins don't give you — a before/after side-by-side card, a labelled SVG of a data layout, a legend, a numbered call-out over a shape, a small "click to reveal" widget.
**Skip when:** a `<Graph>`, `<FileTree>`, or a plain `<table>` already says it — don't hand-roll what the components give you for free.

`tour.tsx` is real JSX, so you define components and inline SVG/CSS right in the file:

```tsx
import type { ReactNode } from "react"; // a tour.tsx imports only from tour-viewer by default

function Phase({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "baseline", margin: "8px 0" }}>
      <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, opacity: 0.5 }}>{n}</span>
      <div><strong>{title}</strong> — {children}</div>
    </div>
  );
}

<Phase n={1} title="render">once, server-side — collect every broken reference</Phase>
<Phase n={2} title="gate">any broken ref → print them, exit 1, no HTML written</Phase>
<Phase n={3} title="bundle">vite inlines everything into one offline tour.html</Phase>
```

**The envelope** — the build renders `tour.tsx` once server-side, then hydrates it into one offline single-file HTML. So:

- **No live DOM at render time.** Touch `window`/`document`/measurements only inside `useEffect` (the way `<Graph>` renders Mermaid), never in the component body — an SSR render has no DOM.
- **No external libraries or network.** Only React and what `tour-viewer` bundles ends up in the file. Inline SVG and inline styles; no CDN scripts, no remote image URLs.
- **Static is free; stateful is fine when SSR-safe.** A toggle or stepper works as long as its first (server) render produces sensible markup and the interactivity lives in effects/handlers.

**Pitfalls**

- A visual is a summary — pair it with the `<Diff>` it describes so the reader can check it against real code.
- Keep it in service of the red thread; a clever widget that doesn't advance the thesis is noise.
- If a custom component throws during render, `bun run build` fails hard — keep them simple and SSR-safe.
- Don't over-type: inline `style={{…}}` needs no annotation. If you *do* type props, import the type from `react` (`import type { ReactNode, CSSProperties } from "react"`) — a bare `React.CSSProperties` won't resolve, since a tour only imports from `tour-viewer`.
