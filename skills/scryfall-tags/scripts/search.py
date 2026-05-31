"""Query the Scryfall functional tag index.

Reads ../tag-index.json (relative to this script) and supports:

  search.py <substring>          # substring match on tag names
  search.py --theme T            # all tags with theme T
  search.py --category C         # all tags in category C
  search.py --word W             # tags containing word W as a hyphen-token
  search.py --theme T -c C       # intersection (theme AND category)
  search.py --not-word X         # exclude tags containing word X
  search.py --list-themes        # list all available themes
  search.py --list-categories    # list all available categories
  search.py --json               # output as JSON instead of text
  search.py --count              # only print count
  search.py --verbose            # show each tag with its categories+themes

Filters compose: a tag must match every filter (AND).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
INDEX = HERE.parent / "tag-index.json"


def load_index() -> dict:
    if not INDEX.exists():
        sys.exit(
            f"error: {INDEX.name} not found. Run scripts/build.py to generate it."
        )
    return json.loads(INDEX.read_text())


def filter_tags(index: dict, args: argparse.Namespace) -> list[str]:
    tags = index["tags"]
    result = sorted(tags.keys())

    if args.substring:
        s = args.substring
        result = [t for t in result if s in t]
    if args.theme:
        for theme in args.theme:
            if theme not in index["themes"]:
                sys.exit(f"error: unknown theme '{theme}'. Use --list-themes to see options.")
            result = [t for t in result if theme in tags[t]["themes"]]
    if args.category:
        for cat in args.category:
            if cat not in index["categories"]:
                sys.exit(f"error: unknown category '{cat}'. Use --list-categories to see options.")
            result = [t for t in result if cat in tags[t]["categories"]]
    if args.word:
        for w in args.word:
            result = [t for t in result if w in tags[t]["words"]]
    if args.not_word:
        for w in args.not_word:
            result = [t for t in result if w not in tags[t]["words"]]

    return result


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(
        description="Query the Scryfall functional tag index.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument("substring", nargs="?", help="Substring to match anywhere in tag name")
    p.add_argument("--theme", action="append", default=[],
                   help="Filter to tags carrying this theme (can repeat for AND)")
    p.add_argument("-c", "--category", action="append", default=[],
                   help="Filter to tags in this category (can repeat for AND)")
    p.add_argument("--word", action="append", default=[],
                   help="Filter to tags containing this whole word (can repeat)")
    p.add_argument("--not-word", action="append", default=[],
                   help="Exclude tags containing this whole word (can repeat)")
    p.add_argument("--list-themes", action="store_true",
                   help="List all available themes and exit")
    p.add_argument("--list-categories", action="store_true",
                   help="List all available categories and exit")
    p.add_argument("--json", action="store_true", help="Output as JSON")
    p.add_argument("--count", action="store_true", help="Print only the count")
    p.add_argument("--verbose", "-v", action="store_true",
                   help="Show each tag with its categories and themes")
    args = p.parse_args(argv)

    index = load_index()

    if args.list_themes:
        for slug, info in sorted(index["themes"].items()):
            print(f"  {slug:25s}  {info['title']}")
        return 0

    if args.list_categories:
        for slug, info in sorted(index["categories"].items()):
            print(f"  {slug:28s}  {info['title']}")
        return 0

    matches = filter_tags(index, args)

    if args.json:
        if args.verbose:
            print(json.dumps({t: index["tags"][t] for t in matches}, indent=2))
        else:
            print(json.dumps(matches, indent=2))
        return 0

    if args.count:
        print(len(matches))
        return 0

    for t in matches:
        if args.verbose:
            meta = index["tags"][t]
            cats = ",".join(meta["categories"]) or "-"
            themes = ",".join(meta["themes"]) or "-"
            print(f"{t}\t[cats: {cats}] [themes: {themes}]")
        else:
            print(t)

    if not args.count and not args.json:
        print(f"\n{len(matches)} match{'es' if len(matches) != 1 else ''}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
