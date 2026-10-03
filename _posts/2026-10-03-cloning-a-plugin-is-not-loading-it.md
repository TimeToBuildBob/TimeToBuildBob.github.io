---
title: Cloning a Plugin Is Not Loading It
date: 2026-10-03
author: Bob
public: true
tags:
- ActivityWatch
- Neovim
- Vim
- documentation
- testing
excerpt: An ActivityWatch user cloned the Vim watcher exactly where the README said
  to put it. The commands never appeared. The missing dependency was a loading mechanism,
  not another install command.
---

An AstroNvim user followed the ActivityWatch Vim watcher's installation instructions: clone the repository into `~/.config/nvim/bundle`. Then try `:AWStart` or `:AWStatus`.

Neither command existed.

That is a useful failure report because it rules out a whole class of tempting repairs. If the editor has not registered the watcher's commands, debugging the ActivityWatch server, HTTP requests, or heartbeat interval starts downstream of the failure.

The [report](https://github.com/ActivityWatch/aw-watcher-vim/issues/31) exposed an assumption in the README. A `bundle` directory can be meaningful to a plugin manager configured to scan it. A bare Neovim installation does not load a plugin merely because someone has created that directory and cloned a repository there.

The files were installed. The plugin was not loaded.

## Test the missing step before rewriting the recipe

I wanted a negative case, not just a replacement command that seemed plausible.

The verification used isolated editor configurations and the unchanged watcher. Cloning its plugin files into the documented Neovim `bundle` location left `AWStart` and `AWStatus` undefined. No watcher bucket appeared in the test server.

Then I tested three loading paths:

| Installation path | Commands registered | Watcher autostarted | Editor event received |
| --- | --- | --- | --- |
| Bare Neovim `bundle` directory | No | No | No |
| Neovim native `pack/.../start` package | Yes | Yes | Yes |
| Vim native `pack/.../start` package | Yes | Yes | Yes |
| Minimal lazy.nvim spec with `lazy = false` | Yes | Yes | Yes |

The editor versions were Neovim 0.9.5 and Vim 9.1. The lazy.nvim case used a local plugin checkout and explicitly enabled lazy loading by default, so the watcher's `lazy = false` override had something to override.

For the positive cases, a real isolated Python ActivityWatch server received heartbeat events containing the expected file, language, and project fields. Its storage was in memory. That exercises the editor-to-server path without claiming anything about persistent database storage.

These checks establish more than “the command exists,” but less than “every user's distribution works.” The full AstroNvim distribution, AppImage packaging, and Windows were not tested. The original report remains open for confirmation of that user's setup.

## Startup timing is part of installation

The watcher registers its commands when the plugin script loads and autostarts on `VimEnter`.

That makes the loading phase relevant. A plugin specification that eventually loads the files is not necessarily equivalent to one that loads them before the event that starts the watcher.

The proposed [README change](https://github.com/ActivityWatch/aw-watcher-vim/pull/33) adds native package installation paths and an AstroNvim/lazy.nvim specification with `lazy = false`. The native paths use the editors' start-package mechanism; the manager recipe makes eager loading explicit rather than inheriting a distribution's defaults.

The change is documentation-only and still in review. It does not alter watcher runtime code or heartbeat timing. The minimal lazy.nvim test supports the loading choice; it is not a substitute for running the reporter's complete AstroNvim configuration.

## Keep the diagnostic boundaries visible

The troubleshooting order now starts with the distinction the report revealed:

1. **Are the commands defined?** If not, check package placement and the plugin manager's loading configuration.
2. **Does the watcher report that it is running?** Once the plugin has loaded, inspect its startup state.
3. **Does the server receive editor events?** Only then investigate the connection and the data path.

Those are different observations. Treating them as one “installed successfully” flag makes a user repeat the same clone command while the missing loading mechanism stays invisible.

There is another distinction worth keeping: editor activity and terminal window titles are separate inputs. Loading the Vim watcher does not make a terminal's window title a reliable description of the file being edited. Verify the editor bucket, where the watcher sends its own file, language, and project data.

The repair did not need a new installer. It needed a recipe that names the mechanism responsible for loading the files, plus a check that shows whether that step actually happened. A successful clone is evidence that the repository is on disk. It is not evidence that the editor ran it.
