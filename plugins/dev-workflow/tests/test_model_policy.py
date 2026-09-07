import json
import re
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DEV_WORKFLOW = ROOT / "plugins" / "dev-workflow"


class SubAgentModelPolicyTests(unittest.TestCase):
    def test_policy_is_canonical_and_injected(self):
        policy_path = DEV_WORKFLOW / "references" / "sub-agent-model-policy.md"
        policy = policy_path.read_text()
        for required in (
            "For instance:",
            "Astra main agent -> Sol sub-agents",
            "Fable main agent -> Opus sub-agents",
            "Review sub-agents must never use Astra or Fable",
            "do not inherit or silently substitute",
            "External MCP sessions are not sub-agent launches",
        ):
            self.assertIn(required, policy)

        hook_path = DEV_WORKFLOW / "hooks" / "inject-workflow.sh"
        injected = subprocess.run(
            [str(hook_path)], input="", text=True, capture_output=True, check=True
        ).stdout
        self.assertIn(policy, injected)

        hooks = json.loads((DEV_WORKFLOW / "hooks" / "hooks.json").read_text())
        self.assertIn("SessionStart", hooks["hooks"])
        self.assertIn("SubagentStart", hooks["hooks"])

        for relative in (
            "skills/dev-review/SKILL.md",
            "skills/dev-sync/SKILL.md",
            "skills/promote/SKILL.md",
            "skills/setup/SKILL.md",
        ):
            with self.subTest(path=relative):
                skill_path = DEV_WORKFLOW / relative
                content = skill_path.read_text()
                reference = "../../references/sub-agent-model-policy.md"
                self.assertIn(reference, content)
                self.assertEqual((skill_path.parent / reference).resolve(), policy_path)

        for path in DEV_WORKFLOW.rglob("*.md"):
            if path == policy_path or "tests" in path.parts:
                continue
            with self.subTest(canonicality=path.relative_to(DEV_WORKFLOW)):
                self.assertNotIn("Astra main agent -> Sol sub-agents", path.read_text())
                self.assertNotIn("Fable main agent -> Opus sub-agents", path.read_text())

    def test_packaged_claude_reviewers_use_an_explicit_permitted_model(self):
        reviewer_paths = sorted((DEV_WORKFLOW / "agents").glob("*reviewer.md"))
        self.assertTrue(reviewer_paths)

        for path in reviewer_paths:
            with self.subTest(path=path.name):
                match = re.search(r"^model:\s*(\S+)\s*$", path.read_text(), re.M)
                self.assertIsNotNone(match)
                self.assertNotIn(match.group(1).lower(), {"astra", "fable"})


if __name__ == "__main__":
    unittest.main()
