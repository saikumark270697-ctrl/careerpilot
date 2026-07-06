from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from database import engine, Base
import models  # noqa: F401 — ensures all tables register with Base before create_all
from routes import resume, jobs, match, chat, auth
import os
import sys
import asyncio

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Career Copilot API")


@app.middleware("http")
async def honor_forwarded_proto(request, call_next):
    """Railway terminates TLS at the edge and forwards plain HTTP internally.
    Without this, FastAPI's automatic trailing-slash redirects point to http://,
    which browsers block as an HTTPS->HTTP downgrade ("Failed to fetch").
    Trust the x-forwarded-proto header so any redirect keeps the https scheme."""
    proto = request.headers.get("x-forwarded-proto")
    if proto:
        request.scope["scheme"] = proto
    return await call_next(request)


# ── Security headers ─────────────────────────────────────────────────────────
@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    if request.url.path.startswith("/api"):
        # Keep API responses out of search engines entirely
        response.headers.setdefault("X-Robots-Tag", "noindex, nofollow")
    return response


# ── Rate limiting (in-memory sliding window per client IP) ──────────────────
# Blunt-force protection for login brute-forcing and quota-draining scripts.
_RATE_LIMITS = {
    "/api/auth": (15, 60),     # 15 requests / 60s — stops password brute force
    "/api/chat": (20, 60),     # LLM quota protection
    "/api/match": (6, 60),     # RapidAPI quota protection
    "/api/resume": (10, 60),
}
_rate_buckets: dict = {}
_RATE_BUCKET_CAP = 10000  # drop everything if an attacker rotates IPs to bloat memory


def _client_ip(request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@app.middleware("http")
async def rate_limiter(request, call_next):
    path = request.url.path
    for prefix, (limit, window) in _RATE_LIMITS.items():
        if path.startswith(prefix):
            import time as _time
            now = _time.monotonic()
            key = f"{_client_ip(request)}:{prefix}"
            if len(_rate_buckets) > _RATE_BUCKET_CAP:
                _rate_buckets.clear()
            bucket = _rate_buckets.setdefault(key, [])
            bucket[:] = [t for t in bucket if now - t < window]
            if len(bucket) >= limit:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please slow down and try again in a minute."},
                    headers={"Retry-After": str(window)},
                )
            bucket.append(now)
            break
    return await call_next(request)


# ── CORS: only the real frontend origins, not the whole internet ────────────
_default_origins = (
    "https://careerpilot-production-31bf.up.railway.app,"
    "http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173"
)
ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# API routes — must be registered BEFORE the static file mount
app.include_router(resume.router, prefix="/api/resume", tags=["Resume"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(match.router, prefix="/api/match", tags=["Match"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])


@app.get("/api/health", tags=["Health"])
def health_check():
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    openrouter_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    db_url = os.getenv("DATABASE_URL", "").strip()

    status = {
        "status": "ok",
        "groq_api_key": "set" if groq_key else "MISSING",
        "openrouter_api_key": "set" if openrouter_key else "not set",
        "database_url": "set" if db_url else "MISSING",
        "ai_provider": "groq" if groq_key else ("openrouter" if openrouter_key else "NONE"),
    }

    if not groq_key and not openrouter_key:
        return JSONResponse(status_code=503, content={**status, "status": "degraded", "error": "No LLM API key set"})

    return status

# Serve built React frontend (production only — not present locally)
_frontend_dist = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist')
if os.path.isdir(_frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(_frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        # Let API routes handle /api/* — this catch-all only fires for non-API paths
        file_path = os.path.join(_frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(_frontend_dist, "index.html"))
else:
    @app.get("/")
    def read_root():
        return {"message": "Career Copilot API — frontend not built"}
