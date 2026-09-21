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

# ✅ NEW: Route to get the total number of students
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


# ✅ EXISTING: Route to generate AI report
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