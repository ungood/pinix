# pinix

A multi-agent, multi-repository orchestration layer built on [pi-coding-agent](https://github.com/badlogic/pi-mono) and [Nix](https://nixos.org/).

## Project Documents

- **[PHILOSOPHY.md](PHILOSOPHY.md)** — Principles and values guiding this project
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Architecture decisions and system design

## What is this?

Pinix is a single entry point for coordinating multiple AI agents across multiple repositories. It combines:

- **pi-coding-agent** — the agent runtime (extensions, tools, SDK, TUI)
- **Nix** — reproducible environment definitions (flakes, shells)
- **tmux** — terminal multiplexing and observability
- **git** — state, coordination, and history

Inspired by [gas-town](https://github.com/steveyegge/gastown) but built on existing tools instead of reinventing them, and with plain language instead of themed jargon.

## Quick Start

```bash
./pinix          # starts tmux session with pi + human shell
./pinix myname   # custom session name
```

Requires [Nix](https://nixos.org/) with flakes enabled. The flake provides tmux and other tools; pi should be installed separately.

## Status

Bootstrapping. See [TODO.md](TODO.md) for current progress.

## Contributing

Read [PHILOSOPHY.md](PHILOSOPHY.md) before contributing. The core ideas: agents use human tools (CLIs, not protocols), humans review results not steps, compose existing tools don't reinvent them, and call things what they are.
