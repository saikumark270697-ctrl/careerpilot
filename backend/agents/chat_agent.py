import os
from openai import OpenAI

SYSTEM_PROMPT = """You are SRI, an expert AI career assistant built into RoleFlight. You help users with every step of their job search journey.

**Your Capabilities:**
1. **Resume Review** – Detailed ATS analysis, formatting issues, missing keywords, impact metrics
2. **ATS Optimization** – Tailored rewrites, keyword insertion, section restructuring to beat ATS filters
3. **Job Matching & Strategy** – Evaluate JDs the user pastes, shortlist best fits, explain match reasoning
4. **Interview Preparation** – Generate behavioral, technical, and role-specific questions; coach on answers (STAR method)
5. **Coding Test Help** – Solve DSA problems, explain time/space complexity, walk through LeetCode-style questions
6. **Cover Letter Writing** – Craft personalized, compelling cover letters for specific jobs
7. **Career Advice** – Salary negotiation, skill gap analysis, job application strategy

**Response Guidelines:**
- Be concise, direct, and actionable – no filler text
- Use markdown: **bold** for key terms, bullet lists for steps, ```language code blocks for all code
- For resume feedback: be SPECIFIC (say exactly what word/section to change and WHY it matters for ATS)
- For interview questions: categorize them clearly (Behavioral / Technical / Situational)
- For coding help: always include working code with clear comments explaining the approach
- End responses with a clear next step or offer to go deeper on any point
- If the user pastes a JD, immediately extract key requirements and match them to their resume

You have context about the user's resume, ATS score, and current job matches when provided. Use this context to give personalized, specific advice rather than generic tips."""


def _get_groq_client():
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
        ), "meta-llama/llama-3.3-70b-instruct"

    raise ValueError(
        "No API key configured. Set GROQ_API_KEY in Railway environment variables."
    )


def chat_with_bot(
    messages: list,
    resume_text: str = "",
    ats_score: int = None,
    jobs_context: str = "",
) -> str:
    client, model = _get_groq_client()

    system_content = SYSTEM_PROMPT

    has_resume = bool(resume_text and resume_text.strip())

    if has_resume:
        system_content += f"\n\n---\n**USER'S UPLOADED RESUME:**\n{resume_text.strip()[:4000]}"
    else:
        system_content += (
            "\n\n---\n**IMPORTANT — NO RESUME PROVIDED:**\n"
            "The user has NOT uploaded or pasted a resume. You do NOT know their name, "
            "work history, skills, experience level, or target role.\n"
            "You MUST NOT invent, assume, or fabricate any of these details.\n"
            "If they ask for a resume review, ATS analysis, skill-gap analysis, a personalized "
            "30-day plan, job matching, cover letter, or anything that depends on their background, "
            "do NOT produce a made-up answer. Instead, briefly explain you need their resume first "
            "and ask them to upload a file or paste their resume text into the dashboard (and optionally "
            "state their target role). You MAY still answer genuinely general career questions "
            "(e.g. 'how do I prepare for a behavioral interview?') without a resume."
        )

    if ats_score is not None:
        system_content += f"\n\n**User's Current ATS Score:** {ats_score}/100"

    if jobs_context and jobs_context.strip():
        system_content += f"\n\n**Current Top Job Matches:**\n{jobs_context.strip()[:1500]}"

    groq_messages = [{"role": "system", "content": system_content}] + messages

    response = client.chat.completions.create(
        model=model,
        messages=groq_messages,
        max_tokens=2048,
        temperature=0.7,
    )

    return response.choices[0].message.content
