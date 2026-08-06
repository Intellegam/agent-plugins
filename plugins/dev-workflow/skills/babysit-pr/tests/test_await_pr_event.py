from __future__ import annotations

import importlib.util
import io
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).parents[1] / "scripts" / "await_pr_event.py"
SPEC = importlib.util.spec_from_file_location("await_pr_event", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
await_pr_event = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(await_pr_event)


def state(**changes: object) -> dict[str, object]:
    value: dict[str, object] = {
        "state": "OPEN",
        "reviews": "[]",
        "review_threads": "[]",
        "comments": "[]",
        "reactions": "[]",
        "head": "abc",
        "mergeable": "MERGEABLE",
        "merge_state": "CLEAN",
        "review_decision": "APPROVED",
        "checks": [],
        "failing": [],
        "concluded": False,
    }
    value.update(changes)
    return value


class EventTests(unittest.TestCase):
    def test_events_are_detected(self) -> None:
        cases = {
            "pr-closed": {"state": "MERGED"},
            "new-head": {"head": "def"},
            "review-activity": {"reviews": '[{"id": 1}]'},
            "review-thread-activity": {"review_threads": '[{"id": 1}]'},
            "conversation-activity": {"comments": '[{"id": 1}]'},
            "reaction": {"reactions": '[{"content": "THUMBS_UP"}]'},
            "ci-failure": {"failing": ["test"]},
            "ci-concluded": {"concluded": True},
            "merge-state": {"merge_state": "BLOCKED"},
        }
        for expected, change in cases.items():
            with self.subTest(expected=expected):
                self.assertEqual(expected, await_pr_event._event(state(), state(**change)))

    def test_unchanged_state_has_no_event(self) -> None:
        self.assertIsNone(await_pr_event._event(state(), state()))

    def test_each_merge_field_can_wake_the_waiter(self) -> None:
        changes = (
            {"mergeable": "CONFLICTING"},
            {"merge_state": "BLOCKED"},
            {"review_decision": "CHANGES_REQUESTED"},
        )
        for change in changes:
            with self.subTest(change=change):
                self.assertEqual(
                    "merge-state",
                    await_pr_event._event(state(), state(**change)),
                )

    def test_existing_failure_does_not_repeat(self) -> None:
        self.assertIsNone(
            await_pr_event._event(
                state(failing=["test"]),
                state(failing=["test"]),
            )
        )

    def test_fast_check_registration_and_completion_wakes_waiter(self) -> None:
        self.assertEqual(
            "ci-concluded",
            await_pr_event._event(
                state(concluded=True, checks=[]),
                state(concluded=True, checks=["test"]),
            ),
        )


class SnapshotTests(unittest.TestCase):
    def test_snapshot_includes_feedback_and_merge_state(self) -> None:
        view = {
            "state": "OPEN",
            "reviews": [{"id": 2}],
            "comments": [{"id": 3}],
            "reactionGroups": [{"content": "THUMBS_UP"}],
            "headRefOid": "sha",
            "mergeable": "MERGEABLE",
            "mergeStateStatus": "CLEAN",
            "reviewDecision": "APPROVED",
        }
        checks = [
            {"name": "lint", "state": "SUCCESS", "bucket": "pass"},
            {"name": "test", "state": "IN_PROGRESS", "bucket": "pending"},
        ]
        threads = [{"thread_id": "PRRT_1", "comments": [{"body": "reply"}]}]
        with (
            patch.object(await_pr_event, "_gh_json", side_effect=[view, checks]),
            patch.object(await_pr_event, "_open_threads_json", return_value=threads),
        ):
            snapshot = await_pr_event._snapshot("12")

        assert snapshot is not None
        self.assertEqual('[{"id": 3}]', snapshot["comments"])
        self.assertIn("PRRT_1", snapshot["review_threads"])
        self.assertEqual("MERGEABLE", snapshot["mergeable"])
        self.assertEqual("CLEAN", snapshot["merge_state"])
        self.assertEqual("APPROVED", snapshot["review_decision"])
        self.assertEqual(["lint", "test"], snapshot["checks"])
        self.assertFalse(snapshot["concluded"])

    def test_no_configured_checks_is_an_empty_check_set(self) -> None:
        result = SimpleNamespace(
            stdout="",
            stderr="no checks reported on the 'feature' branch\n",
        )
        with patch.object(await_pr_event.subprocess, "run", return_value=result):
            checks = await_pr_event._gh_json(
                ["pr", "checks", "12", "--json", "name,state,bucket"],
                empty_on_no_checks=True,
            )
        self.assertEqual([], checks)

    def test_truncated_thread_fetch_fails_closed(self) -> None:
        result = SimpleNamespace(
            returncode=0,
            stdout='[{"thread_id": "PRRT_1"}]',
            stderr="warning: thread PRRT_1 has >100 comments\n",
        )
        with (
            patch.object(
                await_pr_event.subprocess,
                "run",
                return_value=result,
            ) as run,
            patch("sys.stderr", io.StringIO()),
        ):
            self.assertIsNone(await_pr_event._open_threads_json("12"))
        self.assertEqual("--all", run.call_args.args[0][2])


class MainTests(unittest.TestCase):
    def test_ready_marker_precedes_terminal_event(self) -> None:
        output = io.StringIO()
        with (
            patch.object(
                await_pr_event,
                "_snapshot",
                side_effect=[state(), state(state="MERGED")],
            ),
            patch.object(await_pr_event.time, "sleep"),
            patch.object(await_pr_event.time, "time", side_effect=[0, 1]),
            patch.object(
                await_pr_event.sys,
                "argv",
                ["await_pr_event.py", "12", "--interval", "0"],
            ),
            patch("sys.stdout", output),
        ):
            self.assertEqual(0, await_pr_event.main())
        self.assertEqual("armed\npr-closed\n", output.getvalue())

    def test_repeated_snapshot_failures_exit_nonzero(self) -> None:
        output = io.StringIO()
        error = io.StringIO()
        with (
            patch.object(
                await_pr_event,
                "_snapshot",
                side_effect=[state(), None, None, None, None],
            ),
            patch.object(await_pr_event.time, "sleep"),
            patch.object(
                await_pr_event.time,
                "time",
                side_effect=[0, 1, 2, 3, 4],
            ),
            patch.object(
                await_pr_event.sys,
                "argv",
                ["await_pr_event.py", "12", "--interval", "0"],
            ),
            patch("sys.stdout", output),
            patch("sys.stderr", error),
        ):
            self.assertEqual(1, await_pr_event.main())
        self.assertEqual("armed\n", output.getvalue())
        self.assertIn("lost PR visibility", error.getvalue())


if __name__ == "__main__":
    unittest.main()
