from datetime import datetime
from typing import Optional, List
from bson import ObjectId
from pydantic import BaseModel, Field

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        try:
            return ObjectId(v)
        except:
            raise ValueError(f"Invalid ObjectId: {v}")

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class StatusHistoryItem(BaseModel):
    status: str
    actor: PyObjectId
    actorEmail: str
    actorRole: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    notes: Optional[str] = None

class ApplicationBase(BaseModel):
    firstName: str
    lastName: str
    email: str
    phone: str
    specialty: str
    experience: str
    city: str
    availability: str
    coverLetter: Optional[str] = None
    cvFile: Optional[str] = None

class ApplicationCreate(BaseModel):
    jobId: str
    coverLetter: Optional[str] = None

class Application(ApplicationBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    job: PyObjectId
    candidate: PyObjectId
    status: str = Field(default="received")
    employerStage: str = Field(default="validating")
    aiScore: Optional[float] = None
    rgpdConsent: bool = True
    rgpdConsentDate: datetime = Field(default_factory=datetime.utcnow)
    rgpdExpiresAt: datetime
    unlockedBy: List[PyObjectId] = []
    statusHistory: List[StatusHistoryItem] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class ApplicationUpdate(BaseModel):
    status: Optional[str] = None
    employerStage: Optional[str] = None
    notes: Optional[str] = None
