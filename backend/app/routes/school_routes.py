
from fastapi import APIRouter
from saraswati_tenant import current_school

router = APIRouter()

@router.get("/school")
def get_school():
    school = current_school()
    cfg = school.config or {}

    return {
        "tenantId": str(school.tenant_id),
        "schoolName": cfg.get("schoolName"),
        "shortName": cfg.get("shortName"),
        "theme": cfg.get("theme"),
    }
