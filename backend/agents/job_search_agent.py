import os
import requests
from typing import List
import concurrent.futures

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "").strip()

def _fetch_jobs(query: str, location: str, num_pages: int, platform: str) -> List[dict]:
    if not RAPIDAPI_KEY:
        raise ValueError(
            "Job search API key not configured. Set RAPIDAPI_KEY in Railway environment variables. "
            "Get a free key at rapidapi.com/api/jsearch (JSearch API)."
        )
    url = "https://jsearch.p.rapidapi.com/search"
    
    if platform == "LinkedIn":
        search_query = f"{query} in {location} site:linkedin.com"
    elif platform == "Naukri":
        search_query = f"{query} in {location} site:naukri.com"
    elif platform == "Monster":
        search_query = f"{query} in {location} site:monster.com"
    elif platform == "Foundit":
        search_query = f"{query} in {location} site:foundit.in"
    else:
        search_query = f"{query} in {location}"
        
    querystring = {
        "query": search_query,
        "page": str(num_pages),
        "num_pages": str(num_pages)
    }

    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "jsearch.p.rapidapi.com"
    }

    try:
        response = requests.get(url, headers=headers, params=querystring)
        response.raise_for_status()
        data = response.json()
        
        job_results = []
        for job in data.get('data', []):
            job_results.append({
                "title": job.get("job_title"),
                "company": job.get("employer_name"),
                "description": job.get("job_description"),
                "url": job.get("job_apply_link"),
                "location": f"{job.get('job_city', '')}, {job.get('job_state', '')}, {job.get('job_country', '')}".strip(', '),
                "posted_at": job.get("job_posted_at_datetime_utc"),
                "platform": platform
            })
            
        return job_results
        
    except Exception as e:
        print(f"Error fetching jobs from RapidAPI ({platform}): {e}")
        return []

import time

def search_jobs(query: str, location: str = "remote", num_pages: int = 1) -> List[dict]:
    """
    Searches for jobs using the JSearch API from RapidAPI sequentially to avoid rate limits.
    """
    platforms = ["General", "LinkedIn", "Naukri", "Monster", "Foundit"]
    all_jobs = []
    
    for platform in platforms:
        jobs = _fetch_jobs(query, location, num_pages, platform)
        all_jobs.extend(jobs)
        time.sleep(1.5) # Prevent 429 Too Many Requests on RapidAPI free tier
            
    return all_jobs
