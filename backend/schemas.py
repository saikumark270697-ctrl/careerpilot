from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserProfileBase(BaseModel):
    name: str
    email: str
    resume_text: Optional[str] = None
    skills: Optional[str] = None

class UserProfileCreate(UserProfileBase):
    pass

class UserProfile(UserProfileBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class JobListingBase(BaseModel):
    title: str
    company: str
    description: str
    url: str
    location: Optional[str] = None

class JobListingCreate(JobListingBase):
    pass

class JobListing(JobListingBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
