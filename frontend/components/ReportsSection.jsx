
"use client";


import React, { useEffect, useMemo, useState } from "react";

import axios from "axios";
import {
  FileText,
  ChartNoAxesCombined,
  Search,
  ChevronRight,
  ArrowLeft,
  Users,
  BookOpen,
  School,
} from "lucide-react";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 30000,
});

export default function ReportsSection() {
  const [activeReportTab, setActiveReportTab] = useState("student");
 const [consolidatedView, setConsolidatedView] = useState("section");
  const [consolidatedType, setConsolidatedType] =
  useState("SUMMARY");

const [consolidatedMonth, setConsolidatedMonth] =
  useState("");

const [consolidatedYear, setConsolidatedYear] =
  useState(String(new Date().getFullYear()));

const [consolidatedAssessmentType, setConsolidatedAssessmentType] =
  useState("ALL");
const [consolidatedAssessmentId, setConsolidatedAssessmentId] =
  useState("");
const [consolidatedClass, setConsolidatedClass] =
  useState("");

const [consolidatedSection, setConsolidatedSection] =
  useState("");

const [consolidatedSubject, setConsolidatedSubject] =
  useState("");
const [consolidatedSubjects, setConsolidatedSubjects] = useState([]);
const [consolidatedData, setConsolidatedData] =
  useState([]);

const [consolidatedLoading, setConsolidatedLoading] =
  useState(false);

const [consolidatedError, setConsolidatedError] =
  useState("");

const [consolidatedGenerated, setConsolidatedGenerated] =
  useState(false);

  const [consolidatedTestResults, setConsolidatedTestResults] = useState([]);
const [expandedSubjectRows, setExpandedSubjectRows] = useState({});

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [selectedAssessmentOption, setSelectedAssessmentOption] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [subject, setSubject] = useState("");

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load classes
  useEffect(() => {
    let cancelled = false;

    async function loadClasses() {
      try {
        const res = await api.get("/students/classes");

        if (!cancelled) {
          setClasses(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.detail || "Unable to load classes."
          );
        }
      }
    }

    loadClasses();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load exam options dynamically from sgs_exam_master
  useEffect(() => {
    let cancelled = false;

    async function loadExams() {
      try {
        const res = await api.get("/students/exams");

        if (!cancelled) {
          setExams(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.detail || "Unable to load exams."
          );
        }
      }
    }

    loadExams();

    return () => {
      cancelled = true;
    };
  }, []);



  // Load subjects based on selected class
  useEffect(() => {
    let cancelled = false;

    async function loadConsolidatedSubjects() {
      try {
        const params = consolidatedClass
          ? { class_id: consolidatedClass }
          : {};

        const res = await api.get(
          "/students/reports/subjects",
          { params }
        );

        if (!cancelled) {
          setConsolidatedSubjects(
            Array.isArray(res.data) ? res.data : []
          );
        }
      } catch (err) {
        if (!cancelled) {
          console.error(
            "Unable to load consolidated subjects:",
            err.response?.data || err.message
          );
          setConsolidatedSubjects([]);
        }
      }
    }

    loadConsolidatedSubjects();

    return () => {
      cancelled = true;
    };
  }, [consolidatedClass]);

  const classOptions = useMemo(() => {
    const map = new Map();

    classes.forEach((item) => {
      if (item.class_id != null) {
        map.set(String(item.class_id), item);
      }
    });

    return [...map.values()];
  }, [classes]);

  const sectionOptions = useMemo(
    () => [
      ...new Set(
        classes
          .filter((item) => String(item.class_id) === selectedClass)
          .map((item) => String(item.section_name || "").trim())
          .filter(Boolean)
      ),
    ],
    [classes, selectedClass]
  );

  // Load students for the selected class and section
  useEffect(() => {
    if (!selectedClass || !selectedSection) {
      setStudents([]);
      return;
    }

    let cancelled = false;

    async function loadStudents() {
      setLoading(true);
      setError("");

      try {
        const classItem = classOptions.find(
          (item) => String(item.class_id) === selectedClass
        );

        const res = await api.get("/students/", {
          params: {
            class_name: classItem?.class_name,
            section: selectedSection,
          },
        });

        if (!cancelled) {
          setStudents(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.detail || "Unable to load students."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStudents();

    return () => {
      cancelled = true;
    };
  }, [selectedClass, selectedSection, classOptions]);

  const filteredStudents = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return students.filter((student) => {
      const name = String(student.full_name || "").toLowerCase();
      const roll = String(student.roll_no || "").toLowerCase();

      return name.includes(query) || roll.includes(query);
    });
  }, [students, searchText]);

  const subjects = useMemo(
    () => [
      ...new Set(
        (report?.assessments || [])
          .map((item) => item.subject)
          .filter(Boolean)
      ),
    ],
    [report]
  );

  
const isWeeklyTestSelected =
  selectedAssessmentOption === "ASSESSMENT:0";

const weeklyReport = useMemo(() => {
  const assessments = (report?.assessments || []).filter(
    (item) => item.exam_id == null && item.class_id != null
  );

  const allSubjects = [
    ...new Set(
      assessments
        .map((item) => String(item.subject || "").trim())
        .filter(Boolean)
    ),
  ].sort();

  const visibleSubjects = subject
    ? allSubjects.filter((name) => name === subject)
    : allSubjects;

  const weekMap = new Map();

  assessments.forEach((item, index) => {
    if (!item.assessment_date) return;

    const dateText = String(item.assessment_date).slice(0, 10);
    const parts = dateText.split("-").map(Number);

    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
      return;
    }

    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));

    const weekKey = date.toISOString().slice(0, 10);
    const subjectName = String(item.subject || "").trim();

    if (!subjectName) return;

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { weekKey, cells: {} });
    }

    const week = weekMap.get(weekKey);

    if (!week.cells[subjectName]) {
      week.cells[subjectName] = [];
    }

 
week.cells[subjectName].push({
  key: item.result_id ?? `${item.assessment_id}-${index}`,
  testName:
    item.assessment_name ||
    item.title ||
    "Weekly Test",
  marks: item.marks_obtained,
  maxMarks: item.max_marks,
  absent: item.is_absent === true,
});

  });

  const weeks = [...weekMap.values()].sort((a, b) =>
    a.weekKey.localeCompare(b.weekKey)
  );

  const totals = {};

  visibleSubjects.forEach((name) => {
    const entries = assessments.filter(
      (item) => String(item.subject || "").trim() === name
    );

    const maximum = entries.reduce(
      (sum, item) => sum + Number(item.max_marks || 0),
      0
    );

    const obtained = entries.reduce((sum, item) => {
      if (item.is_absent === true || item.marks_obtained == null) {
        return sum;
      }

      return sum + Number(item.marks_obtained);
    }, 0);

    totals[name] = {
      obtained,
      maximum,
      percentage: maximum > 0 ? (obtained / maximum) * 100 : null,
    };
  });

  return { subjects: visibleSubjects, weeks, totals };
}, [report, subject]);

  

  // Load report for a selected student using current filters
  async function loadStudentReport(student) {
    if (!student) return;

    setSelectedStudent(student);
    setLoading(true);
    setError("");
    setReport(null);

    try {


const [optionType, optionId] =
  selectedAssessmentOption.split(":");

const selectedParams = {};

if (optionType === "EXAM" && optionId) {
  selectedParams.exam_id = optionId;
} else if (
  optionType === "ASSESSMENT" &&
  optionId &&
  optionId !== "0"
) {
  selectedParams.assessment_id = optionId;
}

const selectedReportType =
  optionType === "ASSESSMENT" && optionId === "0"
    ? "CT"
    : "ALL";

      const res = await api.get(
        `/students/reports/student/${student.student_id}`,
        {
          params: {
           report_type: selectedReportType,
  month: month || undefined,
  year: year || undefined,
  subject: subject || undefined,
  ...selectedParams,
          },
        }
      );

      setReport(res.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to load the student report."
      );
    } finally {
      setLoading(false);
    }
  }

  function backToStudents() {
    setSelectedStudent(null);
    setReport(null);
    setError("");
    setSelectedAssessmentOption("");
    setMonth("");
    setYear(String(new Date().getFullYear()));
    setSubject("");
  }

