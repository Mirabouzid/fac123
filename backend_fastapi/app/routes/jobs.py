from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query, Body
from app.middleware.dependencies import get_current_user
from app.services.job_service import JobService
from typing import Optional, Any
import os, uuid, json
from datetime import datetime

router = APIRouter(prefix="/api/jobs", tags=["jobs"])
UPLOAD_DIR = "public/uploads/jobs"

@router.get("/employer/my-jobs")
async def get_my_jobs(current_user: dict = Depends(get_current_user)):
    try:
        if current_user["role"] not in ["employer", "admin"]:
            raise HTTPException(status_code=403, detail="Non autorisé")
        result = await JobService.get_employer_jobs(current_user["userId"])
        return result
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.get("/employer/stats")
async def get_employer_stats(current_user: dict = Depends(get_current_user)):
    try:
        if current_user["role"] not in ["employer", "admin"]:
            raise HTTPException(status_code=403, detail="Non autorisé")
        stats = await JobService.get_employer_stats(current_user["userId"])
        return {"stats": stats}
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.get("")
async def get_jobs(
    position: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    urgency: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    try:
        result = await JobService.get_jobs(position, city, urgency, page, limit)
        return {
            "jobs": result["items"],
            "total": result["total"],
            "page": result["page"],
            "totalPages": result["pages"],
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.get("/{job_id}")
async def get_job(job_id: str):
    try:
        job = await JobService.get_job_by_id(job_id)
        return {"job": job}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.post("")
async def create_job(
    title: str = Form(...),
    cabinet: str = Form(...),
    description: str = Form(...),
    location: str = Form(...),
    address: Optional[str] = Form(None),
    contactEmail: Optional[str] = Form(None),
    salaryMin: Optional[str] = Form(None),
    salaryMax: Optional[str] = Form(None),
    contractType: str = Form(default="CDI"),
    urgency: Optional[str] = Form(default="false"),
    requirements: Optional[str] = Form(None),
    jobDescriptionFile: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
):
    try:
        if current_user["role"] not in ["employer", "admin"]:
            raise HTTPException(status_code=403, detail="Non autorisé")

        file_name = None
        if jobDescriptionFile:
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            ext = jobDescriptionFile.filename.split(".")[-1]
            file_name = f"job-{current_user['userId']}-{uuid.uuid4().hex}.{ext}"
            content = await jobDescriptionFile.read()
            with open(os.path.join(UPLOAD_DIR, file_name), "wb") as f:
                f.write(content)

        req_list = []
        if requirements:
            try:
                req_list = json.loads(requirements)
            except Exception:
                req_list = [r.strip() for r in requirements.split(",") if r.strip()]

        job_data = {
            "title": title,
            "cabinet": cabinet,
            "description": description,
            "requirements": req_list,
            "location": location,
            "address": address,
            "contactEmail": contactEmail,
            "salary": {
                "min": int(salaryMin) if salaryMin else 0,
                "max": int(salaryMax) if salaryMax else 0,
            },
            "contractType": contractType,
            "urgency": urgency in ("true", "1", "True"),
        }

        job = await JobService.create_job(current_user["userId"], job_data, file_name)
        return {"message": "Offre soumise — en attente de validation (24-48h)", "job": job}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.put("/{job_id}")
async def update_job(
    job_id: str,
    request_body: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        job = await JobService.update_job(job_id, request_body, current_user["userId"], current_user["role"])
        return {"message": "Offre mise à jour", "job": job}
    except ValueError as e:
        code = 403 if "authorized" in str(e).lower() else 404
        raise HTTPException(status_code=code, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.put("/{job_id}/pipeline")
async def update_pipeline_stage(
    job_id: str,
    body: dict = Body(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        stage = body.get("stage") or body.get("pipelineStage")
        if not stage:
            raise HTTPException(status_code=400, detail="stage requis")
        job = await JobService.update_pipeline_stage(job_id, stage, current_user["userId"], current_user["role"])
        return {"message": "Stage mis à jour", "job": job}
    except ValueError as e:
        code = 403 if "authorized" in str(e).lower() else 400
        raise HTTPException(status_code=code, detail=str(e))
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.delete("/{job_id}")
async def delete_job(job_id: str, current_user: dict = Depends(get_current_user)):
    try:
        result = await JobService.delete_job(job_id, current_user["userId"], current_user["role"])
        return result
    except ValueError as e:
        code = 403 if "authorized" in str(e).lower() else 404
        raise HTTPException(status_code=code, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")
