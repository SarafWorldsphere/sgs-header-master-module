"use client";

import { useEffect, useMemo, useState } from "react";
import { Mic } from "lucide-react";

export default function TeachersSection({
  teachers = [],
  fetchTeachers,
  fetchSubjects,
  searchText = "",
  setSearchText = () => {},
  loading = false,
})  {
  const [teacherType, setTeacherType] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [subjects, setSubjects] = useState([]);
 const [filteredTeachers, setFilteredTeachers] = useState(teachers);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterError, setFilterError] =  useState("");
  const [isListening, setIsListening] = useState(false);

  // Load subjects
  useEffect(() => {
    let cancelled = false;

    async function loadSubjects() {
      try {
        const data = await fetchSubjects();

        if (!cancelled) {
          setSubjects(
            (Array.isArray(data) ? data : [])
              .map((item) =>
                typeof item === "string" ? item : item.subject_name
              )
              .filter(Boolean)
          );
        }
      } catch (error) {
        console.error("Subjects Error:", error);
        if (!cancelled) {
          setFilterError("Unable to load subjects.");
        }
      }
    }

    loadSubjects();

    return () => {
      cancelled = true;
    };
  }, [fetchSubjects]);

  // Update displayed teachers when filter or cached data changes
  useEffect(() => {
    let cancelled = false;

    async function applyFilters() {
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
        console.error("Teacher Filter Error:", error);

        if (!cancelled) {
          setFilterError("Unable to filter teachers.");
          setFilteredTeachers([]);
        }
      } finally {
        if (!cancelled) {
          setFilterLoading(false);
        }
      }
    }

    applyFilters();

    return () => {
      cancelled = true;
    };
  }, [teacherType, selectedSubject, fetchTeachers, teachers]);

  const subjectOptions = useMemo(
    () => [...new Set(subjects)].sort((a, b) => a.localeCompare(b)),
    [subjects]
  );

  const displayedTeachers = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return filteredTeachers.filter((teacher) => {
      const matchesSearch = [
        teacher.teacher_id,
        teacher.full_name,
        teacher.subject_name,
        teacher.role,
        teacher.section_1,
        teacher.section_2,
        teacher.email_id,
        teacher.phone,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      );

      return matchesSearch;
    });
  }, [filteredTeachers, searchText]);

  const handleMicClick = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setFilterError("Voice search is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setFilterError("");
    };

    recognition.onresult = (event) => {
      setSearchText(event.results[0][0].transcript);
    };

    recognition.onerror = () => {
      setFilterError("Voice search failed. Please try again.");
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const handleTeacherTypeChange = (event) => {
    setTeacherType(event.target.value);
    setSelectedSubject("");
  };

  const handleReset = () => {
    setTeacherType("all");
    setSelectedSubject("");
    setSearchText("");
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

        <div className="teacher-search-group">
          <label htmlFor="teacher-search">Search Teachers</label>
          <div className="teacher-search-box">
            <input
              id="teacher-search"
              type="search"
              placeholder="Search name, ID, subject, email..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />

          <button
  type="button"
  className={`teacher-mic-btn ${isListening ? "listening" : ""}`}
  onClick={handleMicClick}
  aria-label="Voice search"
  title={isListening ? "Listening..." : "Voice search"}
>
  <Mic size={17} />
</button>
          </div>
        </div>

        <div className="teachers-count">
          <strong>
            {filterLoading ? "..." : displayedTeachers.length}
          </strong>
          <span>Teachers</span>
        </div>

        {(teacherType !== "all" || selectedSubject || searchText) && (
          <button
            type="button"
            className="teacher-reset-btn"
            onClick={handleReset}
          >
            Reset
          </button>
        )}
      </div>

      {filterError && <p role="alert">{filterError}</p>}

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
  {loading || filterLoading ? (
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