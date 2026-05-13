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

class JobBase(BaseModel):
    title: str
    cabinet: str
    description: str
    requirements: List[str] = []
    location: str
    address: Optional[str] = None
    contactEmail: Optional[str] = None
    salary: dict = Field(default={"min": 0, "max": 0})
    contractType: str = Field(default="CDI")
    urgency: bool = False

class JobCreate(JobBase):
    pass

class Job(JobBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    employer: PyObjectId
    pipelineStage: str = Field(default="validating")
    isValidated: bool = False
    validatedAt: Optional[datetime] = None
    validatedBy: Optional[PyObjectId] = None
    rejectedAt: Optional[datetime] = None
    rejectionReason: Optional[str] = None
    status: str = Field(default="open")
    jobDescriptionFile: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class JobUpdate(BaseModel):
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
    status: Optional[str] = None
