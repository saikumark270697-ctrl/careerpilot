from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import io

from routes.auth import get_current_user

router = APIRouter()

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB — resumes are small; reject dumps

@router.post("/upload")
async def upload_resume(file: UploadFile = File(...), user=Depends(get_current_user)):
    try:
        content = await file.read()
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 5 MB.")
        text = ""
        filename = file.filename.lower()
        
        if filename.endswith(".txt"):
            text = content.decode("utf-8")
            
        elif filename.endswith(".pdf"):
            import pypdf
            pdf_reader = pypdf.PdfReader(io.BytesIO(content))
            for page in pdf_reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
                    
        elif filename.endswith(".docx"):
            import docx
            doc = docx.Document(io.BytesIO(content))
            for para in doc.paragraphs:
                text += para.text + "\n"
                
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload PDF, DOCX, or TXT.")
            
        return {"message": "File processed successfully", "text": text.strip()}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@router.get("/")
def get_resume():
    return {"message": "Get resume endpoint"}
