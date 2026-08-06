#!/usr/bin/env python3
"""Reply to a PR review thread and resolve it.

Posts the reply first, then resolves the thread only if the reply
succeeded. Exits non-zero on any failure so callers can detect and
surface errors; partial state (replied but not resolved) is valid —
the thread can be resolved manually from the UI.

Usage:
    reply_and_resolve.py [--no-resolve] <thread-id> <reply-body>

The reply body is the raw markdown string — shell-quote it as usual,
or pipe via ``"$(cat <<'EOF' ... EOF)"`` when embedded in a heredoc.

``--no-resolve`` posts the reply without resolving the thread.
"""

from __future__ import annotations

import json
import subprocess
import sys

REPLY_MUTATION = """
mutation($tid: ID!, $body: String!) {
  addPullRequestReviewThreadReply(input: {pullRequestReviewThreadId: $tid, body: $body}) {
    comment { id }
  }
}
"""

RESOLVE_MUTATION = """
mutation($tid: ID!) {
  resolveReviewThread(input: {threadId: $tid}) {
    thread { isResolved }
  }
}
"""


def _run_mutation(query: str, **vars: str) -> tuple[int, str]:
    """Return ``(0, "")`` on full success, else ``(1, <err message>)``.

    Checks both ``gh``'s process exit AND the GraphQL ``errors`` array in the
    response body. ``gh api graphql`` returns exit 0 when GitHub responds
    HTTP 200 even if the payload carries GraphQL-level errors (stale thread
    id, missing permission, bad input) — treating that as success would
    make ``babysit-pr`` report "resolved" on threads still open.
    """
    args = ["gh", "api", "graphql", "-f", f"query={query}"]
    for k, v in vars.items():
        args.extend(["-f", f"{k}={v}"])
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        return 1, r.stderr.strip()
    try:
        payload = json.loads(r.stdout)
    except json.JSONDecodeError as e:
        return 1, f"could not parse response: {e}"
    if isinstance(payload.get("errors"), list) and payload["errors"]:
        msgs = "; ".join(str(e.get("message", e)) for e in payload["errors"])
        return 1, f"graphql errors: {msgs}"
    return 0, ""


def main() -> int:
    argv = sys.argv[1:]
    no_resolve = False
    if argv and argv[0] == "--no-resolve":
        no_resolve = True
        argv = argv[1:]
    if len(argv) != 2:
        print(
            "usage: reply_and_resolve.py [--no-resolve] <thread-id> <reply-body>",
            file=sys.stderr,
        )
        return 2
    tid, body = argv[0], argv[1]

    rc, err = _run_mutation(REPLY_MUTATION, tid=tid, body=body)
    if rc != 0:
        print(f"reply failed for {tid}: {err}", file=sys.stderr)
        return 1
    print(f"replied: {tid}")

    if no_resolve:
        return 0

    rc, err = _run_mutation(RESOLVE_MUTATION, tid=tid)
    if rc != 0:
        print(
            f"resolve failed for {tid} (reply succeeded, resolve manually): {err}",
            file=sys.stderr,
        )
        return 1
    print(f"resolved: {tid}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
