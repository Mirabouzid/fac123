from fastapi import APIRouter, HTTPException, Depends, Request, Header
from fastapi.responses import JSONResponse
from app.middleware.dependencies import get_current_user
from app.services.payment_service import PaymentService
from app.core.config import settings
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/payments", tags=["payments"])

class CheckoutRequest(BaseModel):
    applicationId: str

class PaymentIntentRequest(BaseModel):
    applicationId: str

class VerifyPaymentRequest(BaseModel):
    paymentIntentId: str

@router.post("/create-checkout-session")
async def create_checkout_session(
    req: CheckoutRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        if current_user["role"] not in ["employer", "admin"]:
            raise HTTPException(status_code=403, detail="Réservé aux employeurs")
        base = settings.FRONTEND_URL
        result = await PaymentService.create_checkout_session(
            req.applicationId,
            current_user["userId"],
            f"{base}/employer/pipeline?payment=success&applicationId={req.applicationId}",
            f"{base}/employer/pipeline?payment=cancel",
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur lors de la création du paiement")

@router.post("/create-payment-intent")
async def create_payment_intent(
    req: PaymentIntentRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        if current_user["role"] not in ["employer", "admin"]:
            raise HTTPException(status_code=403, detail="Réservé aux employeurs")
        result = await PaymentService.create_payment_intent(
            req.applicationId,
            current_user["userId"]
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur lors de la création de l'intention de paiement")

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="stripe-signature")
):
    try:
        payload = await request.body()
        result = await PaymentService.process_webhook(payload, stripe_signature or "")
        return result
    except ValueError as e:
        return JSONResponse(status_code=400, content={"message": str(e)})
    except Exception as e:
        return JSONResponse(status_code=200, content={"received": True})

@router.post("/verify-payment")
async def verify_payment(
    req: VerifyPaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        if current_user["role"] not in ["employer", "admin"]:
            raise HTTPException(status_code=403, detail="Non autorisé")
        result = await PaymentService.verify_payment_by_intent_id(req.paymentIntentId)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur lors de la vérification du paiement")

@router.get("/history")
async def get_payment_history(current_user: dict = Depends(get_current_user)):
    try:
        if current_user["role"] not in ["employer", "admin"]:
            raise HTTPException(status_code=403, detail="Non autorisé")
        result = await PaymentService.get_payment_history(current_user["userId"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur serveur")
