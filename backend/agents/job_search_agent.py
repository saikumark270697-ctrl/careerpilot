import os
import requests
from typing import List


class QuotaExceeded(ValueError):
    pass


RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "").strip()
ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID", "").strip()
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "").strip()

# Adzuna needs a country slug in the URL. Map common location words; anything
# unrecognized falls back to India (our primary market).
_ADZUNA_COUNTRIES = {
    "india": "in", "hyderabad": "in", "bangalore": "in", "bengaluru": "in",
    "delhi": "in", "mumbai": "in", "chennai": "in", "pune": "in",
    "kolkata": "in", "noida": "in", "gurgaon": "in",
    "telangana": "in", "karnataka": "in", "maharashtra": "in", "tamil nadu": "in",
    "kerala": "in", "gujarat": "in", "rajasthan": "in", "punjab": "in",
    "usa": "us", "united states": "us", "america": "us",
    "california": "us", "texas": "us", "new york": "us", "florida": "us",
    "washington": "us", "seattle": "us", "boston": "us", "chicago": "us",
    "uk": "gb", "united kingdom": "gb", "london": "gb",
    "canada": "ca", "toronto": "ca", "australia": "au", "sydney": "au",
    "singapore": "sg", "germany": "de", "berlin": "de",
    "france": "fr", "netherlands": "nl", "dubai": "ae", "uae": "ae",
}


def _adzuna_country(location: str) -> str:
    loc = location.lower()
    for word, code in _ADZUNA_COUNTRIES.items():
        if word in loc:
            return code
    return "in"


def _fetch_jobs_jsearch(query: str, location: str, page: int = 1) -> List[dict]:
    """One JSearch request. JSearch aggregates LinkedIn, Indeed, Naukri,
    Glassdoor, etc. natively; job_publisher tells us the source board.
    JSearch v5 renamed /search to /search-v2 and nests results under
    data.jobs — try v2 first and fall back to v1 for older subscriptions."""
    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
    }

    response = requests.get(
        "https://jsearch.p.rapidapi.com/search-v2",
        headers=headers,
        params={
            "query": f"{query} in {location}",
            "num_pages": "1",
            "date_posted": "all",
            "country": _adzuna_country(location),
        },
        timeout=30,
    )
    if response.status_code == 404:
        # Older subscriptions only have the v1 endpoint
        response = requests.get(
            "https://jsearch.p.rapidapi.com/search",
            headers=headers,
            params={"query": f"{query} in {location}", "page": str(page), "num_pages": "1"},
            timeout=30,
        )

    if response.status_code == 429:
        raise QuotaExceeded("JSearch monthly quota reached.")
    if response.status_code in (401, 403):
        raise ValueError(
            "Job search API key was rejected. Check RAPIDAPI_KEY in Railway environment variables."
        )
    response.raise_for_status()

    payload = response.json().get("data")
    raw_jobs = payload.get("jobs", []) if isinstance(payload, dict) else (payload or [])

    job_results = []
    for job in raw_jobs:
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


def _fetch_jobs_adzuna(query: str, location: str) -> List[dict]:
    """Adzuna free developer API (~250 calls/day). Location words that aren't a
    country pick the country; the raw location string still narrows results
    via the `where` param."""
    country = _adzuna_country(location)
    url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"
    params = {
        "app_id": ADZUNA_APP_ID,
        "app_key": ADZUNA_APP_KEY,
        "what": query,
        "results_per_page": 20,
        "content-type": "application/json",
    }
    if location.lower() not in ("remote", "anywhere"):
        params["where"] = location

    response = requests.get(url, params=params, timeout=30)
    if response.status_code == 429:
        raise QuotaExceeded("Adzuna daily quota reached.")
    if response.status_code in (401, 403):
        raise ValueError(
            "Adzuna API credentials were rejected. Check ADZUNA_APP_ID and ADZUNA_APP_KEY "
            "in Railway environment variables."
        )
    response.raise_for_status()
    data = response.json()

    job_results = []
    for job in data.get("results", []):
        area = (job.get("location") or {}).get("display_name", "")
        job_results.append({
            "title": job.get("title"),
            "company": (job.get("company") or {}).get("display_name"),
            "description": job.get("description"),
            "url": job.get("redirect_url"),
            "location": area,
            "posted_at": job.get("created"),
            "platform": "Adzuna",
        })
    return job_results


def search_jobs(query: str, location: str = "remote", num_pages: int = 1) -> List[dict]:
    """Try JSearch first, fall back to Adzuna when JSearch is out of quota.
    With both free tiers stacked, job search effectively never goes dark."""
    providers_tried = []

    if RAPIDAPI_KEY:
        try:
            return _fetch_jobs_jsearch(query, location, page=1)
        except QuotaExceeded:
            providers_tried.append("JSearch (quota reached)")
        except Exception as e:
            # Bad key, network error, schema change — log and move on to Adzuna
            print(f"[job_search] JSearch failed, falling back to Adzuna: {e}")
            providers_tried.append("JSearch (error)")

    if ADZUNA_APP_ID and ADZUNA_APP_KEY:
        try:
            return _fetch_jobs_adzuna(query, location)
        except QuotaExceeded:
            providers_tried.append("Adzuna (quota reached)")
        except Exception as e:
            # Never bubble raw request errors up — exception text can contain
            # the request URL with API credentials in it.
            print(f"[job_search] Adzuna failed: {type(e).__name__}")
            providers_tried.append("Adzuna (temporarily unavailable)")

    if providers_tried:
        raise ValueError(
            "Job search is temporarily unavailable — providers failed: "
            + ", ".join(providers_tried)
            + ". Limits reset automatically; please try again later."
        )
    raise ValueError(
        "Job search is not configured. Set RAPIDAPI_KEY (rapidapi.com/api/jsearch) or "
        "ADZUNA_APP_ID + ADZUNA_APP_KEY (developer.adzuna.com) in Railway environment variables."
    )
