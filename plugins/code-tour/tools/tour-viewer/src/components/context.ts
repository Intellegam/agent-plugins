/**
 * `DiffContext` carries the parsed `pr.diff` (react-diff-view `FileData[]`) so `<Diff>`
 * blocks can resolve their references at render time. It is provided by {@link TourProvider},
 * which the render harness (build, browser entry, tests) wraps around the authored tour.
 */

import { createContext } from "react";
import type { FileData } from "react-diff-view";
import type { ReviewComment } from "../review.ts";

export const DiffContext = createContext<FileData[] | null>(null);

export interface ReviewContextValue {
  comments: ReviewComment[];
  addComment(comment: ReviewComment): void;
  removeComment(id: string): void;
}

export const ReviewContext = createContext<ReviewContextValue | null>(null);

export type DiffView = "unified" | "split";

/** The shared 1-/2-column preference: toggling it on any diff switches every diff. */
export interface DiffViewContextValue {
  view: DiffView;
  setView(view: DiffView): void;
}

export const DiffViewContext = createContext<DiffViewContextValue | null>(null);

/** Which diff references the reader has checked off as viewed (persisted per pr.diff). */
export interface ViewedContextValue {
  viewed: string[];
  toggle(refId: string): void;
}

export const ViewedContext = createContext<ViewedContextValue | null>(null);
