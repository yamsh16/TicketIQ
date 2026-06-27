import { useState, useEffect } from "react";
import Header from "./components/Header";
import TicketScanner from "./components/TicketScanner";
import ReadoutCard from "./components/ReadoutCard";
import RoutingSummary from "./components/RoutingSummary";
import AnalysisPanel from "./components/AnalysisPanel";
import LiveAnalysisPanel from "./components/LiveAnalysisPanel";
import { streamClassifyTicket } from "./api";

const ACCENTS = {
  signal: { fg: "var(--color-signal)", dim: "var(--color-signal-dim)" },
  high: { fg: "var(--color-sev-high)", dim: "var(--color-sev-high-dim)" },
  med: { fg: "var(--color-sev-med)", dim: "var(--color-sev-med-dim)" },
  low: { fg: "var(--color-sev-low)", dim: "var(--color-sev-low-dim)" },
};

function priorityAccent(priority) {
  const p = String(priority).toLowerCase();
  if (["critical", "p1", "high"].includes(p)) return ACCENTS.high;
  if (["medium", "p2"].includes(p)) return ACCENTS.med;
  return ACCENTS.low;
}

function priorityLabel(priority) {
  const p = String(priority).toLowerCase();
  if (["critical", "p1", "high"].includes(p)) return "high severity";
  if (["medium", "p2"].includes(p)) return "moderate";
  return "low severity";
}

export default function App() {
  const [ticket, setTicket] = useState("");
  const [classification, setClassification] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [liveText, setLiveText] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL || "http://localhost:8000";
    fetch(`${base}/`)
      .then((r) => (r.ok ? setStatus("online") : setStatus("error")))
      .catch(() => setStatus("error"));
  }, []);

  async function handleSubmit() {
    if (!ticket.trim() || loading || streaming) return;

    setLoading(true);
    setStreaming(false);
    setError(null);
    setClassification(null);
    setAnalysis(null);
    setLiveText("");

    try {
      await streamClassifyTicket(ticket, {
        onClassification: (data) => {
          setClassification(data);
          setLoading(false);
          setStreaming(true);
        },
        onChunk: (text) => {
          setLiveText((prev) => prev + text);
        },
        onDone: (data) => {
          setAnalysis({
            root_cause: data.root_cause,
            resolution_steps: data.resolution_steps,
            preventive_measures: data.preventive_measures,
          });
          setStreaming(false);
        },
      });
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setStreaming(false);
    }
  }

  const showEmptyState = !classification && !loading && !error;

  return (
    <div className="min-h-screen bg-(--color-bg)">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Header status={status} />

        <div className="relative">
          {loading && <div className="scan-line rounded-lg" />}
          <TicketScanner
            value={ticket}
            onChange={setTicket}
            onSubmit={handleSubmit}
            loading={loading || streaming}
          />
        </div>

        {loading && (
          <p className="mt-3 font-mono text-[11px] text-(--color-text-faint) animate-fade-up">
            running classifiers…
          </p>
        )}

        {error && (
          <div className="mt-4 px-4 py-3 rounded-lg border border-(--color-sev-high) bg-(--color-sev-high-dim) text-(--color-sev-high) text-sm font-mono animate-fade-up">
            error: {error}
          </div>
        )}

        {classification && (
          <div className="mt-6 flex flex-col gap-4">
            <RoutingSummary result={classification} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ReadoutCard
                code="01 / type"
                label="Ticket type"
                value={classification.type}
                confidence={classification.type_confidence}
                accent={ACCENTS.signal}
              />
              <ReadoutCard
                code="02 / queue"
                label="Assigned queue"
                value={classification.queue}
                confidence={classification.queue_confidence}
                accent={ACCENTS.signal}
              />
              <ReadoutCard
                code="03 / priority"
                label="Priority"
                value={classification.priority}
                confidence={classification.priority_confidence}
                accent={priorityAccent(classification.priority)}
                sublabel={priorityLabel(classification.priority)}
              />
            </div>

            {streaming && <LiveAnalysisPanel text={liveText} />}

            {analysis && (
              <AnalysisPanel
                rootCause={analysis.root_cause}
                resolutionSteps={analysis.resolution_steps}
                preventiveMeasures={analysis.preventive_measures}
              />
            )}
          </div>
        )}

        {showEmptyState && (
          <div className="mt-6 text-center py-10">
            <p className="font-mono text-xs text-(--color-text-faint)">
              awaiting input — paste a ticket description above and run analysis
            </p>
          </div>
        )}

        <footer className="mt-16 pt-6 border-t border-(--color-border-soft) flex items-center justify-between font-mono text-[11px] text-(--color-text-faint)">
          <span>TicketIQ</span>
          <span className="hidden sm:inline">BERT type/queue/priority · Ollama root-cause analysis</span>
        </footer>
      </div>
    </div>
  );
}
