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


class ChatResponse(BaseModel):
    reply: str


@router.post("/", response_model=ChatResponse)
def chat(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages list is required.")

    last_message = request.messages[-1]
    if not last_message.content.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    try:
        reply = chat_with_bot(
            messages=messages,
            resume_text=request.resume_text or "",
            ats_score=request.ats_score,
            jobs_context=request.jobs_context or "",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat agent error: {str(e)}")

    return {"reply": reply}
