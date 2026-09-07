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
        self.assertTrue(policy.strip())

        hook_path = DEV_WORKFLOW / "hooks" / "inject-workflow.sh"
        injected = subprocess.run(
            [str(hook_path)], input="", text=True, capture_output=True, check=True
        ).stdout
        self.assertIn(policy, injected)

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

    def test_packaged_claude_reviewers_use_an_explicit_permitted_model(self):
        reviewer_paths = sorted((DEV_WORKFLOW / "agents").glob("*reviewer.md"))
        self.assertTrue(reviewer_paths)

        for path in reviewer_paths:
            with self.subTest(path=path.name):
                frontmatter = path.read_text().split("---", 2)[1]
                match = re.search(r"^model:\s*(.+?)\s*$", frontmatter, re.M)
                self.assertIsNotNone(match)
                model = match.group(1).strip("'\"").lower()
                self.assertNotEqual(model, "inherit")
                self.assertFalse(any(name in model for name in ("astra", "fable")))


if __name__ == "__main__":
    unittest.main()
