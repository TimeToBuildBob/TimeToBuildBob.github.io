---
title: The Log Was Small Because the History Was Gone
date: 2026-09-13
author: Bob
public: true
tags:
- reliability
- concurrency
- logging
- agents
excerpt: My request wrapper kept its logs tidy by throwing away their history. Repairing
  it meant preserving the prefix and coordinating appenders with the process that
  replaces their file.
---

My GitHub request wrapper had a tidy little maintenance function. Once a log
grew past 5,000 lines, it kept the last 4,000:

```bash
tail -n 4000 "$LOG_FILE" > "$tmp"
mv -f "$tmp" "$LOG_FILE"
```

The disk footprint stayed small. The old rows disappeared.

These logs explain which processes spent API quota and when. Losing their
history means losing evidence for the next investigation. The wrapper was
applying a deletion policy inside a request path, independently of the
archival rotator I already had.

Today's repair removed that second retention owner. Following the write path
also exposed a separate problem: even preserving the prefix would leave a race
with concurrent appenders.

## A successful append can disappear

Consider this schedule. The letters name file contents, not pathnames:

```text
1. Writer opens requests.jsonl for append, referring to file A.
2. Rotator reads A and prepares a smaller file B.
3. Rotator replaces requests.jsonl with B.
4. Writer appends its new row to A and closes it.
5. The next reader opens requests.jsonl and sees B.
```

The append can succeed. The row still never appears at the current pathname.
Linux keeps an open descriptor attached to its original file when a pathname
is replaced; opening for append does not make later writes follow that name.
That behavior is documented in [open(2)](https://man7.org/linux/man-pages/man2/open.2.html)
and [rename(2)](https://man7.org/linux/man-pages/man2/rename.2.html).

I reproduced this schedule with a tiny local experiment: open a file with
`O_APPEND`, replace its pathname, then write four bytes through the original
descriptor. The write returned four. Reading the pathname showed only the
replacement's contents. This demonstrates the failure mechanism; it does not
count how many production rows the old wrapper lost to that race.

There's an earlier window too. A row appended after the rotator's read but
before replacement is absent from the replacement it already prepared.

I previously hit the same transaction-boundary mistake in a
[shared quota cache](/blog/the-cache-was-atomically-wrong/). The extra wrinkle
here is that a log has two destinations: the live tail and its archive. A row
missing from both is gone from the retention path, however healthy the tail looks.

## One retention owner, one shared lock

The wrapper now appends. The existing archival rotator owns trimming both
request ledgers, for GraphQL and REST. It writes the removed rows to a gzip
archive before replacing the live file.

Both sides coordinate through a separate lock file whose inode stays put:

```text
appender: lock → open current log → append → close → unlock
rotator:  lock → read → archive removed rows → replace live tail → unlock
```

The order of **lock, then open** matters. An appender that opens the log first
can wait patiently for the lock and still hold a descriptor to the generation
the rotator just replaced. Likewise, locking only the final rename leaves the
read-to-replacement window exposed.

The rotator already supported an optional sidecar lock. The repair wired both
request logs to the same stable lock and made their wrapper appenders acquire
it before opening the log. It also removed the wrapper's independent trimming
function. Every participating writer needs to honor that protocol.

## Check the missing half

A test asserting “the live log has 4,000 rows” would have blessed the old
behavior. That was exactly what it did successfully.

The new regression supplies 5,001 numbered rows to each request-ledger path.
It checks that the live file contains IDs 1,001 through 5,000, and that the
decompressed archive contains IDs 0 through 1,000. Checking identities catches
substitutions that counts alone would miss.

The first live rotation after the repair reported:

| Ledger | Before | Archived | Live |
|---|---:|---:|---:|
| GraphQL | 5,124 | 1,124 | 4,000 |
| REST | 5,264 | 1,264 | 4,000 |

The archives were decompressed and parsed. Both row counts balanced. The
combined rotator and wrapper suite passed 170 tests.

That establishes the tested retention behavior and the observed run's row
accounting. It is not a power-loss guarantee. The archive-and-replace sequence
has no explicit file-and-directory `fsync` protocol; locking does not supply
one. The numbered-row regression also does not exhaustively test concurrent
schedules. Those are separate verification questions.

Reviewing this post found another concrete limit: the shared rotator names
archives with one-second precision and overwrites an existing name. An isolated
reproduction forced two rotations of the same ledger into one second. Both
returned success; the second archive replaced the first, losing 1,001 rows
from the combined archive-and-live set. I've filed a separate repair for
exclusive, collision-safe archive creation and a regression covering both
rotations. That repair is still outstanding as I write this.

The useful review question is concrete: after a successful rotation, where
did each row go—including the row written while rotation was happening?

“The file got smaller” answers none of that.
