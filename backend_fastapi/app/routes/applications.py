from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query, Body
from app.middleware.dependencies import get_current_user
from app.services.application_service import ApplicationService
from app.core.database import get_database
from bson import ObjectId
from typing import Optional
import os, uuid
from datetime import datetime

router = APIRouter(prefix="/api/applications", tags=["applications"])
UPLOAD_DIR = "public/uploads/cv"

@router.get("/candidate/stats")
async def get_candidate_stats(current_user: dict = Depends(get_current_user)):
    try:
        if current_user["role"] != "candidate":
            raise HTTPException(status_code=403, detail="Réservé aux candidats")
        db = get_database()
        apps = db["applications"]
        uid = ObjectId(current_user["userId"])
        total = await apps.count_documents({"candidate": uid})
        pending = await apps.count_documents({"candidate": uid, "status": {"$in": ["received", "validating"]}})
        interviews = await apps.count_documents({"candidate": uid, "employerStage": "interview"})
        return {"stats": {"total": total, "pending": pending, "interviews": interviews}}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.get("")
async def get_applications(
    status: Optional[str] = Query(None),
    specialty: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    global_mode: bool = Query(False, alias="global"),
    current_user: dict = Depends(get_current_user),
):
    try:
        result = await ApplicationService.get_applications(
            current_user["userId"], current_user["role"],
            status, specialty, city, global_mode
        )
        return {"applications": result["items"]}
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.post("")
async def create_application(
    jobId: Optional[str] = Form(None),
    firstName: Optional[str] = Form(None),
    lastName: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    specialty: Optional[str] = Form(None),
    experience: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    availability: Optional[str] = Form(None),
    coverLetter: Optional[str] = Form(None),
    rgpdConsent: Optional[str] = Form(None),
    cv: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
):
    try:
        if current_user["role"] != "candidate":
            raise HTTPException(status_code=403, detail="Seuls les candidats peuvent postuler")
        if not cv:
            raise HTTPException(status_code=400, detail="Le CV est obligatoire")
        if not rgpdConsent or rgpdConsent == "false":
            raise HTTPException(status_code=400, detail="Le consentement RGPD est obligatoire")

        os.makedirs(UPLOAD_DIR, exist_ok=True)
        ext = cv.filename.split(".")[-1] if cv.filename else "pdf"
        file_name = f"cv-{current_user['userId']}-{uuid.uuid4().hex}.{ext}"
        content = await cv.read()
        with open(os.path.join(UPLOAD_DIR, file_name), "wb") as f:
            f.write(content)

        app = await ApplicationService.create_application(
            jobId, current_user["userId"], coverLetter, file_name
        )
        return {"message": "Candidature soumise avec succès", "application": app}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.put("/{app_id}")
async def update_application(
    app_id: str,
    body: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Réservé aux admins")
        status = body.get("status")
        note = body.get("note")
        app = await ApplicationService.update_application_status(
            app_id, status, current_user["userId"], current_user["role"], note
        )
        return {"message": "Candidature mise à jour", "application": app}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.put("/{app_id}/pipeline")
async def update_employer_stage(
    app_id: str,
    body: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        if current_user["role"] not in ["employer", "admin"]:
            raise HTTPException(status_code=403, detail="Non autorisé")
        stage = body.get("stage") or body.get("employerStage")
        if not stage:
            raise HTTPException(status_code=400, detail="stage requis")
        app = await ApplicationService.update_employer_stage(
            app_id, current_user["userId"], stage, body.get("notes")
        )
        return {"message": "Stage mis à jour", "application": app}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.delete("/{app_id}/anonymize")
async def anonymize_application(
    app_id: str,
    current_user: dict = Depends(get_current_user),
):
    try:
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Réservé aux admins")
        result = await ApplicationService.anonymize_application(app_id, current_user["userId"])
        return {"message": "Profil anonymisé avec succès (RGPD)", "application": result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")
