from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class JobResponse(BaseModel):
    id: str
    title: str
    cabinet: str
    description: str
    requirements: List[str] = []
    location: str
    address: Optional[str] = None
    salary: dict
    contractType: str
    urgency: bool
    status: str
    pipelineStage: str
    isValidated: bool
    validatedAt: Optional[datetime] = None
    rejectionReason: Optional[str] = None
    employer: Optional[str] = None
    createdAt: datetime

class CreateJobRequest(BaseModel):
    title: str
    cabinet: str
    description: str
    requirements: List[str] = []
    location: str
    address: Optional[str] = None
    contactEmail: Optional[str] = None
    salary: dict
    contractType: str = "CDI"
    urgency: bool = False

class UpdateJobRequest(BaseModel):
    title: Optional[str] = None
    cabinet: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[List[str]] = None
    location: Optional[str] = None
    address: Optional[str] = None
    contactEmail: Optional[str] = None
    salary: Optional[dict] = None
    contractType: Optional[str] = None
    urgency: Optional[bool] = None
    pipelineStage: Optional[str] = None
    isValidated: Optional[bool] = None

class UpdatePipelineStageRequest(BaseModel):
    pipelineStage: str
