from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

router = APIRouter()

# ================= NOTIFICATIONS =================
@router.get("/")
def get_notifications(db: Session = Depends(get_db)):

    query = """
        SELECT notice_id, notice_title, notice_text, notice_date, is_read
        FROM notice_board
        WHERE record_status = 'Active'
        ORDER BY notice_id DESC;
    """

    result = db.execute(text(query)).mappings().all()
    return [dict(r) for r in result]


# ================= MARK READ =================
@router.put("/mark-read")
def mark_read(db: Session = Depends(get_db)):

    db.execute(text("""
        UPDATE notice_board
        SET is_read = TRUE
        WHERE is_read = FALSE;
    """))

    db.commit()

    return {"message": "updated"}