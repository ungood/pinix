/**
 * pinix — workspace management extension for pi
 *
 * Manages workspaces (directories of git repos) and agents (tmux panes running pi).
 * Run pi from a workspaces root directory with this extension loaded.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import * as fs from "node:fs";
import * as path from "node:path";

interface RepoInfo {
	name: string;
	path: string;
	branch: string;
	dirty: boolean;
}

interface WorkspaceInfo {
	name: string;
	path: string;
	repos: RepoInfo[];
}

async function exec(pi: ExtensionAPI, cmd: string, args: string[], cwd?: string) {
	return pi.exec(cmd, args, { cwd, timeout: 10000 });
}

/** Scan a directory for git repos (one level deep) */
async function scanWorkspace(pi: ExtensionAPI, workspacePath: string): Promise<WorkspaceInfo> {
	const name = path.basename(workspacePath);
	const repos: RepoInfo[] = [];

	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(workspacePath, { withFileTypes: true });
	} catch {
		return { name, path: workspacePath, repos };
	}

	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
		const repoPath = path.join(workspacePath, entry.name);
		const gitDir = path.join(repoPath, ".git");
		if (!fs.existsSync(gitDir)) continue;

		const branchResult = await exec(pi, "git", ["-C", repoPath, "rev-parse", "--abbrev-ref", "HEAD"]);
		const statusResult = await exec(pi, "git", ["-C", repoPath, "status", "--porcelain"]);

		repos.push({
			name: entry.name,
			path: repoPath,
			branch: branchResult.stdout.trim() || "unknown",
			dirty: statusResult.stdout.trim().length > 0,
		});
	}

	return { name, path: workspacePath, repos };
}

/** List workspace directories (subdirectories of cwd that contain at least one git repo) */
async function listWorkspaces(pi: ExtensionAPI, cwd: string): Promise<WorkspaceInfo[]> {
	const workspaces: WorkspaceInfo[] = [];
	const entries = fs.readdirSync(cwd, { withFileTypes: true });

	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
		const ws = await scanWorkspace(pi, path.join(cwd, entry.name));
		if (ws.repos.length > 0) {
			workspaces.push(ws);
		}
	}

	return workspaces;
}

function formatRepoStatus(repo: RepoInfo): string {
	const dirty = repo.dirty ? " *" : "";
	return `${repo.name} (${repo.branch}${dirty})`;
}

