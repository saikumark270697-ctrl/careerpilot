# RoleFlight

An AI-powered agentic job search and resume matching platform.

## Features
- **Resume Agent**: Extracts skills and experience using OpenRouter.
- **Job Search Agent**: Finds jobs via RapidAPI JSearch.
- **Matching Agent**: Uses FAISS vector search to match resumes to jobs.
- **Cover Letter Agent**: Generates custom cover letters using LLMs.

## Deployment (Free Tier)

### 1. Backend (Render)
This project includes a `render.yaml` for automatic deployment to Render's free tier.
1. Connect this repository to your Render account.
2. Select **Blueprint** deployment.
3. Provide your environment variables (`OPENROUTER_API_KEY`, `RAPIDAPI_KEY`, `DATABASE_URL`) in the Render dashboard.

### 2. Frontend (Vercel)
The frontend is built with React and Vite and is ready for Vercel.
1. Import the repository in Vercel.
2. Set the Root Directory to `frontend`.
3. Vercel will automatically detect the Vite preset and configure the build settings.
4. Deploy!

### Local Development
1. **Backend**: `cd backend && pip install -r requirements.txt && uvicorn app:app --reload`
2. **Frontend**: `cd frontend && npm install && npm run dev`
