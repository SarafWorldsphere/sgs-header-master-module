from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db

router = APIRouter()


@router.get("/")
def get_class_teachers(db: Session = Depends(get_db)):

    query = """
        SELECT
            t.teacher_id,
            t.full_name AS class_teacher_name,
            t.email_id AS teacher_email,
            t.phone AS teacher_mobile,
            t.class_id,
            c.class_name,
            t.section_1,
            t.section_2,
            t.subject_name,
            t.role,
            t.is_class_teacher,
            t.is_active,
            t.record_status

        FROM sgs_teacher_master t

        LEFT JOIN sgs_class_master c
            ON t.class_id = c.class_id

        WHERE t.is_class_teacher = TRUE
          AND t.is_active = TRUE
          AND t.record_status = 'Active'
          AND t.full_name IS NOT NULL
          AND TRIM(t.full_name) <> ''

        ORDER BY t.class_id, t.full_name;
    """

    result = db.execute(text(query)).mappings().all()

    return [dict(row) for row in result]