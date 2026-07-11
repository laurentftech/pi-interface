import { useState } from "react";
import type { DirEntry, GitFileState } from "@pi-outpost/shared";
import type { DirState } from "../useAgent";

interface TreeProps {
  tree: Record<string, DirState>;
  openFilePath?: string;
  /** Writable zone; see SessionSnapshot.writableRoot. Entries outside it render dimmed. */
  writableRoot?: string | null;
  /** Git status per browser-root-relative path; badges render from it. */
  gitFiles?: Record<string, GitFileState>;
  onExpand: (path: string) => void;
  onSelectFile: (path: string) => void;
}

const GIT_BADGE: Record<GitFileState, { label: string; className: string }> = {
  modified: { label: "M", className: "text-amber-600 dark:text-amber-400" },
  added: { label: "A", className: "text-emerald-600 dark:text-emerald-400" },
  untracked: { label: "U", className: "text-emerald-600 dark:text-emerald-400" },
  deleted: { label: "D", className: "text-red-600 dark:text-red-400" },
  conflicted: { label: "C", className: "text-purple-600 dark:text-purple-400" },
};

/** Any git-changed file at or under this directory path? (drives the ● dot on directories) */
function dirHasChanges(dirPath: string, gitFiles: Record<string, GitFileState> | undefined): boolean {
  if (!gitFiles) return false;
  return Object.keys(gitFiles).some((p) => p.startsWith(`${dirPath}/`));
}

function isDir(type: DirEntry["type"]): boolean {
  return type === "directory" || type === "symlink-directory";
}

/** undefined writableRoot = no sandbox, nothing to dim; null = the whole tree is read-only. */
function isReadOnly(fullPath: string, writableRoot: string | null | undefined): boolean {
  if (writableRoot === undefined) return false;
  if (writableRoot === null) return true;
  if (writableRoot === "") return false;
  return fullPath !== writableRoot && !fullPath.startsWith(`${writableRoot}/`);
}

function DirChildren({ path, depth, ...props }: TreeProps & { path: string; depth: number }) {
  const state = props.tree[path];
  if (state === undefined) return null;
  if (state === "loading") {
    return (
      <div style={{ paddingLeft: depth * 12 + 4 }} className="py-0.5 text-xs text-zinc-400 dark:text-zinc-600">
        loading…
      </div>
    );
  }
  if ("error" in state) {
    return (
      <div style={{ paddingLeft: depth * 12 + 4 }} className="py-0.5 text-xs text-red-600 dark:text-red-400">
        {state.error}
      </div>
    );
  }
  if (state.length === 0) {
    return (
      <div style={{ paddingLeft: depth * 12 + 4 }} className="py-0.5 text-xs text-zinc-400 dark:text-zinc-600">
        empty
      </div>
    );
  }
  return (
    <>
      {state.map((entry) => (
        <TreeNode key={entry.name} parentPath={path} entry={entry} depth={depth} {...props} />
      ))}
    </>
  );
}

function TreeNode({
  parentPath,
  entry,
  depth,
  ...props
}: TreeProps & { parentPath: string; entry: DirEntry; depth: number }) {
  const [open, setOpen] = useState(false);
  const fullPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
  const readOnly = isReadOnly(fullPath, props.writableRoot);

  if (isDir(entry.type)) {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            const next = !open;
            setOpen(next);
            if (next && props.tree[fullPath] === undefined) props.onExpand(fullPath);
          }}
          style={{ paddingLeft: depth * 12 }}
          className="flex w-full items-center gap-1 rounded py-0.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <span className="w-3 shrink-0 text-xs text-zinc-400 dark:text-zinc-600">{open ? "▾" : "▸"}</span>
          <span
            className={`truncate ${readOnly ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-700 dark:text-zinc-300"}`}
          >
            {entry.name}
          </span>
          {!open && dirHasChanges(fullPath, props.gitFiles) && (
            <span className="ml-1 shrink-0 text-[10px] text-amber-500" title="contains changes">
              ●
            </span>
          )}
        </button>
        {open && <DirChildren path={fullPath} depth={depth + 1} {...props} />}
      </div>
    );
  }

  const selected = fullPath === props.openFilePath;
  return (
    <button
      type="button"
      onClick={() => props.onSelectFile(fullPath)}
      style={{ paddingLeft: depth * 12 + 16 }}
      className={`flex w-full items-center rounded py-0.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
        selected ? "bg-zinc-100 dark:bg-zinc-800" : ""
      }`}
    >
      <span className={`truncate ${readOnly ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-600 dark:text-zinc-400"}`}>
        {entry.name}
      </span>
      {props.gitFiles?.[fullPath] && (
        <span className={`ml-1 shrink-0 font-mono text-xs font-bold ${GIT_BADGE[props.gitFiles[fullPath]].className}`}>
          {GIT_BADGE[props.gitFiles[fullPath]].label}
        </span>
      )}
    </button>
  );
}

/** Lazily-loaded file/directory tree for the sidebar. */
export function FileTree(props: TreeProps) {
  return (
    <div className="text-sm">
      <DirChildren path="" depth={0} {...props} />
    </div>
  );
}
