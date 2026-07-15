/**
 * Read-only git backend for the UI: status, worktree file diff, history.
 *
 * SECURITY: every command is spawned without a shell, with a fixed argument
 * list, `cwd` at the browser root and a trailing `-- .` pathspec, so git only
 * ever reports content under the browser root even when the repository's
 * toplevel is an ancestor of it. Only rev-parse/status/log/show are used —
 * nothing here can mutate the repository.
 */
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import type { GitFileState, GitFileStatus, GitLogEntry } from "@pi-outpost/shared";

const execFileAsync = promisify(execFile);

const GIT_TIMEOUT_MS = 10_000;
const GIT_MAX_BUFFER = 10 * 1024 * 1024;
/** Commit patches beyond this are truncated (flagged), not refused. */
export const MAX_PATCH_BYTES = 256 * 1024;

export class GitError extends Error {}

async function runGit(root: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: root,
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: GIT_MAX_BUFFER,
      encoding: "utf8",
    });
    return stdout;
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr;
    throw new GitError(stderr?.trim().split("\n")[0] || `git ${args[0]} failed`);
  }
}

/** Startup probe: toplevel of the work tree containing root, or null (no repo / no git). */
export async function probeGit(root: string): Promise<{ toplevel: string } | null> {
  try {
    const out = await runGit(root, ["rev-parse", "--show-toplevel"]);
    const toplevel = out.trim();
    return toplevel ? { toplevel } : null;
  } catch {
    return null;
  }
}

/**
 * Undo git's C-style path quoting (core.quotePath quotes any non-ASCII byte as
 * \NNN octal — accented filenames are the everyday case, not the exception).
 */
export function unquote(gitPath: string): string {
  if (!gitPath.startsWith('"') || !gitPath.endsWith('"')) return gitPath;
  const inner = gitPath.slice(1, -1);
  const bytes: number[] = [];
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] !== "\\") {
      for (const byte of Buffer.from(inner[i], "utf8")) bytes.push(byte);
      continue;
    }
    const next = inner[++i];
    if (next >= "0" && next <= "7") {
      bytes.push(parseInt(inner.slice(i, i + 3), 8));
      i += 2;
    } else {
      const mapped = ({ "\\": "\\", '"': '"', n: "\n", t: "\t", r: "\r" } as Record<string, string>)[next] ?? next;
      for (const byte of Buffer.from(mapped, "utf8")) bytes.push(byte);
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

function stateFromXY(xy: string): GitFileState {
  if (xy.includes("D")) return "deleted";
  if (xy.includes("A")) return "added";
  return "modified";
}

export interface GitStatusResult {
  branch: string;
  ahead: number;
  behind: number;
  files: GitFileStatus[];
}

export async function gitStatus(root: string): Promise<GitStatusResult> {
  // -uall lists untracked files individually (default -unormal collapses a brand-new
  // directory to one "dir/" entry, leaving the files inside without badges)
  const out = await runGit(root, ["status", "--porcelain=v2", "--branch", "--untracked-files=all", "--", "."]);
  const result: GitStatusResult = { branch: "", ahead: 0, behind: 0, files: [] };

  // status paths are cwd-relative (cwd = browser root); the `-- .` pathspec already
  // confines entries, the "../" guard is defense in depth
  const push = (gitPath: string, status: GitFileState) => {
    const rel = unquote(gitPath);
    if (rel !== "" && !rel.startsWith("../")) result.files.push({ path: rel, status });
  };

  for (const line of out.split("\n")) {
    if (line.startsWith("# branch.head ")) {
      result.branch = line.slice("# branch.head ".length);
    } else if (line.startsWith("# branch.ab ")) {
      const match = /\+(\d+) -(\d+)/.exec(line);
      if (match) {
        result.ahead = Number(match[1]);
        result.behind = Number(match[2]);
      }
    } else if (line.startsWith("1 ")) {
      // 1 XY sub mH mI mW hH hI <path>
      const fields = line.split(" ");
      push(fields.slice(8).join(" "), stateFromXY(fields[1]));
    } else if (line.startsWith("2 ")) {
      // 2 XY sub mH mI mW hH hI X<score> <new>\t<old> — flatten renames to added + deleted
      const fields = line.split(" ");
      const rest = fields.slice(9).join(" ");
      const [newPath, oldPath] = rest.split("\t");
      if (newPath) push(newPath, "added");
      // Copies (C<score>) leave the source in place — only renames lose the old path
      if (oldPath && fields[8]?.startsWith("R")) push(oldPath, "deleted");
    } else if (line.startsWith("u ")) {
      const fields = line.split(" ");
      push(fields.slice(10).join(" "), "conflicted");
    } else if (line.startsWith("? ")) {
      push(line.slice(2), "untracked");
    }
  }
  return result;
}

/**
 * HEAD content of a browser-root-relative file (for the before side of a
 * worktree diff). Missing in HEAD (untracked/added) yields "". The caller has
 * already confined `relPath`; size/binary limits are the caller's too — this
 * only refuses grossly oversized blobs via the exec buffer cap.
 */
export async function gitHeadContent(root: string, toplevel: string, relPath: string): Promise<string> {
  const prefix = path.relative(toplevel, root).split(path.sep).join("/");
  const toplevelRel = prefix === "" ? relPath : `${prefix}/${relPath}`;
  try {
    return await runGit(root, ["show", `HEAD:${toplevelRel}`]);
  } catch (error) {
    // Only "not in HEAD" means an empty before-side (untracked/added, or an unborn
    // branch); anything else (timeout, output cap) must surface, not fake a full add
    const message = (error as Error).message;
    if (/does not exist in|exists on disk, but not in|invalid object name/i.test(message)) return "";
    throw error;
  }
}

const SHA_PATTERN = /^[0-9a-f]{7,40}$/i;

export async function gitLog(root: string, limit: number): Promise<GitLogEntry[]> {
  const n = Math.max(1, Math.min(100, Math.floor(limit)));
  const out = await runGit(root, ["log", "--format=%H%x1f%an%x1f%aI%x1f%s", "-n", String(n), "--", "."]);
  return out
    .split("\n")
    .filter((line) => line.includes("\x1f"))
    .map((line) => {
      const [sha, author, date, subject] = line.split("\x1f");
      return { sha, author, date, subject: subject ?? "" };
    });
}

export async function gitShow(root: string, sha: string): Promise<{ patch: string; truncated: boolean }> {
  if (!SHA_PATTERN.test(sha)) throw new GitError("Invalid commit id");
  // SECURITY: ^{commit} peels annotated tags but makes git refuse blob/tree ids —
  // `show <blob> -- .` would ignore the pathspec and print content outside the root
  const out = await runGit(root, ["show", "--format=%h %an %aI%n%s%n", "--patch", `${sha}^{commit}`, "--", "."]);
  const bytes = Buffer.from(out, "utf8");
  if (bytes.byteLength > MAX_PATCH_BYTES) {
    // Byte-accurate cap; strip the replacement char a split code point leaves behind
    return { patch: bytes.subarray(0, MAX_PATCH_BYTES).toString("utf8").replace(/�$/, ""), truncated: true };
  }
  return { patch: out, truncated: false };
}
