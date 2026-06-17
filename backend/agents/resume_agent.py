import os
import re
import json
from openai import OpenAI

def _get_client():
    # Try OpenRouter first, then fallback to Groq
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    if openrouter_key:
        return OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=openrouter_key,
        )
    
    # Fallback to Groq if OpenRouter is missing
    return OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=os.getenv("GROQ_API_KEY", "dummy_key"),
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
    role_context = f"The candidate is targeting a '{target_role}' role." if target_role else "Infer the best matching job role based on their experience."
    
    prompt = f"""
    You are a STRICT and EXPERT HR Applicant Tracking System (ATS). Extract information and score the resume below.
    {role_context}
    
    IMPORTANT SCORING RULES:
    - Be extremely critical. Most standard resumes should score between 30 and 65.
    - Only give above 75 if the resume PERFECTLY matches the target role with quantifiable metrics, perfect formatting, and exact keyword matches.
    - If the resume is missing key industry skills or lacks quantifiable results, penalize the score heavily.
    
    Return ONLY a valid JSON object with the following structure:
    {{
        "name": "Full Name",
        "email": "Email address",
        "skills": ["Skill 1", "Skill 2"],
        "summary": "A brief 2-sentence summary of the candidate's profile.",
        "job_search_query": "The most accurate, specific job title based on their primary expertise (e.g. .NET Backend Developer, Senior React Engineer, DevOps Engineer)",
        "overall_ats_score": 45, // Be strict! An integer between 0 and 100.
        "feedback_breakdown": [
            "CRITICAL: Point out a major missing skill or keyword related to their domain.",
            "WARNING: Point out a formatting issue or lack of metrics.",
            "SUGGESTION: Tell them exactly what to add to improve the ATS score."
        ] // Exactly 3 strict, actionable sentences of feedback.
    }}

    Resume Text:
    {resume_text}
    """

    try:
        model_name = "meta-llama/llama-3.1-8b-instruct" if os.getenv("OPENROUTER_API_KEY") else "llama-3.1-8b-instant"
        response = _get_client().chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that outputs ONLY valid JSON, with no markdown formatting or extra text."},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
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
            return parsed
    except Exception as e:
        print(f"Error extracting resume details via LLM: {e}")

    return _fallback_extract(resume_text, target_role)
