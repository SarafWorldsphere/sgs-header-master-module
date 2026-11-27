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
            m.class_id,
            c.class_name,
            c.section_name,
            m.subject_name,
            t.role,
            m.is_class_teacher,
            t.is_active

        FROM public.teacher_master t

        JOIN public.teacher_class_subject_map m
            ON m.teacher_id = t.teacher_id

        LEFT JOIN public.class_master c
            ON c.class_id = m.class_id
           AND c.academic_year = m.academic_year

        WHERE m.is_class_teacher = TRUE
          AND m.is_active = TRUE
          AND t.is_active = TRUE
          AND t.full_name IS NOT NULL
          AND TRIM(t.full_name) <> ''

        ORDER BY m.class_id, c.section_name, t.full_name;
    """

    result = db.execute(text(query)).mappings().all()

    return [dict(row) for row in result]