import pickle
import json
import time
import re
import requests
import torch

from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
)

# =====================================================
# CONFIG
# =====================================================

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2"  # faster than llama3.1 on CPU; change if you've pulled others

# =====================================================
# DEVICE
# =====================================================

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

# =====================================================
# LOAD LABEL ENCODERS
# =====================================================

with open("type_label_encoder.pkl", "rb") as f:
    type_encoder = pickle.load(f)

with open("queue_label_encoder.pkl", "rb") as f:
    queue_encoder = pickle.load(f)

with open("priority_label_encoder.pkl", "rb") as f:
    priority_encoder = pickle.load(f)

# =====================================================
# LOAD MODELS
# =====================================================

# TYPE
type_tokenizer = AutoTokenizer.from_pretrained("type_model")
type_model = AutoModelForSequenceClassification.from_pretrained(
    "type_model"
).to(device)

# QUEUE
queue_tokenizer = AutoTokenizer.from_pretrained("queue_model")
queue_model = AutoModelForSequenceClassification.from_pretrained(
    "queue_model"
).to(device)

# PRIORITY
priority_tokenizer = AutoTokenizer.from_pretrained("priority_model")
priority_model = AutoModelForSequenceClassification.from_pretrained(
    "priority_model"
).to(device)

# =====================================================
# GENERIC CLASSIFICATION FUNCTION
# =====================================================

def classify(text, model, tokenizer, encoder):

    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=128
    )

    inputs = {
        k: v.to(device)
        for k, v in inputs.items()
    }

    model.eval()

    with torch.no_grad():
        outputs = model(**inputs)

    prediction = torch.argmax(
        outputs.logits,
        dim=1
    ).item()

    confidence = torch.softmax(
        outputs.logits,
        dim=1
    )[0][prediction].item()

    label = encoder.inverse_transform(
        [prediction]
    )[0]

    return label, round(confidence * 100, 2)


# =====================================================
# ROOT CAUSE / RESOLUTION / PREVENTION VIA OLLAMA (STREAMING)
# =====================================================

STREAM_PROMPT_TEMPLATE = """You are a senior IT support engineer analyzing a support ticket.

Ticket details:
- Type: {ticket_type}
- Queue: {queue}
- Priority: {priority}

Ticket description:
\"\"\"{ticket_text}\"\"\"

Based on the ticket description and its classification, write a detailed,
technical, ticket-specific analysis. Do NOT write a generic customer-service
reply. Use plain text only (no markdown, no asterisks, no bold) and follow
EXACTLY this structure:

ROOT CAUSE:
<2-4 sentences explaining the most likely technical root cause, referencing
specific details from the ticket>

RESOLUTION STEPS:
1. <first step>
2. <second step>
3. <third step>

PREVENTIVE MEASURES:
1. <first measure>
2. <second measure>
"""


def _fallback_text():
    """Used if Ollama is unreachable or returns an empty/invalid stream."""
    return (
        "ROOT CAUSE:\n"
        "Unable to reach the local LLM (Ollama) to generate a ticket-specific "
        "root cause analysis. Make sure Ollama is running (ollama serve) and "
        f"the model '{OLLAMA_MODEL}' is pulled (ollama pull {OLLAMA_MODEL}).\n\n"
        "RESOLUTION STEPS:\n"
        "1. Verify Ollama is running on http://localhost:11434\n"
        f"2. Run 'ollama pull {OLLAMA_MODEL}' if the model isn't downloaded\n"
        "3. Retry the analysis once Ollama is available\n\n"
        "PREVENTIVE MEASURES:\n"
        "1. Add a health check for the Ollama service on backend startup\n"
    )


def _split_word_chunks(buffer, min_words=3):
    """
    Split `buffer` into chunks of `min_words` words (space/newline separated),
    returning (chunks, remaining_buffer). The remaining buffer holds an
    incomplete trailing chunk so it can be combined with the next batch of
    tokens.
    """
    chunks = []

    while True:
        count = 0
        idx = -1

        for i, ch in enumerate(buffer):
            if ch in (" ", "\n"):
                count += 1
                if count == min_words:
                    idx = i
                    break

        if idx == -1:
            break

        chunks.append(buffer[: idx + 1])
        buffer = buffer[idx + 1:]

    return chunks, buffer


def _chunk_static_text(text, min_words=3):
    """Yield a static string in word-chunks, for streaming the fallback message."""
    buffer = text
    chunks, buffer = _split_word_chunks(buffer, min_words=min_words)
    for chunk in chunks:
        yield chunk
    if buffer:
        yield buffer


