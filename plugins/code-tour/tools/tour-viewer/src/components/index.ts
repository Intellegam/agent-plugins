/**
 * Public component API for a `tour.tsx` (the code-tour contract). `TourProvider` and the
 * failure sink are used by the render harness (build/tests), not the tour author.
 */

export { Tour, TourProvider, type TourProps, type TourProviderProps } from "./Tour.tsx";
export { Section, type SectionProps } from "./Section.tsx";
export { Diff, type DiffProps } from "./Diff.tsx";
export { Annotation, type AnnotationProps } from "./Annotation.tsx";
export { Graph, type GraphProps } from "./Graph.tsx";
export { FileTree, type FileTreeProps } from "./FileTree.tsx";
export { DiffContext } from "./context.ts";
export { consumeValidation, recordCoverage, recordFailure, resetFailures } from "../failures.ts";
export type { Side, LineRange } from "../diff.ts";
