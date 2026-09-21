"use client";

import { useEffect, useState } from "react";

export default function StudentsSection({
  students = [],
  searchText = "",
  loaded = false,
  onSectionChange,
}) {
  const tabs = [
    ...new Set(
      students
        .filter((student) => student.class_name && student.section_name)
        .map(
          (student) =>
            `${student.class_name} - Section ${student.section_name}`
        )
    ),
  ];

  const [activeSectionTab, setActiveSectionTab] = useState("");

 useEffect(() => {
  if (!activeSectionTab && tabs.length > 0) {
    setActiveSectionTab(tabs[0]);
    onSectionChange?.(tabs[0]);
  }
}, [tabs]);
const filteredStudents = students.filter((student) => {
  const matchesSearch =
    !searchText ||
    student.full_name?.toLowerCase().includes(searchText.toLowerCase()) ||
    student.admission_no?.toLowerCase().includes(searchText.toLowerCase()) ||
    student.class_name?.toLowerCase().includes(searchText.toLowerCase()) ||
    student.section_name?.toLowerCase().includes(searchText.toLowerCase());

  if (searchText) {
    return matchesSearch; // search all students
  }

  return (
    `${student.class_name} - Section ${student.section_name}` === activeSectionTab
  );
});
  return (
    <div className="page-card">
      <div className="page-header">
        <h2>Students Management</h2>
      </div>

      <div className="student-section-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
           onClick={() => {
  setActiveSectionTab(tab);
  onSectionChange?.(tab);
}}
            className={activeSectionTab === tab ? "active-student-tab" : ""}
          >
            {tab}
          </button>
        ))}
      </div>

   <div className="table-scroll-wrapper">
  <table className="table-scroll">
    <thead>
      <tr>
        <th>Admission No</th>
        <th>Name</th>
        <th>Class</th>
        <th>Section</th>
        <th>Roll No</th>
        <th>Parent</th>
        <th>Mobile</th>
        <th>Email</th>
      </tr>
    </thead>

    <tbody>
      {!loaded ? null : filteredStudents.length === 0 ? (
        <tr>
          <td colSpan="7">No students found</td>
        </tr>
      ) : (
        filteredStudents.map((student, index) => (
          <tr key={`${student.student_id}-${index}`}>
            <td>{student.admission_no || "-"}</td>
            <td>{student.full_name || "-"}</td>
            <td>{student.class_name || "-"}</td>
            <td>{student.section_name || "-"}</td>
              <td>{student.roll_no || "-"}</td>
            <td>{student.parent_name || "-"}</td>
            <td>{student.mobile_no || "-"}</td>
            <td>{student.email_id || "-"}</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>
    </div>
  );
}