from pydantic import BaseModel, Field
from typing import Literal, Optional


# =========================
# USER INFO (COMMON MODEL)
# =========================
class UserInfo(BaseModel):
    name: str = Field(default="")
    email: str = Field(default="")
    role: Literal["Headmaster", "Teacher", "Admin"] = "Headmaster"


# =========================
# 1. ASSIGNMENT REPORT
# =========================
class AssignmentReportRequest(BaseModel):
    user_info: UserInfo


# =========================
# 2. ACADEMIC ANALYTICS
# =========================
class AcademicAnalyticsRequest(BaseModel):
    target_type: Literal["student", "class"]
    scope: Literal["single_subject", "all_subjects"]
    class_name: str = Field(...)
    section_name: str = Field(...)
    roll_no: Optional[str] = Field(None, description="Required for specific student")
    subject_name: Optional[str] = Field(None, description="Required for single subject")
    user_info: UserInfo

# =========================
# 3. TEACHER PERFORMANCE
# =========================
class TeacherPerformanceRequest(BaseModel):
    user_info: UserInfo


# =========================
# 4. TRANSLATE
# =========================
from typing import Union, List

class TranslateRequest(BaseModel):
    text: Union[str, List[str]]
    target_language: str = Field(..., min_length=2, max_length=50)
    user_info: UserInfo