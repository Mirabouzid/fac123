from datetime import datetime
from typing import Optional, List, Annotated
from bson import ObjectId
from pydantic import BaseModel, Field, field_validator, EmailStr

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = Field(..., pattern="^(candidate|employer|admin)$")

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    experience: Optional[str] = None
    city: Optional[str] = None
    availability: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    contactEmail: Optional[str] = None
    rgpdConsent: bool = True

    def dict(self, **kwargs):
        return self.model_dump(**kwargs)

class User(UserBase):
    password: str
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    experience: Optional[str] = None
    city: Optional[str] = None
    availability: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    contactEmail: Optional[str] = None
    aiScore: Optional[float] = None
    rgpdConsent: bool = True
    isAnonymized: bool = False
    resetToken: Optional[str] = None

    model_config = {"populate_by_name": True}

class UserUpdate(BaseModel):
    name: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    experience: Optional[str] = None
    city: Optional[str] = None
    availability: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    contactEmail: Optional[str] = None
