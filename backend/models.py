from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String, nullable=True)
    role = Column(String, default="user")
    resume_text = Column(Text, nullable=True)
    skills = Column(String, nullable=True) # Stored as comma-separated values
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class EmailLoginCode(Base):
    __tablename__ = "email_login_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    name = Column(String, nullable=True)
    code_hash = Column(String, nullable=False)
    attempts = Column(Integer, default=0)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    consumed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class JobListing(Base):
    __tablename__ = "job_listings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    company = Column(String, index=True)
    description = Column(Text)
    url = Column(String)
    location = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AppliedJob(Base):
    __tablename__ = "applied_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=True)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    job_url = Column(String, nullable=False)
    status = Column(String, default="REQUIRES_MANUAL_ACTION") # SUCCESS, FAILED, REQUIRES_MANUAL_ACTION
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
