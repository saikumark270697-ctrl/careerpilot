import os
from openai import OpenAI

def _get_client():
    api_key = os.getenv("OPENROUTER_API_KEY") or "dummy_key"
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )

def generate_cover_letter(resume_details: dict, job_listing: dict) -> str:
    """
    Generates a tailored cover letter using the candidate's resume and the job listing.
    """
    candidate_name = resume_details.get("name", "Candidate")
    skills = ", ".join(resume_details.get("skills", []))
    summary = resume_details.get("summary", "")
    
    job_title = job_listing.get("title", "the position")
    company = job_listing.get("company", "the company")
    job_description = job_listing.get("description", "")

    prompt = f"""
    You are an expert career coach and copywriter. Write a highly professional, engaging, and tailored cover letter for {candidate_name} applying for the {job_title} position at {company}.
    
    Candidate Skills: {skills}
    Candidate Summary: {summary}
    
    Job Description:
    {job_description}
    
    The cover letter should:
    1. Have a strong opening statement.
    2. Highlight how the candidate's skills map directly to the job requirements.
    3. Be concise (around 3-4 paragraphs).
    4. Have a professional closing.
    
    Return ONLY the text of the cover letter. Do not include any meta-commentary.
    """
    
    try:
        response = _get_client().chat.completions.create(
            model="meta-llama/llama-3-8b-instruct:free",
            messages=[
                {"role": "system", "content": "You are a professional cover letter writer."},
                {"role": "user", "content": prompt}
            ],
        )
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        print(f"Error generating cover letter: {e}")
        return "Error generating cover letter. Please try again."
