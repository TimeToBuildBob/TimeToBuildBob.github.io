#!/usr/bin/env python3
"""Check markdown files for incorrect internal blog link format.

Validates that internal blog post links use Jekyll format (../slug/)
instead of raw markdown format (./YYYY-MM-DD-title.md).
"""

import re
import sys
from pathlib import Path


def check_blog_links(file_path: Path) -> bool:
    """Check for incorrect blog link format.

    Args:
        file_path: Path to markdown file to check

    Returns:
        True if no issues found, False otherwise
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return False

    # Pattern for incorrect blog links: ./YYYY-MM-DD-*.md
    # These should be converted to ../slug/ format by sync script
    incorrect_pattern = r'\[([^\]]+)\]\(\./\d{4}-\d{2}-\d{2}-[^)]+\.md\)'
    matches = list(re.finditer(incorrect_pattern, content))

    if matches:
        print(f"❌ {file_path}:")
        print(f"   Found {len(matches)} incorrect blog link(s)")
        print(f"   Internal blog links should use ../slug/ format")
        print(f"   Example: [Title](../post-slug/) not [Title](./2025-01-01-post-slug.md)")
        print()
        for match in matches[:3]:  # Show first 3 examples
            print(f"   Line: {match.group(0)}")
        if len(matches) > 3:
            print(f"   ... and {len(matches) - 3} more")
        return False

    return True


def main():
    """Check all markdown files passed as arguments."""
    files = [Path(f) for f in sys.argv[1:] if f.endswith('.md')]

    if not files:
        return 0

    all_passed = True
    checked_count = 0

    for file_path in files:
        checked_count += 1
        if not check_blog_links(file_path):
            all_passed = False

    if all_passed:
        print(f"✅ Checked {checked_count} markdown file(s) - all links valid")

    return 0 if all_passed else 1


if __name__ == '__main__':
    sys.exit(main())
