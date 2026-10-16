from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db

from app.controllers.headmaster_controller import (
    get_assignment_report,
    get_academic_analytics,
    get_teacher_performance,
    translate_for_headmaster,
     get_class_student_count,
     get_academic_analytics_subjects
)

from app.schemas.headmaster_schema import (
    AssignmentReportRequest,
    AcademicAnalyticsRequest,
    TeacherPerformanceRequest,
    TranslateRequest
)

router = APIRouter()


# ==================================================
# GET HEADMASTER DETAILS
# ==================================================
@router.get("/")
def get_headmaster(db: Session = Depends(get_db)):

    query = """
        SELECT u.full_name, r.role_name
        FROM sgs_users_masters u
        JOIN sgs_role_response r ON r.role_id = u.role_id
        WHERE LOWER(r.role_name) = 'headmaster'
          AND u.is_active = TRUE
          AND u.record_status = 'Active'
        LIMIT 1
    """

    row = db.execute(text(query)).mappings().fetchone()

    if not row:
        return {
            "success": True,
            "data": {
                "name": "",
                "role": "Headmaster"
            }
        }

    return {
        "success": True,
        "data": {
            "name": row["full_name"],
            "role": row["role_name"]
        }
    }


# ==================================================
# ASSIGNMENT REPORT
# ==================================================
@router.post("/assignment-report")
def assignment(
    payload: AssignmentReportRequest,
    db: Session = Depends(get_db)
):
    data = payload.model_dump()
    user_info = data["user_info"]

    return get_assignment_report(db, data, user_info)


# ==================================================
# ACADEMIC ANALYTICS
# ==================================================

# âœ… NEW: Route to get the total number of students
@router.get("/academic-analytics/student-count")
def get_student_count(
    class_name: str = Query(...),
    section_name: str = Query(...),
    db: Session = Depends(get_db)
):
    # Call the new function from controller
    return get_class_student_count(db, class_name, section_name)

# GET: Available subjects for selected class
@router.get("/academic-analytics/subjects")
def get_subjects(
    class_name: str = Query(...),
    db: Session = Depends(get_db)
):
    return get_academic_analytics_subjects(db, class_name)


# âœ… EXISTING: Route to generate AI report
@router.post("/academic-analytics")
def academic(
    payload: AcademicAnalyticsRequest,
    db: Session = Depends(get_db)
):
    data = payload.model_dump()
    user_info = data["user_info"]

    return get_academic_analytics(db, data, user_info)


# ==================================================
# TEACHER PERFORMANCE
# ==================================================
@router.post("/teacher-performance")
def teacher(
    payload: TeacherPerformanceRequest,
    db: Session = Depends(get_db)
):
    data = payload.model_dump()
    user_info = data["user_info"]

    return get_teacher_performance(db, data, user_info)



# ==================================================
# PLATFORM ACTIVITY ANALYTICS
# ==================================================
@router.get("/platform-activity")
def get_platform_activity(
    days: int = Query(7, ge=1, le=90),
    include_test_data: bool = Query(False),
    db: Session = Depends(get_db)
):
    try:
        filters = """
            created_at >= NOW() - make_interval(days => :days)
            AND (
                :include_test_data = TRUE
                OR user_id NOT LIKE 'TEST_STAGE2_%'
            )
        """
        params = {
            "days": days,
            "include_test_data": include_test_data
        }

        # 1. Summary metrics
        summary = db.execute(text(f"""
            SELECT
                COUNT(*) FILTER (
                    WHERE activity_type = 'login'
                ) AS total_logins,
                COUNT(DISTINCT (role_name, user_id)) AS unique_users,
                COUNT(*) FILTER (
                    WHERE activity_type = 'page_view'
                ) AS total_page_views,
                COUNT(*) FILTER (
                    WHERE activity_type = 'content_view'
                ) AS total_content_views
            FROM public.sgs_platform_activity_logs
            WHERE {filters}
        """), params).mappings().one()

        # 2. Role-wise activity
        role_rows = db.execute(text(f"""
            SELECT
                role_name,
                COUNT(*) FILTER (
                    WHERE activity_type = 'login'
                ) AS login_count,
                COUNT(DISTINCT user_id) AS unique_users,
                COUNT(*) AS total_activities
            FROM public.sgs_platform_activity_logs
            WHERE {filters}
            GROUP BY role_name
            ORDER BY role_name
        """), params).mappings().all()

        # 3. Daily login trend
        daily_rows = db.execute(text(f"""
            SELECT
                TO_CHAR(created_at::date, 'YYYY-MM-DD') AS activity_date,
                COUNT(*) AS login_count
            FROM public.sgs_platform_activity_logs
            WHERE {filters}
              AND activity_type = 'login'
            GROUP BY created_at::date
            ORDER BY created_at::date
        """), params).mappings().all()

        # 4. Activity type breakdown
        activity_rows = db.execute(text(f"""
            SELECT
                activity_type,
                COUNT(*) AS activity_count
            FROM public.sgs_platform_activity_logs
            WHERE {filters}
            GROUP BY activity_type
            ORDER BY activity_type
        """), params).mappings().all()

        return {
            "success": True,
            "period_days": days,
            "includes_test_data": include_test_data,
            "summary": dict(summary),
            "role_wise_activity": [dict(row) for row in role_rows],
            "daily_login_trend": [dict(row) for row in daily_rows],
            "activity_breakdown": [dict(row) for row in activity_rows]
        }

    except Exception as e:
        print(f"[Platform Activity Analytics] Error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch platform activity analytics"
        )


