#!/usr/bin/env python3
"""Write the PR review page from chat card JSON (spec: references/pr-card.md)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

TEMPLATE = Path(__file__).resolve().parents[1] / "references" / "chat-card.html"
PLACEHOLDER = '{"checkedAt":"","prs":[]}'

# Host colour names the template reads; GitHub's palette for a standalone page.
PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
:root{{--text-primary:#1f2328;--text-secondary:#59636e;--text-muted:#818b98;--text-success:#1a7f37;--text-warning:#9a6700;--text-danger:#cf222e;--text-accent:#0969da;--surface-1:#f6f8fa;--border:#d1d9e0;--page:#ffffff;color-scheme:light}}
{dark_media}
:root[data-theme="dark"]{{{dark}}}
body{{margin:0;background:var(--page)}}
main{{max-width:920px;margin:0 auto;padding:24px 16px}}
</style>
</head>
<body>
<main>
{card}
</main>
</body>
</html>
"""
DARK = "--text-primary:#f0f6fc;--text-secondary:#9198a1;--text-muted:#6e7681;--text-success:#3fb950;--text-warning:#d29922;--text-danger:#f85149;--text-accent:#4493f8;--surface-1:#151b23;--border:#3d444d;--page:#0d1117;color-scheme:dark"


def fail(message: str) -> None:
    print(f"chat_card: {message}", file=sys.stderr)
    raise SystemExit(2)


def check(data: object) -> list[dict[str, object]]:
    if not isinstance(data, dict):
        fail("the data must be a JSON object")
    prs = data.get("prs")
    if not isinstance(prs, list) or not prs:
        fail("`prs` must be a non-empty list")
    for index, pr in enumerate(prs):
        if not isinstance(pr, dict):
            fail(f"prs[{index}] must be an object")
        for key in ("ref", "title"):
            if not isinstance(pr.get(key), str) or not pr[key]:
                fail(f"prs[{index}].{key} must be a non-empty string")
    return prs


def render(data: object) -> str:
    prs = check(data)
    template = TEMPLATE.read_text()
    if template.count(PLACEHOLDER) != 1:
        fail(f"{TEMPLATE.name} lost its data placeholder")
    # `<` escaped so no value can close the data script and start markup.
    payload = json.dumps(data, ensure_ascii=False).replace("<", "\\u003c")
    title = f"PR review {prs[0]['ref']}" if len(prs) == 1 else "PR reviews"
    title = title.replace("&", "&amp;").replace("<", "&lt;")
    return PAGE.format(
        title=title,
        dark_media=(
            '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){'
            + DARK
            + "}}"
        ),
        dark=DARK,
        card=template.replace(PLACEHOLDER, payload).strip(),
    )


def main(argv: list[str]) -> None:
    if len(argv) != 3:
        fail("usage: chat_card.py <data.json|-> <page.html>")
    source = sys.stdin.read() if argv[1] == "-" else Path(argv[1]).read_text()
    try:
        data = json.loads(source)
    except json.JSONDecodeError as err:
        fail(f"the data is not valid JSON: {err}")
    Path(argv[2]).write_text(render(data))
    print(argv[2])


if __name__ == "__main__":
    main(sys.argv)
