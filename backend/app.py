from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes — must be registered BEFORE the static file mount
app.include_router(resume.router, prefix="/api/resume", tags=["Resume"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(match.router, prefix="/api/match", tags=["Match"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])

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
