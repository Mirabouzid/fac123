from pydantic import BaseModel, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str
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

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    password: Optional[str] = None
    newPassword: Optional[str] = None

    def get_new_password(self) -> Optional[str]:
        return self.password or self.newPassword

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
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

    class Config:
        populate_by_name = True

class AuthResponse(BaseModel):
    message: str
    token: Optional[str] = None
    user: Optional[UserResponse] = None
