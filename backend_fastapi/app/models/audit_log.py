from datetime import datetime
from typing import Optional, Any, Dict
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

class AuditLogCreate(BaseModel):
    action: str
    actor: Optional[PyObjectId] = None
    actorEmail: Optional[str] = None
    actorRole: Optional[str] = None
    targetType: Optional[str] = None
    targetId: Optional[PyObjectId] = None
    targetLabel: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    ipAddress: Optional[str] = None

class AuditLog(AuditLogCreate):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
