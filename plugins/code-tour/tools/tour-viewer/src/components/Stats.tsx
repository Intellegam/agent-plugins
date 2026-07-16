/**
 * `+added −removed` change counter, GitHub-style (green adds, red deletes). Renders nothing
 * when a scope has no changed lines, so empty diffs/sections stay quiet rather than showing "0".
 */

import type { ChangeCount } from "../diff.ts";

export function ChangeBadge({ added, removed, className }: ChangeCount & { className?: string }) {
  if (added === 0 && removed === 0) return null;
  return (
    <span className={className ? `tour-changes ${className}` : "tour-changes"} aria-label={`${added} added, ${removed} removed`}>
      {added > 0 ? <span className="tour-changes-add">+{added}</span> : null}
      {removed > 0 ? <span className="tour-changes-del">-{removed}</span> : null}
    </span>
  );
}
