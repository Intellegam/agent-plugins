import { describe, expect, test } from "bun:test";

import {
  claudeReviewPrompt,
  githubReviewPayload,
  type ReviewComment,
} from "../src/review.ts";

const comments: ReviewComment[] = [
  {
    id: "one",
    anchor: {
      path: "src/auth.ts",
      side: "new",
      startLine: 42,
      startSide: "new",
      line: 47,
    },
    author: "user",
    body: "Validate the role before storing it.",
    createdAt: "2026-07-13T12:00:00.000Z",
  },
  {
    id: "two",
    anchor: { path: "src/legacy.ts", side: "old", line: 8 },
    author: "user",
    body: "Tighten this guard.",
    createdAt: "2026-07-13T12:01:00.000Z",
  },
];

describe("review exports", () => {
  test("Claude prompt lists every comment with its source range", () => {
    const prompt = claudeReviewPrompt(comments);
    expect(prompt).toContain("`src/auth.ts`, lines 42-47 (new)");
    expect(prompt).toContain("Validate the role");
    expect(prompt).toContain("`src/legacy.ts`, line 8 (old)");
    expect(prompt).toContain("Tighten this guard");
  });

  test("Claude prompt names the concrete PR when a target is given, else falls back", () => {
    const target = { owner: "acme", repo: "app", pullNumber: "12", commitId: "abc1234" };
    expect(claudeReviewPrompt(comments, target)).toContain("comments on `acme/app#12`:");
    expect(claudeReviewPrompt(comments)).toContain("comments on this pull request:");
  });

  test("GitHub payload uses current line/side fields for a multi-line review", () => {
    const payload = githubReviewPayload(comments, {
      owner: "acme",
      repo: "app",
      pullNumber: "12",
      commitId: "abc123",
    });
    expect(payload).toEqual({
      commit_id: "abc123",
      event: "COMMENT",
      body: "Review created from the code tour.",
      comments: [
        {
          path: "src/auth.ts",
          body: "Validate the role before storing it.",
          line: 47,
          side: "RIGHT",
          start_line: 42,
          start_side: "RIGHT",
        },
        {
          path: "src/legacy.ts",
          body: "Tighten this guard.",
          line: 8,
          side: "LEFT",
        },
      ],
    });
  });
});
