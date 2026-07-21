#!/usr/bin/env python3
"""Wait for the next triage-worthy event on a PR, print it, exit.

One-shot by design: the babysit-pr loop re-fetches ALL PR state on every
wake-up, so this script only answers "did anything change since I was
armed?" — no event accumulation, no long-lived state. Arm it at the START
of each triage pass (before fetching threads/checks) so events landing
mid-pass fire immediately on the next arm.

    Monitor(command='python3 <skill-base>/scripts/await_pr_event.py 50',
            description='next event on PR #50')

Exits 0 printing exactly one line:

- ``review-activity`` — the PR's review set changed (new, dismissed, or
  replaced review; any author)
- ``reaction`` — the PR's reaction set changed (e.g. Codex reacts with a
  thumbs-up on the PR instead of posting a review when it finds nothing)
- ``new-head`` — a commit was pushed; CI and reviewers restart
- ``ci-failure`` — a check entered a failing bucket (fail or cancel)
- ``ci-concluded`` — no checks pending anymore (green or red); assess
- ``pr-closed`` — the PR was merged or closed; stop babysitting
- ``quiet`` — nothing happened for --quiet-after seconds (default 1800);
  the PR looks settled, assess for merge

Intermediate green completions while other checks still run do NOT fire —
only failures and the final all-concluded transition do, so a 10-check CI
run wakes the agent at most twice, not 10 times.

Requires: gh (authenticated). Transient gh failures log to stderr and
skip the tick. Usage: await_pr_event.py <pr-number> [--interval 30]
[--quiet-after 1800]
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time

_FAIL_BUCKETS = {"fail", "cancel"}


def _gh_json(args: list[str]) -> object | None:
    """Run a gh command, return parsed JSON or None on any failure.

    ``gh pr checks`` exits non-zero when checks are failing/pending — that
    is data, not an error — so we only fail on unparseable output.
    """
    r = subprocess.run(["gh", *args], capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        err = r.stderr.strip() or "no JSON output"
        print(f"gh {args[0]} failed: {err}", file=sys.stderr, flush=True)
        return None


def _snapshot(pr: str) -> dict | None:
    """Return the comparable state of the PR, or None on transient failure."""
    view = _gh_json(
        ["pr", "view", pr, "--json", "reviews,reactionGroups,headRefOid,state"]
    )
    checks = _gh_json(["pr", "checks", pr, "--json", "name,state,bucket"])
    if not isinstance(view, dict) or not isinstance(checks, list):
        return None
    return {
        "state": view.get("state"),
        # Full array, canonicalized — catches dismissed/replaced reviews
        # that a plain count comparison would miss.
        "reviews": json.dumps(view.get("reviews", []), sort_keys=True),
        "reactions": json.dumps(view.get("reactionGroups", []), sort_keys=True),
        "head": view.get("headRefOid"),
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
    if now["reactions"] != base["reactions"]:
        return "reaction"
    if set(now["failing"]) - set(base["failing"]):
        return "ci-failure"
    if now["concluded"] and not base["concluded"]:
        return "ci-concluded"
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

    deadline = time.time() + args.quiet_after
    while time.time() < deadline:
        time.sleep(args.interval)
        now = _snapshot(args.pr)
        if now is None:
            continue  # transient — skip this tick
        event = _event(base, now)
        if event:
            print(event, flush=True)
            return 0
        # Roll the baseline forward so CI transitions compare consecutive
        # snapshots: armed-before-checks-registered (concluded flips True→
        # False→True) and fail→rerun-pending→fail-again both fire; against
        # an immutable arm-time baseline neither would.
        base = now
    print("quiet", flush=True)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(0)
