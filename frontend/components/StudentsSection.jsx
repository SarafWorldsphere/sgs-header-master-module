"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function StudentsSection({
  students = [],
  searchText = "",
  loaded = false,
  onSectionChange,
}) {
  const [activeSectionTab, setActiveSectionTab] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showView, setShowView] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);

  const tabs = [
    ...new Set(
      students
        .filter(
          (student) => student.class_name && student.section_name
        )
        .map(
          (student) =>
            `${student.class_name} - Section ${student.section_name}`
        )
    ),
  ];

  useEffect(() => {
    if (!activeSectionTab && tabs.length > 0) {
      setActiveSectionTab(tabs[0]);
      onSectionChange?.(tabs[0]);
    }
  }, [tabs, activeSectionTab, onSectionChange]);

  // ================= VIEW STUDENT =================
  const handleViewStudent = async (studentId) => {
    console.log("VIEW CLICKED:", studentId);

    try {
      setViewLoading(true);
      setSelectedStudent(null);
      setShowView(true);

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

      console.log("API BASE URL:", apiBaseUrl);

      const url = `${apiBaseUrl}/students/${studentId}`;

      console.log("VIEW API URL:", url);

      const response = await fetch(url);

      console.log("VIEW API STATUS:", response.status);

      if (!response.ok) {
        const errorText = await response.text();

        console.error("VIEW API ERROR RESPONSE:", errorText);

        throw new Error(
          `Failed to fetch student details: ${response.status}`
        );
      }

      const data = await response.json();

      console.log("VIEW API DATA:", data);

      setSelectedStudent(data);
    } catch (error) {
      console.error("Student details error:", error);

      setShowView(false);
      setSelectedStudent(null);

      alert("Unable to load student details.");
    } finally {
      setViewLoading(false);
    }
  };

  // ================= CLOSE VIEW =================
  const closeStudentView = () => {
    setShowView(false);
    setSelectedStudent(null);
  };

  // ================= FILTER STUDENTS =================
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      !searchText ||
      student.full_name
        ?.toLowerCase()
        .includes(searchText.toLowerCase()) ||
      student.admission_no
        ?.toLowerCase()
        .includes(searchText.toLowerCase()) ||
      student.class_name
        ?.toLowerCase()
        .includes(searchText.toLowerCase()) ||
      student.section_name
        ?.toLowerCase()
        .includes(searchText.toLowerCase());

    if (searchText) {
      return matchesSearch;
    }

    return (
      `${student.class_name} - Section ${student.section_name}` ===
      activeSectionTab
    );
  });

  // ================= PARENT DATA =================
  const parentRecords =
    selectedStudent?.parents?.filter(
      (parent) => parent.relationship_type === "parent"
    ) || [];

  const guardian =
    selectedStudent?.parents?.find(
      (parent) => parent.relationship_type === "guardian"
    ) || null;

  return (
    <div className="page-card">
      <div className="page-header">
        <h2>Students Management</h2>
      </div>

      {/* ================= SECTION TABS ================= */}
      <div className="student-section-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveSectionTab(tab);
              onSectionChange?.(tab);
            }}
            className={
              activeSectionTab === tab
                ? "active-student-tab"
                : ""
            }
          >
            {tab}
          </button>
        ))}
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
            {!loaded ? (
              <tr>
                <td colSpan="6">Loading...</td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="6">No students found</td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.student_id}>
                  <td>{student.admission_no || "-"}</td>

                  <td>{student.full_name || "-"}</td>

                  <td>{student.class_name || "-"}</td>

                  <td>{student.section_name || "-"}</td>

                  <td>{student.roll_no || "-"}</td>

                  <td>
                    <button
  type="button"
  className="student-view-btn"
  onClick={() => handleViewStudent(student.student_id)}
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
        if (e.target === e.currentTarget) {
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
              <h3>Student Information</h3>

              <p>
                <strong>Admission No:</strong>{" "}
                {selectedStudent.student?.admission_no || "-"}
              </p>

              <p>
                <strong>Name:</strong>{" "}
                {selectedStudent.student?.full_name || "-"}
              </p>

              <p>
                <strong>Class:</strong>{" "}
                {selectedStudent.student?.class_name || "-"}
              </p>

              <p>
                <strong>Section:</strong>{" "}
                {selectedStudent.student?.section_name || "-"}
              </p>

              <p>
                <strong>Roll No:</strong>{" "}
                {selectedStudent.student?.roll_no || "-"}
              </p>

              <p>
                <strong>Student Phone:</strong>{" "}
                {selectedStudent.student?.student_phone || "-"}
              </p>

              <p>
                <strong>Student Email:</strong>{" "}
                {selectedStudent.student?.email_id || "-"}
              </p>
            </div>

            {/* PARENT 1 */}
            <div className="parent-details">
              <h3>Parent 1</h3>

              {parentRecords[0] ? (
                <>
                  <p>
                    <strong>Name:</strong>{" "}
                    {parentRecords[0].full_name || "-"}
                  </p>

                  <p>
                    <strong>Phone:</strong>{" "}
                    {parentRecords[0].phone || "-"}
                  </p>

                  <p>
                    <strong>Email:</strong>{" "}
                    {parentRecords[0].email || "-"}
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
                    {parentRecords[1].full_name || "-"}
                  </p>

                  <p>
                    <strong>Phone:</strong>{" "}
                    {parentRecords[1].phone || "-"}
                  </p>

                  <p>
                    <strong>Email:</strong>{" "}
                    {parentRecords[1].email || "-"}
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
                    {guardian.full_name || "-"}
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