from datetime import datetime
from typing import Optional
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

class PaymentCreate(BaseModel):
    applicationId: str
    amount: int = 4900
    currency: str = "EUR"

class Payment(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    employer: PyObjectId
    application: PyObjectId
    amount: int
    currency: str = "EUR"
    status: str = Field(default="pending")
    stripeSessionId: Optional[str] = None
    stripePaymentIntentId: Optional[str] = None
    paidAt: Optional[datetime] = None
    refundedAt: Optional[datetime] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class PaymentUpdate(BaseModel):
    status: Optional[str] = None
    paidAt: Optional[datetime] = None
    refundedAt: Optional[datetime] = None
