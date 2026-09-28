from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

router = APIRouter()


@router.get("/")
def get_functions(db: Session = Depends(get_db)):

    query = """
        SELECT
            event_id,
            event_title,
            event_description,
            event_date,
            event_type,
            applicable_class,
            record_status
        FROM sgs_events
        WHERE record_status = 'Active'
          AND event_type IN ('event', 'function')
        ORDER BY event_id DESC;
    """

    result = db.execute(text(query)).mappings().all()

    return [dict(r) for r in result]