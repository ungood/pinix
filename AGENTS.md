# pinix

A pi extension for multi-agent workspace management.

## Project Documents

- **[PHILOSOPHY.md](PHILOSOPHY.md)** — Principles and values guiding this project
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Architecture decisions and system design

## What is this?

Pinix is a pi extension that manages workspaces — directories of git repositories where humans and AI agents collaborate. It provides:

- **Workspace management** — create workspaces, clone repos, scan status
- **Agent orchestration** — spin up pi workers in tmux panes (planned)
- **Worktree management** — isolated branches for parallel agent work (planned)

## Quick Start

```bash
cd ~/workspaces
pi -e ./pinix/extension/index.ts
```

Then use `/workspace:list`, `/workspace:create`, `/workspace:add` commands or let the LLM use the `workspace` tool.

## Status

Building. See [TODO.md](TODO.md) for current progress.

## Contributing

Read [PHILOSOPHY.md](PHILOSOPHY.md) before contributing.