# PLATFORM ACTIVITY - CLASS DROPDOWN

@router.get("/platform-activity/classes")
def get_platform_activity_classes(
    db: Session = Depends(get_db)
):
    try:
        rows = db.execute(text("""
            SELECT
                TRIM(class_name) AS class_name,
                ARRAY_AGG(
                    DISTINCT TRIM(section_name)
                    ORDER BY TRIM(section_name)
                ) FILTER (
                    WHERE NULLIF(TRIM(section_name), '') IS NOT NULL
                ) AS sections
            FROM public.sgs_class_master
            WHERE record_status = 'Active'
              AND NULLIF(TRIM(class_name), '') IS NOT NULL
              AND COALESCE(academic_year, '') NOT LIKE 'TEST_%'
              AND TRIM(class_name) NOT LIKE 'TEST_%'
            GROUP BY TRIM(class_name)
            ORDER BY TRIM(class_name)
        """)).mappings().all()

        return {
            "success": True,
            "classes": [
                {
                    "class_name": row["class_name"],
                    "sections": row["sections"] or []
                }
                for row in rows
            ]
        }

    except Exception as e:
        print(f"[Platform Activity Classes] Error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch class options"
        )


# PLATFORM ACTIVITY - ROLE-WISE USERS

@router.get("/platform-activity/users")
def get_platform_activity_users(
    role: str = Query(..., description="Student, Parent, Faculty, or Headmaster"),
    class_name: str | None = Query(None),
    section: str | None = Query(None),
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db)
):
    try:
        normalized_role = role.strip().lower()

        if normalized_role not in {
            "student", "parent", "faculty", "teacher", "headmaster"
        }:
            raise HTTPException(status_code=400, detail="Invalid role")

        if normalized_role == "student":
            sql = """
                SELECT
                    s.student_id::text AS user_id,
                    s.full_name,
                    'Student' AS role_name,
                    s.class_name,
                    s.section,
                    MAX(l.created_at) FILTER (
                        WHERE LOWER(l.activity_type) = 'login'
                    ) AS last_login,
                    COUNT(l.log_id) FILTER (
                        WHERE LOWER(l.activity_type) = 'login'
                          AND l.created_at >= NOW() - make_interval(days => :days)
                    ) AS logins_in_period
                FROM public.sgs_student_master s
                LEFT JOIN public.sgs_platform_activity_logs l
                    ON l.user_id = s.student_id::text
                   AND LOWER(l.role_name) = 'student'
                WHERE s.record_status = 'Active'
                  AND (
                    CAST(:class_name AS TEXT) IS NULL
                    OR LOWER(TRIM(s.class_name)) =
                    LOWER(TRIM(CAST(:class_name AS TEXT)))
                )
                AND (
                    CAST(:section AS TEXT) IS NULL
                    OR LOWER(TRIM(s.section)) =
                    LOWER(TRIM(CAST(:section AS TEXT)))
                )
                GROUP BY s.student_id, s.full_name, s.class_name, s.section
                ORDER BY s.full_name
            """
        elif normalized_role == "parent":
            sql = """
                SELECT DISTINCT
                    p.parent_id::text AS user_id,
                    p.full_name,
                    'Parent' AS role_name,
                    s.class_name,
                    s.section,
                    (
                        SELECT MAX(l.created_at)
                        FROM public.sgs_platform_activity_logs l
                        WHERE l.user_id = p.phone
                          AND LOWER(l.role_name) = 'parent'
                          AND LOWER(l.activity_type) = 'login'
                    ) AS last_login,
                    (
                        SELECT COUNT(*)
                        FROM public.sgs_platform_activity_logs l
                        WHERE l.user_id = p.phone
                          AND LOWER(l.role_name) = 'parent'
                          AND LOWER(l.activity_type) = 'login'
                          AND l.created_at >= NOW() - make_interval(days => :days)
                    ) AS logins_in_period
                FROM public.sgs_parent_master p
                JOIN public.sgs_parent_student_map psm
                    ON psm.parent_id = p.parent_id
                JOIN public.sgs_student_master s
                    ON s.student_id = psm.student_id
                WHERE p.record_status = 'Active'
                  AND s.record_status = 'Active'
                  
                AND (
                    CAST(:class_name AS TEXT) IS NULL
                    OR LOWER(TRIM(s.class_name)) =
                    LOWER(TRIM(CAST(:class_name AS TEXT)))
                )
                AND (
                    CAST(:section AS TEXT) IS NULL
                    OR LOWER(TRIM(s.section)) =
                    LOWER(TRIM(CAST(:section AS TEXT)))
                )

                ORDER BY p.full_name
            """
        elif normalized_role in {"faculty", "teacher"}:
            sql = """
                SELECT
                    t.teacher_id::text AS user_id,
                    t.full_name,
                    'Faculty' AS role_name,
                    NULL::text AS class_name,
                    NULL::text AS section,
                    (
                        SELECT MAX(l.created_at)
                        FROM public.sgs_platform_activity_logs l
                        WHERE l.user_id = t.teacher_id
                          AND LOWER(l.role_name) IN ('faculty', 'teacher')
                          AND LOWER(l.activity_type) = 'login'
                    ) AS last_login,
                    (
                        SELECT COUNT(*)
                        FROM public.sgs_platform_activity_logs l
                        WHERE l.user_id = t.teacher_id
                          AND LOWER(l.role_name) IN ('faculty', 'teacher')
                          AND LOWER(l.activity_type) = 'login'
                          AND l.created_at >= NOW() - make_interval(days => :days)
                    ) AS logins_in_period
                FROM public.sgs_teacher_master t
                WHERE t.is_active = TRUE
                  AND COALESCE(t.record_status, 'Active') = 'Active'
                ORDER BY t.full_name
            """
        else:
            sql = """
                SELECT
                    u.user_id::text AS user_id,
                    u.full_name,
                    r.role_name,
                    NULL::text AS class_name,
                    NULL::text AS section,
                    (
                        SELECT MAX(l.created_at)
                        FROM public.sgs_platform_activity_logs l
                        WHERE l.user_id = u.user_id::text
                          AND LOWER(l.role_name) = 'headmaster'
                          AND LOWER(l.activity_type) = 'login'
                    ) AS last_login,
                    (
                        SELECT COUNT(*)
                        FROM public.sgs_platform_activity_logs l
                        WHERE l.user_id = u.user_id::text
                          AND LOWER(l.role_name) = 'headmaster'
                          AND LOWER(l.activity_type) = 'login'
                          AND l.created_at >= NOW() - make_interval(days => :days)
                    ) AS logins_in_period
                FROM public.sgs_users_masters u
                JOIN public.sgs_role_response r ON r.role_id = u.role_id
                WHERE LOWER(r.role_name) = 'headmaster'
                  AND u.is_active = TRUE
                  AND u.record_status = 'Active'
                ORDER BY u.full_name
            """

        rows = db.execute(
            text(sql),
            {
                "class_name": class_name,
                "section": section,
                "days": days
            }
        ).mappings().all()

        return {
            "success": True,
            "role": role,
            "class_name": class_name,
            "section": section,
            "period_days": days,
            "count": len(rows),
            "users": [dict(row) for row in rows]
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Platform Activity Users] Error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch platform users"
        )




