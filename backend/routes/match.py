from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from agents.resume_agent import extract_resume_details
from agents.job_search_agent import search_jobs
from agents.matching_agent import match_jobs_to_resume, fallback_match_jobs
from agents.auto_apply_agent import auto_apply_to_job

router = APIRouter()


class MatchRequest(BaseModel):
    resume_text: str
    target_role: Optional[str] = ""
    location: str = "remote"


class JobMatch(BaseModel):
    id: Optional[int] = None
    title: str
    company: str
    description: Optional[str] = None
    url: Optional[str] = None
    location: Optional[str] = None
    match_score: float
    platform: str = "General"
    posted_at: Optional[str] = None


class MatchResponse(BaseModel):
    jobs: List[JobMatch]
    search_query: str
    resume_summary: str
    ats_score: int
    feedback: List[str]


class AutoApplyRequest(BaseModel):
    job_url: str
    resume_text: str


@router.post("/find", response_model=MatchResponse)
def find_job_matches(request: MatchRequest):
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="Resume text is required.")

    resume_details = extract_resume_details(request.resume_text, request.target_role)
    search_query = (
        resume_details.get("job_search_query")
        or request.target_role
        or resume_details.get("summary")
        or "software engineer"
    )

    live_jobs = search_jobs(search_query, location=request.location, num_pages=1)
    if not live_jobs:
        # If no live jobs, return the ATS score anyway with an empty list
        matched_jobs = []
    else:
        matched_jobs = match_jobs_to_resume(resume_details, live_jobs, top_k=15)
        if not matched_jobs:
            matched_jobs = fallback_match_jobs(resume_details, live_jobs, top_k=15)

    return {
        "jobs": matched_jobs,
        "search_query": search_query,
        "resume_summary": resume_details.get("summary", ""),
        "ats_score": resume_details.get("overall_ats_score", 0),
        "feedback": resume_details.get("feedback_breakdown", []),
    }


@router.post("/auto-apply")
async def apply_to_job(request: AutoApplyRequest):
    if not request.job_url:
        raise HTTPException(status_code=400, detail="Job URL is required.")
        
    # Extract candidate basic info for the auto apply agent
    candidate_details = extract_resume_details(request.resume_text)
    
    # Run the playwright agent
    result = await auto_apply_to_job(request.job_url, candidate_details)
    
    if result.get("status") == "REQUIRES_MANUAL_ACTION":
        return {"status": "success", "message": "Form parsed, but manual review is needed.", "logs": result.get("logs")}
        
    return result


@router.post("/score")
def match_resume_to_job():
    return {"message": "Use POST /api/match/find with resume_text instead."}