async function generateConsolidatedReport() {
  if (consolidatedView === "section" && !consolidatedClass) {
    setConsolidatedError("Please select a class.");
    return;
  }

  setConsolidatedLoading(true);
  setConsolidatedError("");
  setConsolidatedData([]);
  setConsolidatedGenerated(false);

  try {
    const params = {
      view:
        consolidatedView === "section"
          ? "SECTION"
          : consolidatedView === "subject"
            ? "SUBJECT"
            : "SCHOOL",
      report_type: "SUMMARY",
      month: consolidatedMonth || undefined,
      year: consolidatedYear || undefined,
      class_id: consolidatedClass || undefined,
      section: consolidatedView === "section"
        ? consolidatedSection || undefined
        : undefined,
      subject: consolidatedView === "subject"
        ? consolidatedSubject || undefined
        : undefined,
      assessment_type: consolidatedAssessmentType,
      output_format: consolidatedView === "section"
        ? "MATRIX"
        : "SUMMARY",
    };

    const response = await api.get(
      "/students/reports/consolidated",
      { params }
    );

   
const results = Array.isArray(response.data?.results)
  ? response.data.results
  : [];

const testResults = Array.isArray(response.data?.test_results)
  ? response.data.test_results
  : [];

setConsolidatedData(results);
setConsolidatedTestResults(testResults);
setExpandedSubjectRows({});
setConsolidatedGenerated(true);

  } catch (err) {
    setConsolidatedError(
      err.response?.data?.detail ||
        "Unable to generate consolidated report."
    );
  } finally {
    setConsolidatedLoading(false);
  }
}

