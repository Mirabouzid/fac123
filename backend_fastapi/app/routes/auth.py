from fastapi import APIRouter, HTTPException, Request
from app.schemas.auth import LoginRequest, SignupRequest, ForgotPasswordRequest, ResetPasswordRequest, AuthResponse
from app.services.auth_service import AuthService
from app.core.security import create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/signup")
async def signup(req: SignupRequest, request: Request):
    try:
        user_data = await AuthService.signup(req)
        token = create_access_token({
            "userId": str(user_data["_id"]),
            "email": user_data["email"],
            "role": user_data["role"]
        })
        return {
            "message": "Compte créé avec succès",
            "token": token,
            "user": {
                "id": str(user_data["_id"]),
                "email": user_data["email"],
                "name": user_data["name"],
                "role": user_data["role"],
                "firstName": user_data.get("firstName"),
                "lastName": user_data.get("lastName"),
                "phone": user_data.get("phone"),
                "specialty": user_data.get("specialty"),
                "experience": user_data.get("experience"),
                "city": user_data.get("city"),
                "availability": user_data.get("availability"),
                "company": user_data.get("company"),
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.post("/login")
async def login(req: LoginRequest, request: Request):
    try:
        ip = request.client.host if request.client else "unknown"
        result = await AuthService.login(req.email, req.password, ip)
        return {
            "message": "Connexion réussie",
            "token": result["access_token"],
            "user": result["user"]
        }
    except ValueError as e:
        import logging
        logging.error(f"❌ Login error: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        import logging
        logging.error(f"❌ Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    try:
        return await AuthService.forgot_password(req.email)
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    try:
        new_pwd = req.get_new_password()
        if not new_pwd:
            raise ValueError("Mot de passe requis")
        if len(new_pwd) < 6:
            raise ValueError("Le mot de passe doit contenir au moins 6 caractères")
        return await AuthService.reset_password(req.token, new_pwd)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Erreur serveur")
