# TODO

## Milestone 0: Bootstrap

Get to the point where pinix is used to develop pinix.

- [x] Initialize git repo
- [x] Create `flake.nix` with dev environment (pi, tmux, git, coreutils)
- [x] Create `pinix` shell script — entry point that starts a tmux session with pi in the nix environment
- [x] Add `.gitignore`
- [ ] Verify: run `./pinix` from the project root, get a tmux session with pi running, AGENTS.md loaded
- [ ] Dog-food: use the bootstrapped setup to continue development

## Milestone 1: Multi-environment basics

Define and launch multiple environments from a single config.

- [ ] Design environment config format (nix expressions? TOML? directory convention?)
- [ ] Support launching multiple pi workers in separate tmux panes within one environment
- [ ] Support multiple environments (multiple repos) in one tmux session
- [ ] Human shell pane for manual work alongside agents

## Milestone 2: Coordination

Agents and humans working together on shared repositories.

- [ ] Task tracking mechanism (files in repo — TODO.md, task JSON, or similar)
- [ ] Git worktree management for parallel agent work
- [ ] Pi extension for environment/workspace awareness
- [ ] Progress visibility from the orchestrator pane

## Later

- [ ] Autonomy controls per-environment (unattended vs. supervised)
- [ ] Pi extension for inter-agent coordination (filesystem-based)
- [ ] Session logging and review tooling
- [ ] Shareable environment definitions (pi packages + nix flakes)
