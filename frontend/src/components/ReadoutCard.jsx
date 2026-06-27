import SignalMeter from "./SignalMeter";

export default function ReadoutCard({ label, code, value, confidence, accent, sublabel }) {
  return (
    <div className="bg-(--color-panel) border border-(--color-border) rounded-lg p-4 flex flex-col gap-3 animate-fade-up">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] tracking-widest uppercase text-(--color-text-faint) whitespace-nowrap">
          {code}
        </span>
        {sublabel && (
          <span
            className="font-mono text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ backgroundColor: accent.dim, color: accent.fg }}
          >
            {sublabel}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs text-(--color-text-muted) mb-1">{label}</p>
        <p className="font-display text-xl font-semibold leading-tight break-words">
          {value}
        </p>
      </div>
      <SignalMeter value={confidence} accent={accent.fg} />
    </div>
  );
}
