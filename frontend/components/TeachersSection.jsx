
"use client";

import { useEffect, useMemo, useState } from "react";

export default function TeachersSection({
  teachers = [],
  fetchTeachers,
  fetchSubjects,
}) {
  const [teacherType, setTeacherType] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState(teachers);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterError, setFilterError] = useState("");

  // Load active subjects from backend
  useEffect(() => {
    let cancelled = false;

    const loadSubjects = async () => {
      try {
        const data = await fetchSubjects();

        if (!cancelled) {
          setSubjects(
            (Array.isArray(data) ? data : [])
              .map((item) => item.subject_name)
              .filter(Boolean)
          );
        }
      } catch (error) {
        console.error("Subjects API Error:", error);
        if (!cancelled) {
          setFilterError("Unable to load subjects.");
        }
      }
    };

    loadSubjects();

    return () => {
      cancelled = true;
    };
  }, [fetchSubjects]);

  // Fetch teachers when filters change
  useEffect(() => {
    let cancelled = false;

    const loadTeachers = async () => {
      setFilterLoading(true);
      setFilterError("");

      try {
        const data = await fetchTeachers(
          teacherType,
          teacherType === "subject" ? selectedSubject : ""
        );

        if (!cancelled) {
          setFilteredTeachers(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Filtered Teachers API Error:", error);

        if (!cancelled) {
          setFilterError("Unable to load teachers. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setFilterLoading(false);
        }
      }
    };

    loadTeachers();

    return () => {
      cancelled = true;
    };
  }, [teacherType, selectedSubject, fetchTeachers]);

  const normalizeSubject = (value) =>
    String(value || "")
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const subjectOptions = useMemo(() => {
    return [...new Set(subjects)]
      .sort((a, b) => a.localeCompare(b));
  }, [subjects]);

  const displayedTeachers = useMemo(() => {
    // Use the latest backend result; page.js still applies global search.
    const visibleIds = new Set(
      teachers.map((teacher) => String(teacher.teacher_id))
    );

    return filteredTeachers.filter((teacher) =>
      visibleIds.has(String(teacher.teacher_id))
    );
  }, [filteredTeachers, teachers]);

  const handleTeacherTypeChange = (event) => {
    setTeacherType(event.target.value);
    setSelectedSubject("");
  };

  const handleReset = () => {
    setTeacherType("all");
    setSelectedSubject("");
  };

  return (
    <div className="page-card">
      <div className="page-header">
        <h2>Teachers Management</h2>
      </div>

      <div className="teachers-toolbar">
        <div className="teacher-filter-group">
          <label htmlFor="teacher-type-filter">Teacher Type</label>

          <select
            id="teacher-type-filter"
            value={teacherType}
            onChange={handleTeacherTypeChange}
          >
            <option value="all">All Teachers</option>
            <option value="class">Class Teachers</option>
            <option value="subject">Subject Teachers</option>
          </select>
        </div>

        {teacherType === "subject" && (
          <div className="teacher-filter-group">
            <label htmlFor="teacher-subject-filter">Subject</label>

            <select
              id="teacher-subject-filter"
              value={selectedSubject}
              onChange={(event) => setSelectedSubject(event.target.value)}
            >
              <option value="">All Subjects</option>

              {subjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="teachers-count">
          <strong>
            {filterLoading ? "..." : displayedTeachers.length}
          </strong>
          <span>Teachers</span>
        </div>

        {(teacherType !== "all" || selectedSubject) && (
          <button
            type="button"
            className="teacher-reset-btn"
            onClick={handleReset}
          >
            Reset
          </button>
        )}
      </div>

      {filterError && (
        <p role="alert">{filterError}</p>
      )}

      <div className="table-scroll-wrapper">
        <table>
          <thead>
            <tr>
              <th>Teacher ID</th>
              <th>Name</th>
              <th>Subject</th>
              <th>Role</th>
              <th>Section 1</th>
              <th>Section 2</th>
              <th>Email</th>
              <th>Phone</th>
            </tr>
          </thead>

          <tbody>
            {filterLoading ? (
              <tr>
                <td colSpan="8">Loading teachers...</td>
              </tr>
            ) : displayedTeachers.length === 0 ? (
              <tr>
                <td colSpan="8">No teachers found</td>
              </tr>
            ) : (
              displayedTeachers.map((teacher) => (
                <tr key={teacher.teacher_id}>
                  <td>{teacher.teacher_id}</td>
                  <td>{teacher.full_name || "-"}</td>
                  <td>{teacher.subject_name || "-"}</td>
                  <td>{teacher.role || "-"}</td>
                  <td>{teacher.section_1 || "-"}</td>
                  <td>{teacher.section_2 || "-"}</td>
                  <td>{teacher.email_id || "-"}</td>
                  <td>{teacher.phone || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
