import json
import re
from sqlalchemy import text
from sqlalchemy.orm import Session
from decimal import Decimal

from app.ai_config import GeminiService
from app.utils.ai_tracker import log_ai_usage

# ==================================================
# Helper: Clean AI Text
# ==================================================
def clean_ai_text(text: str):
    return re.sub(r"(\$\$|\$|```|\\\(|\\\)|\\\[|\\\])", "", text or "").strip()



# ==================================================
# 1. ASSIGNMENT REPORT
# ==================================================
def get_assignment_report(db: Session, data: dict, user_info: dict):


    result = db.execute(text("""
        SELECT 
            COUNT(*) AS total_assigned,
            SUM(CASE WHEN marks_obtained IS NOT NULL THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN marks_obtained IS NULL OR is_absent = true THEN 1 ELSE 0 END) AS missing
        FROM sgs_assessment_results
    """)).mappings().first()

    prompt = f"""
You are SGS AI Executive Assistant for the Headmaster.

Review the following school-wide assignment statistics.

School Data:

{json.dumps(dict(result or {}))}

Prepare a concise executive report.

Include:

- Overall completion status.
- Key concerns requiring intervention.
- Recommended administrative action.

IMPORTANT FORMAT RULES:

- Maximum 3 bullet points.
- Professional tone.
- Plain text only.
- No Markdown.
- No tables.
- No HTML.
- No code blocks.
- No LaTeX.
"""

    ai_result = GeminiService.generate_content(prompt)
    log_ai_usage(
    db=db,
    user_info=user_info,
    module_name="Headmaster Dashboard",
    feature_name="School-Wide Assignment Report",
    usage_metadata=ai_result.get("usage", {}),
)

    return {
        "report": clean_ai_text(ai_result.get("text", ""))
    }


# ==================================================
# NEW: GET CLASS & SECTION METADATA
# ==================================================
def get_class_student_count(db: Session, class_name: str, section_name: str):
    """
    Fetches the total number of students for a specific class and section.
    """
    count = db.execute(text("""
        SELECT COUNT(*) 
        FROM sgs_student_master 
        WHERE class_name = :class_name 
        AND section_name = :section_name
    """), {"class_name": class_name, "section_name": section_name}).scalar()
    
    return {"total_students": count or 0}

