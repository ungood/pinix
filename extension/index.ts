/**
 * pinix — workspace management extension for pi
 *
 * Manages workspaces (bare git repos) and worktrees.
 * Run pi from a workspaces root directory with this extension loaded.
 *
 * Each workspace is a bare git clone. All work — human and agent — happens
 * in worktrees inside the bare repo directory (Primeagen bare repo convention).
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import * as fs from "node:fs";
import * as path from "node:path";

// --- Data model ---

interface WorktreeInfo {
	name: string;
	path: string;
	branch: string;
	dirty: boolean;
}

interface WorkspaceInfo {
	name: string;
	path: string;
	worktrees: WorktreeInfo[];
}

// --- Git helpers ---

async function exec(pi: ExtensionAPI, cmd: string, args: string[], cwd?: string) {
	return pi.exec(cmd, args, { cwd, timeout: 30000 });
}

async function isBareRepo(pi: ExtensionAPI, dirPath: string): Promise<boolean> {
	const result = await exec(pi, "git", ["-C", dirPath, "rev-parse", "--is-bare-repository"]);
	return result.code === 0 && result.stdout.trim() === "true";
}

async function getDefaultBranch(pi: ExtensionAPI, bareRepoPath: string): Promise<string> {
	const result = await exec(pi, "git", ["-C", bareRepoPath, "symbolic-ref", "HEAD"]);
	if (result.code !== 0) return "main";
	return result.stdout.trim().replace("refs/heads/", "");
}

async function parseWorktrees(pi: ExtensionAPI, bareRepoPath: string): Promise<WorktreeInfo[]> {
	const result = await exec(pi, "git", ["-C", bareRepoPath, "worktree", "list", "--porcelain"]);
	if (result.code !== 0) return [];

	const worktrees: WorktreeInfo[] = [];
	const blocks = result.stdout.split("\n\n").filter((b) => b.trim());

	for (const block of blocks) {
		const lines = block.trim().split("\n");
		let wtPath = "";
		let branch = "";
		let isBare = false;

		for (const line of lines) {
			if (line.startsWith("worktree ")) {
				wtPath = line.substring("worktree ".length);
			} else if (line === "bare") {
				isBare = true;
			} else if (line.startsWith("branch ")) {
				branch = line.substring("branch ".length).replace("refs/heads/", "");
			} else if (line === "detached") {
				branch = "(detached)";
			}
		}

		if (isBare || !wtPath) continue;

		const statusResult = await exec(pi, "git", ["-C", wtPath, "status", "--porcelain"]);
		const dirty = statusResult.stdout.trim().length > 0;

		worktrees.push({
			name: path.basename(wtPath),
			path: wtPath,
			branch,
			dirty,
		});
	}

	return worktrees;
}

// --- Workspace operations ---

async function scanWorkspace(pi: ExtensionAPI, wsPath: string): Promise<WorkspaceInfo> {
	const name = path.basename(wsPath);
	const worktrees = await parseWorktrees(pi, wsPath);
	return { name, path: wsPath, worktrees };
}

async function listWorkspaces(pi: ExtensionAPI, cwd: string): Promise<WorkspaceInfo[]> {
	const workspaces: WorkspaceInfo[] = [];
	const entries = fs.readdirSync(cwd, { withFileTypes: true });

	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
		const dirPath = path.join(cwd, entry.name);
		if (await isBareRepo(pi, dirPath)) {
			workspaces.push(await scanWorkspace(pi, dirPath));
		}
	}

	return workspaces;
}

function formatWorktreeStatus(wt: WorktreeInfo): string {
	const dirty = wt.dirty ? " *" : "";
	return `${wt.name} (${wt.branch}${dirty})`;
}

function formatWorkspace(ws: WorkspaceInfo): string {
	if (ws.worktrees.length === 0) return `${ws.name}/ (no worktrees)`;
	return `${ws.name}/\n${ws.worktrees.map((wt) => `  ${formatWorktreeStatus(wt)}`).join("\n")}`;
}

// --- Extension ---

export default function (pi: ExtensionAPI) {
	// --- Tool: workspace management for LLM ---

	pi.registerTool({
		name: "workspace",
		label: "Workspace",
		description: [
			"Manage workspaces (bare git repos) and their worktrees.",
			"Actions:",
			"  list — list all workspaces and their worktrees",
			"  add <url> [name] — clone a repo as a bare workspace with a main worktree",
			"  status <name> — show worktree status in a workspace",
		].join("\n"),
		parameters: Type.Object({
			action: StringEnum(["list", "add", "status"] as const),
			name: Type.Optional(Type.String({ description: "Workspace name (for status) or custom name (for add)" })),
			url: Type.Optional(Type.String({ description: "Git repo URL (for add)" })),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const cwd = ctx.cwd;

			switch (params.action) {
				case "list": {
					const workspaces = await listWorkspaces(pi, cwd);
					if (workspaces.length === 0) {
						return { content: [{ type: "text", text: "No workspaces found. Add one with action: add" }] };
					}
					const lines = workspaces.map((ws) => formatWorkspace(ws));
					return { content: [{ type: "text", text: lines.join("\n\n") }] };
				}

				case "add": {
					if (!params.url) {
						return { content: [{ type: "text", text: "Error: url required" }], isError: true };
					}
					const wsName = params.name || path.basename(params.url, ".git");
					const wsPath = path.join(cwd, wsName);
					if (fs.existsSync(wsPath)) {
						return { content: [{ type: "text", text: `Already exists: ${wsName}/` }], isError: true };
					}

					// Clone bare
					const cloneResult = await exec(pi, "git", ["clone", "--bare", params.url, wsPath]);
					if (cloneResult.code !== 0) {
						return { content: [{ type: "text", text: `Clone failed: ${cloneResult.stderr.trim()}` }], isError: true };
					}

					// Configure fetch refspec (bare clones don't set this by default)
					await exec(pi, "git", ["-C", wsPath, "config", "remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*"]);

					// Create main worktree
					const defaultBranch = await getDefaultBranch(pi, wsPath);
					const wtResult = await exec(pi, "git", ["-C", wsPath, "worktree", "add", defaultBranch, defaultBranch]);
					if (wtResult.code !== 0) {
						return {
							content: [{ type: "text", text: `Clone succeeded but worktree failed: ${wtResult.stderr.trim()}` }],
							isError: true,
						};
					}

					return { content: [{ type: "text", text: `Created workspace ${wsName}/ with worktree ${defaultBranch}/` }] };
				}

				case "status": {
					if (!params.name) {
						return { content: [{ type: "text", text: "Error: name required" }], isError: true };
					}
					const wsPath = path.join(cwd, params.name);
					if (!fs.existsSync(wsPath)) {
						return { content: [{ type: "text", text: `Workspace not found: ${params.name}` }], isError: true };
					}
					if (!(await isBareRepo(pi, wsPath))) {
						return { content: [{ type: "text", text: `Not a workspace (bare repo): ${params.name}` }], isError: true };
					}
					const ws = await scanWorkspace(pi, wsPath);
					return { content: [{ type: "text", text: formatWorkspace(ws) }] };
				}

				default:
					return { content: [{ type: "text", text: `Unknown action: ${params.action}` }], isError: true };
			}
		},
	});

	// --- Slash commands ---

	pi.registerCommand("workspace:list", {
		description: "List workspaces and their worktrees",
		handler: async (_args, ctx) => {
			const workspaces = await listWorkspaces(pi, ctx.cwd);
			if (workspaces.length === 0) {
				ctx.ui.notify("No workspaces found", "info");
				return;
			}
			const lines = workspaces.map((ws) => formatWorkspace(ws));
			ctx.ui.notify(lines.join("\n\n"), "info");
		},
	});

	pi.registerCommand("workspace:add", {
		description: "Clone a repo as a workspace: /workspace:add <url> [name]",
		handler: async (args, ctx) => {
			const parts = args?.trim().split(/\s+/) || [];
			if (parts.length < 1 || !parts[0]) {
				ctx.ui.notify("Usage: /workspace:add <url> [name]", "error");
				return;
			}
			const [url, ...rest] = parts;
			const wsName = rest[0] || path.basename(url, ".git");
			const wsPath = path.join(ctx.cwd, wsName);

			if (fs.existsSync(wsPath)) {
				ctx.ui.notify(`Already exists: ${wsName}/`, "error");
				return;
			}

			ctx.ui.notify(`Cloning ${url} (bare)...`, "info");
			const cloneResult = await exec(pi, "git", ["clone", "--bare", url, wsPath]);
			if (cloneResult.code !== 0) {
				ctx.ui.notify(`Clone failed: ${cloneResult.stderr.trim()}`, "error");
				return;
			}

			// Configure fetch refspec (bare clones don't set this by default)
			await exec(pi, "git", ["-C", wsPath, "config", "remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*"]);

			// Create main worktree
			const defaultBranch = await getDefaultBranch(pi, wsPath);
			const wtResult = await exec(pi, "git", ["-C", wsPath, "worktree", "add", defaultBranch, defaultBranch]);
			if (wtResult.code !== 0) {
				ctx.ui.notify(`Clone succeeded but worktree failed: ${wtResult.stderr.trim()}`, "error");
				return;
			}

			ctx.ui.notify(`Created workspace ${wsName}/ with worktree ${defaultBranch}/`, "success");
		},
	});

	pi.registerCommand("workspace:status", {
		description: "Show workspace status: /workspace:status <name>",
		handler: async (args, ctx) => {
			const name = args?.trim();
			if (!name) {
				ctx.ui.notify("Usage: /workspace:status <name>", "error");
				return;
			}
			const wsPath = path.join(ctx.cwd, name);
			if (!fs.existsSync(wsPath)) {
				ctx.ui.notify(`Workspace not found: ${name}`, "error");
				return;
			}
			if (!(await isBareRepo(pi, wsPath))) {
				ctx.ui.notify(`Not a workspace (bare repo): ${name}`, "error");
				return;
			}
			const ws = await scanWorkspace(pi, wsPath);
			ctx.ui.notify(formatWorkspace(ws), "info");
		},
	});
}
