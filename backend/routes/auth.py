from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt
import hashlib
import secrets

try:
    import resend
except Exception:  # pragma: no cover - resend may be absent in local dev
    resend = None

from database import get_db
import models

router = APIRouter()

# Never fall back to a secret that lives in a public repo — forged tokens would
# pass verification. If JWT_SECRET is unset we generate a per-boot secret:
# sessions won't survive a restart, but nobody can mint tokens offline.
SECRET_KEY = os.getenv("JWT_SECRET", "").strip()
if not SECRET_KEY:
    SECRET_KEY = secrets.token_hex(32)
    print("[auth] WARNING: JWT_SECRET not set — using an ephemeral secret. "
          "Sessions will be invalidated on every restart. Set JWT_SECRET in "
          "Railway environment variables for stable logins.")
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 30
OTP_EXPIRE_MINUTES = int(os.getenv("OTP_EXPIRE_MINUTES", "10"))
OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
OTP_FROM_EMAIL = os.getenv("OTP_FROM_EMAIL", "AriseJobs <onboarding@resend.dev>")
OTP_DEV_MODE = os.getenv("OTP_DEV_MODE", "").lower() in {"1", "true", "yes"}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def _hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_pw(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _create_token(user_id: int, email: str) -> str:
    expire = datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": str(user_id), "email": email, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def _normalize_email(email: str) -> str:
    return email.lower().strip()


def _hash_otp(email: str, code: str) -> str:
    return hashlib.sha256(f"{_normalize_email(email)}:{code}:{SECRET_KEY}".encode()).hexdigest()


def _display_name_from_email(email: str) -> str:
    local = email.split("@", 1)[0].replace(".", " ").replace("_", " ").replace("-", " ").strip()
    return " ".join(part.capitalize() for part in local.split()) or "AriseJobs User"


def _is_expired(expires_at: datetime) -> bool:
    if expires_at.tzinfo:
        return expires_at < datetime.now(expires_at.tzinfo)
    return expires_at < datetime.utcnow()


def _send_otp_email(email: str, code: str):
    resend_key = os.getenv("RESEND_API_KEY", "").strip()
    if not resend_key or resend is None:
        if OTP_DEV_MODE:
            return
        raise HTTPException(
            status_code=503,
            detail="Email login is not configured yet. Add RESEND_API_KEY and OTP_FROM_EMAIL.",
        )

    resend.api_key = resend_key
    try:
        resend.Emails.send({
            "from": OTP_FROM_EMAIL,
            "to": [email],
            "subject": "Your AriseJobs login code",
            "html": f"""
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
                  <h2>Your AriseJobs login code</h2>
                  <p>Use this code to sign in. It expires in {OTP_EXPIRE_MINUTES} minutes.</p>
                  <p style="font-size:28px;font-weight:700;letter-spacing:6px">{code}</p>
                  <p>If you did not request this, you can ignore this email.</p>
                </div>
            """,
        })
    except Exception as exc:
        # Log the real reason server-side (e.g. Resend test-mode recipient restriction)
        # but never leak it to end users — show a clean, professional message.
        print(f"[otp] Resend send failed for {email}: {exc}")
        raise HTTPException(
            status_code=502,
            detail="We couldn't email a login code to this address right now. Please sign in with your password instead.",
        )


def get_current_user_optional(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        user = db.query(models.UserProfile).filter(models.UserProfile.id == user_id).first()
        return user
    except Exception:
        return None


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    user = get_current_user_optional(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class OtpRequest(BaseModel):
    email: str
    name: Optional[str] = None


class OtpVerifyRequest(BaseModel):
    email: str
    code: str
    name: Optional[str] = None


def _user_dict(user) -> dict:
    return {"id": user.id, "name": user.name, "email": user.email}


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.UserProfile).filter(models.UserProfile.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered. Please sign in.")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    hashed = _hash_pw(req.password)
    user = models.UserProfile(name=req.name.strip(), email=req.email.lower().strip(), hashed_password=hashed)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": _create_token(user.id, user.email), "user": _user_dict(user)}


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.UserProfile).filter(models.UserProfile.email == req.email.lower().strip()).first()
    if not user or not user.hashed_password or not _verify_pw(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return {"token": _create_token(user.id, user.email), "user": _user_dict(user)}


@router.post("/otp/request")
def request_login_code(req: OtpRequest, db: Session = Depends(get_db)):
    email = _normalize_email(req.email)
    if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES)

    db.query(models.EmailLoginCode).filter(
        models.EmailLoginCode.email == email,
        models.EmailLoginCode.consumed_at.is_(None),
    ).update({"consumed_at": datetime.utcnow()})

    login_code = models.EmailLoginCode(
        email=email,
        name=req.name.strip() if req.name else None,
        code_hash=_hash_otp(email, code),
        expires_at=expires_at,
    )
    db.add(login_code)
    db.commit()

    _send_otp_email(email, code)
    response = {"message": "Login code sent. Check your email."}
    if OTP_DEV_MODE:
        response["dev_code"] = code
    return response


@router.post("/otp/verify")
def verify_login_code(req: OtpVerifyRequest, db: Session = Depends(get_db)):
    email = _normalize_email(req.email)
    code = "".join(ch for ch in req.code.strip() if ch.isdigit())
    if len(code) != 6:
        raise HTTPException(status_code=400, detail="Enter the 6-digit code from your email.")

    login_code = db.query(models.EmailLoginCode).filter(
        models.EmailLoginCode.email == email,
        models.EmailLoginCode.consumed_at.is_(None),
    ).order_by(models.EmailLoginCode.created_at.desc()).first()

    if not login_code:
        raise HTTPException(status_code=400, detail="No active login code. Request a new code.")
    if _is_expired(login_code.expires_at):
        login_code.consumed_at = datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=400, detail="Login code expired. Request a new code.")
    if login_code.attempts >= OTP_MAX_ATTEMPTS:
        login_code.consumed_at = datetime.utcnow()
        db.commit()
        raise HTTPException(status_code=429, detail="Too many attempts. Request a new code.")

    login_code.attempts += 1
    if login_code.code_hash != _hash_otp(email, code):
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid login code.")

    user = db.query(models.UserProfile).filter(models.UserProfile.email == email).first()
    if not user:
        name = (req.name or login_code.name or _display_name_from_email(email)).strip()
        user = models.UserProfile(name=name, email=email, hashed_password=None)
        db.add(user)
        db.flush()

    login_code.consumed_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return {"token": _create_token(user.id, user.email), "user": _user_dict(user)}


@router.get("/me")
def me(current_user=Depends(get_current_user)):
    return _user_dict(current_user)
