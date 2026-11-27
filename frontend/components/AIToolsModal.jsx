"use client";

import "./AIToolsModal.css";
import AcademicAnalytics from "./AcademicAnalytics";
import ReportPanel from "./ReportPanel";
import { useState, useEffect } from "react";
import axios from "axios";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
];

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
});

export default function AIToolsModal({
  open,
  onClose,
  headmaster,
  students = [],
}) {
  // =======================
  // ALL HOOKS FIRST (FIX)
  // =======================
  
  const [selectedReport, setSelectedReport] = useState("");
  const [report, setReport] = useState("");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);

 const [student, setStudent] = useState("");
const [subject, setSubject] = useState("All Subjects");
const [selectedClass, setSelectedClass] = useState("");
const [selectedSection, setSelectedSection] = useState("");
const [subjects, setSubjects] = useState([]);

const classOptions = [
  ...new Map(
    students
      .filter(
        (student) => student.class_name && student.section_name
      )
      .map((student) => [
        `${student.class_name}|${student.section_name}`,
        {
          class_name: student.class_name,
          section_name: student.section_name,
        },
      ])
  ).values(),
];

useEffect(() => {
  const fetchSubjects = async () => {
    if (!selectedClass) {
      setSubjects([]);
      return;
    }

    try {
      const res = await api.get(
        `/headmaster/academic-analytics/subjects?class_name=${encodeURIComponent(
          selectedClass
        )}`
      );

      setSubjects(res.data.subjects || []);
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
      setSubjects([]);
    }
  };

  fetchSubjects();
}, [selectedClass]);

  const [language, setLanguage] = useState("English");
  const [originalReport, setOriginalReport] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  // NOW SAFE CONDITIONAL RETURN
  if (!open) return null;

  const generateReport = async () => {
    if (!selectedReport) {
      alert("Please select a report.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        user_info: {
          name: headmaster?.name || "",
          email: headmaster?.email || "",
          role: "Headmaster",
        },
      };

      if (selectedReport === "assignment") {
        const res = await api.post("/headmaster/assignment-report", payload);
        setOriginalReport(res.data.report);
        setReport(res.data.report);
        setAnalyticsData(null);
        setLanguage("English");
      } 
      else if (selectedReport === "teacher") {
        const res = await api.post("/headmaster/teacher-performance", payload);
        setOriginalReport(res.data.report);
        setReport(res.data.report);
        setAnalyticsData(null);
        setLanguage("English");
      } 
      else if (selectedReport === "analytics") {
        if (!student.trim()) {
         alert("Please enter student name.");
          setLoading(false);
          return;
        }

const res = await api.post("/headmaster/academic-analytics", {
  roll_no: student.trim(),
  target_type: "student",
  class_name: selectedClass,
  section_name: selectedSection,
  subject_name: subject,
  scope: subject === "All Subjects" ? "all_subjects" : "single_subject",
  user_info: payload.user_info,
});

      setAnalyticsData(res.data);setOriginalReport(
  JSON.stringify({
    trend: res.data.trend,
    strengths: res.data.strengths,
    weaknesses: res.data.weaknesses,
    recommendations: res.data.recommendations,
  })
);

setReport("");
      }
    } catch (err) {
      console.error(err);
      setReport("Failed to generatae report.");
    } finally {
      setLoading(false);
    }
  };
const translateContent = async (selectedLanguage) => {
  try {
    // Restore original English
    if (selectedLanguage === "English") {
      if (selectedReport === "analytics") {
        setAnalyticsData((prev) => ({
          ...prev,
          analysis: JSON.parse(originalReport),
        }));
      } else {
        setReport(originalReport);
      }
      return;
    }

    setIsTranslating(true);

    let textToTranslate = "";

    if (selectedReport === "analytics") {
     if (!analyticsData?.analysis) return;

textToTranslate = JSON.stringify(analyticsData.analysis);
    } else {
      textToTranslate = originalReport;
    }

    const res = await api.post("/headmaster/translate", {
      text: textToTranslate,
      target_language: selectedLanguage,
      user_info: {
        name: headmaster?.name || "",
        email: headmaster?.email || "",
        role: "Headmaster",
      },
    });

    if (selectedReport === "analytics") {
      let translatedAnalysis;

      try {
        translatedAnalysis = JSON.parse(res.data.translated);
      } catch {
        translatedAnalysis = {
          trend: res.data.translated,
          strengths: "",
          weaknesses: "",
          recommendations: "",
        };
      }

      setAnalyticsData((prev) => ({
        ...prev,
        analysis: translatedAnalysis,
      }));
    } else {
      setReport(res.data.translated);
    }
  } catch (error) {
    console.error("Translation Error:", error);
  } finally {
    setIsTranslating(false);
  }
};
  // =======================
  // SAFE DATA HANDLING
  // =======================
  
