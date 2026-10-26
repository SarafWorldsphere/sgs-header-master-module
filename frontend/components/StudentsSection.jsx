"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search, Mic } from "lucide-react";
import useVoice from "../hooks/useVoice";
import styles from "../app/styles/students.module.css";
export default function StudentsSection({
  students = [],
  searchText = "",
  setSearchText = () => {},
  loaded = false,
}) {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
const [classMaster, setClassMaster] = useState([]);
const [classesLoading, setClassesLoading] = useState(false);


const { listening, startVoice } = useVoice();

const handleVoiceInput = () => {
  startVoice((text) => {
    setSearchText(text);
  });
};

const [filteredApiStudents, setFilteredApiStudents] = useState(students);
const [studentsLoading, setStudentsLoading] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showView, setShowView] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
// ===================== LOAD CLASS MASTER =====================
useEffect(() => {
  const fetchClasses = async () => {
    try {
      setClassesLoading(true);

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

      const response = await fetch(`${apiBaseUrl}/students/classes`);

      if (!response.ok) {
        throw new Error(`Failed to load classes: ${response.status}`);
      }

      const data = await response.json();
      setClassMaster(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading class master:", error);
      setClassMaster([]);
    } finally {
      setClassesLoading(false);
    }
  };

  fetchClasses();
}, []);

// ===================== CLASS OPTIONS =====================
const classOptions = useMemo(() => {
  return [
    ...new Set(
      classMaster
        .map((item) => item.class_name?.trim())
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}, [classMaster]);
 // ===================== SECTION OPTIONS =====================
const sectionOptions = useMemo(() => {
  return [
    ...new Set(
      classMaster
        .filter(
          (item) =>
            !selectedClass ||
            item.class_name?.trim() === selectedClass
        )
        .map((item) => item.section_name?.trim())
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}, [classMaster, selectedClass]);
// ===================== FETCH FILTERED STUDENTS FROM BACKEND =====================
useEffect(() => {
  let cancelled = false;

  const fetchFilteredStudents = async () => {
    // No filters: use the students already loaded by page.js
    if (!selectedClass && !selectedSection) {
      setFilteredApiStudents(students);
      return;
    }

    try {
      setStudentsLoading(true);

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const params = new URLSearchParams();

      if (selectedClass) {
        params.set("class_name", selectedClass);
      }

      if (selectedSection) {
        params.set("section", selectedSection);
      }

      const response = await fetch(
        `${apiBaseUrl}/students/?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Students API failed: ${response.status}`);
      }

      const data = await response.json();

      if (!cancelled) {
        setFilteredApiStudents(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Filtered Students API Error:", error);
    } finally {
      if (!cancelled) {
        setStudentsLoading(false);
      }
    }
  };

  fetchFilteredStudents();

  return () => {
    cancelled = true;
  };
}, [selectedClass, selectedSection, students]);
  // ===================== FILTER STUDENTS =====================
const filteredStudents = useMemo(() => {
  const search = searchText.trim().toLowerCase();

  return filteredApiStudents.filter((student) => {
    const matchesSearch =
      !search ||
      String(student.full_name ?? "").toLowerCase().includes(search) ||
      String(student.admission_no ?? "").toLowerCase().includes(search) ||
      String(student.roll_no ?? "").toLowerCase().includes(search) ||
      String(student.class_name ?? "").toLowerCase().includes(search) ||
      String(student.section_name ?? "").toLowerCase().includes(search);

    return matchesSearch;
  });
}, [filteredApiStudents, searchText]);
  // ===================== VIEW STUDENT =====================
  const handleViewStudent = async (studentId) => {
    console.log("VIEW CLICKED:", studentId);

    try {
      setViewLoading(true);
      setSelectedStudent(null);
      setShowView(true);

      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL;

      console.log("API BASE URL:", apiBaseUrl);

      const url = `${apiBaseUrl}/students/${studentId}`;

      console.log("VIEW API URL:", url);

      const response = await fetch(url);

      console.log(
        "VIEW API STATUS:",
        response.status
      );

      if (!response.ok) {
        const errorText = await response.text();

        console.error(
          "VIEW API ERROR RESPONSE:",
          errorText
        );

        throw new Error(
          `Failed to fetch student details: ${response.status}`
        );
      }

      const data = await response.json();

      console.log("VIEW API DATA:", data);

      setSelectedStudent(data);
    } catch (error) {
      console.error(
        "Student details error:",
        error
      );

      setShowView(false);
      setSelectedStudent(null);

      alert("Unable to load student details.");
    } finally {
      setViewLoading(false);
    }
  };

  // ===================== CLOSE VIEW =====================
  const closeStudentView = () => {
    setShowView(false);
    setSelectedStudent(null);
  };

  // ===================== PARENT DATA =====================
  const parentRecords =
    selectedStudent?.parents?.filter(
      (parent) =>
        parent.relationship_type === "parent"
    ) || [];

  const guardian =
    selectedStudent?.parents?.find(
      (parent) =>
        parent.relationship_type === "guardian"
    ) || null;

  return (
    <div className="page-card">
      <div className="page-header">
        <h2>Students Management</h2>
      </div>

      {/* ================= MODERN FILTER TOOLBAR ================= */}
      <div className="students-toolbar">
        <div className="students-toolbar-left">
          {/* CLASS FILTER */}
          <div className="student-filter">
            <label htmlFor="student-class-filter">
              Class
            </label>

            <select
              id="student-class-filter"
              value={selectedClass}
              onChange={(e) => {
                const value = e.target.value;

                setSelectedClass(value);
                setSelectedSection("");
              }}
            >
              <option value="">
  {classesLoading ? "Loading Classes..." : "All Classes"}
</option>

              {classOptions.map((className) => (
                <option
                  key={className}
                  value={className}
                >
                  {className}
                </option>
              ))}
            </select>
          </div>

          {/* SECTION FILTER */}
          <div className="student-filter">
            <label htmlFor="student-section-filter">
              Section
            </label>

            <select
              id="student-section-filter"
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
              }}
            >
              <option value="">
                All Sections
              </option>

              {sectionOptions.map((section) => (
                <option
                  key={section}
                  value={section}
                >
                  Section {section}
                </option>
              ))}
            </select>
          </div>
        <div className={styles.studentSearch}>
  <label htmlFor="student-search">Search Students</label>

  <div className={styles.studentSearchBox}>
    <Search size={18} aria-hidden="true" />

    <input
      id="student-search"
      type="search"
      value={searchText}
      onChange={(event) => setSearchText(event.target.value)}
      placeholder="Name, admission no. or roll no."
      aria-label="Search by name, admission number or roll number"
    />

    <button
      type="button"
      className={
        listening ? styles.micButtonActive : styles.micButton
      }
      onClick={handleVoiceInput}
      aria-label="Search using voice"
      title="Voice search"
    >
      <Mic size={18} />
    </button>
  </div>
</div>

          {/* RESET BUTTON */}
          {(selectedClass || selectedSection) && (
            <button
              type="button"
              className="clear-filter-btn"
              onClick={() => {
                setSelectedClass("");
                setSelectedSection("");
              }}
              aria-label="Reset student filters"
            >
              Reset
            </button>
          )}
        </div>

        {/* STUDENT COUNT */}
        <div className="students-count">
          <span className="count-number">
            {filteredStudents.length}
          </span>
          <span>
            {filteredStudents.length === 1
              ? "Student"
              : "Students"}
          </span>
        </div>
      </div>

      {/* ================= STUDENTS TABLE ================= */}
      <div className="table-scroll-wrapper">
        <table className="table-scroll">
          <thead>
            <tr>
              <th>Admission No</th>
              <th>Name</th>
              <th>Class</th>
              <th>Section</th>
              <th>Roll No</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {!loaded || studentsLoading ? (
              <tr>
                <td colSpan="6">
                  Loading...
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="6">
                  No students found
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.student_id}>
                  <td>
                    {student.admission_no || "-"}
                  </td>

                  <td>
                    {student.full_name || "-"}
                  </td>

                  <td>
                    {student.class_name || "-"}
                  </td>

                  <td>
                    {student.section_name || "-"}
                  </td>

                  <td>
                    {student.roll_no || "-"}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="student-view-btn"
                      onClick={() =>
                        handleViewStudent(
                          student.student_id
                        )
                      }
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ================= VIEW STUDENT MODAL ================= */}
      {showView &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="student-view-overlay"
            onClick={(e) => {
              if (
                e.target === e.currentTarget
              ) {
                closeStudentView();
              }
            }}
          >
            <div className="student-view-modal">
              {/* HEADER */}
              <div className="student-view-header">
                <h2>Student Details</h2>

                <button
                  type="button"
                  onClick={closeStudentView}
                >
                  ×
                </button>
              </div>

              {/* LOADING */}
              {viewLoading && (
                <div className="student-view-loading">
                  Loading student details...
                </div>
              )}

              {/* DATA */}
              {!viewLoading && selectedStudent && (
                <>
                  {/* STUDENT INFORMATION */}
                  <div className="student-basic-details">
                    <h3>
                      Student Information
                    </h3>

                    <p>
                      <strong>
                        Admission No:
                      </strong>{" "}
                      {selectedStudent.student
                        ?.admission_no || "-"}
                    </p>

                    <p>
                      <strong>Name:</strong>{" "}
                      {selectedStudent.student
                        ?.full_name || "-"}
                    </p>

                    <p>
                      <strong>Class:</strong>{" "}
                      {selectedStudent.student
                        ?.class_name || "-"}
                    </p>

                    <p>
                      <strong>Section:</strong>{" "}
                      {selectedStudent.student
                        ?.section_name || "-"}
                    </p>

                    <p>
                      <strong>Roll No:</strong>{" "}
                      {selectedStudent.student
                        ?.roll_no || "-"}
                    </p>

                    <p>
                      <strong>
                        Student Phone:
                      </strong>{" "}
                      {selectedStudent.student
                        ?.student_phone || "-"}
                    </p>

                    <p>
                      <strong>
                        Student Email:
                      </strong>{" "}
                      {selectedStudent.student
                        ?.email_id || "-"}
                    </p>
                  </div>

                  {/* PARENT 1 */}
                  <div className="parent-details">
                    <h3>Parent 1</h3>

                    {parentRecords[0] ? (
                      <>
                        <p>
                          <strong>Name:</strong>{" "}
                          {parentRecords[0]
                            .full_name || "-"}
                        </p>

                        <p>
                          <strong>Phone:</strong>{" "}
                          {parentRecords[0].phone ||
                            "-"}
                        </p>

                        <p>
                          <strong>Email:</strong>{" "}
                          {parentRecords[0].email ||
                            "-"}
                        </p>
                      </>
                    ) : (
                      <p>No data available</p>
                    )}
                  </div>

                  {/* PARENT 2 */}
                  <div className="parent-details">
                    <h3>Parent 2</h3>

                    {parentRecords[1] ? (
                      <>
                        <p>
                          <strong>Name:</strong>{" "}
                          {parentRecords[1]
                            .full_name || "-"}
                        </p>

                        <p>
                          <strong>Phone:</strong>{" "}
                          {parentRecords[1].phone ||
                            "-"}
                        </p>

                        <p>
                          <strong>Email:</strong>{" "}
                          {parentRecords[1].email ||
                            "-"}
                        </p>
                      </>
                    ) : (
                      <p>No data available</p>
                    )}
                  </div>

                  {/* GUARDIAN */}
                  <div className="parent-details">
                    <h3>Guardian</h3>

                    {guardian ? (
                      <>
                        <p>
                          <strong>Name:</strong>{" "}
                          {guardian.full_name ||
                            "-"}
                        </p>

                        <p>
                          <strong>Phone:</strong>{" "}
                          {guardian.phone || "-"}
                        </p>

                        <p>
                          <strong>Email:</strong>{" "}
                          {guardian.email || "-"}
                        </p>
                      </>
                    ) : (
                      <p>No data available</p>
                    )}
                  </div>

                  {/* CLOSE */}
                  <button
                    type="button"
                    onClick={closeStudentView}
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
