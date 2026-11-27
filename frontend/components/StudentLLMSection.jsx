"use client";

import { useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

const BASE_URL = "http://127.0.0.1:8000";

export default function StudentLLMSection() {
  const [studentId, setStudentId] = useState("");
  const [studentData, setStudentData] = useState([]);
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchStudent = async () => {
    if (!studentId) {
      setError("Please enter student ID");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setStudentData([]);
      setAnalysis("");

      const res = await axios.get(
        `${BASE_URL}/llm/student-analysis/${studentId}`
      );

      setStudentData(res.data.student_data || []);
      setAnalysis(res.data.llm_analysis || "");
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to load student analysis");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-container">
      <h2>Student AI Analysis</h2>

      <div className="search-box">
        <input
          type="number"
          placeholder="Enter Student ID"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />

        <button onClick={searchStudent}>
          {loading ? "Loading..." : "Search"}
        </button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {studentData.length > 0 && (
        <>
          <div className="chart-grid">
            <div className="chart-card">
              <h3>Subject Marks</h3>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={studentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject_name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="marks_obtained" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Performance Trend</h3>

              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={studentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject_name" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="marks_obtained"
                    stroke="#16a34a"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="table-card">
            <h3>Student Marks Data</h3>

            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Section</th>
                  <th>Exam</th>
                  <th>Subject</th>
                  <th>Marks</th>
                </tr>
              </thead>

              <tbody>
                {studentData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.student_name || item.full_name}</td>
                    <td>{item.section}</td>
                    <td>{item.exam_name}</td>
                    <td>{item.subject_name}</td>
                    <td>{item.marks_obtained}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="analysis-card">
            <h3>AI Suggestions</h3>
            <pre>{analysis}</pre>
          </div>
        </>
      )}
    </div>
  );
}