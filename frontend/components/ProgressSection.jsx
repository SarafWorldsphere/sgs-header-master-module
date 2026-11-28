"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ProgressSection({ progressData = [] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlClass = searchParams.get("class") || "";
  const urlStudent = searchParams.get("student") || "";

  // -------- UPDATE URL ----------
  const updateURL = (cls, student) => {
    const params = new URLSearchParams();

    if (cls) params.set("class", cls);
    if (student) params.set("student", student);

    router.push(`?${params.toString()}`);
  };

  // -------- CLASS LIST ----------
  const classTabs = useMemo(() => {
    return [
      ...new Set(
        progressData.map(
          (item) => `${item.class_name} - Section ${item.section_name}`
        )
      ),
    ];
  }, [progressData]);

  // -------- CLASS DATA ----------
  const classData = progressData.filter(
    (item) =>
      `${item.class_name} - Section ${item.section_name}` === urlClass
  );

  // -------- STUDENTS ----------
  const students = [
    ...new Map(
      classData.map((item) => [item.student_id || item.full_name, item])
    ).values(),
  ];

  // -------- SELECTED STUDENT ----------
  const selectedStudent = students.find(
    (s) => String(s.student_id || s.full_name) === urlStudent
  );

  const studentRecords = selectedStudent
    ? classData.filter(
        (item) =>
          item.student_id === selectedStudent.student_id ||
          item.full_name === selectedStudent.full_name
      )
    : [];

  // -------- HELPERS ----------
  const getAverage = () => {
    if (!studentRecords.length) return "0.00";
    const total = studentRecords.reduce(
      (sum, i) => sum + Number(i.percentage || 0),
      0
    );
    return (total / studentRecords.length).toFixed(2);
  };

  const getBestSubject = () => {
    const map = {};

    studentRecords.forEach((i) => {
      if (!i.subject_name) return;
      if (!map[i.subject_name]) map[i.subject_name] = { t: 0, c: 0 };

      map[i.subject_name].t += Number(i.percentage || 0);
      map[i.subject_name].c += 1;
    });

    let best = "-";
    let bestAvg = -1;

    Object.entries(map).forEach(([sub, d]) => {
      const avg = d.t / d.c;
      if (avg > bestAvg) {
        bestAvg = avg;
        best = sub;
      }
    });

    return best;
  };

  const getMarks = (subject, exam) => {
    const record = studentRecords.find(
      (i) => i.subject_name === subject && i.exam_name === exam
    );
    return record?.marks_obtained ?? "-";
  };

  const examNames = [
    ...new Set(studentRecords.map((i) => i.exam_name).filter(Boolean)),
  ];

  const subjects = [
    ...new Set(studentRecords.map((i) => i.subject_name).filter(Boolean)),
  ];

  // ================= UI =================
  return (
    <div className="page-card">
      <div className="page-header">
        <h2>Student Progress</h2>
      </div>

      {/* -------- BREADCRUMB -------- */}
      <div className="progress-breadcrumb">
        Progress

        {urlClass && (
          <>
            <span>›</span>
            <button onClick={() => updateURL("", "")}>
              {urlClass}
            </button>
          </>
        )}

        {selectedStudent && (
          <>
            <span>›</span>
            <strong>{selectedStudent.full_name}</strong>
          </>
        )}
      </div>

      {/* -------- CLASS GRID -------- */}
      {!urlClass && (
        <div className="progress-class-grid">
          {classTabs.map((className) => (
            <button
              key={className}
              className="progress-class-card"
              onClick={() => updateURL(className, "")}
            >
              {className}
            </button>
          ))}
        </div>
      )}

      {/* -------- STUDENT LIST -------- */}
      {urlClass && !urlStudent && (
        <>
          <h3 className="progress-subtitle">
            {urlClass} • {students.length} Students
          </h3>
<div className="table-scroll-wrapper">
          <table>
            <tbody>
              {students.map((student) => {
                const key = String(student.student_id || student.full_name);

                return (
                  <tr
                    key={key}
                    className="clickable-row"
                    onClick={() => updateURL(urlClass, key)}
                  >
                    <td>{student.roll_no || "-"}</td>
                    <td>{student.full_name || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </>
      )}

      {/* -------- STUDENT DETAILS -------- */}
      {selectedStudent && (
    <>
     <div className="progress-summary-grid">
      <div className="progress-summary-card">
        <span>Student</span>
        <strong>{selectedStudent.full_name || "-"}</strong>
      </div>

      <div className="progress-summary-card">
        <span>Overall Performance</span>
        <strong>{getAverage()}%</strong>
      </div>

      <div className="progress-summary-card">
        <span>Best Subject</span>
        <strong>{getBestSubject()}</strong>
      </div>

      <div className="progress-summary-card">
        <span>Exams Taken</span>
        <strong>{examNames.length}</strong>
      </div>
    </div>

   <div className="table-scroll-wrapper">
      <table>
        <thead>
          <tr>
            <th>Subject</th>
            {examNames.map((e) => (
              <th key={e}>{e}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {subjects.map((sub) => (
            <tr key={sub}>
              <td>{sub}</td>
              {examNames.map((ex) => (
                <td key={`${sub}-${ex}`}>
                  {getMarks(sub, ex)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
   </> 
   )}
    </div>
  );
}