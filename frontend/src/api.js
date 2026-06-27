const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Stream a ticket analysis via NDJSON.
 *
 * Calls:
 *  - onClassification(data) once, as soon as type/queue/priority are ready
 *  - onChunk(text) repeatedly, as the AI analysis is generated (~3 words at a time)
 *  - onDone(data) once, with the final parsed root_cause / resolution_steps / preventive_measures
 */
export async function streamClassifyTicket(text, { onClassification, onChunk, onDone }) {
  const res = await fetch(`${API_BASE}/predict/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || `Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const msg = JSON.parse(line);

      if (msg.phase === "classification") onClassification?.(msg);
      else if (msg.phase === "chunk") onChunk?.(msg.text);
      else if (msg.phase === "done") onDone?.(msg);
    }
  }

  // Handle any trailing line without a newline
  if (buffer.trim()) {
    const msg = JSON.parse(buffer);
    if (msg.phase === "classification") onClassification?.(msg);
    else if (msg.phase === "chunk") onChunk?.(msg.text);
    else if (msg.phase === "done") onDone?.(msg);
  }
}
