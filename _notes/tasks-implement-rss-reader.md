---
created: '2025-01-23T18:51:52'
state: done
completed_at: '2025-04-13T19:35:07+02:00'
tags:
- tools
- automation
- feed
public: true
title: Implement RSS Reader Tool
layout: task
---
## Overview
Create a simple RSS reader tool that can read RSS feeds in a compact format, with filtering capabilities.

## Implementation Details

### Completed Features
- ✅ Basic RSS feed parsing with feedparser
- ✅ Rich table output format
- ✅ URL validation
- ✅ Error handling for invalid feeds
- ✅ CLI interface with click
- ✅ URL pattern exclusion
- ✅ JSON output option
- ✅ Max entries limit option

### Usage Examples

```bash
# Basic usage - read feed
./tools/rss_reader.py https://example.com/feed.xml

# Exclude URLs containing certain patterns
./tools/rss_reader.py https://example.com/feed.xml -e ads -e sponsored

# Limit number of entries
./tools/rss_reader.py https://example.com/feed.xml --max-entries 10

# Output as JSON
./tools/rss_reader.py https://example.com/feed.xml --json
```

### Dependencies
- Python 3.10+
- feedparser: RSS feed parsing
- click: CLI interface
- rich: Terminal formatting

## Testing Results
- ✅ Basic feed reading works
- ✅ URL exclusion patterns work (tested with -e flag)
- ✅ JSON output format works (tested with --json)
- ✅ Max entries limit works (tested with --max-entries)
- [ ] Test with invalid URLs
- [ ] Test with malformed feeds
- [ ] Test with various RSS feed formats

### Example Output

```bash
# Basic table output (limited to 5 entries)
$ ./tools/rss_reader.py https://hnrss.org/newest --max-entries 5
┏━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Date       ┃ Title                          ┃ Link                           ┃
┡━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ 2025-01-23 │ Trivy: The all-in-one open     │ http://trivy.dev/v0.58/        │
│            │ source security scanner        │                                │
...

# JSON output with filtering
$ ./tools/rss_reader.py https://hnrss.org/newest --max-entries 3 -e japan --json
[
  {
    "title": "Trivy: The all-in-one open source security scanner",
    "link": "http://trivy.dev/v0.58/",
    "date": "Thu, 23 Jan 2025 17:39:45 +0000"
  },
  ...
]
```

## Future Improvements
Future improvements have been moved to [improve-rss-reader.md](./improve-rss-reader.md).

## Related
- [`rss_reader.py`](../tools/rss_reader.py)
- [Improve RSS Reader](./improve-rss-reader.md)