export default function (pi: ExtensionAPI) {
	// --- Tool: workspace management for the LLM ---

	pi.registerTool({
		name: "workspace",
		label: "Workspace",
		description: [
			"Manage workspaces and git repositories.",
			"Actions:",
			"  list — list all workspaces (directories containing git repos)",
			"  create <name> — create a new workspace directory",
			"  add <url> [workspace] [name] — clone a repo into a workspace",
			"  status [workspace] — show repo status in a workspace",
		].join("\n"),
		parameters: Type.Object({
			action: StringEnum(["list", "create", "add", "status"] as const),
			name: Type.Optional(Type.String({ description: "Workspace name (for create) or repo name (for add)" })),
			url: Type.Optional(Type.String({ description: "Git repo URL (for add)" })),
			workspace: Type.Optional(Type.String({ description: "Workspace name (for add, status)" })),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const cwd = ctx.cwd;

			switch (params.action) {
				case "list": {
					const workspaces = await listWorkspaces(pi, cwd);
					if (workspaces.length === 0) {
						return {
							content: [{ type: "text", text: "No workspaces found. Create one with action: create" }],
						};
					}
					const lines = workspaces.map(
						(ws) => `${ws.name}/\n${ws.repos.map((r) => `  ${formatRepoStatus(r)}`).join("\n")}`
					);
					return { content: [{ type: "text", text: lines.join("\n\n") }] };
				}

				case "create": {
					if (!params.name) {
						return { content: [{ type: "text", text: "Error: name required" }], isError: true };
					}
					const wsPath = path.join(cwd, params.name);
					if (fs.existsSync(wsPath)) {
						return { content: [{ type: "text", text: `Directory already exists: ${params.name}` }], isError: true };
					}
					fs.mkdirSync(wsPath, { recursive: true });
					return { content: [{ type: "text", text: `Created workspace: ${params.name}/` }] };
				}

				case "add": {
					if (!params.url) {
						return { content: [{ type: "text", text: "Error: url required" }], isError: true };
					}
					if (!params.workspace) {
						return { content: [{ type: "text", text: "Error: workspace required" }], isError: true };
					}
					const wsPath = path.join(cwd, params.workspace);
					if (!fs.existsSync(wsPath)) {
						return { content: [{ type: "text", text: `Workspace not found: ${params.workspace}` }], isError: true };
					}
					const repoName = params.name || path.basename(params.url, ".git");
					const repoPath = path.join(wsPath, repoName);
					if (fs.existsSync(repoPath)) {
						return { content: [{ type: "text", text: `Already exists: ${params.workspace}/${repoName}` }], isError: true };
					}
					const result = await exec(pi, "git", ["clone", params.url, repoPath]);
					if (result.code !== 0) {
						return { content: [{ type: "text", text: `Clone failed: ${result.stderr.trim()}` }], isError: true };
					}
					return { content: [{ type: "text", text: `Cloned ${repoName} into ${params.workspace}/` }] };
				}

				case "status": {
					if (!params.workspace) {
						return { content: [{ type: "text", text: "Error: workspace required" }], isError: true };
					}
					const wsPath = path.join(cwd, params.workspace);
					if (!fs.existsSync(wsPath)) {
						return { content: [{ type: "text", text: `Workspace not found: ${params.workspace}` }], isError: true };
					}
					const ws = await scanWorkspace(pi, wsPath);
					if (ws.repos.length === 0) {
						return { content: [{ type: "text", text: `No repos in ${params.workspace}/` }] };
					}
					const lines = ws.repos.map((r) => formatRepoStatus(r));
					return { content: [{ type: "text", text: `${ws.name}/\n${lines.map((l) => `  ${l}`).join("\n")}` }] };
				}

				default:
					return { content: [{ type: "text", text: `Unknown action: ${params.action}` }], isError: true };
			}
		},
	});

	// --- Slash commands for humans ---

	pi.registerCommand("ws", {
		description: "List workspaces and their repos",
		handler: async (_args, ctx) => {
			const workspaces = await listWorkspaces(pi, ctx.cwd);
			if (workspaces.length === 0) {
				ctx.ui.notify("No workspaces found", "info");
				return;
			}
			const lines = workspaces.map(
				(ws) => `${ws.name}/\n${ws.repos.map((r) => `  ${formatRepoStatus(r)}`).join("\n")}`
			);
			ctx.ui.notify(lines.join("\n\n"), "info");
		},
	});

	pi.registerCommand("ws-create", {
		description: "Create a new workspace: /ws-create <name>",
		handler: async (args, ctx) => {
			const name = args?.trim();
			if (!name) {
				ctx.ui.notify("Usage: /ws-create <name>", "error");
				return;
			}
			const wsPath = path.join(ctx.cwd, name);
			if (fs.existsSync(wsPath)) {
				ctx.ui.notify(`Already exists: ${name}/`, "error");
				return;
			}
			fs.mkdirSync(wsPath, { recursive: true });
			ctx.ui.notify(`Created workspace: ${name}/`, "success");
		},
	});

	pi.registerCommand("ws-add", {
		description: "Clone a repo into a workspace: /ws-add <workspace> <repo-url> [name]",
		handler: async (args, ctx) => {
			const parts = args?.trim().split(/\s+/) || [];
			if (parts.length < 2) {
				ctx.ui.notify("Usage: /ws-add <workspace> <repo-url> [name]", "error");
				return;
			}
			const [workspace, url, ...rest] = parts;
			const repoName = rest[0] || path.basename(url, ".git");
			const wsPath = path.join(ctx.cwd, workspace);
			if (!fs.existsSync(wsPath)) {
				ctx.ui.notify(`Workspace not found: ${workspace}`, "error");
				return;
			}
			const repoPath = path.join(wsPath, repoName);
			if (fs.existsSync(repoPath)) {
				ctx.ui.notify(`Already exists: ${workspace}/${repoName}`, "error");
				return;
			}
			ctx.ui.notify(`Cloning ${url}...`, "info");
			const result = await exec(pi, "git", ["clone", url, repoPath]);
			if (result.code !== 0) {
				ctx.ui.notify(`Clone failed: ${result.stderr.trim()}`, "error");
				return;
			}
			ctx.ui.notify(`Cloned ${repoName} into ${workspace}/`, "success");
		},
	});

	// --- Session start: show workspace overview ---

	pi.on("session_start", async (_event, ctx) => {
		const workspaces = await listWorkspaces(pi, ctx.cwd);
		if (workspaces.length > 0) {
			const summary = workspaces
				.map((ws) => `${ws.name}/ (${ws.repos.length} repo${ws.repos.length === 1 ? "" : "s"})`)
				.join(", ");
			ctx.ui.setStatus("pinix", `📂 ${summary}`);
		} else {
			ctx.ui.setStatus("pinix", "📂 No workspaces");
		}
	});
}
