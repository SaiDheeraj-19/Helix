"""
Helix — Auth Module: Pydantic Schemas
"""

import re
import uuid

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

# =============================================================================
# Request Schemas
# =============================================================================


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=30)
    display_name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError("Username can only contain letters, numbers, hyphens, and underscores")
        if v.lower() in {"admin", "root", "helix", "support", "api", "www"}:
            raise ValueError("This username is reserved")
        return v.lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        from src.core.security import validate_password_strength

        is_valid, message = validate_password_strength(v)
        if not is_valid:
            raise ValueError(message)
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)
    remember_me: bool = False



class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)
    confirm_password: str

    @model_validator(mode="after")
    def passwords_match(self) -> "ResetPasswordRequest":
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        from src.core.security import validate_password_strength

        is_valid, message = validate_password_strength(v)
        if not is_valid:
            raise ValueError(message)
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)
    confirm_password: str

    @model_validator(mode="after")
    def passwords_match(self) -> "ChangePasswordRequest":
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class VerifyEmailRequest(BaseModel):
    token: str


# =============================================================================
# Response Schemas
# =============================================================================


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str = Field(exclude=True)
    token_type: str = "bearer"
    expires_in: int  # seconds


class AuthUserResponse(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    display_name: str
    avatar_url: str | None
    is_email_verified: bool
    is_onboarded: bool
    status: str

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    tokens: TokenResponse
    user: AuthUserResponse


class MessageResponse(BaseModel):
    message: str
