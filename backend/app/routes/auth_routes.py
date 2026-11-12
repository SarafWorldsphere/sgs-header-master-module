
import re
from secrets import compare_digest

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.security import create_access_token


router = APIRouter()

HEADMASTER_ROLE_ID = 8


class SsoTokenRequest(BaseModel):
    email: str | None = None
    phone: str | None = None
    role: str | None = None


def normalize_phone_values(phone: str) -> list[str]:
    cleaned = re.sub(r"[\s\-().]", "", phone)

    if not cleaned:
        return []

    candidates = [cleaned]

    if cleaned.startswith("+91") and len(cleaned) == 13:
        candidates.extend([cleaned[1:], cleaned[3:]])

    elif cleaned.startswith("91") and len(cleaned) == 12:
        candidates.extend([f"+{cleaned}", cleaned[2:]])

    elif len(cleaned) == 10 and cleaned.isdigit():
        candidates.extend([f"+91{cleaned}", f"91{cleaned}"])

    return list(dict.fromkeys(candidates))


@router.post("/sso-token")
def generate_headmaster_sso_token(
    payload: SsoTokenRequest,
    db: Session = Depends(get_db),
    x_sso_secret: str | None = Header(
        default=None,
        alias="X-SSO-Secret",
    ),
):
    # 1. Verify server-to-server SSO secret
    configured_secret = settings.SGS_SSO_SECRET

    if not configured_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SSO authentication is not configured",
        )

    if not x_sso_secret or not compare_digest(
        x_sso_secret, configured_secret
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid SSO authentication",
        )

    # 2. Verify selected dashboard
    if (payload.role or "").strip().lower() != "headmaster":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Headmaster role required",
        )

    email = (payload.email or "").strip().lower()
    phone = (payload.phone or "").strip()

    if not email and not phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or phone number is required",
        )

    # 3. Find the Headmaster record
    base_query = """
        SELECT u.user_id
        FROM public.sgs_users_masters u
        JOIN public.sgs_role_response r
            ON r.role_id = u.role_id
        WHERE u.role_id = :role_id
          AND LOWER(BTRIM(r.role_name)) = 'headmaster'
          AND u.is_active IS TRUE
          AND LOWER(BTRIM(u.record_status)) = 'active'
    """

    params = {"role_id": HEADMASTER_ROLE_ID}

    if email:
        query = text(
            base_query
            + " AND LOWER(BTRIM(u.email_id)) = :email LIMIT 1"
        )
        params["email"] = email

    else:
        phone_values = normalize_phone_values(phone)

        if not phone_values:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid phone number",
            )

        query = text(
            base_query
            + """
            AND REGEXP_REPLACE(
                COALESCE(u.mobile_no, ''),
                '[^0-9+]',
                '',
                'g'
            ) IN :phone_values
            LIMIT 1
            """
        ).bindparams(
            bindparam("phone_values", expanding=True)
        )

        params["phone_values"] = phone_values

    user = db.execute(query, params).mappings().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not authorized for Headmaster Dashboard",
        )

    # 4. Generate JWT after database verification
    access_token = create_access_token(
        user_id=str(user["user_id"]),
        role="headmaster",
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }
