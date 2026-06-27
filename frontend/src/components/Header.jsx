export default function Header({ status }) {
  return (
    <header className="flex items-center justify-between mb-10">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-(--color-panel-raised) border border-(--color-border) flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
            <path
              d="M5 16h6l3-9 6 18 3-9h4"
              stroke="var(--color-signal)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <h1 className="font-display text-lg font-semibold leading-none">TicketIQ</h1>
          <p className="font-mono text-[11px] text-(--color-text-faint) mt-0.5">
            type · queue · priority · root cause
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 font-mono text-[11px] text-(--color-text-muted)">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            status === "online"
              ? "bg-(--color-sev-low)"
              : status === "error"
              ? "bg-(--color-sev-high)"
              : "bg-(--color-text-faint)"
          }`}
        />
        <span className="hidden sm:inline">
          {status === "online" ? "models loaded" : status === "error" ? "backend unreachable" : "checking…"}
        </span>
      </div>
    </header>
  );
}
