#!/usr/bin/env python3
"""Wait for the next triage-worthy event on a PR, print it, exit.

One-shot by design: the babysit-pr loop re-fetches ALL PR state on every
wake-up, so this script only answers "did anything change since I was
armed?" — no event accumulation, no long-lived state. Arm it at the START
of each triage pass (before fetching threads/checks) so events landing
mid-pass fire immediately on the next arm.

    Run this script as a retained one-shot process through the host's long-running
    task or terminal tool, from the repository root.

Prints ``armed`` after its baseline is complete, then exits 0 after printing
exactly one terminal event:

- ``review-activity`` — the PR's review set changed (new, dismissed, or
  replaced review; any author)
- ``review-thread-activity`` — an inline thread reply or resolution changed
- ``conversation-activity`` — the top-level PR comments changed
- ``reaction`` — the PR's reaction set changed (e.g. Codex reacts with a
  thumbs-up on the PR instead of posting a review when it finds nothing)
- ``new-head`` — a commit was pushed; CI and reviewers restart
- ``ci-failure`` — a check entered a failing bucket (fail or cancel)
- ``ci-concluded`` — no checks pending anymore (green or red); assess
- ``merge-state`` — mergeability, merge state, or review decision changed
- ``pr-closed`` — the PR was merged or closed; stop babysitting
- ``quiet`` — nothing happened for --quiet-after seconds (default 1800);
  the PR looks settled, assess for merge

Intermediate successful completions while sibling checks remain pending do not
fire. New failures, pending-to-concluded transitions, and newly appeared
already-concluded check sets do.

Requires: gh (authenticated). Transient snapshot failures log and skip a tick;
four consecutive failures exit nonzero. Usage: await_pr_event.py <pr-number>
[--interval 30] [--quiet-after 1800]
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import subprocess
import sys
import time

_FAIL_BUCKETS = {"fail", "cancel"}
_MAX_CONSECUTIVE_SNAPSHOT_FAILURES = 4


def _gh_json(args: list[str], *, empty_on_no_checks: bool = False) -> object | None:
    """Run a gh command, return parsed JSON or None on any failure.

    ``gh pr checks`` exits non-zero when checks are failing/pending — that
    is data, not an error — so we only fail on unparseable output.
    """
    r = subprocess.run(["gh", *args], capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        err = r.stderr.strip() or "no JSON output"
        if empty_on_no_checks and "no checks reported on the '" in err:
            return []
        print(f"gh {args[0]} failed: {err}", file=sys.stderr, flush=True)
        return None


def _open_threads_json(pr: str) -> object | None:
    """Return all paginated review threads from the sibling helper."""
    script = Path(__file__).with_name("fetch_open_threads.py")
    r = subprocess.run(
        [sys.executable, str(script), "--all", pr],
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        err = r.stderr.strip() or "no JSON output"
        print(f"review thread fetch failed: {err}", file=sys.stderr, flush=True)
        return None
    if r.stderr.strip():
        print(
            f"review thread fetch incomplete: {r.stderr.strip()}",
            file=sys.stderr,
            flush=True,
        )
        return None
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        print("review thread fetch returned invalid JSON", file=sys.stderr, flush=True)
        return None


def _snapshot(pr: str) -> dict | None:
    """Return the comparable state of the PR, or None on transient failure."""
    view = _gh_json(
        [
            "pr",
            "view",
            pr,
            "--json",
            (
                "reviews,comments,reactionGroups,headRefOid,state,mergeable,"
                "mergeStateStatus,reviewDecision"
            ),
        ]
    )
    checks = _gh_json(
        ["pr", "checks", pr, "--json", "name,state,bucket"],
        empty_on_no_checks=True,
    )
    threads = _open_threads_json(pr)
    if (
        not isinstance(view, dict)
        or not isinstance(checks, list)
        or not isinstance(threads, list)
    ):
        return None
    return {
        "state": view.get("state"),
        # Full array, canonicalized — catches dismissed/replaced reviews
        # that a plain count comparison would miss.
        "reviews": json.dumps(view.get("reviews", []), sort_keys=True),
        "review_threads": json.dumps(threads, sort_keys=True),
        "comments": json.dumps(view.get("comments", []), sort_keys=True),
        "reactions": json.dumps(view.get("reactionGroups", []), sort_keys=True),
        "head": view.get("headRefOid"),
        "mergeable": view.get("mergeable"),
        "merge_state": view.get("mergeStateStatus"),
        "review_decision": view.get("reviewDecision"),
        "checks": sorted(c["name"] for c in checks),
        "failing": sorted(
            c["name"] for c in checks if c.get("bucket") in _FAIL_BUCKETS
        ),
        "concluded": all(c.get("bucket") != "pending" for c in checks),
    }


def _event(base: dict, now: dict) -> str | None:
    if now["state"] != "OPEN":
        return "pr-closed"
    if now["head"] != base["head"]:
        return "new-head"
    if now["reviews"] != base["reviews"]:
        return "review-activity"
    if now["review_threads"] != base["review_threads"]:
        return "review-thread-activity"
    if now["comments"] != base["comments"]:
        return "conversation-activity"
    if now["reactions"] != base["reactions"]:
        return "reaction"
    if set(now["failing"]) - set(base["failing"]):
        return "ci-failure"
    if now["concluded"] and (
        not base["concluded"] or now["checks"] != base["checks"]
    ):
        return "ci-concluded"
    merge_keys = ("mergeable", "merge_state", "review_decision")
    if any(now[key] != base[key] for key in merge_keys):
        return "merge-state"
    return None


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("pr")
    p.add_argument("--interval", type=int, default=30)
    p.add_argument("--quiet-after", type=int, default=1800)
    args = p.parse_args()

    base = None
    for attempt in range(4):
        base = _snapshot(args.pr)
        if base is not None:
            break
        time.sleep(min(30, 2 ** (attempt + 1)))
    if base is None:
        print("could not snapshot PR state after retries", file=sys.stderr)
        return 1

    print("armed", flush=True)
    deadline = time.time() + args.quiet_after
    consecutive_failures = 0
    observed_after_arm = False
    while time.time() < deadline:
        time.sleep(args.interval)
        now = _snapshot(args.pr)
        if now is None:
            consecutive_failures += 1
            if consecutive_failures >= _MAX_CONSECUTIVE_SNAPSHOT_FAILURES:
                print(
                    "lost PR visibility after repeated snapshot failures",
                    file=sys.stderr,
                )
                return 1
            continue
        consecutive_failures = 0
        observed_after_arm = True
        event = _event(base, now)
        if event:
            print(event, flush=True)
            return 0
        # Roll the baseline forward so CI transitions compare consecutive
        # snapshots: armed-before-checks-registered (concluded flips True→
        # False→True) and fail→rerun-pending→fail-again both fire; against
        # an immutable arm-time baseline neither would.
        base = now
    if not observed_after_arm:
        print("could not observe PR state after arming", file=sys.stderr)
        return 1
    print("quiet", flush=True)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(0)
