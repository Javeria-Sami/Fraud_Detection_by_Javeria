"""
Pydantic Schemas for Authentication, Tokens, RBAC, and User Management.
"""
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    role: str
    permissions: List[str] = []
    user_id: str
    email: str
    full_name: str

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class TokenRefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class LoginRequest(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    username: Optional[str] = None
    full_name: str
    password: str = Field(..., min_length=6)
    role: str = "analyst"

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class PermissionResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class RoleResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    permissions: List[str] = []

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: str
    email: str
    username: Optional[str] = None
    full_name: str
    role: str
    permissions: List[str] = []
    is_active: bool
    is_verified: bool = True
    created_at: Optional[str] = None
    last_login_at: Optional[str] = None

    class Config:
        from_attributes = True
