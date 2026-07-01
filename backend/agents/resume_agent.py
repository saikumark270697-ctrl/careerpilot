import os
import re
import json
import hashlib
from openai import OpenAI

_ats_cache = {}

def get_cache_key(resume_text: str, target_role: str) -> str:
    key_str = f"{resume_text.strip()}_{target_role.strip()}".lower()
    return hashlib.md5(key_str.encode("utf-8")).hexdigest()

def _get_client():
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if groq_key:
        return OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=groq_key,
        ), "llama-3.3-70b-versatile"

    openrouter_key = os.getenv("OPENROUTER_API_KEY", "").strip()
    if openrouter_key:
        return OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=openrouter_key,
        ), "meta-llama/llama-3.1-8b-instruct"

    raise ValueError(
        "No API key configured. Set GROQ_API_KEY in Railway environment variables."
    )

JOB_TITLES = [
    "machine learning engineer",
    "data scientist",
    "data analyst",
    "software engineer",
    "frontend engineer",
    "backend engineer",
    "full stack engineer",
    "devops engineer",
    "cloud engineer",
    "product manager",
    "business analyst",
    "ai engineer",
]

COMMON_SKILLS = [
    "python", "java", "javascript", "typescript", "react", "node.js", "sql",
    "tensorflow", "pytorch", "machine learning", "deep learning", "pandas",
    "numpy", "scikit-learn", "aws", "azure", "gcp", "docker", "kubernetes",
    "spark", "hadoop", "tableau", "power bi", "r", "statistics", "nlp",
    "computer vision", "llm", "git", "fastapi", "django", "flask",
]


def _fallback_extract(resume_text: str, target_role: str = "") -> dict:
    text = resume_text.lower()
    lines = [line.strip() for line in resume_text.splitlines() if line.strip()]
    name = lines[0] if lines else "Unknown"

    job_search_query = target_role if target_role else ""
    if not job_search_query:
        # Check for specific developer roles first to avoid bad fallback matches
        if ".net" in text or "c#" in text:
            job_search_query = ".NET Developer"
        elif "react" in text or "frontend" in text:
            job_search_query = "Frontend Engineer"
        elif "python" in text or "backend" in text:
            job_search_query = "Backend Engineer"
        else:
            for title in JOB_TITLES:
                if title in text:
                    job_search_query = title.title()
                    break
            
        if not job_search_query:
            job_search_query = "Software Engineer"

    skills = []
    for skill in COMMON_SKILLS:
        if skill in text and skill.title() not in skills:
            skills.append(skill.title())

    summary = resume_text[:250].replace("\n", " ").strip()
    email_match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", resume_text)
    email = email_match.group(0) if email_match else ""

    # Basic ATS fallback calculation - STRICTER SCORING
    score = min(65, 30 + (len(skills) * 3))
    
    return {
        "name": name,
        "email": email,
        "skills": skills,
        "summary": summary,
        "job_search_query": job_search_query,
        "overall_ats_score": score,
        "feedback_breakdown": [
            "We used a basic fallback matcher because the AI agent was unavailable.",
            "Consider adding more industry-standard keywords.",
            "Ensure your formatting is clean and parsable."
        ]
    }


def extract_resume_details(resume_text: str, target_role: str = "") -> dict:
    """Extract skills, target role, ATS score, and feedback from resume text using OpenRouter, with rule-based fallback."""
    global _ats_cache
    cache_key = get_cache_key(resume_text, target_role)
    if cache_key in _ats_cache:
        return _ats_cache[cache_key]

    role_context = f"The candidate is targeting a '{target_role}' role." if target_role else "Infer the best matching job role based on their experience."
    
    prompt = f"""
    You are a STRICT and EXPERT HR Applicant Tracking System (ATS). Extract information and score the resume below.
    {role_context}
    
    IMPORTANT SCORING RULES (Strict Rubric):
    - Base score is 30.
    - Add up to 20 points for exact match of industry-standard tools/skills for their primary domain.
    - Add up to 20 points if their work history has quantifiable metrics (percentages, dollar amounts, scale).
    - Add up to 10 points for good formatting and clarity.
    - Add up to 20 points if their past job titles perfectly align with the target role.
    - Deduct points for generic filler, lack of details, or mismatched roles.
    - A typical average resume should score between 40 and 60. ONLY truly exceptional resumes score above 80.
    
    IMPORTANT JOB TITLE RULES:
    - The "job_search_query" MUST be the candidate's exact primary domain/job title (e.g., ".NET Developer", "Frontend Engineer", "SAP Consultant").
    - DO NOT list secondary skills in the title (e.g. if they are a .NET developer who knows Azure, the query is ".NET Developer", NOT "Azure .NET Developer").
    - This query is used to fetch jobs, so it MUST exactly match standard job board titles for their core expertise.
    
    Return ONLY a valid JSON object with the following structure:
    {{
        "name": "Full Name",
        "email": "Email address",
        "skills": ["Skill 1", "Skill 2"],
        "summary": "A brief 2-sentence summary of the candidate's profile.",
        "job_search_query": "The EXACT primary job title (e.g. '.NET Developer' or 'Senior Software Engineer'). DO NOT hallucinate titles based on secondary skills.",
        "overall_ats_score": 45, // Be strict! An integer between 0 and 100 based on the rubric.
        "feedback_breakdown": [
            "CRITICAL: Point out a major missing skill or metric related to their domain.",
            "WARNING: Point out a formatting issue or lack of business impact.",
            "SUGGESTION: Tell them exactly what to add to improve the ATS score."
        ] // Exactly 3 strict, actionable sentences of feedback.
    }}

    Resume Text:
    {resume_text}
    """

    try:
        client, model_name = _get_client()
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that outputs ONLY valid JSON, with no markdown formatting or extra text."},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.0,
        )
        content = response.choices[0].message.content.strip()
        
        # Robustly parse JSON even if wrapped in markdown
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()
        
        parsed = json.loads(content)
        if parsed.get("skills") or parsed.get("job_search_query"):
            # Ensure defaults for new fields
            if "overall_ats_score" not in parsed:
                parsed["overall_ats_score"] = 70
            if "feedback_breakdown" not in parsed:
                parsed["feedback_breakdown"] = ["Your resume looks good, but could use more specific metrics."]
            _ats_cache[cache_key] = parsed
            return parsed
    except Exception as e:
        print(f"Error extracting resume details via LLM: {e}")

    result = _fallback_extract(resume_text, target_role)
    _ats_cache[cache_key] = result
    return result
