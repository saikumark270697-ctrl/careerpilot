from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt

from database import get_db
import models

router = APIRouter()

SECRET_KEY = os.getenv("JWT_SECRET", "supersecretjwtkey_replace_in_prod")
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def _hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_pw(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _create_token(user_id: int, email: str) -> str:
    expire = datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": str(user_id), "email": email, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


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


@router.get("/me")
def me(current_user=Depends(get_current_user)):
    return _user_dict(current_user)
