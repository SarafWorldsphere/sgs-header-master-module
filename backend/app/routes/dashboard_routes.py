
import logging
from time import perf_counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db

router = APIRouter()
logger = logging.getLogger(__name__)


# =====================================================
# OPTIMIZED DASHBOARD QUERY
# =====================================================

DASHBOARD_QUERY = """
WITH
marks_stats AS (
    SELECT
        ROUND(AVG(marks_obtained), 2) AS average_marks,

        COUNT(*) FILTER (
            WHERE marks_obtained >= 33
        ) AS pass_count,

        COUNT(*) FILTER (
            WHERE marks_obtained < 33
        ) AS fail_count,

        COUNT(*) AS total_count

    FROM sgs_student_marks
    WHERE record_status = 'Active'
),

summary AS (
    SELECT
        (
            SELECT COUNT(*)
            FROM sgs_student_master
            WHERE record_status = 'Active'
              AND full_name IS NOT NULL
              AND full_name != ''
        ) AS total_students,

        (
            SELECT COUNT(*)
            FROM sgs_teacher_master
            WHERE is_active = TRUE
        ) AS total_teachers,

        (
            SELECT COUNT(*)
            FROM sgs_class_master
            WHERE record_status = 'Active'
        ) AS total_classes,

        (
            SELECT average_marks
            FROM marks_stats
        ) AS average_marks,

        (
            SELECT ROUND(
                pass_count::numeric
                / NULLIF(total_count, 0) * 100,
                2
            )
            FROM marks_stats
        ) AS pass_percentage
),

performance_rows AS (
    SELECT
        c.class_name,
        c.section_name,

        ROUND(
            AVG(
                (m.marks_obtained / NULLIF(m.max_marks, 0)) * 100
            ),
            2
        ) AS percentage

    FROM sgs_student_marks m

    JOIN sgs_student_master s
        ON m.student_id = s.student_id

    JOIN sgs_class_master c
        ON s.class_id = c.class_id

    WHERE m.record_status = 'Active'

    GROUP BY
        c.class_name,
        c.section_name
),

performance AS (
    SELECT
        COALESCE(
            json_agg(
                p ORDER BY p.class_name, p.section_name
            ),
            '[]'::json
        ) AS data

    FROM performance_rows p
),

pass_fail AS (
    SELECT
        pass_count,
        fail_count
    FROM marks_stats
),

headmaster AS (
    SELECT
        COALESCE(
            json_build_object(
                'full_name', u.full_name,
                'role_name', r.role_name
            ),
            '{}'::json
        ) AS data

    FROM sgs_users_masters u

    JOIN sgs_role_response r
        ON r.role_id = u.role_id

    WHERE LOWER(r.role_name) = 'headmaster'
      AND u.is_active = TRUE
      AND u.record_status = 'Active'

    LIMIT 1
),

notifications AS (
    SELECT
        COUNT(*) AS unread_count

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


# =====================================================
# DASHBOARD API
# =====================================================

@router.get("/")
def dashboard_core(db: Session = Depends(get_db)):

    started_at = perf_counter()

    print("\n[DASHBOARD] ROUTE ENTERED", flush=True)

    try:
        # -------------------------------------------------
        # STEP 1: DATABASE CONNECTION
        # -------------------------------------------------

        connection_started = perf_counter()

        print("[DASHBOARD] BEFORE DB CONNECTION", flush=True)

        db.connection()

        connection_duration = perf_counter() - connection_started

        print(
            f"[DASHBOARD] DB CONNECTION READY: "
            f"{connection_duration:.3f} seconds",
            flush=True
        )

        # -------------------------------------------------
        # STEP 2: EXECUTE DASHBOARD SQL
        # -------------------------------------------------

        query_started = perf_counter()

        print("[DASHBOARD] BEFORE SQL QUERY", flush=True)

        result = (
            db.execute(text(DASHBOARD_QUERY))
            .mappings()
            .fetchone()
        )

        query_duration = perf_counter() - query_started

        print(
            f"[DASHBOARD] SQL QUERY COMPLETED: "
            f"{query_duration:.3f} seconds",
            flush=True
        )

        # -------------------------------------------------
        # STEP 3: HANDLE EMPTY RESULT
        # -------------------------------------------------

        if not result:
            print("[DASHBOARD] EMPTY RESULT", flush=True)

            return {
                "summary": {},
                "performance": [],
                "pass_fail": [
                    {"name": "Pass", "value": 0},
                    {"name": "Fail", "value": 0},
                ],
                "headmaster": {},
                "unread_count": 0,
            }

        # -------------------------------------------------
        # STEP 4: BUILD RESPONSE
        # -------------------------------------------------

        row = dict(result)

        pass_fail_data = row.get("pass_fail") or {}

        response = {
            "summary": row.get("summary") or {},
            "performance": row.get("performance") or [],
            "pass_fail": [
                {
                    "name": "Pass",
                    "value": pass_fail_data.get("pass_count", 0),
                },
                {
                    "name": "Fail",
                    "value": pass_fail_data.get("fail_count", 0),
                },
            ],
            "headmaster": row.get("headmaster") or {},
            "unread_count": row.get("unread_count") or 0,
        }

        # -------------------------------------------------
        # STEP 5: TOTAL EXECUTION TIME
        # -------------------------------------------------

        total_duration = perf_counter() - started_at

        print(
            f"[DASHBOARD] TOTAL ENDPOINT TIME: "
            f"{total_duration:.3f} seconds",
            flush=True
        )

        logger.info(
            "[DASHBOARD] Completed successfully in %.3f seconds",
            total_duration
        )

        return response

    except Exception as exc:

        total_duration = perf_counter() - started_at

        print(
            f"[DASHBOARD] ERROR AFTER {total_duration:.3f} seconds",
            flush=True
        )

        print(
            f"[DASHBOARD] ERROR TYPE: {type(exc).__name__}",
            flush=True
        )

        print(
            f"[DASHBOARD] ERROR DETAILS: {str(exc)}",
            flush=True
        )

        logger.exception(
            "[DASHBOARD] Failed after %.3f seconds",
            total_duration
        )

        raise
