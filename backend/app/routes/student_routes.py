from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db

router = APIRouter()


# ===================== STUDENT CLASSES & SECTIONS =====================
@router.get("/classes")
def get_student_classes(db: Session = Depends(get_db)):
    query = """
        SELECT
            class_id,
            class_name,
            section_name,
            academic_year
        FROM class_master
        WHERE record_status = 'Active'
          AND class_name IS NOT NULL
          AND TRIM(class_name) <> ''
        ORDER BY class_name, section_name;
    """

    result = db.execute(text(query)).mappings().all()
    return [dict(row) for row in result]




# ===================== UNIFIED EXAM & WEEKLY TEST OPTIONS =====================
@router.get("/exams")
def get_available_exams(db: Session = Depends(get_db)):
    query = text("""
        SELECT
            'EXAM'::text AS option_type,
            e.exam_id::bigint AS option_id,
            e.exam_name AS option_name,
            e.exam_type,
            e.academic_year,
           NULL::date AS assessment_date,
            NULL::bigint AS assessment_id,
            NULL::text AS subject
        FROM public.exam_master e
        WHERE e.exam_id IS NOT NULL
          AND e.exam_name IS NOT NULL
          AND TRIM(e.exam_name) <> ''

        UNION ALL

        SELECT
            'ASSESSMENT'::text AS option_type,
            0::bigint AS option_id,
            'Weekly Test'::text AS option_name,
            'CT'::text AS exam_type,
            NULL::text AS academic_year,
            MAX(a.assessment_date) AS assessment_date,
            NULL::bigint AS assessment_id,
            NULL::text AS subject
        FROM public.assessments a
        WHERE a.exam_id IS NULL
          AND a.class_id IS NOT NULL
          AND a.record_status = 'Active'
          AND a.assessment_id IS NOT NULL
        HAVING COUNT(*) > 0

        ORDER BY assessment_date DESC NULLS LAST, option_name;
    """)

    rows = db.execute(query).mappings().all()
    return [dict(row) for row in rows]



# ===================== STUDENTS WITH OPTIONAL FILTERS =====================
@router.get("/")
def get_students(
    class_name: str | None = None,
    section: str | None = None,
    db: Session = Depends(get_db)
):
    query = """
        SELECT
            s.student_id,
            s.admission_no,
            s.full_name,
            s.class_id,
            c.class_name,
            COALESCE(
                NULLIF(TRIM(s.section), ''),
                c.section_name
            ) AS section_name,
            s.roll_no,
            s.student_phone,
            s.student_email AS email_id,
            s.record_status
        FROM student_master s
        LEFT JOIN class_master c
            ON s.class_id = c.class_id
        WHERE s.record_status = 'Active'
          AND s.full_name IS NOT NULL
          AND TRIM(s.full_name) <> ''
          AND (
              :class_name IS NULL
              OR TRIM(c.class_name) = TRIM(:class_name)
          )
          AND (
              :section IS NULL
              OR TRIM(
                  COALESCE(
                      NULLIF(TRIM(s.section), ''),
                      c.section_name
                  )
              ) = TRIM(:section)
          )
        ORDER BY c.class_name, section_name, s.admission_no;
    """

    result = db.execute(
        text(query),
        {
            "class_name": class_name,
            "section": section
        }
    ).mappings().all()

    return [dict(row) for row in result]

# ===================== PROGRESS =====================
@router.get("/progress")
def get_progress(db: Session = Depends(get_db)):
    query = """
        SELECT
            sm.marks_id,
            s.student_id,
            s.full_name,
            c.class_name,
            c.section_name,
            sub.subject_name,
            e.exam_name,
            e.exam_type,
            sm.marks_obtained,
            sm.max_marks,
            ROUND(
                (sm.marks_obtained::numeric / NULLIF(sm.max_marks, 0)) * 100,
                2
            ) AS percentage,
            sm.grade,
            sm.remarks,
            sm.record_status
        FROM student_marks sm
        LEFT JOIN student_master s
            ON sm.student_id = s.student_id
        LEFT JOIN class_master c
            ON s.class_id = c.class_id
        LEFT JOIN subject_master sub
            ON sm.subject_id = sub.subject_id
        LEFT JOIN exam_master e
            ON sm.exam_id = e.exam_id
        WHERE sm.record_status = 'Active'
        ORDER BY sm.marks_id;
    """

    result = db.execute(text(query)).mappings().all()
    return [dict(row) for row in result]



