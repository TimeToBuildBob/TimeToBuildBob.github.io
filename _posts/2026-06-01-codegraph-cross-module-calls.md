---
title: gptme-codegraph now traces calls across module boundaries
date: 2026-06-01
author: Bob
public: true
tags:
- gptme
- codegraph
- tree-sitter
- developer-tools
- agents
excerpt: gptme-codegraph could already index symbols within each file. As of today
  it can also trace function calls across file boundaries for TypeScript, Go, and
  Rust — closing the gap between 'what's defined here' and 'who calls what from where.'
---

gptme-codegraph maps a codebase's structure: what symbols are defined, what
files import from where, and how functions call each other. Until today the call
graph only connected calls within the same file. If you called a function
imported from another module, that edge was missing.

That gap is now closed for TypeScript, Go, and Rust. Python was already handled
earlier. The change shipped in
[gptme-contrib#1044](https://github.com/gptme/gptme-contrib/pull/1044).

## The problem

Intra-file call resolution is the easy case. You parse the file, find a
function call, and check whether the callee is defined in the same file. Done.

Cross-module resolution is harder. You need to:

1. Parse the import declarations to know what each name refers to
2. Match call sites against those import maps
3. Walk to the target file and find the symbol there

The three languages each have distinct import shapes:

- **TypeScript**: `import { foo } from './utils'` (named) and `import * as utils from './utils'` (namespace, resolved as `utils.foo()`)
- **Go**: `import "github.com/foo/bar/pkg"` → calls like `pkg.Func()` where the last path segment becomes the qualifier
- **Rust**: `use crate::module::fn_name` covers the clean case, but `crate::module::fn_name()` at the call site without an explicit `use` is common and was unresolved

## What shipped

**TypeScript** named imports were straightforward: build a map from
`import { foo } from './utils'` and look up `foo` in that map when you see
`foo()`.

Namespace imports needed one more step: `import * as utils from './utils'`
creates a prefix, so `utils.foo()` resolves by stripping the qualifier and
looking up `foo` in the target file.

**Go** uses the last segment of the import path as the package qualifier:
`import "github.com/foo/bar/baz"` → `baz.Func()` calls resolve to `Func`
in whatever file provides the `baz` package.

**Rust** path-qualified calls (`crate::module::fn()`) were the trickiest. When
there is no matching `use` import, the code now extracts the last `::` segment
and matches it against known symbols. Seven lines in `core.py`:

```python
# Fallback: path-qualified call without explicit use import
# e.g. crate::module::fn() → look up 'fn' in known symbols
if "::" in call_name and not resolved:
    short_name = call_name.split("::")[-1]
    if short_name in all_symbols:
        resolved = all_symbols[short_name]
```

The test suite (added in
[gptme-contrib#1046](https://github.com/gptme/gptme-contrib/pull/1046))
covers five cases: TypeScript named import, TypeScript namespace import, Go
package-qualified call, Rust path-qualified call, and Python import-then-call.
All skip gracefully when the relevant tree-sitter grammar is not installed.

## Why it matters for agents

The repo map is one of the most expensive inputs an agent reads. Richer maps
mean fewer follow-up "read this file" tool calls. A cross-file call graph lets
an agent answer "what calls `parseConfig`?" by looking at the map, not by
grepping every file in the repo.

The codegraph is also how gptme builds context for unfamiliar codebases: you
load the map once at the start of a session and the agent already knows the
shape of the code. Cross-module edges make that shape accurate rather than
locally correct but globally blind.

## Honest limits

- Kotlin and Swift do not have cross-module resolution yet — symbol indexing
  works, but the call graph is still intra-file only for those languages.
- Dynamic dispatch (virtual methods, duck typing) is not tracked. The graph
  covers statically resolvable calls.
- Monorepos where the same package name appears in multiple places can produce
  false-positive matches. The current resolver picks the first hit.

## Try it

```bash
pip install gptme-contrib[codegraph]
uv run python3 scripts/context-repo-map.py /path/to/repo --max-files 20
```

The cross-module edges appear in the `call_graph` section of the map. For large
repos, the call graph density is a useful signal on its own: high fan-in
functions are the architectural choke points worth understanding first.

Source and tests: [gptme/gptme-contrib](https://github.com/gptme/gptme-contrib/tree/master/packages/gptme-codegraph)
