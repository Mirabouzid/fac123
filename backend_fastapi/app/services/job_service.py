from datetime import datetime
from typing import Optional, List
from bson import ObjectId
from pymongo import ASCENDING, DESCENDING
import re
from app.core.database import get_database

class JobService:
    
    @staticmethod
    async def get_jobs(
        position: Optional[str] = None,
        city: Optional[str] = None,
        urgency: Optional[bool] = None,
        page: int = 1,
        limit: int = 20
    ) -> dict:
        db = get_database()
        jobs = db["jobs"]
        
        query = {"isValidated": True, "status": "open"}
        
        if position:
            query["title"] = {"$regex": position, "$options": "i"}
        
        if city:
            query["location"] = {"$regex": city, "$options": "i"}
        
        if urgency is not None:
            query["urgency"] = urgency
        
        total = await jobs.count_documents(query)
        
        skip = (page - 1) * limit
        cursor = jobs.find(query).sort([
            ("urgency", DESCENDING),
            ("createdAt", DESCENDING)
        ]).skip(skip).limit(limit)
        
        items = []
        async for job in cursor:
            items.append(JobService._format_job(job))
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }
    
    @staticmethod
    async def get_job_by_id(job_id: str) -> dict:
        db = get_database()
        jobs = db["jobs"]
        
        job = await jobs.find_one({"_id": ObjectId(job_id)})
        if not job:
            raise ValueError("Job not found")
        
        return JobService._format_job(job)
    
    @staticmethod
    async def get_employer_jobs(employer_id: str) -> dict:
        db = get_database()
        jobs = db["jobs"]
        
        cursor = jobs.find({"employer": ObjectId(employer_id)}).sort([
            ("createdAt", DESCENDING)
        ])
        
        items = []
        async for job in cursor:
            items.append(JobService._format_job(job))
        
        return {"jobs": items}
    
    @staticmethod
    async def create_job(employer_id: str, job_data: dict, file_path: Optional[str] = None) -> dict:
        db = get_database()
        jobs = db["jobs"]
        audit_logs = db["auditLogs"]
        users = db["users"]
        
        employer = await users.find_one({"_id": ObjectId(employer_id)})
        if not employer:
            raise ValueError("Employer not found")
        
        job_dict = {
            "title": job_data.get("title"),
            "cabinet": job_data.get("cabinet"),
            "description": job_data.get("description"),
            "requirements": job_data.get("requirements", []),
            "location": job_data.get("location"),
            "address": job_data.get("address"),
            "contactEmail": job_data.get("contactEmail"),
            "salary": {
                "min": int(job_data.get("salary", {}).get("min", 0)),
                "max": int(job_data.get("salary", {}).get("max", 0))
            },
            "contractType": job_data.get("contractType", "CDI"),
            "urgency": job_data.get("urgency", False),
            "employer": ObjectId(employer_id),
            "pipelineStage": "validating",
            "isValidated": False,
            "status": "open",
            "jobDescriptionFile": file_path,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        result = await jobs.insert_one(job_dict)
        
        await audit_logs.insert_one({
            "action": "JOB_CREATED",
            "actor": ObjectId(employer_id),
            "actorEmail": employer["email"],
            "actorRole": employer["role"],
            "targetType": "Job",
            "targetId": result.inserted_id,
            "targetLabel": job_dict["title"],
            "metadata": {"pipelineStage": "validating"},
            "createdAt": datetime.utcnow()
        })
        
        job_dict["_id"] = result.inserted_id
        return JobService._format_job(job_dict)
    
    @staticmethod
    async def update_job(job_id: str, update_data: dict, user_id: str, user_role: str) -> dict:
        db = get_database()
        jobs = db["jobs"]
        audit_logs = db["auditLogs"]
        users = db["users"]
        
        job = await jobs.find_one({"_id": ObjectId(job_id)})
        if not job:
            raise ValueError("Job not found")
        
        if user_role != "admin" and job["employer"] != ObjectId(user_id):
            raise ValueError("Not authorized to update this job")
        
        if user_role != "admin":
            forbidden_fields = ["isValidated", "validatedAt", "validatedBy", "rejectedAt", "rejectionReason"]
            for field in forbidden_fields:
                update_data.pop(field, None)
        
        update_data["updatedAt"] = datetime.utcnow()
        
        result = await jobs.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise ValueError("Job not found")
        
        job = await jobs.find_one({"_id": ObjectId(job_id)})
        
        user = await users.find_one({"_id": ObjectId(user_id)})
        await audit_logs.insert_one({
            "action": "JOB_UPDATED",
            "actor": ObjectId(user_id),
            "actorEmail": user["email"],
            "actorRole": user_role,
            "targetType": "Job",
            "targetId": ObjectId(job_id),
            "targetLabel": job["title"],
            "metadata": {"changes": list(update_data.keys())},
            "createdAt": datetime.utcnow()
        })
        
        return JobService._format_job(job)
    
    @staticmethod
    async def update_pipeline_stage(job_id: str, new_stage: str, user_id: str, user_role: str) -> dict:
        db = get_database()
        jobs = db["jobs"]
        audit_logs = db["auditLogs"]
        users = db["users"]
        
        job = await jobs.find_one({"_id": ObjectId(job_id)})
        if not job:
            raise ValueError("Job not found")
        
        if user_role != "admin" and job["employer"] != ObjectId(user_id):
            raise ValueError("Not authorized to update this job")
        
        old_stage = job.get("pipelineStage")
        
        update_data = {
            "pipelineStage": new_stage,
            "updatedAt": datetime.utcnow()
        }
        
        if new_stage == "closed":
            update_data["status"] = "closed"
        
        await jobs.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": update_data}
        )
        
        user = await users.find_one({"_id": ObjectId(user_id)})
        await audit_logs.insert_one({
            "action": "JOB_PIPELINE_UPDATED",
            "actor": ObjectId(user_id),
            "actorEmail": user["email"],
            "actorRole": user_role,
            "targetType": "Job",
            "targetId": ObjectId(job_id),
            "targetLabel": job["title"],
            "metadata": {"from": old_stage, "to": new_stage},
            "createdAt": datetime.utcnow()
        })
        
        job = await jobs.find_one({"_id": ObjectId(job_id)})
        return JobService._format_job(job)
    
    @staticmethod
    async def delete_job(job_id: str, user_id: str, user_role: str) -> dict:
        db = get_database()
        jobs = db["jobs"]
        audit_logs = db["auditLogs"]
        users = db["users"]
        
        job = await jobs.find_one({"_id": ObjectId(job_id)})
        if not job:
            raise ValueError("Job not found")
        
        if user_role != "admin" and job["employer"] != ObjectId(user_id):
            raise ValueError("Not authorized to delete this job")
        
        result = await jobs.delete_one({"_id": ObjectId(job_id)})
        
        if result.deleted_count == 0:
            raise ValueError("Job not found")
        
        user = await users.find_one({"_id": ObjectId(user_id)})
        await audit_logs.insert_one({
            "action": "JOB_DELETED",
            "actor": ObjectId(user_id),
            "actorEmail": user["email"],
            "actorRole": user_role,
            "targetType": "Job",
            "targetId": ObjectId(job_id),
            "targetLabel": job["title"],
            "createdAt": datetime.utcnow()
        })
        
        return {"message": "Job deleted successfully"}
    
    @staticmethod
    def _format_job(job: dict) -> dict:
        return {
            "_id": str(job["_id"]),
            "title": job.get("title"),
            "cabinet": job.get("cabinet"),
            "description": job.get("description"),
            "requirements": job.get("requirements", []),
            "location": job.get("location"),
            "address": job.get("address"),
            "contactEmail": job.get("contactEmail"),
            "salary": job.get("salary", {}),
            "contractType": job.get("contractType"),
            "urgency": job.get("urgency", False),
            "status": job.get("status"),
            "pipelineStage": job.get("pipelineStage"),
            "isValidated": job.get("isValidated", False),
            "validatedAt": job.get("validatedAt"),
            "rejectionReason": job.get("rejectionReason"),
            "employer": str(job.get("employer")) if job.get("employer") else None,
            "createdAt": job.get("createdAt"),
            "updatedAt": job.get("updatedAt")
        }
    
    @staticmethod
    async def get_employer_stats(employer_id: str) -> dict:
        db = get_database()
        jobs = db["jobs"]
        applications = db["applications"]

        employer_oid = ObjectId(employer_id)

        job_ids = [j["_id"] async for j in jobs.find({"employer": employer_oid}, {"_id": 1})]

        active_offers = await jobs.count_documents({
            "employer": employer_oid,
            "isValidated": True,
            "status": "open",
        })
        total_applications = await applications.count_documents({"job": {"$in": job_ids}})
        pending_review = await applications.count_documents({
            "job": {"$in": job_ids},
            "employerStage": "validating",
        })
        interviews = await applications.count_documents({
            "job": {"$in": job_ids},
            "employerStage": "interview",
        })

        return {
            "activeOffers": active_offers,
            "totalApplications": total_applications,
            "pendingReview": pending_review,
            "interviews": interviews,
        }