# ===================== INDIVIDUAL STUDENT ASSESSMENT REPORT =====================

@router.get("/reports/student/{student_id}")
def get_student_assessment_report(
    student_id: int,
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    subject: str | None = None,
    exam_id: int | None = Query(default=None, gt=0),
    assessment_id: int | None = Query(default=None, gt=0),
    report_type: str = Query(
        default="ALL",
        pattern="^(ALL|CT|PT)$"
    ),
    db: Session = Depends(get_db),
):
    # 1. Verify active student and get class_id
    student = db.execute(
        text("""
            SELECT student_id, class_id
            FROM public.student_master
            WHERE student_id = :student_id
              AND record_status = 'Active'
        """),
        {"student_id": student_id},
    ).mappings().first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Active student not found",
        )

    # 2. Fetch marks from the agreed data-contract tables
    query = text("""
        SELECT
            a.assessment_id,
            a.title AS assessment_name,
            a.assessment_type::text AS assessment_type,
            a.subject,
            a.assessment_date,
            a.class_id,
            a.class_name,
            a.section,
            a.exam_id,
            e.exam_name,
            e.exam_type,
            e.academic_year,
            a.max_marks,

            r.result_id,
            r.student_id,
            r.student_name,
            r.roll_number,
            r.marks_obtained,
            r.percentage,
            r.is_absent,

            CASE
                WHEN a.class_id IS NULL
                     AND a.exam_id IS NULL
                    THEN 'HISTORICAL'
                WHEN a.exam_id IS NULL
                    THEN 'CT'
                ELSE 'EXAM'
            END AS report_category

        FROM public.assessments AS a

        INNER JOIN public.assessment_results AS r
            ON r.assessment_id = a.assessment_id

        LEFT JOIN public.exam_master AS e
            ON e.exam_id = a.exam_id

        WHERE r.student_id = :student_id
          AND a.record_status = 'Active'
          AND r.record_status = 'Active'

          -- Only the student's current class, plus genuine
          -- historical rows in the unfiltered ALL report.
          AND (
              a.class_id = :student_class_id
              OR (
                  :report_type = 'ALL'
                  AND a.class_id IS NULL
                  AND a.exam_id IS NULL
              )
          )

          -- Filter by assessment date's month and year.
          AND (
              :month IS NULL
              OR EXTRACT(MONTH FROM a.assessment_date) = :month
          )
          AND (
              :year IS NULL
              OR EXTRACT(YEAR FROM a.assessment_date) = :year
          )

          -- Optional subject filter.
          AND (
              :subject IS NULL
              OR TRIM(a.subject) = TRIM(:subject)
          )

          -- Exam selection or an explicitly selected assessment.
          -- For the Weekly Test option, send assessment_id=NULL
          -- so all matching CT assessments can be returned.
          AND (
              (
                  :exam_id IS NULL
                  AND :assessment_id IS NULL
              )
              OR (
                  :exam_id IS NOT NULL
                  AND a.exam_id = :exam_id
              )
              OR (
                  :assessment_id IS NOT NULL
                  AND a.assessment_id = :assessment_id
                  AND a.exam_id IS NULL
              )
          )

          -- CT = class-linked assessments with no scheduled exam.
          -- PT = assessments linked to a scheduled exam.
          AND (
              :report_type = 'ALL'
              OR (
                  :report_type = 'CT'
                  AND a.class_id IS NOT NULL
                  AND a.exam_id IS NULL
              )
              OR (
                  :report_type = 'PT'
                  AND a.exam_id IS NOT NULL
              )
          )

        ORDER BY
            a.assessment_date ASC NULLS LAST,
            a.assessment_id ASC,
            r.roll_number ASC
    """)

    rows = db.execute(
        query,
        {
            "student_id": student_id,
            "student_class_id": student["class_id"],
            "month": month,
            "year": year,
            "subject": subject,
            "exam_id": exam_id,
            "assessment_id": assessment_id,
            "report_type": report_type,
        },
    ).mappings().all()

    assessments = [dict(row) for row in rows]

    # 3. Counts for the selected report
    absent_count = sum(
        1 for row in assessments
        if row["is_absent"] is True
    )

    attended_count = sum(
        1 for row in assessments
        if row["is_absent"] is False
    )

    # 4. CT summary: use actual maximum marks, not hardcoded 50.
    # This summary is for the currently filtered assessment rows.
    ct_summary = None

    if report_type == "CT":
        ct_rows = [
            row for row in assessments
            if row["class_id"] is not None
            and row["exam_id"] is None
        ]

        ct_total = sum(
            float(row["marks_obtained"])
            for row in ct_rows
            if row["is_absent"] is not True
            and row["marks_obtained"] is not None
        )

        ct_max = sum(
            float(row["max_marks"] or 0)
            for row in ct_rows
        )

        ct_summary = {
            "ct_total": ct_total,
            "ct_max": ct_max,
            "absent_count": sum(
                1 for row in ct_rows
                if row["is_absent"] is True
            ),
            "percentage": (
                round(ct_total / ct_max * 100, 2)
                if ct_max > 0 else None
            ),
        }

    # 5. Response
    return {
        "student_id": student_id,
        "class_id": student["class_id"],
        "report_type": report_type,
        "filters": {
            "month": month,
            "year": year,
            "subject": subject,
            "exam_id": exam_id,
            "assessment_id": assessment_id,
        },
        "assessment_count": len(assessments),
        "attended_count": attended_count,
        "absent_count": absent_count,
        "ct_summary": ct_summary,
        "assessments": assessments,
    }


