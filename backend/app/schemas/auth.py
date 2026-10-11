from typing import Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    userId: str
    email: str
    name: str
    role: str
    buyerId: Optional[str] = None
    avatarUrl: Optional[str] = None


class LoginResponse(BaseModel):
    success: bool
    token: str
    user: UserResponse
    redirectUrl: str

class ProfileUpdateRequest(BaseModel):
    name: str
    email: str

class PasswordUpdateRequest(BaseModel):
    currentPassword: str
    newPassword: str
