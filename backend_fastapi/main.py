from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os
import logging
from app.core.config import settings
from app.core.database import connect_db, close_db
from app.routes import auth, users, jobs, applications, payments, admin
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Efficience Recrute API",
    description="Plateforme de recrutement médical & paramédical",
    version="2.0.0"
)

origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    settings.FRONTEND_URL,
]
if settings.FRONTEND_URL_ALT:
    origins.append(settings.FRONTEND_URL_ALT)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(origins)),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("public/uploads/cv", exist_ok=True)
os.makedirs("public/uploads/jobs", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="public/uploads"), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(payments.router)
app.include_router(admin.router)

@app.get("/api/health")
async def health():
    return {
        "status": "OK",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0"
    }

@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def handle_404(full_path: str):
    return JSONResponse(
        status_code=404,
        content={"message": f"Route not found: /api/{full_path}"}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"❌ Unexpected error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error"}
    )

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Démarrage de l'API Efficience Recrute...")
    await connect_db()

    try:
        from app.core.database import get_database
        from app.core.security import hash_password
        try:
            db = get_database()
            users_col = db["users"]
            default_email = "jemaanassim480@gmail.com"
            existing = await users_col.find_one({"email": default_email})
            if not existing:
                from datetime import datetime, timedelta
                now = datetime.utcnow()
                await users_col.insert_one({
                    "email": default_email,
                    "password": hash_password("admin"),
                    "name": "Admin Principal",
                    "role": "admin",
                    "rgpdConsent": True,
                    "rgpdConsentDate": now,
                    "rgpdExpiresAt": now + timedelta(days=730),
                    "createdAt": now,
                    "updatedAt": now,
                })
                logger.info(f"✅ Compte admin créé ({default_email})")
        except Exception as e:
            logger.warning(f"⚠️  Erreur seed admin (DB unavailable): {e}")
    except Exception as e:
        logger.warning(f"⚠️  Erreur initialisation admin : {e}")

    logger.info("✅ API démarrée avec succès sur le port " + str(settings.PORT))

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 Arrêt de l'API...")
    await close_db()

@app.get("/")
async def root():
    return {
        "message": "Efficience Recrute API v2 (FastAPI)",
        "status": "running",
        "version": "2.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development"
    )
