from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

router = APIRouter()


# ==========================================
# GET SUBJECTS FOR SUBJECT TEACHER FILTER
# ==========================================
@router.get("/subjects")
def get_teacher_subjects(db: Session = Depends(get_db)):
    query = """
        SELECT DISTINCT TRIM(subject_name) AS subject_name
        FROM public.sgs_subject_master
        WHERE record_status = 'Active'
          AND subject_name IS NOT NULL
          AND TRIM(subject_name) <> ''
        ORDER BY subject_name;
    """

    result = db.execute(text(query)).mappings().all()
    return [dict(row) for row in result]


# ==========================================
# GET TEACHERS WITH FILTERS AND ASSIGNMENTS
# ==========================================
@router.get("/")
def get_teachers(
    teacher_type: str = Query(
        default="all",
        pattern="^(all|class|subject)$"
    ),
    subject: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = """
        SELECT
            t.teacher_id,
            t.full_name,
            t.subject_name,
            t.class_id,
            c.class_name,
            c.section_name,
            t.section_1,
            t.section_2,
            t.role,
            t.email_id,
            t.phone,
            t.is_active,
            t.is_class_teacher,
            COALESCE(
                (
                    SELECT json_agg(
                        json_build_object(
                            'class_id', m.class_id,
                            'class_name', cm.class_name,
                            'section', m.section,
                            'subject_name', m.subject_name,
                            'is_class_teacher', m.is_class_teacher
                        )
                        ORDER BY m.class_id, m.section, m.subject_name
                    )
                 FROM public.sgs_teacher_class_map m
LEFT JOIN public.sgs_class_master cm
    ON cm.class_id = m.class_id
   AND TRIM(COALESCE(cm.section_name, ''))
       = TRIM(COALESCE(m.section, ''))
WHERE m.teacher_id = t.teacher_id
  AND m.record_status = 'Active'
                ),
                '[]'::json
            ) AS assignments
        FROM public.sgs_teacher_master t
        LEFT JOIN public.sgs_class_master c
            ON t.class_id = c.class_id
        WHERE t.is_active = TRUE

          AND (
              :teacher_type = 'all'

              OR (
                  :teacher_type = 'class'
                  AND EXISTS (
                      SELECT 1
                      FROM public.sgs_teacher_class_map m
                      WHERE m.teacher_id = t.teacher_id
                        AND m.record_status = 'Active'
                        AND m.is_class_teacher = TRUE
                  )
              )

              OR (
                  :teacher_type = 'subject'
                  AND EXISTS (
                      SELECT 1
                      FROM public.sgs_teacher_class_map m
                      WHERE m.teacher_id = t.teacher_id
                        AND m.record_status = 'Active'
                        AND m.is_class_teacher = FALSE
                        AND (
                            :subject IS NULL
                            OR LOWER(TRIM(m.subject_name))
                               = LOWER(TRIM(:subject))
                        )
                  )
              )
          )

        ORDER BY t.teacher_id;
    """

    result = db.execute(
        text(query),
        {
            "teacher_type": teacher_type,
            "subject": subject.strip() if subject else None,
        },
    ).mappings().all()

    return [dict(row) for row in result]