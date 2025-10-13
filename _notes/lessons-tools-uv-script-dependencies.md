---
public: true
created: 2024-12-20 13:58:12+01:00
title: 'Lesson: UV Script Dependencies for Single-File Tools'
layout: project
---
## Context
When creating single-file Python tools/scripts that have external dependencies, especially when:
- The script needs to be easily shareable
- Dependencies need to be explicitly declared
- You want reproducible execution environments
- The script is part of a larger project but has its own dependencies

## Problem
Scripts with external dependencies often fail when shared because dependencies aren't explicitly declared, leading to:
- ModuleNotFoundError when dependencies aren't installed
- Version conflicts when constraints aren't specified
- Failures when project-level dependencies aren't available
- Time wasted on manual environment setup

## Constraint
Always use uv's inline script metadata to declare dependencies for standalone scripts. The metadata must:
1. List all external dependencies with version constraints
2. Specify required Python version if needed
3. Use `exclude-newer` for reproducibility when appropriate
  - If we cannot find a version for some newer package, we must adjust the `exclude-newer` date to a later date or remove it
  - Must be a full date-time string in RFC 3339 format
4. Be managed using `uv add --script` rather than manual editing

## Explanation
uv's inline script metadata provides a standardized way to declare dependencies that lives with the script itself. This ensures:
- Dependencies are automatically installed in an isolated environment
- Version constraints are respected
- Python version requirements are enforced
- The script works reliably outside project contexts

## Examples

### Incorrect Approach
```python
# script.py - Will fail if dependencies aren't installed
import requests
from rich.progress import track
import pandas as pd

def process_data(url):
    resp = requests.get(url)
    data = resp.json()
    df = pd.DataFrame(data)
    for row in track(df.itertuples()):
        # ... processing ...
```

### Correct Approach
```python
#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = [
#   "requests<3",
#   "rich>=13.0.0",
#   "pandas>=2.0.0",
#   "gptme @ git+https://github.com/ErikBjare/gptme.git",
# ]
# [tool.uv]
# exclude-newer = "2025-01-01T00:00:00Z"
# ///
"""
Tool for processing data.

Usage:
  ./tool.py
"""

import requests
from rich.progress import track
import pandas as pd

def process_data(url):
    resp = requests.get(url)
    data = resp.json()
    df = pd.DataFrame(data)
    for row in track(df.itertuples()):
        # ... processing with gptme ...
```

The script can be made executable and run directly:

```sh
chmod +x tool.py
./tool.py
```

The shebang line `#!/usr/bin/env -S uv run` combined with the script metadata allows uv to automatically manage dependencies. This is especially useful for:
- Command-line tools and utilities
- Long-running scripts and daemons
- Scripts that need to be executable from other programs

## Origin
- Date: 2024-12-20
- Source: uv documentation and experience with script distribution
- Fixed by: Using uv's inline script metadata system

## Notes
- Always specify version constraints for reliability
- Keep dependencies minimal and self-contained
- Consider using `exclude-newer` for reproducible builds
- Test with the specified Python version
