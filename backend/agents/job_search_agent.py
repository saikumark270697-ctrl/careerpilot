import os
import requests
from typing import List

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "").strip()


def _fetch_jobs(query: str, location: str, page: int = 1) -> List[dict]:
    """One JSearch request. JSearch already aggregates LinkedIn, Indeed, Naukri,
    Glassdoor, etc. natively — job_publisher tells us the source board, so a
    single plain query replaces the old 5x site:-filtered fan-out and uses 5x
    less of the monthly quota."""
    if not RAPIDAPI_KEY:
        raise ValueError(
            "Job search API key not configured. Set RAPIDAPI_KEY in Railway environment variables. "
            "Get a free key at rapidapi.com/api/jsearch (JSearch API)."
        )
    url = "https://jsearch.p.rapidapi.com/search"
    querystring = {
        "query": f"{query} in {location}",
        "page": str(page),
        "num_pages": "1",
    }
    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
    }

    response = requests.get(url, headers=headers, params=querystring, timeout=30)

    if response.status_code == 429:
        remaining = response.headers.get("X-RateLimit-Requests-Remaining", "")
        if remaining == "0":
            raise ValueError(
                "Monthly job search quota reached on the free JSearch plan. "
                "It resets automatically each month, or upgrade the plan at rapidapi.com/api/jsearch."
            )
        raise ValueError("Job search rate limit hit. Please wait a minute and try again.")
    if response.status_code in (401, 403):
        raise ValueError(
            "Job search API key was rejected. Check RAPIDAPI_KEY in Railway environment variables."
        )
    response.raise_for_status()
    data = response.json()

    job_results = []
    for job in data.get("data", []):
        job_results.append({
            "title": job.get("job_title"),
            "company": job.get("employer_name"),
            "description": job.get("job_description"),
            "url": job.get("job_apply_link"),
            "location": f"{job.get('job_city', '')}, {job.get('job_state', '')}, {job.get('job_country', '')}".strip(', '),
            "posted_at": job.get("job_posted_at_datetime_utc"),
            "platform": job.get("job_publisher") or "Job Board",
        })
    return job_results


def search_jobs(query: str, location: str = "remote", num_pages: int = 1) -> List[dict]:
    """Search jobs with a single aggregated JSearch query per location."""
    return _fetch_jobs(query, location, page=1)
