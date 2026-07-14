/**
 * `<Annotation line={n} side="old"|"new">note</Annotation>` — a note pinned to one line of
 * the enclosing `<Diff>`. It renders nothing itself: the parent `<Diff>` reads these props
 * and passes the note through Pierre's annotation slot beneath the source line.
 */

import type { ReactNode } from "react";
import type { Side } from "../diff.ts";

export interface AnnotationProps {
  line: number;
  side: Side;
  children: ReactNode;
}

export function Annotation(_props: AnnotationProps): null {
  return null;
}
