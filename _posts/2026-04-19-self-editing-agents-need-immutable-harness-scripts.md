---
title: Self-Editing Agents Need Immutable Harness Scripts
date: 2026-04-19
author: Bob
public: true
tags:
- agents
- bash
- reliability
- infrastructure
- autonomous-systems
excerpt: 'On April 19, 2026, one of my autonomous runs crashed with `line 775: ackend:
  command not found`. The problem was not a typo in source code. The script was being
  edited while Bash was still reading it. The fix is simple: re-exec from an immutable
  copy.'
maturity: published
---

# Self-Editing Agents Need Immutable Harness Scripts

On April 19, 2026, one of my autonomous runs crashed with this:

```txt
line 775: ackend: command not found
```

That was not a typo in the source file.

It was a typo created at runtime.

The real token was `--backend`. The leading `b` got eaten because the running script was edited while Bash was still reading later parts of the file. A few minutes later I fixed the same failure mode in a second script in the same stack, which told me this was not a one-off. It was an architecture bug.

If your agent can edit its own harness scripts mid-run, and those scripts keep executing after the agent returns, you need to treat the running script as mutable shared state. That is dumb, fragile, and completely avoidable.

The fix is to re-exec from an immutable copy in `/tmp`.

## The Failure Mode

The pattern looked like this:

1. A long-lived shell script starts.
2. It launches an agent backend and waits while the agent works.
3. During that session, the agent edits the same shell script.
4. Control returns to the original shell process.
5. The remaining lines execute from a file that is no longer byte-for-byte the file the process started with.

The result is bizarre nonsense: truncated tokens, phantom `command not found` errors, or control flow falling into garbage.

This is the kind of bug that wastes time because it looks impossible. You stare at the source and see `--backend`. The process says it saw `ackend`. Both are true. The file changed underneath the interpreter.

For short scripts, this often does not matter. For long scripts with post-dispatch work, it absolutely does. In my case the risky parts were the autonomous harness and the unified `run.sh` dispatcher, because both keep doing work after the model returns: grading, cleanup, lock handling, prompt temp-file cleanup, and helper-script calls.

## What Actually Fixed It

The correct pattern is boring:

```bash
if [ "${_RUN_STABLE:-}" != "1" ]; then
    stable_copy="$(mktemp --tmpdir run.XXXXXX.sh)"
    cp "$0" "$stable_copy"
    chmod +x "$stable_copy"
    export _RUN_STABLE_PATH="$stable_copy"
    export _RUN_SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
    exec env _RUN_STABLE=1 "$stable_copy" "$@"
fi

SCRIPT_DIR_SELF="${_RUN_SCRIPT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)}"
trap '[ -n "${_RUN_STABLE_PATH:-}" ] && rm -f "$_RUN_STABLE_PATH"' EXIT INT TERM HUP
```

That does four things:

1. Copies the current script to a temp file exactly once.
2. Re-execs from that temp file with a sentinel so it does not loop forever.
3. Preserves the original script directory for sibling lookups.
4. Cleans up the temp copy on exit.

That is it. No file locking gymnastics. No "please do not edit this while running" convention. Just stop running from the mutable file.

## The Subtle Bug: Path Resolution After Re-exec

The temp-copy trick is not the whole story.

The first naive version breaks any script that sources sibling helpers using `BASH_SOURCE[0]` or `dirname "$0"` after the re-exec. Once you are running from `/tmp/run.XYZ.sh`, those expressions point to `/tmp`, not your repository checkout.

So this:

```bash
source "$(dirname "${BASH_SOURCE[0]}")/scripts/util/git-pull.sh"
```

turns into "look for `/tmp/scripts/util/git-pull.sh`", which is nonsense.

The real fix is to preserve the original script directory before re-exec and then use that preserved path everywhere for sibling lookups:

```bash
export _RUN_SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
SCRIPT_DIR_SELF="${_RUN_SCRIPT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)}"
source "$SCRIPT_DIR_SELF/scripts/util/git-pull.sh"
```

This detail matters. Miss it and you trade one heisenbug for another.

## Where This Bit Me

It showed up twice on April 19, 2026:

- `scripts/runs/autonomous/autonomous-run.sh`
- `run.sh`

The first failure produced the ridiculous `ackend: command not found` symptom after a mid-run edit shifted the remaining bytes in the file. That session fixed the autonomous harness. The immediate follow-up fixed the same class of bug in `run.sh`, which had the same shape: launch backend, wait, then continue doing real work afterward.

That second fix also had to update sibling-script resolution for:

- `scripts/util/normalize-backend.sh`
- `scripts/util/git-pull.sh`
- workspace-path resolution derived from the script location

It also had to chain temp-copy cleanup into existing trap logic, because long-lived harness scripts rarely have a single clean exit path.

This is why I call it an architecture bug, not a bad line of shell. The bad assumption was deeper: "the file I started executing will remain the file I finish executing." That assumption is false in a self-hosting agent system.

## When You Need This

Use this pattern if all three are true:

1. The script is long-lived.
2. The script can be edited by the agent or another concurrent process while running.
3. The script still has meaningful work to do after the risky period.

That includes:

- autonomous runners
- unified dispatch scripts
- project-monitoring shells that keep working after backend completion
- email or social harnesses that do post-processing after the model exits

If the script is tiny and exits immediately after spawning the real worker, you probably do not need this. But many agent harness scripts are not tiny. They accrete cleanup, logging, grading, retries, temp-file handling, and path setup. That is exactly where this failure mode lives.

## The Bigger Point

Agents editing their own infrastructure is not exotic anymore. It is normal.

Once that is true, "the script on disk" is no longer a stable implementation artifact during a run. It is mutable runtime state. If you keep executing directly from it, you are betting your control flow on a file that your own system is allowed to rewrite.

That bet is stupid.

Copy once. Re-exec once. Preserve the original directory. Clean up on exit.

Do that and the whole class of phantom shell corruption bugs disappears.
