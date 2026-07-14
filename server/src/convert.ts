/**
 * Conversion from SDK AgentMessage history to wire ChatItems.
 */
import type { AssistantBlock, ChatItem, WireImage } from "@pi-outpost/shared";

const MAX_TOOL_OUTPUT = 20_000;

interface AnyContent {
  type: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  arguments?: Record<string, unknown>;
  data?: string;
  mimeType?: string;
}

interface AnyMessage {
  role: string;
  content: string | AnyContent[];
  errorMessage?: string;
  toolCallId?: string;
  toolName?: string;
  isError?: boolean;
  customType?: string;
  details?: unknown;
  /** Whether the message is shown in the transcript vs. sent to the LLM only. */
  display?: boolean;
}

export function contentText(content: string | AnyContent[] | undefined): string {
  if (content === undefined) return "";
  if (typeof content === "string") return content;
  return content
    .map((c) => {
      if (c.type === "text") return c.text ?? "";
      if (c.type === "image") return "[image]";
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

export function truncate(text: string, max = MAX_TOOL_OUTPUT): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n… [truncated, ${text.length} chars total]`;
}

/**
 * Heuristic summarizer for JSON tool results. Returns a short markdown-ish
 * `text` plus the full parsed `details` when successful, or `null` when the
 * payload isn't JSON or doesn't match expected shapes.
 */
export function summarizeToolResult(toolName: string | undefined, raw?: string): { text: string; details?: unknown } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || (typeof parsed !== "object" && !Array.isArray(parsed))) return null;
    const lines: string[] = [];
    if ((parsed as any).title) lines.push(`**${String((parsed as any).title)}**`);
    if ((parsed as any).task) lines.push(`**${String((parsed as any).task)}**`);
    if ((parsed as any).summary) lines.push(String((parsed as any).summary));
    if (Array.isArray((parsed as any).relevantFiles) && (parsed as any).relevantFiles.length > 0) {
      lines.push(`\nRelevant files:`);
      for (const f of ((parsed as any).relevantFiles as string[]).slice(0, 5)) lines.push(`- ${f}`);
    }
    if (Array.isArray((parsed as any).relevantFunctions) && (parsed as any).relevantFunctions.length > 0) {
      lines.push(`\nRelevant functions:`);
      for (const fn of ((parsed as any).relevantFunctions as any[]).slice(0, 5)) {
        if (fn && fn.name) lines.push(`- ${fn.name} (${fn.filePath ?? fn.file ?? 'unknown'})`);
        else lines.push(`- ${String(fn)}`);
      }
    }
    if (Array.isArray((parsed as any).nextSteps) && (parsed as any).nextSteps.length > 0) {
      lines.push(`\nNext steps:`);
      for (const s of ((parsed as any).nextSteps as string[]).slice(0, 5)) lines.push(`- ${s}`);
    }
    const summary = lines.join("\n").trim() || JSON.stringify(parsed, null, 2);
    return { text: summary, details: parsed };
  } catch (e) {
    return null;
  }
}

function assistantBlocks(content: string | AnyContent[]): AssistantBlock[] {
  const blocks: AssistantBlock[] = [];
  if (!Array.isArray(content)) return blocks;
  content.forEach((c, contentIndex) => {
    if (c.type === "text" && c.text) {
      blocks.push({ type: "text", text: c.text, contentIndex });
    } else if (c.type === "thinking" && c.thinking) {
      blocks.push({ type: "thinking", text: c.thinking, contentIndex });
    }
  });
  return blocks;
}

/**
 * Convert session history to chat items. Tool results are merged with the
 * originating toolCall (matched by id) so the UI shows one card per tool run.
 *
 * When `streaming` is true (mid-stream connect):
 * - the trailing partial assistant message (pushed into session.messages at
 *   message_start) is marked `streaming` so deltas route to it;
 * - toolCalls without a result yet become running tool cards.
 *
 * `userEntryIds` are the session entry ids of the user messages on the current
 * branch, oldest first. They are matched to the emitted user items from the END:
 * compaction drops a prefix of the history, so the items are a suffix of the
 * branch. Items left unmatched simply carry no entryId (edit stays disabled).
 */
export function historyToItems(messages: AnyMessage[], streaming = false, userEntryIds: string[] = []): ChatItem[] {
  const items: ChatItem[] = [];
  const userItems: Extract<ChatItem, { kind: "user" }>[] = [];
  const pendingCalls = new Map<string, { name: string; args: unknown }>();
  // Item emitted for the trailing message, when that message is assistant
  let trailingAssistantItem: Extract<ChatItem, { kind: "assistant" }> | undefined;

  for (const message of messages) {
    trailingAssistantItem = undefined;
    switch (message.role) {
      case "user": {
        // Text only — images render as thumbnails, no "[image]" marker needed
        const text =
          typeof message.content === "string"
            ? message.content
            : Array.isArray(message.content)
              ? message.content
                  .filter((c) => c.type === "text")
                  .map((c) => c.text ?? "")
                  .filter(Boolean)
                  .join("\n")
              : "";
        const images: WireImage[] = Array.isArray(message.content)
          ? message.content
              .filter((c) => c.type === "image" && c.data && c.mimeType)
              .map((c) => ({ data: c.data as string, mimeType: c.mimeType as string }))
          : [];
        if (text || images.length > 0) {
          const item: Extract<ChatItem, { kind: "user" }> = {
            kind: "user",
            text,
            ...(images.length > 0 ? { images } : {}),
          };
          items.push(item);
          userItems.push(item);
        }
        break;
      }
      case "assistant": {
        const content = Array.isArray(message.content) ? message.content : [];
        for (const c of content) {
          if (c.type === "toolCall" && c.id && c.name) {
            pendingCalls.set(c.id, { name: c.name, args: c.arguments });
          }
        }
        const blocks = assistantBlocks(message.content);
        if (blocks.length > 0 || message.errorMessage) {
          trailingAssistantItem = {
            kind: "assistant",
            blocks,
            ...(message.errorMessage ? { errorMessage: message.errorMessage } : {}),
          };
          items.push(trailingAssistantItem);
        }
        break;
      }
      case "toolResult": {
        const call = message.toolCallId ? pendingCalls.get(message.toolCallId) : undefined;
        if (message.toolCallId) pendingCalls.delete(message.toolCallId);

        // Special-case openlore tool results: they return structured JSON useful for
        // machine consumption, but we should present a concise human-readable
        // summary in the UI while keeping the full payload in a collapsed `details`.
        const raw = typeof message.content === "string" ? message.content : undefined;
        if (raw && (call?.name?.startsWith("openlore") || message.toolName?.startsWith("openlore"))) {
          try {
            const parsed = JSON.parse(raw);
            // Build a short markdown-ish summary
            const lines: string[] = [];
            if (parsed.task) lines.push(`**${String(parsed.task)}**`);
            if (parsed.searchMode) lines.push(`Mode: ${String(parsed.searchMode)}`);
            if (Array.isArray(parsed.relevantFiles) && parsed.relevantFiles.length > 0) {
              lines.push(`\nRelevant files:`);
              for (const f of (parsed.relevantFiles as string[]).slice(0, 5)) lines.push(`- ${f}`);
            }
            if (Array.isArray(parsed.relevantFunctions) && parsed.relevantFunctions.length > 0) {
              lines.push(`\nRelevant functions:`);
              for (const fn of (parsed.relevantFunctions as any[]).slice(0, 5)) {
                if (fn && fn.name) lines.push(`- ${fn.name} (${fn.filePath ?? fn.file ?? 'unknown'})`);
                else lines.push(`- ${String(fn)}`);
              }
            }
            if (Array.isArray(parsed.nextSteps) && parsed.nextSteps.length > 0) {
              lines.push(`\nNext steps:`);
              for (const s of (parsed.nextSteps as string[]).slice(0, 5)) lines.push(`- ${s}`);
            }
            const summary = lines.join("\n").trim() || JSON.stringify(parsed, null, 2);
            items.push({
              kind: "custom",
              customType: message.toolName ?? call?.name ?? "openlore",
              text: summary,
              details: parsed,
            });
            break;
          } catch (e) {
            // fall through to default behavior
          }
        }

        items.push({
          kind: "tool",
          toolCallId: message.toolCallId ?? "",
          toolName: message.toolName ?? call?.name ?? "tool",
          args: call?.args ?? {},
          output: truncate(contentText(message.content)),
          isError: message.isError ?? false,
        });
        break;
      }
      case "custom": {
        // display:false means "context for the LLM only" — the TUI hides those too
        const text = message.display ? contentText(message.content) : "";
        if (text) items.push(customMessageToItem(message));
        break;
      }
      default:
        // compaction/branch summaries, bash executions — skipped in v1
        break;
    }
  }

  // Right-align: the last user item is the last user entry of the branch
  for (let i = 1; i <= Math.min(userItems.length, userEntryIds.length); i++) {
    userItems[userItems.length - i].entryId = userEntryIds[userEntryIds.length - i];
  }

  if (streaming && messages[messages.length - 1]?.role === "assistant") {
    // The SDK pushes the partial assistant message at message_start, possibly
    // with zero blocks (TTFT window). Mark it — or materialize it when empty —
    // so client deltas route here, never to an earlier complete message.
    if (trailingAssistantItem) {
      trailingAssistantItem.streaming = true;
    } else {
      items.push({ kind: "assistant", blocks: [], streaming: true });
    }
  }
  if (streaming) {
    // toolCalls still executing (no result yet) → running cards
    for (const [toolCallId, call] of pendingCalls) {
      items.push({
        kind: "tool",
        toolCallId,
        toolName: call.name,
        args: call.args,
        output: "",
        running: true,
      });
    }
  }

  return items;
}

/** Convert a final assistant message to a ChatItem (for assistant_end sync). */
export function assistantToItem(message: AnyMessage): ChatItem {
  return {
    kind: "assistant",
    blocks: assistantBlocks(message.content),
    ...(message.errorMessage ? { errorMessage: message.errorMessage } : {}),
  };
}

/**
 * Convert an extension-defined custom message (pi.sendMessage() with a
 * customType) to a ChatItem. We don't run the extension's MessageRenderer
 * (a terminal Component, not renderable in the browser) — just the plain
 * text content, with `details` along for an optional expanded view.
 */
export function customMessageToItem(message: AnyMessage): ChatItem {
  console.log("[DEBUG] customMessageToItem called:", {
    customType: message.customType,
    contentType: typeof message.content,
    contentLength: typeof message.content === "string" ? message.content.length : Array.isArray(message.content) ? message.content.length : "unknown",
    detailsKeys: message.details ? Object.keys(message.details) : "none",
  });
  return {
    kind: "custom",
    customType: message.customType ?? "custom",
    text: contentText(message.content),
    ...(message.details !== undefined ? { details: message.details } : {}),
  };
}
