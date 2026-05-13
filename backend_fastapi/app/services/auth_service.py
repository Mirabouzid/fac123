from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId
from app.core.database import get_database
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.auth import SignupRequest

class AuthService:
    
    @staticmethod
    async def signup(user_create: SignupRequest) -> dict:
        db = get_database()
        users = db["users"]
        
        existing_user = await users.find_one({"email": user_create.email.lower()})
        if existing_user:
            raise ValueError("User with this email already exists")
        
        if user_create.role == "admin":
            raise ValueError("Cannot create admin account via signup")
        
        now = datetime.utcnow()
        rgpd_expires_at = now + timedelta(days=30*24)
        
        user_dict = user_create.dict()
        user_dict["email"] = user_dict["email"].lower()
        user_dict["password"] = hash_password(user_dict["password"])
        user_dict["rgpdConsentDate"] = now
        user_dict["rgpdExpiresAt"] = rgpd_expires_at
        user_dict["createdAt"] = now
        user_dict["updatedAt"] = now
        
        result = await users.insert_one(user_dict)
        user_dict["_id"] = result.inserted_id
        
        return user_dict
    
    @staticmethod
    async def login(email: str, password: str, ip_address: str) -> dict:
        import logging
        logger = logging.getLogger(__name__)
        
        db = get_database()
        users = db["users"]
        audit_logs = db["auditLogs"]
        
        logger.info(f"🔍 Looking for user: {email.lower()}")
        user = await users.find_one({"email": email.lower()})
        if not user:
            logger.error(f"❌ User not found: {email.lower()}")
            raise ValueError("Invalid credentials")
        
        logger.info(f"✅ User found: {user.get('email')} (role: {user.get('role')})")
        
        if user.get("isAnonymized"):
            logger.error(f"❌ User is anonymized: {email}")
            raise ValueError("This account has been deleted")
        
        logger.info(f"🔐 Verifying password...")
        is_valid = verify_password(password, user["password"])
        if not is_valid:
            logger.error(f"❌ Password verification failed for: {email}")
            raise ValueError("Invalid credentials")
        
        logger.info(f"✅ Password verified successfully")
        
        token = create_access_token({
            "userId": str(user["_id"]),
            "email": user["email"],
            "role": user["role"]
        })
        
        await audit_logs.insert_one({
            "action": "USER_LOGIN",
            "actor": user["_id"],
            "actorEmail": user["email"],
            "actorRole": user["role"],
            "targetType": "User",
            "targetId": user["_id"],
            "targetLabel": user["email"],
            "metadata": {"ip": ip_address},
            "ipAddress": ip_address,
            "createdAt": datetime.utcnow()
        })
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": str(user["_id"]),
                "email": user["email"],
                "name": user["name"],
                "role": user["role"],
                "firstName": user.get("firstName"),
                "lastName": user.get("lastName"),
                "phone": user.get("phone"),
                "specialty": user.get("specialty"),
                "experience": user.get("experience"),
                "city": user.get("city"),
                "availability": user.get("availability"),
                "company": user.get("company"),
                "address": user.get("address"),
                "contactEmail": user.get("contactEmail"),
            }
        }
    
    @staticmethod
    async def get_profile(user_id: str) -> dict:
        db = get_database()
        users = db["users"]
        
        user = await users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise ValueError("User not found")
        
        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "firstName": user.get("firstName"),
            "lastName": user.get("lastName"),
            "phone": user.get("phone"),
            "specialty": user.get("specialty"),
            "experience": user.get("experience"),
            "city": user.get("city"),
            "availability": user.get("availability"),
            "company": user.get("company"),
            "address": user.get("address"),
            "contactEmail": user.get("contactEmail"),
        }
    
    @staticmethod
    async def update_profile(user_id: str, update_data: dict) -> dict:
        db = get_database()
        users = db["users"]
        
        forbidden_fields = ["password", "email", "role", "rgpdConsent", "isAnonymized", "aiScore"]
        
        for field in forbidden_fields:
            update_data.pop(field, None)
        
        update_data["updatedAt"] = datetime.utcnow()
        
        result = await users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise ValueError("User not found")
        
        user = await users.find_one({"_id": ObjectId(user_id)})
        
        return {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "firstName": user.get("firstName"),
            "lastName": user.get("lastName"),
            "phone": user.get("phone"),
            "specialty": user.get("specialty"),
            "experience": user.get("experience"),
            "city": user.get("city"),
            "availability": user.get("availability"),
            "company": user.get("company"),
            "address": user.get("address"),
            "contactEmail": user.get("contactEmail"),
        }
    
    @staticmethod
    async def forgot_password(email: str) -> dict:
        import secrets
        db = get_database()
        users = db["users"]
        
        user = await users.find_one({"email": email.lower()})
        
        if user:
            reset_token = secrets.token_urlsafe(32)
            reset_expires = datetime.utcnow() + timedelta(hours=1)
            
            await users.update_one(
                {"_id": user["_id"]},
                {"$set": {
                    "resetToken": reset_token,
                    "resetTokenExpiration": reset_expires
                }}
            )
        
        return {"message": "If your email exists, you will receive a password reset link"}
    
    @staticmethod
    async def reset_password(reset_token: str, new_password: str) -> dict:
        db = get_database()
        users = db["users"]
        
        user = await users.find_one({
            "resetToken": reset_token,
            "resetTokenExpiration": {"$gt": datetime.utcnow()}
        })
        
        if not user:
            raise ValueError("Invalid or expired reset token")
        
        hashed_password = hash_password(new_password)
        
        await users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "password": hashed_password,
                "resetToken": None,
                "resetTokenExpiration": None,
                "updatedAt": datetime.utcnow()
            }}
        )
        
        token = create_access_token({
            "userId": str(user["_id"]),
            "email": user["email"],
            "role": user["role"]
        })
        
        return {
            "message": "Password reset successful",
            "access_token": token,
            "token_type": "bearer"
        }
