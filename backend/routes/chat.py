import os
import traceback
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from agents.chat_agent import chat_with_bot

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    resume_text: Optional[str] = ""
    ats_score: Optional[int] = None
    jobs_context: Optional[str] = ""
    is_guest: Optional[bool] = False

    class Config:
        extra = "ignore"


class ChatResponse(BaseModel):
    reply: str


@router.post("/", response_model=ChatResponse)
def chat(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages list is required.")

    last_message = request.messages[-1]
    if not last_message.content.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")

    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    openrouter_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if not groq_key and not openrouter_key:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. GROQ_API_KEY is missing from environment variables."
        )

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    try:
        reply = chat_with_bot(
            messages=messages,
            resume_text=request.resume_text or "",
            ats_score=request.ats_score,
            jobs_context=request.jobs_context or "",
        )
        return {"reply": reply}
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        error_msg = str(e)
        print(f"[chat] LLM error: {error_msg}")
        traceback.print_exc()
        if "401" in error_msg or "authentication" in error_msg.lower() or "api_key" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail="Invalid GROQ_API_KEY. Please regenerate your key at console.groq.com and update it in Railway environment variables."
            )
        if "429" in error_msg or "rate" in error_msg.lower():
            raise HTTPException(status_code=429, detail="Groq rate limit reached. Please wait a moment and try again.")
        if "model" in error_msg.lower() and ("not found" in error_msg.lower() or "deprecated" in error_msg.lower()):
            raise HTTPException(status_code=503, detail=f"Model error: {error_msg}")
        raise HTTPException(status_code=500, detail=f"LLM error: {error_msg}")
