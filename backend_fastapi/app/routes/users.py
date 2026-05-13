from fastapi import APIRouter, HTTPException, Depends
from app.middleware.dependencies import get_current_user
from app.services.auth_service import AuthService
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/users", tags=["users"])

class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    firstName: Optional[str] = None
    lastName: Optional[str] = None
    phone: Optional[str] = None
    specialty: Optional[str] = None
    experience: Optional[str] = None
    city: Optional[str] = None
    availability: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None
    contactEmail: Optional[str] = None

@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    try:
        user = await AuthService.get_profile(current_user["userId"])
        return {
            "message": "Profile retrieved successfully",
            "user": user
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Server error")

@router.put("/profile")
async def update_profile(
    req: UserUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        update_data = req.dict(exclude_unset=True)
        user = await AuthService.update_profile(current_user["userId"], update_data)
        return {
            "message": "Profile updated successfully",
            "user": user
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Server error")
