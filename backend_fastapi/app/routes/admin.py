from fastapi import APIRouter, HTTPException, Depends, Query, Body
from app.middleware.dependencies import get_current_user
from app.services.admin_service import AdminService
from app.core.database import get_database
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from pymongo import DESCENDING

router = APIRouter(prefix="/api/admin", tags=["admin"])

class CreateAdminRequest(BaseModel):
    email: str
    password: str
    name: str

class RejectOfferRequest(BaseModel):
    reason: Optional[str] = None          # frontend sends "reason"
    rejectionReason: Optional[str] = None

    def get_reason(self) -> str:
        return self.reason or self.rejectionReason or "Non conforme"

class QualifyRequest(BaseModel):
    note: Optional[str] = None

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Réservé aux administrateurs")
    return current_user

@router.get("/stats")
async def get_dashboard_stats(admin: dict = Depends(require_admin)):
    try:
        raw = await AdminService.get_dashboard_stats()
        return {"stats": {
            "pendingOffers": raw.get("pendingJobs", 0),
            "activeOffers": raw.get("activeJobs", 0),
            "pendingCandidates": raw.get("pendingApplications", 0),
            "qualifiedCandidates": raw.get("qualifiedApplications", 0),
            "totalPayments": raw.get("totalPayments", 0),
            "paymentsToday": raw.get("paymentsToday", 0),
            "rgpdAlerts": raw.get("rgpdAlerts", 0),
        }}
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.get("/pending-offers")
async def get_pending_offers(admin: dict = Depends(require_admin)):
    try:
        db = get_database()
        jobs_col = db["jobs"]
        users_col = db["users"]
        cursor = jobs_col.find({"isValidated": False, "status": "open"}).sort([("createdAt", DESCENDING)])
        offers = []
        async for job in cursor:
            employer = None
            if job.get("employer"):
                emp = await users_col.find_one({"_id": job["employer"]})
                if emp:
                    employer = {"name": emp.get("name"), "company": emp.get("company"), "email": emp.get("email")}
            offers.append({
                "_id": str(job["_id"]),
                "id": str(job["_id"]),
                "title": job.get("title"),
                "cabinet": job.get("cabinet"),
                "location": job.get("location"),
                "description": job.get("description"),
                "employer": employer,
                "isValidated": job.get("isValidated", False),
                "status": job.get("status"),
                "createdAt": job.get("createdAt"),
            })
        return {"offers": offers}
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.post("/validate-offer/{job_id}")
async def validate_offer(job_id: str, admin: dict = Depends(require_admin)):
    try:
        await AdminService.validate_offer(job_id, admin["userId"])
        db = get_database()
        job = await db["jobs"].find_one({"_id": ObjectId(job_id)})
        return {"message": "Offre validée et publiée", "job": {"_id": job_id, "isValidated": True, "title": job.get("title") if job else ""}}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.post("/reject-offer/{job_id}")
async def reject_offer(job_id: str, req: RejectOfferRequest, admin: dict = Depends(require_admin)):
    try:
        reason = req.get_reason()
        await AdminService.reject_offer(job_id, reason, admin["userId"])
        return {"message": "Offre refusée"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.get("/pending-applications")
async def get_pending_applications(admin: dict = Depends(require_admin)):
    try:
        result = await AdminService.get_pending_applications()
        return {"applications": result.get("applications", [])}
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.post("/qualify/{app_id}")
async def qualify_candidate(app_id: str, req: QualifyRequest = QualifyRequest(), admin: dict = Depends(require_admin)):
    try:
        await AdminService.qualify_candidate(app_id, admin["userId"])
        db = get_database()
        app = await db["applications"].find_one({"_id": ObjectId(app_id)})
        return {"message": "Candidat qualifié", "application": {"_id": app_id, "status": "qualified"}}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.post("/archive/{app_id}")
async def archive_candidate(app_id: str, req: QualifyRequest = QualifyRequest(), admin: dict = Depends(require_admin)):
    try:
        await AdminService.archive_candidate(app_id, admin["userId"])
        return {"message": "Candidature archivée", "application": {"_id": app_id, "status": "archived"}}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.get("/rgpd-alerts")
async def get_rgpd_alerts(admin: dict = Depends(require_admin)):
    try:
        db = get_database()
        apps_col = db["applications"]
        now = datetime.utcnow()
        soon = now + timedelta(days=30)

        expired_list = await apps_col.find(
            {"rgpdExpiresAt": {"$lt": now}, "status": {"$ne": "archived"}}
        ).to_list(None)
        expiring_list = await apps_col.find(
            {"rgpdExpiresAt": {"$gt": now, "$lt": soon}}
        ).to_list(None)

        def fmt(a):
            return {
                "_id": str(a["_id"]),
                "firstName": a.get("firstName"),
                "lastName": a.get("lastName"),
                "email": a.get("email"),
                "specialty": a.get("specialty"),
                "createdAt": a.get("createdAt"),
                "rgpdExpiresAt": a.get("rgpdExpiresAt"),
            }

        expired = [fmt(a) for a in expired_list]
        expiring_soon = [fmt(a) for a in expiring_list]
        return {
            "expired": expired,
            "expiringSoon": expiring_soon,
            "totalExpired": len(expired),
            "totalExpiringSoon": len(expiring_soon),
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.post("/anonymize-all-expired")
async def anonymize_all_expired(admin: dict = Depends(require_admin)):
    try:
        result = await AdminService.anonymize_all_expired(admin["userId"])
        return result
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.get("/audit-log")
async def get_audit_log(
    action: Optional[str] = Query(None),
    targetType: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    admin: dict = Depends(require_admin),
):
    try:
        result = await AdminService.get_audit_log(action, targetType, page, limit)
        return {
            "logs": result.get("items", []),
            "total": result.get("total", 0),
            "page": result.get("page", 1),
            "totalPages": result.get("pages", 1),
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.get("/payments")
async def get_payments(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: dict = Depends(require_admin),
):
    try:
        result = await AdminService.get_payments(page, limit)
        return {
            "payments": result.get("items", []),
            "total": result.get("total", 0),
            "page": result.get("page", 1),
            "totalPages": result.get("pages", 1),
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.get("/users")
async def get_users(
    role: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: dict = Depends(require_admin),
):
    try:
        result = await AdminService.get_users(role, page, limit)
        return {
            "users": result.get("items", []),
            "total": result.get("total", 0),
            "page": result.get("page", 1),
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.post("/create-admin")
async def create_admin(req: CreateAdminRequest, admin: dict = Depends(require_admin)):
    try:
        result = await AdminService.create_admin(req.email, req.password, req.name)
        return {"message": "Compte administrateur créé avec succès", "user": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")
