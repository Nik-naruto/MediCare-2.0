"""Token Pydantic Schemas."""

from typing import Optional
from pydantic import BaseModel


class Token(BaseModel):
    """Schema for returning OAuth2 access token response."""

    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Schema for decoded token payload."""

    sub: Optional[str] = None
