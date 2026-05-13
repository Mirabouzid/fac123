import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def fix_admin():
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
        admin = await users.find_one({"email": default_email})
        
        if admin:
            print(f"✅ Found admin user")
            print(f"   Email: {admin['email']}")
            print(f"   Name: {admin['name']}")
            print(f"   Password hash length: {len(admin['password'])}")
            print(f"   Password hash: {admin['password']}")
            
            new_hash = pwd_context.hash("admin")
            print(f"\n✅ New password hash: {new_hash}")
            print(f"   New hash length: {len(new_hash)}")
            
            await users.update_one(
                {"email": default_email},
                {"$set": {"password": new_hash}}
            )
            print(f"\n✅ Password updated successfully!")
            
            admin_updated = await users.find_one({"email": default_email})
            is_valid = pwd_context.verify("admin", admin_updated["password"])
            print(f"✅ Password verification: {'OK' if is_valid else 'FAILED'}")
        else:
            print(f"❌ Admin user not found")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(fix_admin())