const chartData = Array.isArray(analyticsData?.data)
  ? analyticsData.data.map((item) => ({
      subject: item.subject ?? item.test ?? item.student ?? "Unknown",
      score: Number(item.score) || 0,
    }))
  : [];

  return (
    <div className="ai-modal-overlay">
      <div className="ai-modal">

        {/* HEADER */}
        <div className="ai-modal-header">
          <h2>🤖 AI Tools</h2>
          <button className="close-btn" onClick={onClose}>
            ✖
          </button>
        </div>

        <div className="ai-modal-body">

          {/* LEFT PANEL */}
          <div className="ai-left">

            <button
              className={`ai-card ${selectedReport === "assignment" ? "active" : ""}`}
           onClick={() => {
  setSelectedReport("assignment");
  setAnalyticsData(null);
  setReport("");
  setLanguage("English");
}}
            >
              📋 Assignment Report
            </button>

            <button
              className={`ai-card ${selectedReport === "teacher" ? "active" : ""}`}
               onClick={() => {
  setSelectedReport("teacher");
  setAnalyticsData(null);
  setReport("");
  setLanguage("English");
}}
            >
              👨‍🏫 Teacher Performance
            </button>

            <button
              className={`ai-card ${selectedReport === "analytics" ? "active" : ""}`}
            onClick={() => {
  setSelectedReport("analytics");
  setAnalyticsData(null);
  setReport("");
  setLanguage("English");
}}
            >
              📊 Academic Analytics
            </button>

            <button
              className="generate-btn"
              onClick={generateReport}
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate Report"}
            </button>
          </div>


          {/* RIGHT PANEL */}
          <div className="ai-right">
    <div className="language-bar">

  <label>Select Language</label>

  <select
    className="language-select"
    value={language}
    onChange={(e) => {
      const lang = e.target.value;
      setLanguage(lang);
      translateContent(lang);
    }}
  >
    <option value="English">English</option>
    <option value="Telugu">Telugu</option>
    <option value="Hindi">Hindi</option>
    <option value="Tamil">Tamil</option>
    <option value="Kannada">Kannada</option>
  </select>

</div>
<div className="content-panel">

  {/* ================= Assignment ================= */}

  {selectedReport === "assignment" && (
    <ReportPanel
      title="Assignment Report"
      icon="📋"
      report={report}
      previewTitle="Assignment Report Preview"
      previewText="Select Assignment Report and click Generate Report."
    />
  )}

  {/* ================= Teacher ================= */}

  {selectedReport === "teacher" && (
    <ReportPanel
      title="Teacher Performance"
      icon="👨‍🏫"
      report={report}
      previewTitle="Teacher Performance Preview"
      previewText="Select Teacher Performance and click Generate Report."
    />
  )}

  {/* ================= Academic Analytics ================= */}

  {selectedReport === "analytics" && (
    <>
      {!analyticsData && (
       <AcademicAnalytics
  selectedClass={selectedClass}
  setSelectedClass={setSelectedClass}
  selectedSection={selectedSection}
  setSelectedSection={setSelectedSection}
  classOptions={classOptions}
  student={student}
  setStudent={setStudent}
  subject={subject}
  setSubject={setSubject}
  subjects={subjects}
/>
      )}

      {analyticsData && (
        <>
          <h3 className="analytics-title">
            📊 Academic Analytics
          </h3>
          {analyticsData.data?.length > 0 && (
  <div className="student-info">
    <p>
      <strong>Student:</strong>{" "}
      {analyticsData.data[0].student_name}
    </p>

    <p>
      <strong>Roll No:</strong>{" "}
      {analyticsData.data[0].roll_no}
    </p>
  </div>
)}

         {analyticsData.data?.length === 0 ? (
  <div className="analysis-container">
    <p>
      {analyticsData.message ||
        "No academic data found for the selected criteria"}
    </p>
  </div>
) : (
  <>
    <h4 className="chart-title">
      AI Analysis
    </h4>

    <div className="analysis-container">
      <h4>Trend</h4>
      <p>{analyticsData.trend}</p>

      <h4>Strengths</h4>
      <p>{analyticsData.strengths}</p>

      <h4>Weaknesses</h4>
      <p>{analyticsData.weaknesses}</p>

      <h4>Recommendations</h4>
      <p>{analyticsData.recommendations}</p>
    </div>
  </>
)}

          <h4 className="chart-title">
            📊 Performance Overview
          </h4>

          <div className="chart-container">

            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>

               

                <XAxis dataKey="subject" />

                <YAxis domain={[0,100]} />

                <Tooltip />

                <Bar dataKey="score">

                  <LabelList
                    dataKey="score"
                    position="top"
                  />

                  {chartData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}

                </Bar>

              </BarChart>
            </ResponsiveContainer>

          </div>
        </>
      )}
    </>
  )}

</div>

          </div>
        </div>
      </div>
    </div>
  );
}