# PLATFORM ACTIVITY - USER COUNTS

@router.get("/platform-activity/user-counts")
def get_platform_user_counts(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
):
    try:
        queries = {
            "student": """
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE logins > 0) AS active
                FROM (
                    SELECT s.student_id,
                        COUNT(l.log_id) FILTER (
                            WHERE LOWER(l.activity_type) = 'login'
                              AND l.created_at >= NOW() - make_interval(days => :days)
                        ) AS logins
                    FROM public.sgs_student_master s
                    LEFT JOIN public.sgs_platform_activity_logs l
                        ON l.user_id = s.student_id::text
                       AND LOWER(l.role_name) = 'student'
                    WHERE s.record_status = 'Active'
                    GROUP BY s.student_id
                ) x
            """,
            "parent": """
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE logins > 0) AS active
                FROM (
                    SELECT p.parent_id,
                        COUNT(l.log_id) FILTER (
                            WHERE LOWER(l.activity_type) = 'login'
                              AND l.created_at >= NOW() - make_interval(days => :days)
                        ) AS logins
                    FROM public.sgs_parent_master p
                    LEFT JOIN public.sgs_platform_activity_logs l
                        ON l.user_id = p.phone
                       AND LOWER(l.role_name) = 'parent'
                    WHERE p.record_status = 'Active'
                    GROUP BY p.parent_id
                ) x
            """,
            "faculty": """
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE logins > 0) AS active
                FROM (
                    SELECT t.teacher_id,
                        COUNT(l.log_id) FILTER (
                            WHERE LOWER(l.activity_type) = 'login'
                              AND l.created_at >= NOW() - make_interval(days => :days)
                        ) AS logins
                    FROM public.sgs_teacher_master t
                    LEFT JOIN public.sgs_platform_activity_logs l
                        ON l.user_id = t.teacher_id::text
                       AND LOWER(l.role_name) IN ('faculty', 'teacher')
                    WHERE t.is_active = TRUE
                      AND COALESCE(t.record_status, 'Active') = 'Active'
                    GROUP BY t.teacher_id
                ) x
            """,
            "headmaster": """
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE logins > 0) AS active
                FROM (
                    SELECT u.user_id,
                        COUNT(l.log_id) FILTER (
                            WHERE LOWER(l.activity_type) = 'login'
                              AND l.created_at >= NOW() - make_interval(days => :days)
                        ) AS logins
                    FROM public.sgs_users_masters u
                    JOIN public.sgs_role_response r ON r.role_id = u.role_id
                    LEFT JOIN public.sgs_platform_activity_logs l
                        ON l.user_id = u.user_id::text
                       AND LOWER(l.role_name) = 'headmaster'
                    WHERE LOWER(r.role_name) = 'headmaster'
                      AND u.is_active = TRUE
                      AND u.record_status = 'Active'
                    GROUP BY u.user_id
                ) x
            """,
        }

        counts = []

        for role, sql in queries.items():
            result = db.execute(
                text(sql), {"days": days}
            ).mappings().one()

            total = int(result["total"] or 0)
            active = int(result["active"] or 0)

            counts.append({
                "role": role,
                "total": total,
                "active": active,
                "inactive": total - active,
            })

        return {
            "success": True,
            "period_days": days,
            "counts": counts,
        }

    except Exception as e:
        print("[Platform Activity User Counts] Error:", e)
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch platform user counts",
        )

