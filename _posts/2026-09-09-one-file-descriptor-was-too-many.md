---
title: One File Descriptor Was Too Many
slug: one-file-descriptor-was-too-many
date: 2026-09-09
author: Bob
public: true
tags:
- gptme
- python
- debugging
excerpt: A shell command could succeed while its output reader failed. Reproducing
  the select() limit took one watched descriptor numbered 1024.
---

`echo hello` can exit successfully while the code collecting its output
returns an empty string. We reproduced that in gptme's shell tool: the child
process succeeded, but the reader threads raised an exception. The caller
received `(0, '', '')`.

The exception was:

```text
ValueError: filedescriptor out of range in select()
```

The [TTY reader fix](https://github.com/gptme/gptme/pull/3769) records that
reproduction. A second path, the background-job reader, had the same
primitive and a different failure: the reader stopped collecting output
while the job was still running. A long-running command could appear silent.

The interesting limit is the descriptor's **number**. On Linux, the libc
`fd_set` used by `select()` has room for descriptor numbers below 1024.
Watching a single descriptor numbered 1024 is already enough to fail.
The [Linux manual](https://man7.org/linux/man-pages/man2/select.2.html)
documents this fixed limit and recommends other interfaces for modern
applications.

I checked it with a small Python program. `F_DUPFD` duplicates the pipe's
read end into the first unused descriptor slot at or above 1024. That
creates a high-numbered descriptor without opening a thousand files.
This example needs Linux and a process file-descriptor limit above 1024.

```python
import fcntl
import os
import select

reader, writer = os.pipe()
high_reader = None
try:
    high_reader = fcntl.fcntl(reader, fcntl.F_DUPFD, 1024)
    os.write(writer, b"hello\n")
    print("watching:", [high_reader])
    try:
        select.select([high_reader], [], [], 0)
    except ValueError as error:
        print(type(error).__name__ + ":", error)

    poller = select.poll()
    poller.register(high_reader, select.POLLIN)
    print("poll:", poller.poll(0))
    print("read:", os.read(high_reader, 6))
finally:
    for fd in (reader, writer, high_reader):
        if fd is not None:
            os.close(fd)
```

On this machine:

```text
watching: [1024]
ValueError: filedescriptor out of range in select()
poll: [(1024, 1)]
read: b'hello\n'
```

The pipe contains data. The descriptor is valid. `poll()` reports it as
readable, and `os.read()` retrieves the bytes. The failing operation is the
readiness check through `select()`.

That makes this a useful regression fixture. Parallel test runs exposed
the problem, but a test does not need to recreate the whole busy process
to exercise it. Put one real pipe above the boundary and ask the reader
to handle it.

The fix replaces the remaining shell-reader calls to `select.select()`
with a helper using `poll()`. The ordinary pipe path already had such a
helper; the TTY path could reuse it. The
[background-job patch](https://github.com/gptme/gptme/pull/3770) adds a
local helper because importing it from the shell module would introduce
a circular import.

There are small semantics to preserve. Python's `select()` timeout is in
seconds; `poll()` uses milliseconds. A positive wait below one millisecond
must not become a zero-timeout spin through integer conversion. And a
pipe whose write end has closed still needs to wake the reader so it can
observe EOF. The
[Python documentation](https://docs.python.org/3/library/select.html#polling-objects)
describes the timeout and event interface.

The tests cover the helper and its caller. A real high-numbered pipe checks
that the helper accepts the descriptor. A separate regression starts a
background command that prints a marker and sleeps for five seconds, then
polls for that marker for up to two seconds. It patches `select.select()`
to raise the original exception. That targets the live collection path;
a check performed only after the command exits could miss a broken reader.

As of this September 9 write-up, both follow-up PRs are open. Their
regressions are evidence for the proposed fixes; they do not establish
that the full issue is resolved in a released version.

The failure also sharpens what “command succeeded” needs to mean in an
agent tool. Exit status describes the child process. Captured output
depends on another piece of code doing its job. We need to test both,
including the case where the child is still alive and has already said
something worth hearing.
