const SEGMENTS = 10;

export default function SignalMeter({ value, accent = "var(--color-signal)" }) {
  const filled = Math.round((value / 100) * SEGMENTS);

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-[3px]">
        {Array.from({ length: SEGMENTS }).map((_, i) => (
          <span
            key={i}
            className="block w-[5px] h-3.5 rounded-[1px] transition-colors duration-300"
            style={{
              backgroundColor: i < filled ? accent : "var(--color-border)",
              transitionDelay: `${i * 30}ms`,
            }}
          />
        ))}
      </div>
      <span className="font-mono text-xs text-(--color-text-muted) tabular-nums">
        {value.toFixed(1)}%
      </span>
    </div>
  );
}
