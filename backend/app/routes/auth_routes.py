import hmac

from fastapi import APIRouter, Header, HTTPException, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from saraswati_tenant import current_school

from app.config import settings
from app.database import get_db
from app.schemas.sso_schema import SSOTokenRequest
from app.utils.security import create_access_token

router = APIRouter()


def validate_sso_secret(
    sso_secret: str | None = Header(
        default=None,
        alias="X-SSO-Secret"
    )
):
    if not sso_secret or not hmac.compare_digest(
        sso_secret,
        settings.SSO_SECRET
    ):
        raise HTTPException(
            status_code=403,
            detail="Invalid SSO secret"
        )


def get_current_tenant_id() -> str:
    try:
        return current_school().tenant_id
    except RuntimeError:
        raise HTTPException(
            status_code=403,
            detail="School context not available"
        )


@router.post("/sso-token")
def create_sso_token(
    payload: SSOTokenRequest,
    _auth: None = Depends(validate_sso_secret),
    db: Session = Depends(get_db)
):
    tenant_id = get_current_tenant_id()
    print("SSO DEBUG: tenant resolved", flush=True)

    if payload.email and payload.phone:
        raise HTTPException(
            status_code=422,
            detail="Send either email or phone, not both"
        )

    if payload.email:
        email = str(payload.email).strip().lower()

        query = text("""
            SELECT u.user_id::text AS user_id
            FROM public.users_masters u
            JOIN public.role_response r
                ON r.role_id = u.role_id
            WHERE LOWER(r.role_name) = 'headmaster'
              AND u.is_active = TRUE
              AND u.record_status = 'Active'
              AND LOWER(BTRIM(u.email_id)) = :email
            LIMIT 1
        """)

        params = {"email": email}

    else:
        phone = payload.phone.strip()

        query = text("""
            SELECT u.user_id::text AS user_id
            FROM public.users_masters u
            JOIN public.role_response r
                ON r.role_id = u.role_id
            WHERE LOWER(r.role_name) = 'headmaster'
              AND u.is_active = TRUE
              AND u.record_status = 'Active'
              AND BTRIM(u.mobile_no) = :phone
            LIMIT 1
        """)

        params = {"phone": phone}

    user = db.execute(query, params).mappings().first()
    print("SSO DEBUG: user query completed", flush=True)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="No matching Headmaster account found"
        )

    token = create_access_token(data={
        "sub": user["user_id"],
        "role": "Headmaster",
        "tenant_id": tenant_id
    })

    return {
        "access_token": token,
        "token_type": "bearer"
    }