function getConsolidatedExportData() {
  if (!consolidatedData.length) return { headers: [], rows: [] };

  if (
    consolidatedView === "section" &&
    consolidatedData[0]?.subjects
  ) {
    const subjects = [
      ...new Set(
        consolidatedData.flatMap((student) =>
          Object.keys(student.subjects || {})
        )
      ),
    ];

    const headers = [
      "Roll Number",
      "Student Name",
      "Section",
      ...subjects,
      "Total Marks",
      "Percentage",
      "Rank",
    ];

    const rows = consolidatedData.map((student) => [
      student.roll_number ?? "—",
      student.student_name ?? "—",
      student.section ?? "—",
      ...subjects.map((name) => {
        const item = student.subjects?.[name];
        return item?.display ??
          (item?.obtained != null
            ? `${item.obtained} / ${item.max_marks ?? ""}`
            : "—");
      }),
      student.total_display ??
        `${student.total_obtained ?? 0} / ${student.total_max_marks ?? 0}`,
      student.percentage == null
        ? "—"
        : `${student.percentage}%`,
      student.rank ?? "—",
    ]);

    return { headers, rows };
  }

  const headers = Object.keys(consolidatedData[0]).map((key) =>
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );

  const rows = consolidatedData.map((item) =>
    Object.values(item).map((value) =>
      value == null
        ? "—"
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value)
    )
  );

  return { headers, rows };
}

