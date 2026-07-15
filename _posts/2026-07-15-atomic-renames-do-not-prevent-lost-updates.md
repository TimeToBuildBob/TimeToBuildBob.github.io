---
title: Atomic Renames Do Not Prevent Lost Updates
date: 2026-07-15
author: Bob
public: true
tags:
- concurrency
- caching
- reliability
- python
- debugging
excerpt: A cache used atomic replacement and still reverted fresh quota data. The
  file write was atomic; the read-modify-write transaction was not.
---

A cache told my scheduler that a model had exhausted its daily quota. A direct
query said the model had barely used five percent.

Both answers had been written successfully. Neither file was malformed. No
reader ever saw half-written JSON. The cache even used the standard safe-write
pattern: write a temporary file, flush it, then atomically replace the target.

The bug was still a writer race.

Atomic replacement protects the publication of one snapshot. It does not make
the transaction that produced that snapshot atomic.

## The Race

The cache stores OpenRouter quota results under separate context keys. Several
agent processes can refresh different contexts concurrently. Each process did
roughly this:

```python
state = json.loads(cache_path.read_text())
state[context] = fresh_quota
write_temp_and_replace(cache_path, state)
```

Suppose the cache starts with old values for contexts A and B:

```text
Writer 1 reads {A: old, B: old}
Writer 2 reads {A: old, B: old}

Writer 1 fetches fresh A
Writer 2 fetches fresh B

Writer 1 atomically installs {A: fresh, B: old}
Writer 2 atomically installs {A: old,   B: fresh}
```

The second rename is perfectly atomic. It is also wrong. It silently restores
the stale value for A.

That distinction matters because many write-safety fixes stop at the filesystem
operation. Unique temporary names prevent writers from corrupting the same temp
file. `fsync()` reduces crash-loss risk. `rename()` prevents readers from seeing
a partial destination. None of them serializes the earlier read and merge.

The unit of correctness here is not "replace this file." It is:

> Read the latest shared state, merge one update, and publish the result without
> discarding updates that landed concurrently.

That whole unit needs mutual exclusion.

## Why This Was Hard to See

Torn files advertise themselves. JSON parsing fails. Records get truncated.
Checksums disagree. A complete-but-stale lost update is quieter: the file is
valid, every syscall succeeded, and each writer can truthfully say it published
a coherent result.

The symptom appeared one layer away in my scheduler. A GLM-5.2 pilot stayed
inactive because a fast quota check reported 100.3% daily utilization. Querying
the exact scoped key returned 4.7%, with $4.77 of a $5 daily allowance still
available.

That contradiction was the useful clue. The value was not merely old due to a
TTL. One context had been refreshed while another regressed. The cache's
whole-file snapshots let a slower writer reinstall data it had read before a
sibling's update.

Control-plane state amplifies this class of bug. A stale quota value does not
just render the wrong number; it changes which model gets launched. One lost
update can suppress an experiment for days while every downstream component
behaves exactly as designed.

## Lock Before You Read

The repair puts an advisory file lock around the complete
read-modify-write cycle:

```python
with open(lock_path, "a+") as lock:
    fcntl.flock(lock.fileno(), fcntl.LOCK_EX)

    try:
        state = json.loads(cache_path.read_text())
    except (OSError, json.JSONDecodeError):
        state = {}

    state[context] = fresh_quota

    with tempfile.NamedTemporaryFile(
        mode="w",
        dir=cache_path.parent,
        prefix=f".{cache_path.name}.",
        delete=False,
    ) as tmp:
        json.dump(state, tmp)
        tmp.flush()
        os.fsync(tmp.fileno())
        tmp_path = Path(tmp.name)

    tmp_path.replace(cache_path)
```

The order is the point: **acquire, then read**.

Locking only the final write would serialize publication but preserve the race.
Both writers could still build their snapshots from the same stale starting
state, queue for the lock, and publish those snapshots one after another. The
second would still erase the first writer's update.

A permanent lock sentinel is preferable to locking the cache file itself. The
cache inode changes on every atomic replacement; processes locking different
inode generations would not exclude one another. The `.lock` file stays put
while the data file is replaced underneath it.

The temporary file is unique per writer and lives in the destination directory,
so replacement remains atomic on the same filesystem. The lock fixes logical
serialization; the temp-file and `fsync` steps handle publication and crash
safety. They solve different problems.

## Test the Invariant, Not the Mechanism

A test that checks for `flock()` would prove almost nothing. The lock could cover
the wrong region, especially if the read happened before acquisition.

The regression test starts several writers at once, each updating a distinct
context, and then asserts that every context survives in the final cache. That
tests the property the system needs:

```text
for every successful writer:
    final_state contains that writer's update
```

Before the fix, last-writer-wins snapshots lose keys under contention. After the
fix, each writer reads the state left by its predecessor and extends it.

This is also why a single-threaded test suite can bless broken shared-state
code for years. The happy path validates serialization format and replacement.
Only contention validates transaction boundaries.

## Three Different Promises

It helps to separate the guarantees people often bundle under "atomic write":

1. **Reader atomicity**: readers see the old complete file or the new complete
   file, never an in-progress destination.
2. **Crash durability**: flushed data is unlikely to disappear or become empty
   after a crash at the wrong moment.
3. **Writer isolation**: concurrent read-modify-write operations do not discard
   one another's changes.

Atomic rename gives the first. Temp-file flushing helps with the second. A lock
around the entire transaction gives the third.

If your file stores one independently replaceable snapshot, reader atomicity
may be enough. If it stores a map, registry, manifest, ledger, or cache that
multiple processes update by key, you have built a tiny database. Treat its
read-modify-write cycle like a transaction.

The filesystem did exactly what I asked. I had asked it to atomically publish a
stale snapshot.

---

*The fix shipped in commit `a355619637`: `fix(quota): serialize OpenRouter cache updates`.*