def stream_ticket_analysis(ticket_text, ticket_type, queue, priority):
    """
    Generator that yields the AI analysis text in small chunks
    (~3 words at a time) as it is generated by Ollama.
    """

    prompt = STREAM_PROMPT_TEMPLATE.format(
        ticket_type=ticket_type,
        queue=queue,
        priority=priority,
        ticket_text=ticket_text.strip(),
    )

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": True,
                "options": {
                    "temperature": 0.3,
                    "num_predict": 400,
                },
            },
            stream=True,
            timeout=300,
        )
        response.raise_for_status()

        buffer = ""
        got_any_token = False

        for line in response.iter_lines():
            if not line:
                continue

            data = json.loads(line)
            token = data.get("response", "")

            if token:
                got_any_token = True
                buffer += token

                chunks, buffer = _split_word_chunks(buffer, min_words=3)
                for chunk in chunks:
                    yield chunk

            if data.get("done"):
                break

        if buffer:
            yield buffer

        if not got_any_token:
            raise ValueError("Ollama returned an empty stream")

    except (requests.RequestException, json.JSONDecodeError, ValueError) as exc:
        print(f"[TicketIQ] Ollama streaming failed: {type(exc).__name__}: {exc}")
        if isinstance(exc, requests.RequestException) and getattr(exc, "response", None) is not None:
            print(f"[TicketIQ] Ollama response body: {exc.response.text}")
        for chunk in _chunk_static_text(_fallback_text()):
            yield chunk


def parse_analysis_text(text):
    """
    Parse the plain-text ROOT CAUSE / RESOLUTION STEPS / PREVENTIVE MEASURES
    output into structured fields.
    """

    text = text.strip()

    pattern = r"(ROOT CAUSE|RESOLUTION STEPS|PREVENTIVE MEASURES)\s*:?\s*\n"
    parts = re.split(pattern, text, flags=re.IGNORECASE)

    sections = {}
    for i in range(1, len(parts), 2):
        header = parts[i].strip().upper()
        content = parts[i + 1].strip() if i + 1 < len(parts) else ""
        sections[header] = content

    def parse_list(block):
        items = []
        for line in block.splitlines():
            line = line.strip()
            line = re.sub(r"^\d+[\.\)]\s*", "", line)
            line = re.sub(r"^[-*]\s*", "", line)
            if line:
                items.append(line)
        return items

    root_cause = sections.get("ROOT CAUSE", "").strip()

    # Fallback: if no section headers were found at all, treat the whole
    # thing as the root cause text.
    if not sections and text:
        root_cause = text

    return {
        "root_cause": root_cause,
        "resolution_steps": parse_list(sections.get("RESOLUTION STEPS", "")),
        "preventive_measures": parse_list(sections.get("PREVENTIVE MEASURES", "")),
    }


# =====================================================
# CLASSIFICATION (TYPE / QUEUE / PRIORITY)
# =====================================================

def predict_classification(ticket_text):

    print("\n[TicketIQ] " + "=" * 50)
    print(f"[TicketIQ] New ticket received:\n{ticket_text.strip()}\n")

    t0 = time.time()

    ticket_type, type_conf = classify(
        ticket_text,
        type_model,
        type_tokenizer,
        type_encoder
    )
    print(f"[TicketIQ] Type     -> {ticket_type} ({type_conf}%)")

    queue, queue_conf = classify(
        ticket_text,
        queue_model,
        queue_tokenizer,
        queue_encoder
    )
    print(f"[TicketIQ] Queue    -> {queue} ({queue_conf}%)")

    priority, priority_conf = classify(
        ticket_text,
        priority_model,
        priority_tokenizer,
        priority_encoder
    )
    print(f"[TicketIQ] Priority -> {priority} ({priority_conf}%)")

    t1 = time.time()
    print(f"[TicketIQ] Classification done in {t1 - t0:.2f}s. Generating root cause via Ollama ({OLLAMA_MODEL})...")

    avg_conf = round((type_conf + queue_conf + priority_conf) / 3, 2)

    return {
        "type": ticket_type,
        "type_confidence": type_conf,
        "queue": queue,
        "queue_confidence": queue_conf,
        "priority": priority,
        "priority_confidence": priority_conf,
        "average_confidence": avg_conf,
    }


# =====================================================
# MASTER FUNCTION (used for CLI testing / non-streaming use)
# =====================================================

def predict_ticket(ticket_text):

    t0 = time.time()

    classification = predict_classification(ticket_text)

    full_text = "".join(
        stream_ticket_analysis(
            ticket_text,
            classification["type"],
            classification["queue"],
            classification["priority"],
        )
    )

    analysis = parse_analysis_text(full_text)

    t2 = time.time()
    print(f"[TicketIQ] Root cause analysis complete (total {t2 - t0:.2f}s).")
    print("[TicketIQ] " + "=" * 50 + "\n")

    return {
        "Type": classification["type"],
        "Type Confidence": classification["type_confidence"],

        "Queue": classification["queue"],
        "Queue Confidence": classification["queue_confidence"],

        "Priority": classification["priority"],
        "Priority Confidence": classification["priority_confidence"],

        "Root Cause": analysis["root_cause"],
        "Resolution Steps": analysis["resolution_steps"],
        "Preventive Measures": analysis["preventive_measures"],
    }


# TEST

if __name__ == "__main__":

    text = """
    User unable to login after password reset.
    VPN access is not working.
    """

    result = predict_ticket(text)

    print(json.dumps(result, indent=2))
