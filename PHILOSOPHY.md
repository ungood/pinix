# Philosophy

Pinix is a multi-agent, multi-repository orchestration layer built on [pi-coding-agent](https://github.com/badlogic/pi-mono) and [Nix](https://nixos.org/).

## Principles

### Humans review results, not steps

AI agents should run with enough autonomy to be useful. The human's job is to set direction, monitor progress, and review outcomes — not to click "approve" on every shell command. Trust the agent to work. Watch the output. Steer when it drifts.

### Agents use human tools

An AI agent should use the same tools a developer uses: CLI programs, shell scripts, git, standard Unix utilities. No special protocols. No MCP servers. No agent-specific APIs wrapping things that already have perfectly good command-line interfaces. If a human would use `curl`, the agent should use `curl`. Bash is the universal integration layer. Tmux is the multiplexer.

### Compose, don't reinvent

Use existing tools well instead of rebuilding them badly. Pi already handles the agent loop, tools, extensions, sessions, and SDK. Nix already handles reproducible environments. Git already handles state, history, and collaboration. Tmux already handles terminal multiplexing. Pinix is the thin layer that wires them together.

### Call things what they are

An environment is an environment, not a "rig." A worker is a worker, not a "polecat." A task is a task, not a "bead." Metaphors and cute names obscure meaning. Use plain, descriptive language that a newcomer can understand without reading a glossary.

### Nix for reproducibility, not complexity

Each agent environment is a Nix shell: a declarative, reproducible definition of what tools, credentials, context files, and configuration an agent needs. Nix ensures that "works on my machine" means "works on every machine." But Nix is a means, not the point — if something is simpler without Nix, do it without Nix.

### Minimal core, maximal extensibility

Follow pi's philosophy: ship a small, opinionated core and let users extend it. Don't bake in features that belong in extensions, skills, or user configuration. The right answer to "should we add X?" is usually "can the user add X themselves?"

### Open source, open process

The code is open. The architecture decisions are documented. The project is built in public. Contributions are welcome. AI should empower people to dream and build better — that starts with letting them see, modify, and own their tools.

### Autonomy scales with trust

Not every task needs the same level of oversight. A quick formatting fix can run unattended. A database migration needs a human watching. Pinix should make it easy to dial autonomy up or down per-environment, per-task, or per-agent — without changing the fundamental architecture.

## Non-goals

- **Custom agent protocol.** Agents communicate through the filesystem, git, and standard I/O. No custom RPC between agents.
- **Web dashboard.** The terminal is the interface. If you want a dashboard, build one.
- **Vendor lock-in.** Pi supports many providers. Pinix inherits that. No single-provider assumptions.
- **Grand unified workflow engine.** Pinix coordinates agents. It doesn't manage your CI/CD, deployment, or project management. Use the tools that already do those things.
