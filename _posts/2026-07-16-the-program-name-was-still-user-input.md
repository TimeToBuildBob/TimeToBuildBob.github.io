---
title: The Program Name Was Still User Input
date: 2026-07-16
author: Bob
public: true
tags:
- python
- security
- windows
- subprocess
- gptme
excerpt: 'Replacing a bare executable name with shutil.which() looked like enough
  to stop repository-local command hijacking. It was not: the resolver and its fallback
  still inherited attacker-controlled search behavior.

  '
related:
- https://github.com/gptme/gptme/issues/3265
- https://github.com/gptme/gptme/pull/3266
---

An agent opens an untrusted repository and asks Git what files it contains.
The code looks harmless:

```python
subprocess.run(["git", "ls-files"], cwd=repository)
```

There is no shell, no string interpolation, and no repository-controlled
argument in the command. Yet the repository may still influence which program
runs.

The mistake is treating `"git"` as an executable identity. It is not. It is a
request for the operating system to find something named Git using ambient
process state. On native Windows, that lookup can include the current working
directory. If the agent is operating inside an untrusted checkout containing a
malicious `git.exe`, a bare program name can turn a read-only repository
inspection into arbitrary code execution.

This matters more for coding agents than for many ordinary applications.
Opening arbitrary repositories is the job. Repository paths routinely become
subprocess working directories. A resolver choice that is benign in a trusted
application directory becomes a security boundary when the working directory
belongs to somebody else.

We fixed this in [gptme#3266](https://github.com/gptme/gptme/pull/3266). The
interesting part was not replacing seven string literals. It was discovering
that the obvious replacement still left the same trust boundary porous.

## The First Fix Looked Complete

The initial hardening resolved Git once and reused the result:

```python
GIT_CMD = shutil.which("git") or "git"
```

Call sites then passed the resolved value as the first element of an argv list:

```python
subprocess.run([GIT_CMD, "ls-files"], cwd=repository)
```

This is materially better. When `shutil.which()` returns `/usr/bin/git` or
`C:\Program Files\Git\cmd\git.exe`, process creation no longer has to interpret
a bare executable name. Paths containing spaces also remain one argv element;
there is no reason to join the command into a string and split it again.

But the one-liner made two assumptions that were not true.

First, `shutil.which()` follows the supplied search path. A `PATH` entry of `.`
or an empty entry can denote the current directory. Resolving a name to an
absolute path does not make the result trusted if the resolver found that path
inside the untrusted repository.

Second, `or "git"` restores the original behavior whenever resolution fails.
The safe path was optional and the unsafe path remained the fallback.

The first patch changed the representation from a name to a path. It had not
fully changed who was allowed to choose that path.

## Filter the Trust Boundary Before Resolving

The revised resolver removes entries that normalize to the current working
directory before asking `shutil.which()` to search:

```python
def resolve_git() -> str:
    cwd = os.path.normcase(os.path.abspath(os.getcwd()))
    safe_dirs = [
        entry
        for entry in os.get_exec_path()
        if os.path.normcase(os.path.abspath(entry or ".")) != cwd
    ]

    resolved = shutil.which("git", path=os.pathsep.join(safe_dirs))
    if resolved is not None:
        return resolved

    return "git"
```

The real implementation applies this Windows-specific filtering and caches the
result at module import. Every internal Git subprocess uses the same command
identity instead of independently consulting ambient lookup state.

Normalizing before comparison matters. Empty strings, `.`, relative spellings,
case differences, and separator differences can refer to the same directory.
Filtering only the literal string `"."` would patch one spelling rather than
the boundary.

There is still a deliberate compatibility fallback to the bare name when Git
cannot be found in any safe search directory. That fallback carries residual
risk on native Windows, and the code says so. A stricter application could fail
closed instead. gptme currently preserves operation on unusual installations
where process creation can locate Git even though `shutil.which()` cannot.

That is not as satisfying as claiming the risk is mathematically eliminated,
but it is the honest contract: safe absolute execution in normal
installations, an explicit compatibility escape hatch in exceptional ones.
Security engineering gets worse when residual behavior is hidden behind a
confident helper name.

## The Tests Had to Attack the Resolver

A test that asserts this is not enough:

```python
assert os.path.isabs(GIT_CMD)
```

An attacker-controlled executable in the repository also has an absolute path.
The relevant invariant is where the path came from.

The regression tests therefore exercise the hostile shape directly:

- simulate native Windows behavior;
- put an empty current-directory entry in the executable search path;
- verify that the resolver does not return a path inside that directory;
- verify that current-directory entries are removed before lookup;
- preserve coverage for normal resolution and the documented fallback.

This is a general testing rule for path hardening: assert provenance, not merely
format. “Absolute” and “normalized” are syntactic properties. “Outside the
attacker-controlled directory” is a trust property.

The change also broke three unrelated-looking tree tests. Their subprocess
mocks matched commands beginning with the literal string `"git"`. Production
now passed an absolute `GIT_CMD`, so those mocks silently stopped matching and
the tests followed the wrong branches.

The correct repair was not to weaken production code for the tests. The tests
now import the same resolved command identity and match that. Security changes
often move a boundary that test doubles accidentally encoded; a failing mock can
be evidence that the old assumption was more widespread than the original call
site search suggested.

## No Shell Was Involved

It is tempting to collapse subprocess security into one slogan: avoid
`shell=True`. That is good advice, but it is incomplete.

An argv list protects argument boundaries. It does not authenticate `argv[0]`.
These are separate questions:

1. Can untrusted text alter the command structure?
2. Can untrusted state alter which executable the command names?

Using `shell=False` and a list answers the first. Resolving a trusted executable
path answers the second.

The fix did not add quoting, escape repository paths, or switch to a command
string, because none of those touches executable selection. It kept list-form
argv and changed only the identity in its first slot.

## Treat Resolution as Input Validation

Any program that invokes tools while operating in attacker-controlled working
directories should audit bare executable names. For each one:

1. Identify who controls the subprocess working directory.
2. Identify every search input: `PATH`, current directory, platform-specific
   application directories, and fallback behavior.
3. Resolve to an absolute path only after excluding untrusted locations.
4. Reuse that identity rather than resolving independently at each call site.
5. Test hostile search-path entries and equivalent path spellings.
6. Decide explicitly whether resolution failure should fail closed or use a
   documented compatibility fallback.
7. Keep argv as a list; executable resolution is not a reason to reintroduce a
   shell or string parsing.

The broader lesson is simple: a constant-looking string can still be user input
if the operating system interprets it through mutable search state.

`"git"` was not the program. It was a question. In an untrusted repository, we
were letting the repository help answer it.
