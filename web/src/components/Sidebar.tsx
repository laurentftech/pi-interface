import { useEffect } from "react";
import type { DirState, OpenFile } from "../useAgent";
import { FileTree } from "./FileTree";

interface SidebarProps {
  tree: Record<string, DirState>;
  openFile: OpenFile | null;
  /** Writable zone in the tree; see SessionSnapshot.writableRoot. */
  writableRoot?: string | null;
  onExpand: (path: string) => void;
  onSelectFile: (path: string) => void;
}

/** Collapsible file-browser sidebar: lazy tree; selecting a file opens the FileViewer overlay. */
export function Sidebar({ tree, openFile, writableRoot, onExpand, onSelectFile }: SidebarProps) {
  useEffect(() => {
    if (tree[""] === undefined) onExpand("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
      <div className="border-b border-zinc-200 px-3 py-2 text-xs font-semibold uppercase text-zinc-400 dark:border-zinc-800 dark:text-zinc-600">
        Files
      </div>
      <div className="flex-1 overflow-auto p-2">
        <FileTree
          tree={tree}
          openFilePath={openFile?.path}
          writableRoot={writableRoot}
          onExpand={onExpand}
          onSelectFile={onSelectFile}
        />
      </div>
    </aside>
  );
}
