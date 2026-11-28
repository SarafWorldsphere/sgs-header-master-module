import base64
import json
from starlette.requests import Request
from sqlalchemy.orm import Session
from sqlalchemy import text


def extract_token_claims(auth_header: str | None) -> dict | None:
    """
    Decodes a standard JWT payload (header.payload.signature) without third-party dependencies.
    """
    if not auth_header:
        return None
    token = auth_header.strip()
    if token.lower().startswith("bearer "):
        token = token[7:].strip()
    parts = token.split(".")
    if len(parts) >= 2:
        try:
            padding = "=" * (4 - len(parts[1]) % 4)
            raw = base64.urlsafe_b64decode(parts[1] + padding)
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return None
    return None


def resolve_logged_in_headmaster(request: Request, db: Session) -> dict:
    """
    Resolves the currently logged-in user dynamically:
    1. From Authorization Bearer JWT token (e.g. name, email, user_id, sub)
    2. From incoming request headers (X-User-Email, X-User-Id, X-User-Name)
    3. From cookie (sgs_token)
    4. Fallback: Query database by role (Headmaster / Principal / Admin) - NO hardcoded names!
    """
    auth_header = request.headers.get("authorization") or request.cookies.get("sgs_token")
    claims = extract_token_claims(auth_header) or {}

    email = (
        request.headers.get("x-user-email")
        or claims.get("email")
        or claims.get("email_id")
    )
    user_id = (
        request.headers.get("x-user-id")
        or claims.get("user_id")
        or claims.get("sub")
    )
    name_from_claim = (
        request.headers.get("x-user-name")
        or claims.get("name")
        or claims.get("full_name")
        or claims.get("userName")
        or claims.get("username")
    )

    # 1. Look up specific user by email if provided
    if email:
        user_row = db.execute(
            text("""
                SELECT full_name, email_id, COALESCE(role, 'Headmaster Access') AS role
                FROM users_masters
                WHERE is_active = TRUE AND LOWER(email_id) = LOWER(:email)
                LIMIT 1
            """),
            {"email": email}
        ).mappings().fetchone()

        if not user_row:
            user_row = db.execute(
                text("""
                    SELECT full_name, email_id, COALESCE(role, 'Headmaster Access') AS role
                    FROM teacher_master
                    WHERE is_active = TRUE AND LOWER(email_id) = LOWER(:email)
                    LIMIT 1
                """),
                {"email": email}
            ).mappings().fetchone()

        if user_row:
            return {
                "name": user_row["full_name"] or name_from_claim or "Headmaster",
                "role": user_row["role"] or "Headmaster Access",
                "email": user_row["email_id"] or email or ""
            }

    # 2. Look up specific user by user_id if provided
    if user_id and str(user_id).isdigit():
        user_row = db.execute(
            text("""
                SELECT full_name, email_id, COALESCE(role, 'Headmaster Access') AS role
                FROM users_masters
                WHERE is_active = TRUE AND user_id = :uid
                LIMIT 1
            """),
            {"uid": int(user_id)}
        ).mappings().fetchone()

        if user_row:
            return {
                "name": user_row["full_name"] or name_from_claim or "Headmaster",
                "role": user_row["role"] or "Headmaster Access",
                "email": user_row["email_id"] or ""
            }

    # 3. Direct name from claims or headers
    if name_from_claim:
        return {
            "name": name_from_claim,
            "role": claims.get("role") or "Headmaster Access",
            "email": email or ""
        }

    # If no login credentials / token provided, return generic Headmaster fallback
    if not auth_header and not email and not user_id and not name_from_claim:
        return {
            "name": "Headmaster",
            "role": "Headmaster Access",
            "email": ""
        }

    # 4. Role-based Database Fallback (if token existed but didn't match a specific user)
    fallback_query = """
        WITH candidate_user AS (
            SELECT 
                full_name, 
                COALESCE(role, 'Headmaster Access') AS role, 
                email_id,
                1 AS priority
            FROM users_masters
            WHERE is_active = TRUE
              AND (
                  LOWER(COALESCE(role, '')) IN ('headmaster', 'admin', 'principal')
                  OR role_id IN (SELECT role_id FROM role_response WHERE LOWER(role_name) = 'headmaster')
              )
            ORDER BY user_id ASC
            LIMIT 1
        ),
        candidate_teacher AS (
            SELECT 
                full_name, 
                COALESCE(role, 'Headmaster Access') AS role, 
                email_id,
                2 AS priority
            FROM teacher_master
            WHERE is_active = TRUE
              AND LOWER(COALESCE(role, '')) IN ('headmaster', 'head_teacher', 'principal')
            ORDER BY teacher_id ASC
            LIMIT 1
        ),
        all_candidates AS (
            SELECT full_name, role, email_id FROM candidate_user
            UNION ALL
            SELECT full_name, role, email_id FROM candidate_teacher
            LIMIT 1
        )
        SELECT full_name AS name, role, email_id AS email FROM all_candidates;
    """
    row = db.execute(text(fallback_query)).mappings().fetchone()
    if row and row["name"]:
        return {
            "name": row["name"],
            "role": row["role"] or "Headmaster Access",
            "email": row["email"] or ""
        }

    return {
        "name": "Headmaster",
        "role": "Headmaster Access",
        "email": ""
    }
