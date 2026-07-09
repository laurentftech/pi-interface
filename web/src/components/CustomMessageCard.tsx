import { useState } from "react";
import type { ChatItem } from "@pi-interface/shared";

type CustomItem = Extract<ChatItem, { kind: "custom" }>;

/**
 * Extension-defined message (pi.sendMessage() with a customType). We can't run
 * the extension's own MessageRenderer (a terminal Component) — see
 * extensions.md#message-and-entry-rendering — so this shows the message's
 * `content` as-is (that's already the extension's compact form), and only
 * hides the structured `details` payload behind a toggle.
 */
export function CustomMessageCard({ item }: { item: CustomItem }) {
  const [open, setOpen] = useState(false);
  const hasDetails = item.details !== undefined;

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 text-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex items-start gap-2 px-3 py-2">
        <span className="mt-0.5 shrink-0 font-mono text-xs uppercase text-zinc-400 dark:text-zinc-600">
          {item.customType}
        </span>
        <div className="min-w-0 flex-1 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{item.text}</div>
        {hasDetails && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            title="Show details"
            className="shrink-0 text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-300"
          >
            {open ? "▾" : "▸"}
          </button>
        )}
      </div>
      {open && hasDetails && (
        <pre className="max-h-96 overflow-auto border-t border-zinc-200 px-3 py-2 font-mono text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          {JSON.stringify(item.details, null, 2)}
        </pre>
      )}
    </div>
  );
}