# ==================================================
# 2. ACADEMIC ANALYTICS
# ==================================================
def get_academic_analytics(db: Session, payload: dict, user_info: dict):
    print("\n========== ACADEMIC ANALYTICS ==========")
    print("Payload:", payload)

    target_type = payload.get("target_type")
    scope = payload.get("scope")
    class_name = payload.get("class_name")
    section_name = payload.get("section_name")
    roll_no = payload.get("roll_no")
    subject_name = payload.get("subject_name")

    data = []

    # ------------------------------------------
    # STUDENT - ALL SUBJECTS
    # ------------------------------------------
    if target_type == "student" and scope == "all_subjects":

        data = db.execute(text("""
            SELECT
                s.full_name AS student_name,
                s.roll_no AS roll_no,
                a.subject AS subject,
                ROUND(AVG(ar.percentage), 2) AS score
            FROM sgs_assessment_results ar
            JOIN sgs_assessments a
                ON a.assessment_id = ar.assessment_id
            JOIN sgs_student_master s
                ON s.student_id = ar.student_id
            JOIN sgs_class_master c
                ON c.class_id = s.class_id
            WHERE s.roll_no = :roll_no
              AND c.class_name = :class_name
              AND s.section = :section_name
            GROUP BY
                s.full_name,
                s.roll_no, 
                a.subject
            ORDER BY a.subject
        """), {
            "roll_no": roll_no,
            "class_name": class_name,
            "section_name": section_name
        }).mappings().all()

    # ------------------------------------------
    # CLASS - ALL SUBJECTS
    # ------------------------------------------
    elif target_type == "class" and scope == "all_subjects":

        data = db.execute(text("""
            SELECT
                a.subject AS subject,
                ROUND(AVG(ar.percentage), 2) AS score
            FROM sgs_assessment_results ar
            JOIN sgs_assessments a
                ON a.assessment_id = ar.assessment_id
            JOIN sgs_student_master s
                ON s.student_id = ar.student_id
            JOIN sgs_class_master c
                ON c.class_id = s.class_id
            WHERE c.class_name = :class_name
              AND s.section = :section_name
            GROUP BY a.subject
            ORDER BY a.subject
        """), {
            "class_name": class_name,
            "section_name": section_name
        }).mappings().all()

    # ------------------------------------------
    # STUDENT - SINGLE SUBJECT
    # ------------------------------------------
    elif target_type == "student" and scope == "single_subject":

        data = db.execute(text("""
            SELECT
                s.full_name AS student_name,
                s.roll_no AS roll_no,
                a.title AS test,
                ar.percentage AS score
            FROM sgs_assessment_results ar
            JOIN sgs_assessments a
                ON a.assessment_id = ar.assessment_id
            JOIN sgs_student_master s
                ON s.student_id = ar.student_id
            JOIN sgs_class_master c
                ON c.class_id = s.class_id
            WHERE s.roll_no = :roll_no
              AND c.class_name = :class_name
              AND s.section = :section_name
              AND a.subject = :subject_name
            ORDER BY a.title
        """), {
            "roll_no": roll_no,
            "class_name": class_name,
            "section_name": section_name,
            "subject_name": subject_name
        }).mappings().all()

    # ------------------------------------------
    # CLASS - SINGLE SUBJECT
    # ------------------------------------------
    elif target_type == "class" and scope == "single_subject":

        data = db.execute(text("""
            SELECT
                s.full_name AS student,
                ar.percentage AS score
            FROM sgs_assessment_results ar
            JOIN sgs_assessments a
                ON a.assessment_id = ar.assessment_id
            JOIN sgs_student_master s
                ON s.student_id = ar.student_id
            JOIN sgs_class_master c
                ON c.class_id = s.class_id
            WHERE c.class_name = :class_name
              AND s.section = :section_name
              AND a.subject = :subject_name
            ORDER BY s.full_name
        """), {
            "class_name": class_name,
            "section_name": section_name,
            "subject_name": subject_name
        }).mappings().all()

    # ------------------------------------------
    # INVALID TARGET / SCOPE
    # ------------------------------------------
    else:
        return {
            "trend": "",
            "strengths": "",
            "weaknesses": "",
            "recommendations": "",
            "data": [],
            "message": "Invalid target_type or scope"
        }

    print("SQL RESULT:", [dict(r) for r in data])

    # ------------------------------------------
    # CLEAN DATA
    # ------------------------------------------
    cleaned_data = []

    for row in data:
        row_dict = dict(row)

        for key, value in row_dict.items():
            if isinstance(value, Decimal):
                row_dict[key] = float(value)

        cleaned_data.append(row_dict)

    
    # ------------------------------------------
    # NO DATA
    # ------------------------------------------
    if not cleaned_data:
        return {
            "trend": "",
            "strengths": "",
            "weaknesses": "",
            "recommendations": "",
            "data": [],
            "message": "No academic data found for the selected criteria"
        }

    # ------------------------------------------
    # SAFE JSON FOR GEMINI
    # ------------------------------------------
    safe_json = json.dumps(
        cleaned_data,
        ensure_ascii=False
    )

    prompt = f"""
You are SGS AI Academic Analytics Assistant.

Analyze this academic data:

{safe_json}

Return ONLY valid JSON.

Format:

{{
    "trend": "",
    "strengths": "",
    "weaknesses": "",
    "recommendations": ""
}}

Rules:

- Values must be plain text.
- No Markdown.
- No explanations.
- No JSON code blocks.
- No extra keys.
"""

    # ------------------------------------------
    # GEMINI
    # ------------------------------------------
    try:
        ai_result = GeminiService.generate_content(prompt)

        log_ai_usage(
            db=db,
            user_info=user_info,
            module_name="Headmaster Dashboard",
            feature_name="Academic Analytics",
            usage_metadata=ai_result.get("usage", {})
        )

        ai_text = clean_ai_text(
            ai_result.get("text", "")
        )

        # --------------------------------------
        # PARSE GEMINI JSON
        # --------------------------------------
        try:
            result = json.loads(ai_text)

        except (json.JSONDecodeError, TypeError):
            result = {
                "trend": ai_text,
                "strengths": "",
                "weaknesses": "",
                "recommendations": ""
            }

        # Always include actual SQL data
        result["data"] = cleaned_data

        return result

    except Exception as e:
        print("ACADEMIC ANALYTICS GEMINI ERROR:", str(e))

        return {
            "trend": "",
            "strengths": "",
            "weaknesses": "",
            "recommendations": "",
            "data": cleaned_data,
            "message": "Academic data retrieved successfully, but AI analysis failed"
        }



    # ==================================================
