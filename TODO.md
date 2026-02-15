# TODO

## Milestone 0: Bootstrap ✅

- [x] Initialize git repo
- [x] Verify: pi runs with pinix extension loaded
- [x] Dog-food: use pinix to develop pinix

## Milestone 1: Workspace management (bare repo model)

Core extension that manages workspaces (bare repos) and worktrees.

- [x] Extension skeleton — loads in pi, registers commands and tools
- [x] Refactor to bare repo model (ADR-002)
  - [x] `workspace:list` — scan for bare repos, show their worktrees
  - [x] `workspace:add <url> [name]` — `git clone --bare` + `git worktree add main`
  - [x] `workspace:status [workspace]` — show worktree status within a workspace
  - [x] `workspace` tool — mirrors slash commands for LLM use
  - [x] Detection: identify bare repos via `git rev-parse --is-bare-repository`

## Milestone 2: Worktree management

Agents work in git worktrees for isolation. Slash commands and tools mirror each other — agents use the same interface humans do.

- [x] `worktree:add <workspace> <branch> [base]` — create a worktree
- [x] `worktree:list <workspace>` — list worktrees in a workspace
- [x] `worktree:remove <workspace> <branch>` — remove a worktree
- [x] `worktree` tool — mirrors slash commands for LLM use

## Milestone 3: Multi-agent orchestration

Spin up pi workers in tmux panes.

- [ ] `/worker:spawn <workspace> <branch> [prompt]` — launch a pi worker in a tmux pane at a worktree
- [ ] Worker lifecycle management (start, stop, list)
- [ ] Human can attach to any worker pane
- [ ] Progress visibility from the main pi session

## Later

- [ ] Status bar showing workspace summary
- [ ] Task tracking (files in repo, TODO.md, or similar)
- [ ] Autonomy controls per-worker
- [ ] Session logging and review
- [ ] Per-workspace environment definitions (nix flakes, etc.)
- [ ] Publish as a pi package
- [ ] Revisit jj as VCS layer
