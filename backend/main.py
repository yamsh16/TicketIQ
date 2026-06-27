import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List

from predict import (
    predict_ticket,
    predict_classification,
    stream_ticket_analysis,
    parse_analysis_text,
)

app = FastAPI(title="TicketIQ API")

# Allow the React dev server / any frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TicketRequest(BaseModel):
    text: str


class TicketResponse(BaseModel):
    type: str
    type_confidence: float
    queue: str
    queue_confidence: float
    priority: str
    priority_confidence: float
    average_confidence: float
    root_cause: str
    resolution_steps: List[str]
    preventive_measures: List[str]


@app.get("/")
def health_check():
    return {"status": "ok", "service": "TicketIQ API"}


@app.post("/predict", response_model=TicketResponse)
def predict(req: TicketRequest):
    """Non-streaming endpoint: waits for the full analysis before responding."""

    text = req.text.strip()

    if not text:
        raise HTTPException(status_code=400, detail="Ticket text cannot be empty")

    result = predict_ticket(text)

    return TicketResponse(
        type=result["Type"],
        type_confidence=result["Type Confidence"],
        queue=result["Queue"],
        queue_confidence=result["Queue Confidence"],
        priority=result["Priority"],
        priority_confidence=result["Priority Confidence"],
        average_confidence=round(
            (
                result["Type Confidence"]
                + result["Queue Confidence"]
                + result["Priority Confidence"]
            )
            / 3,
            2,
        ),
        root_cause=result["Root Cause"],
        resolution_steps=result["Resolution Steps"],
        preventive_measures=result["Preventive Measures"],
    )


@app.post("/predict/stream")
def predict_stream(req: TicketRequest):
    """
    Streaming endpoint (NDJSON):
      1. First line  -> {"phase": "classification", ...type/queue/priority...}
      2. Many lines  -> {"phase": "chunk", "text": "..."}  (~3 words each)
      3. Final line  -> {"phase": "done", "root_cause": ..., "resolution_steps": [...], "preventive_measures": [...]}
    """

    text = req.text.strip()

    if not text:
        raise HTTPException(status_code=400, detail="Ticket text cannot be empty")

    def event_stream():
        classification = predict_classification(text)

        yield json.dumps({"phase": "classification", **classification}) + "\n"

        full_text_parts = []

        for chunk in stream_ticket_analysis(
            text,
            classification["type"],
            classification["queue"],
            classification["priority"],
        ):
            full_text_parts.append(chunk)
            yield json.dumps({"phase": "chunk", "text": chunk}) + "\n"

        analysis = parse_analysis_text("".join(full_text_parts))

        yield json.dumps({"phase": "done", **analysis}) + "\n"

    return StreamingResponse(event_stream(), media_type="application/x-ndjson")
