import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi
from passlib.context import CryptContext
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_admin():
    try:
        client = AsyncIOMotorClient(
            "mongodb+srv://NASSIM:Mira%2A.%2A2001@cluster0.mje1txh.mongodb.net/efficience-recrute?appName=Cluster0",
            server_api=ServerApi('1')
        )
        
        await client.admin.command('ping')
        print("✅ Connected to MongoDB")
        
        db = client.get_default_database()
        users = db["users"]
        
        default_email = "jemaanassim480@gmail.com"
        existing = await users.find_one({"email": default_email})
        
        if existing:
            print(f"✅ Admin user already exists: {existing['email']}")
            print(f"   ID: {existing['_id']}")
            print(f"   Name: {existing['name']}")
            print(f"   Role: {existing['role']}")
        else:
            print(f"❌ Admin user not found. Creating...")
            
            hashed_password = pwd_context.hash("admin")
            
            now = datetime.utcnow()
            result = await users.insert_one({
                "email": default_email,
                "password": hashed_password,
                "name": "Admin Principal",
                "role": "admin",
                "rgpdConsent": True,
                "rgpdConsentDate": now,
                "rgpdExpiresAt": now + timedelta(days=730),
                "createdAt": now,
                "updatedAt": now,
            })
            
            print(f"✅ Admin user created successfully!")
            print(f"   ID: {result.inserted_id}")
            print(f"   Email: {default_email}")
            print(f"   Password: admin")
        
        admin = await users.find_one({"email": default_email})
        if admin:
            is_valid = pwd_context.verify("admin", admin["password"])
            print(f"\n✅ Password verification: {'OK' if is_valid else 'FAILED'}")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(seed_admin())
