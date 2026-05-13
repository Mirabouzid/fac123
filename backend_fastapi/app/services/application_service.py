from datetime import datetime, timedelta
from typing import Optional, List
from bson import ObjectId
from pymongo import DESCENDING
import random
from app.core.database import get_database

class ApplicationService:
    
    EXPERIENCE_AI_SCORES = {
        "beginner": (60, 80),
        "junior": (68, 83),
        "confirmed": (75, 90),
        "senior": (85, 95)
    }
    
    @staticmethod
    async def get_applications(
        user_id: str,
        user_role: str,
        status: Optional[str] = None,
        specialty: Optional[str] = None,
        city: Optional[str] = None,
        global_mode: bool = False,
        page: int = 1,
        limit: int = 20
    ) -> dict:
        db = get_database()
        applications = db["applications"]
        jobs = db["jobs"]
        
        if user_role == "candidate":
            query = {"candidate": ObjectId(user_id)}
        elif user_role == "employer":
            if global_mode:
                query = {"status": "qualified"}
            else:
                employer_job_ids = []
                async for job in jobs.find({"employer": ObjectId(user_id)}):
                    employer_job_ids.append(job["_id"])
                query = {"job": {"$in": employer_job_ids}}
        else:
            query = {}
        
        if status:
            query["status"] = status
        if specialty:
            query["specialty"] = {"$regex": specialty, "$options": "i"}
        if city:
            query["city"] = {"$regex": city, "$options": "i"}
        
        total = await applications.count_documents(query)
        
        skip = (page - 1) * limit
        cursor = applications.find(query).sort([
            ("createdAt", DESCENDING)
        ]).skip(skip).limit(limit)
        
        items = []
        async for app in cursor:
            is_unlocked = False
            if user_role == "employer":
                is_unlocked = ObjectId(user_id) in app.get("unlockedBy", [])
            elif user_role == "admin":
                is_unlocked = True
            
            items.append(await ApplicationService._format_application_async(db, app, is_unlocked))
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }
    
    @staticmethod
    async def create_application(
        job_id: Optional[str],
        candidate_id: str,
        cover_letter: Optional[str] = None,
        cv_file: Optional[str] = None
    ) -> dict:
        db = get_database()
        applications = db["applications"]
        jobs = db["jobs"]
        users = db["users"]
        audit_logs = db["auditLogs"]
        
        job = None
        if job_id and job_id not in ("null", "undefined"):
            job = await jobs.find_one({"_id": ObjectId(job_id)})
            if not job:
                raise ValueError("Job not found")
            
            existing = await applications.find_one({
                "job": ObjectId(job_id),
                "candidate": ObjectId(candidate_id)
            })
            if existing:
                raise ValueError("You have already applied to this job")
        
        candidate = await users.find_one({"_id": ObjectId(candidate_id)})
        if not candidate:
            raise ValueError("Candidate not found")
        
        if not candidate.get("rgpdConsent"):
            raise ValueError("You must accept GDPR consent to apply")
        
        exp_level = candidate.get("experience", "beginner").lower()
        min_score, max_score = ApplicationService.EXPERIENCE_AI_SCORES.get(
            exp_level,
            (60, 80)
        )
        ai_score = random.uniform(min_score, max_score)
        
        now = datetime.utcnow()
        rgpd_expires_at = now + timedelta(days=30*24)
        
        app_dict = {
            "job": ObjectId(job_id) if job else None,
            "candidate": ObjectId(candidate_id),
            "firstName": candidate.get("firstName", ""),
            "lastName": candidate.get("lastName", ""),
            "email": candidate.get("email"),
            "phone": candidate.get("phone"),
            "specialty": candidate.get("specialty"),
            "experience": candidate.get("experience"),
            "city": candidate.get("city"),
            "availability": candidate.get("availability"),
            "coverLetter": cover_letter,
            "cvFile": cv_file,
            "status": "received",
            "employerStage": "validating",
            "aiScore": ai_score,
            "rgpdConsent": True,
            "rgpdConsentDate": now,
            "rgpdExpiresAt": rgpd_expires_at,
            "unlockedBy": [],
            "statusHistory": [],
            "createdAt": now,
            "updatedAt": now
        }
        
        result = await applications.insert_one(app_dict)
        
        target_label = f"{job['title']} - {candidate['email']}" if job else f"Spontanée - {candidate['email']}"
        await audit_logs.insert_one({
            "action": "APPLICATION_CREATED",
            "actor": ObjectId(candidate_id),
            "actorEmail": candidate["email"],
            "actorRole": "candidate",
            "targetType": "Application",
            "targetId": result.inserted_id,
            "targetLabel": target_label,
            "metadata": {"jobId": str(job_id) if job else None, "aiScore": round(ai_score, 2)},
            "createdAt": now
        })
        
        app_dict["_id"] = result.inserted_id
        return await ApplicationService._format_application_async(db, app_dict, is_unlocked=True)
    
    @staticmethod
    async def update_application_status(
        app_id: str,
        new_status: str,
        user_id: str,
        user_role: str,
        notes: Optional[str] = None
    ) -> dict:
        db = get_database()
        applications = db["applications"]
        users = db["users"]
        audit_logs = db["auditLogs"]
        
        if user_role != "admin":
            raise ValueError("Only admins can update application status")
        
        app = await applications.find_one({"_id": ObjectId(app_id)})
        if not app:
            raise ValueError("Application not found")
        
        old_status = app.get("status")
        now = datetime.utcnow()
        
        user = await users.find_one({"_id": ObjectId(user_id)})
        
        status_history_item = {
            "status": new_status,
            "actor": ObjectId(user_id),
            "actorEmail": user["email"],
            "actorRole": user_role,
            "timestamp": now,
            "notes": notes
        }
        
        await applications.update_one(
            {"_id": ObjectId(app_id)},
            {
                "$set": {"status": new_status, "updatedAt": now},
                "$push": {"statusHistory": status_history_item}
            }
        )
        
        await audit_logs.insert_one({
            "action": "APPLICATION_STATUS_UPDATED",
            "actor": ObjectId(user_id),
            "actorEmail": user["email"],
            "actorRole": user_role,
            "targetType": "Application",
            "targetId": ObjectId(app_id),
            "metadata": {"from": old_status, "to": new_status, "notes": notes},
            "createdAt": now
        })
        
        app = await applications.find_one({"_id": ObjectId(app_id)})
        return ApplicationService._format_application(app, is_unlocked=True)
    
    @staticmethod
    async def update_employer_stage(
        app_id: str,
        employer_id: str,
        new_stage: str,
        notes: Optional[str] = None
    ) -> dict:
        db = get_database()
        applications = db["applications"]
        jobs = db["jobs"]
        users = db["users"]
        audit_logs = db["auditLogs"]
        
        app = await applications.find_one({"_id": ObjectId(app_id)})
        if not app:
            raise ValueError("Application not found")
        
        job = await jobs.find_one({"_id": app["job"]})
        if job["employer"] != ObjectId(employer_id):
            raise ValueError("Not authorized to update this application")
        
        old_stage = app.get("employerStage")
        now = datetime.utcnow()
        
        employer = await users.find_one({"_id": ObjectId(employer_id)})
        
        status_history_item = {
            "status": new_stage,
            "actor": ObjectId(employer_id),
            "actorEmail": employer["email"],
            "actorRole": "employer",
            "timestamp": now,
            "notes": notes
        }
        
        await applications.update_one(
            {"_id": ObjectId(app_id)},
            {
                "$set": {"employerStage": new_stage, "updatedAt": now},
                "$push": {"statusHistory": status_history_item}
            }
        )
        
        await audit_logs.insert_one({
            "action": "APPLICATION_EMPLOYER_STAGE_UPDATED",
            "actor": ObjectId(employer_id),
            "actorEmail": employer["email"],
            "actorRole": "employer",
            "targetType": "Application",
            "targetId": ObjectId(app_id),
            "metadata": {"from": old_stage, "to": new_stage, "notes": notes},
            "createdAt": now
        })
        
        app = await applications.find_one({"_id": ObjectId(app_id)})
        is_unlocked = ObjectId(employer_id) in app.get("unlockedBy", [])
        return ApplicationService._format_application(app, is_unlocked=is_unlocked)
    
    @staticmethod
    async def anonymize_application(app_id: str, user_id: str) -> dict:
        db = get_database()
        applications = db["applications"]
        users = db["users"]
        audit_logs = db["auditLogs"]
        
        app = await applications.find_one({"_id": ObjectId(app_id)})
        if not app:
            raise ValueError("Application not found")
        
        now = datetime.utcnow()
        
        update_data = {
            "firstName": "Anonymisé",
            "lastName": "RGPD",
            "email": f"anonyme_{app_id}@rgpd.local",
            "phone": "00 00 00 00 00",
            "cvFile": None,
            "coverLetter": None,
            "status": "archived",
            "updatedAt": now
        }
        
        await applications.update_one(
            {"_id": ObjectId(app_id)},
            {"$set": update_data}
        )
        
        user = await users.find_one({"_id": ObjectId(user_id)})
        await audit_logs.insert_one({
            "action": "APPLICATION_ANONYMIZED",
            "actor": ObjectId(user_id),
            "actorEmail": user["email"],
            "actorRole": "admin",
            "targetType": "Application",
            "targetId": ObjectId(app_id),
            "metadata": {"reason": "GDPR anonymization"},
            "createdAt": now
        })
        
        app = await applications.find_one({"_id": ObjectId(app_id)})
        return ApplicationService._format_application(app, is_unlocked=True)
    
    @staticmethod
    async def get_candidate_stats(candidate_id: str) -> dict:
        db = get_database()
        applications = db["applications"]
        
        candidate_oid = ObjectId(candidate_id)
        
        total = await applications.count_documents({"candidate": candidate_oid})
        received = await applications.count_documents({
            "candidate": candidate_oid,
            "status": "received"
        })
        validating = await applications.count_documents({
            "candidate": candidate_oid,
            "status": "validating"
        })
        qualified = await applications.count_documents({
            "candidate": candidate_oid,
            "status": "qualified"
        })
        archived = await applications.count_documents({
            "candidate": candidate_oid,
            "status": "archived"
        })
        
        return {
            "total": total,
            "received": received,
            "validating": validating,
            "qualified": qualified,
            "archived": archived
        }
    
    @staticmethod
    async def _format_application_async(db, app: dict, is_unlocked: bool = False) -> dict:
        result = {
            "_id": str(app["_id"]),
            "firstName": app.get("firstName"),
            "lastName": app.get("lastName"),
            "email": app.get("email"),
            "specialty": app.get("specialty"),
            "experience": app.get("experience"),
            "city": app.get("city"),
            "availability": app.get("availability"),
            "coverLetter": app.get("coverLetter"),
            "cvFile": app.get("cvFile"),
            "status": app.get("status"),
            "employerStage": app.get("employerStage"),
            "aiScore": app.get("aiScore"),
            "job": None,
            "candidate": str(app.get("candidate")) if app.get("candidate") else None,
            "createdAt": app.get("createdAt"),
            "unlockedBy": [str(uid) for uid in app.get("unlockedBy", [])],
            "isUnlocked": is_unlocked,
            "rgpdExpiresAt": app.get("rgpdExpiresAt"),
        }
        
        if app.get("job"):
            jobs = db["jobs"]
            job = await jobs.find_one({"_id": app["job"]})
            if job:
                result["job"] = {
                    "_id": str(job["_id"]),
                    "title": job.get("title"),
                    "cabinet": job.get("cabinet"),
                    "location": job.get("location"),
                }
        
        if not is_unlocked:
            result["email"] = ApplicationService._mask_email(result["email"])
            result["phone"] = ApplicationService._mask_phone(app.get("phone"))
            result["cvFile"] = None
        else:
            result["phone"] = app.get("phone")
        
        return result
    
    @staticmethod
    def _mask_email(email: str) -> str:
        if not email:
            return None
        parts = email.split("@")
        if len(parts) != 2:
            return email
        local = parts[0]
        domain = parts[1]
        if len(local) <= 1:
            return f"e***@{domain}"
        masked_local = local[0] + "***" + local[-1]
        return f"{masked_local}@{domain}"
    
    @staticmethod
    def _mask_phone(phone: str) -> str:
        if not phone or len(phone) < 10:
            return "00 00 00 00 00"
        return f"{phone[:2]} ** ** ** {phone[-2:]}"
