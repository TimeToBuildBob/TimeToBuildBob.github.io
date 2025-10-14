#!/usr/bin/env python3
"""Check for invalid CSS class syntax in Pug templates.

Pug's dot notation shorthand doesn't work with Tailwind's opacity/modifier syntax (e.g., bg-primary/5).
This hook catches these cases before they cause rendering issues.
"""

import re
import sys
from pathlib import Path


def check_pug_file(file_path: Path) -> list[str]:
    """Check a Pug file for invalid class syntax.
    
    Returns list of error messages, empty if no errors.
    """
    errors = []
    
    # Pattern to match Pug shorthand with slashes: .classname/number
    # This doesn't work in Pug and should use class="classname/number" instead
    pattern = r'^\s*\.[a-zA-Z][a-zA-Z0-9-]*\/\d+\s*(?:\(|$)'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            if re.search(pattern, line):
                # Extract the problematic class
                match = re.search(r'\.([a-zA-Z][a-zA-Z0-9-]*\/\d+)', line)
                if match:
                    bad_class = match.group(1)
                    errors.append(
                        f"{file_path}:{line_num}: Invalid Pug class syntax '.{bad_class}'\n"
                        f"  Pug doesn't support slashes in dot notation.\n"
                        f"  Use: div(class=\"{bad_class}\") or .other-class(class=\"{bad_class}\")\n"
                        f"  Line: {line.rstrip()}"
                    )
    
    return errors


def main():
    """Check all Pug files for invalid syntax."""
    pug_files = list(Path('.').rglob('*.pug'))
    
    if not pug_files:
        return 0
    
    all_errors = []
    for pug_file in pug_files:
        errors = check_pug_file(pug_file)
        all_errors.extend(errors)
    
    if all_errors:
        print("❌ Invalid Pug class syntax found:\n")
        for error in all_errors:
            print(error)
            print()
        print(f"Found {len(all_errors)} error(s) in {len(pug_files)} Pug file(s)")
        return 1
    
    print(f"✅ All {len(pug_files)} Pug files have valid class syntax")
    return 0


if __name__ == '__main__':
    sys.exit(main())
