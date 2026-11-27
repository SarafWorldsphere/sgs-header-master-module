"use client";

import "./AcademicAnalytics.css";

export default function AcademicAnalytics({
  selectedClass,
  setSelectedClass,
  selectedSection,
  setSelectedSection,
  classOptions,
  student,
  setStudent,
  subject,
  setSubject,
  subjects,
}) {
  return (
    <div className="academic-analytics">
      <h3>📊 Academic Analytics</h3>

      <p className="subtitle">
        Select a class, search a student and generate AI-powered insights.
      </p>

      <div className="analytics-filters">
        {/* Class + Section */}
        <div className="field">
          <label>Class</label>

          <select
            value={
              selectedClass && selectedSection
                ? `${selectedClass}|${selectedSection}`
                : ""
            }
            onChange={(e) => {
              const [className, sectionName] =
                e.target.value.split("|");

              setSelectedClass(className || "");
              setSelectedSection(sectionName || "");
            }}
          >
            <option value="">Select Class</option>

            {classOptions?.map((item) => (
              <option
                key={`${item.class_name}|${item.section_name}`}
                value={`${item.class_name}|${item.section_name}`}
              >
                {item.class_name} - {item.section_name}
              </option>
            ))}
          </select>
        </div>

        {/* Roll Number */}
        <div className="field">
          <label>Roll Number</label>

          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter roll number"
            value={student}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              setStudent(value);
            }}
          />
        </div>

        {/* Subject */}
        <div className="field">
          <label>Subject</label>

          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={!selectedClass}
          >
            <option value="All Subjects">All Subjects</option>

            {subjects?.map((subjectName) => (
              <option key={subjectName} value={subjectName}>
                {subjectName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="analytics-placeholder">
        <h4>Ready to Generate</h4>

        <p>
          Enter the student details and click{" "}
          <strong>Generate Report</strong> from the left panel.
        </p>
      </div>
    </div>
  );
}