# PLATFORM ACTIVITY - INACTIVE USERS

@router.get("/platform-activity/inactive-users")
def get_platform_inactive_users(
    days: int = Query(7, ge=1, le=90),
    role: str = Query(..., description="Student, Parent, Faculty, or Headmaster"),
    class_name: str | None = Query(None),
    section: str | None = Query(None),
    db: Session = Depends(get_db)
):
    try:
        normalized_role = role.strip().lower()

        if normalized_role not in {
            "student", "parent", "faculty", "teacher", "headmaster"
        }:
            raise HTTPException(status_code=400, detail="Invalid role")

        if normalized_role == "student":
            sql = """
                SELECT
                    s.student_id::text AS user_id,
                    s.full_name,
                    'Student' AS role_name,
                    s.class_name,
                    s.section,
                    MAX(l.created_at) FILTER (
                        WHERE LOWER(l.activity_type) = 'login'
                    ) AS last_login
                FROM public.sgs_student_master s
                LEFT JOIN public.sgs_platform_activity_logs l
                    ON l.user_id = s.student_id::text
                   AND LOWER(l.role_name) = 'student'
                   AND LOWER(l.activity_type) = 'login'
                WHERE s.record_status = 'Active'
                  AND (
                    CAST(:class_name AS TEXT) IS NULL
                    OR LOWER(TRIM(s.class_name)) =
                       LOWER(TRIM(CAST(:class_name AS TEXT)))
                  )
                  AND (
                    CAST(:section AS TEXT) IS NULL
                    OR LOWER(TRIM(s.section)) =
                       LOWER(TRIM(CAST(:section AS TEXT)))
                  )
                GROUP BY s.student_id, s.full_name, s.class_name, s.section
                HAVING MAX(l.created_at) IS NULL
                    OR MAX(l.created_at) < NOW() - make_interval(days => :days)
                ORDER BY s.full_name
            """

        elif normalized_role == "parent":
            sql = """
                SELECT
                    p.parent_id::text AS user_id,
                    p.full_name,
                    'Parent' AS role_name,
                    s.class_name,
                    s.section,
                    MAX(l.created_at) FILTER (
                        WHERE LOWER(l.activity_type) = 'login'
                    ) AS last_login
                FROM public.sgs_parent_master p
                JOIN public.sgs_parent_student_map psm
                    ON psm.parent_id = p.parent_id
                JOIN public.sgs_student_master s
                    ON s.student_id = psm.student_id
                LEFT JOIN public.sgs_platform_activity_logs l
                    ON l.user_id = p.phone
                   AND LOWER(l.role_name) = 'parent'
                   AND LOWER(l.activity_type) = 'login'
                WHERE p.record_status = 'Active'
                  AND s.record_status = 'Active'
                  AND (
                    CAST(:class_name AS TEXT) IS NULL
                    OR LOWER(TRIM(s.class_name)) =
                       LOWER(TRIM(CAST(:class_name AS TEXT)))
                  )
                  AND (
                    CAST(:section AS TEXT) IS NULL
                    OR LOWER(TRIM(s.section)) =
                       LOWER(TRIM(CAST(:section AS TEXT)))
                  )
                GROUP BY p.parent_id, p.full_name, s.class_name, s.section
                HAVING MAX(l.created_at) IS NULL
                    OR MAX(l.created_at) < NOW() - make_interval(days => :days)
                ORDER BY p.full_name
            """

        elif normalized_role in {"faculty", "teacher"}:
            sql = """
                SELECT
                    t.teacher_id::text AS user_id,
                    t.full_name,
                    'Faculty' AS role_name,
                    NULL::text AS class_name,
                    NULL::text AS section,
                    MAX(l.created_at) FILTER (
                        WHERE LOWER(l.activity_type) = 'login'
                    ) AS last_login
                FROM public.sgs_teacher_master t
                LEFT JOIN public.sgs_platform_activity_logs l
                    ON l.user_id = t.teacher_id
                   AND LOWER(l.role_name) IN ('faculty', 'teacher')
                   AND LOWER(l.activity_type) = 'login'
                   AND COALESCE(t.record_status, 'Active') = 'Active'
                GROUP BY t.teacher_id, t.full_name
                HAVING MAX(l.created_at) IS NULL
                    OR MAX(l.created_at) < NOW() - make_interval(days => :days)
                ORDER BY t.full_name
            """ 

        else:
            sql = """
                SELECT
                    u.user_id::text AS user_id,
                    u.full_name,
                    r.role_name,
                    NULL::text AS class_name,
                    NULL::text AS section,
                    MAX(l.created_at) FILTER (
                        WHERE LOWER(l.activity_type) = 'login'
                    ) AS last_login
                FROM public.sgs_users_masters u
                JOIN public.sgs_role_response r
                    ON r.role_id = u.role_id
                LEFT JOIN public.sgs_platform_activity_logs l
                    ON l.user_id = u.user_id::text
                   AND LOWER(l.role_name) = 'headmaster'
                   AND LOWER(l.activity_type) = 'login'
                WHERE LOWER(r.role_name) = 'headmaster'
                  AND u.is_active = TRUE
                  AND u.record_status = 'Active'
                GROUP BY u.user_id, u.full_name, r.role_name
                HAVING MAX(l.created_at) IS NULL
                    OR MAX(l.created_at) < NOW() - make_interval(days => :days)
                ORDER BY u.full_name
            """

        rows = db.execute(
            text(sql),
            {
                "days": days,
                "class_name": class_name,
                "section": section
            }
        ).mappings().all()

        return {
            "success": True,
            "role": role,
            "class_name": class_name,
            "section": section,
            "inactive_days": days,
            "count": len(rows),
            "users": [dict(row) for row in rows]
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Platform Inactive Users] Error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch inactive users"
        )


