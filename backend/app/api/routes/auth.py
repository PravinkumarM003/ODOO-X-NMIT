from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.models.entities import User
from app.core.security import verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse

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
    }
    access_token = create_access_token(token_data)

    # Set texflow_session cookie for seamless browser/Next.js integration
    response.set_cookie(
        key="texflow_session",
        value=access_token,
        httponly=True,
        samesite="lax",
        path="/",
    )

    redirect_url = "/buyer/orders" if user.role == "BUYER" else "/overview"

    return LoginResponse(
        success=True,
        token=access_token,
        user=UserResponse(
            userId=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            buyerId=user.buyerId,
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
    )


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="texflow_session", path="/")
    return {"success": True, "message": "Logged out successfully"}
