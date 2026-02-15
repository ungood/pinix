# Architecture

Living document of architecture decisions for pinix.

## Overview

Pinix is a pi extension for managing workspaces — git repositories where humans and AI agents collaborate. You run pi from a workspaces root directory with pinix loaded, and it handles repo management, worktrees for parallel agent work, and tmux panes for multi-agent orchestration.

Each workspace is a single git repo cloned as a bare repository. All work — human and agent — happens in worktrees inside the bare repo directory. This follows the "Primeagen bare repo" convention.

```
~/workspaces/                    # run pi here with pinix extension
├── pinix/                       # workspace (bare repo)
│   ├── HEAD, objects/, refs/    # bare git internals
│   ├── main/                   # worktree — human works here
│   ├── feature-auth/           # worktree — agent works here
│   └── bugfix-123/             # worktree — agent works here
├── frontend/                    # workspace (bare repo)
│   ├── main/
│   └── redesign/
└── backend/                     # workspace (bare repo)
    └── main/
```

## Key Concepts

| Concept | What it is | Implemented with |
|---------|-----------|-----------------|
| **Workspace** | A single git repo (bare clone) | Bare git repository |
| **Worktree** | A checked-out branch within a workspace | `git worktree` |
| **Worker** | A pi instance performing tasks in a worktree | pi in a tmux pane |
| **Workspaces root** | The directory pi is launched from | `ctx.cwd` |

A workspace is discovered, not configured — any subdirectory of the workspaces root that is a bare git repo is a workspace. No metadata files.

## Decisions

### ADR-001: Pinix is a pi extension

**Status:** Accepted (replaces prior tmux-launcher approach)

**Context:** Pinix needs to provide workspace management commands, LLM-callable tools, and status UI within a pi session.

**Decision:** Pinix is a pi extension. It registers slash commands (`/ws`, `/ws-create`, `/ws-add`), tools (for LLM-driven workspace operations), and uses pi's event system for status display. No separate shell script or CLI.

**Consequences:** Everything runs inside pi. Installation is `pi -e ./pinix/extension/index.ts` during development, or as a pi package when published. Pi's extension API handles commands, tools, UI, and lifecycle.

### ADR-002: Workspaces are bare repos, work happens in worktrees

**Status:** Accepted (supersedes prior "workspaces are directories of repos" model)

**Context:** The original model had workspaces as directories containing one or more git repos. This added a layer of indirection — most workspaces contained a single repo anyway. We also needed a clean worktree story for agents.

**Decision:** A workspace is a bare git clone (`git clone --bare`). All work — human and agent — happens in git worktrees inside the bare repo directory. Adding a workspace does `git clone --bare`, then `git worktree add main`. This follows the convention popularized by ThePrimeagen.

**Consequences:**
- One workspace = one repo. The filesystem is still the source of truth. Discovery scans for bare repos.
- All branches are equal — `main/` is a worktree just like `feature-auth/`. No branch is special structurally.
- Multiple agents work on the same repo simultaneously via separate worktrees. Git enforces that no two worktrees share a branch.
- You always `cd workspace/branch` rather than `cd workspace`. This is a small ergonomic cost but makes the active branch always explicit.
- Standard `git clone` workflow is replaced by `git clone --bare` + `git worktree add`. Pinix handles this.

**Alternatives considered:**
- *Sibling worktrees at top level* (jj-style): worktrees as peers of repos in the workspaces root. Flat but noisy — mixes repos and worktrees.
- *Nested worktrees* (`.worktrees/` inside repo): clean top level but hides agent work. Requires gitignore management.
- *Separated worktrees* (tree-me style): worktrees in a separate directory tree. Clean separation but splits related work across two locations.
- *jj as VCS*: jj workspaces have excellent properties for agents (committable conflicts, auto-snapshot, anonymous branches) but LLMs are git-trained and jj is pre-1.0. Worth revisiting later.

### ADR-003: Bare clone to add, worktree to work

**Status:** Accepted (updated from prior "clone to add" model)

**Context:** Repos need to be added as workspaces, and agents need isolated working copies.

**Decision:** Adding a workspace does `git clone --bare <url> <name>`, then immediately creates a `main` worktree via `git worktree add`. Agents create additional worktrees for their branches. Worktrees are cheap and disposable.

**Consequences:** Multiple agents can work on the same repo simultaneously without conflicts. The bare repo is the canonical store; all worktrees are equal working copies.

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
- Should the orchestrator be a pi instance itself, or the human in the main pi session?
- How do we handle per-workspace environment needs (different tools, runtimes)?
- Should we revisit jj as the VCS layer when LLMs have better jj training?