# ===================== CONSOLIDATED REPORT SUBJECT OPTIONS =====================

@router.get("/reports/subjects")
def get_consolidated_subjects(
    class_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
):
    query = text("""
        SELECT DISTINCT
            sm.subject_id,
            sm.subject_name,
            sm.class_id
        FROM public.subject_master sm
        INNER JOIN public.assessments a
            ON LOWER(TRIM(a.subject)) = LOWER(TRIM(sm.subject_name))
        WHERE sm.record_status = 'Active'
          AND a.record_status = 'Active'
          AND (:class_id IS NULL OR sm.class_id = :class_id)
        ORDER BY sm.subject_name
    """)

    rows = db.execute(
        query,
        {"class_id": class_id},
    ).mappings().all()

    return [dict(row) for row in rows]


# ===================== CONSOLIDATED REPORTS =====================

@router.get("/reports/consolidated")
def get_consolidated_report(
    view: str = Query(
        default="CLASS",
        pattern="^(CLASS|SECTION|SUBJECT|SCHOOL|TEST)$"
    ),
    report_type: str = Query(
        default="SUMMARY",
        pattern="^(SUMMARY|FAILED|ABSENT)$"
    ),
    month: int | None = Query(default=None, ge=1, le=12),
    year: int | None = Query(default=None, ge=2000, le=2100),
    class_id: int | None = Query(default=None, gt=0),
    section: str | None = None,
    subject: str | None = None,
    assessment_type: str = Query(
        default="ALL",
        pattern="^(ALL|CT|PT)$"
    ),
    assessment_id: int | None = Query(default=None, gt=0),
    pass_percentage: float = Query(default=35, ge=0, le=100),
        output_format: str = Query(
        default="SUMMARY",
        pattern="^(SUMMARY|MATRIX)$",
    ),
    db: Session = Depends(get_db),
):
    # Common filtered dataset for every report.
    base_query = """
        WITH report_data AS (
            SELECT
                s.student_id,
                COALESCE(r.student_name, s.full_name) AS student_name,
                COALESCE(
                    r.roll_number::text,
                    s.roll_no::text,
                    s.admission_no::text
                ) AS roll_number,

                s.class_id,
                COALESCE(
                    NULLIF(TRIM(c.class_name), ''),
                    NULLIF(TRIM(a.class_name), ''),
                    'Unknown'
                ) AS class_name,

                COALESCE(
                    NULLIF(TRIM(s.section), ''),
                    NULLIF(TRIM(c.section_name), ''),
                    NULLIF(TRIM(a.section), ''),
                    'Unknown'
                ) AS section_name,

                COALESCE(NULLIF(TRIM(a.subject), ''), 'Unknown')
                    AS subject,

                a.assessment_id,
                a.title AS assessment_name,
                a.assessment_type::text AS assessment_type,
                a.assessment_date,
                a.exam_id,
                a.max_marks,
                r.marks_obtained,
                r.is_absent,

                CASE
                    WHEN COALESCE(r.is_absent, FALSE) THEN NULL
                    WHEN r.marks_obtained IS NULL
                         OR COALESCE(a.max_marks, 0) <= 0 THEN NULL
                    ELSE ROUND(
                        r.marks_obtained::numeric
                        / NULLIF(a.max_marks, 0) * 100,
                        2
                    )
                END AS calculated_percentage

            FROM public.assessments a

            INNER JOIN public.assessment_results r
                ON r.assessment_id = a.assessment_id

            INNER JOIN public.student_master s
                ON s.student_id = r.student_id

            LEFT JOIN public.class_master c
                ON c.class_id = s.class_id

            WHERE a.record_status = 'Active'
              AND r.record_status = 'Active'
              AND s.record_status = 'Active'

              AND (
                  :month IS NULL
                  OR EXTRACT(MONTH FROM a.assessment_date) = :month
              )
              AND (
                  :year IS NULL
                  OR EXTRACT(YEAR FROM a.assessment_date) = :year
              )
              AND (:class_id IS NULL OR s.class_id = :class_id)
              AND (
                  :section IS NULL
                  OR TRIM(
                      COALESCE(
                          NULLIF(TRIM(s.section), ''),
                          NULLIF(TRIM(c.section_name), ''),
                          NULLIF(TRIM(a.section), ''),
                          'Unknown'
                      )
                  ) = TRIM(:section)
              )
              AND (
                  :subject IS NULL
                  OR TRIM(a.subject) = TRIM(:subject)
              )
              AND (
                  :assessment_id IS NULL
                  OR a.assessment_id = :assessment_id
              )
              AND (
                  :assessment_type = 'ALL'
                  OR (
                      :assessment_type = 'CT'
                      AND a.exam_id IS NULL
                      AND a.class_id IS NOT NULL
                  )
                  OR (
                      :assessment_type = 'PT'
                      AND a.exam_id IS NOT NULL
                  )
              )
        )
    """

    params = {
        "month": month,
        "year": year,
        "class_id": class_id,
        "section": section,
        "subject": subject,
        "assessment_id": assessment_id,
        "assessment_type": assessment_type,
    }
    # Student-wise consolidated matrix report.
    if output_format == "MATRIX":
        if class_id is None:
            raise HTTPException(
                status_code=400,
                detail="class_id is required for MATRIX reports",
            )

        # Fetch all active students in the selected class/section.
        students_query = text("""
            SELECT
                s.student_id,
                s.full_name AS student_name,
                COALESCE(
                    NULLIF(TRIM(s.roll_no::text), ''),
                    NULLIF(TRIM(s.admission_no::text), ''),
                    s.student_id::text
                ) AS roll_number,
                COALESCE(
                    NULLIF(TRIM(s.section), ''),
                    NULLIF(TRIM(c.section_name), ''),
                    'Unknown'
                ) AS section_name
            FROM public.student_master s
            LEFT JOIN public.class_master c
                ON c.class_id = s.class_id
            WHERE s.record_status = 'Active'
              AND s.class_id = :class_id
              AND (
                    :section IS NULL
                    OR TRIM(
                        COALESCE(
                            NULLIF(TRIM(s.section), ''),
                            NULLIF(TRIM(c.section_name), ''),
                            'Unknown'
                        )
                    ) = TRIM(:section)
              )
            ORDER BY
                s.full_name,
                s.student_id
        """)

        students = db.execute(
            students_query,
            {
                "class_id": class_id,
                "section": section,
            },
        ).mappings().all()

        # Reuse the existing filtered assessment data.
        matrix_query = text(
            base_query
            + """
            SELECT *
            FROM report_data
            ORDER BY assessment_date, assessment_id, roll_number
            """
        )

        matrix_rows = db.execute(
            matrix_query,
            params,
        ).mappings().all()

        # One maximum-mark entry per assessment.
        assessment_max = {}
        subject_assessments = {}

        for row in matrix_rows:
            assessment_id_value = row["assessment_id"]
            subject_name = row["subject"]

            assessment_max[assessment_id_value] = {
                "subject": subject_name,
                "max_marks": float(row["max_marks"] or 0),
            }

            subject_assessments.setdefault(
                subject_name, set()
            ).add(assessment_id_value)

        subjects = sorted(subject_assessments.keys())

        # Calculate maximum marks per subject from actual assessments.
        subject_max_marks = {}

        for subject_name, assessment_ids in subject_assessments.items():
            subject_max_marks[subject_name] = round(
                sum(
                    assessment_max[assessment_id_value]["max_marks"]
                    for assessment_id_value in assessment_ids
                ),
                2,
            )

        # Prepare one result row per student.
        student_results = {}

        for student in students:
            student_id_value = student["student_id"]

            student_results[student_id_value] = {
                "student_id": student_id_value,
                "student_name": student["student_name"],
                "roll_number": student["roll_number"],
                "section": student["section_name"],
                "subjects": {
                    subject_name: {
                        "obtained": 0.0,
                        "max_marks": subject_max_marks[subject_name],
                    }
                    for subject_name in subjects
                },
            }

        # Sum obtained marks across the selected month's assessments.
        for row in matrix_rows:
            student_id_value = row["student_id"]
            subject_name = row["subject"]

            if student_id_value not in student_results:
                continue

            # Absent/null marks do not add to obtained marks.
            if (
                row["is_absent"] is True
                or row["marks_obtained"] is None
            ):
                continue

            student_results[student_id_value]["subjects"][
                subject_name
            ]["obtained"] += float(row["marks_obtained"])

        results = []

        for student_result in student_results.values():
            total_obtained = 0.0
            total_max_marks = 0.0
            subject_values = {}

            for subject_name in subjects:
                obtained = round(
                    student_result["subjects"][subject_name]["obtained"],
                    2,
                )
                maximum = subject_max_marks[subject_name]

                subject_values[subject_name] = {
                    "obtained": obtained,
                    "max_marks": maximum,
                    "display": f"{obtained:g}/{maximum:g}",
                }

                total_obtained += obtained
                total_max_marks += maximum

            total_obtained = round(total_obtained, 2)
            total_max_marks = round(total_max_marks, 2)

            percentage = (
                round(total_obtained / total_max_marks * 100, 2)
                if total_max_marks > 0
                else None
            )

            results.append({
                "student_id": student_result["student_id"],
                "student_name": student_result["student_name"],
                "roll_number": student_result["roll_number"],
                "section": student_result["section"],
                "subjects": subject_values,
                "total_obtained": total_obtained,
                "total_max_marks": total_max_marks,
                "total_display": (
                    f"{total_obtained:g}/{total_max_marks:g}"
                ),
                "percentage": percentage,
            })

        # Highest percentage first; equal percentages use total marks.
        results.sort(
            key=lambda item: (
                item["percentage"] is not None,
                item["percentage"] or 0,
                item["total_obtained"],
            ),
            reverse=True,
        )

        previous_score = None
        current_rank = 0

        for position, result in enumerate(results, start=1):
            score = (
                result["percentage"],
                result["total_obtained"],
            )

            if score != previous_score:
                current_rank = position
                previous_score = score

            result["rank"] = current_rank

        return {
            "view": view,
            "report_type": "MATRIX",
            "filters": {
                "month": month,
                "year": year,
                "class_id": class_id,
                "section": section,
                "assessment_type": assessment_type,
            },
            "subjects": subjects,
            "count": len(results),
            "results": results,
        }
    # Failed and absent student lists.
    if report_type in ("FAILED", "ABSENT"):
        if report_type == "ABSENT":
            condition = "is_absent IS TRUE"
        else:
            condition = """
                is_absent IS NOT TRUE
                AND calculated_percentage IS NOT NULL
                AND calculated_percentage < :pass_percentage
            """

        params["pass_percentage"] = pass_percentage

        query = text(
            base_query
            + f"""
            SELECT *
            FROM report_data
            WHERE {condition}
            ORDER BY class_name, section_name, roll_number,
                     assessment_date, assessment_id
            """
        )

        rows = db.execute(query, params).mappings().all()

        return {
            "view": view,
            "report_type": report_type,
            "filters": {
                "month": month,
                "year": year,
                "class_id": class_id,
                "section": section,
                "subject": subject,
                "assessment_type": assessment_type,
                "assessment_id": assessment_id,
                "pass_percentage": (
                    pass_percentage if report_type == "FAILED" else None
                ),
            },
            "count": len(rows),
            "results": [dict(row) for row in rows],
        }

      # Simple consolidated summary
    grouping = {
        "CLASS": ("class_name", "class_name"),
        "SECTION": (
            "class_name, section_name",
            "class_name, section_name",
        ),
        "SUBJECT": (
            "class_name, section_name, subject",
            "class_name, section_name, subject",
        ),
        "SCHOOL": (
            "class_name, section_name, subject",
            "class_name, section_name, subject",
        ),
        "TEST": (
            "class_name, section_name, subject, "
            "assessment_id, assessment_name, assessment_date",
            "class_name, section_name, subject, "
            "assessment_date, assessment_id",
        ),
    }

    group_columns, order_columns = grouping[view]

    select_group = f"{group_columns}," if group_columns else ""
    group_by = f"GROUP BY {group_columns}" if group_columns else ""
    order_by = f"ORDER BY {order_columns}" if order_columns else ""

    query = text(
        base_query
        + f"""
        SELECT
            {select_group}
            COUNT(DISTINCT assessment_id) AS tests_conducted,
            COUNT(*) FILTER (
                WHERE is_absent IS FALSE
            ) AS attended_count,
            COUNT(*) FILTER (
                WHERE is_absent IS TRUE
            ) AS absent_count,
            ROUND(AVG(calculated_percentage), 2)
                AS average_percentage
        FROM report_data
        {group_by}
        {order_by}
        """
    )

    rows = db.execute(query, params).mappings().all()

    test_results = []

    if view == "SUBJECT":
        test_query = text(
            base_query
            + """
            SELECT
                class_name,
                section_name,
                subject,
                assessment_id,
                assessment_name,
                assessment_date,
                COUNT(*) FILTER (
                    WHERE is_absent IS FALSE
                ) AS attended_count,
                COUNT(*) FILTER (
                    WHERE is_absent IS TRUE
                ) AS absent_count,
                ROUND(AVG(calculated_percentage), 2)
                    AS average_percentage
            FROM report_data
            GROUP BY
                class_name,
                section_name,
                subject,
                assessment_id,
                assessment_name,
                assessment_date
            ORDER BY
                class_name,
                section_name,
                subject,
                assessment_date NULLS LAST,
                assessment_id
            """
        )

        test_results = [
            dict(row)
            for row in db.execute(
                test_query, params
            ).mappings().all()
        ]

    return {
        "view": view,
        "report_type": "SUMMARY",
        "filters": {
            "month": month,
            "year": year,
            "class_id": class_id,
            "section": section,
            "subject": subject,
            "assessment_type": assessment_type,
            "assessment_id": assessment_id,
        },
        "count": len(rows),
        "results": [dict(row) for row in rows],
        "test_results": test_results,
    }
