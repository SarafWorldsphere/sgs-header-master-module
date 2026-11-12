
from datetime import datetime, timedelta, timezone

import jwt
from jwt.exceptions import InvalidTokenError
from fastapi import HTTPException, status

from app.config import settings


def _get_jwt_secret() -> str:
    """
    Get JWT signing secret from backend environment.
    Never expose this secret to the frontend.
    """
    secret = settings.JWT_SECRET_KEY

    if not secret or not secret.strip():
        raise RuntimeError(
            "JWT_SECRET_KEY is not configured in backend .env"
        )

    return secret


def create_access_token(
    user_id: str,
    role: str,
    school_id: str | int | None = None,
) -> str:
    """
    Generate a signed JWT access token.

    This function must only be called after the user's
    identity and permissions have been verified.
    """

    if not user_id or not str(user_id).strip():
        raise ValueError("A valid user_id is required")

    if not role or not role.strip():
        raise ValueError("A valid role is required")

    now = datetime.now(timezone.utc)

    expires_at = now + timedelta(
        minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "role": role.strip().lower(),
        "iat": now,
        "exp": expires_at,
        "token_type": "access",
    }

    if school_id is not None:
        payload["school_id"] = str(school_id)

    token = jwt.encode(
        payload,
        _get_jwt_secret(),
        algorithm=settings.JWT_ALGORITHM,
    )

    return token


def decode_access_token(token: str) -> dict:
    """
    Verify JWT signature, algorithm, expiration
    and required authentication claims.
    """

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            token,
            _get_jwt_secret(),
            algorithms=[settings.JWT_ALGORITHM],
            options={
                "require": [
                    "sub",
                    "role",
                    "iat",
                    "exp",
                    "token_type",
                ]
            },
        )

        if payload.get("token_type") != "access":
            raise InvalidTokenError("Invalid token type")

        if not payload.get("sub") or not payload.get("role"):
            raise InvalidTokenError("Required claims are missing")

        return payload

    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
