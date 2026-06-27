export default function RoutingSummary({ result }) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 bg-(--color-panel-raised) border border-(--color-border) rounded-lg px-4 py-3 animate-fade-up"
      style={{ animationDelay: "100ms" }}
    >
      <div className="flex items-center gap-2 font-mono text-xs">
        <span className="text-(--color-text-faint)">route →</span>
        <span className="text-(--color-text)">{result.queue}</span>
        <span className="text-(--color-text-faint)">/</span>
        <span className="text-(--color-text)">{result.type}</span>
        <span className="text-(--color-text-faint)">/</span>
        <span className="text-(--color-text)">{result.priority}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] text-(--color-text-faint) uppercase tracking-widest">
          avg confidence
        </span>
        <span className="font-display text-base font-semibold tabular-nums">
          {result.average_confidence.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