function exportConsolidatedExcel() {
  const { headers, rows } = getConsolidatedExportData();

  if (!rows.length) return;

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const table = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:x="urn:schemas-microsoft-com:office:excel"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <!--[if gte mso 9]>
        <xml><x:ExcelWorkbook><x:ExcelWorksheets>
        <x:ExcelWorksheet><x:Name>Consolidated Report</x:Name>
        <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet>
        </x:ExcelWorksheets></x:ExcelWorkbook></xml>
        <![endif]-->
      </head>
      <body>
        <table border="1">
          <thead><tr>${headers.map((h) =>
            `<th>${escapeHtml(h)}</th>`
          ).join("")}</tr></thead>
          <tbody>${rows.map((row) =>
            `<tr>${row.map((value) =>
              `<td>${escapeHtml(value)}</td>`
            ).join("")}</tr>`
          ).join("")}</tbody>
        </table>
      </body>
    </html>`;

  const blob = new Blob(["\ufeff", table], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `consolidated-report-${consolidatedView}-${consolidatedYear || "all"}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportConsolidatedPDF() {
  const { headers, rows } = getConsolidatedExportData();

  if (!rows.length) return;

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    setConsolidatedError(
      "PDF window was blocked. Please allow pop-ups and try again."
    );
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Consolidated Academic Report</title>
        <meta charset="utf-8" />
        <style>
          @page { size: landscape; margin: 12mm; }
          body { font-family: Arial, sans-serif; color: #172033; }
          h1 { font-size: 20px; margin-bottom: 6px; }
          p { font-size: 11px; color: #555; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 9px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; }
          th { background: #e8edf5; }
          tr { page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <h1>Consolidated Academic Report</h1>
        <p>
          View: ${escapeHtml(consolidatedView)} |
          Year: ${escapeHtml(consolidatedYear || "All")} |
          Assessment: ${escapeHtml(consolidatedAssessmentType)}
        </p>
        <table>
          <thead><tr>${headers.map((h) =>
            `<th>${escapeHtml(h)}</th>`
          ).join("")}</tr></thead>
          <tbody>${rows.map((row) =>
            `<tr>${row.map((value) =>
              `<td>${escapeHtml(value)}</td>`
            ).join("")}</tr>`
          ).join("")}</tbody>
        </table>
        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}
  return (
    <div className="reports-page">
      <div className="reports-heading">
        <div>
          <h2>Reports</h2>
          <p>View individual student and consolidated academic reports.</p>
        </div>
      </div>

      {/* MAIN TABS */}
      <div className="reports-tabs">
        <button
          type="button"
          className={`reports-tab ${
            activeReportTab === "student" ? "active" : ""
          }`}
          onClick={() => setActiveReportTab("student")}
        >
          <FileText size={18} />
          Student Reports
        </button>

        <button
          type="button"
          className={`reports-tab ${
            activeReportTab === "consolidated" ? "active" : ""
          }`}
          onClick={() => setActiveReportTab("consolidated")}
        >
          <ChartNoAxesCombined size={18} />
          Consolidated Reports
        </button>
      </div>

      {/* STUDENT REPORTS */}
      {activeReportTab === "student" && (
        <section className="reports-content">
          {!selectedStudent ? (
            <>
              <h3>Select a Student</h3>
              <p>Choose class and section to find a student.</p>

              <div className="report-filters student-selection-filters">
                <label className="student-filter">
                  Class
                  <select
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value);
                      setSelectedSection("");
                      setSearchText("");
                      setStudents([]);
                      setError("");
                    }}
                  >
                    <option value="">Select Class</option>
                    {classOptions.map((item) => (
                      <option
                        key={item.class_id}
                        value={String(item.class_id)}
                      >
                        {item.class_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="student-filter">
                  Section
                  <select
                    value={selectedSection}
                    disabled={!selectedClass}
                    onChange={(e) => {
                      setSelectedSection(e.target.value);
                      setSearchText("");
                      setError("");
                    }}
                  >
                    <option value="">Select Section</option>
                    {sectionOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="report-search">
                  <Search size={18} />
                  <input
                    placeholder="Search name or roll number"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    disabled={!selectedClass || !selectedSection}
                  />
                </div>
              </div>

              {loading && <p>Loading students...</p>}
              {error && <p className="error-banner">{error}</p>}

              {selectedClass && selectedSection && !loading && (
                <div className="report-student-list">
                  {filteredStudents.map((student) => (
                    <button
                      type="button"
                      key={student.student_id}
                      className="report-student-row"
                      onClick={() => loadStudentReport(student)}
                    >
                      <span className="report-roll">
                        {student.roll_no || "—"}
                      </span>
                      <span className="report-student-name">
                        {student.full_name}
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  ))}

                  {filteredStudents.length === 0 && (
                    <p>No students found for this section.</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                className="report-back-btn"
                onClick={backToStudents}
              >
                <ArrowLeft size={16} />
                Back to Students
              </button>

              <h3>{selectedStudent.full_name}</h3>
              <p>
                Roll Number: {selectedStudent.roll_no || "—"} | Class:{" "}
                {classOptions.find(
                  (item) => String(item.class_id) === selectedClass
                )?.class_name || "—"}{" "}
                | Section: {selectedSection}
              </p>

              <div className="report-filters report-detail-filters">
               
<label className="student-filter">
  Exam / Weekly Test
  <select
    value={selectedAssessmentOption}
    onChange={(e) => {
      setSelectedAssessmentOption(e.target.value);
      setError("");
    }}
    disabled={loading}
  >
  
<option value="">All Assessments</option>

{exams
  .filter(
    (item) =>
      item.option_type === "EXAM" ||
      (item.option_type === "ASSESSMENT" &&
        String(item.option_id) === "0")
  )
  .map((item) => (
    <option
      key={`${item.option_type}:${item.option_id}`}
      value={`${item.option_type}:${item.option_id}`}
    >
      {item.option_type === "ASSESSMENT"
        ? "Weekly Test"
        : `Exam — ${item.option_name}${
            item.academic_year ? ` (${item.academic_year})` : ""
          }`}
    </option>
  ))}

  </select>
</label>


                <label className="student-filter">
                  Month
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  >
                    <option value="">All Months</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1)}>
                        {new Date(2000, i).toLocaleString("en", {
                          month: "long",
                        })}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="student-filter">
                  Year
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </label>

                <label className="student-filter">
                  Subject
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  >
                    <option value="">All Subjects</option>
                    {subjects.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="clear-filter-btn"
                  disabled={loading}
                  onClick={() => loadStudentReport(selectedStudent)}
                >
                  Apply Filters
                </button>
              </div>

              {loading && <p>Loading report...</p>}
              {error && <p className="error-banner">{error}</p>}

              {report && !loading && (
                <>
                  <div className="report-summary">
                    <div>
                      <span>Assessments</span>
                      <strong>{report.assessment_count ?? 0}</strong>
                    </div>
                    <div>
                      <span>Attended</span>
                      <strong>{report.attended_count ?? 0}</strong>
                    </div>
                    <div>
                      <span>Absent</span>
                      <strong>{report.absent_count ?? 0}</strong>
                    </div>
                  </div>


{isWeeklyTestSelected ? (
  <div className="table-scroll-wrapper">
    <table>
      <thead>
        <tr>
          <th>Week</th>
          {weeklyReport.subjects.map((name) => (
            <th key={name}>{name}</th>
          ))}
        </tr>
      </thead>

      <tbody>
        {weeklyReport.weeks.length === 0 ? (
          <tr>
            <td colSpan={weeklyReport.subjects.length + 1}>
              No weekly test data found.
            </td>
          </tr>
        ) : (
          weeklyReport.weeks.map((week, weekIndex) => (
            <tr key={week.weekKey}>
              <td>Week {weekIndex + 1}</td>

              {weeklyReport.subjects.map((name) => {
                const entries = week.cells[name] || [];

                return (
                  <td key={name}>
                    {entries.length === 0
                      ? "—"
                      : entries.map((entry) => (
                          <div
                            key={entry.key}
                            style={{ marginBottom: 8 }}
                          >
                            {entry.absent
                              ? "Absent"
                              : entry.marks == null
                              ? "—"
                              : `${entry.marks}${
                                  entry.maxMarks != null
                                    ? ` / ${entry.maxMarks}`
                                    : ""
                                }`}
                          </div>
                        ))}
                  </td>
                );
              })}
            </tr>
          ))
        )}

        {weeklyReport.weeks.length > 0 && (
          <>
            <tr>
              <th>Total Marks</th>
              {weeklyReport.subjects.map((name) => (
                <td key={name}>
                  {weeklyReport.totals[name].obtained} /{" "}
                  {weeklyReport.totals[name].maximum}
                </td>
              ))}
            </tr>

            <tr>
              <th>Percentage</th>
              {weeklyReport.subjects.map((name) => {
                const percentage =
                  weeklyReport.totals[name].percentage;

                return (
                  <td key={name}>
                    {percentage == null
                      ? "—"
                      : `${percentage.toFixed(2)}%`}
                  </td>
                );
              })}
            </tr>
          </>
        )}
      </tbody>
    </table>
  </div>
) : (
  <div className="table-scroll-wrapper">
    <table>
      <thead>
        <tr>
          <th>Assessment</th>
          <th>Subject</th>
          <th>Date</th>
          <th>Marks</th>
          <th>Percentage</th>
          <th>Status</th>
        </tr>
      </thead>

      <tbody>
        {(report.assessments || []).map((item, index) => (
          <tr
            key={
              item.result_id ??
              `${item.assessment_id}-${index}`
            }
          >
            <td>{item.assessment_name || item.title || "—"}</td>
            <td>{item.subject || "—"}</td>
            <td>
              {item.assessment_date
                ? String(item.assessment_date).slice(0, 10)
                : "—"}
            </td>
            <td>
              {item.is_absent === true
                ? "Absent"
                : item.marks_obtained == null
                ? "—"
                : `${item.marks_obtained}${
                    item.max_marks != null
                      ? ` / ${item.max_marks}`
                      : ""
                  }`}
            </td>
            <td>
              {item.is_absent === true ||
              item.percentage == null
                ? "—"
                : `${item.percentage}%`}
            </td>
            <td>
              {item.is_absent === true
                ? "Absent"
                : item.marks_obtained == null
                ? "—"
                : "Attended"}
            </td>
          </tr>
        ))}

        {(report.assessments || []).length === 0 && (
          <tr>
            <td colSpan={6}>
              No assessments found for these filters.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
)}


                </>
              )}
            </>
          )}
        </section>
      )}

{/* ================= CONSOLIDATED REPORTS ================= */}
{activeReportTab === "consolidated" && (
  <section className="reports-content">
    <div className="consolidated-header">
      <div>
        <h3>Consolidated Reports</h3>
        <p>
          Review class, subject and school-wide academic performance.
        </p>
      </div>
    </div>

    {/* Three report views */}
    <div className="consolidated-options">
      {[
        { id: "section", label: "Class & Section", Icon: Users },
        { id: "subject", label: "Subject-wise", Icon: BookOpen },
        { id: "school", label: "School-wide", Icon: School },
      ].map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`consolidated-option ${
            consolidatedView === id ? "active" : ""
          }`}
          onClick={() => {
            setConsolidatedView(id);
            setConsolidatedData([]);
            setConsolidatedGenerated(false);
            setConsolidatedError("");
          }}
        >
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </div>

    {/* Filters */}
    <div className="consolidated-filter-panel">
      <h4>Report Filters</h4>

      <div className="report-filters">
        {consolidatedView !== "school" && (
          <label className="student-filter">
            Class
            <select
              value={consolidatedClass}
              onChange={(e) => {
                setConsolidatedClass(e.target.value);
                setConsolidatedSection("");
                setConsolidatedSubject("");
                setConsolidatedData([]);
                setConsolidatedGenerated(false);
              }}
            >
              <option value="">Select Class</option>
              {classOptions.map((item) => (
                <option
                  key={item.class_id}
                  value={String(item.class_id)}
                >
                  {item.class_name}
                </option>
              ))}
            </select>
          </label>
        )}

        {consolidatedView === "section" && (
          <label className="student-filter">
            Section
            <select
              value={consolidatedSection}
              disabled={!consolidatedClass}
              onChange={(e) => {
                setConsolidatedSection(e.target.value);
                setConsolidatedData([]);
                setConsolidatedGenerated(false);
              }}
            >
              <option value="">All Sections</option>
              {[
                ...new Set(
                  classes
                    .filter(
                      (item) =>
                        String(item.class_id) === consolidatedClass
                    )
                    .map((item) =>
                      String(item.section_name || "").trim()
                    )
                    .filter(Boolean)
                ),
              ].map((sectionName) => (
                <option key={sectionName} value={sectionName}>
                  {sectionName}
                </option>
              ))}
            </select>
          </label>
        )}

        {consolidatedView === "subject" && (
          <label className="student-filter">
            Subject
            <select
              value={consolidatedSubject}
              onChange={(e) => {
                setConsolidatedSubject(e.target.value);
                setConsolidatedData([]);
                setConsolidatedGenerated(false);
              }}
            >
              <option value="">All Subjects</option>
              {consolidatedSubjects
                .filter(
                  (item) =>
                    !consolidatedClass ||
                    String(item.class_id) === consolidatedClass
                )
                .map((item) => (
                  <option
                    key={item.subject_id ?? item.subject_name}
                    value={item.subject_name}
                  >
                    {item.subject_name}
                  </option>
                ))}
            </select>
          </label>
        )}

        <label className="student-filter">
          Month
          <select
            value={consolidatedMonth}
            onChange={(e) => {
              setConsolidatedMonth(e.target.value);
              setConsolidatedData([]);
              setConsolidatedGenerated(false);
            }}
          >
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={String(index + 1)}>
                {new Date(2000, index).toLocaleString("en", {
                  month: "long",
                })}
              </option>
            ))}
          </select>
        </label>

        <label className="student-filter">
          Year
          <input
            type="number"
            min="2000"
            max="2100"
            value={consolidatedYear}
            onChange={(e) => {
              setConsolidatedYear(e.target.value);
              setConsolidatedData([]);
              setConsolidatedGenerated(false);
            }}
          />
        </label>

       
<label className="student-filter">
  Assessment
  <select
    value={consolidatedAssessmentId}
    onChange={(e) => {
      setConsolidatedAssessmentId(e.target.value);
      setConsolidatedData([]);
      setConsolidatedTestResults([]);
      setExpandedSubjectRows({});
      setConsolidatedGenerated(false);
      setConsolidatedError("");
    }}
  >
    <option value="">All Assessments</option>

    {exams
      .filter(
        (item) =>
          item.option_type === "EXAM" ||
          (item.option_type === "ASSESSMENT" &&
            String(item.option_id) === "0")
      )
      .map((item) => (
        <option
          key={`${item.option_type}:${item.option_id}`}
          value={`${item.option_type}:${item.option_id}`}
        >
          {item.option_type === "ASSESSMENT"
            ? "Weekly Test"
            : `Exam — ${item.option_name}${
                item.academic_year
                  ? ` (${item.academic_year})`
                  : ""
              }`}
        </option>
      ))}
  </select>
</label>

      </div>

      <div className="consolidated-actions">
        <button
          type="button"
          className="clear-filter-btn"
          disabled={consolidatedLoading}
          onClick={() => {
            setConsolidatedClass("");
            setConsolidatedSection("");
            setConsolidatedSubject("");
            setConsolidatedMonth("");
            setConsolidatedYear(String(new Date().getFullYear()));
            setConsolidatedAssessmentType("ALL");
            setConsolidatedAssessmentId("");
            setConsolidatedData([]);
            setConsolidatedError("");
            setConsolidatedGenerated(false);
          }}
        >
          Reset Filters
        </button>

        <button
          type="button"
          className="clear-filter-btn"
          disabled={consolidatedLoading}
          onClick={generateConsolidatedReport}
        >
          {consolidatedLoading ? "Generating..." : "Generate Report"}
        </button>
      </div>
    </div>

    {consolidatedError && (
      <p className="error-banner">{consolidatedError}</p>
    )}

    {consolidatedLoading && <p>Loading report...</p>}

    {/* Results */}
    {!consolidatedLoading &&
      consolidatedGenerated &&
      consolidatedData.length > 0 && (
        <div className="consolidated-results">
          <div className="consolidated-results-header">
            <div>
              <h4>
                {consolidatedView === "section"
                  ? "Class & Section Report"
                  : consolidatedView === "subject"
                    ? "Subject-wise Report"
                    : "School-wide Report"}
              </h4>
              <p>{consolidatedData.length} records found</p>
            </div>

            <div className="consolidated-actions">
              <button
                type="button"
                className="clear-filter-btn"
                onClick={exportConsolidatedPDF}
              >
                Export PDF
              </button>
              <button
                type="button"
                className="clear-filter-btn"
                onClick={exportConsolidatedExcel}
              >
                Export Excel
              </button>
            </div>
          </div>

<div className="table-scroll-wrapper">
  {consolidatedView === "subject" ? (
    <table>
      <thead>
        <tr>
          <th>Class</th>
          <th>Section</th>
          <th>Subject</th>
          <th>Tests Conducted</th>
          <th>Attended</th>
          <th>Absent</th>
          <th>Average Score</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        {consolidatedData.map((item, index) => {
          const rowKey = `${item.class_name}-${item.section_name}-${item.subject}-${index}`;

          const matchingTests = consolidatedTestResults.filter(
            (test) =>
              String(test.class_name ?? "") === String(item.class_name ?? "") &&
              String(test.section_name ?? "") === String(item.section_name ?? "") &&
              String(test.subject ?? "") === String(item.subject ?? "")
          );

          return (
            <React.Fragment key={rowKey}>
              <tr>
                <td>{item.class_name ?? "—"}</td>
                <td>{item.section_name ?? "—"}</td>
                <td>{item.subject ?? "—"}</td>
                <td>{item.tests_conducted ?? 0}</td>
                <td>{item.attended_count ?? 0}</td>
                <td>{item.absent_count ?? 0}</td>
                <td>
                  {item.average_percentage == null
                    ? "—"
                    : `${Number(item.average_percentage).toFixed(2)}%`}
                </td>
                <td>
                  <button
                    type="button"
                    className="clear-filter-btn"
                    onClick={() =>
                      setExpandedSubjectRows((previous) => ({
                        ...previous,
                        [rowKey]: !previous[rowKey],
                      }))
                    }
                  >
                    {expandedSubjectRows[rowKey] ? "Hide Tests" : "View Tests"}
                  </button>
                </td>
              </tr>

              {expandedSubjectRows[rowKey] && (
                <tr>
                  <td colSpan={8}>
                    {matchingTests.length > 0 ? (
                      <table>
                        <thead>
                          <tr>
                            <th>Test Name</th>
                            <th>Date</th>
                            <th>Attended</th>
                            <th>Absent</th>
                            <th>Average Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matchingTests.map((test) => (
                            <tr key={test.assessment_id}>
                              <td>{test.assessment_name ?? "—"}</td>
                              <td>
                                {test.assessment_date
                                  ? String(test.assessment_date).slice(0, 10)
                                  : "—"}
                              </td>
                              <td>{test.attended_count ?? 0}</td>
                              <td>{test.absent_count ?? 0}</td>
                              <td>
                                {test.average_percentage == null
                                  ? "—"
                                  : `${Number(test.average_percentage).toFixed(2)}%`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p>No test details found for this subject.</p>
                    )}
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  ) : (
    <table>
      <thead>
        {consolidatedView === "section" &&
        consolidatedData[0]?.subjects ? (
          <tr>
            <th>Roll No.</th>
            <th>Student Name</th>
            <th>Section</th>
            {[
              ...new Set(
                consolidatedData.flatMap((student) =>
                  Object.keys(student.subjects || {})
                )
              ),
            ].map((name) => (
              <th key={name}>{name}</th>
            ))}
            <th>Total</th>
            <th>Percentage</th>
            <th>Rank</th>
          </tr>
        ) : (
          <tr>
            {Object.keys(consolidatedData[0] || {}).map((key) => (
              <th key={key}>
                {key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}
              </th>
            ))}
          </tr>
        )}
      </thead>
      <tbody>
        {consolidatedView === "section" &&
        consolidatedData[0]?.subjects
          ? consolidatedData.map((student) => {
              const subjectNames = [
                ...new Set(
                  consolidatedData.flatMap((item) =>
                    Object.keys(item.subjects || {})
                  )
                ),
              ];

              return (
                <tr key={student.student_id}>
                  <td>{student.roll_number ?? "—"}</td>
                  <td>{student.student_name ?? "—"}</td>
                  <td>{student.section ?? "—"}</td>
                  {subjectNames.map((name) => {
                    const result = student.subjects?.[name];
                    return (
                      <td key={name}>
                        {result?.display ??
                          (result?.obtained != null
                            ? `${result.obtained} / ${result.max_marks ?? ""}`
                            : "—")}
                      </td>
                    );
                  })}
                  <td>
                    {student.total_display ??
                      `${student.total_obtained ?? 0} / ${student.total_max_marks ?? 0}`}
                  </td>
                  <td>
                    {student.percentage == null ? "—" : `${student.percentage}%`}
                  </td>
                  <td>{student.rank ?? "—"}</td>
                </tr>
              );
            })
          : consolidatedData.map((item, index) => (
              <tr key={item.student_id ?? index}>
                {Object.entries(item).map(([key, value]) => (
                  <td key={key}>
                    {value == null || value === ""
                      ? "—"
                      : typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)}
                  </td>
                ))}
              </tr>
            ))}
      </tbody>
    </table>
  )}
</div>

        </div>
      )}

    {!consolidatedLoading &&
      consolidatedGenerated &&
      consolidatedData.length === 0 &&
      !consolidatedError && (
        <p>No report data found for the selected filters.</p>
      )}

    {!consolidatedLoading &&
      !consolidatedGenerated &&
      !consolidatedError && (
        <div className="consolidated-empty-state">
          <FileText size={30} />
          <h4>Ready to Generate Report</h4>
          <p>Choose your filters and click Generate Report.</p>
        </div>
      )}
  </section>
)}
    </div>
  );
}