# GET ACADEMIC ANALYTICS SUBJECTS
# ==================================================

def get_academic_analytics_subjects(db: Session, class_name: str):

    result = db.execute(text("""
        SELECT DISTINCT a.subject
        FROM sgs_assessment_results ar
        JOIN sgs_assessments a
            ON a.assessment_id = ar.assessment_id
        JOIN sgs_student_master s
            ON s.student_id = ar.student_id
        JOIN sgs_class_master c
            ON c.class_id = s.class_id
        WHERE c.class_name = :class_name
          AND a.subject IS NOT NULL
          AND TRIM(a.subject) <> ''
        ORDER BY a.subject
    """), {
        "class_name": class_name
    }).scalars().all()

    return {
        "subjects": result
    }
# ==================================================
# 3. TEACHER PERFORMANCE
# ==================================================
def get_teacher_performance(db: Session, data: dict, user_info: dict):


    teacher_data = db.execute(text("""
        SELECT u.full_name AS name,
               COUNT(a.assessment_id) AS assessments_created
        FROM sgs_users_masters u
        LEFT JOIN sgs_assessments a ON u.user_id::text = a.teacher_id
        GROUP BY u.full_name
        ORDER BY assessments_created DESC
    """)).mappings().all()

    prompt = f"""
You are SGS AI School Performance Advisor.

Review the following teacher performance data.

Teacher Data:

{json.dumps([dict(x) for x in teacher_data])}

Generate an executive summary.

Include:

- High-performing teachers.
- Teachers requiring support.
- Administrative recommendations.
- Professional development suggestions.

IMPORTANT FORMAT RULES:

- Maximum 4 bullet points.
- Professional tone.
- Plain text only.
- No Markdown.
- No HTML.
- No LaTeX.
"""

    ai_result = GeminiService.generate_content(prompt)
    log_ai_usage(
    db=db,
    user_info=user_info,
    module_name="Headmaster Dashboard",
    feature_name="Teacher Performance Review",
    usage_metadata=ai_result.get("usage", {}),
)

    return {
        "report": clean_ai_text(ai_result.get("text", ""))
    }
# ==================================================
# 4. TRANSLATE
# ==================================================
def translate_for_headmaster(db: Session, payload: dict, user_info: dict):

    text_value = payload.get("text")
    target_language = payload.get("target_language")

    if not text_value or not target_language:
        return {"error": "Missing parameters"}

   
    is_bulk = isinstance(text_value, list)

    if is_bulk:

        prompt = f"""
Translate the following list into {target_language}.

Rules:
- Return ONLY a JSON array.
- Keep the same order.
- Do not translate numbers.
- Do not translate emails.
- Do not translate phone numbers.
- Do not explain.

Text:
{json.dumps(text_value, ensure_ascii=False)}
"""

    else:

        prompt = f"""
Translate the following text into {target_language}.

Rules:
- Return ONLY translated text.
- Do not translate numbers.
- Do not translate emails.
- Do not translate phone numbers.
- Do not explain.

Text:
{text_value}
"""


    ai_result = GeminiService.generate_content(prompt)
    log_ai_usage(
    db=db,
    user_info=user_info,
    module_name="Headmaster Dashboard",
    feature_name="Headmaster Translator",
    usage_metadata=ai_result.get("usage", {}),
)


    translated_text = clean_ai_text(
        ai_result.get("text", "")
    )


    if is_bulk:
        try:
            translated_text = json.loads(translated_text)
        except:
            translated_text = text_value


    return {
        "original": text_value,
        "translated": translated_text,
        "target_language": target_language
    }