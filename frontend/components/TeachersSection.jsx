
"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";

export default function TeachersSection({
  teachers = [],
  loaded = false,
  loading = false,
  error = "",
  fetchTeachers,
  fetchSubjects,
  fetchTeacherFilters,
}) {
  const [teacherType, setTeacherType] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [subjectsLoaded, setSubjectsLoaded] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  const [teacherTypes, setTeacherTypes] = useState([]);
  const [optionsError, setOptionsError] = useState("");

  const [filteredTeachers, setFilteredTeachers] = useState(teachers);
  const [searchText, setSearchText] = useState("");

  const [filterLoading, setFilterLoading] = useState(false);
  const [filterError, setFilterError] = useState("");

  // ==========================================
  // SYNC INITIAL TEACHERS FROM PAGE
  // ==========================================
  useEffect(() => {
    if (teacherType === "all" && !selectedSubject) {
      setFilteredTeachers(teachers);
    }
  }, [teachers, teacherType, selectedSubject]);

  // ==========================================
  // LOAD TEACHER FILTER OPTIONS
  // ==========================================
  useEffect(() => {
    const controller = new AbortController();

    const loadTeacherTypes = async () => {
      try {
        setOptionsError("");

        const data = await fetchTeacherFilters(
          controller.signal
        );

        if (!controller.signal.aborted) {
          setTeacherTypes(
            Array.isArray(data) ? data : []
          );
        }
      } catch (error) {
        if (
          controller.signal.aborted ||
          axios.isCancel(error)
        ) {
          return;
        }

        console.error("Teacher Filters API Error:", error);

        setOptionsError(
          error.response?.data?.detail ||
            error.message ||
            "Unable to load teacher filter options."
        );
      }
    };

    loadTeacherTypes();

    return () => {
      controller.abort();
    };
  }, [fetchTeacherFilters]);

  // ==========================================
  // LOAD SUBJECTS ONLY WHEN SUBJECT FILTER
  // IS SELECTED
  // ==========================================
  useEffect(() => {
    if (teacherType !== "subject" || subjectsLoaded) {
      return;
    }

    const controller = new AbortController();

    const loadSubjects = async () => {
      try {
        setSubjectsLoading(true);
        setFilterError("");

        const data = await fetchSubjects(
          controller.signal
        );

        if (controller.signal.aborted) return;

        const subjectNames = data
          .map((item) =>
            typeof item === "string"
              ? item
              : item?.subject_name
          )
          .filter(Boolean);

        setSubjects(subjectNames);
        setSubjectsLoaded(true);
      } catch (error) {
        if (
          controller.signal.aborted ||
          axios.isCancel(error)
        ) {
          return;
        }

        console.error("Teacher Subjects API Error:", error);

        setFilterError(
          error.response?.data?.detail ||
            error.message ||
            "Unable to load subjects."
        );
      } finally {
        if (!controller.signal.aborted) {
          setSubjectsLoading(false);
        }
      }
    };

    loadSubjects();

    return () => {
      controller.abort();
    };
  }, [teacherType, subjectsLoaded, fetchSubjects]);

  // ==========================================
  // FETCH FILTERED TEACHERS
  // ==========================================
  useEffect(() => {
    if (teacherType === "all" && !selectedSubject) {
      setFilteredTeachers(teachers);
      setFilterError("");
      setFilterLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadFilteredTeachers = async () => {
      try {
        setFilterLoading(true);
        setFilterError("");

        const data = await fetchTeachers(
          teacherType,
          teacherType === "subject" ? selectedSubject : "",
          controller.signal
        );

        if (!controller.signal.aborted) {
          setFilteredTeachers(
            Array.isArray(data) ? data : []
          );
        }
      } catch (error) {
        if (
          controller.signal.aborted ||
          axios.isCancel(error)
        ) {
          return;
        }

        console.error("Filtered Teachers API Error:", error);

        setFilterError(
          error.response?.data?.detail ||
            error.message ||
            "Unable to load filtered teachers."
        );
      } finally {
        if (!controller.signal.aborted) {
          setFilterLoading(false);
        }
      }
    };

    loadFilteredTeachers();

    return () => {
      controller.abort();
    };
  }, [
    teacherType,
    selectedSubject,
    fetchTeachers,
    teachers,
  ]);

  // ==========================================
  // SUBJECT DROPDOWN OPTIONS
  // ==========================================
  const subjectOptions = useMemo(
    () =>
      [...new Set(subjects)].sort((a, b) =>
        a.localeCompare(b)
      ),
    [subjects]
  );

  // ==========================================
  // READ TEACHER ASSIGNMENTS
  // ==========================================
  const getAssignments = (teacher) => {
    let assignments = teacher.assignments || [];

    if (typeof assignments === "string") {
      try {
        assignments = JSON.parse(assignments);
      } catch {
        assignments = [];
      }
    }

    return Array.isArray(assignments) ? assignments : [];
  };

  // ==========================================
  // GROUP ASSIGNMENTS BY CLASS AND SECTION
  // ==========================================
  const getGroupedAssignments = (teacher) => {
    const assignments = getAssignments(teacher);
    const groups = new Map();

    assignments.forEach((item) => {
      const key = `${item.class_id ?? ""}-${item.class_name ?? ""}-${item.section ?? ""}`;

      if (!groups.has(key)) {
        groups.set(key, {
          className:
            item.class_name ||
            (item.class_id
              ? `Class ${item.class_id}`
              : "Class -"),
          section: item.section || "",
          subjects: new Set(),
          isClassTeacher: false,
        });
      }

      const group = groups.get(key);

      if (item.subject_name) {
        group.subjects.add(item.subject_name.trim());
      }

      if (item.is_class_teacher) {
        group.isClassTeacher = true;
      }
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      subjects: Array.from(group.subjects),
    }));
  };

  // ==========================================
  // SEARCH TEACHERS AND ASSIGNMENTS
  // ==========================================
  const displayedTeachers = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    if (!search) return filteredTeachers;

    return filteredTeachers.filter((teacher) => {
      const assignments = getGroupedAssignments(teacher);

      const teacherText = [
        teacher.full_name,
        teacher.role,
        teacher.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const assignmentText = assignments
        .map((item) =>
          [
            item.className,
            item.section,
            item.subjects.join(" "),
            item.isClassTeacher ? "class teacher" : "",
          ].join(" ")
        )
        .join(" ")
        .toLowerCase();

      return (
        teacherText.includes(search) ||
        assignmentText.includes(search)
      );
    });
  }, [filteredTeachers, searchText]);

  // ==========================================
  // TEACHER TYPE CHANGE
  // ==========================================
  const handleTeacherTypeChange = (event) => {
    setTeacherType(event.target.value);
    setSelectedSubject("");
    setFilterError("");
  };

  // ==========================================
  // RESET FILTERS
  // ==========================================
  const handleReset = () => {
    setTeacherType("all");
    setSelectedSubject("");
    setSearchText("");
    setFilterError("");
  };

  // ==========================================
  // UI
  // ==========================================
  return (
    <div className="page-card teachers-page">
      <div className="page-header">
        <h2>Teachers Management</h2>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="teachers-toolbar">
        <div className="teacher-filter-group">
          <label htmlFor="teacher-type-filter">
            Teacher Type
          </label>

          <select
            id="teacher-type-filter"
            value={teacherType}
            onChange={handleTeacherTypeChange}
          >
            {teacherTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {teacherType === "subject" && (
          <div className="teacher-filter-group">
            <label htmlFor="teacher-subject-filter">
              Subject
            </label>

            <select
              id="teacher-subject-filter"
              value={selectedSubject}
              disabled={subjectsLoading}
              onChange={(event) =>
                setSelectedSubject(event.target.value)
              }
            >
              <option value="">
                {subjectsLoading
                  ? "Loading subjects..."
                  : "All Subjects"}
              </option>

              {subjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="teacher-filter-group teacher-search-group">
          <label htmlFor="teacher-search">
            Search
          </label>

          <input
            id="teacher-search"
            type="search"
            placeholder="Search name, class, section, subject, phone..."
            value={searchText}
            onChange={(event) =>
              setSearchText(event.target.value)
            }
          />
        </div>

        <div className="teachers-count">
          <strong>
            {loading || filterLoading
              ? "..."
              : displayedTeachers.length}
          </strong>
          <span>Teachers</span>
        </div>

        {(teacherType !== "all" ||
          selectedSubject ||
          searchText) && (
          <button
            type="button"
            className="teacher-reset-btn"
            onClick={handleReset}
          >
            Reset
          </button>
        )}
      </div>

      {/* FILTER OPTION ERROR */}
      {optionsError && (
        <p className="teacher-filter-error" role="alert">
          {optionsError}
        </p>
      )}

      {/* INITIAL TEACHER API ERROR */}
      {error && (
        <p className="teacher-filter-error" role="alert">
          {error}
        </p>
      )}

      {/* FILTER API ERROR */}
      {filterError && (
        <p className="teacher-filter-error" role="alert">
          {filterError}
        </p>
      )}

      {/* TEACHERS TABLE */}
      <div className="table-scroll-wrapper">
        <table className="teachers-table">
          <thead>
            <tr>
              <th>Teacher ID</th>
              <th>Teacher Name</th>
              <th>Role</th>
              <th>Assigned Classes & Subjects</th>
              <th>Phone Number</th>
            </tr>
          </thead>

          <tbody>
            {loading || filterLoading ? (
              <tr>
                <td colSpan={5}>
                  Loading teachers...
                </td>
              </tr>
            ) : error && teacherType === "all" ? (
              <tr>
                <td colSpan={5}>
                  Unable to load teachers.
                </td>
              </tr>
            ) : displayedTeachers.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  No teachers found
                </td>
              </tr>
            ) : (
              displayedTeachers.map((teacher) => {
                const assignments =
                  getGroupedAssignments(teacher);

                return (
                  <tr key={teacher.teacher_id}>
                    <td>{teacher.teacher_id ?? "-"}</td>

                    <td className="teacher-name-cell">
                      {teacher.full_name || "-"}
                    </td>

                    <td>{teacher.role || "-"}</td>

                    <td>
                      {assignments.length > 0 ? (
                        <div className="teacher-assignment-list">
                          {assignments.map((item, index) => (
                            <div
                              className="teacher-assignment-line"
                              key={`${teacher.teacher_id}-${item.className}-${item.section}-${index}`}
                            >
                              <strong>{item.className}</strong>

                              {item.section && (
                                <span>
                                  {" "}
                                  - Section {item.section}
                                </span>
                              )}

                              {item.subjects.length > 0 && (
                                <span className="teacher-subjects">
                                  {" : "}
                                  {item.subjects.join(", ")}
                                </span>
                              )}

                              {item.isClassTeacher && (
                                <span className="class-teacher-label">
                                  {" "}(Class Teacher)
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="no-assignment">
                          No assignments
                        </span>
                      )}
                    </td>

                    <td className="teacher-phone-cell">
                      {teacher.phone || "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
