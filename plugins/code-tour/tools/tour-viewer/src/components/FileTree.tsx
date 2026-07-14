/**
 * `<FileTree>indented text</FileTree>` — a static file tree rendered from plain indented text:
 * 2 spaces per level, folders end with `/`, an optional ` — description` follows a name, and a
 * blank line starts a new root group. Purely presentational and forgiving: a line that doesn't
 * parse is shown as-is, nothing ever fails the build.
 */

import type { ReactNode } from "react";

export interface FileTreeProps {
  children: string;
}

/** Is there another entry at `depth` below `index`, before the tree pops above it? */
function hasMoreAtDepth(depths: number[], index: number, depth: number): boolean {
  for (let j = index + 1; j < depths.length; j += 1) {
    if (depths[j] < depth) return false;
    if (depths[j] === depth) return true;
  }
  return false;
}

function TreeGroup({ lines }: { lines: string[] }) {
  const depths = lines.map((line) => Math.floor((line.length - line.trimStart().length) / 2));
  return (
    <div className="tour-filetree-group">
      {lines.map((line, i) => {
        const depth = depths[i];
        // Classic tree glyphs, derived from structure: ancestor levels draw a guide when more
        // siblings follow below them; the node's own level draws the branch.
        let prefix = "";
        for (let level = 1; level <= depth; level += 1) {
          if (level < depth) prefix += hasMoreAtDepth(depths, i, level) ? "│  " : "   ";
          else prefix += hasMoreAtDepth(depths, i, depth) ? "├─ " : "└─ ";
        }
        const [name, ...rest] = line.trim().split(" — ");
        const description = rest.join(" — ");
        return (
          <div className="tour-filetree-row" key={i}>
            {prefix ? <span className="tour-filetree-prefix">{prefix}</span> : null}
            <span className={name.endsWith("/") ? "tour-filetree-dir" : undefined}>{name}</span>
            {description ? <span className="tour-filetree-desc"> — {description}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

export function FileTree({ children }: FileTreeProps) {
  if (typeof children !== "string") {
    return <div className="tour-filetree">{children as ReactNode}</div>;
  }
  const groups = children
    .split(/\n\s*\n/)
    .map((group) => group.split("\n").filter((line) => line.trim() !== ""))
    .filter((lines) => lines.length > 0);
  return (
    <div className="tour-filetree">
      {groups.map((lines, gi) => (
        <TreeGroup lines={lines} key={gi} />
      ))}
    </div>
  );
}
