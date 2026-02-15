# Architecture

Living document of architecture decisions for pinix.

## Overview

Pinix is a single entry point for orchestrating multiple AI agents across multiple repositories. It combines pi-coding-agent (the agent runtime) with Nix (reproducible environments) and tmux (terminal multiplexing).

```
┌─────────────────────────────────────────────┐
│  pinix                                      │
│  ┌───────────────────────────────────────┐  │
│  │  tmux session                         │  │
│  │  ┌─────────┐ ┌─────────┐ ┌────────┐  │  │
│  │  │ env: A  │ │ env: B  │ │ human  │  │  │
│  │  │ (nix)   │ │ (nix)   │ │ shell  │  │  │
│  │  │         │ │         │ │        │  │  │
│  │  │ pi ───► │ │ pi ───► │ │        │  │  │
│  │  │ worker  │ │ worker  │ │        │  │  │
│  │  │ worker  │ │ worker  │ │        │  │  │
│  │  └─────────┘ └─────────┘ └────────┘  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Key Concepts

| Concept | What it is | Implemented with |
|---------|-----------|-----------------|
| **Environment** | A reproducible shell with specific tools, context, and configuration for working in a git subtree | Nix shell (flake) |
| **Worker** | A single pi-coding-agent instance performing tasks within an environment | pi SDK or CLI via tmux pane |
| **Workspace** | A collection of environments, typically spanning multiple repositories | tmux session |
| **Orchestrator** | The human (or a coordinating agent) that assigns work and reviews results | pinix CLI |

## Decisions

### ADR-001: Use tmux for agent multiplexing

**Status:** Accepted

**Context:** We need to run multiple agent instances concurrently with full observability.

**Decision:** Each worker runs in a tmux pane. The human can attach to any pane to observe, steer, or intervene. No custom process management — tmux already handles sessions, windows, panes, logging, and detach/reattach.

**Consequences:** Requires tmux. Agents are fully observable. Standard tmux workflows apply (capture-pane, pipe-pane for logging, send-keys for input).

### ADR-002: Use Nix for environment definitions

**Status:** Accepted

**Context:** Each agent may need different tools, language runtimes, credentials, and context files. These must be reproducible.

**Decision:** Each environment is defined as a Nix shell (via flakes). The shell definition specifies packages, environment variables, AGENTS.md content, and pi configuration. Entering the environment is `nix develop`.

**Consequences:** Environments are declarative, reproducible, and shareable. Users must have Nix installed. Environments can be version-controlled alongside the code they operate on.

### ADR-003: Git as the coordination layer

**Status:** Accepted

**Context:** Multiple agents working on the same repository need to coordinate without stepping on each other.

**Decision:** Agents work in git worktrees or branches. Coordination happens through the filesystem and git — not through a custom messaging protocol. Task state is tracked in files (markdown, JSON) within the repository.

**Consequences:** All state is version-controlled. Standard git tools work for inspection and recovery. No custom database or message queue needed.

### ADR-004: Pi extensions over custom tooling

**Status:** Accepted

**Context:** We need agent capabilities beyond pi's defaults (coordination, reporting, environment awareness).

**Decision:** Build pinix-specific capabilities as pi extensions. These extensions can register tools, react to events, and provide UI — all through pi's existing extension API.

**Consequences:** We stay within pi's ecosystem. Extensions are shareable as pi packages. No fork of pi needed.

### ADR-005: Plain language naming

**Status:** Accepted

**Context:** Gas-town uses themed naming (Mayor, Polecats, Rigs, Beads, Hooks, MEOW) that requires a glossary to understand.

**Decision:** Use descriptive, plain-language names. An environment is an "environment." A worker is a "worker." A task is a "task." Naming should be self-documenting.

**Consequences:** Lower barrier to entry. Documentation is shorter. No glossary needed.

## Open Questions

- How should task assignment and progress tracking work? Files in the repo? A shared TODO.md? Pi session metadata?
- Should the orchestrator be a pi instance itself (agent-as-coordinator), or a separate CLI that manages pi instances?
- What's the right granularity for environments — per-repo, per-task, per-team?
- How do we handle credentials and secrets in Nix-defined environments?
