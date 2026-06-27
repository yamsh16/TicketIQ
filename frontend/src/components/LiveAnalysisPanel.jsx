export default function LiveAnalysisPanel({ text }) {
  return (
    <div className="relative animate-fade-up">
      <div className="bg-(--color-panel) border border-(--color-border) rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dashed border-(--color-border)">
          <span className="font-mono text-[11px] tracking-widest uppercase text-(--color-text-faint)">
            ai_analysis.generating
          </span>
          <span className="w-2 h-2 rounded-full bg-(--color-signal) animate-pulse" />
        </div>
        <div className="p-5 min-h-[140px]">
          <p className="text-sm leading-relaxed text-(--color-text)/90 whitespace-pre-wrap">
            {text}
            <span className="inline-block w-[7px] h-4 bg-(--color-signal) ml-1 animate-blink align-text-bottom" />
          </p>
        </div>
      </div>
    </div>
  );
}
