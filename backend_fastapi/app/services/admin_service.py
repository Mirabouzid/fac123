from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId
from pymongo import DESCENDING
from app.core.database import get_database
from app.core.security import hash_password

class AdminService:
    
    @staticmethod
    async def get_dashboard_stats() -> dict:
        db = get_database()
        jobs = db["jobs"]
        applications = db["applications"]
        payments = db["payments"]
        users = db["users"]
        
        now = datetime.utcnow()
        
        pending_jobs = await jobs.count_documents({"isValidated": False})
        active_jobs = await jobs.count_documents({
            "isValidated": True,
            "status": "open"
        })
        pending_applications = await applications.count_documents({
            "status": "received"
        })
        qualified_applications = await applications.count_documents({
            "status": "qualified"
        })
        
        payment_docs = await payments.aggregate([
            {"$match": {"status": "paid"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        total_payments = payment_docs[0]["total"] if payment_docs else 0
        
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_payments = await payments.count_documents({
            "status": "paid",
            "paidAt": {"$gte": today_start}
        })
        
        rgpd_alerts = await users.count_documents({
            "rgpdExpiresAt": {"$lt": now},
            "isAnonymized": False
        })
        
        return {
            "pendingJobs": pending_jobs,
            "activeJobs": active_jobs,
            "pendingApplications": pending_applications,
            "qualifiedApplications": qualified_applications,
            "totalPayments": total_payments / 100,
            "paymentsToday": today_payments,
            "rgpdAlerts": rgpd_alerts
        }
    
    @staticmethod
    async def get_pending_jobs() -> dict:
        db = get_database()
        jobs = db["jobs"]
        users = db["users"]
        
        cursor = jobs.find({"isValidated": False}).sort([
            ("createdAt", DESCENDING)
        ])
        
        items = []
        async for job in cursor:
            employer = await users.find_one({"_id": job.get("employer")})
            items.append({
                "_id": str(job["_id"]),
                "title": job.get("title"),
                "cabinet": job.get("cabinet"),
                "employer": employer.get("company") if employer else "Unknown",
                "createdAt": job.get("createdAt"),
                "description": job.get("description")
            })
        
        return {"jobs": items}
    
    @staticmethod
    async def validate_offer(job_id: str, admin_id: str) -> dict:
        db = get_database()
        jobs = db["jobs"]
        users = db["users"]
        audit_logs = db["auditLogs"]
        
        now = datetime.utcnow()
        
        result = await jobs.update_one(
            {"_id": ObjectId(job_id)},
            {
                "$set": {
                    "isValidated": True,
                    "validatedAt": now,
                    "validatedBy": ObjectId(admin_id),
                    "pipelineStage": "active",
                    "updatedAt": now
                }
            }
        )
        
        if result.matched_count == 0:
            raise ValueError("Job not found")
        
        admin = await users.find_one({"_id": ObjectId(admin_id)})
        job = await jobs.find_one({"_id": ObjectId(job_id)})
        
        await audit_logs.insert_one({
            "action": "JOB_VALIDATED",
            "actor": ObjectId(admin_id),
            "actorEmail": admin["email"],
            "actorRole": "admin",
            "targetType": "Job",
            "targetId": ObjectId(job_id),
            "targetLabel": job["title"],
            "createdAt": now
        })
        
        return {"message": "Job validated successfully"}
    
    @staticmethod
    async def reject_offer(job_id: str, rejection_reason: str, admin_id: str) -> dict:
        db = get_database()
        jobs = db["jobs"]
        users = db["users"]
        audit_logs = db["auditLogs"]
        
        now = datetime.utcnow()
        
        result = await jobs.update_one(
            {"_id": ObjectId(job_id)},
            {
                "$set": {
                    "status": "closed",
                    "rejectedAt": now,
                    "rejectionReason": rejection_reason,
                    "updatedAt": now
                }
            }
        )
        
        if result.matched_count == 0:
            raise ValueError("Job not found")
        
        admin = await users.find_one({"_id": ObjectId(admin_id)})
        job = await jobs.find_one({"_id": ObjectId(job_id)})
        
        await audit_logs.insert_one({
            "action": "JOB_REJECTED",
            "actor": ObjectId(admin_id),
            "actorEmail": admin["email"],
            "actorRole": "admin",
            "targetType": "Job",
            "targetId": ObjectId(job_id),
            "targetLabel": job["title"],
            "metadata": {"reason": rejection_reason},
            "createdAt": now
        })
        
        return {"message": "Job rejected successfully"}
    
    @staticmethod
    async def get_pending_applications() -> dict:
        db = get_database()
        applications = db["applications"]
        
        cursor = applications.find({"status": "received"}).sort([
            ("createdAt", DESCENDING)
        ])
        
        items = []
        async for app in cursor:
            items.append({
                "_id": str(app["_id"]),
                "firstName": app.get("firstName"),
                "lastName": app.get("lastName"),
                "email": app.get("email"),
                "specialty": app.get("specialty"),
                "createdAt": app.get("createdAt")
            })
        
        return {"applications": items}
    
    @staticmethod
    async def qualify_candidate(app_id: str, admin_id: str) -> dict:
        db = get_database()
        applications = db["applications"]
        users = db["users"]
        audit_logs = db["auditLogs"]
        
        now = datetime.utcnow()
        
        admin = await users.find_one({"_id": ObjectId(admin_id)})
        
        status_history_item = {
            "status": "qualified",
            "actor": ObjectId(admin_id),
            "actorEmail": admin["email"],
            "actorRole": "admin",
            "timestamp": now,
            "notes": "Qualified by admin"
        }
        
        result = await applications.update_one(
            {"_id": ObjectId(app_id)},
            {
                "$set": {
                    "status": "qualified",
                    "updatedAt": now
                },
                "$push": {"statusHistory": status_history_item}
            }
        )
        
        if result.matched_count == 0:
            raise ValueError("Application not found")
        
        app = await applications.find_one({"_id": ObjectId(app_id)})
        
        await audit_logs.insert_one({
            "action": "APPLICATION_QUALIFIED",
            "actor": ObjectId(admin_id),
            "actorEmail": admin["email"],
            "actorRole": "admin",
            "targetType": "Application",
            "targetId": ObjectId(app_id),
            "metadata": {"candidateEmail": app.get("email")},
            "createdAt": now
        })
        
        return {"message": "Candidate qualified successfully"}
    
    @staticmethod
    async def archive_candidate(app_id: str, admin_id: str) -> dict:
        db = get_database()
        applications = db["applications"]
        users = db["users"]
        audit_logs = db["auditLogs"]
        
        now = datetime.utcnow()
        
        admin = await users.find_one({"_id": ObjectId(admin_id)})
        
        status_history_item = {
            "status": "archived",
            "actor": ObjectId(admin_id),
            "actorEmail": admin["email"],
            "actorRole": "admin",
            "timestamp": now,
            "notes": "Archived by admin"
        }
        
        result = await applications.update_one(
            {"_id": ObjectId(app_id)},
            {
                "$set": {
                    "status": "archived",
                    "updatedAt": now
                },
                "$push": {"statusHistory": status_history_item}
            }
        )
        
        if result.matched_count == 0:
            raise ValueError("Application not found")
        
        app = await applications.find_one({"_id": ObjectId(app_id)})
        
        await audit_logs.insert_one({
            "action": "APPLICATION_ARCHIVED",
            "actor": ObjectId(admin_id),
            "actorEmail": admin["email"],
            "actorRole": "admin",
            "targetType": "Application",
            "targetId": ObjectId(app_id),
            "createdAt": now
        })
        
        return {"message": "Application archived successfully"}
    
    @staticmethod
    async def get_rgpd_alerts() -> dict:
        db = get_database()
        users = db["users"]
        applications = db["applications"]
        
        now = datetime.utcnow()
        thirty_days = now + timedelta(days=30)
        
        expired_users = await users.count_documents({
            "rgpdExpiresAt": {"$lt": now},
            "isAnonymized": False
        })
        
        expired_apps = await applications.count_documents({
            "rgpdExpiresAt": {"$lt": now},
            "status": {"$ne": "archived"}
        })
        
        expiring_users = await users.count_documents({
            "rgpdExpiresAt": {"$gte": now, "$lte": thirty_days},
            "isAnonymized": False
        })
        
        expiring_apps = await applications.count_documents({
            "rgpdExpiresAt": {"$gte": now, "$lte": thirty_days},
            "status": {"$ne": "archived"}
        })
        
        return {
            "expired": {
                "users": expired_users,
                "applications": expired_apps
            },
            "expiringSoon": {
                "users": expiring_users,
                "applications": expiring_apps
            }
        }
    
    @staticmethod
    async def anonymize_all_expired(admin_id: str) -> dict:
        db = get_database()
        users = db["users"]
        applications = db["applications"]
        audit_logs = db["auditLogs"]
        
        now = datetime.utcnow()
        
        expired_users = await users.update_many(
            {
                "rgpdExpiresAt": {"$lt": now},
                "isAnonymized": False
            },
            {
                "$set": {
                    "isAnonymized": True,
                    "firstName": "Anonymisé",
                    "lastName": "RGPD",
                    "email": f"anonyme_{now.timestamp()}@rgpd.local",
                    "phone": "00 00 00 00 00",
                    "updatedAt": now
                }
            }
        )
        
        expired_apps = await applications.update_many(
            {
                "rgpdExpiresAt": {"$lt": now},
                "status": {"$ne": "archived"}
            },
            {
                "$set": {
                    "firstName": "Anonymisé",
                    "lastName": "RGPD",
                    "email": f"anonyme_{now.timestamp()}@rgpd.local",
                    "phone": "00 00 00 00 00",
                    "cvFile": None,
                    "coverLetter": None,
                    "status": "archived",
                    "updatedAt": now
                }
            }
        )
        
        total_anonymized = expired_users.modified_count + expired_apps.modified_count
        
        admin = await users.find_one({"_id": ObjectId(admin_id)})
        
        await audit_logs.insert_one({
            "action": "GDPR_BATCH_ANONYMIZATION",
            "actor": ObjectId(admin_id),
            "actorEmail": admin["email"],
            "actorRole": "admin",
            "metadata": {
                "usersAnonymized": expired_users.modified_count,
                "applicationsAnonymized": expired_apps.modified_count,
                "total": total_anonymized
            },
            "createdAt": now
        })
        
        return {
            "message": f"Anonymized {total_anonymized} expired records",
            "usersAnonymized": expired_users.modified_count,
            "applicationsAnonymized": expired_apps.modified_count
        }
    
    @staticmethod
    async def get_audit_log(
        action: Optional[str] = None,
        target_type: Optional[str] = None,
        page: int = 1,
        limit: int = 50
    ) -> dict:
        db = get_database()
        audit_logs = db["auditLogs"]
        
        query = {}
        if action:
            query["action"] = action
        if target_type:
            query["targetType"] = target_type
        
        total = await audit_logs.count_documents(query)
        
        skip = (page - 1) * limit
        cursor = audit_logs.find(query).sort([
            ("createdAt", DESCENDING)
        ]).skip(skip).limit(limit)
        
        items = []
        async for log in cursor:
            items.append({
                "id": str(log["_id"]),
                "action": log.get("action"),
                "actor": str(log.get("actor")) if log.get("actor") else None,
                "actorEmail": log.get("actorEmail"),
                "actorRole": log.get("actorRole"),
                "targetType": log.get("targetType"),
                "targetId": str(log.get("targetId")) if log.get("targetId") else None,
                "targetLabel": log.get("targetLabel"),
                "metadata": log.get("metadata"),
                "createdAt": log.get("createdAt")
            })
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }
    
    @staticmethod
    async def get_payments(
        page: int = 1,
        limit: int = 20
    ) -> dict:
        db = get_database()
        payments = db["payments"]
        
        total = await payments.count_documents({})
        
        skip = (page - 1) * limit
        cursor = payments.find({}).sort([
            ("createdAt", DESCENDING)
        ]).skip(skip).limit(limit)
        
        items = []
        async for payment in cursor:
            items.append({
                "id": str(payment["_id"]),
                "employer": str(payment.get("employer")),
                "application": str(payment.get("application")),
                "amount": payment.get("amount") / 100,
                "currency": payment.get("currency"),
                "status": payment.get("status"),
                "createdAt": payment.get("createdAt"),
                "paidAt": payment.get("paidAt")
            })
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }
    
    @staticmethod
    async def get_users(
        role: Optional[str] = None,
        page: int = 1,
        limit: int = 20
    ) -> dict:
        db = get_database()
        users = db["users"]
        
        query = {}
        if role:
            query["role"] = role
        
        total = await users.count_documents(query)
        
        skip = (page - 1) * limit
        cursor = users.find(query).sort([
            ("createdAt", DESCENDING)
        ]).skip(skip).limit(limit)
        
        items = []
        async for user in cursor:
            items.append({
                "id": str(user["_id"]),
                "email": user.get("email"),
                "name": user.get("name"),
                "role": user.get("role"),
                "company": user.get("company"),
                "createdAt": user.get("createdAt")
            })
        
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": (total + limit - 1) // limit
        }
    
    @staticmethod
    async def create_admin(email: str, password: str, name: str) -> dict:
        db = get_database()
        users = db["users"]
        audit_logs = db["auditLogs"]
        
        existing = await users.find_one({"email": email.lower()})
        if existing:
            raise ValueError("User with this email already exists")
        
        now = datetime.utcnow()
        rgpd_expires_at = now + timedelta(days=30*24)
        
        user_dict = {
            "email": email.lower(),
            "password": hash_password(password),
            "name": name,
            "role": "admin",
            "rgpdConsent": True,
            "rgpdConsentDate": now,
            "rgpdExpiresAt": rgpd_expires_at,
            "createdAt": now,
            "updatedAt": now
        }
        
        result = await users.insert_one(user_dict)
        
        await audit_logs.insert_one({
            "action": "ADMIN_CREATED",
            "targetType": "User",
            "targetId": result.inserted_id,
            "targetLabel": email,
            "metadata": {"role": "admin"},
            "createdAt": now
        })
        
        return {
            "message": "Admin created successfully",
            "id": str(result.inserted_id),
            "email": email
        }
