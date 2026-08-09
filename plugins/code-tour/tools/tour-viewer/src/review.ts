export type ReviewSide = "old" | "new";

export interface ReviewAnchor {
  path: string;
  side: ReviewSide;
  line: number;
  startLine?: number;
  startSide?: ReviewSide;
}

export interface ReviewComment {
  id: string;
  anchor: ReviewAnchor;
  body: string;
  author: "user";
  createdAt: string;
}

export interface GitHubReviewTarget {
  owner: string;
  repo: string;
  pullNumber: string;
  commitId: string;
}

export function agentReviewPrompt(comments: ReviewComment[], target?: GitHubReviewTarget): string {
  if (comments.length === 0) return "No review comments.";

  const pr =
    target?.owner && target?.repo && target?.pullNumber
      ? `\`${target.owner}/${target.repo}#${target.pullNumber}\``
      : "this pull request";
  const heading = `Code review comments on ${pr}:`;

  const findings = comments.map((comment, index) => {
    const { anchor } = comment;
    const range = anchor.startLine && anchor.startLine !== anchor.line
      ? `lines ${anchor.startLine}-${anchor.line}`
      : `line ${anchor.line}`;
    return `${index + 1}. \`${anchor.path}\`, ${range} (${anchor.side})\n   ${comment.body}`;
  });

  return [heading, "", ...findings].join("\n");
}

export function githubReviewPayload(
  comments: ReviewComment[],
  target: GitHubReviewTarget,
): Record<string, unknown> {
  return {
    commit_id: target.commitId,
    event: "COMMENT",
    body: "Review created from the code tour.",
    comments: comments.map(({ anchor, body }) => ({
      path: anchor.path,
      body,
      line: anchor.line,
      side: anchor.side === "old" ? "LEFT" : "RIGHT",
      ...(anchor.startLine && anchor.startLine !== anchor.line
        ? {
            start_line: anchor.startLine,
            start_side: (anchor.startSide ?? anchor.side) === "old" ? "LEFT" : "RIGHT",
          }
        : {}),
    })),
  };
}

export function githubReviewCommand(
  comments: ReviewComment[],
  target: GitHubReviewTarget,
): string {
  if (!target.owner || !target.repo || !target.pullNumber || !target.commitId) {
    return "Fill in the GitHub target fields to generate the command.";
  }
  if (
    !/^[A-Za-z0-9_.-]+$/.test(target.owner) ||
    !/^[A-Za-z0-9_.-]+$/.test(target.repo) ||
    !/^\d+$/.test(target.pullNumber) ||
    !/^[0-9a-fA-F]{7,64}$/.test(target.commitId)
  ) {
    return "Check the GitHub target fields (owner/repo, numeric PR, and commit SHA).";
  }
  // Fed to `gh api` through a quoted heredoc so the reader sees the exact JSON being posted —
  // nothing encoded. The quoted delimiter (`<<'GH_REVIEW_JSON'`) stops the shell from expanding
  // anything, and JSON.stringify escapes every string (a newline in a comment becomes `\n`), so
  // no payload line can equal the delimiter and break out.
  const payload = JSON.stringify(githubReviewPayload(comments, target), null, 2);
  const endpoint = `repos/${target.owner}/${target.repo}/pulls/${target.pullNumber}/reviews`;
  return [
    `gh api --method POST ${endpoint} --input - <<'GH_REVIEW_JSON'`,
    payload,
    "GH_REVIEW_JSON",
  ].join("\n");
}
