from datetime import datetime
from typing import Optional
from bson import ObjectId
from app.core.database import get_database
from app.core.config import settings
import stripe

stripe.api_key = settings.STRIPE_SECRET_KEY

class PaymentService:

    PRICE_CENTS = 4900
    CURRENCY = "eur"

    @staticmethod
    async def create_checkout_session(
        application_id: str,
        employer_id: str,
        success_url: str,
        cancel_url: str
    ) -> dict:
        db = get_database()
        applications = db["applications"]
        payments = db["payments"]

        app = await applications.find_one({"_id": ObjectId(application_id)})
        if not app:
            raise ValueError("Application not found")

        unlocked_by = app.get("unlockedBy", [])
        employer_oid = ObjectId(employer_id)
        if employer_oid in unlocked_by:
            raise ValueError("Ce profil est déjà débloqué")

        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            line_items=[{
                "price_data": {
                    "currency": PaymentService.CURRENCY,
                    "unit_amount": PaymentService.PRICE_CENTS,
                    "product_data": {
                        "name": f"Déblocage profil — {app.get('firstName', '')} {app.get('lastName', [''])[0]}.",
                        "description": f"Accès complet aux coordonnées — Spécialité: {app.get('specialty', '')}",
                    }
                },
                "quantity": 1
            }],
            metadata={
                "applicationId": str(application_id),
                "employerId": str(employer_id)
            },
            success_url=success_url,
            cancel_url=cancel_url,
        )

        await payments.insert_one({
            "employer": employer_oid,
            "application": ObjectId(application_id),
            "stripeSessionId": session.id,
            "amount": 49,
            "status": "pending",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        })

        return {"url": session.url, "sessionId": session.id}

    @staticmethod
    async def create_payment_intent(
        application_id: str,
        employer_id: str
    ) -> dict:
        db = get_database()
        applications = db["applications"]
        payments = db["payments"]

        app = await applications.find_one({"_id": ObjectId(application_id)})
        if not app:
            raise ValueError("Application not found")

        unlocked_by = app.get("unlockedBy", [])
        employer_oid = ObjectId(employer_id)
        if employer_oid in unlocked_by:
            raise ValueError("Ce profil est déjà débloqué")

        intent = stripe.PaymentIntent.create(
            amount=PaymentService.PRICE_CENTS,
            currency=PaymentService.CURRENCY,
            automatic_payment_methods={"enabled": True},
            metadata={
                "applicationId": str(application_id),
                "employerId": str(employer_id)
            }
        )

        await payments.insert_one({
            "employer": employer_oid,
            "application": ObjectId(application_id),
            "stripePaymentIntentId": intent.id,
            "amount": 49,
            "status": "pending",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        })

        return {"clientSecret": intent.client_secret}

    @staticmethod
    async def process_webhook(payload: bytes, sig_header: str) -> dict:
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except stripe.error.SignatureVerificationError as e:
            raise ValueError(f"Invalid webhook signature: {e}")
        except Exception as e:
            raise ValueError(f"Webhook error: {e}")

        event_type = event.get("type")

        if event_type == "checkout.session.completed":
            session = event["data"]["object"]
            metadata = session.get("metadata", {})
            application_id = metadata.get("applicationId")
            employer_id = metadata.get("employerId")
            if application_id and employer_id:
                await PaymentService._process_successful_payment(
                    session["id"], session.get("payment_intent"),
                    application_id, employer_id, session.get("customer_email")
                )

        elif event_type == "payment_intent.succeeded":
            intent = event["data"]["object"]
            metadata = intent.get("metadata", {})
            application_id = metadata.get("applicationId")
            employer_id = metadata.get("employerId")
            if application_id and employer_id:
                await PaymentService._process_successful_payment(
                    None, intent["id"],
                    application_id, employer_id, intent.get("receipt_email")
                )

        return {"received": True}

    @staticmethod
    async def verify_payment_by_intent_id(payment_intent_id: str) -> dict:
        try:
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        except stripe.error.StripeError as e:
            raise ValueError(f"Stripe error: {e}")

        if intent.status == "succeeded":
            metadata = intent.get("metadata", {})
            application_id = metadata.get("applicationId")
            employer_id = metadata.get("employerId")

            if application_id and employer_id:
                await PaymentService._process_successful_payment(
                    None, payment_intent_id,
                    application_id, employer_id,
                    intent.get("receipt_email")
                )
            return {"success": True, "message": "Paiement vérifié et profil débloqué"}
        else:
            return {
                "success": False,
                "status": intent.status,
                "message": "Le paiement n'a pas encore réussi"
            }

    @staticmethod
    async def _process_successful_payment(
        session_id: Optional[str],
        payment_intent_id: Optional[str],
        application_id: str,
        employer_id: str,
        customer_email: Optional[str]
    ) -> None:
        db = get_database()
        applications = db["applications"]
        payments = db["payments"]
        audit_logs = db["auditLogs"]

        now = datetime.utcnow()

        query = {}
        if session_id:
            query["stripeSessionId"] = session_id
        elif payment_intent_id:
            query["stripePaymentIntentId"] = payment_intent_id

        if query:
            await payments.update_one(
                query,
                {"$set": {
                    "status": "paid",
                    "stripePaymentIntentId": payment_intent_id,
                    "paidAt": now,
                    "updatedAt": now
                }}
            )

        await applications.update_one(
            {"_id": ObjectId(application_id)},
            {"$addToSet": {"unlockedBy": ObjectId(employer_id)}}
        )

        await audit_logs.insert_one({
            "action": "PAYMENT_RECEIVED",
            "actorEmail": customer_email or "employer",
            "targetType": "Application",
            "targetId": ObjectId(application_id),
            "targetLabel": "Profil débloqué après paiement",
            "metadata": {
                "sessionId": session_id,
                "paymentIntentId": payment_intent_id,
                "amount": 49
            },
            "createdAt": now
        })

    @staticmethod
    async def get_payment_history(employer_id: str) -> dict:
        db = get_database()
        payments = db["payments"]
        applications = db["applications"]

        employer_oid = ObjectId(employer_id)
        cursor = payments.find({"employer": employer_oid}).sort([("createdAt", -1)])

        items = []
        async for payment in cursor:
            app_info = None
            if payment.get("application"):
                app = await applications.find_one({"_id": payment["application"]})
                if app:
                    app_info = {
                        "firstName": app.get("firstName"),
                        "lastName": app.get("lastName"),
                        "specialty": app.get("specialty"),
                        "city": app.get("city"),
                    }
            items.append({
                "id": str(payment["_id"]),
                "employer": str(payment.get("employer")),
                "application": app_info or str(payment.get("application")),
                "amount": payment.get("amount"),
                "status": payment.get("status"),
                "stripeSessionId": payment.get("stripeSessionId"),
                "stripePaymentIntentId": payment.get("stripePaymentIntentId"),
                "createdAt": payment.get("createdAt"),
                "paidAt": payment.get("paidAt"),
            })

        return {"payments": items}
