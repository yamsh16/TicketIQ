function Section({ code, dotColor, children }) {
  return (
    <div className="border-b border-dashed border-(--color-border) last:border-b-0">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="font-mono text-[11px] tracking-widest uppercase text-(--color-text-faint)">
          {code}
        </span>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

function StepList({ items, numbered = true }) {
  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-(--color-text-faint) font-mono">— none provided —</p>
    );
  }

  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-(--color-text)/90">
          <span className="font-mono text-xs text-(--color-text-faint) mt-0.5 shrink-0 w-5 text-right">
            {numbered ? `${i + 1}.` : "—"}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

export default function AnalysisPanel({ rootCause, resolutionSteps, preventiveMeasures }) {
  return (
    <div className="relative animate-fade-up" style={{ animationDelay: "200ms" }}>
      <div className="bg-(--color-panel) border border-(--color-border) rounded-lg overflow-hidden">
        <Section code="04 / root_cause.analysis" dotColor="var(--color-signal)">
          <p className="text-sm leading-relaxed text-(--color-text)/90 whitespace-pre-wrap">
            {rootCause}
          </p>
        </Section>

        <Section code="05 / resolution.steps" dotColor="var(--color-sev-low)">
          <StepList items={resolutionSteps} />
        </Section>

        <Section code="06 / preventive.measures" dotColor="var(--color-text-muted)">
          <StepList items={preventiveMeasures} numbered={false} />
        </Section>
      </div>
    </div>
  );
}
