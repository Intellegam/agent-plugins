import importlib.util
import json
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "chat_card.py"
SPEC = importlib.util.spec_from_file_location("chat_card", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
chat_card = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(chat_card)


class ChatCardPageTests(unittest.TestCase):
    def test_pr_text_cannot_close_the_data_script(self):
        title = "</script><img src=x onerror=alert(1)>"
        page = chat_card.render({"prs": [{"ref": "repo#1", "title": title}]})
        data = page.split('class="cc-data">', 1)[1].split("</script>", 1)[0]
        self.assertEqual(json.loads(data)["prs"][0]["title"], title)
        self.assertNotIn("<img", page)


if __name__ == "__main__":
    unittest.main()
