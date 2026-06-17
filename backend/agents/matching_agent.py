import os
from openai import OpenAI
from typing import List, Dict, Optional

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = "career-copilot-jobs"
DIMENSION = 1536
EMBEDDING_MODEL = "openai/text-embedding-3-small"

_client: Optional[OpenAI] = None
_index = None
_index_initialized = False


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("OPENROUTER_API_KEY") or "dummy_key"
        _client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
        )
    return _client


def _get_pinecone_index():
    global _index, _index_initialized
    if _index_initialized:
        return _index

    _index_initialized = True
    if not PINECONE_API_KEY:
        return None

    try:
        from pinecone import Pinecone, ServerlessSpec

        pc = Pinecone(api_key=PINECONE_API_KEY)
        if INDEX_NAME not in pc.list_indexes().names():
            pc.create_index(
                name=INDEX_NAME,
                dimension=DIMENSION,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1"),
            )
        _index = pc.Index(INDEX_NAME)
    except Exception as e:
        print(f"Pinecone unavailable, using fallback matching: {e}")
        _index = None

    return _index


def get_embedding(text: str) -> List[float]:
    try:
        response = _get_client().embeddings.create(
            input=text,
            model=EMBEDDING_MODEL,
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Error getting embedding: {e}")
        return [0.0] * DIMENSION

def get_embeddings(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []
    try:
        response = _get_client().embeddings.create(
            input=texts,
            model=EMBEDDING_MODEL,
        )
        return [item.embedding for item in response.data]
    except Exception as e:
        print(f"Error getting embeddings: {e}")
        return [[0.0] * DIMENSION for _ in texts]


def match_jobs_to_resume(resume_details: dict, jobs: List[dict], top_k: int = 5) -> List[Dict]:
    index = _get_pinecone_index()
    if not jobs or not index:
        return []

    resume_text = (
        f"Skills: {', '.join(resume_details.get('skills', []))}. "
        f"Summary: {resume_details.get('summary', '')}"
    )
    
    # Get embedding for resume and all jobs in batch
    all_texts = [resume_text]
    for job in jobs:
        all_texts.append(f"Title: {job.get('title')}. Description: {job.get('description', '')}")
        
    all_embeddings = get_embeddings(all_texts)
    resume_vector = all_embeddings[0]
    job_vectors = all_embeddings[1:]

    vectors_to_upsert = []
    for job, vec in zip(jobs, job_vectors):
        job_id = f"job_{hash(job.get('title', '') + job.get('company', ''))}"
        metadata = {
            "title": job.get("title", ""),
            "company": job.get("company", ""),
            "url": job.get("url", ""),
            "location": job.get("location", ""),
            "description": str(job.get("description", ""))[:1000],
            "platform": job.get("platform", "General"),
            "posted_at": job.get("posted_at", ""),
        }
        vectors_to_upsert.append((job_id, vec, metadata))

    if vectors_to_upsert:
        try:
            index.upsert(vectors=vectors_to_upsert)
        except Exception as e:
            print(f"Error upserting to Pinecone: {e}")
            return []

    try:
        search_results = index.query(
            vector=resume_vector,
            top_k=min(top_k, len(jobs)),
            include_metadata=True,
        )
    except Exception as e:
        print(f"Error querying Pinecone: {e}")
        return []

    matched_jobs = []
    for match in search_results.get("matches", []):
        metadata = match.get("metadata", {})
        matched_jobs.append({
            "title": metadata.get("title"),
            "company": metadata.get("company"),
            "url": metadata.get("url"),
            "location": metadata.get("location"),
            "description": metadata.get("description"),
            "platform": metadata.get("platform", "General"),
            "posted_at": metadata.get("posted_at") or None,
            "match_score": round(match.get("score", 0.0), 4),
        })

    return matched_jobs


def fallback_match_jobs(resume_details: dict, jobs: List[dict], top_k: int = 10) -> List[Dict]:
    """Simple skill-overlap scoring when vector search is unavailable."""
    skills = [s.lower() for s in resume_details.get("skills", []) if s]
    query = resume_details.get("job_search_query", "").lower()
    scored = []

    for i, job in enumerate(jobs):
        text = f"{job.get('title', '')} {job.get('description', '')}".lower()
        overlap = sum(1 for skill in skills if skill in text)
        title_bonus = 0.3 if query and query in job.get("title", "").lower() else 0
        score = min(1.0, (overlap / max(len(skills), 1)) + title_bonus)
        scored.append({**job, "match_score": round(score, 4), "id": i})

    scored.sort(key=lambda item: item["match_score"], reverse=True)
    return scored[:top_k]