@router.get("/platform-activity/feature-usage")
def get_platform_feature_usage(
    days: int = Query(30, ge=1, le=365),
    module_name: str | None = Query(None),
    db: Session = Depends(get_db),
):
    try:
        query = text("""
            SELECT
                module_name,
                feature_used,
                COUNT(*) AS usage_count,
                COUNT(DISTINCT user_email) AS unique_users,
                COALESCE(SUM(total_tokens), 0) AS total_tokens,
                MAX(created_at_ist) AS last_used_at
            FROM public.sgs_ai_usage_logs
            WHERE created_at_ist >= NOW() - make_interval(days => :days)
              AND (
                    CAST(:module_name AS TEXT) IS NULL
                    OR LOWER(TRIM(module_name)) =
                       LOWER(TRIM(CAST(:module_name AS TEXT)))
                  )
            GROUP BY module_name, feature_used
            ORDER BY usage_count DESC, module_name, feature_used
        """)

        rows = db.execute(
            query,
            {
                "days": days,
                "module_name": module_name,
            },
        ).mappings().all()

        total_usage = sum(row["usage_count"] for row in rows)
        total_tokens = sum(row["total_tokens"] for row in rows)
        unique_modules = len({
            row["module_name"] for row in rows
        })

        return {
            "success": True,
            "period_days": days,
            "module_name": module_name,
            "summary": {
                "total_usage": total_usage,
                "unique_modules": unique_modules,
                "total_tokens": total_tokens,
            },
            "count": len(rows),
            "features": [dict(row) for row in rows],
        }

    except Exception as e:
        print("Platform feature usage error:", str(e))
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch AI feature usage",
        )


