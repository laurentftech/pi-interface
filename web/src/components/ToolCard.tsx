import { useState } from "react";
import type { ChatItem } from "@pi-outpost/shared";
import { diffLines } from "../diff";
import { DiffBlock, SplitDiffBlock } from "./DiffBlocks";

type ToolItem = Extract<ChatItem, { kind: "tool" }>;

/** One-line summary of tool args (command for bash, path for file tools…). */
function argsSummary(args: unknown): string {
  if (args === null || typeof args !== "object") return "";
  const record = args as Record<string, unknown>;
  const key = ["command", "path", "file_path", "pattern", "query"].find(
    (k) => typeof record[k] === "string",
  );
  if (key) return record[key] as string;
  const json = JSON.stringify(record);
  return json === "{}" ? "" : json;
}

/** The edit tool's before/after pairs, when this call has them. */
function editPairs(item: ToolItem): { oldText: string; newText: string }[] | null {
  if (item.toolName !== "edit" || item.args === null || typeof item.args !== "object") return null;
  const edits = (item.args as { edits?: unknown }).edits;
  if (!Array.isArray(edits)) return null;
  const pairs = edits.filter(
    (e): e is { oldText: string; newText: string } =>
      e !== null && typeof e === "object" && typeof (e as Record<string, unknown>).oldText === "string" && typeof (e as Record<string, unknown>).newText === "string",
  );
  return pairs.length > 0 ? pairs : null;
}

/** The write tool's new content (rendered as an all-additions diff). */
function writeContent(item: ToolItem): string | null {
  if (item.toolName !== "write" || item.args === null || typeof item.args !== "object") return null;
  const content = (item.args as { content?: unknown }).content;
  return typeof content === "string" ? content : null;
}

export function ToolCard({ item }: { item: ToolItem }) {
  const pairs = editPairs(item);
  const written = writeContent(item);
  const hasDiff = pairs !== null || written !== null;
  // Agent file changes matter: show before/after without requiring a click
  const [open, setOpen] = useState(hasDiff);
  const summary = argsSummary(item.args);

  return (
    <div
      className={`rounded-lg border text-sm ${
        item.isError
          ? "border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/20"
          : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${
          item.running ? "animate-pulse motion-reduce:animate-none bg-amber-400" : item.isError ? "bg-red-500" : "bg-emerald-500"
        }`} />
        <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">{item.toolName}</span>
        {summary && (
          <span className="truncate font-mono text-xs text-zinc-500">{summary}</span>
        )}
        <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-600">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
          {pairs !== null && (
            <div className="mb-2 flex flex-col gap-2">
              {pairs.map((pair, i) => (
                <SplitDiffBlock key={i} lines={diffLines(pair.oldText, pair.newText)} />
              ))}
            </div>
          )}
          {written !== null && (
            <div className="mb-2">
              <DiffBlock lines={written.split("\n").map((text) => ({ type: "add" as const, text }))} />
            </div>
          )}
          {hasDiff || summary === "" || (
            <pre className="mb-2 overflow-x-auto font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {JSON.stringify(item.args, null, 2)}
            </pre>
          )}
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs text-zinc-700 dark:text-zinc-300">
            {item.output || (item.running ? "running…" : "(no output)")}
          </pre>
        </div>
      )}
    </div>
  );
}
