import type { ContextUsage, ModelChoice, ThinkingLevel } from "@pi-interface/shared";
import { THINKING_LEVELS } from "@pi-interface/shared";

interface ModelBarProps {
  model: string;
  models: ModelChoice[];
  thinkingLevel: string;
  modelSupportsReasoning: boolean;
  isStreaming: boolean;
  contextUsage: ContextUsage | null;
  isCompacting: boolean;
  onSetModel: (provider: string, id: string) => void;
  onSetThinking: (level: ThinkingLevel) => void;
  onCompact: () => void;
}

function contextLabel(usage: ContextUsage | null): string {
  if (!usage || usage.percent === null) return "context";
  return `context ${Math.round(usage.percent)}%`;
}

function contextColor(usage: ContextUsage | null): string {
  if (!usage || usage.percent === null) return "border-zinc-800 text-zinc-400 hover:border-zinc-600";
  if (usage.percent >= 85) return "border-red-900 text-red-400 hover:border-red-600";
  if (usage.percent >= 60) return "border-amber-900 text-amber-400 hover:border-amber-600";
  return "border-zinc-800 text-zinc-400 hover:border-zinc-600";
}

export function ModelBar(props: ModelBarProps) {
  const { model, models, thinkingLevel, modelSupportsReasoning, isStreaming, contextUsage, isCompacting } = props;

  return (
    <div className="mt-2 flex items-center gap-2">
      <select
        value={model}
        onChange={(e) => {
          const choice = models.find((m) => `${m.provider}/${m.id}` === e.target.value);
          if (choice) props.onSetModel(choice.provider, choice.id);
        }}
        disabled={isStreaming}
        className="max-w-64 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-300 outline-none hover:border-zinc-600 disabled:opacity-50"
      >
        {!models.some((m) => `${m.provider}/${m.id}` === model) && <option value={model}>{model}</option>}
        {models.map((m) => (
          <option key={`${m.provider}/${m.id}`} value={`${m.provider}/${m.id}`}>
            {m.provider}/{m.id}
          </option>
        ))}
      </select>

      {modelSupportsReasoning && (
        <select
          value={thinkingLevel}
          onChange={(e) => props.onSetThinking(e.target.value as ThinkingLevel)}
          disabled={isStreaming}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-300 outline-none hover:border-zinc-600 disabled:opacity-50"
          title="thinking level"
        >
          {THINKING_LEVELS.map((level) => (
            <option key={level} value={level}>
              think: {level}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={props.onCompact}
        disabled={isStreaming || isCompacting}
        title={
          contextUsage?.tokens != null
            ? `${contextUsage.tokens.toLocaleString()} / ${contextUsage.contextWindow.toLocaleString()} tokens — click to compact`
            : "Click to compact the conversation context"
        }
        className={`ml-auto rounded-md border px-2 py-1 font-mono text-xs disabled:opacity-50 ${contextColor(contextUsage)}`}
      >
        {isCompacting ? "compacting…" : contextLabel(contextUsage)}
      </button>
    </div>
  );
}
