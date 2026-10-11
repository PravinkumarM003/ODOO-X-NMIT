from fastapi import APIRouter, Depends, HTTPException, status, Response, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import select
import os
import shutil
import uuid

from app.db.session import get_db
from app.models.entities import User
from app.core.security import verify_password, create_access_token, get_password_hash
from app.core.dependencies import get_current_user
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse, ProfileUpdateRequest, PasswordUpdateRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials: user not found",
        )

    if not verify_password(req.password, user.passwordHash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials: password incorrect",
        )

    token_data = {
        "userId": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "buyerId": user.buyerId,
        "avatarUrl": user.avatarUrl,
    }
    access_token = create_access_token(token_data)

    # Set texflow_session cookie for seamless browser/Next.js integration
    response.set_cookie(
        key="texflow_session",
        value=access_token,
        httponly=False,
        samesite="lax",
        path="/",
    )

    if user.role == "BUYER":
        redirect_url = "/buyer/orders"
    elif user.role in ["PRODUCTION_SUPERVISOR", "MECHANIC"]:
        redirect_url = "/production"
    elif user.role == "INSPECTION_SUPERVISOR":
        redirect_url = "/rolls"
    elif user.role == "DISPATCH_OFFICER":
        redirect_url = "/dispatch"
    else:
        redirect_url = "/overview"

    return LoginResponse(
        success=True,
        token=access_token,
        user=UserResponse(
            userId=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            buyerId=user.buyerId,
            avatarUrl=user.avatarUrl,
        ),
        redirectUrl=redirect_url,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        userId=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        buyerId=current_user.buyerId,
        avatarUrl=current_user.avatarUrl,
    )


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="texflow_session", path="/")
    return {"success": True, "message": "Logged out successfully"}

@router.put("/profile", response_model=UserResponse)
def update_profile(req: ProfileUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.name = req.name
    current_user.email = req.email.strip().lower()
    
    db.commit()
    db.refresh(current_user)
    
    return UserResponse(
        userId=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        buyerId=current_user.buyerId,
        avatarUrl=current_user.avatarUrl,
    )

@router.post("/avatar", response_model=UserResponse)
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPEG, PNG, and WebP are allowed."
        )
        
    # Generate unique filename
    ext = file.filename.split(".")[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join("uploads", "avatars", filename)
    
    # Save file
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update user in DB
    # The URL will be served via the StaticFiles mount at /uploads/...
    current_user.avatarUrl = f"http://127.0.0.1:8000/uploads/avatars/{filename}"
    db.commit()
    db.refresh(current_user)
    
    return UserResponse(
        userId=current_user.id,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        buyerId=current_user.buyerId,
        avatarUrl=current_user.avatarUrl,
    )

@router.put("/password")
def update_password(req: PasswordUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not verify_password(req.currentPassword, current_user.passwordHash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password",
        )
    
    current_user.passwordHash = get_password_hash(req.newPassword)
    db.commit()
    
    return {"success": True, "message": "Password updated successfully"}
