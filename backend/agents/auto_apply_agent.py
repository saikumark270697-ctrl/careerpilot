import asyncio
from playwright.async_api import async_playwright

async def auto_apply_to_job(job_url: str, candidate_data: dict) -> dict:
    logs = [f"Starting live auto-apply for: {job_url}"]
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context()
            page = await context.new_page()
            
            await page.goto(job_url, timeout=15000)
            logs.append("Page loaded. Analyzing DOM...")
            
            content = await page.content()
            
            # 1. Detect CAPTCHA or Cloudflare
            if "cf-browser-verification" in content or "g-recaptcha" in content:
                logs.append("CAPTCHA detected. Cannot proceed automatically.")
                await browser.close()
                return {"status": "REQUIRES_MANUAL_ACTION", "logs": logs}
                
            # 2. Attempt to fill standard fields (Best-effort heuristic)
            try:
                # Name
                if await page.locator("input[type='text'][name*='name']").count() > 0:
                    await page.fill("input[type='text'][name*='name']", candidate_data.get("name", "Applicant"))
                # Email
                if await page.locator("input[type='email']").count() > 0:
                    await page.fill("input[type='email']", candidate_data.get("email", "applicant@example.com"))
                
                # Check for file upload
                if await page.locator("input[type='file']").count() > 0:
                    logs.append("File upload field found. (Requires local PDF generation to upload)")
                    
                # We do NOT click submit automatically in v1 to prevent spamming incomplete forms
                logs.append("Form parsed. Requires manual review for complex ATS redirects.")
                await browser.close()
                return {"status": "REQUIRES_MANUAL_ACTION", "logs": logs}
                
            except Exception as e:
                logs.append(f"Form filling failed: {e}")
                await browser.close()
                return {"status": "FAILED", "logs": logs}
                
    except Exception as e:
        logs.append(f"Critical Playwright error: {e}")
        return {"status": "FAILED", "logs": logs}