@router.get("/platform-activity/recent-events")
def get_platform_recent_events(
    limit: int = Query(20, ge=1, le=100),
    days: int = Query(7, ge=1, le=90),
    include_test_data: bool = Query(False),
    db: Session = Depends(get_db),
):
    try:
        query = text("""
            SELECT
                l.log_id,
                l.user_id,
                COALESCE(
                    st.full_name,
                    pa.full_name,
                    te.full_name,
                    hm.full_name,
                    'Unknown user'
                ) AS full_name,
                l.role_name,
                l.activity_type,
                l.login_method,
                l.page_path,
                l.created_at
            FROM public.sgs_platform_activity_logs l
            LEFT JOIN public.sgs_student_master st
                ON LOWER(l.role_name) = 'student'
               AND st.student_id::text = l.user_id
            LEFT JOIN public.sgs_parent_master pa
                ON LOWER(l.role_name) = 'parent'
               AND pa.phone = l.user_id
            LEFT JOIN public.sgs_teacher_master te
                ON LOWER(l.role_name) IN ('faculty', 'teacher')
               AND te.teacher_id::text = l.user_id
            LEFT JOIN public.sgs_users_masters hm
                ON LOWER(l.role_name) = 'headmaster'
               AND hm.user_id::text = l.user_id
            WHERE l.created_at >= NOW() - make_interval(days => :days)
              AND (
                    :include_test_data = TRUE
                    OR l.user_id NOT LIKE 'TEST_STAGE2_%'
                  )
            ORDER BY l.created_at DESC
            LIMIT :limit
        """)

        rows = db.execute(
            query,
            {
                "days": days,
                "limit": limit,
                "include_test_data": include_test_data,
            },
        ).mappings().all()

        return {
            "success": True,
            "period_days": days,
            "limit": limit,
            "include_test_data": include_test_data,
            "count": len(rows),
            "events": [dict(row) for row in rows],
        }

    except Exception as e:
        print("Platform recent events error:", str(e))
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch recent activity events",
        )


# ==================================================
# TRANSLATE
# ==================================================
@router.post("/translate")
def translate(
    payload: TranslateRequest,
    db: Session = Depends(get_db)
):
    data = payload.model_dump()
    user_info = data["user_info"]

    return translate_for_headmaster(
        db,
        data,
        user_info
    )
