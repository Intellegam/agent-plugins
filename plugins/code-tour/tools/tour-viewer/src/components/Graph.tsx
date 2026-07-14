/**
 * `<Graph source="…mermaid…"/>` — a Mermaid diagram, rendered client-side. Mermaid is
 * bundled (dynamic import, inlined by the single-file build) rather than loaded from a CDN,
 * so the page renders offline. The dynamic import only fires inside a browser `useEffect`,
 * which keeps the build's server-side render free of any DOM dependency.
 */

import { useEffect, useState } from "react";

export interface GraphProps {
  source: string;
}

export function Graph({ source }: GraphProps) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "neutral",
          // Explicit useMaxWidth (the mermaid default, pinned): the svg gets an inline
          // `max-width: <natural>px` so the CSS `width: 100%` scales wide diagrams down to the
          // column and never upscales narrow ones.
          flowchart: { useMaxWidth: true },
          sequence: { useMaxWidth: true },
          state: { useMaxWidth: true },
          class: { useMaxWidth: true },
          er: { useMaxWidth: true },
        });
        const id = "tour-mermaid-" + Math.random().toString(36).slice(2);
        const { svg: rendered } = await mermaid.render(id, source);
        if (!cancelled) setSvg(rendered);
      } catch (err) {
        if (!cancelled) setSvg(null);
        // Leave the source visible as a fallback if rendering fails.
        // eslint-disable-next-line no-console
        console.error("mermaid render failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (svg) {
    return <div className="tour-graph" dangerouslySetInnerHTML={{ __html: svg }} />;
  }
  return (
    <div className="tour-graph tour-graph-pending">
      <pre className="tour-graph-source">{source}</pre>
    </div>
  );
}
