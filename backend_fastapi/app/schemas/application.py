from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ApplicationResponse(BaseModel):
    id: str
    firstName: str
    lastName: str
    email: str
    phone: Optional[str] = None
    specialty: str
    experience: str
    city: str
    availability: str
    coverLetter: Optional[str] = None
    cvFile: Optional[str] = None
    status: str
    employerStage: Optional[str] = None
    aiScore: Optional[float] = None
    job: Optional[str] = None
    createdAt: datetime

class CreateApplicationRequest(BaseModel):
    jobId: str
    coverLetter: Optional[str] = None

class UpdateApplicationRequest(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class UpdateEmployerStageRequest(BaseModel):
    employerStage: str
    notes: Optional[str] = None

class ApplicationStats(BaseModel):
    total: int
    received: int
    validating: int
    qualified: int
    archived: int
