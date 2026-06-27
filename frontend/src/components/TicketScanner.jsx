const PLACEHOLDER = `e.g. User unable to log in after password reset. VPN access not working. Receiving authentication failure on the SSO portal since this morning.`;

export default function TicketScanner({ value, onChange, onSubmit, loading }) {
  const charCount = value.length;

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      onSubmit();
    }
  }

  return (
    <div className="bg-(--color-panel) border border-(--color-border) rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-(--color-border)">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-(--color-sev-low)" />
          <span className="font-mono text-[11px] tracking-widest uppercase text-(--color-text-faint)">
            ticket_input
          </span>
        </div>
        <span className="font-mono text-[11px] text-(--color-text-faint) tabular-nums">
          {charCount} chars
        </span>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={PLACEHOLDER}
        rows={7}
        disabled={loading}
        className="w-full bg-transparent px-4 py-4 text-sm leading-relaxed text-(--color-text) placeholder:text-(--color-text-faint) resize-none outline-none font-body"
      />

      <div className="flex items-center justify-between px-4 py-3 border-t border-(--color-border) bg-(--color-panel-raised)">
        <span className="font-mono text-[11px] text-(--color-text-faint) hidden sm:inline">
          ⌘/ctrl + enter to run
        </span>
        <button
          onClick={onSubmit}
          disabled={loading || !value.trim()}
          className="font-display text-sm font-medium px-5 py-2 rounded-md bg-(--color-signal) text-(--color-bg) disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all active:scale-[0.98]"
        >
          {loading ? "Analyzing…" : "Run analysis"}
        </button>
      </div>
    </div>
  );
}
