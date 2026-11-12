
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.security import decode_access_token


# Read Bearer token from Authorization header
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
) -> dict:
    """
    Validate JWT and return authenticated user claims.
    """

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme",
        )

    payload = decode_access_token(credentials.credentials)

    return {
        "user_id": payload["sub"],
        "role": payload["role"].strip().lower(),
        "school_id": payload.get("school_id"),
    }


def require_headmaster(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """
    Allow only authenticated Headmaster users.
    """

    if current_user["role"] != "headmaster":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Headmaster access required",
        )

    return current_user
