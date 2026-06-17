from fastapi import APIRouter

router = APIRouter()

@router.get("/search")
def search_jobs(query: str):
    return {"message": f"Job search endpoint for query: {query}"}
