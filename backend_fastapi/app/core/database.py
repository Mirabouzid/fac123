from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.server_api import ServerApi
from app.core.config import settings
import logging
import os
import asyncio

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None

async def connect_db():
    global client, db
    try:
        mongodb_uri = settings.MONGODB_URI
        if not mongodb_uri or mongodb_uri == "mongodb+srv://user:pass@cluster.mongodb.net/?appName=name":
            logger.warning("⚠️  MONGODB_URI not properly configured. Check your .env file")
            logger.warning("⚠️  API will start in development mode without database connection")
            return
        
        client = AsyncIOMotorClient(
            mongodb_uri,
            server_api=ServerApi('1'),
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000
        )
        try:
            await asyncio.wait_for(
                client.admin.command('ping'),
                timeout=10.0
            )
            db = client.get_default_database()
            logger.info("✅ Connected to MongoDB successfully")
        except asyncio.TimeoutError:
            logger.warning("⚠️  MongoDB connection timeout - API started in development mode")
            logger.warning("⚠️  Database features will be unavailable until connection is restored")
            client = None
            db = None
        except Exception as e:
            logger.warning(f"⚠️  MongoDB connection failed: {str(e)}")
            logger.warning("⚠️  API started in development mode without database")
            client = None
            db = None
    except Exception as e:
        logger.error(f"❌ Fatal error during database initialization: {str(e)}")
        logger.warning("⚠️  API will start anyway in development mode")

async def close_db():
    global client
    if client:
        try:
            client.close()
            logger.info("📴 Closed MongoDB connection")
        except Exception as e:
            logger.warning(f"⚠️  Error closing database connection: {e}")

def get_database() -> AsyncIOMotorDatabase:
    if db is None:
        raise Exception(
            "❌ Database not initialized. "
            "Ensure MongoDB is configured in .env and accessible."
        )
    return db
