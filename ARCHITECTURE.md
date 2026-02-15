# Architecture

Living document of architecture decisions for pinix.

## Overview

Pinix is a pi extension for managing workspaces — collections of git repositories where humans and AI agents collaborate. You run pi from a workspaces root directory with pinix loaded, and it handles repo management, worktrees for parallel agent work, and tmux panes for multi-agent orchestration.

```
~/workspaces/                    # run pi here with pinix extension
├── my-project/                  # workspace
│   ├── frontend/                # git clone
│   │   ├── (main branch)
│   │   └── .git/worktrees/
│   │       └── feature-auth/    # agent worktree
│   └── backend/                 # git clone
├── pinix/                       # pinix source (also a workspace)
│   └── extension/
│       └── index.ts
└── side-project/                # single-repo workspace
```

## Key Concepts

| Concept | What it is | Implemented with |
|---------|-----------|-----------------|
| **Workspace** | A directory containing one or more git repos | Filesystem directory |
| **Worker** | A pi instance performing tasks in a worktree | pi in a tmux pane |
| **Workspaces root** | The directory pi is launched from | `ctx.cwd` |

A workspace is discovered, not configured — any subdirectory of the workspaces root that contains git repos is a workspace. No metadata files.

## Decisions

### ADR-001: Pinix is a pi extension

**Status:** Accepted (replaces prior tmux-launcher approach)

**Context:** Pinix needs to provide workspace management commands, LLM-callable tools, and status UI within a pi session.

**Decision:** Pinix is a pi extension. It registers slash commands (`/ws`, `/ws-create`, `/ws-add`), tools (for LLM-driven workspace operations), and uses pi's event system for status display. No separate shell script or CLI.

**Consequences:** Everything runs inside pi. Installation is `pi -e ./pinix/extension/index.ts` during development, or as a pi package when published. Pi's extension API handles commands, tools, UI, and lifecycle.

### ADR-002: Workspaces are just directories

**Status:** Accepted

**Context:** We need to track which repos belong to which workspace.

**Decision:** A workspace is a subdirectory of the workspaces root that contains at least one git repo. No `.pinix/` metadata directory, no config files. The filesystem is the source of truth.

**Consequences:** Zero setup to create a workspace — `mkdir` is enough. Discovery is a directory scan. No state to get out of sync.

### ADR-003: Clone to add, worktree to work

**Status:** Accepted

**Context:** Repos need to be added to workspaces, and agents need isolated working copies.

**Decision:** Adding a repo to a workspace does a `git clone`. Agents do their work in `git worktree` branches off those clones. This separates the "canonical" clone from agent working copies.

**Consequences:** Multiple agents can work on the same repo simultaneously without conflicts. The main clone stays on its primary branch. Worktrees are cheap and disposable.

### ADR-004: Use tmux for agent multiplexing

**Status:** Accepted

**Context:** We need to run multiple agent instances concurrently with full observability.

**Decision:** Each worker runs in a tmux pane, managed by the pinix extension via `pi.exec("tmux", ...)`. The human can attach to any pane to observe, steer, or intervene.

**Consequences:** Requires tmux. Agents are fully observable. Standard tmux workflows apply (capture-pane, pipe-pane for logging, send-keys for input).

### ADR-005: Git as the coordination layer

**Status:** Accepted

**Context:** Multiple agents working on the same repository need to coordinate without stepping on each other.

**Decision:** Agents work in git worktrees. Coordination happens through the filesystem and git — not through a custom messaging protocol. Task state is tracked in files within the repository.

**Consequences:** All state is version-controlled. Standard git tools work for inspection and recovery. No custom database or message queue.

### ADR-006: Plain language naming

**Status:** Accepted

**Decision:** Use descriptive, plain-language names. A workspace is a "workspace." A worker is a "worker." A task is a "task."

**Consequences:** Lower barrier to entry. No glossary needed.

## Open Questions

- How should task assignment and progress tracking work?
- What's the right granularity for worktree lifecycle — per-task, per-agent, per-session?
- Should the orchestrator be a pi instance itself, or the human in the main pi session?
- How do we handle per-workspace environment needs (different tools, runtimes)?
