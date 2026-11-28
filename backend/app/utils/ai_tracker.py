
from sqlalchemy import text
from sqlalchemy.orm import Session
from saraswati_tenant.context import current_school


def log_ai_usage(
    db: Session,
    user_info: dict,
    module_name: str,
    feature_name: str,
    usage_metadata: dict | None = None,
):
    usage_metadata = usage_metadata or {}

    prompt_tokens = usage_metadata.get("prompt_tokens", 0)
    completion_tokens = usage_metadata.get("completion_tokens", 0)
    total_tokens = usage_metadata.get(
        "total_tokens",
        prompt_tokens + completion_tokens,
    )

    try:
        school = current_school()

        db.execute(
            text("""
                INSERT INTO ai_usage_logs (
                    client_name,
                    user_email,
                    module_name,
                    feature_used,
                    prompt_tokens,
                    completion_tokens,
                    total_tokens
                )
                VALUES (
                    :client_name,
                    :user_email,
                    :module_name,
                    :feature_used,
                    :prompt_tokens,
                    :completion_tokens,
                    :total_tokens
                )
            """),
            {
                "client_name": school.slug,
                "user_email": user_info.get("email"),
                "module_name": module_name,
                "feature_used": feature_name,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
            },
        )

        db.commit()

        print(
            f"[AI TRACKER] {module_name} | {feature_name} | Tokens: {total_tokens}"
        )

    except Exception as e:
        db.rollback()
        print("AI TRACKER ERROR:", e)
