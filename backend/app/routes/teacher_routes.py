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
        FROM public.subject_master
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
            t.tenant_id,
            t.full_name,
            t.subject_name,
            t.class_id,
            t.section_1,
            t.section_2,
            t.role,
            t.email_id,
            t.phone,
            t.is_active,

            COALESCE(a.class_count, 0) AS class_count,
            COALESCE(a.section_count, 0) AS section_count,
            COALESCE(a.subject_count, 0) AS subject_count,
            COALESCE(a.is_class_teacher, FALSE) AS is_class_teacher,
            COALESCE(a.assignments, '[]'::json) AS assignments

        FROM public.teacher_master t

        LEFT JOIN LATERAL (
            SELECT
                COUNT(DISTINCT m.class_id) AS class_count,

                COUNT(
                    DISTINCT (m.class_id, cm.section_name)
                ) AS section_count,

                COUNT(
                    DISTINCT LOWER(TRIM(m.subject_name))
                ) AS subject_count,

                BOOL_OR(m.is_class_teacher) AS is_class_teacher,

                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'assignment_id', m.assignment_id,
                        'class_id', m.class_id,
                        'class_name', cm.class_name,
                        'section', cm.section_name,
                        'subject_name', m.subject_name,
                        'academic_year', m.academic_year,
                        'is_class_teacher', m.is_class_teacher,
                        'is_active', m.is_active
                    )
                    ORDER BY
                        m.class_id,
                        cm.section_name,
                        m.subject_name
                ) AS assignments

            FROM public.teacher_class_subject_map m

            LEFT JOIN public.class_master cm
                ON cm.tenant_id = m.tenant_id
               AND cm.class_id = m.class_id
               AND cm.academic_year = m.academic_year

            WHERE m.tenant_id = t.tenant_id
              AND m.teacher_id = t.teacher_id
              AND m.is_active = TRUE
        ) a ON TRUE

        WHERE t.is_active = TRUE

          AND (
              :teacher_type = 'all'

              OR (
                  :teacher_type = 'class'
                  AND COALESCE(a.is_class_teacher, FALSE) = TRUE
              )

              OR (
                  :teacher_type = 'subject'
                  AND EXISTS (
                      SELECT 1
                      FROM public.teacher_class_subject_map sm
                      WHERE sm.tenant_id = t.tenant_id
                        AND sm.teacher_id = t.teacher_id
                        AND sm.is_active = TRUE
                        AND sm.is_class_teacher = FALSE
                        AND (
                            :subject IS NULL
                            OR LOWER(TRIM(sm.subject_name))
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
