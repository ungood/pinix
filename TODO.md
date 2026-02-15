# TODO

## Milestone 0: Bootstrap ✅

- [x] Initialize git repo
- [x] Verify: pi runs with pinix extension loaded
- [x] Dog-food: use pinix to develop pinix

## Milestone 1: Workspace management

Core extension that manages workspaces and repos.

- [x] Extension skeleton — loads in pi, registers commands and tools
- [x] `/workspace:list` — list workspaces and their repos
- [x] `/workspace:create <name>` — create a workspace directory
- [x] `/workspace:add <workspace> <url> [name]` — clone a repo into a workspace
- [x] `workspace` tool — LLM-callable workspace operations (list, create, add, status)
- [x] Test: run from a workspaces root, create a workspace, add repos, verify status

## Milestone 2: Worktree management

Agents work in git worktrees for isolation.

- [ ] `/ws-worktree <workspace/repo> <branch>` — create a worktree
- [ ] `worktree` tool — LLM-callable worktree operations
- [ ] List/clean worktrees per repo

## Milestone 3: Multi-agent orchestration

Spin up pi workers in tmux panes.

- [ ] `/ws-spawn <workspace/repo> [branch]` — launch a pi worker in a tmux pane
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
