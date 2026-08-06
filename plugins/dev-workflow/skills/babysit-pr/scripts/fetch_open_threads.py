#!/usr/bin/env python3
"""Fetch unresolved review threads for a PR as structured JSON.

Output shape:

    [
      {
        "thread_id": "PRRT_...",
        "path": "packages/.../foo.py",
        "line": 123,
        "comments": [
          {"author": "chatgpt-codex-connector", "body": "...", "created_at": "..."},
          ...
        ]
      },
      ...
    ]

Only unresolved threads are returned. Resolved threads are noisy for triage
and tend to cause re-processing of already-handled findings.

Thread pagination is complete (loops on ``hasNextPage``). Comments per
thread are fetched in a single page of 100 — more than enough for any
realistic review exchange; if a thread overflows, we warn to stderr so a
silent truncation can't let step 5 of ``babysit-pr`` falsely declare "all
clear".

Usage:
    fetch_open_threads.py [--all] <pr-number>

``--all`` retains resolved threads and adds ``is_resolved`` to every item. It
is intended for the event waiter's fingerprint; normal triage remains
unresolved-only.
"""

from __future__ import annotations

import json
import subprocess
import sys

QUERY = """
query($owner: String!, $repo: String!, $pr: Int!, $after: String) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 100, after: $after) {
        pageInfo { endCursor hasNextPage }
        nodes {
          id
          isResolved
          path
          line
          comments(first: 100) {
            pageInfo { hasNextPage }
            nodes { author { login } body createdAt }
          }
        }
      }
    }
  }
}
"""


def _repo_slug() -> tuple[str, str]:
    out = subprocess.check_output(
        ["gh", "repo", "view", "--json", "owner,name"],
        text=True,
    )
    data = json.loads(out)
    return data["owner"]["login"], data["name"]


def _fetch_page(owner: str, repo: str, pr: int, after: str | None) -> dict:
    cmd = [
        "gh",
        "api",
        "graphql",
        "-f",
        f"query={QUERY}",
        "-F",
        f"owner={owner}",
        "-F",
        f"repo={repo}",
        "-F",
        f"pr={pr}",
    ]
    if after is not None:
        cmd += ["-f", f"after={after}"]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)["data"]["repository"]["pullRequest"]["reviewThreads"]


def main() -> int:
    argv = sys.argv[1:]
    include_resolved = bool(argv and argv[0] == "--all")
    if include_resolved:
        argv = argv[1:]
    if len(argv) != 1:
        print("usage: fetch_open_threads.py [--all] <pr-number>", file=sys.stderr)
        return 2
    pr = int(argv[0])
    owner, repo = _repo_slug()

    all_nodes: list[dict] = []
    after: str | None = None
    while True:
        page = _fetch_page(owner, repo, pr, after)
        all_nodes.extend(page["nodes"])
        if not page["pageInfo"]["hasNextPage"]:
            break
        after = page["pageInfo"]["endCursor"]

    open_threads = []
    for t in all_nodes:
        if t["isResolved"] and not include_resolved:
            continue
        if t["comments"]["pageInfo"]["hasNextPage"]:
            # Silent truncation here would let babysit-pr falsely declare the
            # PR clean. Surface loudly so the human/agent notices.
            print(
                f"warning: thread {t['id']} has >100 comments; only first page fetched",
                file=sys.stderr,
            )
        item = {
            "thread_id": t["id"],
            "path": t["path"],
            "line": t["line"],
            "comments": [
                {
                    "author": c["author"]["login"] if c["author"] else None,
                    "body": c["body"],
                    "created_at": c["createdAt"],
                }
                for c in t["comments"]["nodes"]
            ],
        }
        if include_resolved:
            item["is_resolved"] = t["isResolved"]
        open_threads.append(item)
    print(json.dumps(open_threads, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
