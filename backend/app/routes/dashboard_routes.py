from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db

router = APIRouter()

# ================= OPTIMIZED QUERY =================
DASHBOARD_QUERY = """
WITH
summary AS (
    SELECT
       (
    SELECT COUNT(*)
    FROM sgs_student_master
    WHERE record_status = 'Active'
      AND full_name IS NOT NULL
      AND full_name != ''
) AS total_students,
        (SELECT COUNT(*) FROM sgs_teacher_master WHERE is_active = TRUE) AS total_teachers,
        (SELECT COUNT(*) FROM sgs_class_master WHERE record_status = 'Active') AS total_classes,
        (SELECT ROUND(AVG(marks_obtained), 2)
         FROM sgs_student_marks
         WHERE record_status = 'Active') AS average_marks,
        (SELECT ROUND(
            (SUM(CASE WHEN marks_obtained >= 33 THEN 1 ELSE 0 END)::numeric /
             NULLIF(COUNT(*), 0)) * 100,
            2
        )
         FROM sgs_student_marks
         WHERE record_status = 'Active') AS pass_percentage
),
performance AS (
    SELECT COALESCE(json_agg(t), '[]'::json) AS data
    FROM (
        SELECT
            c.class_name,
            c.section_name,
            ROUND(
                AVG((m.marks_obtained / NULLIF(m.max_marks, 0)) * 100),
                2
            ) AS percentage
        FROM sgs_student_marks m
        JOIN sgs_student_master s ON m.student_id = s.student_id
        JOIN sgs_class_master c ON s.class_id = c.class_id
        WHERE m.record_status = 'Active'
        GROUP BY c.class_name, c.section_name
        ORDER BY c.class_name, c.section_name
    ) t
),
pass_fail AS (
    SELECT
        SUM(CASE WHEN marks_obtained >= 33 THEN 1 ELSE 0 END) AS pass_count,
        SUM(CASE WHEN marks_obtained < 33 THEN 1 ELSE 0 END) AS fail_count
    FROM sgs_student_marks
    WHERE record_status = 'Active'
),
headmaster AS (
    SELECT COALESCE(json_build_object(
        'full_name', u.full_name,
        'role_name', r.role_name
    ), '{}'::json) AS data
    FROM sgs_users_masters u
    JOIN sgs_role_response r ON r.role_id = u.role_id
    WHERE LOWER(r.role_name) = 'headmaster'
      AND u.is_active = TRUE
      AND u.record_status = 'Active'
    LIMIT 1
),
notifications AS (
    SELECT COUNT(*) AS unread_count
    FROM sgs_notice_board
    WHERE is_read = FALSE
)

SELECT
    (SELECT row_to_json(summary) FROM summary) AS summary,
    (SELECT data FROM performance) AS performance,
    (SELECT row_to_json(pass_fail) FROM pass_fail) AS pass_fail,
    (SELECT data FROM headmaster) AS headmaster,
    (SELECT unread_count FROM notifications) AS unread_count;
"""

# ================= API =================
@router.get("/")
def dashboard_core(db: Session = Depends(get_db)):

    result = db.execute(text(DASHBOARD_QUERY)).mappings().fetchone()

    if not result:
        return {
            "summary": {},
            "performance": [],
            "pass_fail": [{"name": "Pass", "value": 0}, {"name": "Fail", "value": 0}],
            "headmaster": {},
            "unread_count": 0
        }

    row = dict(result)

    pass_fail = row.get("pass_fail") or {}

    return {
        "summary": row.get("summary") or {},
        "performance": row.get("performance") or [],
        "pass_fail": [
            {"name": "Pass", "value": pass_fail.get("pass_count", 0)},
            {"name": "Fail", "value": pass_fail.get("fail_count", 0)}
        ],
        "headmaster": row.get("headmaster") or {},
        "unread_count": row.get("unread_count") or 0
    }