from __future__ import annotations

import importlib.util
import io
import json
from pathlib import Path
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).parents[1] / "scripts" / "fetch_open_threads.py"
SPEC = importlib.util.spec_from_file_location("fetch_open_threads", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
fetch_open_threads = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(fetch_open_threads)


def page() -> dict:
    def thread(thread_id: str, resolved: bool, body: str) -> dict:
        return {
            "id": thread_id,
            "isResolved": resolved,
            "path": "example.py",
            "line": 10,
            "comments": {
                "pageInfo": {"hasNextPage": False},
                "nodes": [
                    {
                        "author": {"login": "reviewer"},
                        "body": body,
                        "createdAt": "2026-08-05T00:00:00Z",
                    }
                ],
            },
        }

    return {
        "nodes": [
            thread("PRRT_open", False, "open reply"),
            thread("PRRT_resolved", True, "resolved follow-up"),
        ],
        "pageInfo": {"hasNextPage": False, "endCursor": None},
    }


class FetchTests(unittest.TestCase):
    def run_main(self, *args: str) -> list[dict]:
        output = io.StringIO()
        with (
            patch.object(fetch_open_threads, "_repo_slug", return_value=("o", "r")),
            patch.object(fetch_open_threads, "_fetch_page", return_value=page()),
            patch.object(fetch_open_threads.sys, "argv", ["script", *args]),
            patch("sys.stdout", output),
        ):
            self.assertEqual(0, fetch_open_threads.main())
        return json.loads(output.getvalue())

    def test_default_output_filters_resolved_threads(self) -> None:
        result = self.run_main("12")
        self.assertEqual(["PRRT_open"], [item["thread_id"] for item in result])
        self.assertNotIn("is_resolved", result[0])

    def test_all_output_fingerprints_resolved_threads_and_replies(self) -> None:
        result = self.run_main("--all", "12")
        self.assertEqual(
            ["PRRT_open", "PRRT_resolved"],
            [item["thread_id"] for item in result],
        )
        self.assertEqual([False, True], [item["is_resolved"] for item in result])
        self.assertEqual("resolved follow-up", result[1]["comments"][0]["body"])


if __name__ == "__main__":
    unittest.main()
