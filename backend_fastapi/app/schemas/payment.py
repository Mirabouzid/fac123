from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PaymentResponse(BaseModel):
    id: str
    employer: str
    application: str
    amount: int
    currency: str
    status: str
    createdAt: datetime
    paidAt: Optional[datetime] = None

class CreateCheckoutSessionRequest(BaseModel):
    applicationId: str

class CreatePaymentIntentRequest(BaseModel):
    applicationId: str

class StripeWebhookEvent(BaseModel):
    type: str
    data: dict

class PaymentHistoryResponse(BaseModel):
    items: list
    total: int
    page: int
    limit: int