# ===================== STUDENT DETAILS =====================
@router.get("/{student_id}")
def get_student_details(
    student_id: int,
    db: Session = Depends(get_db)
):
    student_query = """
        SELECT
            s.student_id,
            s.admission_no,
            s.full_name,
            s.class_id,
            c.class_name,
            COALESCE(
                NULLIF(TRIM(s.section), ''),
                c.section_name
            ) AS section_name,
            s.roll_no,
            s.student_phone,
            s.student_email AS email_id,
            s.record_status
        FROM student_master s
        LEFT JOIN class_master c
            ON s.class_id = c.class_id
        WHERE s.student_id = :student_id;
    """

    student = db.execute(
        text(student_query),
        {"student_id": student_id}
    ).mappings().first()

    if not student:
        return {"message": "Student not found"}

    parent_query = """
        SELECT
            spm.id,
            spm.relationship_type,
            p.parent_id,
            p.full_name,
            p.phone,
            p.email
        FROM parent_student_map spm
        LEFT JOIN parent_master p
            ON spm.parent_id = p.parent_id
        WHERE spm.student_id = :student_id
        ORDER BY spm.id;
    """

    parents = db.execute(
        text(parent_query),
        {"student_id": student_id}
    ).mappings().all()

    return {
        "student": dict(student),
        "parents": [dict(parent) for parent in parents]
    }